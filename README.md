# Angular dashboard demo

A responsive operations dashboard in Angular 22: KPI cards with sparklines, five charts across two chart libraries, and a data table with search, filters, sorting and pagination. Everything runs on mock data behind a REST-shaped service, so it works offline and swaps to a real backend with one provider.

**Live:** https://dathaynha.github.io/angular-dashboard-demo/

Try these:

- **Filters**: time range and service scope every number on the page (KPIs, every chart, the table); search and status narrow the request log. All of it lives in the URL: [last 7 days, chatbot-service only](https://dathaynha.github.io/angular-dashboard-demo/?range=7d&service=chatbot-service).
- **Every state is designed**, not only the happy path. the _Demo_ button in the side menu makes the mock API keep loading, answer with nothing, or fail: [loading](https://dathaynha.github.io/angular-dashboard-demo/?demo=loading) · [empty](https://dathaynha.github.io/angular-dashboard-demo/?demo=empty) · [error](https://dathaynha.github.io/angular-dashboard-demo/?demo=error).
- **Each chart** switches to a table view and exports CSV, and names the library that draws it.
- Phone, tablet and desktop layouts; light and dark theme.

## What is on the page

| Section      | What                                                                                           | Drawn with            |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------------- |
| Overview     | Requests, error rate, p95 latency, uptime, with change against the previous period and a trend | Cards + d3 sparklines |
| Traffic      | Requests per minute, up to 43,200 points, with zoom                                            | ECharts               |
|              | Requests by service, stacked per hour or day                                                   | ECharts               |
|              | Responses by status class                                                                      | ECharts               |
| Request flow | Clients → gateway → services → stores                                                          | d3 (Sankey)           |
|              | p95 latency by weekday and hour                                                                | ECharts (heatmap)     |
| Requests     | Request log: search, filter, sort, paginate                                                    | Generic data table    |

## Choosing a chart library

The demo uses two libraries on purpose, each where it is the better tool.

**d3 for bespoke charts.** `d3-scale`, `d3-shape` and `d3-array` compute the geometry and Angular templates draw the SVG; d3 never touches the DOM. That suits a chart that _is_ the design: a layout no library offers (the request-flow Sankey), an exact fit to the design tokens, the same picture on the server and in the browser, accessible SVG with keyboard focus. It costs more code per chart, so it is kept for the signature visuals.

**ECharts for standard charts and data volume.** Lines, bars, donuts and heatmaps come with tooltips, zoom and animation built in, and canvas rendering stays smooth at tens of thousands of points. It is tree-shaken to the four chart types used and loaded on demand, so it is not in the first download.

Both read colours from the same design tokens, so they look like one product in either theme. The categorical palette is checked for colour-blind separation, colour follows the entity (a service keeps its colour when others are filtered out), and status colours are reserved for status. Chart.js or Plotly would fill the ECharts role equally well; ECharts wins here on heatmaps, `dataZoom` and large-data performance.

## Architecture

```
src/app/
  core/
    api/          DashboardApi (abstract, one method per REST endpoint), the mock and
                  HTTP implementations, models, load state. The only place that
                  knows where data comes from.
    demo/         demo-only behaviour (the state switch)
    filters.ts    the filter model, typed once
  layout/         the shell: centred content and a floating side rail (section links with
                  scroll-spy, theme, demo state); a bottom bar on a phone
  shared/         reusable, feature-agnostic components
    kpi-card/  chart-card/  data-table/  filter-bar/  state-message/
    charts/       d3/ (sparkline, Sankey), echarts/ (lazy setup, theme), palette, formats
  features/
    dashboard/    the page, its intro, signal store, URL query model and chart components
```

- **Data through one interface.** Components ask `DashboardApi` and never see the source. The mock returns seeded data after a simulated delay; `HttpDashboardApi` implements the same interface over `HttpClient`. Switching is one line in `provide-dashboard-api.ts`.
- **State in signals.** A small store per feature, with `rxResource` for loading and `computed` for derived values. Filters, sorting and the page number live in the URL query, so a view can be shared and survives a refresh.
- **Four states for every view.** Loading (skeletons shaped like the content), empty, error (with retry), and refreshing (old data dimmed, nothing jumps).
- **Standalone, zoneless, OnPush**, lazy-loaded route, prerendered to static HTML.
- **Responsive by layout**, not only breakpoints: intrinsic grids, container queries, a container-sized chart in every card, a Sankey that turns top to bottom on a phone.

## Run it

Node 24 and pnpm 10.

```bash
pnpm install
pnpm start          # http://localhost:4310
pnpm test           # unit specs (Vitest)
pnpm build          # production build to dist/
pnpm verify         # after `pnpm build:pages`: screenshots and layout checks at four sizes, light and dark
```

## Tests

- **Unit (Vitest):** the data generator (deterministic, totals add up, flow is conserved), request querying (filter, sort, paginate), the URL query model, the Sankey layout, and the components through their public surface. Each regression spec was first shown to fail against broken code.
- **Visual (`scripts/verify.mjs`, Playwright):** serves the production build and checks every size and theme for horizontal overflow, console errors, glass only on the menu, every chart drawn at a real size, menu links landing on their section, URL filters surviving a reload, and the demo states.

## Data

All data is generated in the browser from a fixed seed: 90 days of per-minute traffic with a few deliberate incidents, and a sampled request log. The services are modelled on a microservices platform of my own. Nothing here is real or from a client project.
