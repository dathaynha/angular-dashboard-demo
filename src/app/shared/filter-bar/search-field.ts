import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { Icon } from '../../core/icon';

/**
 * A search box that reports once typing pauses, not on every key. Its text
 * follows `value`, so clearing the query elsewhere empties the box.
 */
@Component({
  selector: 'app-search-field',
  imports: [Icon],
  template: `
    <label class="search">
      <i appIcon="search"></i>
      <input
        type="search"
        [placeholder]="label()"
        [attr.aria-label]="label()"
        [value]="value()"
        (input)="typed.next($any($event.target).value)"
      />
    </label>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .search {
      display: flex;
      gap: 8px;
      align-items: center;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      background: var(--card-bg);
      color: var(--page-muted);
    }
    .search:focus-within {
      border-color: var(--datha-primary-600);
    }
    input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: none;
      color: var(--page-ink);
      font-size: 13px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchField {
  readonly value = input('');
  readonly label = input('Search');
  readonly valueChange = output<string>();

  protected readonly typed = new Subject<string>();

  constructor() {
    this.typed.pipe(debounceTime(250), takeUntilDestroyed()).subscribe((text) => {
      // Compared with the current value, not the last text sent, so the same
      // search typed again after a clear still goes through.
      const q = text.trim();
      if (q !== this.value()) this.valueChange.emit(q);
    });
  }
}
