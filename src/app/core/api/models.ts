// Shapes the dashboard reads. A real backend returns the same JSON; see DashboardApi.

export type TimeRange = '24h' | '7d' | '30d';

export const SERVICES = [
  'accounts-service',
  'messenger-service',
  'realtime-service',
  'file-service',
  'event-store',
  'notification-service',
  'chatbot-service',
] as const;
export type ServiceName = (typeof SERVICES)[number];

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof METHODS)[number];

export const STATUS_CLASSES = ['2xx', '3xx', '4xx', '5xx'] as const;
export type StatusClass = (typeof STATUS_CLASSES)[number];

export const statusClass = (code: number): StatusClass =>
  `${Math.floor(code / 100)}xx` as StatusClass;

/** What every aggregate view is scoped to: a time range and, optionally, some services. */
export interface Scope {
  range: TimeRange;
  /** None means every service. */
  services?: ServiceName[];
}

export type ClientKind = 'web' | 'mobile' | 'api';

export interface Kpi {
  id: 'requests' | 'error-rate' | 'p95' | 'uptime';
  label: string;
  value: number;
  unit: '' | '%' | 'ms';
  /** Change against the previous period of the same length, in percent. */
  deltaPct: number;
  /** Which direction of `deltaPct` is good news. */
  better: 'up' | 'down';
  trend: number[];
}

export interface TrafficPoint {
  /** Epoch milliseconds, start of the minute. */
  t: number;
  requests: number;
  errors: number;
}

export interface ServiceSeries {
  /** Epoch milliseconds, start of each bucket (hour for 24h, day otherwise). */
  buckets: number[];
  series: { service: ServiceName; values: number[] }[];
}

export interface StatusCount {
  status: StatusClass;
  count: number;
}

export type FlowNodeKind = 'client' | 'gateway' | 'service' | 'store';

export interface FlowNode {
  id: string;
  label: string;
  kind: FlowNodeKind;
  /** 0 clients, 1 gateway, 2 services, 3 stores. */
  column: number;
}

export interface FlowLink {
  source: string;
  target: string;
  /** Requests (or calls, for stores) in the range. */
  value: number;
  errors: number;
}

export interface FlowGraph {
  nodes: FlowNode[];
  links: FlowLink[];
}

export interface HeatCell {
  /** 0 Monday … 6 Sunday. */
  weekday: number;
  hour: number;
  p95Ms: number;
}

export interface UptimeDay {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  uptimePct: number;
}

export interface EndpointCount {
  method: HttpMethod;
  path: string;
  service: ServiceName;
  count: number;
}

export interface RequestRecord {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  method: HttpMethod;
  path: string;
  service: ServiceName;
  statusCode: number;
  durationMs: number;
  client: ClientKind;
  traceId: string;
}

export type SortField = 'timestamp' | 'durationMs' | 'statusCode' | 'service' | 'path';

export interface RequestQuery {
  range: TimeRange;
  q?: string;
  services?: ServiceName[];
  statuses?: StatusClass[];
  methods?: HttpMethod[];
  sort?: SortField;
  dir?: 'asc' | 'desc';
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

/** Rows per page when a query does not say. */
export const DEFAULT_PAGE_SIZE = 25;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** What every failed call rejects with, whichever implementation is behind the API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
