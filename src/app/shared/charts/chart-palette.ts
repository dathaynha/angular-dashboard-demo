import { SERVICES, ServiceName, StatusClass } from '../../core/api/models';

/** Categorical slots in validated order. Red is left out: it means failure here. */
export const SERIES_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
] as const;

/** Colour follows the service, never its rank, so a filter never repaints the rest. */
export const serviceColor = (service: ServiceName): string =>
  SERIES_COLORS[SERVICES.indexOf(service) % SERIES_COLORS.length];

/** Status colours are reserved for status and always ship with a label. */
export const STATUS_COLORS: Record<StatusClass, string> = {
  '2xx': 'var(--status-good)',
  '3xx': 'var(--datha-surface-400)',
  '4xx': 'var(--status-warning)',
  '5xx': 'var(--status-critical)',
};
