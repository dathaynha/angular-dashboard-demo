import { Injectable, signal } from '@angular/core';

/** Bumped to make every view load its data again: the Refresh button, a scenario switch. */
@Injectable({ providedIn: 'root' })
export class DataRefresh {
  private readonly count = signal(0);
  readonly tick = this.count.asReadonly();

  reload(): void {
    this.count.update((n) => n + 1);
  }
}
