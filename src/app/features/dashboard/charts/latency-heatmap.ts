import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HeatCell, TimeRange } from '../../../core/api/models';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { fmt } from '../../../shared/charts/chart-format';
import type { ChartState, ChartTable } from '../../../shared/charts/chart.types';
import { EChart } from '../../../shared/charts/echarts/echart';
import { baseOption, injectChartColors } from '../../../shared/charts/echarts/chart-colors';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** p95 bands, fast to slow, one ramp step each. */
const BANDS = [
  { lt: 150, label: '< 150 ms' },
  { gte: 150, lt: 250, label: '150–250 ms' },
  { gte: 250, lt: 400, label: '250–400 ms' },
  { gte: 400, lt: 1000, label: '400 ms–1 s' },
  { gte: 1000, label: '≥ 1 s' },
];
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

/** p95 latency by weekday and hour: one sequential hue in fixed bands, light (fast) to dark (slow). */
@Component({
  selector: 'app-latency-heatmap',
  imports: [ChartCard, EChart],
  template: `
    <app-chart-card
      heading="Latency by hour"
      [subtitle]="subtitle()"
      library="ECharts · canvas"
      [state]="state()"
      [stale]="stale()"
      [errorText]="errorText()"
      [table]="table()"
      filename="latency-heatmap"
      [bodyHeight]="320"
      (retry)="retry.emit()"
    >
      <app-echart [option]="option()" />
    </app-chart-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatencyHeatmap {
  readonly cells = input<HeatCell[] | undefined>(undefined);
  readonly range = input.required<TimeRange>();
  readonly state = input<ChartState>('loading');
  readonly stale = input(false);
  readonly errorText = input('');
  readonly retry = output<void>();

  private readonly colors = injectChartColors();

  protected readonly subtitle = computed(
    () => `p95 by weekday and hour, UTC${this.range() === '24h' ? ', over the last 7 days' : ''}`,
  );

  protected readonly option = computed(() => {
    const c = this.colors();
    const cells = this.cells();
    if (!c || !cells?.length) return null;
    const base = baseOption(c);
    return {
      textStyle: base.textStyle,
      useUTC: base.useUTC,
      animation: base.animation,
      animationDuration: base.animationDuration,
      grid: { left: 8, right: 8, top: 4, bottom: 48, containLabel: true },
      tooltip: {
        ...base.tooltip,
        formatter: (p: { value: [number, number, number] }) =>
          `<div style="color:${c.muted}">${DAYS[p.value[1]]} ${HOURS[p.value[0]]}:00 UTC</div><b>${fmt.value(p.value[2], 'duration')}</b> p95`,
      },
      xAxis: {
        type: 'category',
        data: HOURS,
        ...base.axis,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { ...base.axis.axisLabel, interval: 2 },
      },
      yAxis: {
        type: 'category',
        data: DAYS,
        inverse: true,
        ...base.axis,
        axisLine: { show: false },
        splitLine: { show: false },
      },
      // Fixed bands, not the data's own min and max: a slow service then reads as
      // slow (dark), a fast one as fast (light), instead of every scope drawing the
      // same picture with different numbers.
      visualMap: {
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: c.muted, fontSize: 11 },
        pieces: BANDS.map((band, i) => ({ ...band, color: c.sequential[i] })),
      },
      series: [
        {
          type: 'heatmap',
          data: cells.map((cell) => [cell.hour, cell.weekday, cell.p95Ms]),
          // The surface edge is the 2px gap between cells.
          itemStyle: { borderColor: c.surface, borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: c.ink, borderWidth: 1 } },
        },
      ],
    };
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const cells = this.cells();
    if (!cells?.length) return null;
    return {
      columns: ['Weekday', ...HOURS.map((h) => `${h}:00`)],
      rows: DAYS.map((day, d) => [
        day,
        ...HOURS.map((_, h) => cells.find((c) => c.weekday === d && c.hour === h)?.p95Ms ?? null),
      ]),
    };
  });
}
