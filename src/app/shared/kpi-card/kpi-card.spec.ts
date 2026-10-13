import { TestBed } from '@angular/core/testing';
import { Kpi } from '../../core/api/models';
import { KpiCard } from './kpi-card';

const kpi = (patch: Partial<Kpi>): Kpi => ({
  id: 'requests',
  label: 'Requests',
  value: 289_410,
  unit: '',
  deltaPct: 4.2,
  better: 'up',
  trend: [1, 2, 3],
  ...patch,
});

function render(value: Kpi | null, state: 'ready' | 'loading' | 'empty' | 'error' = 'ready') {
  const fixture = TestBed.createComponent(KpiCard);
  fixture.componentRef.setInput('kpi', value);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('label', 'Requests');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KpiCard', () => {
  it('writes a large count compactly, with the exact value in the title', () => {
    const value = render(kpi({})).querySelector('.value')!;
    expect(value.textContent?.trim()).toBe('289.4K');
    expect(value.getAttribute('title')).toBe('289,410');
  });

  it('marks a rise as good when up is better, and as bad when down is better', () => {
    const tone = (k: Kpi) => render(k).querySelector('.delta')!.getAttribute('data-tone');
    expect(tone(kpi({ deltaPct: 4.2, better: 'up' }))).toBe('good');
    expect(
      tone(kpi({ id: 'error-rate', unit: '%', value: 0.46, deltaPct: 4.9, better: 'down' })),
    ).toBe('bad');
    expect(tone(kpi({ deltaPct: -3, better: 'down' }))).toBe('good');
  });

  it('never leaves direction to colour alone: arrow, sign and a spoken meaning', () => {
    const delta = render(kpi({ deltaPct: -3, better: 'up' })).querySelector('.delta')!;
    expect(delta.textContent).toContain('−3%');
    expect(delta.textContent).toContain('(worse)');
    // The arrow-down path from the icon set.
    expect(delta.querySelector('path')?.getAttribute('d')).toBe('M12 5v14M5 12l7 7 7-7');
  });

  it('shows no arrow for an unchanged value', () => {
    const delta = render(kpi({ deltaPct: 0 })).querySelector('.delta')!;
    expect(delta.getAttribute('data-tone')).toBe('neutral');
    expect(delta.querySelector('i')).toBeNull();
  });

  it('writes small percentages with two decimals', () => {
    const el = render(kpi({ unit: '%', value: 0.46, better: 'down' }));
    expect(el.querySelector('.value')?.textContent?.trim()).toBe('0.46%');
  });

  it('draws loading as a skeleton, and empty and error as a dash with a note', () => {
    expect(render(null, 'loading').querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    const empty = render(null, 'empty');
    expect(empty.querySelector('.value')?.textContent?.trim()).toBe('–');
    expect(empty.textContent).toContain('No data in this range');
    const error = render(null, 'error');
    expect(error.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load");
  });
});
