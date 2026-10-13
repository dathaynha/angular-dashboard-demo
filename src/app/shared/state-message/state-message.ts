import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../core/icon';

/** The one look for "nothing here" and "that failed", in cards and tables alike. */
@Component({
  selector: 'app-state-message',
  imports: [Icon],
  template: `
    <span class="badge" aria-hidden="true"
      ><i [appIcon]="kind() === 'error' ? 'alert' : 'inbox'"></i
    ></span>
    <p class="title">{{ heading() }}</p>
    @if (text()) {
      <p class="text">{{ text() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 100%;
      padding: 24px 16px;
      text-align: center;
    }
    .badge {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      margin-bottom: 4px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--page-ink) 7%, transparent);
      color: var(--page-muted);
      font-size: 20px;
    }
    :host(.is-error) .badge {
      background: color-mix(in srgb, var(--status-critical) 14%, transparent);
      color: var(--delta-bad);
    }
    .title {
      font-weight: 600;
    }
    .text {
      max-width: 36ch;
      color: var(--page-copy);
      font-size: 13px;
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .actions:empty {
      display: none;
    }
  `,
  host: {
    '[class.is-error]': "kind() === 'error'",
    '[attr.role]': "kind() === 'error' ? 'alert' : null",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMessage {
  readonly kind = input<'empty' | 'error'>('empty');
  readonly heading = input.required<string>();
  readonly text = input('');
}
