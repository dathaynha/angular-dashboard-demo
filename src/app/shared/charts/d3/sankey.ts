import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { linkHorizontal, linkVertical } from 'd3-shape';
import { fmt } from '../chart-format';
import { injectChartWidth } from '../chart-size';
import { ChartTooltip, TooltipData } from '../chart-tooltip';
import {
  LaidLink,
  LaidNode,
  layoutSankey,
  linkKey,
  SankeyLink,
  SankeyNode,
  sankeyPathThrough,
} from './sankey-layout';

/** Below this width a left-to-right flow cannot fit its labels; it turns top to bottom. */
const VERTICAL_BELOW = 560;
const PAD = 8;
/** Rough width of one label character at 12px, for hit areas and label room. */
const CHAR = 7;
const LINE = 16;
const NEUTRAL = 'var(--chart-axis)';

/**
 * A flow between fixed columns, drawn as SVG by the template from d3's maths,
 * so the server and the browser draw the same picture.
 *
 * Hover or focus a node to trace every path through it; `highlight` traces
 * paths from outside (the service filter). A link's tooltip gives its volume
 * and error share. Each node's hit area covers its bar and its label, since
 * the label is what people aim at.
 */
@Component({
  selector: 'app-sankey',
  imports: [ChartTooltip],
  templateUrl: './sankey.html',
  styleUrl: './sankey.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sankey {
  readonly label = input.required<string>();
  readonly nodes = input.required<readonly SankeyNode[]>();
  readonly links = input.required<readonly SankeyLink[]>();
  /** Nodes whose paths stay lit while the rest dims, e.g. the filtered services. */
  readonly highlight = input<readonly string[]>([]);
  readonly height = input(320);

  protected readonly width = injectChartWidth(720);
  protected readonly vertical = computed(() => this.width() < VERTICAL_BELOW);
  private readonly lastColumn = computed(() => Math.max(0, ...this.nodes().map((n) => n.column)));

  /** Top to bottom, the last column's labels read downwards below it. */
  private readonly bottomRoom = computed(() => {
    if (!this.vertical()) return 0;
    const last = this.nodes().filter((n) => n.column === this.lastColumn());
    return Math.max(24, Math.max(0, ...last.map((n) => n.label.length)) * CHAR + 8);
  });

  protected readonly svgHeight = computed(() =>
    this.vertical() ? Math.max(this.height() * 1.6, 460) + this.bottomRoom() : this.height(),
  );

  protected readonly layout = computed(() => {
    const vertical = this.vertical();
    const laid = layoutSankey(this.nodes(), this.links(), {
      width: Math.max(this.width() - PAD * 2, 1),
      height: Math.max(this.svgHeight() - PAD * 2 - this.bottomRoom(), 1),
      orientation: vertical ? 'vertical' : 'horizontal',
      minNodeLength: 18,
    });
    const color = new Map(this.nodes().map((n) => [n.id, n.color]));
    const path = vertical ? linkVertical() : linkHorizontal();
    return {
      nodes: laid.nodes,
      links: laid.links.map((link) => ({
        link,
        key: linkKey(link),
        color: color.get(link.source) ?? color.get(link.target) ?? NEUTRAL,
        d: path({ source: [...link.from], target: [...link.to] }) ?? '',
      })),
    };
  });

  protected readonly focused = signal<string | null>(null);
  protected readonly lit = computed(() => {
    const focused = this.focused();
    const ids = focused ? [focused] : this.highlight();
    return ids.length ? sankeyPathThrough(ids, this.links()) : null;
  });
  protected readonly tooltip = signal<TooltipData | null>(null);

  protected readonly summary = computed(() =>
    this.layout()
      .nodes.map((n) => `${n.label} ${fmt.compact(n.value)}`)
      .join(', '),
  );

  protected nodeName(node: LaidNode): string {
    return `${node.label}, ${fmt.value(node.value)} requests`;
  }

  protected nodeColor(node: LaidNode): string {
    return node.color ?? NEUTRAL;
  }

  protected place(node: LaidNode) {
    if (this.vertical()) {
      const x = (node.x0 + node.x1) / 2;
      // Wider than its slot, a label turns to read downwards.
      const slot = node.x1 - node.x0 + 14;
      return node.label.length * CHAR > slot
        ? { x, y: node.y1 + 4, anchor: 'start', rotate: true }
        : { x, y: node.y1 + 14, anchor: 'middle', rotate: false };
    }
    const last = node.column === this.lastColumn() && node.column > 0;
    return {
      x: last ? node.x0 - 6 : node.x1 + 6,
      y: (node.y0 + node.y1) / 2,
      anchor: last ? 'end' : 'start',
      rotate: false,
    };
  }

  /** The box around a node's bar and its label, for the pointer. */
  protected hitArea(node: LaidNode, p: ReturnType<Sankey['place']>) {
    const along = node.label.length * CHAR;
    const start = p.anchor === 'end' ? -along : p.anchor === 'middle' ? -along / 2 : 0;
    const [lx0, ly0, lx1, ly1] = p.rotate
      ? [p.x - LINE / 2, p.y + start, p.x + LINE / 2, p.y + start + along]
      : [p.x + start, p.y - LINE / 2, p.x + start + along, p.y + LINE / 2];
    const x = Math.min(node.x0, lx0);
    const y = Math.min(node.y0, ly0);
    return { x, y, width: Math.max(node.x1, lx1) - x, height: Math.max(node.y1, ly1) - y };
  }

  protected showNode(node: LaidNode): void {
    this.focused.set(node.id);
    this.tooltip.set({
      x: (node.x0 + node.x1) / 2 + PAD,
      y: node.y0 + PAD,
      title: node.label,
      rows: [{ label: 'Requests', value: fmt.value(node.value) }],
    });
  }

  protected showLink(link: LaidLink, color: string, event: PointerEvent): void {
    const label = new Map(this.nodes().map((n) => [n.id, n.label]));
    const box = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect();
    const errors = link.errors ?? 0;
    this.tooltip.set({
      x: box ? event.clientX - box.left : (link.from[0] + link.to[0]) / 2,
      y: box ? event.clientY - box.top : (link.from[1] + link.to[1]) / 2,
      title: `${label.get(link.source)} → ${label.get(link.target)}`,
      rows: [
        { label: 'Requests', value: fmt.value(link.value), color },
        ...(errors
          ? [{ label: 'Failed (5xx)', value: fmt.value((100 * errors) / link.value, 'percent') }]
          : []),
      ],
    });
  }

  protected clear(): void {
    this.focused.set(null);
    this.tooltip.set(null);
  }
}
