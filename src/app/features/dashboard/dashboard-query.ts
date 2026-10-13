import { Params } from '@angular/router';
import {
  SERVICES,
  ServiceName,
  SortField,
  STATUS_CLASSES,
  StatusClass,
  TimeRange,
} from '../../core/api/models';
import { DEFAULT_FILTERS, DashboardFilters, RANGES } from '../../core/filters';
import { SortDir } from '../../shared/data-table/data-table';

/** Everything a reader can set on the page, so a shared link or a refresh shows the same view. */
export interface DashboardQuery extends DashboardFilters {
  sort: SortField;
  dir: SortDir;
  page: number;
  size: number;
}

export const PAGE_SIZES = [10, 25, 50] as const;
const SORTS: SortField[] = ['timestamp', 'durationMs', 'statusCode', 'service', 'path'];

export const DEFAULT_QUERY: DashboardQuery = {
  ...DEFAULT_FILTERS,
  sort: 'timestamp',
  dir: 'desc',
  page: 1,
  size: 10,
};

const list = <T extends string>(value: unknown, allowed: readonly T[]): T[] =>
  typeof value === 'string'
    ? [...new Set(value.split(','))].filter((v): v is T => allowed.includes(v as T))
    : [];

/** Reads the URL leniently: anything unknown falls back to its default, never an error. */
export function parseQuery(params: Params): DashboardQuery {
  const range = RANGES.find((r) => r.key === params['range'])?.key;
  const sort = SORTS.find((s) => s === params['sort']);
  const page = Number.parseInt(params['page'], 10);
  const size = Number(params['size']);
  return {
    range: range ?? DEFAULT_QUERY.range,
    q: typeof params['q'] === 'string' ? params['q'].trim() : '',
    services: list<ServiceName>(params['service'], SERVICES),
    statuses: list<StatusClass>(params['status'], STATUS_CLASSES),
    sort: sort ?? DEFAULT_QUERY.sort,
    dir: params['dir'] === 'asc' ? 'asc' : 'desc',
    page: page >= 1 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_QUERY.size,
  };
}

/** Writes only what differs from the defaults, so the plain URL stays plain. `null` removes a param. */
export function toParams(query: DashboardQuery): Params {
  const differs = <K extends keyof DashboardQuery>(key: K) =>
    String(query[key]) !== String(DEFAULT_QUERY[key]);
  const range: TimeRange = query.range;
  return {
    range: differs('range') ? range : null,
    q: query.q || null,
    service: query.services.length ? query.services.join(',') : null,
    status: query.statuses.length ? query.statuses.join(',') : null,
    sort: differs('sort') ? query.sort : null,
    dir: differs('dir') ? query.dir : null,
    page: query.page > 1 ? query.page : null,
    size: differs('size') ? query.size : null,
  };
}
