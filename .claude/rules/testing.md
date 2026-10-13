# Testing

## What makes a test count

- **A regression test must be proven to fail against the old code, for the predicted reason.** Neutralise the fix (change what it computes; do not delete code, or the failure is a compile error, which proves nothing), watch the spec fail with the message you predicted, restore. A green new test proves nothing on its own.
- **A test that cannot fail is not a test.** If you cannot name the value that changes, you wrote a screenshot, not an assertion.
- **When behaviour turns on a comparison, put the fixture on the side that exercises it**, and say which side in the test.
- **A test double that mirrors logic rather than running it proves nothing about that logic.**
- **A deterministic test is proof; a repeated pass is evidence.** Seed the mock data so screenshots and assertions are stable.

## Where tests go

- **Unit (Vitest):** pure functions first: the mock data generator, request querying (filter, sort, paginate), chart layout maths (scales, Sankey columns and link widths), formatters. Then components through their public surface.
- **Visual (`pnpm verify`):** layout, theme and overflow at every size; see the `verify-dashboard` skill.
- **E2E (Playwright), when added:** user journeys through the built app.

## Playwright rules

- **Role and label locators first** (`getByRole`, `getByLabel`); `data-testid` only where nothing semantic exists. **Never write a locator that encodes an a11y bug**; fix the component instead.
- **`toBeHidden()` passes for an element that does not exist.** Wait for a render anchor first, and pair it with `toHaveCount(1)`.
- **`toBeVisible()` passes on whatever is on screen now**, including the content you are waiting to replace. Poll for the content that must change.
- **Never sample once after an action.** `expect.poll` for anything arriving, animating or loading.
- **Every `waitForEvent` gets an explicit short timeout**, and never a swallowed rejection.
- **Assert geometry, not existence**: a chart, card or table can be present, correct and 0px tall.
- **Read the failure artefact** (trace, page snapshot) before theorising; a failure in browser launch is not a flaky assertion.
- **Never run a suite while the dev server is rebuilding**, and confirm the build succeeded: a failed rebuild keeps serving the last good bundle.
- **A backgrounded run's exit code is not its verdict.** Read the summary line.
