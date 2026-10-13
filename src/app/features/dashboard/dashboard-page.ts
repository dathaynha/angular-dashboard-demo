import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  RequestRecord,
  SortField,
  STATUS_CLASSES,
  StatusClass,
  statusClass,
} from '../../core/api/models';
import { fmt } from '../../shared/charts/chart-format';
import { STATUS_COLORS } from '../../shared/charts/chart-palette';
import { CellDef, Column, DataTable, SortDir } from '../../shared/data-table/data-table';
import { FilterBar } from '../../shared/filter-bar/filter-bar';
import { SearchField } from '../../shared/filter-bar/search-field';
import { MultiSelect, SelectOption } from '../../shared/filter-bar/multi-select';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { Intro } from './intro/intro';
import { DashboardStore } from './dashboard-store';
import { PAGE_SIZES } from './dashboard-query';
import { FlowChart } from './charts/flow-chart';
import { LatencyHeatmap } from './charts/latency-heatmap';
import { ServiceChart } from './charts/service-chart';
import { StatusChart } from './charts/status-chart';
import { TrafficChart } from './charts/traffic-chart';
import { provideCharts } from '../../shared/charts/echarts/echart';

/** The whole dashboard on one scrolling page; the dock links to its sections. */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    Intro,
    FilterBar,
    SearchField,
    MultiSelect,
    KpiCard,
    DataTable,
    CellDef,
    TrafficChart,
    ServiceChart,
    StatusChart,
    FlowChart,
    LatencyHeatmap,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  providers: [DashboardStore, provideCharts()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
  /** Read from the data, so a real backend shows its own time with no change here. */
  protected readonly asOf = computed(() => {
    const traffic = this.store.traffic;
    const last = traffic.hasValue() ? traffic.value().at(-1) : undefined;
    if (!last) return 'Mock data, generated in the browser';
    const end = last.t + 60_000;
    return `Mock data, as of ${fmt.date(end)}, ${fmt.time(end)} UTC`;
  });
  protected readonly kpiSlots = ['Requests', 'Error rate', 'p95 latency', 'Uptime'];
  protected readonly pageSizes = PAGE_SIZES;

  protected readonly columns: Column<RequestRecord>[] = [
    {
      key: 'timestamp',
      header: 'Time (UTC)',
      sortable: true,
      text: (r) => fmt.dateTime(r.timestamp),
    },
    { key: 'method', header: 'Method', text: (r) => r.method },
    { key: 'path', header: 'Path', sortable: true, text: (r) => r.path },
    { key: 'service', header: 'Service', sortable: true, text: (r) => r.service },
    { key: 'statusCode', header: 'Status', sortable: true },
    {
      key: 'durationMs',
      header: 'Duration',
      sortable: true,
      align: 'end',
      text: (r) => fmt.value(r.durationMs, 'duration'),
    },
  ];
  protected readonly statusOptions: SelectOption<StatusClass>[] = STATUS_CLASSES.map((s) => ({
    value: s,
    label: s,
    color: STATUS_COLORS[s],
  }));
  protected readonly rowKey = (r: RequestRecord) => r.id;
  protected readonly statusColor = (code: number) => STATUS_COLORS[statusClass(code)];

  protected sortBy(change: { sort: string; dir: SortDir }): void {
    this.store.set({ sort: change.sort as SortField, dir: change.dir, page: 1 });
  }
}
