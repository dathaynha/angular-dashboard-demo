import { layoutSankey, linkKey, SankeyLink, SankeyNode, sankeyPathThrough } from './sankey-layout';

const nodes: SankeyNode[] = [
  { id: 'web', label: 'Web', column: 0 },
  { id: 'gw', label: 'gateway', column: 1 },
  { id: 'a', label: 'a', column: 2 },
  { id: 'b', label: 'b', column: 2 },
  { id: 'pg', label: 'pg', column: 3 },
  { id: 'redis', label: 'redis', column: 3 },
];
const links: SankeyLink[] = [
  { source: 'web', target: 'gw', value: 100 },
  { source: 'gw', target: 'a', value: 70 },
  { source: 'gw', target: 'b', value: 30 },
  { source: 'a', target: 'pg', value: 70 },
  { source: 'b', target: 'redis', value: 30 },
];

describe('layoutSankey', () => {
  const laid = layoutSankey(nodes, links, { width: 600, height: 300 });
  const node = (id: string) => laid.nodes.find((n) => n.id === id)!;

  it('keeps the given order inside a column, so server and browser agree', () => {
    expect(node('a').y0).toBeLessThan(node('b').y0);
    expect(node('pg').y0).toBeLessThan(node('redis').y0);
  });

  it('sizes nodes by flow on one scale for the whole chart', () => {
    const length = (id: string) => node(id).y1 - node(id).y0;
    expect(node('gw').value).toBe(100);
    // minNodeLength (6) + value * k: a node with 70 is longer than one with 30, by 40k.
    expect(length('a') - length('b')).toBeCloseTo(((length('gw') - 6) * 40) / 100, 5);
  });

  it('places columns left to right, and swaps axes when vertical', () => {
    expect(node('web').x0).toBe(0);
    expect(node('pg').x1).toBe(600);
    const down = layoutSankey(nodes, links, { width: 300, height: 600, orientation: 'vertical' });
    expect(down.nodes.find((n) => n.id === 'pg')!.y1).toBe(600);
  });

  it('stacks ribbons inside their node', () => {
    for (const link of laid.links) {
      const source = node(link.source);
      expect(link.from[1] - link.width / 2).toBeGreaterThanOrEqual(source.y0 - 1e-9);
      expect(link.from[1] + link.width / 2).toBeLessThanOrEqual(source.y1 + 1e-9);
    }
  });
});

describe('sankeyPathThrough', () => {
  it('lights a node’s upstream and downstream, not its siblings', () => {
    const path = sankeyPathThrough(['a'], links);
    expect([...path.nodes].sort()).toEqual(['a', 'gw', 'pg', 'web']);
    expect(path.links.has(linkKey({ source: 'gw', target: 'b' }))).toBe(false);
  });

  it('unions the paths of several nodes', () => {
    const path = sankeyPathThrough(['a', 'b'], links);
    expect(path.nodes.size).toBe(6);
    expect(path.links.size).toBe(5);
  });
});
