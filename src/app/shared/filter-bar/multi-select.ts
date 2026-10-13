import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Icon } from '../../core/icon';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** A swatch beside the label, for options that are chart series. */
  color?: string;
}

/** A button that opens a checkbox list. No selection means "all". */
@Component({
  selector: 'app-multi-select',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="trigger"
      [class.has-value]="selected().length"
      [attr.aria-expanded]="open()"
      aria-haspopup="true"
      (click)="open.set(!open())"
    >
      <span class="label">{{ label() }}</span>
      <span class="value">{{ summary() }}</span>
      <i appIcon="chevron-down"></i>
    </button>
    @if (open()) {
      <div class="panel" role="group" [attr.aria-label]="label()">
        @for (option of options(); track option.value) {
          <label class="option">
            <input
              type="checkbox"
              [checked]="selected().includes(option.value)"
              (change)="toggle(option.value)"
            />
            @if (option.color) {
              <span class="swatch" [style.background]="option.color" aria-hidden="true"></span>
            }
            {{ option.label }}
          </label>
        }
        @if (selected().length) {
          <button type="button" class="btn btn--quiet clear" (click)="selected.set([])">
            Clear
          </button>
        }
      </div>
    }
  `,
  styleUrl: './multi-select.scss',
  host: {
    '(document:click)': 'closeOutside($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelect<T extends string> {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly selected = model<T[]>([]);
  protected readonly open = signal(false);

  protected readonly summary = computed(() => {
    const picked = this.selected();
    if (!picked.length) return 'All';
    if (picked.length === 1) return this.options().find((o) => o.value === picked[0])?.label ?? '';
    return `${picked.length} selected`;
  });

  protected toggle(value: T): void {
    this.selected.update((list) =>
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
    );
  }

  protected closeOutside(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }
}
