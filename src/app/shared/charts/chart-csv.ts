import type { ChartTable } from './chart.types';

function cell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  // RFC 4180: quote a field holding a separator, a quote or a line break, and
  // double the quotes inside it.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The table as RFC 4180 CSV, CRLF line endings, header row first. */
export function chartTableToCsv(table: ChartTable): string {
  return [table.columns, ...table.rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

/**
 * Downloads the table as `<filename>.csv`. A byte-order mark leads the file so
 * a spreadsheet opens "Đạt" as UTF-8 rather than as Latin-1. Browser only.
 */
export function downloadChartCsv(document: Document, table: ChartTable, filename: string): void {
  const blob = new Blob(['﻿', chartTableToCsv(table)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
