import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

/** ECharts for a page, loaded lazily on first use. */
export const provideCharts = () =>
  provideEchartsCore({ echarts: () => import('./echarts-setup').then((m) => m.default) });

/**
 * A thin wrapper so every ECharts chart sizes the same way: it fills its card's
 * body and redraws when that box changes, not the window. Pass `option: null`
 * until the browser has resolved the theme colours; the box keeps its size.
 */
@Component({
  selector: 'app-echart',
  imports: [NgxEchartsDirective],
  template: `
    @if (option(); as opt) {
      <div echarts class="chart" [options]="opt" [autoResize]="true"></div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-width: 0;
    }
    .chart {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EChart {
  readonly option = input<EChartsCoreOption | null>(null);
}
