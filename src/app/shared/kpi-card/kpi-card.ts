import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Kpi } from '../../core/api/models';
import { Icon } from '../../core/icon';
import { fmt } from '../charts/chart-format';
import type { ChartState, ValueFormat } from '../charts/chart.types';
import { Sparkline } from '../charts/d3/sparkline';

const FORMAT: Record<Kpi['unit'], ValueFormat> = { '': 'number', '%': 'percent', ms: 'duration' };

/** A stat tile: label, value, change against the previous period, and its trend. */
@Component({
  selector: 'app-kpi-card',
  imports: [Icon, Sparkline],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly kpi = input<Kpi | null>(null);
  readonly state = input<ChartState>('ready');
  readonly stale = input(false);
  /** Shown while loading, empty or failed, when there is no KPI to name it. */
  readonly label = input('');
  /** e.g. "previous 24 h" */
  readonly period = input('previous period');
  readonly retry = output<void>();

  protected readonly name = computed(() => this.kpi()?.label ?? this.label());
  protected readonly format = computed(() => FORMAT[this.kpi()?.unit ?? '']);

  protected readonly value = computed(() => {
    const kpi = this.kpi();
    if (!kpi) return '–';
    return kpi.unit === '' ? fmt.compact(kpi.value) : fmt.value(kpi.value, this.format());
  });

  protected readonly exact = computed(() => {
    const kpi = this.kpi();
    return kpi ? fmt.value(kpi.value, this.format()) : '';
  });

  /** Direction for the arrow; tone says whether that direction is good news. */
  protected readonly delta = computed(() => {
    const kpi = this.kpi();
    if (!kpi) return null;
    const d = kpi.deltaPct;
    const direction = Math.abs(d) < 0.05 ? 'flat' : d > 0 ? 'up' : 'down';
    const tone = direction === 'flat' ? 'neutral' : direction === kpi.better ? 'good' : 'bad';
    const text = `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt.value(Math.abs(d), 'percent')}`;
    const meaning = tone === 'neutral' ? 'unchanged' : tone === 'good' ? 'better' : 'worse';
    return { direction, tone, text, meaning };
  });
}
