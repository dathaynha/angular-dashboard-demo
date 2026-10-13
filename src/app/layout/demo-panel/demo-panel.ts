import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DataRefresh } from '../../core/api/data-refresh';
import { DemoScenario, isScenario, Scenario } from '../../core/demo/demo-scenario';

const OPTIONS: { value: Scenario; label: string; hint: string }[] = [
  { value: 'normal', label: 'Normal', hint: 'Seeded data after 120–350 ms of simulated latency.' },
  { value: 'loading', label: 'Loading', hint: 'Requests never finish, so the skeletons stay.' },
  { value: 'empty', label: 'Empty', hint: 'Every endpoint answers with no data.' },
  { value: 'error', label: 'Error', hint: 'Every endpoint fails with 503 Service Unavailable.' },
];

/**
 * Floating switch for how the mock API answers, so a visitor can see each state.
 * `?demo=error` (or loading, empty) opens the app in that state, for sharing a link.
 */
@Component({
  selector: 'app-demo-panel',
  templateUrl: './demo-panel.html',
  styleUrl: './demo-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPanel {
  private readonly router = inject(Router);
  private readonly refresh = inject(DataRefresh);
  protected readonly scenario = inject(DemoScenario).current;
  protected readonly options = OPTIONS;
  protected readonly label = computed(
    () => OPTIONS.find((o) => o.value === this.scenario())!.label,
  );

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const demo = params.get('demo');
        if (isScenario(demo) && demo !== this.scenario()) this.apply(demo);
      });
  }

  protected choose(value: Scenario): void {
    this.apply(value);
    this.router.navigate([], {
      queryParams: { demo: value === 'normal' ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private apply(value: Scenario): void {
    this.scenario.set(value);
    this.refresh.reload();
  }
}
