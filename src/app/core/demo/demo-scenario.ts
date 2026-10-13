import { Injectable, signal } from '@angular/core';

export const SCENARIOS = ['normal', 'loading', 'empty', 'error'] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const isScenario = (value: unknown): value is Scenario =>
  SCENARIOS.includes(value as Scenario);

/** How the mock API answers, so every loading, empty and error state can be seen on demand. */
@Injectable({ providedIn: 'root' })
export class DemoScenario {
  readonly current = signal<Scenario>('normal');
}
