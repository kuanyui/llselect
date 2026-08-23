# FIXME - review-findings log

Findings from reviews of llselect, newest round on top. Format spec (severity words, `[SEVERITY-N]` ids, Symptom/Cause/Fix/Verified labels, cross-round Q&A) lives in `../../CLAUDE.md` "Review-findings log". `N` is a stable id in creation order, not a rank; open items are `[ ]`, resolved `[x]`. No dates here - git log owns the when.

## review (external, ChatGPT API review)

Five findings relayed by the user; each verified against source before logging. Two halves were already ruled in the public-API round (single callback: QUALITY-36; live arrays: QUALITY-38) - the new substance is logged here.

- [ ] **[MEDIUM-47] - an unnamed widget is representable, and nothing warns**
  - Symptom: `ariaLabel` / `ariaLabelledBy` / `labelEl` are all optional; with none given the combobox has no accessible name. The docs state the violation plainly (base.ts `ariaLabel` docstring; A11Y.md name-ladder table's "unnamed" column) but the default construction stays silent.
  - Impact: a library that leads with a11y ships unnamed widgets by default; the docs-only guard catches only doc readers.
  - Fix (proposed): `console.warn` once at construction when the name ladder resolves to unnamed - matches the house "reported in the console, never silent" style (the non-contiguous-group warn is precedent). A type-union forcing one source was considered and is worse: it breaks every minimal snippet and cannot express the `labelEl` rung.
- [ ] **[QUALITY-48] - onChange carries no source, and programmatic setters cannot update silently**
  - Symptom: `setChosenItem(s)` fires the same `onChange` as a user click; the callback receives values only - no user-vs-api flag, no silent option.
  - Impact: every wrapper must build echo suppression. The in-repo AngularJS wrapper's write-back gate IS that workaround, so the pain is proven, not hypothetical.
  - Fix (proposed): additive third argument to `onChange` (e.g. a source of `'user' | 'api'`), which is non-breaking; a `silent` flag was the weaker option (two ways to mutate = two truths). The single-callback half of the criticism stays ruled by QUALITY-36 (closure fan-out; DOM CustomEvents are the recorded revisit path).
- [ ] **[QUALITY-49] - mutating setters demand mutable arrays: `setItems(items: T[])`, `setChosenItems(items: T[])`**
  - Symptom: an immutable-typed app (`readonly T[]` state) cannot pass its arrays without a cast, even though both setters defensively `slice()` anyway.
  - Fix (proposed): widen both parameters to `readonly T[]`. Parameter-position widening is non-breaking. The returns-live-array half of the criticism stays ruled by QUALITY-38.
- [ ] **[HIGH-50] - setChosenItems accepts duplicates while the contract promises set semantics**
  - Symptom: `compareFn`'s docstring says it is "Used for selection, dedup, ..." (base.ts), but `setChosenItems` stores `items.slice()` with no dedup: `[a, a]` is representable, `toggleItem(a)` then removes only the first, and count summaries / choose-all tallies skew.
  - Cause: the bulk `choose*` ops filter through `isChosen` and never create duplicates, so the gap is reachable only through `setChosenItems` (including framework model write-back) and was never exercised.
  - Fix (proposed): dedup in `setChosenItems` via `compareFn`, first occurrence wins, with the `defaultCompareFn` Set fast path; docstring + test follow. This is a contract bug, not a default flip - the dedup promise is already written.
- [ ] **[DOCUMENTATION-51] - "a replacement of native `<select>`" overclaims form association**
  - Symptom: README's headline says "aims to be a replacement of native HTML `<select>`", while the widget deliberately does not participate in form submission / reset / constraint validation / `<label for>` (all documented, with the hidden-input recipe and the `labelEl` click emulation).
  - Impact: the gaps are documented decisions, but the headline word "replacement" invites exactly this review's objection.
  - Fix (proposed): positioning copy is the user's call - e.g. "a replacement for `<select>`'s UI" plus a pointer to the form-integration recipe. No behavior change on the table.

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
