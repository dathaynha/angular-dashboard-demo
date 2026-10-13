import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../core/icon';
import { downloadChartCsv } from '../charts/chart-csv';
import type { ChartState, ChartTable } from '../charts/chart.types';
import { StateMessage } from '../state-message/state-message';

/**
 * The frame every chart shares, whichever library draws it: heading, the chart
 * or its data as a table, CSV export, a caption naming the library, and the
 * loading, empty and error states. The chart goes in the default slot;
 * `[cardActions]` sits beside the heading and `[cardLegend]` below the chart.
 *
 * The table is the accessible twin of the chart, and the CSV is written from it.
 */
@Component({
  selector: 'app-chart-card',
  imports: [Icon, StateMessage],
  templateUrl: './chart-card.html',
  styleUrl: './chart-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCard {
  private readonly document = inject(DOCUMENT);

  readonly heading = input.required<string>();
  readonly subtitle = input('');
  readonly state = input<ChartState>('ready');
  /** Earlier data shown while new data loads: dimmed, so the layout never jumps. */
  readonly stale = input(false);
  readonly table = input<ChartTable | null>(null);
  readonly filename = input('chart');
  /** Names the drawing library in the footer, e.g. "d3 · SVG". */
  readonly library = input('');
  readonly emptyText = input('Nothing was recorded in this time range.');
  readonly errorText = input('The data could not be loaded.');
  /**
   * The body's height in every state, so switching state never moves the page.
   * `null` lets a chart that sizes itself (the Sankey) set it; the states then take 320px.
   */
  readonly bodyHeight = input<number | null>(280);
  readonly retry = output<void>();

  protected readonly view = signal<'chart' | 'table'>('chart');

  protected toggleView(): void {
    this.view.update((v) => (v === 'chart' ? 'table' : 'chart'));
  }

  protected exportCsv(): void {
    const table = this.table();
    if (table) downloadChartCsv(this.document, table, this.filename());
  }
}
