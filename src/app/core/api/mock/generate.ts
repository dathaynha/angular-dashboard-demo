import {
  EndpointCount,
  FlowGraph,
  FlowLink,
  FlowNode,
  HeatCell,
  HttpMethod,
  Kpi,
  RequestRecord,
  SERVICES,
  ServiceName,
  ServiceSeries,
  StatusCount,
  TimeRange,
  TrafficPoint,
  UptimeDay,
} from '../models';
import {
  CLIENTS,
  DAY,
  INCIDENTS,
  Incident,
  MINUTE,
  NOW,
  PROFILES,
  SEED,
  ServiceProfile,
  STORES,
  StoreId,
} from './catalog';
import { apportion, gaussian, hashUnit, mulberry32, pickWeighted } from './random';

// Everything here is a pure function of SEED and NOW, so the numbers never change between runs.

export const RANGE_MINUTES: Record<TimeRange, number> = {
  '24h': 1440,
  '7d': 10_080,
  '30d': 43_200,
};

const HISTORY_DAYS = 90;
// Midnight, so calendar days line up with minute indexes; the last day is today so far.
const START = Math.floor(NOW / DAY - HISTORY_DAYS) * DAY;

interface Minute extends TrafficPoint {
  p95Ms: number;
  /** The minute's error rate, before rounding to whole requests. */
  errorRate: number;
}

const incidentAt = (t: number): Incident | undefined =>
  INCIDENTS.find((i) => t >= i.start && t < i.start + i.minutes * MINUTE);

const dayFactor = (weekday: number) => (weekday === 0 || weekday === 6 ? 0.68 : 1);

/**
 * 0..1 over the day, peaking mid-afternoon UTC; quieter at weekends. The
 * weekend factor eases in over the first 4 hours of a day, so midnight is not a step.
 */
function load(t: number): number {
  const date = new Date(t);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const day = 0.5 - 0.5 * Math.cos((2 * Math.PI * (hour - 2)) / 24);
  const today = dayFactor(date.getUTCDay());
  const yesterday = dayFactor((date.getUTCDay() + 6) % 7);
  return (0.3 + 0.7 * day) * (yesterday + (today - yesterday) * Math.min(1, hour / 4));
}

let history: Minute[] | undefined;

/** One point per minute for the last 90 days, built once. */
function minutes(): Minute[] {
  if (history) return history;
  history = [];
  for (let t = START; t < NOW; t += MINUTE) {
    const n = t / MINUTE;
    const incident = incidentAt(t);
    const l = load(t);
    const requests = Math.round(
      380 * l * (0.88 + 0.24 * hashUnit(SEED, n, 1)) * (incident?.load ?? 1),
    );
    const errorRate = 0.0045 * (0.6 + 0.8 * hashUnit(SEED, n, 2)) + (incident?.errorRate ?? 0);
    history.push({
      t,
      requests,
      errors: Math.round(requests * errorRate),
      errorRate,
      p95Ms: Math.round(
        (160 + 90 * l) * (0.9 + 0.2 * hashUnit(SEED, n, 3)) * (incident?.slowdown ?? 1),
      ),
    });
  }
  return history;
}

/** The services a view is scoped to; none means all of them. */
const pick = (services: readonly ServiceName[] = []): ServiceName[] =>
  services.length ? SERVICES.filter((s) => services.includes(s)) : [...SERVICES];

const weigh = (services: readonly ServiceName[], f: (p: ServiceProfile) => number) =>
  services.reduce((total, s) => total + f(PROFILES[s]), 0);

/**
 * How a set of services relates to the whole platform: its share of requests,
 * of server errors and of client errors, and how much slower or faster it is.
 */
function scopeOf(services: readonly ServiceName[]) {
  const all = [...SERVICES];
  const share = weigh(services, (p) => p.share);
  const median = (list: readonly ServiceName[]) =>
    weigh(list, (p) => p.share * p.medianMs) / weigh(list, (p) => p.share);
  return {
    all: services.length === all.length,
    share,
    errors:
      weigh(services, (p) => p.share * p.serverErrorRate) /
      weigh(all, (p) => p.share * p.serverErrorRate),
    clientRate: weigh(services, (p) => p.share * p.clientErrorRate) / share,
    latency: median(services) / median(all),
  };
}

/** Minutes of a range (or the one `back` before it), for the chosen services. */
function period(range: TimeRange, back = 0, services: readonly ServiceName[] = SERVICES): Minute[] {
  const all = minutes();
  const size = RANGE_MINUTES[range];
  const raw = all.slice(all.length - size * (back + 1), all.length - size * back);
  const scope = scopeOf(services);
  if (scope.all) return raw;
  // A service's slice of a minute is often a fraction of one error. Rounding each
  // minute would drop them all, so the remainder carries into the next minute.
  let requestCarry = 0;
  let errorCarry = 0;
  return raw.map((m) => {
    requestCarry += m.requests * scope.share;
    errorCarry += m.errors * scope.errors;
    const requests = Math.floor(requestCarry);
    const errors = Math.min(requests, Math.floor(errorCarry));
    requestCarry -= requests;
    errorCarry -= errors;
    return {
      t: m.t,
      requests,
      errors,
      p95Ms: Math.round(m.p95Ms * scope.latency),
      errorRate: (m.errorRate * scope.errors) / scope.share,
    };
  });
}

const sum = (points: Minute[], key: 'requests' | 'errors') =>
  points.reduce((s, p) => s + p[key], 0);

const weightedP95 = (points: Minute[]) =>
  points.reduce((s, p) => s + p.p95Ms * p.requests, 0) / Math.max(1, sum(points, 'requests'));

/**
 * A minute is down when more than 5 % of its requests failed. Judged on the rate,
 * so one stray error in a service's quiet minute (1 of 15) is not an outage.
 */
const uptime = (points: Minute[]) =>
  (100 * points.filter((p) => p.errorRate <= 0.05).length) / Math.max(1, points.length);

function chunks(points: Minute[], count: number): Minute[][] {
  const size = Math.ceil(points.length / count);
  return Array.from({ length: count }, (_, i) => points.slice(i * size, (i + 1) * size));
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const change = (now: number, before: number) => round(((now - before) / before) * 100, 1);

export function kpis(range: TimeRange, services: readonly ServiceName[] = []): Kpi[] {
  const scope = pick(services);
  const cur = period(range, 0, scope);
  const prev = period(range, 1, scope);
  const parts = chunks(cur, 24);
  const errorRate = (p: Minute[]) => (100 * sum(p, 'errors')) / Math.max(1, sum(p, 'requests'));
  return [
    {
      id: 'requests',
      label: 'Requests',
      value: sum(cur, 'requests'),
      unit: '',
      deltaPct: change(sum(cur, 'requests'), sum(prev, 'requests')),
      better: 'up',
      trend: parts.map((p) => sum(p, 'requests')),
    },
    {
      id: 'error-rate',
      label: 'Error rate',
      value: round(errorRate(cur), 2),
      unit: '%',
      deltaPct: change(errorRate(cur), errorRate(prev)),
      better: 'down',
      trend: parts.map((p) => round(errorRate(p), 2)),
    },
    {
      id: 'p95',
      label: 'p95 latency',
      value: Math.round(weightedP95(cur)),
      unit: 'ms',
      deltaPct: change(weightedP95(cur), weightedP95(prev)),
      better: 'down',
      trend: parts.map((p) => Math.round(weightedP95(p))),
    },
    {
      id: 'uptime',
      label: 'Uptime',
      value: round(uptime(cur), 2),
      unit: '%',
      deltaPct: change(uptime(cur), uptime(prev)),
      better: 'up',
      trend: parts.map((p) => round(uptime(p), 2)),
    },
  ];
}

export function traffic(range: TimeRange, services: readonly ServiceName[] = []): TrafficPoint[] {
  return period(range, 0, pick(services)).map(({ t, requests, errors }) => ({
    t,
    requests,
    errors,
  }));
}

export function requestsByService(
  range: TimeRange,
  services: readonly ServiceName[] = [],
): ServiceSeries {
  const bucketMinutes = range === '24h' ? 60 : 1440;
  const buckets = chunks(period(range), RANGE_MINUTES[range] / bucketMinutes);
  const values = buckets.map((points) => {
    const n = points[0].t / (bucketMinutes * MINUTE);
    return apportion(
      sum(points, 'requests'),
      SERVICES.map((s, i) => PROFILES[s].share * (0.85 + 0.3 * hashUnit(SEED, n, i, 4))),
    );
  });
  const keep = pick(services);
  return {
    buckets: buckets.map((points) => points[0].t),
    series: SERVICES.map((service, i) => ({ service, values: values.map((v) => v[i]) })).filter(
      (s) => keep.includes(s.service),
    ),
  };
}

export function statusBreakdown(
  range: TimeRange,
  services: readonly ServiceName[] = [],
): StatusCount[] {
  const scope = pick(services);
  const points = period(range, 0, scope);
  const total = sum(points, 'requests');
  const server = sum(points, 'errors');
  const client = Math.round(total * scopeOf(scope).clientRate);
  const redirect = Math.round(total * 0.012);
  return [
    { status: '2xx', count: total - server - client - redirect },
    { status: '3xx', count: redirect },
    { status: '4xx', count: client },
    { status: '5xx', count: server },
  ];
}

/** The flow for the chosen services: only their paths, so every node's in equals its out. */
export function requestFlow(range: TimeRange, services: readonly ServiceName[] = []): FlowGraph {
  const keep = pick(services);
  const points = period(range);
  const all = sum(points, 'requests');
  const allErrors = sum(points, 'errors');
  const nodes: FlowNode[] = [
    ...CLIENTS.map((c) => ({
      id: `client:${c.kind}`,
      label: c.label,
      kind: 'client' as const,
      column: 0,
    })),
    { id: 'api-gateway', label: 'api-gateway', kind: 'gateway', column: 1 },
    ...keep.map((s) => ({ id: s, label: s, kind: 'service' as const, column: 2 })),
    ...(Object.keys(STORES) as StoreId[])
      .filter((store) => keep.some((s) => PROFILES[s].stores[store]))
      .map((s) => ({
        id: `store:${s}`,
        label: STORES[s],
        kind: 'store' as const,
        column: 3,
      })),
  ];
  const links: FlowLink[] = [];

  // Split the whole platform first, so a service shows the same numbers filtered or not.
  const serviceValues = apportion(
    all,
    SERVICES.map((s) => PROFILES[s].share),
  );
  const serviceErrors = apportion(
    allErrors,
    SERVICES.map((s) => PROFILES[s].share * PROFILES[s].serverErrorRate),
  );
  const kept = SERVICES.map((s, i) => ({ s, i })).filter(({ s }) => keep.includes(s));
  const total = kept.reduce((t, { i }) => t + serviceValues[i], 0);
  const errors = kept.reduce((t, { i }) => t + serviceErrors[i], 0);

  const clientShares = CLIENTS.map((c) => c.share);
  const clientValues = apportion(total, clientShares);
  const clientErrors = apportion(errors, clientShares);
  CLIENTS.forEach((c, i) =>
    links.push({
      source: `client:${c.kind}`,
      target: 'api-gateway',
      value: clientValues[i],
      errors: clientErrors[i],
    }),
  );

  kept.forEach(({ s: service, i }) => {
    links.push({
      source: 'api-gateway',
      target: service,
      value: serviceValues[i],
      errors: serviceErrors[i],
    });
    const stores = Object.entries(PROFILES[service].stores) as [StoreId, number][];
    const storeValues = apportion(
      serviceValues[i],
      stores.map(([, share]) => share),
    );
    stores.forEach(([store], k) =>
      links.push({ source: service, target: `store:${store}`, value: storeValues[k], errors: 0 }),
    );
  });
  return { nodes, links };
}

/** p95 by weekday and hour. A day is too short for a weekly pattern, so 24h reads the last 7 days. */
export function latencyHeatmap(
  range: TimeRange,
  services: readonly ServiceName[] = [],
): HeatCell[] {
  const points = period(range === '24h' ? '7d' : range, 0, pick(services));
  const weight = new Float64Array(7 * 24);
  const total = new Float64Array(7 * 24);
  for (const p of points) {
    const date = new Date(p.t);
    const cell = ((date.getUTCDay() + 6) % 7) * 24 + date.getUTCHours();
    weight[cell] += p.requests;
    total[cell] += p.p95Ms * p.requests;
  }
  return Array.from({ length: 7 * 24 }, (_, cell) => ({
    weekday: Math.floor(cell / 24),
    hour: cell % 24,
    p95Ms: Math.round(total[cell] / Math.max(1, weight[cell])),
  }));
}

/** The last 90 calendar days, today (so far) included. */
export function uptimeDays(): UptimeDay[] {
  const all = minutes();
  return Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const day = all.slice((i + 1) * 1440, (i + 2) * 1440);
    return {
      date: new Date(day[0].t).toISOString().slice(0, 10),
      uptimePct: round(uptime(day), 2),
    };
  });
}

export function topEndpoints(
  range: TimeRange,
  limit: number,
  services: readonly ServiceName[] = [],
): EndpointCount[] {
  const keep = pick(services);
  const total = sum(period(range), 'requests');
  const perService = apportion(
    total,
    SERVICES.map((s) => PROFILES[s].share),
  );
  return SERVICES.flatMap((service, i) => {
    const endpoints = PROFILES[service].endpoints;
    const counts = apportion(
      perService[i],
      endpoints.map((e) => e.weight),
    );
    return endpoints.map((e, k) => ({ method: e.method, path: e.path, service, count: counts[k] }));
  })
    .filter((e) => keep.includes(e.service))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, limit);
}

const SERVER_ERRORS = [500, 502, 503, 504];
const CLIENT_ERRORS = [400, 401, 403, 404, 409, 422, 429];

function successCode(method: HttpMethod, rand: () => number): number {
  if (method === 'GET' && rand() < 0.02) return 304;
  return method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200;
}

const hex = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join('');

let log: RequestRecord[] | undefined;

/** A sampled request log over the last 30 days, newest first. */
export function requestLog(): RequestRecord[] {
  if (log) return log;
  const rand = mulberry32(SEED + 1);
  const span = RANGE_MINUTES['30d'] * MINUTE;
  const records: Omit<RequestRecord, 'id'>[] = [];
  while (records.length < 6000) {
    const timestamp = NOW - 1 - Math.floor(rand() * span);
    // Rejection sampling: busy hours get proportionally more requests.
    if (rand() > load(timestamp)) continue;
    const service = pickWeighted(
      rand,
      SERVICES,
      SERVICES.map((s) => PROFILES[s].share),
    );
    const profile = PROFILES[service];
    const endpoint = pickWeighted(
      rand,
      profile.endpoints,
      profile.endpoints.map((e) => e.weight),
    );
    const incident = incidentAt(timestamp);
    const r = rand();
    const serverRate = profile.serverErrorRate + (incident?.errorRate ?? 0);
    const statusCode =
      r < serverRate
        ? pickWeighted(rand, SERVER_ERRORS, [3, 3, 2.5, 1.5])
        : r < serverRate + profile.clientErrorRate
          ? pickWeighted(rand, CLIENT_ERRORS, [2, 3, 1, 3, 1, 1, 1])
          : successCode(endpoint.method, rand);
    const durationMs =
      statusCode === 504
        ? 30_000 + Math.floor(rand() * 200)
        : Math.max(
            1,
            Math.round(
              profile.medianMs *
                Math.exp(profile.spread * gaussian(rand)) *
                (incident?.slowdown ?? 1),
            ),
          );
    records.push({
      timestamp,
      method: endpoint.method,
      path: endpoint.path.replace(':id', hex(rand, 8)),
      service,
      statusCode,
      durationMs,
      client: pickWeighted(
        rand,
        CLIENTS.map((c) => c.kind),
        CLIENTS.map((c) => c.share),
      ),
      traceId: hex(rand, 16),
    });
  }
  records.sort((a, b) => b.timestamp - a.timestamp);
  log = records.map((r, i) => ({ id: `req_${String(records.length - i).padStart(6, '0')}`, ...r }));
  return log;
}
