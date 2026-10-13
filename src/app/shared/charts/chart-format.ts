import type { ValueFormat } from './chart.types';

const LOCALE = 'en-US';
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const fine = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const date = new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const time = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

/**
 * One way to write each kind of value, shared by cards, charts, tables and CSV.
 * Times are UTC, as the data is. `null` is a gap, written as an en dash, never 0.
 */
export const fmt = {
  value(value: number | null | undefined, format: ValueFormat = 'number'): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    // Below 1 %, the second decimal is the news (0.46 % vs 0.5 %).
    if (format === 'percent') return `${(Math.abs(value) < 1 ? fine : number).format(value)}%`;
    if (format === 'duration') {
      return value >= 1000 ? `${number.format(value / 1000)} s` : `${Math.round(value)} ms`;
    }
    return number.format(value);
  },
  /** 1,284 / 12.9K / 4.2M */
  compact: (value: number) =>
    Math.abs(value) < 10_000 ? number.format(value) : compact.format(value),
  dateTime: (value: number) => dateTime.format(value),
  date: (value: number) => date.format(value),
  time: (value: number) => time.format(value),
};
