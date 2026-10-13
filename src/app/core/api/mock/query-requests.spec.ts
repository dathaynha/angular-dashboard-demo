import { RequestRecord } from '../models';
import { MINUTE } from './catalog';
import { queryRequests } from './query-requests';

const NOW = Date.UTC(2026, 0, 10);

function record(n: number, patch: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: `req_${String(n).padStart(6, '0')}`,
    timestamp: NOW - n * MINUTE,
    method: 'GET',
    path: `/api/things/${n}`,
    service: 'accounts-service',
    statusCode: 200,
    durationMs: 10,
    client: 'web',
    traceId: `trace${n}`,
    ...patch,
  };
}

describe('queryRequests', () => {
  it('keeps only the range, newest first by default', () => {
    const records = [record(1), record(3000), record(30)];
    const page = queryRequests(records, { range: '24h' }, NOW);
    expect(page.items.map((r) => r.id)).toEqual(['req_000001', 'req_000030']);
    expect(page.total).toBe(2);
  });

  it('searches id, path, service, trace and status code, ignoring case', () => {
    const records = [
      record(1, { path: '/api/Messenger/conversations' }),
      record(2, { service: 'chatbot-service' }),
      record(3, { statusCode: 503 }),
      record(4),
    ];
    const ids = (q: string) =>
      queryRequests(records, { range: '24h', q }, NOW).items.map((r) => r.id);
    expect(ids('messenger')).toEqual(['req_000001']);
    expect(ids('CHATBOT')).toEqual(['req_000002']);
    expect(ids('503')).toEqual(['req_000003']);
    expect(ids('req_000004')).toEqual(['req_000004']);
    expect(ids('  ')).toHaveLength(4);
  });

  it('filters by service, status class and method together', () => {
    const records = [
      record(1, { service: 'file-service', statusCode: 404 }),
      record(2, { service: 'file-service', statusCode: 200 }),
      record(3, { service: 'event-store', statusCode: 404 }),
      record(4, { service: 'file-service', statusCode: 422, method: 'POST' }),
    ];
    const page = queryRequests(
      records,
      { range: '24h', services: ['file-service'], statuses: ['4xx'], methods: ['GET'] },
      NOW,
    );
    expect(page.items.map((r) => r.id)).toEqual(['req_000001']);
  });

  it('sorts by the field in both directions, ties newest first', () => {
    // Ids sort opposite to time, so only the timestamp tie-break gives this order.
    const records = [
      record(3, { durationMs: 50, id: 'req_a' }),
      record(2, { durationMs: 900, id: 'req_b' }),
      record(1, { durationMs: 50, id: 'req_c' }),
    ];
    const ids = (dir: 'asc' | 'desc') =>
      queryRequests(records, { range: '24h', sort: 'durationMs', dir }, NOW).items.map((r) => r.id);
    expect(ids('desc')).toEqual(['req_b', 'req_c', 'req_a']);
    expect(ids('asc')).toEqual(['req_c', 'req_a', 'req_b']);
  });

  it('cuts pages and clamps a page past the end to the last one', () => {
    const records = Array.from({ length: 12 }, (_, i) => record(i + 1));
    const page = (p: number) => queryRequests(records, { range: '24h', page: p, pageSize: 5 }, NOW);
    expect(page(1).items.map((r) => r.id)).toEqual([1, 2, 3, 4, 5].map((n) => record(n).id));
    expect(page(3).items.map((r) => r.id)).toEqual(['req_000011', 'req_000012']);
    expect(page(9)).toMatchObject({ page: 3, total: 12 });
    expect(page(0).page).toBe(1);
  });

  it('keeps the page size within 1 to 100', () => {
    expect(queryRequests([], { range: '24h', pageSize: 500 }, NOW).pageSize).toBe(100);
    expect(queryRequests([], { range: '24h', pageSize: 0 }, NOW)).toMatchObject({
      pageSize: 1,
      page: 1,
      total: 0,
    });
  });
});
