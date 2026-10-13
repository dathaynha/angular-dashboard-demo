---
name: frontend-structure
description: >-
  Where code goes in the dashboard and how a feature is wired. Use when adding
  a page, feature, chart or shared component, asking where something should
  live, or reviewing structure.
---

# Frontend structure

Read `.claude/rules/angular.md` and `.claude/rules/charts.md` first.

## Layout

```
src/app/
  core/
    api/            DashboardApi (abstract) + mock and HTTP implementations, models,
                    load state; the only place that knows where data comes from
    demo/           demo-only behaviour (scenarios), never imported by shared/
    icon.ts, theme.ts
  layout/           the shell: centred content and the floating side rail; app chrome only
  shared/           reusable, feature-agnostic: kpi-card, chart-card, data-table,
                    filter-bar, state-message,
                    charts/ (d3/, echarts/, palette, format, size)
  features/<name>/  one folder per route: page component + its store and
                    feature-only components
  app.routes.ts     one lazy `loadComponent` per feature
```

## Rules of placement

- **Dependencies point inward:** `features` → `shared` → nothing app-specific. `shared` never imports a feature, `core/demo` or `layout`.
- **Data only through `DashboardApi`.** A component never builds mock data or calls `HttpClient`. Swapping mock for HTTP is one provider (`provide-dashboard-api.ts`).
- **A component starts in its feature.** Move it to `shared/` when a second feature needs it, not before.
- **One chart, one component.** It takes data and options as inputs, owns loading, empty and error states, and names its library in a caption (`.claude/rules/charts.md`).
- **Feature state** in a small signal store beside the page; filter state that should survive a refresh in the URL.

## New feature checklist

```
- [ ] features/<name>/<name>-page.ts (+ store if it has state)
- [ ] lazy route in app.routes.ts, and the route in scripts/verify.mjs
- [ ] a rail entry in layout/shell if it is a page section
- [ ] data via DashboardApi; any new endpoint in the abstract class and both implementations
- [ ] loading, empty and error states
- [ ] specs for any non-trivial logic (red-proofed)
- [ ] verify-dashboard at every size, light and dark
```

## Review flags

- A component importing from another feature's folder.
- `HttpClient`, `Math.random` or literal colours inside a component.
- A chart without a container-driven size, or drawn on glass.
- Route-level code that touches `window` or `localStorage` outside `afterNextRender`.
