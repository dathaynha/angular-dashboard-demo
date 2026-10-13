import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import { fmt } from '../chart-format';
import { injectChartWidth } from '../chart-size';
import type { ValueFormat } from '../chart.types';

/**
 * A small trend drawn as SVG from d3's maths, so it renders on the server too.
 * The accessible name carries latest, lowest and highest, so the shape is
 * never the only way to read it. `null` values are gaps.
 */
@Component({
  selector: 'app-sparkline',
  template: `
    <svg
      role="img"
      [attr.aria-label]="description()"
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
    >
      <path class="area" [attr.d]="paths().area" />
      <path class="line" [attr.d]="paths().line" />
      @if (paths().end; as end) {
        <circle class="end" [attr.cx]="end.x" [attr.cy]="end.y" r="3" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      color: var(--chart-accent);
    }
    svg {
      display: block;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .area {
      fill: currentColor;
      opacity: 0.1;
    }
    .end {
      fill: currentColor;
      stroke: var(--card-bg);
      stroke-width: 2;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sparkline {
  readonly values = input.required<readonly (number | null)[]>();
  readonly label = input.required<string>();
  readonly format = input<ValueFormat>('number');
  readonly height = input(36);

  protected readonly width = injectChartWidth(160);

  private readonly known = computed(() => this.values().filter((v): v is number => v !== null));

  protected readonly paths = computed(() => {
    const values = this.values();
    const [low = 0, high = 1] = extent(this.known());
    const h = this.height();
    // Inset by the end dot's radius plus its ring, so it is never clipped.
    const x = scaleLinear()
      .domain([0, Math.max(values.length - 1, 1)])
      .range([4, this.width() - 5]);
    const y = scaleLinear()
      .domain(low === high ? [low - 1, high + 1] : [low, high])
      .range([h - 5, 5]);
    const defined = (v: number | null) => v !== null;
    const last = values.length - 1;
    return {
      line:
        line<number | null>()
          .defined(defined)
          .x((_, i) => x(i))
          .y((v) => y(v ?? 0))(values) ?? '',
      area:
        area<number | null>()
          .defined(defined)
          .x((_, i) => x(i))
          .y0(h)
          .y1((v) => y(v ?? 0))(values) ?? '',
      end: last >= 0 && values[last] !== null ? { x: x(last), y: y(values[last]!) } : null,
    };
  });

  protected readonly description = computed(() => {
    const known = this.known();
    const show = (v: number | null) => fmt.value(v, this.format());
    if (!known.length) return `${this.label()}: no data`;
    return `${this.label()} trend: latest ${show(known[known.length - 1])}, low ${show(Math.min(...known))}, high ${show(Math.max(...known))}`;
  });
}
