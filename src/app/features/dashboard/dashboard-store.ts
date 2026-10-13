import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { DashboardApi } from '../../core/api/dashboard-api';
import { DataRefresh } from '../../core/api/data-refresh';
import { isBrowser, LoadState, loadState } from '../../core/api/load-state';
import { DashboardFilters, RANGES } from '../../core/filters';
import { Page, RequestRecord, Scope } from '../../core/api/models';
import { DashboardQuery, parseQuery, toParams } from './dashboard-query';

/**
 * The page's state. The URL is the source of truth for what the reader chose;
 * resources load from it in the browser, so the prerendered page ships skeletons.
 */
@Injectable()
export class DashboardStore {
  private readonly api = inject(DashboardApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(DataRefresh);
  private readonly browser = isBrowser();

  readonly query = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((p) => parseQuery(Object.fromEntries(p.keys.map((k) => [k, p.get(k)])))),
    ),
    { requireSync: true },
  );

  readonly filters = computed<DashboardFilters>(() => {
    const { range, q, services, statuses } = this.query();
    return { range, q, services, statuses };
  });
  /**
   * What the charts are scoped to: range and services, nothing else. Compared by
   * value, so typing a search or turning a table page leaves every chart as it is.
   */
  readonly scope = computed<Scope>(
    () => ({ range: this.query().range, services: this.query().services }),
    { equal: (a, b) => a.range === b.range && a.services?.join() === b.services?.join() },
  );
  readonly period = computed(() => RANGES.find((r) => r.key === this.scope().range)!.period);

  /** Params for every scoped view: the scope, plus the refresh tick. */
  private readonly ranged = () =>
    this.browser ? { scope: this.scope(), tick: this.refresh.tick() } : undefined;

  readonly kpis = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getKpis(params.scope),
  });
  readonly kpiLoad = loadState(this.kpis, (k) => k.length === 0);

  readonly traffic = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getTraffic(params.scope),
  });
  readonly trafficLoad = loadState(this.traffic, (v) => v.length === 0);

  readonly byService = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getRequestsByService(params.scope),
  });
  readonly byServiceLoad = loadState(this.byService, (v) => v.series.length === 0);

  readonly statuses = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getStatusBreakdown(params.scope),
  });
  readonly statusLoad = loadState(this.statuses, (v) => v.length === 0);

  readonly flow = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getRequestFlow(params.scope),
  });
  readonly flowLoad = loadState(this.flow, (v) => v.links.length === 0);

  readonly heatmap = rxResource({
    params: this.ranged,
    stream: ({ params }) => this.api.getLatencyHeatmap(params.scope),
  });
  readonly heatmapLoad = loadState(this.heatmap, (v) => v.length === 0);

  readonly requests = rxResource({
    params: () => {
      if (!this.browser) return undefined;
      const { size, ...q } = this.query();
      return { ...q, pageSize: size, tick: this.refresh.tick() };
    },
    stream: ({ params }) => {
      // A refresh (or a demo-state switch) starts clean, with skeletons like the charts.
      if (params.tick !== this.pageTick) this.lastPage.set(undefined);
      this.pageTick = params.tick;
      return this.api.listRequests(params).pipe(tap((page) => this.lastPage.set(page)));
    },
  });
  private readonly requestState = loadState(this.requests, (p) => p.total === 0);
  /**
   * The last page that arrived, recorded as it arrives (not when read). While
   * the next one loads the table keeps it, dimmed, rather than swapping in
   * skeleton rows of another height.
   */
  private readonly lastPage = signal<Page<RequestRecord> | undefined>(undefined);
  private pageTick = -1;
  readonly requestLoad: LoadState = {
    ...this.requestState,
    state: computed(() =>
      this.requestState.state() === 'loading' && this.lastPage()
        ? 'ready'
        : this.requestState.state(),
    ),
    stale: computed(
      () =>
        this.requestState.stale() || (this.requestState.state() === 'loading' && !!this.lastPage()),
    ),
  };
  readonly rows = computed(() => this.lastPage()?.items ?? []);
  readonly total = computed(() => this.lastPage()?.total ?? 0);

  /** A new filter starts from the first page. */
  setFilters(filters: DashboardFilters): void {
    this.set({ ...filters, page: 1 });
  }

  set(change: Partial<DashboardQuery>): void {
    this.router.navigate([], {
      queryParams: toParams({ ...this.query(), ...change }),
      queryParamsHandling: 'merge',
      replaceUrl: true,
      preserveFragment: true,
    });
  }

  reload(): void {
    this.refresh.reload();
  }
}
