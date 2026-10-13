import {
  DEFAULT_PAGE_SIZE,
  Page,
  RequestQuery,
  RequestRecord,
  SortField,
  statusClass,
} from '../models';
import { MINUTE } from './catalog';
import { RANGE_MINUTES } from './generate';

export const MAX_PAGE_SIZE = 100;

const compare: Record<SortField, (a: RequestRecord, b: RequestRecord) => number> = {
  timestamp: (a, b) => a.timestamp - b.timestamp,
  durationMs: (a, b) => a.durationMs - b.durationMs,
  statusCode: (a, b) => a.statusCode - b.statusCode,
  service: (a, b) => a.service.localeCompare(b.service),
  path: (a, b) => a.path.localeCompare(b.path),
};

/**
 * What `GET /requests` does on a server: filter, sort, then cut one page.
 * Ties fall back to newest first, so paging never shows a row twice.
 */
export function queryRequests(
  records: readonly RequestRecord[],
  query: RequestQuery,
  now: number,
): Page<RequestRecord> {
  const from = now - RANGE_MINUTES[query.range] * MINUTE;
  const q = query.q?.trim().toLowerCase();
  const matches = records.filter(
    (r) =>
      r.timestamp >= from &&
      r.timestamp < now &&
      (!query.services?.length || query.services.includes(r.service)) &&
      (!query.statuses?.length || query.statuses.includes(statusClass(r.statusCode))) &&
      (!query.methods?.length || query.methods.includes(r.method)) &&
      (!q ||
        [r.id, r.path, r.service, r.method, r.traceId, String(r.statusCode)].some((field) =>
          field.toLowerCase().includes(q),
        )),
  );

  const field = query.sort ?? 'timestamp';
  const sign = (query.dir ?? 'desc') === 'asc' ? 1 : -1;
  matches.sort(
    (a, b) => sign * compare[field](a, b) || b.timestamp - a.timestamp || a.id.localeCompare(b.id),
  );

  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const lastPage = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(lastPage, Math.max(1, query.page ?? 1));
  return {
    items: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length,
    page,
    pageSize,
  };
}
