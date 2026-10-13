import { TestBed } from '@angular/core/testing';
import { ChartCard } from './chart-card';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ChartCard);
  fixture.componentRef.setInput('heading', 'Traffic');
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ChartCard', () => {
  const table = { columns: ['Hour', 'Requests'], rows: [['00:00', 12]] };

  it('keeps the body height in every state, so the page never jumps', () => {
    for (const state of ['ready', 'loading', 'empty', 'error']) {
      const { el } = render({ state, bodyHeight: 240 });
      expect(el.querySelector<HTMLElement>('.body')!.style.height).toBe('240px');
    }
  });

  it('switches to the table view and back', () => {
    const { fixture, el } = render({ table });
    const toggle = el.querySelector<HTMLButtonElement>('[aria-pressed]')!;
    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('tbody td')?.textContent).toBe('00:00');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('disables table and export while there is nothing to show', () => {
    const { el } = render({ table, state: 'loading' });
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.actions button')];
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it('offers Retry on error and names the library', () => {
    const { fixture, el } = render({ state: 'error', library: 'd3 · SVG' });
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    el.querySelector<HTMLButtonElement>('app-state-message button')!.click();
    expect(retried).toBe(true);
    expect(el.querySelector('.library')?.textContent).toBe('d3 · SVG');
  });
});
