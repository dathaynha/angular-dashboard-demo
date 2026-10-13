import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FlowGraph, ServiceName } from '../../../core/api/models';
import { ChartCard } from '../../../shared/chart-card/chart-card';
import { serviceColor } from '../../../shared/charts/chart-palette';
import type { ChartState, ChartTable } from '../../../shared/charts/chart.types';
import { Sankey } from '../../../shared/charts/d3/sankey';
import { SankeyNode } from '../../../shared/charts/d3/sankey-layout';
import { SERVICES } from '../../../core/api/models';

/**
 * Where requests go: clients → gateway → services → the store each request
 * lands in. A layout no chart library offers, so it is d3 maths drawn by the
 * template, in the services' own colours.
 */
@Component({
  selector: 'app-flow-chart',
  imports: [ChartCard, Sankey],
  template: `
    <app-chart-card
      heading="Request flow"
      subtitle="Clients → gateway → services → primary store. Hover a node to trace its paths."
      library="d3 · SVG"
      [state]="state()"
      [stale]="stale()"
      [errorText]="errorText()"
      [table]="table()"
      filename="request-flow"
      [bodyHeight]="null"
      (retry)="retry.emit()"
    >
      @if (graph(); as g) {
        <app-sankey label="Request flow" [nodes]="nodes()" [links]="g.links" />
      }
    </app-chart-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowChart {
  readonly graph = input<FlowGraph | undefined>(undefined);
  readonly state = input<ChartState>('loading');
  readonly stale = input(false);
  readonly errorText = input('');
  readonly retry = output<void>();

  protected readonly nodes = computed<SankeyNode[]>(() =>
    (this.graph()?.nodes ?? []).map((n) => ({
      ...n,
      color: SERVICES.includes(n.id as ServiceName) ? serviceColor(n.id as ServiceName) : undefined,
    })),
  );

  protected readonly table = computed<ChartTable | null>(() => {
    const graph = this.graph();
    if (!graph?.links.length) return null;
    const label = new Map(graph.nodes.map((n) => [n.id, n.label]));
    return {
      columns: ['From', 'To', 'Requests', 'Failed (5xx)'],
      rows: graph.links.map((l) => [
        label.get(l.source) ?? l.source,
        label.get(l.target) ?? l.target,
        l.value,
        l.errors,
      ]),
    };
  });
}
