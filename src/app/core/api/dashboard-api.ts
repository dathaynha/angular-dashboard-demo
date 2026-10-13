import { Observable } from 'rxjs';
import {
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

/**
 * The dashboard's only door to data, shaped like a REST API (one method per
 * endpoint). Components never see which implementation is provided: the mock
 * today, `HttpDashboardApi` against a real backend.
 */
export abstract class DashboardApi {
  /** GET /kpis?range=&service= */
  abstract getKpis(scope: Scope): Observable<Kpi[]>;
  /** GET /traffic?range=&service= */
  abstract getTraffic(scope: Scope): Observable<TrafficPoint[]>;
  /** GET /traffic/by-service?range=&service= */
  abstract getRequestsByService(scope: Scope): Observable<ServiceSeries>;
  /** GET /traffic/by-status?range=&service= */
  abstract getStatusBreakdown(scope: Scope): Observable<StatusCount[]>;
  /** GET /flow?range=&service= */
  abstract getRequestFlow(scope: Scope): Observable<FlowGraph>;
  /** GET /latency/heatmap?range=&service= */
  abstract getLatencyHeatmap(scope: Scope): Observable<HeatCell[]>;
  /** GET /uptime (last 90 days) */
  abstract getUptime(): Observable<UptimeDay[]>;
  /** GET /endpoints/top?range=&service=&limit= */
  abstract getTopEndpoints(scope: Scope, limit: number): Observable<EndpointCount[]>;
  /** GET /requests?range=&q=&service=&status=&method=&sort=&dir=&page=&pageSize= */
  abstract listRequests(query: RequestQuery): Observable<Page<RequestRecord>>;
  /** GET /requests/:id */
  abstract getRequest(id: string): Observable<RequestRecord>;
}
