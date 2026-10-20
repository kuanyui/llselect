# OPTIMIZE - performance log

Agent-facing log of llselect's own runtime performance: measurements, regressions, and the optimization work on them. The benchmark PAGE (its design, its traps, its own findings) lives in `SPEC_BENCHMARK.md`, `FIXME_BENCHMARK.md` and `BENCHMARK-LIBS-TUNE-FOR-FAIRNESS.md`; this file is about the library's numbers. The README "Benchmark" tables are the published numbers; they change only from a run on the machine the README's note describes, and a data update there never rewords the prose (CLAUDE.md "Update the data").

Status marks: `[ ]` open, `[~]` in progress, `[x]` done. Newest entry on top. No dates: `git log` owns the when; a measurement is identified by the commit the tree was at.

## Mass instantiation regressed since v0.0.7

- [ ] **Build and teardown of many widgets cost more than at v0.0.7, beyond the environment's own drift.** The owner will investigate later; this entry holds the baseline so the later run compares against the same numbers.
- What the benchmark measures (`demo/benchmark.js`, `buildAll`): Build total is the sum of the synchronous adapter `setup` calls over all widgets, one pass, with a `requestAnimationFrame` yield between chunks (25 widgets per chunk at 1000 widgets, 1 at 100); the yields and the final reflow are excluded. Teardown total is one timed loop of the adapter `teardown` over the widgets just built. DOM nodes is the resting count after the build. The interaction tables use medians of repeats; build and teardown do not, so each cell is a single pass.
- The llselect path per widget (the `llselect` adapter): `new LLSelectSingle(mount, { filterable: true, ariaLabel })`, then `setItems(items)`, then `setChosenItem(items[0])`, since every widget is built pre-selected; teardown is `destroy()`. The items array is built once and shared by all widgets.
- Baseline: the README "Benchmark" tables, measured at v0.0.7 (commit `7ccaf36`) on the i9-13900HX Linux machine the README's note describes, Chromium 151.
- New run, by the owner, on the same 13900HX machine, Chromium 154.0.8037.57 stable x86_64, tree at 0.0.10 after the events work (about commit `b4d46d9`; which `public/` build served the page is not recorded), single run per cell:

| Library | 100 x 100 build (ms) | 100 x 100 DOM nodes | 100 x 100 teardown (ms) | 1000 x 10 build (ms) | 1000 x 10 DOM nodes | 1000 x 10 teardown (ms) |
|---|---|---|---|---|---|---|
| Native `<select>` | 52 | 10,200 | 3.90 | 38 | 12,000 | 7.20 |
| llselect | 35 | 900 | 2.20 | 58 | 9,000 | 7.80 |
| Choices.js | 207 | 20,900 | 8.10 | 1081 | 29,000 | 33 |
| Select2 | 187 | 10,900 | 17 | 568 | 19,000 | 42 |
| Tom Select | 118 | 900 | 1.90 | 517 | 9,000 | 22 |
| Slim Select | 134 | 11,000 | 7.40 | 173 | 20,000 | 32 |

- Ratios, new run divided by the README baseline (derived from the two tables):

| Row | Native `<select>` | llselect | The other four libraries |
|---|---|---|---|
| 100 x 100 build | 1.73 | 2.92 | 1.21 to 2.62 |
| 1000 x 10 build | 1.15 | 1.93 | 1.11 to 1.24 |
| 1000 x 10 teardown | 1.33 | 1.81 | 0.96 to 1.28 |
| 100 x 100 teardown | 1.18 | 4.40 | 1.23 to 1.70 |

- Reading: every library is slower in the new run, so the environment moved (the browser went from Chromium 151 to 154; the power profile and background load of the new run are not recorded) and absolute numbers do not compare, the ratios do. llselect's ratio exceeds the other libraries' in every row, so part of its slowdown is the library's own, build and teardown both. In the 1000 x 10 run the other libraries lost between a tenth and a quarter; llselect's build time nearly doubled.
- Shape: resting DOM nodes are unchanged (900 and 9,000), so the popup list is still not rendered at rest. Per widget, build went from 120 to 350 microseconds at 100 items and from 30 to 58 microseconds at 10 items: the added cost grows with the item count, so part of it is per-item work in the constructor, `setItems` or `setChosenItem`, not only per-widget listeners or observers. Teardown per widget went from 5 to 22 microseconds at 100 items and from 4.3 to 7.8 at 10 items; the 100 x 100 teardown baseline is 0.50 ms in total, so that ratio is the least reliable of the four.
- Caveats: one pass per cell. Repeat the run three times, both configurations, before chasing a number.
- Candidates, the feature commits since v0.0.7 that touch construction, `setItems`, `setChosenItem` or `destroy`; none is confirmed, and the fix and refactor commits of the same range (161 commits in all) are not listed and may matter too:
  - Color scheme (`87e7b7b` the `colorScheme` setting and resolver, `0aaf8a1` the batched first decision): a subscription per widget at construction; `destroy()` unsubscribes and cancels a pending first decision.
  - Widget focus events (`ed1512e`): the whole-life `focusin` / `focusout` listener pair per widget.
  - Active item change (`d88c090`): `reportActiveItem` on the render and close paths.
  - `chosenItemsOrder` (`297a7a9`): the `setChosenItem` / `setChosenItems` path.
  - Pinned leading / trailing row blocks (`93aff3b`), action rows (`a751873`), header / footer slots (`b217580`): more scaffold per widget if any of it is created at construction rather than at open.
  - `onBeforeChange` and the change meta (`091eade`, `66b19b4`): the `setChosenItem` path.
  - `itemToLangFn` / `groupKeyToLangFn` (`3c941d6`, `ea76235`) and prefix typeahead (`c6b0240`) run at render or on keydown, so they are unlikely at rest.
- Plan: 1. repeat the two runs; 2. record a Performance-panel profile of the 1000 x 10 llselect build and read it bottom-up by self time under the `LLSelectSingle` constructor, `setItems`, `setChosenItem` and `destroy`; 3. bisect across the range only if the profile does not point at one place; 4. fix, re-run both configurations, then update the README tables as data only, from the README's documented machine.
