// Ported from @datha/platform-ui charts (v0.18.0), trimmed to measured links.

export interface SankeyNode {
  readonly id: string;
  readonly label: string;
  /** Which column the node sits in, from 0. The caller lays out the flow. */
  readonly column: number;
  /** The node's series colour; links take it from the end that has one. */
  readonly color?: string;
}

export interface SankeyLink {
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly errors?: number;
}

export type SankeyOrientation = 'horizontal' | 'vertical';

export interface SankeyLayoutOptions {
  readonly width: number;
  readonly height: number;
  readonly orientation?: SankeyOrientation;
  /** Thickness of a node along the flow. */
  readonly nodeThickness?: number;
  /** Gap between nodes in one column. */
  readonly nodeGap?: number;
  /** Every node gets at least this much length, so a quiet one stays visible. */
  readonly minNodeLength?: number;
}

export interface LaidNode extends SankeyNode {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly value: number;
}

export interface LaidLink extends SankeyLink {
  /** Stroke width to draw the ribbon at. */
  readonly width: number;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

export interface SankeyLayout {
  readonly nodes: readonly LaidNode[];
  readonly links: readonly LaidLink[];
}

const HAIRLINE = 1.5;

/**
 * Lays out a Sankey whose columns the caller chooses. Unlike d3-sankey there is
 * no iterative relaxation: the order of `nodes` within a column is the order on
 * screen, so a server render and the browser always agree.
 *
 * Node length is `minNodeLength + value * k`, with one `k` for the whole chart
 * (the fullest column decides it), so lengths compare across columns. A node's
 * value is the larger of what flows in and what flows out. Links leave and
 * enter in the order of the node at their other end, which keeps ribbons from
 * crossing where they need not.
 */
export function layoutSankey(
  nodes: readonly SankeyNode[],
  links: readonly SankeyLink[],
  options: SankeyLayoutOptions,
): SankeyLayout {
  const orientation = options.orientation ?? 'horizontal';
  const thickness = options.nodeThickness ?? 12;
  const gap = options.nodeGap ?? 14;
  const minLength = options.minNodeLength ?? 6;
  // Lay out along "flow" and "across"; vertical swaps them at the end.
  const flowSize = orientation === 'horizontal' ? options.width : options.height;
  const acrossSize = orientation === 'horizontal' ? options.height : options.width;

  const ids = new Set(nodes.map((n) => n.id));
  const usable = links.filter((l) => ids.has(l.source) && ids.has(l.target));
  const flowIn = new Map<string, number>();
  const flowOut = new Map<string, number>();
  for (const l of usable) {
    const v = Math.max(l.value, 0);
    flowOut.set(l.source, (flowOut.get(l.source) ?? 0) + v);
    flowIn.set(l.target, (flowIn.get(l.target) ?? 0) + v);
  }
  const valueOf = (id: string) => Math.max(flowIn.get(id) ?? 0, flowOut.get(id) ?? 0);

  const columns = new Map<number, SankeyNode[]>();
  for (const node of nodes) columns.set(node.column, [...(columns.get(node.column) ?? []), node]);
  const lastColumn = Math.max(0, ...nodes.map((n) => n.column));

  let k = Infinity;
  for (const column of columns.values()) {
    const total = column.reduce((sum, n) => sum + valueOf(n.id), 0);
    const room = acrossSize - gap * (column.length - 1) - minLength * column.length;
    if (total > 0) k = Math.min(k, Math.max(room, 0) / total);
  }
  if (!Number.isFinite(k)) k = 0;

  const placed = new Map<
    string,
    { f0: number; f1: number; a0: number; a1: number; value: number }
  >();
  for (const [index, column] of columns) {
    const lengths = column.map((n) => minLength + valueOf(n.id) * k);
    const total = lengths.reduce((s, l) => s + l, 0) + gap * (column.length - 1);
    let across = Math.max((acrossSize - total) / 2, 0);
    const f0 = lastColumn === 0 ? 0 : (index * (flowSize - thickness)) / lastColumn;
    column.forEach((node, i) => {
      placed.set(node.id, {
        f0,
        f1: f0 + thickness,
        a0: across,
        a1: across + lengths[i],
        value: valueOf(node.id),
      });
      across += lengths[i] + gap;
    });
  }

  // Stack each node's links, ordered by where the other end sits.
  const acrossOf = (id: string) => placed.get(id)!.a0;
  const ends = new Map<SankeyLink, { from: number; to: number }>();
  const stack = (id: string, side: 'out' | 'in', group: SankeyLink[]) => {
    const node = placed.get(id)!;
    group.sort(
      (a, b) =>
        acrossOf(side === 'out' ? a.target : a.source) -
        acrossOf(side === 'out' ? b.target : b.source),
    );
    const band = group.reduce((s, l) => s + Math.max(l.value, 0) * k, 0);
    let offset = node.a0 + (node.a1 - node.a0 - band) / 2;
    for (const link of group) {
      const width = Math.max(link.value, 0) * k;
      const end = ends.get(link) ?? { from: 0, to: 0 };
      if (side === 'out') end.from = offset + width / 2;
      else end.to = offset + width / 2;
      ends.set(link, end);
      offset += width;
    }
  };
  for (const node of nodes) {
    stack(
      node.id,
      'out',
      usable.filter((l) => l.source === node.id),
    );
    stack(
      node.id,
      'in',
      usable.filter((l) => l.target === node.id),
    );
  }

  const point = (flow: number, across: number): [number, number] =>
    orientation === 'horizontal' ? [flow, across] : [across, flow];

  return {
    nodes: nodes.map((node) => {
      const p = placed.get(node.id)!;
      const [x0, y0] = point(p.f0, p.a0);
      const [x1, y1] = point(p.f1, p.a1);
      return { ...node, x0, y0, x1, y1, value: p.value };
    }),
    links: usable.map((link) => {
      const end = ends.get(link)!;
      return {
        ...link,
        width: Math.max(Math.max(link.value, 0) * k, HAIRLINE),
        from: point(placed.get(link.source)!.f1, end.from),
        to: point(placed.get(link.target)!.f0, end.to),
      };
    }),
  };
}

/** Every node and link on a path through any of `ids`, upstream and downstream. */
export function sankeyPathThrough(
  ids: Iterable<string>,
  links: readonly SankeyLink[],
): { nodes: Set<string>; links: Set<string> } {
  const nodes = new Set(ids);
  const onPath = new Set<string>();
  const walk = (start: string, direction: 'down' | 'up') => {
    const queue = [start];
    while (queue.length) {
      const current = queue.shift()!;
      for (const link of links) {
        const from = direction === 'down' ? link.source : link.target;
        const to = direction === 'down' ? link.target : link.source;
        if (from !== current || onPath.has(linkKey(link))) continue;
        onPath.add(linkKey(link));
        nodes.add(to);
        queue.push(to);
      }
    }
  };
  for (const id of [...nodes]) {
    walk(id, 'down');
    walk(id, 'up');
  }
  return { nodes, links: onPath };
}

export const linkKey = (link: Pick<SankeyLink, 'source' | 'target'>) =>
  `${link.source}\u0000${link.target}`;
