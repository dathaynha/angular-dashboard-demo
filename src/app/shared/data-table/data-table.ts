import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  Directive,
  inject,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { Icon } from '../../core/icon';
import { fmt } from '../charts/chart-format';
import type { ChartState } from '../charts/chart.types';
import { StateMessage } from '../state-message/state-message';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  /** Numbers align to the end, so their digits line up. */
  align?: 'start' | 'end';
  /** Plain text for the cell when no `appCell` template is given. */
  text?: (row: T) => string;
}

export type SortDir = 'asc' | 'desc';

/** A custom cell: `<ng-template appCell="status" let-row>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCell]' })
export class CellDef {
  readonly appCell = input.required<string>();
  readonly template = inject(TemplateRef);
}

/**
 * A table that only presents: sorting and paging are the server's job, so it
 * emits what the reader asked for and draws the page it is given. Draws the
 * loading, empty and error states in place of the rows, under the same header.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, Icon, StateMessage],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T> {
  readonly columns = input.required<readonly Column<T>[]>();
  readonly rows = input<readonly T[]>([]);
  readonly rowKey = input.required<(row: T) => string>();
  readonly caption = input.required<string>();
  readonly state = input<ChartState>('ready');
  readonly stale = input(false);
  readonly sort = input('');
  readonly dir = input<SortDir>('desc');
  readonly page = input(1);
  readonly pageSize = input(25);
  readonly pageSizes = input<readonly number[]>([10, 25, 50]);
  readonly total = input(0);
  readonly selected = input<string | null>(null);
  readonly emptyHeading = input('No results');
  readonly emptyText = input('Nothing matches these filters.');
  readonly errorText = input('The rows could not be loaded.');

  readonly sortChange = output<{ sort: string; dir: SortDir }>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly rowActivate = output<T>();
  readonly retry = output<void>();

  private readonly cells = contentChildren(CellDef);
  protected readonly templates = computed(
    () => new Map(this.cells().map((cell) => [cell.appCell(), cell.template])),
  );

  protected readonly skeletonRows = computed(() =>
    Array.from({ length: Math.min(this.pageSize(), 8) }),
  );
  protected readonly lastPage = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly range = computed(() => {
    if (!this.total()) return '0 results';
    const from = (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(this.total(), this.page() * this.pageSize());
    return `${fmt.value(from)}–${fmt.value(to)} of ${fmt.value(this.total())}`;
  });

  protected ariaSort(column: Column<T>): string | null {
    if (!column.sortable) return null;
    if (this.sort() !== column.key) return 'none';
    return this.dir() === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(column: Column<T>): void {
    const same = this.sort() === column.key;
    this.sortChange.emit({
      sort: column.key,
      dir: same && this.dir() === 'desc' ? 'asc' : 'desc',
    });
  }

  protected goTo(page: number): void {
    this.pageChange.emit(Math.min(this.lastPage(), Math.max(1, page)));
  }
}
