import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StatusClass, StatusCount } from '../../../core/api/models';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { fmt } from '../../../shared/charts/chart-format';
import { STATUS_COLORS } from '../../../shared/charts/chart-palette';
import type { ChartState, ChartTable } from '../../../shared/charts/chart.types';
import { EChart } from '../../../shared/charts/echarts/echart';
import { baseOption, injectChartColors } from '../../../shared/charts/echarts/chart-colors';

const MEANING: Record<StatusClass, string> = {
  '2xx': 'Success',
  '3xx': 'Redirect',
  '4xx': 'Client error',
  '5xx': 'Server error',
};

/**
 * Share of responses by status class. A donut, with the total in the middle and
 * every share written out beside it, because four slices of very different size
 * are hard to compare by angle alone.
 */
@Component({
  selector: 'app-status-chart',
  imports: [ChartCard, EChart],
  template: `
    <app-chart-card
      heading="Responses by status"
      subtitle="Share of all requests in the range"
      library="ECharts · canvas"
      [state]="state()"
      [stale]="stale()"
      [errorText]="errorText()"
      [table]="table()"
      filename="responses-by-status"
      [bodyHeight]="280"
      (retry)="retry.emit()"
    >
      <div class="layout">
        <div class="donut">
          <app-echart [option]="option()" />
          <p class="total">
            <strong>{{ total() }}</strong>
            <span>requests</span>
          </p>
        </div>
        <ul class="shares">
          @for (row of rows(); track row.status) {
            <li>
              <span class="key" [style.background]="row.color"></span>
              <span class="name"
                >{{ row.status }} <small>{{ row.meaning }}</small></span
              >
              <strong class="num">{{ row.share }}</strong>
            </li>
          }
        </ul>
      </div>
    </app-chart-card>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      container-type: inline-size;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      height: 100%;
    }
    .donut {
      position: relative;
      height: 100%;
      min-height: 160px;
    }
    .total {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;
      pointer-events: none;
      strong {
        font-size: 20px;
        font-weight: 650;
      }
      span {
        color: var(--page-muted);
        font-size: 12px;
      }
    }
    .shares {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
    }
    li {
      display: grid;
      grid-template-columns: 10px auto auto;
      gap: 8px;
      align-items: center;
      transition: opacity 0.2s ease;
    }
    .key {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    small {
      color: var(--page-muted);
      font-size: 12px;
    }
    strong.num {
      text-align: end;
    }
    /* A narrow card has a small ring: a smaller total stays inside it. */
    @container (max-width: 400px) {
      .layout {
        gap: 12px;
      }
      .total strong {
        font-size: 15px;
      }
      .total span {
        font-size: 11px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChart {
  readonly counts = input<StatusCount[] | undefined>(undefined);
  readonly state = input<ChartState>('loading');
  readonly stale = input(false);
  readonly errorText = input('');
  readonly retry = output<void>();

  private readonly colors = injectChartColors();

  private readonly sum = computed(() => (this.counts() ?? []).reduce((s, c) => s + c.count, 0));
  protected readonly total = computed(() => fmt.compact(this.sum()));

  protected readonly rows = computed(() => {
    return (this.counts() ?? []).map((c) => ({
      status: c.status,
      meaning: MEANING[c.status],
      color: STATUS_COLORS[c.status],
      share: fmt.value((100 * c.count) / Math.max(1, this.sum()), 'percent'),
    }));
  });

  protected readonly option = computed(() => {
    const c = this.colors();
    const counts = this.counts();
    if (!c || !counts?.length) return null;
    const base = baseOption(c);
    return {
      textStyle: base.textStyle,
      useUTC: base.useUTC,
      animation: base.animation,
      animationDuration: base.animationDuration,
      tooltip: {
        ...base.tooltip,
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number }) =>
          `<b>${fmt.value(p.value)}</b> ${p.name} · ${fmt.value(p.percent, 'percent')}`,
      },
      series: [
        {
          type: 'pie',
          radius: ['62%', '86%'],
          padAngle: 1.5,
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: { borderRadius: 4, borderColor: c.surface, borderWidth: 1 },
          data: counts.map((s) => ({
            name: `${s.status} ${MEANING[s.status]}`,
            value: s.count,
            itemStyle: { color: c.status[s.status] },
          })),
        },
      ],
    };
  });

  protected readonly table = computed<ChartTable | null>(() => {
    const counts = this.counts();
    if (!counts?.length) return null;
    return {
      columns: ['Status', 'Meaning', 'Requests', 'Share'],
      rows: counts.map((c) => [
        c.status,
        MEANING[c.status],
        c.count,
        fmt.value((100 * c.count) / Math.max(1, this.sum()), 'percent'),
      ]),
    };
  });
}
