# FIXME - review-findings log

Findings from reviews of llselect, newest round on top. Format spec (severity words, `[SEVERITY-N]` ids, Symptom/Cause/Fix/Verified labels, cross-round Q&A) lives in `../../CLAUDE.md` "Review-findings log". `N` is a stable id in creation order, not a rank; open items are `[ ]`, resolved `[x]`. No dates here - git log owns the when.

## review (user-reported, disabled tag x + stale demo build)

- [x] **[MEDIUM-79] - an item-disabled but chosen chip's x still removed it (pointer path)**
  - Symptom: with `itemDisabledFn` / `groupDisabledFn` marking a CHOSEN item disabled, its tag x removed it on click - a pointer user could re-toggle a disabled selection, violating A11Y.md "only user re-toggling is blocked". Keyboard was already safe (disabled rows carry no click handler).
  - Cause: MEDIUM-59 guarded only the whole-control case (`isDisabled()`) in the tag x handler; `toggleItem` is deliberately disabled-blind (the programmatic channel), so the item-level gesture leaked. The popup row and choose-all paths already routed through `isItemEffectivelyDisabled`; only the tag x did not.
  - Fix: the tag x handler also returns on `isItemEffectivelyDisabled(item)` (covers disabled groups), kept at the gesture layer so `toggleItem` stays native-parity disabled-blind. The disabled chip + its x are marked (`aria-disabled` + `tagDisabledClass`; themes grey it with opacity + `cursor: not-allowed`, never `pointer-events: none`) so the inert x reads as disabled, not broken. Clear stays a total wipe. multiple.ts `createTagEl` / `createTagRemoveButtonEl`, base.ts `classIdMap`, the five themes, A11Y.md Tags + Disabled.
  - Verified: test/disabled.test.ts pins the item- and group-disabled pointer no-op, the enabled chip still removing, the `aria-disabled` + class marking, the rerender flip, and that a disabled chip x never opens the popup. Each failed on the pre-fix code first. Real-browser (rootless Chromium, coordinate click): clicking the disabled chip x leaves the popup closed and the selection intact, an enabled chip x still removes, and injecting the DESIGN-forbidden `pointer-events: none` reproduces the fall-through that opens the popup - proving both the fix and the probe.
  - Q: Why guard at the tag x handler, not inside `toggleItem`?
    - A: `toggleItem` is the raw programmatic channel (setChosenItems, framework write-back) and must stay disabled-blind to match native `<select>`. The contract blocks USER re-toggling only, so the guard belongs at the gesture entry points - where the popup row already sits (no click handler on a disabled row).
  - Q: Why mark the chip disabled (visible-but-inert) instead of dropping its x (option C)?
    - A: Panel fork. Real-browser probes: native `<select multiple>` keeps a disabled selected option greyed-but-inert (the user can never remove it), select2 and react-select both still remove it (select2 is this same bug), antd drops the control. The repo bases disabled on native (QUALITY-40), so the x stays visible-but-inert and greyed; dropping it would contradict llselect's own whole-control visible-but-inert rule and reflow the tag strip when `itemDisabledFn` flips (control-stability rule). A toggle setting was rejected (Simplicity First; overriding `createTagRemoveButtonEl` already covers the drop-the-x taste). All five panel members agree on A+: Opus 4.8 / Opus 5 / Fable 5 converged, and Codex Sol (max) + Codex 5.5 (xhigh) both AGREE on review of the landed fix.
  - Q: Why grey the disabled chip x with `cursor: not-allowed`, not `pointer-events: none`?
    - A: DESIGN.md forbids `pointer-events: none` on disabled (it re-blocks hover tooltips), and here it also breaks the fix - with the x not hit-testable the real click falls through to the trigger and opens the popup (the JS `stopPropagation` never runs). Both Codex members caught it independently. The JS guard, not CSS, is the real block; jsdom `.click()` cannot see this - a real coordinate click is needed (TODO.md manual verification).
- [x] **[QUALITY-80] - "the control-disabled tag x still works" was a stale build, not a code defect**
  - Symptom: the user saw a disabled control's tag x still mutating the selection in the demo. The src fix (MEDIUM-59) was in and unit-green, but `dist/` and `public/dist/` were built before it, so `make server` served the un-guarded bundle.
  - Fix: rebuilt (`npm run build` + `build:site`); no source change.
  - Q: The guard for this lesson?
    - A: A green `npm test` says nothing about what `make server` serves - `public/` only regenerates on `build:site`. When a "shipped fix does not work" report arrives, diff the built bundle against src before touching source.

## review (five-model panel over two independent full-repo reviews)

Process: two independent full-repo reviews (a clean Claude Opus 5 session; Codex gpt-5.6-sol at max effort). Convergent findings were fixed outright. Single-source findings went to a five-model panel (Fable 5, Opus 5, Opus 4.8, Codex Sol, Codex ChatGPT 5.5) voting CERTAIN-BUG / NEEDS-HUMAN-DECISION / REJECT per finding. Each round of fixes was then re-reviewed, and findings on the fixes were fixed in turn. Everything else in those rounds was explicitly judged sound by the re-reviewers. Open entries below await the user's ruling.

- [x] **[HIGH-53] - an async preset ng-model never resolves once items arrive**
  - Symptom: a preset model with an initially empty (async) list stays on the placeholder forever, in all three directives.
  - Cause: NgModel's first `$render` precedes the first items `$watchCollection` tick; `setItems` then prunes the fresh choice (`onItemsChanged`), and the watcher re-rendered only for `select as` projections. The ui bridge was missed by the first fix entirely.
  - Fix: every items watcher now calls `$render()` after `setItems`. `llselect-angularjs` resolves by MEMBERSHIP (`select as` key / `track by` key / identity), so an absent value shows empty while the model keeps it; the ui bridge stays identity - ui-select's own semantics, the selection is the model. SPEC.md / README invariants rewritten to match.
  - Verified: llselect-angularjs async test (with and without `select as`); ui bridge async tests (an object preset renders from boot; an alias key resolves on arrival).
  - Q: The panel split 2 REJECT / 1 NEEDS-HUMAN-DECISION / 1 CERTAIN-BUG - what settled it?
    - A: A failing test, not votes: the probe showed 'Please select' where 'Apple' was expected, proving the CERTAIN-BUG vote's mechanism right. When reviewers disagree about a claimed runtime behavior, write the probe before arguing.
  - Q: Without `track by`, should a reload's structurally equal fresh object count as a SECOND item (relisted, separately addable), as the identity default made it?
    - A: No. One reviewer read ui-select's `refreshItems` (`indexOf`, identity) and called identity parity; a direct probe of real ui-select 0.19.8 refuted that - its multiple-mode comparison is `_isItemSelected`'s `angular.equals` (`uiSelectController.js:332`), so the fresh object is the same item and a double-add is impossible. The bridge now wires `compareFn` to `angular.equals` for no-`track by` multiple; a test pins one chip / hidden row / no second entry. Lesson (again): source-reading claims about another library lose to a direct probe of it.
  - Q: Codex proposed the wrappers write back to ng-model only when `meta.source === 'user'` - why was that rejected (4/4)?
    - A: App code calling `instance().setChosenItems()` legitimately expects the model to sync. The write-back gate already suppresses the wrapper's own echo, which is the actual hazard; gating on 'user' would break direct API use for no gain.
- [x] **[HIGH-54] - ui bridge template scopes leaked**
  - Symptom: compiled template scopes accumulated: popup rebuilds leaked row scopes, trigger rebuilds leaked match / tag scopes, and single-row repaints (multi toggle with `remove-selected="false"`) leaked one scope per toggle even after the first fix.
  - Cause: one shared array released only in `renderPopupList`; the trigger and the partial-row path rebuild their DOM on their own schedules.
  - Fix: per-slot tracking (row vs trigger), each released where its slot's DOM dies; entries carry their element, and `replacePopupListItemElInDom` / `close` release the scopes whose element is no longer in the DOM.
  - Verified: scope-count regression test (repeated toggles hold the total scope count flat); SPEC.md invariant updated.
- [x] **[MEDIUM-55] - keyboard focus could land on, or stay on, a disabled row**
  - Symptom: three holes against A11Y.md "disabled rows are skipped": a filter keystroke focused index 0 even when disabled; the shrink clamp landed on a disabled last row; a rerender kept focus on a row that BECAME disabled in place.
  - Fix: all three routes go through `findNextEnabledIndex` (keystroke forward from 0; clamp backward; in-place backward first, then the choose-all leading row when one is rendered - it is the option above the first item - then forward).
  - Verified: filterable + disabled tests; the clamp test reaches the clamp via `setItems` while open; select-all test pins the leading-row hand-back.
  - Q: The first version of the clamp test was green before the fix too - why?
    - A: The filter path resets `focusedIndex` before rendering, so typing can never reach the clamp; only `setItems` while open can. A pin must FAIL on the pre-fix code - run it against the old code once before trusting it.
- [x] **[MEDIUM-56] - bridge reused a stale filter result when the collection changed**
  - Symptom: with a query active, newly added matching items stayed hidden until the next keystroke.
  - Cause: the `$watchCollection` called `setItems` before invalidating `lastQuery` / `matchSet`, so the synchronous refilter answered from the previous collection.
  - Fix: invalidate before `setItems`.
  - Verified: bridge test adds a matching item mid-query.
- [x] **[MEDIUM-57] - a track-by reload left stale chosen objects showing**
  - Symptom: replacing `{id:1, name:'Alice'}` with `{id:1, name:'Alicia'}` under a key `compareFn` left the trigger showing Alice.
  - Cause: `setChosenItem(s)` short-circuits on compareFn equality, so re-resolution kept the old reference; the ui bridge additionally overwrote `$select.selected` with its stale input after the core had already swapped.
  - Fix: core `setItems` swaps the stored reference to the list's own object when a compareFn-equal but DIFFERENT one arrives (trigger re-renders; no `onChange` - the logical value did not change, matching ngOptions, which never rewrites the model). The ui bridge re-syncs `$select.selected` from the core after `$render`.
  - Verified: core single + multiple reference-swap tests; bridge track-by rename test.
- [x] **[MEDIUM-58] - tree demo: inherited bulk ops could break the leaves-only model**
  - Symptom: `setChosenItems([branch])` put branches in the model; the first fix (filter branches there) then left `toggleAll` and the choose-all row able only to choose, never to clear - branches can never be chosen, so their all-chosen checks never held - and the row's counts were wrong.
  - Fix: `setChosenItems` drops branches (the one entry point every raw array passes through); a new protected `getVisibleEnabledItems` seam in `LLSelectMultiple` - the choose-all row and `toggleAllVisible` are documented as acting on the SAME set and now share the one method - is narrowed to leaves, plus a `toggleAll` override.
  - Verified: leaves-only bulk test; `toggleAll` round-trip; choose-all row counts / tri-state / click test.
  - Q: Why a core seam instead of overriding `createPopupListLeadingRowEl` in the demo?
    - A: Without a shared method a subclass can only keep the row and `toggleAllVisible` in agreement by duplicating the whole row builder. The seam is the smallest honest fix and follows the existing create*/get* seam architecture.
- [x] **[MEDIUM-59] - a disabled control's embedded buttons stayed live**
  - Symptom: with `setDisabled(true)`, the tag remove buttons and the clear button still mutated the selection - they sit in the trigger, reachable while closed, and only open/keyboard were guarded.
  - Fix: both clicks no-op while disabled (buttons stay visible so the value stays readable). A11Y.md Disabled / Tags / Clear sections and both builder docstrings state it; demo 9.3 shows it.
  - Verified: disabled-buttons test, including the re-enabled path.
  - Q: MEDIUM-79 later found this incomplete - an item-disabled chosen chip's x still removed it. Why did the original miss it?
    - A: This fix and its only test covered one axis, whole-control `isDisabled()`. The other axis - an item-level disabled (`itemDisabledFn` / `groupDisabledFn`) CHOSEN item - is a separate gesture path that was never written down or tested. Lesson: "disabled" has two axes here; a guard added for one must be checked against the other.
- [x] **[QUALITY-60] - bridge `on-select` / `on-remove` ran outside a digest**
  - Symptom: scope writes in the app's callbacks stayed invisible until an unrelated digest.
  - Fix: `applyOnScope` wrapper (`$$phase`-safe) around `fireSelectRemove` and the single-mode `on-select`.
  - Verified: bridge callback tests assert same-digest visibility.
- [x] **[QUALITY-61] - `allow-clear` parse deviated from ui-select**
  - Symptom: the bare attribute read as false; `allow-clear="false"` read as true (raw-string truthiness).
  - Fix: ui-select's exact parse (`'' -> true`, else lowercase equals `'true'`). The remaining deviation - the attribute is read once, not `$observe`d - is documented in API.md (llselect's `clearable` is construction-frozen; a runtime flip needs a re-link).
  - Verified: parse test in both directions.
- [x] **[QUALITY-62] - blank aria settings suppressed the unnamed-widget warn**
  - Symptom: `ariaLabel: ''` (or whitespace) counted as "named" but produced no accessible name.
  - Fix: `blankToNull` normalizes `ariaLabel` / `ariaLabelledBy` - blank counts as unset, the ladder moves on, the warn fires. Docstrings + A11Y.md state the rule.
  - Verified: blank-ariaLabel test (warn still fires; a lower rung still names the field).
- [x] **[QUALITY-63] - demo regression: `ll-aria-label` values carried literal quotes**
  - Symptom: 18 demo sites wrote `ll-aria-label="'Country'"`; the attribute is a Literal, so accessible names included the quotes.
  - Cause: my own edit pattern-matched the $eval'd attributes when adding names everywhere.
  - Fix: unquoted all 18.
  - Q: How did it slip in?
    - A: One directive mixing Literal and expression attributes invites exactly this. Caught by the mandated re-review of the fixes - which is why that step exists.
- [x] **[DOCUMENTATION-64] - doc drift left behind by the fixes**
  - Symptom: the provider `arrow` docstring and the API.md config example still described `null` as "the theme draws it" (it is the package chevron default; `'none'` is theme-drawn); `createTriggerContentElFn`'s docstring claimed the SETTING wins over a subclass override; DESIGN.md "Customization model" rules the opposite (override = replace, the override wins), and the docstring now says so; the `changeSource` docstring still said the source stays 'user' for the whole gesture, though the first `onChange` now resets it; API.md's filter-cost bullet claimed "evaluates ONCE per typed query" while the items watcher still evaluates the full expression per digest.
  - Fix: all corrected in place.
- [x] **[DOCUMENTATION-65] - README regrown claims and broken links**
  - Symptom: wording resolved under DOCUMENTATION-22 ("Blazing fast", overbroad minimal-DOM claims) had partially survived; both Home links rendered with a stray `]`; the selection-perf bullet claimed only the chosen row mutates (single refreshes two rows; multiple also rebuilds the trigger and the choose-all row).
  - Fix: reworded to the recorded contract; links fixed.
  - Q: Why did an overbroad claim outlive its resolved `[x]` entry?
    - A: The fix edited one restatement of the claim, not all of them. Resolving a documentation finding means grepping every restatement, not correcting the cited line.
- [x] **[LINT-66] - check.mjs blind spots**
  - Symptom: demo / angularjs JS carried no AST checks; heading-slug anchors were unverified; blockquoted headings (`> ####`) minted anchors the checker could not see; `test-utils/**/*.ts` and `rollup.config.mjs` were on no list; backticked repo paths were unchecked.
  - Fix: all surfaces added; the summary line counts them (79 punctuation / 114 AST / 22 markdown-linked files at time of writing).
- [x] **[QUALITY-67] - (rejected) filterable predicate evaluated against the empty construction list**
  - Symptom claimed: `filterable: (items) => ...` wires the role from an empty list, flipping on first open.
  - Fix: none - unanimous panel REJECT. The predicate re-evaluates per open by documented design; wiring computed from the initial (empty) list is the documented starting state before the first open.

Open items from the panel, awaiting the user's ruling:

- [ ] **[MEDIUM-68] - mousedown on the popup's non-option areas closes the popup or strands the keyboard**
  - Symptom: mousedown on the no-results message / popup padding blurs the focus host, so focusout closes the popup; mousedown on the list element itself focuses a `tabindex="-1"` element with no keydown handler - the keyboard goes dead. src/base.ts:910 (guard covers popupListEl descendants only).
  - Panel: 4x NEEDS-HUMAN-DECISION - a fix touches the pinned scrollbar-drag behavior (test/focus.test.ts).
  - Proposed: preventDefault on the non-option areas (padding, the no-results element), keyboard forwarding on the list element; real-browser scrollbar pass before resolving.
- [x] **[QUALITY-69] - $eval'd enum attributes fell back silently on the likeliest typo**
  - Symptom: `ll-trigger-display="tags"` (inner quotes dropped) $eval'd to undefined and silently became the default 'count'. angularjs/llselect-angularjs.js.
  - Fix: `evalEnumAttr` (mirrors `evalFnAttr`) wraps the `$eval` for `ll-trigger-display` and `ll-popup-width-policy`; a NON-STRING result `console.warn`s (naming the attribute, re-quoting the given value as the fix) and never throws - the default stays a working control. The ui-select bridge hardcodes `triggerDisplay = 'tags'`, so it has no such attribute.
  - Verified: angularjs test asserts the warn fires for `ll-trigger-display="tags"` (undefined) AND `ll-popup-width-policy="match-trigger"` (0), and does NOT fire for a correctly-quoted value. Each new case failed on the first-cut guard first.
  - Q: Why guard on `typeof value !== 'string'`, not the Proposed's `=== undefined`?
    - A: The post-fix panel review (both Codex members) caught it: only a single-identifier typo (`ll-trigger-display="tags"` -> `scope.tags`) yields undefined. A dashed enum literal - the ONLY shape `ll-popup-width-policy` typos take (`fit-content` / `match-trigger`) - $evals as SUBTRACTION (`fit - content`), and AngularJS treats undefined operands as 0, so `=== undefined` never fired and the first cut silently missed every popup-width typo. A valid enum value is always a string; rejecting any non-string catches both shapes.
  - Q: Why not wrap `ll-placeholder` too - it shares the dropped-quotes hazard?
    - A: `ll-placeholder` is free text often bound to a scope expression, where an undefined / non-string result is a legitimate "not set yet", not a typo - warning there would be noisy. The enum attributes have a fixed valid set, so a non-string is unambiguously wrong. (A single-word unquoted placeholder still falls back silently; a multi-word one $parses to a loud syntax error. Documented tradeoff, not a hole.)
- [x] **[MEDIUM-70] - ui bridge had no ariaLabelledBy path**
  - Symptom: only `aria-label` / `title` mapped to a name. angularjs/llselect-ui-select.js.
  - Fix: the host's `aria-labelledby` attribute is forwarded verbatim to `settings.ariaLabelledBy`; the core name ladder picks it over `aria-label` per ARIA. No new vocabulary. labelEl stays out - ui-select has no label-element concept, and `aria-labelledby` is the by-reference path.
  - Verified: ui-select test asserts a host `aria-labelledby` reaches the trigger's name chain.
- [x] **[MEDIUM-71] - the no-results live region was rewritten identically on every keystroke**
  - Symptom: `role="status"` content re-set while visible risks repeated announcements (AT-dependent; A11Y.md: announced once on appearance). src/base.ts.
  - Fix: `syncPopupListNoResultsToDom` records the last written text (`lastNoResultsText`) and skips the write when the resolved text is unchanged; it resets to `null` when the region hides, so the next appearance re-announces. Custom `createPopupListNoResultsContentElFn` output is compared by its `textContent` (what the status region speaks), so a query-dependent message still rewrites when its text actually changes.
  - Verified: filterable test pins that a second still-no-match keystroke keeps the SAME text node (an identical-text rewrite would replace it and re-announce). Demonstrated failing with the skip disabled.
- [ ] **[PERFORMANCE-72] - `isChosen` is a linear scan per rendered row**
  - Symptom: multi popup render is O(visible x chosen); `setChosenItems` full-rerenders even though selection cannot change grouping. src/multiple.ts:264.
  - Proposed: a chosenSet fast path mirroring PERFORMANCE-31 plus a chosen-only refresh; needs its own design wave (cache invalidation).
- [ ] **[PERFORMANCE-73] - bridge items watcher re-runs the whole `| filter:` chain every digest**
  - Symptom: the watched expression retains `| filter: $select.search` with an empty query, so filterFilter deep-compares every item per digest per widget. angularjs/llselect-ui-select.js:414. The overstated doc claim is already corrected (DOCUMENTATION-64).
  - Proposed: watch the bare source by splitting the filters off (ui-select's own parser does this); behavior change, so it awaits the ruling.
- [x] **[QUALITY-74] - unprefixed public TYPE exports (icon trio + WidthPolicy / Placement)**
  - Symptom: `IconOptions` / `CheckboxState` / `CheckboxIconOptions` were unprefixed exports; so were `WidthPolicy` / `Placement`. The owner also flagged that the icon builder FUNCTIONS carry no prefix either.
  - Fix: the five TYPES gained the prefix - `LLSelectIconOptions`, `LLSelectCheckboxState`, `LLSelectCheckboxIconOptions`, `LLSelectWidthPolicy`, `LLSelectPlacement`. Exported FUNCTIONS (`createChevronDownSvgEl` ... `createHighlightedTextEl`, `gatherItemsByGroupKey`) and `version` stay unprefixed. Rule recorded in naming-conventions.md s3.
  - Verified: build + 390 tests green after the rename (src + demo/subclass/tree-select.ts); no bare type name remains.
  - Q: Why prefix TYPES but not FUNCTIONS - is that not inconsistent?
    - A: Five-model panel, 5:0 (Opus 4.8 / Opus 5 / Fable 5 / Codex Sol max / Codex 5.5 xhigh), each verifying against real libraries: no reputable JS library prefixes a standalone exported FUNCTION with its own name (date-fns `format`, lodash `debounce`, MUI `createTheme`, D3 `select`, Floating UI `computePosition`, React `useState`) - named imports already namespace values, and a consumer wanting a uniform prefix writes `import * as LLSelect` (free; the Three.js / D3 / zod pattern). TYPES differ: they appear in `.d.ts` / hover / error messages with no import context and collide across libraries (`Placement` ships in both Popper and Floating UI), so the prefix is collision safety. zod is the living template - type `ZodType`, function `string()`.
- [ ] **[QUALITY-75] - demo 4.2's visible labels and spoken names disagree**
  - Symptom: `<label>` elements with no `for=`, while the widgets get `ariaLabel: 'chevron'` / `'triangle'`. demo/examples.html:205.
  - Panel: split 2 CERTAIN-BUG / 2 REJECT (the proposed labelEl remedy arguably makes the name worse).
  - Proposed: align the spoken name with the visible text; direction open.
- [ ] **[MEDIUM-76] - hosted inside an app's shadow root, option clicks read as outside clicks**
  - Symptom: the document-level outside handlers use `rootEl.contains(ev.target)`; composed events retarget to the shadow host, so clicks inside close the popup. llselect itself uses NO shadow DOM - this is about being hosted in one. src/base.ts:1986.
  - Proposed: `ev.composedPath?.()[0] ?? ev.target` in the document-level handlers; the API is available across the support floor.
- [ ] **[MEDIUM-77] - duplicate compareFn-equal items get stale selection DOM**
  - Symptom: partial updates use `findIndex`, so only the first equivalent row's `aria-selected` refreshes. src/base.ts:1635. Related data point: the ui bridge's `angular.equals` compare makes a MODEL holding structurally equal duplicates render one chip and lose an entry on the first user change, and a single-mode LIST holding duplicate rows marks, on a fresh list build, every row equal to the CURRENT choice `aria-selected` (both documented as edge deviations in angularjs/API.md) - a duplicates policy would rule all of these.
  - Related (five-model round on MEDIUM-79): with a custom `compareFn`, a chosen chip holds the `chosenItems` object while the popup row holds the `items` object; if their `itemDisabledFn` / group projections disagree, the chip can render enabled (x removable) while the row is `aria-disabled`. Same root as the duplicates gap - ruled by the same uniqueness / projection-congruence contract, not per-site reconciliation.
  - Proposed: document "items must be unique under compareFn" (plus a dev warn) rather than supporting duplicates.
- [ ] **[MEDIUM-78] - constructors invoke overridable render before subclass fields initialize**
  - Symptom: a subclass override of a render seam that reads subclass fields runs during `super()`, before the subclass's field initializers (classic virtual-call-in-constructor). src/single.ts:97, src/multiple.ts:216.
  - Proposed: document the constraint on the seams ("tolerate defaults during construction, or rerender() in your own constructor"); two-phase init deferred as a pre-1.0 question.

## review (user-reported, Firefox mass-build gap)

- [x] **[PERFORMANCE-52] - the 1000x10 mass build reads ~2.6x slower on Firefox than Chromium (81 ms vs 31 ms), while competitors do not degrade**
  - Symptom: user-measured, repeatable. llselect 81 ms on Firefox vs 31 ms on Chromium; the other libraries move much less between engines.
  - Cause: no llselect defect. Verified in real headless Firefox + Chromium (Playwright, the rootless recipe): phase-timed construction shows NO phase spike - construct 34 vs 21 ms, reflow 12 vs 10, destroy 6 vs 4 per 1000 widgets (warm minimums). The gap is a generic engine factor (~1.5x warm) on DOM-scaffold construction, amplified to ~2.2-2.6x by the benchmark's cold first run (Firefox JIT warms slower) and its chunked build with a forced reflow per chunk (amplifies both engines ~3x equally).
  - Impact: none actionable. 81 us per widget on Firefox is still 2.3x faster than the nearest library (Slim Select, 187 ms) and 2.9x native - while every competitor sits at 6.7-24x native on the same run.
  - Fix: none - no defect to fix. The README benchmark table states its engine (Chromium 150); engine-to-engine ratios are expected to differ. Upstream is already moving on both isolated families: Gecko's quadratic-scan `setAttribute` fix is VERIFIED FIXED (bugzil.la/2047481, resolved shortly before this entry - re-measure on a post-fix Firefox before ever revisiting), and listener-registration cost is ASSIGNED with partial patches (bugzil.la/1945310; our few-listeners-many-targets data is complementary evidence to attach there if pursued).
  - Q: Was the Popover API the culprit (the one llselect-only feature, with `popover="manual"` set per construction)?
    - A: No - hypothesized first, then refuted by an A/B/A run deleting `showPopover` before construction: 102 / 82 / 72 ms in Firefox, i.e. warm-up noise larger than any popover signal, and Chromium showed the same pattern. The lesson: engine-difference reports need a phase-timed measurement before naming any culprit; the one-liner A/B lever (`delete HTMLElement.prototype.showPopover`) plus the rootless Playwright recipe made the real measurement cheap.
  - Q: Do isolated per-primitive micro-benchmarks (setAttribute ~2.1x, addEventListener ~2.1x on Firefox) prove the attribution?
    - A: Not alone - a cross-model critique (codex) correctly objected that detached monomorphic loops suffer interning / IC-warmup / detachment skew, and demanded application-level subtraction. That experiment (a simulated constructor replicating the exact op inventory - interleaved, attached, unique ids, per-widget closures - with variants each omitting one op family, fresh page per variant) CONFIRMED the attribution causally: warm marginals per 1000 widgets, Firefox vs Chromium - attributes 18 ms vs 2.4 ms, listeners 13 ms vs 1.2 ms, every other family under 9 vs 2.2. The two families are ~70% of Firefox's total and near-free on Chromium, and the simulation reproduces the user-observed ratio (44 vs 17.9 ms = 2.5x vs the real 2.6x). Which Gecko subsystem inside setAttribute pays (attr parsing, a11y bookkeeping, restyle hints) stays un-split - irrelevant to the conclusion.
  - Q: Is template + cloneNode(true) the fix to ship?
    - A: Logged as an idea only. It is the classic remedy for attribute-dense scaffolds (the platform's template element, lit-html, the js-framework-benchmark vanilla winner), and the subtraction numbers say the attribute family is the right target - but it bypasses the subclass create*El seams, doubles the truth (template vs constructor), and keys the cache on prefix x clearable; the listener family (13 ms on Firefox) would need shared/delegated handlers, a separate architecture change. At 34 us per widget while already fastest in every engine, neither is worth those costs today.

## review (external, ChatGPT API review)

Five findings relayed by the user; each verified against source before logging. Two halves were already ruled in the public-API round (single callback: QUALITY-36; live arrays: QUALITY-38) - the new substance is logged here.

- [x] **[MEDIUM-47] - an unnamed widget is representable, and nothing warns**
  - Symptom: `ariaLabel` / `ariaLabelledBy` / `labelEl` are all optional; with none given the combobox has no accessible name. The docs state the violation plainly (base.ts `ariaLabel` docstring; A11Y.md name-ladder table's "unnamed" column) but the default construction stays silent.
  - Impact: a library that leads with a11y ships unnamed widgets by default; the docs-only guard catches only doc readers.
  - Fix: `console.warn` ONCE PER PAGE when a name ladder resolves to unnamed (base.ts) - the house "reported in the console, never silent" style; the non-contiguous-group warn is precedent. A type-union forcing one source was considered and is worse: it breaks every minimal snippet and cannot express the `labelEl` rung.
  - Verified: aria-name.test.ts pins the warn on an unnamed widget, the once-per-page dedupe, and silence for each ladder rung; the two group-warn spy tests now name their widgets so their counts stay about the group warn.
  - Q: Why once per page, not once per instance?
    - A: The first cut warned per instance and the user pushed back; checking the blast radius proved them right - the benchmark page builds hundreds of unnamed widgets per run, so a per-instance warn floods the console and its cost lands inside the timed build loop. One nudge carries the rule; per-instance granularity buys nothing because the message cannot point at "which one" anyway. W3C's "no ARIA is better than bad ARIA" is about not INVENTING names (which the library still refuses to do); a combobox's accessible name itself is spec-required (Accessible Name Required: True), so warning on its absence is not ARIA overreach.
- [x] **[QUALITY-48] - onChange carries no source, and programmatic setters cannot update silently**
  - Symptom: `setChosenItem(s)` fires the same `onChange` as a user click; the callback receives values only - no user-vs-api flag, no silent option.
  - Impact: every wrapper must build echo suppression. The in-repo AngularJS wrapper's write-back gate IS that workaround, so the pain is proven, not hypothetical.
  - Fix: `onChange` gained an additive third argument `meta: LLSelectChangeMeta` (`{ source: 'user' | 'api' }`; the object shape leaves room to grow without breaking). The library attributes 'user' by wrapping exactly its pointer / keyboard entry points (option activation, tag remove, clear button, choose-all row) via a protected `withUserChangeSource`; everything else reports 'api'. A `silent` flag was rejected: two ways to mutate = two truths. Split `onChangeByUser` / `onChangeByApi` callbacks were rejected: most consumers want both (register-twice bugs), the pair cannot grow new sources, and it still cannot tell a wrapper's own echo from other api calls - the DOM's one-change-event + `isTrusted` shape is the precedent. The single-callback half stays ruled by QUALITY-36.
  - Verified: events.test.ts pins 'user' for all four built-in interactions and 'api' for `toggleItem` / `setChosenItems` / `chooseAll`.
- [x] **[QUALITY-49] - mutating setters demand mutable arrays: `setItems(items: T[])`, `setChosenItems(items: T[])`**
  - Symptom: an immutable-typed app (`readonly T[]` state) cannot pass its arrays without a cast, even though both setters defensively `slice()` anyway.
  - Fix: both parameters widened to `readonly T[]` (base.ts setItems, multiple.ts setChosenItems). Parameter-position widening is non-breaking. The returns-live-array half of the criticism stays ruled by QUALITY-38.
  - Verified: tsc strict across the repo; full suite green.
- [x] **[HIGH-50] - setChosenItems accepts duplicates while the contract promises set semantics**
  - Symptom: `compareFn`'s docstring says it is "Used for selection, dedup, ..." (base.ts), but `setChosenItems` stores `items.slice()` with no dedup: `[a, a]` is representable, `toggleItem(a)` then removes only the first, and count summaries / choose-all tallies skew.
  - Cause: the bulk `choose*` ops filter through `isChosen` and never create duplicates, so the gap is reachable only through `setChosenItems` (including framework model write-back) and was never exercised.
  - Fix: dedup in `setChosenItems` via `compareFn`, first occurrence wins, with the `defaultCompareFn` Set fast path; docstring states the set semantics. This is a contract bug fix, not a default flip - the dedup promise was already written.
  - Verified: multiple.test.ts pins identity and custom-`compareFn` dedup, and that one `toggleItem` fully unchooses after a duplicate-carrying assignment.
- [x] **[DOCUMENTATION-51] - "a replacement of native `<select>`" overclaims form association**
  - Symptom: README's headline says "aims to be a replacement of native HTML `<select>`", while the widget deliberately does not participate in form submission / reset / constraint validation / `<label for>` (all documented, with the hidden-input recipe and the `labelEl` click emulation).
  - Impact: the gaps are documented decisions, but the headline word "replacement" invites exactly this review's objection.
  - Fix: none for now - user ruling: the headline stays; revisit only as a positioning-copy pass. The form-integration section keeps carrying the tradeoffs.

## review (settings-freeze boundary)

- [x] **[QUALITY-46] - the settings-freeze exceptions read as arbitrary (why setPlaceholder but no setClearable?)**
  - Symptom: an external review read "frozen after the constructor" plus the exceptions (`setPlaceholder`, `setUiTranslationPack`, `setDisabled`) as an arbitrary boundary.
  - Cause: the rule existed in the code but was never stated. The premise also miscounts: `disabled` was never a setting (it is instance state behind `setDisabled()`, and its capability `focusableWhenDisabled` stays frozen), so the true exceptions are only the two text ones.
  - Fix: the boundary is now stated in DESIGN.md "Settings vs methods": state and copy move at runtime; capabilities are frozen. State = what a native `<select>` also mutates live (items, value, disabled). Copy = locale-owned text (pack, placeholder). Capability = decides structure / wiring / ARIA topology at construction.
  - Verified: docs only; check + link pass.
  - Q: Why does `placeholder` get a setter while `clearable` gets none?
    - A: `placeholder` is copy: a text-node swap, driven by i18n, a normal runtime event. `clearable` gates whether the clear-button element exists and is wired at all (base.ts, trigger build), so a `setClearable` is a mini-rebuild plus permanent API for a rare need - rebuilding the instance costs ~0.2 ms and covers it. The designed valve for genuinely-runtime capability needs is a function-valued setting evaluated per use (`filterable`'s predicate), and the always-built-hidden filter input is the promotion precedent.

## review (user-reported, pinch-zoom popup drift)

- [x] **[HIGH-45] - pinch-zoom drifts the popup left of the trigger (Linux, Firefox AND Chromium)**
  - Symptom: open the popup, two-finger pinch-zoom past some level: only llselect's popup shifts left and stops aligning with the trigger's x; the competitor libraries stay aligned. Reproduced by the user on Linux in both engines.
  - Cause: unverified. Prime suspect: `getVisibleViewport()` (positioning.ts) returns `visualViewport.width/height`, and the popup is `position: fixed`, i.e. LAYOUT-viewport coordinates. Under pinch zoom the visual viewport shrinks and pans (`offsetLeft/offsetTop`), so clamping x into `[0, vv.width]` without the vv offset drags the popup toward the left edge even though the trigger's client x is legitimate.
  - Impact: popup misalignment under pinch zoom; no data loss. jsdom cannot reproduce (no visual viewport); needs the real-browser pass.
  - Fix: landed (positioning.ts). The visible window is now a RECT in client coordinates: `getVisibleViewport()` returns `visualViewport`'s offsets alongside its size, and `computePosition` measures every edge against `[left, left + width]` x `[top, top + height]` (x clamp edges, spaceAbove/Below, maxHeight). With offsets 0 the math reduces exactly to the old formulas, so nothing changes outside pinch zoom; unit tests pin the offset cases and the zero-offset equivalence (positioning.test.ts).
  - Verified: by the user with the real pinch gesture on Linux (the benchmark playground): the popup keeps the trigger's x through zoom in both Firefox and Chromium. Unit tests pin the offset math and the zero-offset equivalence (positioning.test.ts); jsdom itself has no visual viewport.

## review (hideChosenRows performance audit)

Micro-bench after shipping `hideChosenRows` (jsdom, 10k items; numbers are rough but order-of-magnitude): flag off costs nothing measurable (`toggleItem` keeps its O(1) path, `getVisibleItems` adds one boolean check). Flag on with the default `compareFn` is fine: the Set-path subtraction is ~0.6 ms per call at 5000 chosen, and opening got FASTER (443 ms vs 659 ms) because hidden rows are never built. The by-design costs (full list rebuild per toggle while open; documented in the docstring) measured ~1x popup-open per click at 10k items.

- [x] **[PERFORMANCE-31] - hideChosenRows with a custom compareFn makes getVisibleItems O(visible x chosen), recomputed on every call**
  - Symptom: 10k items + 5000 chosen + custom `compareFn`: one `getVisibleItems()` call costs ~416 ms (jsdom micro-bench). Hot paths call it repeatedly: `renderPopupList` at least twice (its own pass + the choose-all row's re-query), keyboard nav once per key.
  - Cause: the subtraction falls back to per-item `isChosen` (a linear scan of `chosenItems`) whenever `compareFn` is not the identity default, and the result was never cached across calls.
  - Impact: only custom-`compareFn` apps with large lists AND large chosen sets. Default `compareFn` takes the Set path and stays ~0.6 ms at the same scale.
  - Fix: the subtraction result is cached on the instance (`visibleItemsCache` in multiple.ts). Validity is two reference checks (base list + chosen set) - complete, because every upstream layer and the chosen set replace their arrays on change. The choose-all row's second query now hits the cache, so no hook-signature change was needed.
  - Verified: micro-bench re-run on the rebuilt dist: 100x `getVisibleItems` at 10k items / 5000 chosen went from ~64 ms to ~0 ms with the default `compareFn`, and from ~42 s to ~0.66 s with a custom one (one real compute + 99 cache hits; absolute times vary run to run, within-run ratios are the signal). A reference-identity test pins the cache contract (hide-chosen-rows.test.ts).
  - Q: Why did this ship un-memoized?
    - A: Because the O(visible x chosen) bound was known and documented in the docstring, but the magnitude (hundreds of ms per single call at 10k/5k) and the call multiplicity per operation were only measured afterward. The lesson: for costs written into a docstring, measure the worst case before shipping, not after.

## review (public API surface)

External review of the public API surface, relayed by the user; every item converged and landed. Naming rulings live in naming-conventions.md (s2 verb boundary, s5 decisions log, s7a.9); behavior contracts in DESIGN.md / A11Y.md.

- [x] **[MEDIUM-33] - open/close/toggle had no public open-state reader**
  - Symptom: reading open state required DOM attributes (`data-state`) or mirroring `onOpen` / `onClose`; the flag was a protected field.
  - Fix: public `isOpened()` (base.ts); field renamed to private `opened`; the `createTriggerArrowContentElFn` ctx renamed `{ isOpen }` -> `{ isOpened }`, keyboard.ts's param following.
  - Verified: test/base.test.ts pins open/toggle/disabled-no-op; full suite green.
  - Q: Why `isOpened()`, not `isOpen()` matching the state adjective and industry habit?
    - A: s7a.9 (user ruling): with `open()` the verb on the same class, `isOpen` has a competing parse; `isOpened` reads one way only - idiom never outweighs ambiguity.
- [x] **[MEDIUM-34] - visible items and the filter query were unreachable for consumers**
  - Symptom: `getVisibleItems()` was protected and the query private; the in-repo ui-select emulation had to reconstruct `$select.search` by caching the query inside its `filterFn` (angularjs/llselect-ui-select.js) - the predicted wrapper-author wall, already hit.
  - Fix: `getVisibleItems()` widened to public (live read-only array, display order, full list while closed) and `getFilterQuery()` added (base.ts).
  - Verified: test/filterable.test.ts covers closed / filtered / reset-on-close for both.
- [x] **[QUALITY-35] - placeholder was frozen; a runtime change meant rebuilding the instance**
  - Fix: `setPlaceholder(placeholder: string | null)` - `null` reverts to `uiTranslationPack.triggerPlaceholder`; an explicit value keeps winning over later pack changes (base.ts `explicitPlaceholder`). DESIGN.md's "sole exception" wording became "two exceptions".
  - Verified: test/placeholder.test.ts (explicit-wins, null-reverts, multiple trigger).
  - Q: Why did `filterable` and `clearable` get no setter?
    - A: `filterable`'s predicate form re-evaluates on every open, so `filterable: () => flag` already is the runtime toggle; `clearable` changes are rare enough that rebuild-on-change is acceptable.
- [x] **[QUALITY-36] - single constructor-time event callbacks, no on()/off()**
  - Fix: none - by design. Settings-for-consumers + protected hooks-for-subclasses is the recorded two-channel model; both in-repo wrappers bind once at link time. README now shows the one-line closure recipe for swapping / fanning out handlers.
  - Q: Why no subscription API when the settings freeze makes handlers unswappable?
    - A: wrappers own multiplexing; an emitter adds teardown and ordering semantics for a need a one-line closure covers, and the low-level positioning (README) makes the wrapper the right layer.
- [x] **[QUALITY-37] - subclassSettings channel weakly typed for third-party extenders**
  - Fix (supersedes an earlier "none - by design" ruling): the settings type became each class's third generic param `S`, defaulted to its own settings type. `this.settings` is `S` (the `declare` re-types are gone) and each constructor's `subclassSettings` param accepts exactly `Omit<S, keyof OwnSettings>` - an extender's typo or missing field is now a compile error. One commented cast per constructor seam remains (base / single / multiple).
  - Verified: tsc strict + the full suite; the typed channel is exercised by the tree-select subclass example.
  - Q: Why was it first ruled "by design", and what was wrong with that call?
    - A: The ruling's two costs were real but overweighted. The surviving cast is confined and commented either way; and a DEFAULTED third param keeps every existing `LLSelect*<T>` mention valid, so nothing "grows a param". What flipped the call: a real third-party extender path (the tree-select example) made the `Record<string, unknown>` hole concrete - `satisfies` only ever protected in-repo call sites, never an extender's.
- [x] **[QUALITY-38] - getItems() returns the live internal array (plain-JS mutation footgun)**
  - Fix: none - deliberate, documented at the method; the same contract is stated on `getChosenItems` / `getUiTranslationPack` and now `getVisibleItems`.
  - Q: Why not a defensive copy or `Object.freeze`?
    - A: a copy is O(n) garbage per render (`renderTriggerContent` reads it every render); freeze only protects strict-mode JS callers and taxes every set. The docstring warning is the chosen mitigation.
- [x] **[QUALITY-39] - "all" bulk-op names do not show their enabled-only scope**
  - Symptom: `chooseAll` / `unchooseAll` / `toggleAll` act on enabled items only and preserve chosen-disabled entries; the names alone do not say so.
  - Fix: names kept (user ruling); the verb boundary is recorded in naming-conventions s2 (`choose*` / `toggle*` = UI-parity, enabled-only; `set*` / `clearSelection` = raw disabled-blind total channel) and each method docstring states its side. `toggleAllVisible()` added: the choose-all row's visible-subset action as a public method (multiple.ts; the row delegates to it), closing the "row semantics unreachable programmatically" gap.
  - Verified: test/select-all.test.ts covers filtered-subset toggling + outside-choice preservation.
  - Q: Why keep the names instead of renaming to `*AllEnabled`?
    - A: "select all" is universally scoped to actionable items; `toggleAllEnabled` misparses as toggling an enabled flag; and no sane-length name carries the preservation rule anyway - the docstring stays load-bearing.
- [x] **[QUALITY-40] - clear button wiped chosen-disabled items while unchooseAll preserves them**
  - Symptom: `unchooseAll`'s rationale said disabled items "cannot be toggled through the UI", yet the clear button (UI) removed them - looked inconsistent.
  - Fix: behavior kept - the user ruled native `<select>` as the standard, and native matches on every applicable point: a selected option that becomes disabled stays selected, programmatic mutation and clearing ignore disabled entirely, and form submission (the one nuance omitting disabled options) has no core analogue. The rationale wording was corrected (bulk ops mirror clicking) and A11Y.md "Clear button" records the total-wipe rule.
- [x] **[QUALITY-41] - setChosenItems equality is order-sensitive (claim: weird for a "set")**
  - Fix: none - correct as is. `chosenItems` is an ordered list by contract (insertion order; tags render in it), so `[a, b] -> [b, a]` must re-render and fire `onChange`; order-insensitive equality would leave stale tag order. "set" in the name is the verb, not the data structure.
- [x] **[MEDIUM-42] - grouping required pre-sorted data; non-contiguous keys rendered duplicate headers**
  - Fix: `gatherGroups: boolean` setting (default `true`): the display order is derived by the exported pure `gatherItemsByGroupKey` (grouping.ts) - groups gather at their key's first appearance, within-group order kept, `null`-key items in place, contiguous input returned as-is (zero copy). Lazy + memoized (invalidated by `setItems` / `rerender()`); the DATA order (`getItems()`) is never touched. `gatherGroups: false` = strict mode keeping the duplicate-header + `console.warn` behavior for callers who guarantee sorted data. DESIGN.md "Grouping semantic (gather + contiguous-run)".
  - Verified: test/gather.test.ts (pure fn + instance + laziness + filter interplay); test/optgroup.test.ts strict-mode warn.
  - Q: Why gather once then filter, not filter then re-gather per keystroke?
    - A: a group's position must not jump while typing - it stays pinned by its first appearance in the FULL list (exactly what pre-sorted data does), and one gather per items-change beats one per keystroke.
  - Q: Why not the nested `{ label, items }[]` input shape instead?
    - A: the recorded rejection stands (single write channel, identity-driven grouping, generic `GroupKey`, setting composability); the gather removes the footgun without a second data channel.
- [x] **[MEDIUM-43] - a subclass itemToGroupKey override did not drive grouping render**
  - Symptom: segmentation (and initially the gather) read the `itemToGroupKeyFn` setting directly; only the disabled layer called the protected method - an override could neither turn grouping on nor change rendered groups, contradicting DESIGN.md's customization model ("the library calls the method directly").
  - Fix: every key now resolves via `this.itemToGroupKey` (base.ts `computePopupSegments` + the gather), unconditionally. `rerender()` additionally invalidates the gather memo and re-runs an active filter, so overrides reading external state (and in-place item mutation) refresh through the documented `rerender()` path.
  - Verified: test/optgroup.test.ts subclass-seam tests (override enables grouping incl. gather; external-state flip + rerender).
  - Q: How does the library know grouping is on when the setting is null but the method is overridden?
    - A: it does not need to - rendering an all-`null`-key list is byte-identical to the old grouping-off early return, and the gather detects all-null as contiguous and returns `items` itself. "Grouping off" IS "all keys null"; the old setting-gate was an optimization, not a semantic.
- [x] **[DOCUMENTATION-44] - the settings-null vs value-undefined split looked accidental**
  - Fix: DESIGN.md "Settings vs methods" now records the value-side rationale: `undefined` keeps `null` usable as a real item value for `T` and matches JS's absent-return convention (`Array.prototype.find`).

## review (real-browser acceptance run)

- [x] **[MEDIUM-31] - filterable tags trigger accname duplicated chip labels ("Apple Remove Apple")**
  - Symptom: with `filterable: true` + `triggerDisplay: 'tags'`, the closed trigger's computed accessible name repeated every chip (label text + the remove button's `aria-label`): `Toppings Apple Remove Apple Banana Remove Banana`. Measured identically in Chromium and Firefox accessibility trees - the exact duplication [NEEDS-VERIFICATION-27] flagged as unverifiable in jsdom.
  - Cause: the filterable-mode `aria-labelledby` chain referenced the visible content span, and accname traversal descends into it, collecting every labelled control inside (the per-chip remove buttons).
  - Fix: the chain now references a hidden root-level plain-text value span kept in sync by `commitTriggerContentToDom` (tags: labels joined with `", "`; count summary / single label / placeholder analogous; explicit `plainTextValue` param for rich content). base.ts `triggerValueEl` / `syncFieldNameToDom`, single.ts / multiple.ts `renderTriggerContent`, contract in A11Y.md "Accessible name".
  - Verified: Chromium + Firefox aria snapshots now read `button "Toppings Apple, Banana"`; test/aria-name.test.ts pins the span, the chain, and the tags plain-text value; full suite green.
  - Q: Why a hidden sibling span, not `aria-label` on the content span or `aria-hidden` on the remove buttons?
    - A: `aria-label` on a `generic` span is ARIA-prohibited (validators flag it), and `aria-hidden` on the remove buttons would erase the chips' guaranteed AT name (A11Y.md "Tags") to fix a different channel. A root-level `hidden` span referenced by the chain is validator-clean, keeps `triggerEl.textContent` equal to the visible content (inside the trigger it doubled it), and accname includes referenced hidden nodes by design.

- [x] **[QUALITY-32] - ja / he count summaries were grammatically off (i18n review)**
  - Symptom: ja `triggerCountSummary` read as an action ("N件を選択" - "select N items"), not a state; he used plural `נבחרו` even for 1 chosen item and an unidiomatic bare "all N" with no noun.
  - Fix: ja appends `中` (state phrasing); he branches on count (singular `נבחר פריט אחד מתוך N`, all-case `נבחרו כל N הפריטים`). ar reviewed clean. i18n.ts.
  - Verified: npm test (i18n tests call the pack functions, no fixture drift); human native-speaker sign-off remains tracked in TODO.md.

## review (release-readiness follow-up)

- [x] **[HIGH-26] - opening against an off-screen trigger leaked listeners re-entrantly**
  - Symptom: `open()` with the trigger already scrolled out of view / clipped reported the control closed yet left the positioner (scroll / resize / ResizeObserver) plus outside-click / focusout handlers live; `destroy()` could not recover them.
  - Cause: the positioner's initial synchronous `reposition(true)` fired `onHide -> close()` before `this.positioner` was assigned and before the listeners were attached, then `open()` continued past the aborted close.
  - Fix: `open()` refuses up front when `isAnchorHidden(triggerEl)` (new exported predicate reusing the positioner's own layout-viewport test), mirroring the disabled guard, so the positioner is never built for a hidden anchor. base.ts `open`, positioning.ts `isAnchorHidden`.
  - Verified: test/positioning.test.ts (no-op open, no callbacks, later resize does not mutate the hidden popup, `destroy()` clean).

- [x] **[NEEDS-VERIFICATION-27] - release acceptance gates are not signed off**
  - Impact: the code / doc fixes for accessible names, filterable Tab order, and CSS retention were in and unit-covered, but their real-browser / screen-reader / real-bundler acceptance was still open, so the original release blockers were only conditionally closed.
  - Fix: the automatable layer of every gate ran in real Chromium + Firefox (Playwright, real layout / native Tab / accessibility trees): accessible names in all modes including `clearable` and tags (which surfaced and fixed [MEDIUM-31]), the full Tab / Shift+Tab and one-tab-stop contract, RTL mirroring, placement stickiness, Firefox no-jolt + scrolled-to-chosen, clipped-trigger no-op open + clean destroy, no-results / tri-state, both benchmark pages against the pinned CDN builds, and CSS retention verified against the packed tarball in vite AND webpack production builds. The remaining human-only residue is narrowed in TODO.md: AT announcement pass, headed scrollbar drag, i18n sign-off.
  - Verified: session Playwright runners (a11y / focus / visual / angularjs / benchmark) all green in both engines; bundler outputs contain the theme CSS.

- [x] **[DOCUMENTATION-28] - generated API docstrings described the trigger as always a combobox**
  - Symptom: `triggerClass` and `triggerEl` docstrings (emitted into `dist/base.d.ts`, so consumer-facing) gave a fixed `role="combobox"` and put `aria-activedescendant` on the trigger unconditionally.
  - Fix: both now state the role per search mode (combobox inactive / button while a filterable popup is open) and where `aria-activedescendant` lives. base.ts `triggerClass`, `triggerEl`.

- [x] **[QUALITY-29] - the mechanical check covers only part of its policy**
  - Impact: `scripts/check.mjs` caught punctuation and relative links, but its collectors were non-recursive, skipped all of `test/`, and did not enforce the explicit-brace or unexplained-`any` rules.
  - Fix: file discovery is recursive; `test/` is punctuation-scanned with string literals AST-masked (fixture unicode stays exempt with no pragma invention); the brace and unexplained-`any` rules run as AST checks. scripts/check.mjs.
  - Verified: deliberate violations (uncommented `any`, braceless `if`, braceless `for`) are each flagged; CJK punctuation inside a test string literal is not; suite and check green.
  - Q: Why not the proposed ESLint / TS-aware rule?
    - A: The `typescript` package is already a devDependency and its parser answers both rules in ~40 lines; an ESLint stack would add a dependency tree and config surface to express the same two checks. The "is that dependency worth it" question dissolves - no new dependency was needed.

- [x] **[PERFORMANCE-30] - natural-height reconstruction assumed no author clamp on the inner list**
  - Symptom: the height reconstruction adds back all of `popupList.scrollHeight - clientHeight`; a consumer `max-height` on `.llselect-popup-list` would be read as extra natural height and could pick a placement side as if the popup were taller than it can render.
  - Fix: documented the invariant - the positioner owns the popup `maxHeight`; themes / consumers must not independently height-clamp the inner list. positioning.ts `PositionerOptions.innerScrollEl`.
  - Q: Why document the invariant instead of subtracting an author clamp?
    - A: Because the positioner cannot tell its own clamp-driven overflow from a consumer's without measuring against a known baseline, and shipped themes already honor it; a real-browser case is the way to revisit if a consumer actually hits it.

## review (documentation and release readiness)

- [x] **[HIGH-1] - trigger / listbox / filter input had no author-supplied accessible name**
  - Cause: no `ariaLabel` / `ariaLabelledBy` setting existed (violates WAI-ARIA 1.2).
  - Fix: field-name settings wired per mode. base.ts `syncFieldNameToDom`, src/i18n/en.ts, test/aria-name.test.ts. Screen-reader acceptance: [NEEDS-VERIFICATION-27].
- [x] **[HIGH-2] - filterable open-state focus contract did not match the code**
  - Cause: the trigger kept `tabindex="0"` while the filter input held focus, so Shift+Tab landed back on it with the popup open.
  - Fix: trigger leaves the tab order for the filterable open cycle. base.ts `syncTriggerTabindex`. Native Tab acceptance: [NEEDS-VERIFICATION-27].
- [x] **[MEDIUM-3] - `sideEffects: false` let bundlers drop the theme CSS import**
  - Fix: `sideEffects: ["**/*.css"]`. package.json. Bundler acceptance: [NEEDS-VERIFICATION-27].
- [x] **[DOCUMENTATION-4] - popup width policy section contradicted itself**
  - Fix: `match-trigger` (default) and `fit-content` described separately; dropped the "always = trigger width" claims. DESIGN.md "Popup width policy".
- [x] **[DOCUMENTATION-5] - ARIA element table collapsed the two trigger modes**
  - Fix: one row per mode (combobox / button) with the open-cycle tabindex. A11Y.md "Elements, roles, ARIA".
- [x] **[DOCUMENTATION-6] - the non-filterable open-state keyboard table was missing**
  - Fix: added it. A11Y.md "Keyboard - open, search inactive".
- [x] **[DOCUMENTATION-7] - close-time focus wording was too broad**
  - Fix: separated keyboard cancel from pointer / focusout dismissal to match `close()`'s `shouldReturnFocus`. A11Y.md "Focus".
- [x] **[DOCUMENTATION-8] - optgroup research carried an obsolete "not implemented" status**
  - Fix: archived with a superseded banner. docs/archive/optgroup-research.md.
- [x] **[DOCUMENTATION-9] - item-rendering brainstorm described resolved questions as open**
  - Fix: archived with a superseded banner mapping each question to what shipped. docs/archive/item-rendering-brainstorm.md.
- [x] **[DOCUMENTATION-10] - TODO.md was mostly completed history**
  - Fix: completed roadmap moved to docs/archive/roadmap-v0.0.1.md; TODO.md holds open work only.
- [x] **[DOCUMENTATION-11] - hard-coded test counts drift out of date**
  - Symptom: `219` / `182` test counts in naming-conventions.md and render-responsibilities.md.
  - Fix: replaced with `npm test passes`. naming-conventions.md, render-responsibilities.md.
  - Q: Why not dismiss this as a false positive (no such counts exist)?
    - A: Because they DID exist - the earlier scan matched only `test` / `subtest` adjacent to a digit and missed the `<n> tests` prose form, so the counts sat unnoticed in two docs. Grep the surface form the doc actually uses, not the one you expect.
- [x] **[DOCUMENTATION-12] - release-candidate review bookkeeping was inconsistent**
  - Fix: corrected the fixed-defect count (four - the fourth being the isItemEffectivelyDisabled rename) and the Container-Content pair count (nine); archived. docs/archive/review-release-candidate.md.
- [x] **[DOCUMENTATION-13] - CLAUDE.md claimed to be "style only" while defining behavior**
  - Fix: authority split - CLAUDE.md = agent behavior + style, DESIGN.md = API, A11Y.md = keyboard / focus / ARIA. CLAUDE.md.
- [x] **[DOCUMENTATION-14] - exact project verification commands were undocumented**
  - Fix: added the test / build / check / pack list + the real-browser caveat. CLAUDE.md.
- [x] **[DOCUMENTATION-15] - generated / abandoned files had no rule**
  - Fix: documented `dist/` / `.build/` (generated) and `src/draft.ts` (abandoned) + the API-change move-together list. CLAUDE.md.
- [x] **[DOCUMENTATION-16] - the language / character exception was narrower than legitimate use**
  - Fix: exception now covers unicode-behavior test fixtures and intentional visual glyphs, not just i18n strings. CLAUDE.md.
- [x] **[DOCUMENTATION-17] - the browser target "roughly the last 5 years" drifted with the calendar**
  - Fix: fixed support floor (Firefox 78+, Chrome/Edge 87+, Safari 14.1+) derived from the APIs actually used. CLAUDE.md.
- [x] **[QUALITY-18] - enforceable style rules were not automated**
  - Fix: `npm run check` (zero-dep: ASCII punctuation + doc links), wired into `prepublishOnly`. scripts/check.mjs. Broader coverage: [QUALITY-29].
- [x] **[DOCUMENTATION-19] - README needed copy-editing and a single-H1 hierarchy**
  - Fix: full copy-edit; one H1 with H2/H3. README.md.
- [x] **[DOCUMENTATION-20] - native form limitations were unstated**
  - Fix: "What llselect deliberately does NOT do" section with a form-sync example. README.md.
- [x] **[DOCUMENTATION-21] - the sanitizer warning was broader than the real risk**
  - Fix: narrowed - item strings go through `textContent`; the risk is only in app-side `innerHTML` in custom render callbacks. README.md.
- [x] **[DOCUMENTATION-22] - unmeasured performance claims ("blazing fast", "beats vdom")**
  - Fix: replaced with a concrete implementation description. README.md, DESIGN.md.
  - Q: Why revisit after "blazing fast" was already replaced?
    - A: Because the replacement ("O(1) DOM work" for a single-item selection) was itself too broad - `toggleItem` also re-renders the trigger, which in `tags` mode rebuilds one chip per chosen item. Only the popup-list ROW replacement is O(1); the claim now says exactly that. README.md, multiple.ts.
- [x] **[DOCUMENTATION-23] - consumer docs were unreachable from the npm tarball**
  - Fix: stable repository links from README (docs/ is not packed). README.md.
- [x] **[DOCUMENTATION-24] - the LLM-disclosure heading's tone was flagged**
  - Fix: none - kept verbatim.
  - Q: Why keep the confrontational `fucking idiot vibe coder` heading?
    - A: Because it is the author's voice and an explicit editorial choice, not a correctness / transparency / release-readiness defect. Only grammar around it was fixed.
- [x] **[DOCUMENTATION-25] - there was no compact consumer API overview**
  - Fix: capabilities table with links to the contract docs. README.md.
