import { inject, Injectable, InjectionToken } from '@angular/core';
import { defer, from, map, NEVER, Observable, of, switchMap, throwError, timer } from 'rxjs';
import { DemoScenario } from '../demo/demo-scenario';
import { DashboardApi } from './dashboard-api';
import { ApiError, DEFAULT_PAGE_SIZE, RequestQuery, Scope } from './models';

type Mock = typeof import('./mock');

/** Simulated network time per call, min and max in ms. Specs set it to [0, 0]. */
export const MOCK_LATENCY = new InjectionToken<readonly [number, number]>('MOCK_LATENCY', {
  factory: () => [120, 350],
});

/** The seeded mock behind the REST-shaped interface, answering per the demo scenario. */
@Injectable()
export class MockDashboardApi extends DashboardApi {
  private readonly scenario = inject(DemoScenario);
  private readonly latency = inject(MOCK_LATENCY);

  private respond<T>(build: (m: Mock) => T, empty: () => T): Observable<T> {
    return defer(() => {
      const scenario = this.scenario.current();
      if (scenario === 'loading') return NEVER;
      const [min, max] = this.latency;
      const wait = min + Math.random() * (max - min);
      const answer: Observable<T> =
        scenario === 'error'
          ? throwError(() => new ApiError(503, 'The service is unavailable. Try again shortly.'))
          : scenario === 'empty'
            ? from([empty()])
            : from(import('./mock')).pipe(map(build));
      return wait ? timer(wait).pipe(switchMap(() => answer)) : answer;
    });
  }

  getKpis({ range, services }: Scope) {
    return this.respond(
      (m) => m.kpis(range, services),
      () => [],
    );
  }

  getTraffic({ range, services }: Scope) {
    return this.respond(
      (m) => m.traffic(range, services),
      () => [],
    );
  }

  getRequestsByService({ range, services }: Scope) {
    return this.respond(
      (m) => m.requestsByService(range, services),
      () => ({ buckets: [], series: [] }),
    );
  }

  getStatusBreakdown({ range, services }: Scope) {
    return this.respond(
      (m) => m.statusBreakdown(range, services),
      () => [],
    );
  }

  getRequestFlow({ range, services }: Scope) {
    return this.respond(
      (m) => m.requestFlow(range, services),
      () => ({ nodes: [], links: [] }),
    );
  }

  getLatencyHeatmap({ range, services }: Scope) {
    return this.respond(
      (m) => m.latencyHeatmap(range, services),
      () => [],
    );
  }

  getUptime() {
    return this.respond(
      (m) => m.uptimeDays(),
      () => [],
    );
  }

  getTopEndpoints({ range, services }: Scope, limit: number) {
    return this.respond(
      (m) => m.topEndpoints(range, limit, services),
      () => [],
    );
  }

  listRequests(query: RequestQuery) {
    return this.respond(
      (m) => m.queryRequests(m.requestLog(), query, m.NOW),
      () => ({ items: [], total: 0, page: 1, pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE }),
    );
  }

  getRequest(id: string) {
    return this.respond(
      (m) => m.requestLog().find((r) => r.id === id),
      () => undefined,
    ).pipe(
      switchMap((record) =>
        record ? of(record) : throwError(() => new ApiError(404, `No request with id ${id}.`)),
      ),
    );
  }
}
