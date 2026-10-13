import { ServiceName, StatusClass, TimeRange } from './api/models';

/** What every view can be filtered by, typed once. Features use the parts they need. */
export interface DashboardFilters {
  range: TimeRange;
  q: string;
  services: ServiceName[];
  statuses: StatusClass[];
}

export const DEFAULT_FILTERS: DashboardFilters = {
  range: '24h',
  q: '',
  services: [],
  statuses: [],
};

export const RANGES: { key: TimeRange; label: string; period: string }[] = [
  { key: '24h', label: '24 h', period: 'previous 24 h' },
  { key: '7d', label: '7 days', period: 'previous 7 days' },
  { key: '30d', label: '30 days', period: 'previous 30 days' },
];

export const isFiltered = (f: DashboardFilters) =>
  !!f.q || f.services.length > 0 || f.statuses.length > 0;
