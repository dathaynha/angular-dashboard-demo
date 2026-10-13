import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ServiceSeries, TimeRange } from '../../../core/api/models';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { fmt } from '../../../shared/charts/chart-format';
import { serviceColor } from '../../../shared/charts/chart-palette';
import type { ChartState, ChartTable } from '../../../shared/charts/chart.types';
import { EChart } from '../../../shared/charts/echarts/echart';
import { baseOption, injectChartColors } from '../../../shared/charts/echarts/chart-colors';
import { Legend } from '../../../shared/charts/legend';
import { SERVICES } from '../../../core/api/models';

/** Requests per service per bucket, stacked. The API returns only the filtered services. */
@Component({
  selector: 'app-service-chart',
  imports: [ChartCard, EChart, Legend],
  template: `
    <app-chart-card
      heading="Requests by service"
      [subtitle]="range() === '24h' ? 'Per hour, UTC' : 'Per day, UTC'"
      library="ECharts · canvas"
      [state]="state()"
      [stale]="stale()"
      [errorText]="errorText()"
      [table]="table()"
      filename="requests-by-service"
      [bodyHeight]="280"
      (retry)="retry.emit()"
    >
      <app-echart [option]="option()" />
      <app-legend cardLegend [items]="legend()" />
    </app-chart-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceChart {
  readonly data = input<ServiceSeries | undefined>(undefined);
  readonly range = input.required<TimeRange>();
  readonly state = input<ChartState>('loading');
  readonly stale = input(false);
  readonly errorText = input('');
  readonly retry = output<void>();

  private readonly colors = injectChartColors();

  /** Colour follows the service (its fixed slot), so filtering never repaints the rest. */
  private readonly series = computed(() => this.data()?.series ?? []);

  protected readonly legend = computed(() =>
    this.series().map((s) => ({ label: s.service, color: serviceColor(s.service) })),
  );

  private readonly label = (t: number) => (this.range() === '24h' ? fmt.time(t) : fmt.date(t));

  protected readonly option = computed(() => {
    const c = this.colors();
    const data = this.data();
    const series = this.series();
    if (!c || !data || !series.length) return null;
    const base = baseOption(c);
    const last = series.length - 1;
    return {
      textStyle: base.textStyle,
      useUTC: base.useUTC,
      animation: base.animation,
      animationDuration: base.animationDuration,
      grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        ...base.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: c.grid, opacity: 0.4 } },
        valueFormatter: (v: number) => fmt.value(v),
      },
      xAxis: {
        type: 'category',
        data: data.buckets.map(this.label),
        ...base.axis,
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...base.axis,
        axisLabel: { ...base.axis.axisLabel, formatter: (v: number) => fmt.compact(v) },
      },
      series: series.map((s, i) => ({
        type: 'bar',
        name: s.service,
        stack: 'total',
        barMaxWidth: 24,
        data: s.values,
        // A 1px surface edge on each segment leaves a 2px gap between them.
        itemStyle: {
          color: c.series[SERVICES.indexOf(s.service)],
          borderColor: c.surface,
          borderWidth: 1,
          borderRadius: i === last ? [4, 4, 0, 0] : 0,
        },
        emphasis: { focus: 'series' },
      })),
    };
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const data = this.data();
    const series = this.series();
    if (!data || !series.length) return null;
    return {
      columns: ['Bucket (UTC)', ...series.map((s) => s.service)],
      rows: data.buckets.map((b, i) => [this.label(b), ...series.map((s) => s.values[i])]),
    };
  });
}
