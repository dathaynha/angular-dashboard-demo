import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import {
  SERVICES,
  ServiceName,
  STATUS_CLASSES,
  StatusClass,
  TimeRange,
} from '../../core/api/models';
import { DashboardFilters, DEFAULT_FILTERS, isFiltered, RANGES } from '../../core/filters';
import { Icon } from '../../core/icon';
import { serviceColor, STATUS_COLORS } from '../charts/chart-palette';
import { MultiSelect, SelectOption } from './multi-select';
import { SearchField } from './search-field';

export type FilterControl = 'range' | 'search' | 'services' | 'statuses';

/**
 * One row above the content it scopes, date range first. Two-way bound to the
 * shared filter model; the search box waits for a pause in typing.
 * The dashboard keeps search beside the table it searches, so it leaves `search` out.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [Icon, MultiSelect, SearchField],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBar {
  readonly filters = model<DashboardFilters>(DEFAULT_FILTERS);
  readonly controls = input<readonly FilterControl[]>(['range', 'search', 'services', 'statuses']);
  readonly searchLabel = input('Search');

  protected readonly ranges = RANGES;
  protected readonly serviceOptions: SelectOption<ServiceName>[] = SERVICES.map((s) => ({
    value: s,
    label: s,
    color: serviceColor(s),
  }));
  protected readonly statusOptions: SelectOption<StatusClass>[] = STATUS_CLASSES.map((s) => ({
    value: s,
    label: s,
    color: STATUS_COLORS[s],
  }));
  protected readonly filtered = computed(() => isFiltered(this.filters()));

  protected has(control: FilterControl): boolean {
    return this.controls().includes(control);
  }

  protected patch(change: Partial<DashboardFilters>): void {
    this.filters.update((f) => ({ ...f, ...change }));
  }

  protected setRange(range: TimeRange): void {
    this.patch({ range });
  }

  protected clear(): void {
    this.patch({ q: '', services: [], statuses: [] });
  }
}
