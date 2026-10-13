import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface LegendItem {
  label: string;
  color: string;
}

/** Series keys: a swatch shaped like the mark (bar or line) beside text in ink, never in the series colour. */
@Component({
  selector: 'app-legend',
  template: `
    <ul>
      @for (item of items(); track item.label) {
        <li>
          <span
            class="key"
            [class.is-line]="shape() === 'line'"
            [style.background]="item.color"
          ></span>
          {{ item.label }}
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--page-copy);
      font-size: 12px;
    }
    li {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }
    .key {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .key.is-line {
      width: 14px;
      height: 2px;
      border-radius: 1px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legend {
  readonly items = input.required<readonly LegendItem[]>();
  readonly shape = input<'rect' | 'line'>('rect');
}
