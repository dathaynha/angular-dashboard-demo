import { TestBed } from '@angular/core/testing';
import { DashboardFilters } from '../../core/filters';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  afterEach(() => vi.useRealTimers());

  it('applies a search once typing pauses for 300 ms, not on every key', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(FilterBar);
    fixture.detectChanges();
    const seen: DashboardFilters[] = [];
    fixture.componentInstance.filters.subscribe((f) => seen.push(f));
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    for (const text of ['c', 'ch', 'che', 'chec ']) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
    }
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(300);
    expect(seen.map((f) => f.q)).toEqual(['chec']);
  });

  it('keeps the range when filters are cleared', () => {
    const fixture = TestBed.createComponent(FilterBar);
    fixture.componentRef.setInput('filters', {
      range: '7d',
      q: 'x',
      services: ['file-service'],
      statuses: ['5xx'],
    });
    fixture.detectChanges();
    const clear = [...fixture.nativeElement.querySelectorAll('button')].find((b: Element) =>
      b.textContent?.includes('Clear filters'),
    ) as HTMLButtonElement;
    clear.click();
    expect(fixture.componentInstance.filters()).toEqual({
      range: '7d',
      q: '',
      services: [],
      statuses: [],
    });
  });
});
