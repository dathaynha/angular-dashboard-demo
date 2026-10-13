import { TestBed } from '@angular/core/testing';
import { Column, DataTable } from './data-table';

interface Row {
  id: string;
  ms: number;
}

const columns: Column<Row>[] = [
  { key: 'id', header: 'Id', sortable: true, text: (r) => r.id },
  { key: 'ms', header: 'Duration', sortable: true, align: 'end', text: (r) => `${r.ms} ms` },
];

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(DataTable<Row>);
  const ref = fixture.componentRef;
  ref.setInput('columns', columns);
  ref.setInput('rowKey', (r: Row) => r.id);
  ref.setInput('caption', 'Rows');
  ref.setInput('rows', [
    { id: 'a', ms: 5 },
    { id: 'b', ms: 9 },
  ]);
  ref.setInput('total', 2);
  for (const [k, v] of Object.entries(inputs)) ref.setInput(k, v);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, table: fixture.componentInstance };
}

describe('DataTable', () => {
  it('asks for descending first, then flips the active column', () => {
    const { el, table } = render({ sort: 'id', dir: 'desc' });
    const asked: unknown[] = [];
    table.sortChange.subscribe((e) => asked.push(e));
    const [idButton, msButton] = el.querySelectorAll<HTMLButtonElement>('th button');
    idButton.click();
    msButton.click();
    expect(asked).toEqual([
      { sort: 'id', dir: 'asc' },
      { sort: 'ms', dir: 'desc' },
    ]);
  });

  it('tells assistive tech which column is sorted and how', () => {
    const { el } = render({ sort: 'ms', dir: 'asc' });
    const sorts = [...el.querySelectorAll('th')].map((th) => th.getAttribute('aria-sort'));
    expect(sorts).toEqual(['none', 'ascending']);
  });

  it('pages within bounds and disables the edge buttons', () => {
    const { el, table } = render({ total: 30, pageSize: 10, page: 3 });
    const pages: number[] = [];
    table.pageChange.subscribe((p) => pages.push(p));
    const [prev, next] = el.querySelectorAll<HTMLButtonElement>('.steps button');
    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(false);
    prev.click();
    expect(pages).toEqual([2]);
    expect(el.querySelector('.range')?.textContent?.trim()).toBe('21–30 of 30');
  });

  it('draws empty and error states across every column, with Retry on error', () => {
    const empty = render({ state: 'empty' }).el;
    expect(empty.querySelector('.message-row td')?.getAttribute('colspan')).toBe('2');
    expect(empty.textContent).toContain('No results');
    const { el, table } = render({ state: 'error' });
    let retried = false;
    table.retry.subscribe(() => (retried = true));
    el.querySelector<HTMLButtonElement>('.message-row button')!.click();
    expect(retried).toBe(true);
  });

  it('activates a row by click and by Enter', () => {
    const { el, table } = render();
    const got: string[] = [];
    table.rowActivate.subscribe((r) => got.push(r.id));
    const rows = el.querySelectorAll<HTMLTableRowElement>('tbody tr');
    rows[0].click();
    rows[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(got).toEqual(['a', 'b']);
  });
});
