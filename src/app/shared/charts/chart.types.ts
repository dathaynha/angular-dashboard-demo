/** What a chart card is showing; the card draws every state but `ready` itself. */
export type ChartState = 'ready' | 'loading' | 'empty' | 'error';

/** How a value is written in labels, tooltips, the table and the CSV. */
export type ValueFormat = 'number' | 'percent' | 'duration';

/** The data behind a chart as rows, for the table view and the CSV export. */
export interface ChartTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly (string | number | null)[])[];
}
