# Charts: d3 or ECharts

Two libraries, each where it is the better tool. Choosing per chart is part of what this demo shows, so every chart card names its library in a caption.

## d3: bespoke charts

`d3-scale`, `d3-shape` and `d3-array` compute the geometry; **Angular templates draw the SVG.** No d3 DOM manipulation, no `d3-selection`, no `d3-sankey` (CommonJS, pins old d3).

Use it when the chart *is* the design: a layout no library offers, an exact fit to the design tokens, output that is identical on the server and in the browser, custom interaction, accessible SVG. It costs more code per chart, so it is kept for the signature visuals: the request-flow Sankey and the KPI sparklines.

Lessons from building these on the datha platform, each to be pinned by a red-proofed spec:

- **A label must be clickable**, not only its 12px bar: a transparent hit area covers bar and label.
- **A real pointer click must select.** Capturing the pointer on press for drag-to-zoom retargets the next click to the `<svg>`. Start capture only once a press becomes a drag, and test with `userEvent` (a real pointer), not a dispatched `click`.
- **A thin line needs a wide invisible hit stroke** (about 12px).
- **A selected item needs a visible style.**

## ECharts: standard charts and data volume

Via `ngx-echarts`, tree-shaken (`echarts/core` plus only the charts and components used). Use it for conventional chart types and for large datasets: canvas stays smooth at tens of thousands of points, with tooltips, legends, `dataZoom`, animation and heatmaps built in. Here: the high-volume traffic line with zoom, the stacked bar by service, the status donut, the latency heatmap.

- **Themed from the same `--datha-*` tokens** through a registered theme, re-applied when the theme switches, so both libraries look like one product.
- **Browser only.** ECharts measures the DOM: initialise after render, and give the prerendered page a meaningful placeholder of the same size so nothing shifts.
- **Resize with the container**, not the window: a chart in a card that changes width must redraw.

## Both

- Charts sit on **solid surfaces**, never glass.
- Every chart has loading, empty and error states, an accessible title, and a size that comes from its container.
- Colours come from `chart-palette.ts`, never literals in a chart.
