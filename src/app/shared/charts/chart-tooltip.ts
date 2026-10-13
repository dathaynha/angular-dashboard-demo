import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface TooltipData {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; color?: string }[];
}

/**
 * A d3 chart's tooltip, above its point and kept inside the chart's width. A
 * polite live region, so what the keyboard lands on is also read out.
 * Values lead (strong), labels follow; a short line keys the series.
 */
@Component({
  selector: 'app-chart-tooltip',
  template: `
    <div aria-live="polite">
      @if (tooltip(); as tip) {
        <div class="tip" [style.left.px]="left()" [style.top.px]="tip.y">
          <p class="title">{{ tip.title }}</p>
          @for (row of tip.rows; track row.label) {
            <p class="row">
              @if (row.color) {
                <span class="key" [style.background]="row.color"></span>
              }
              <strong>{{ row.value }}</strong>
              <span>{{ row.label }}</span>
            </p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    .tip {
      position: absolute;
      z-index: 2;
      max-width: 14rem;
      padding: 8px 10px;
      transform: translate(-50%, calc(-100% - 10px));
      border: 1px solid var(--card-border);
      border-radius: 8px;
      background: var(--card-bg);
      box-shadow: 0 6px 18px color-mix(in srgb, var(--datha-surface-950) 14%, transparent);
      font-size: 12px;
      line-height: 1.4;
      pointer-events: none;
    }
    .title {
      margin-bottom: 2px;
      color: var(--page-muted);
    }
    .row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    strong {
      font-variant-numeric: tabular-nums;
    }
    .row span:last-child {
      color: var(--page-copy);
    }
    .key {
      width: 12px;
      height: 2px;
      border-radius: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTooltip {
  readonly tooltip = input<TooltipData | null>(null);
  readonly bounds = input(0);

  /** Half the max width keeps it from running past either edge. */
  protected readonly left = computed(() => {
    const tip = this.tooltip();
    if (!tip) return 0;
    const half = 112;
    const b = this.bounds();
    return b > half * 2 ? Math.min(Math.max(tip.x, half), b - half) : tip.x;
  });
}
