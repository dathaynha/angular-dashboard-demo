import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TimeRange, TrafficPoint } from '../../../core/api/models';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { fmt } from '../../../shared/charts/chart-format';
import type { ChartState, ChartTable } from '../../../shared/charts/chart.types';
import { EChart } from '../../../shared/charts/echarts/echart';
import { alpha, baseOption, injectChartColors } from '../../../shared/charts/echarts/chart-colors';

const HOUR = 3_600_000;

/**
 * Requests per minute: up to 43,200 points for 30 days, which is ECharts' job
 * (canvas, LTTB sampling, zoom by wheel, pinch or the slider).
 */
@Component({
  selector: 'app-traffic-chart',
  imports: [ChartCard, EChart],
  template: `
    <app-chart-card
      heading="Requests per minute"
      [subtitle]="subtitle()"
      [library]="library()"
      [state]="state()"
      [stale]="stale()"
      [errorText]="errorText()"
      [table]="table()"
      filename="traffic"
      [bodyHeight]="300"
      (retry)="retry.emit()"
    >
      <app-echart [option]="option()" />
    </app-chart-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrafficChart {
  readonly points = input<TrafficPoint[] | undefined>(undefined);
  readonly range = input.required<TimeRange>();
  readonly state = input<ChartState>('loading');
  readonly stale = input(false);
  readonly errorText = input('');
  readonly retry = output<void>();

  private readonly colors = injectChartColors();

  protected readonly subtitle = computed(() => 'UTC. Scroll, pinch or drag the slider to zoom.');
  protected readonly library = computed(
    () => `ECharts · canvas · ${fmt.value(this.points()?.length ?? 0)} points`,
  );

  protected readonly option = computed(() => {
    const c = this.colors();
    const points = this.points();
    if (!c || !points?.length) return null;
    const base = baseOption(c);
    return {
      textStyle: base.textStyle,
      useUTC: base.useUTC,
      animation: base.animation,
      animationDuration: base.animationDuration,
      grid: { left: 8, right: 12, top: 12, bottom: 44, containLabel: true },
      tooltip: {
        ...base.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: c.axis } },
        formatter: (params: { dataIndex: number }[]) => {
          const p = points[params[0].dataIndex];
          return `<div style="color:${c.muted}">${fmt.dateTime(p.t)} UTC</div>
            <b>${fmt.value(p.requests)}</b> requests<br>
            <b>${fmt.value(p.errors)}</b> failed (5xx)`;
        },
      },
      xAxis: { type: 'time', ...base.axis, splitLine: { show: false } },
      yAxis: {
        type: 'value',
        ...base.axis,
        axisLabel: { ...base.axis.axisLabel, formatter: (v: number) => fmt.compact(v) },
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        {
          type: 'slider',
          height: 18,
          bottom: 6,
          borderColor: c.grid,
          fillerColor: alpha(c.accent, 0.08),
          handleStyle: { color: c.surface, borderColor: c.axis },
          moveHandleStyle: { color: c.grid },
          dataBackground: { lineStyle: { color: c.axis }, areaStyle: { color: c.grid } },
          textStyle: { color: c.muted, fontSize: 10 },
          labelFormatter: (v: number) => fmt.date(v),
        },
      ],
      series: [
        {
          type: 'line',
          name: 'Requests',
          data: points.map((p) => [p.t, p.requests]),
          showSymbol: false,
          sampling: 'lttb',
          lineStyle: { width: 2, color: c.accent },
          itemStyle: { color: c.accent },
          areaStyle: { color: c.accent, opacity: 0.1 },
        },
      ],
    };
  });

  /** The table is hourly: 43,200 rows would help nobody. */
  protected readonly table = computed<ChartTable | null>(() => {
    const points = this.points();
    if (!points?.length) return null;
    const hours = new Map<number, [number, number]>();
    for (const p of points) {
      const h = Math.floor(p.t / HOUR) * HOUR;
      const [r, e] = hours.get(h) ?? [0, 0];
      hours.set(h, [r + p.requests, e + p.errors]);
    }
    return {
      columns: ['Hour (UTC)', 'Requests', 'Failed (5xx)'],
      rows: [...hours].map(([h, [r, e]]) => [fmt.dateTime(h), r, e]),
    };
  });
}
