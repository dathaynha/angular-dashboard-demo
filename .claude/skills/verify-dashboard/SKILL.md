---
name: verify-dashboard
description: >-
  Visually verify the dashboard. Use after any change to a page, component,
  chart or style, or when asked to check, screenshot or look at the app.
---

# Verify dashboard

A green build and green specs cannot see layout. This skill makes the change visible.

1. `pnpm build:pages`. Every route must prerender and the build must end without errors.
2. `pnpm verify` (`scripts/verify.mjs`). It serves the build under `/angular-dashboard-demo/` in-process and closes its own server, so nothing is left running. It checks the page at phone, tablet, desktop and wide sizes in light and dark, and asserts: no horizontal overflow; `.dark` follows the scheme; glass on the menu only, never on a card; the side rail beside the content without overlapping it, a centred bottom bar on a phone; every chart drawn at a real size; menu links landing on their section; search, URL filters and demo states.
3. Anything printed under `PROBLEMS:` is a defect. Fix it; do not loosen the check.
4. **Look at the screenshots** in `.claude/tmp/verify/`, at minimum phone and desktop, light and dark, for every page you touched. Check for:
   - text clipped, overlapping, or wrapping one word per line;
   - a chart, card or table that is present but 0px tall or squeezed;
   - contrast in dark mode, especially chart axes, gridlines and tooltips;
   - the Sankey legible on a phone;
   - loading, empty and error states, not only the happy path.
5. **Measure before editing.** `getBoundingClientRect`, `getComputedStyle`, `scrollWidth` vs `clientWidth`. For an element that "is there but not shown", walk the ancestors for `backdrop-filter`, `filter`, `transform`, `contain` and `overflow`.
6. Animated charts: wait for the animation, or screenshot the settled state. A capture taken mid-animation is not a defect and not evidence.
7. Report what was verified, at which sizes and themes. Then show dathq and wait: he looks before anything is committed.

When a new kind of defect turns up that the script could have caught, add the check to `scripts/verify.mjs` and prove it fails against the defect.
