# Angular conventions

Angular 22, zoneless, standalone, static prerender. Aligned with [Angular's AI rules](https://angular.dev/ai/develop-with-ai#rules-files), plus what the datha platform learned the hard way.

## TypeScript

- Strict mode; prefer inference; no `any` (use `unknown`). Removing an `any` is an audit: expect it to reveal dead or wrong reads.

## Components

- Standalone (the default; do not write `standalone: true`). OnPush is the default in Angular 22 and every component still declares it.
- `inject()` for DI; `input()` / `output()` / `model()`; `host: {}` instead of `@HostBinding` / `@HostListener`.
- `@if` / `@for` / `@switch`; `[class.x]` / `[style.x]` instead of `ngClass` / `ngStyle`. `NgOptimizedImage` for images.
- **DOM surgery on your own host element belongs in `afterNextRender`**, never the constructor: where Angular inserts the element is not decided yet.

## State

- `signal` / `computed` / `set` / `update` for local state. Feature state in a small signal store; derived values via `computed`, stated in one place.
- **Template state set from an async callback must be a signal.** Zoneless renders nothing for a plain field assigned in a `subscribe`, `then` or timer. Prefer `toSignal(obs$, { initialValue })` or `resource` / `rxResource`.
- **A helper called inside an `effect` makes the effect depend on every signal it reads**, including its own guards. Wrap such calls in `untracked()`, and return the same reference when nothing changed, or an update can loop.
- **A `computed` that recomputes to the same value does not propagate**, so an effect that must re-run on every transition reads the state object itself. Use `afterRenderEffect` when the effect touches the DOM.
- Filter state that a user would share or refresh lives in the URL query params.

## RxJS

- `takeUntilDestroyed()` or `toSignal`; no nested subscribes.
- **A shared stream keeps its memory.** `distinctUntilChanged` will swallow the same query typed again after the view was cleared: reset the stream where the surface closes. A reset must not pass through a debounce.

## Routing

- Lazy `loadComponent` per feature route. Sibling routes pointing at one component destroy and recreate it on every switch: read the route snapshot at construction rather than reacting to an outgoing instance's `paramMap`.

## Server rendering (the app is prerendered)

- **No browser globals** (`window`, `localStorage`, `navigator`, `matchMedia`) at module load, in constructors, field initialisers or `ngOnInit`. Use `afterNextRender`, or check `isPlatformBrowser`.
- **A prerender that throws or never settles looks like a hang**: the build waits out its timeout with no error. Bisect the providers rather than reading code.
- Charts and anything measuring the DOM draw after render; the prerendered HTML must still be meaningful (titles, layout, an illustrative or empty state).
- **A click before hydration is a full navigation.** Tests wait for hydration before clicking a `routerLink`.

## Templates and types

- **Template bindings are only type-checked by the AOT build.** `tsc` and the unit suite can stay green over a broken binding; run `pnpm build` before calling anything done.
- **Whitespace between template nodes renders as a space.** Build strings that must not contain one in TypeScript.

## Accessibility

- WCAG 2.1 AA. Every control has an accessible name that differs across repeated controls ("Remove filter: status: 500", not "Remove filter" four times). If `getByRole` cannot tell two controls apart, a screen reader cannot either.
- Touch targets reach 44px through a transparent hit area, not by drawing a larger control.

## Unit tests (Vitest)

- No `fakeAsync` / `tick` / `flush` (they need Zone.js). `await fixture.whenStable()` waits for a render; `vi.useFakeTimers()` drives timers.
- `toContain` is `===` in Vitest; use `toContainEqual` for objects.
- Type spies with `vi.fn<T['method']>()`; never cast a partial object to the whole type.
- `tsc` does not see spec files unless the spec tsconfig is type-checked: `pnpm exec tsc -p tsconfig.spec.json --noEmit`.
