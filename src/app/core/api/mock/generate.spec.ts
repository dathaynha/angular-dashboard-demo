import { SERVICES, ServiceName } from '../models';
import { MINUTE, NOW } from './catalog';
import {
  kpis,
  latencyHeatmap,
  requestFlow,
  requestLog,
  requestsByService,
  statusBreakdown,
  topEndpoints,
  traffic,
  uptimeDays,
} from './generate';
import { apportion, mulberry32 } from './random';

describe('seeded generator', () => {
  it('repeats a sequence for a seed and differs for another', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const c = mulberry32(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });

  it('pins the dataset: same KPIs and log on every run', () => {
    // Change these only on purpose: screenshots and the README quote them.
    expect(kpis('24h').map((k) => [k.id, k.value])).toMatchInlineSnapshot(`
      [
        [
          "requests",
          284762,
        ],
        [
          "error-rate",
          0.45,
        ],
        [
          "p95",
          214,
        ],
        [
          "uptime",
          100,
        ],
      ]
    `);
    expect(requestLog().slice(0, 2)).toMatchInlineSnapshot(`
      [
        {
          "client": "web",
          "durationMs": 27,
          "id": "req_006000",
          "method": "DELETE",
          "path": "/api/notifications/0bc5b979",
          "service": "notification-service",
          "statusCode": 204,
          "timestamp": 1791806347095,
          "traceId": "3e16644b34cc6f4e",
        },
        {
          "client": "web",
          "durationMs": 34,
          "id": "req_005999",
          "method": "POST",
          "path": "/api/events",
          "service": "event-store",
          "statusCode": 201,
          "timestamp": 1791805958794,
          "traceId": "81e6ccc12a470971",
        },
      ]
    `);
  });

  it('gives one point per minute, oldest first, ending at NOW', () => {
    for (const [range, length] of [
      ['24h', 1440],
      ['7d', 10_080],
      ['30d', 43_200],
    ] as const) {
      const points = traffic(range);
      expect(points).toHaveLength(length);
      expect(points.at(-1)!.t).toBe(NOW - MINUTE);
      expect(points.every((p, i) => i === 0 || p.t - points[i - 1].t === MINUTE)).toBe(true);
    }
  });

  it('keeps a smaller range inside a larger one, minute for minute', () => {
    expect(traffic('30d').slice(-1440)).toEqual(traffic('24h'));
  });

  it('adds the per-service bars up to the traffic total', () => {
    const total = traffic('7d').reduce((s, p) => s + p.requests, 0);
    const bars = requestsByService('7d');
    expect(bars.buckets).toHaveLength(7);
    expect(bars.series.map((s) => s.service)).toEqual([...SERVICES]);
    expect(bars.series.flatMap((s) => s.values).reduce((s, v) => s + v, 0)).toBe(total);
    expect(requestsByService('24h').buckets).toHaveLength(24);
  });

  it('splits status classes without losing a request', () => {
    const total = traffic('30d').reduce((s, p) => s + p.requests, 0);
    const counts = statusBreakdown('30d');
    expect(counts.reduce((s, c) => s + c.count, 0)).toBe(total);
    expect(counts.every((c) => c.count >= 0)).toBe(true);
  });

  it('conserves flow: what enters the gateway and each service leaves it', () => {
    const { nodes, links } = requestFlow('7d');
    const inflow = (id: string) =>
      links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0);
    const outflow = (id: string) =>
      links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0);
    const middle = nodes.filter((n) => n.kind === 'gateway' || n.kind === 'service');
    expect(middle).toHaveLength(1 + SERVICES.length);
    for (const node of middle) expect(outflow(node.id)).toBe(inflow(node.id));
    expect(links.every((l) => nodes.some((n) => n.id === l.source && n.column < 3))).toBe(true);
  });

  it('fills every hour of every weekday in the heatmap', () => {
    const cells = latencyHeatmap('24h');
    expect(cells).toHaveLength(168);
    expect(cells.every((c) => c.p95Ms > 0)).toBe(true);
  });

  it('reports 90 days of uptime with the incidents below 100 %', () => {
    const days = uptimeDays();
    expect(days).toHaveLength(90);
    expect(days.at(-1)!.date).toBe('2026-10-12');
    expect(days.filter((d) => d.uptimePct < 100).length).toBeGreaterThan(0);
  });

  it('ranks endpoints by count', () => {
    const top = topEndpoints('30d', 5);
    expect(top).toHaveLength(5);
    expect(top.every((e, i) => i === 0 || e.count <= top[i - 1].count)).toBe(true);
  });

  it('builds a log of unique ids, newest first, inside the last 30 days', () => {
    const log = requestLog();
    expect(new Set(log.map((r) => r.id)).size).toBe(log.length);
    expect(log.every((r, i) => i === 0 || r.timestamp <= log[i - 1].timestamp)).toBe(true);
    expect(log.at(-1)!.timestamp).toBeGreaterThanOrEqual(NOW - 30 * 1440 * MINUTE);
    expect(log.some((r) => r.statusCode >= 500)).toBe(true);
  });
});

describe('scoped to services', () => {
  const total = (points: { requests: number }[]) => points.reduce((s, p) => s + p.requests, 0);

  it('splits traffic so the services add back up to the platform, within rounding', () => {
    const whole = total(traffic('7d'));
    const parts = SERVICES.reduce((s, service) => s + total(traffic('7d', [service])), 0);
    expect(Math.abs(parts - whole) / whole).toBeLessThan(0.005);
  });

  it('gives a slow, error-prone service its own figures, not the platform’s', () => {
    const value = (services: ServiceName[], id: string) =>
      kpis('7d', services).find((k) => k.id === id)!.value;
    expect(value(['chatbot-service'], 'p95')).toBeGreaterThan(value([], 'p95') * 3);
    expect(value(['chatbot-service'], 'error-rate')).toBeGreaterThan(value([], 'error-rate'));
    expect(value(['chatbot-service'], 'requests')).toBeLessThan(value([], 'requests') * 0.1);
  });

  it('decides downtime from the error rate, not from one stray error in a quiet minute', () => {
    const uptime = (services: ServiceName[]) =>
      kpis('24h', services).find((k) => k.id === 'uptime')!.value;
    // No incident in the last 24 h: every service, alone, was up all day.
    for (const service of SERVICES) expect(uptime([service])).toBe(100);
  });

  it('draws only the chosen services’ paths, still conserved, with unchanged numbers', () => {
    const one = requestFlow('7d', ['file-service']);
    const services = one.nodes.filter((n) => n.kind === 'service').map((n) => n.id);
    expect(services).toEqual(['file-service']);
    expect(one.nodes.filter((n) => n.kind === 'store').map((n) => n.id)).toEqual([
      'store:postgres',
      'store:blob',
    ]);
    const into = (graph: typeof one, id: string) =>
      graph.links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0);
    const out = (graph: typeof one, id: string) =>
      graph.links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0);
    expect(out(one, 'api-gateway')).toBe(into(one, 'api-gateway'));
    expect(into(one, 'file-service')).toBe(into(requestFlow('7d'), 'file-service'));
  });

  it('returns only the chosen series and keeps the rest of the bucket values', () => {
    const one = requestsByService('24h', ['event-store']);
    expect(one.series.map((s) => s.service)).toEqual(['event-store']);
    expect(one.series[0].values).toEqual(
      requestsByService('24h').series.find((s) => s.service === 'event-store')!.values,
    );
  });
});

describe('apportion', () => {
  it('splits into integers that sum to the total', () => {
    expect(apportion(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(apportion(7, [0.5, 0.25, 0.25])).toEqual([3, 2, 2]);
    expect(apportion(5, [0, 0])).toEqual([0, 0]);
  });
});
