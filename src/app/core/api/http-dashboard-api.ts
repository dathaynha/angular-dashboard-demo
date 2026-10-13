import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { DashboardApi } from './dashboard-api';
import {
  ApiError,
  EndpointCount,
  FlowGraph,
  HeatCell,
  Kpi,
  Page,
  RequestQuery,
  RequestRecord,
  ServiceSeries,
  StatusCount,
  Scope,
  TrafficPoint,
  UptimeDay,
} from './models';

const scoped = ({ range, services = [] }: Scope) => ({ range, service: services });

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * The same interface against a real backend. Not provided in this demo; swapping
 * it in is one provider (see `provideDashboardApi`) plus `provideHttpClient()`.
 */
@Injectable()
export class HttpDashboardApi extends DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  private get<T>(path: string, params: Record<string, string | number | string[]> = {}) {
    const defined = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    return this.http
      .get<T>(`${this.base}${path}`, {
        params: new HttpParams({ fromObject: Object.fromEntries(defined) }),
      })
      .pipe(
        catchError((error: HttpErrorResponse) =>
          throwError(() => new ApiError(error.status, error.message)),
        ),
      );
  }

  getKpis(scope: Scope): Observable<Kpi[]> {
    return this.get('/kpis', scoped(scope));
  }

  getTraffic(scope: Scope): Observable<TrafficPoint[]> {
    return this.get('/traffic', scoped(scope));
  }

  getRequestsByService(scope: Scope): Observable<ServiceSeries> {
    return this.get('/traffic/by-service', scoped(scope));
  }

  getStatusBreakdown(scope: Scope): Observable<StatusCount[]> {
    return this.get('/traffic/by-status', scoped(scope));
  }

  getRequestFlow(scope: Scope): Observable<FlowGraph> {
    return this.get('/flow', scoped(scope));
  }

  getLatencyHeatmap(scope: Scope): Observable<HeatCell[]> {
    return this.get('/latency/heatmap', scoped(scope));
  }

  getUptime(): Observable<UptimeDay[]> {
    return this.get('/uptime');
  }

  getTopEndpoints(scope: Scope, limit: number): Observable<EndpointCount[]> {
    return this.get('/endpoints/top', { ...scoped(scope), limit });
  }

  listRequests(query: RequestQuery): Observable<Page<RequestRecord>> {
    const { services = [], statuses = [], methods = [], ...rest } = query;
    return this.get('/requests', {
      ...(rest as Record<string, string | number>),
      service: services,
      status: statuses,
      method: methods,
    });
  }

  getRequest(id: string): Observable<RequestRecord> {
    return this.get(`/requests/${encodeURIComponent(id)}`);
  }
}
