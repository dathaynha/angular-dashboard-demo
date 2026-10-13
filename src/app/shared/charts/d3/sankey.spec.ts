import { TestBed } from '@angular/core/testing';
import { Sankey } from './sankey';
import { SankeyLink, SankeyNode } from './sankey-layout';

const nodes: SankeyNode[] = [
  { id: 'web', label: 'Web app', column: 0 },
  { id: 'gw', label: 'api-gateway', column: 1 },
  { id: 'a', label: 'accounts-service', column: 2, color: 'var(--chart-1)' },
  { id: 'b', label: 'file-service', column: 2, color: 'var(--chart-4)' },
];
const links: SankeyLink[] = [
  { source: 'web', target: 'gw', value: 100 },
  { source: 'gw', target: 'a', value: 70 },
  { source: 'gw', target: 'b', value: 30, errors: 3 },
];

function render(highlight: string[] = []) {
  const fixture = TestBed.createComponent(Sankey);
  fixture.componentRef.setInput('label', 'Flow');
  fixture.componentRef.setInput('nodes', nodes);
  fixture.componentRef.setInput('links', links);
  fixture.componentRef.setInput('highlight', highlight);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const num = (el: Element, attr: string) => Number(el.getAttribute(attr));

describe('Sankey', () => {
  it('makes each label part of its node’s hit area, not only the 12px bar', () => {
    const el = render();
    for (const g of el.querySelectorAll('[data-node]')) {
      const hit = g.querySelector('.hit')!;
      const text = g.querySelector('text')!;
      const width = (text.textContent ?? '').trim().length * 7;
      const anchor = text.getAttribute('text-anchor');
      const x0 = num(text, 'x') - (anchor === 'end' ? width : 0);
      expect(num(hit, 'x')).toBeLessThanOrEqual(x0);
      expect(num(hit, 'x') + num(hit, 'width')).toBeGreaterThanOrEqual(x0 + width - 1e-9);
    }
  });

  it('colours a ribbon by the service at either end, neutral otherwise', () => {
    const el = render();
    // The key holds a NUL separator, which a CSS selector cannot match.
    const stroke = (key: string) =>
      [...el.querySelectorAll('[data-link]')]
        .find((p) => p.getAttribute('data-link') === key.replace('>', '\u0000'))
        ?.getAttribute('stroke');
    expect(stroke('gw>a')).toBe('var(--chart-1)');
    expect(stroke('gw>b')).toBe('var(--chart-4)');
    expect(stroke('web>gw')).toBe('var(--chart-axis)');
  });

  it('dims everything off the highlighted paths', () => {
    const el = render(['b']);
    const dimmed = [...el.querySelectorAll('[data-node].is-dimmed')].map((g) =>
      g.getAttribute('data-node'),
    );
    expect(dimmed).toEqual(['a']);
  });

  it('traces a node’s paths on hover and shows its volume', () => {
    const el = render();
    const node = el.querySelector('[data-node="a"]')!;
    node.dispatchEvent(new PointerEvent('pointerenter'));
    TestBed.tick();
    expect(el.querySelector('[data-node="b"]')!.classList).toContain('is-dimmed');
    expect(el.textContent).toContain('70');
  });
});
