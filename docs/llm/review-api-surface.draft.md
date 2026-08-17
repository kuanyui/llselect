# Review analysis: public API surface (working draft)

Source: an external review of the public API surface (another session, relayed by the user). This file is the claim-by-claim verification against the code, for discussion. Once each item converges, accepted findings move to `docs/llm/FIXME.md` under a `## review (public API surface)` round (next free id: 33) and this file is deleted. Nothing here is implemented yet.

Verdict vocabulary: "confirmed gap" = the fact holds and I agree something is missing; "as designed" = the fact holds but the behavior is deliberate and recorded; "judgement rejected" = the fact holds but the reviewer's conclusion from it does not.

| # | Claim (short) | Fact check | Verdict |
|---|---|---|---|
| 1 | no public open-state reader | accurate | confirmed gap |
| 2 | visible items / filter query unreachable | accurate (one nuance) | confirmed gap |
| 3 | single constructor-time callbacks, no `on()` | accurate | as designed; recommend keep |
| 4 | placeholder / filterable / clearable need a rebuild | partly wrong | `filterable` already has a runtime path; `setPlaceholder`: DECIDED, add |
| 5 | `subclassSettings` channel is weakly typed | accurate | as designed; recommend keep + record why |
| 6 | `getItems()` returns the live internal array | accurate | as designed (documented tradeoff) |
| 7 | `toggleAll` vs choose-all row scope differs | accurate | as designed + documented; one cheap doc fix; NEW: "all = enabled only" naming question opened |
| 8 | `setChosenItems` equality is order-sensitive | accurate | judgement rejected (order is part of the contract) |
| 9 | grouping needs pre-sorted data | accurate | REOPENED by user - gather option proposed (was: as designed) |
| 10 | settings `null` vs single empty `undefined` | accurate | as designed; rationale only half recorded |

## 1. Open state has no public reader - confirmed gap

Facts: `open()` / `close()` / `toggle()` are public; the open flag is the protected field `isOpen` (`src/base.ts:583`); no public reader exists anywhere (grepped src, angularjs, demo). Workarounds available to a consumer today: read `triggerEl.getAttribute('data-state')` or `aria-expanded`, check `rootEl` for `classIdMap.openClass`, or mirror the state via the `onOpen` / `onClose` settings.

Why it is a gap and not a style choice: the library already has a state-via-method pattern for exactly this shape - `setDisabled` pairs with `isDisabled()` (`src/base.ts:1145`), and DESIGN.md "Disabled (Phase 9)" names that pattern. Open state is the same kind of mutable state with the reader missing; DOM attributes are styling hooks, not the API.

Wrinkle (clarified in discussion - there are never TWO `isOpen` members): what exists today is one protected FIELD `isOpen` (a boolean, data, not a method). The proposal adds one public METHOD `isOpen()`. A JS class field and a method share one member namespace (the instance field would shadow the prototype method at runtime; TS rejects it as a duplicate identifier), so the field must be renamed first. After the rename there is exactly ONE reader - the public method - and subclasses read through it too; the renamed field goes private (no in-repo subclass reads it; only base.ts itself does).

Shape DECIDED (user): a method, following the `disabled` pattern (private field + public method reader). The accessor option was rejected for the reason the user named: at a call site `sel.isOpen` cannot be told apart from a forgotten `()` or a plain property, and it would sit next to `isDisabled()` as a second shape for the same pattern. Extender-facing consequence to release-note: the protected `isOpen` FIELD disappears; extenders read through the public method instead.

NAME DECIDED (user ruling, recorded as naming-conventions.md s7a.9): `public isOpened(): boolean` + private field `opened`. The principle: when both forms are grammatical, pick the one with only ONE reading; idiom carries no weight against ambiguity. "open" is verb AND adjective - and the verb sense is already taken by the `open()` action - so `isOpen` invites the wrong parse; "opened" reads one way only.

Cascade (included in the ruling): the `createTriggerArrowContentElFn` ctx becomes `{ isOpened: boolean }`, with the protected `createTriggerArrowContentEl(state)` signature and the docstrings that mention `isOpen` (`src/base.ts:109`, `114`, `1280`, `1284`, `1295`). All occurrences are in base.ts; README / demo / angularjs are clean (grepped). NOT cascaded: DOM/CSS state vocabulary (`data-state="open"`, `.llselect-open` / `openClass`) - attribute values and state classes have no verb namespace to collide with, and renaming them breaks themes.

- Q: Why `isOpened()`, not `isOpen()` matching English's state adjective and the industry convention?
  - A: s7a.9 - `isOpen` has a competing verb parse (the `open()` action exists on the same class); `isOpened` has exactly one parse. Ambiguity-avoidance outranks idiom in this project. The "opened is the event word (`onOpened`)" objection did not survive: `on*` marks events by itself, so no confusion arises.

State-bag idea - DROPPED by the user. Correction for the record: the user meant an INTERNAL-only state object, so the dual-write objection below aimed at the wrong target (it only applies to a public bag). Against an internal-only bag the real cost is just churn (every field reference rewritten, protected/private granularity redesigned) for cosmetic gain. Original analysis kept for the public-bag case:

- A public `state` object is a second WRITE channel (`sel.state.open = true` bypassing `open()`'s listeners/positioner/ARIA) - the exact dual-write pattern DESIGN.md line 31 rejects settings for; `readonly` typing protects TS callers only (the `getItems` caveat, widened to all state).
- Visibility granularity dies: state fields deliberately span private (`disabled`, `query`, `filteredItems`) and protected (`items`, `focusedIndex` - extender API). One bag forces one visibility for all of them.
- It would be a second READ convention next to the existing method readers (`getItems`, `getChosenItems`, `isDisabled`); migrating those onto the bag is a full API break for cosmetic gain, keeping both is two ways to read the same facts.
- The ambiguity it solves does not exist on today's public surface: everything readable is already a method (plus readonly els / `classIdMap` / `version`), so `isOpen()` extends the existing uniformity.

Event-API clarification (user asked why open state got no events): it DID - the `onOpen` / `onClose` settings (`src/base.ts:315`, `321`) fire right after open / close completes, no-op calls do not fire them, and they are additive with the protected `onOpened` / `onClosed` hooks ("setting for consumers, hook for subclasses"). What was missing is only the synchronous reader, and no record shows that omission was a decision - it reads as plain oversight. (A general `on()` subscription system is the separate Decisions item.)

## 2. Visible items and filter query have no public reader - confirmed gap, with a nuance

Facts: `getVisibleItems()` is protected (`src/base.ts:2032`); the query field is private (`src/base.ts:644`). Neither is publicly reachable.

Nuance the review missed: the query IS observable without touching the DOM - the `filterFn(item, query)` setting receives it per call. The in-repo ui-select emulation reconstructs `$select.search` exactly that way, caching the last seen query inside its `filterFn` (`angularjs/llselect-ui-select.js:202-208`). So the reviewer's prediction ("the wrapper author hits this first") already happened in this repo, and the workaround was a caching side channel inside a match predicate - it works, but it is the workaround of a missing getter.

Semantics to document if exposed (not to fix): `filteredItems` is cleared on close (`src/base.ts:967`), so the visible list equals the full item list while the popup is closed; the query is `''` while closed or while the filter is inactive.

Proposal: widen `getVisibleItems()` to public - the docstring is already written for consumers (live array, read-only contract, same as `getItems`) and no override exists to conflict. Separately decide whether a query reader is wanted (see Decisions).

## 3. Single constructor-time callbacks, no on()/off() - as designed; recommend keep

Facts: `onChange` / `onOpen` / `onClose` are single nullable settings resolved at construction (`src/base.ts:315-321`, `src/single.ts:33`, `src/multiple.ts:52`); settings are frozen, so a handler cannot be swapped later; there is no subscription API.

Assessment: consistent with the recorded positioning and layering. README line 1/7/340 sells the library as low-level and meant to be wrapped; DESIGN.md "Settings vs methods" freezes settings deliberately; extenders get a second, additive channel (protected `onOpened` / `onClosed` / `onChosenChanged` hooks - "setting for consumers, hook for subclasses; both run", `src/base.ts:1176-1193`). Both in-repo wrappers bind once at link time and never need to swap or multiplex (`angularjs/llselect-angularjs.js`, `angularjs/llselect-ui-select.js`). A consumer who really wants a swappable or multi-subscriber handler writes one line: `onChange: (a, b) => current?.(a, b)` over their own mutable reference. An `on()`/`off()` emitter would add teardown semantics, ordering questions, and doc surface that wrappers already own.

Proposal: no API change. Optionally one README sentence showing the closure recipe, to make the freeze's escape hatch explicit.

## 4. Frozen-settings exceptions - partly wrong; only `placeholder` is worth discussing

The freeze line itself is principled and recorded: settings are config (frozen by convention), state goes through methods, and the two runtime mutators are documented exceptions - `setUiTranslationPack` (DESIGN.md "Texts (i18n)": "A deliberate, narrow exception... in the same spirit as setDisabled") and `setDisabled`, which DESIGN.md line 181 classifies as state-not-setting in the first place. `items` / `chosen` are state by design, not exceptions.

Per knob:

- `filterable` - the claim "changing it means rebuilding" is wrong in practice. The predicate form is re-evaluated against the current items on every `open()` (`src/base.ts:136-146`, `810-813`, `889`), so `filterable: () => myFlag` is a runtime toggle today, no rebuild; it applies on the next open, never mid-open (deliberate: the focus host must not be yanked while the popup is up). The filter input is even pre-built and kept `hidden` for exactly this (`src/base.ts:2000-2002`). Worth one docstring sentence naming this use, since the docstring currently only shows the items-count use.
- `placeholder` - genuinely frozen when passed explicitly. The library already mutates `settings.placeholder` internally when the pack changes (`src/base.ts:1097`), so a `setPlaceholder` rides existing machinery. DECIDED (user): add it, immediate effect. Notes from discussion: the visible change only exists while the selection is empty (single renders the placeholder only when `chosenItem` is `undefined`, `src/single.ts:128`; multiple only at 0 chosen, `src/multiple.ts:286-287`), but the implementation re-renders the trigger unconditionally - it is cheap, needs no emptiness branch, and also refreshes the hidden accessible-value mirror (`triggerValueEl`, whose content IS the placeholder while empty). `explicitPlaceholder` (`src/base.ts:569`) loses `readonly` and is updated by the setter, so the constructor's resolution rule (explicit value wins over `uiTranslationPack.triggerPlaceholder`) keeps holding across later `setUiTranslationPack` calls. `null` = revert to the pack default, mirroring "unset" at construction (assumed from this draft, not separately confirmed - object if wrong).
- `clearable` - genuinely frozen (the clear button is only built in the constructor path, `src/base.ts:1948`). A runtime toggle is rare enough that rebuild-on-change looks acceptable. Recommend leave frozen.

## 5. subclassSettings channel typing - as designed; recommend keep and record why

Facts: exactly as claimed - `subclassSettings?: Record<string, unknown>` (`src/base.ts:664`), merged with the sole commented `as` cast (`src/base.ts:711-714`), subclasses re-type with `declare` (`src/single.ts:76`, `src/multiple.ts:167`) and `satisfies`-check their payload at the call site (`src/single.ts:87`, `src/multiple.ts:183`). DESIGN.md line 33 records this as the chosen pattern.

Assessment: the cast is confined to one commented site and the in-repo payloads are compile-checked. The real weakness is third-party extenders: their `subclassSettings` argument is unchecked unless they copy the `satisfies` discipline. The typed alternative - a third generic param `S extends LLSelectBaseSettings<T, GK>` on the base, with `subclassSettings?: Omit<S, keyof LLSelectBaseSettings<T, GK>>` and `settings: S` - would type the param and delete the `declare`, but still needs one internal cast (TS cannot prove base-resolved + `Omit<S, ...>` reassembles `S` for an arbitrary `S`) and grows a generic param on every mention of the base type.

Proposal: keep. When this round lands in FIXME.md, record the tradeoff as a Q&A so the next reviewer does not re-derive it. Revisit only on real extender feedback.

## 6. getItems() returns the live internal array - as designed, documented

Facts: `src/base.ts:1056-1067`, with an explicit docstring ("the LIVE internal array, typed read-only... plain-JS callers must treat it as frozen"). The same deliberate contract is stated on `getChosenItems` (`src/multiple.ts:192`) and `getUiTranslationPack` (`src/base.ts:1077`).

Assessment: a defensive copy would cost O(n) allocation per call on render paths (`renderTriggerContent` calls `getItems()` on every trigger render - `src/single.ts:129`, `src/multiple.ts:289`). `Object.freeze` would be safe today (internal code replaces these arrays wholesale, never mutates in place) but adds per-set cost and only protects strict-mode JS callers. The docstring warning is the chosen mitigation and it is in place.

Proposal: no change.

## 7. toggleAll (whole list) vs choose-all row (visible subset) - as designed and documented; one cheap doc fix

Facts: `chooseAll` / `unchooseAll` / `toggleAll` act on the full item list (`src/multiple.ts:249-270`); the choose-all row acts on the visible enabled subset (`src/multiple.ts:434`, `493-503`). The divergence is stated verbatim in the `chooseAllRow` setting docstring ("the public `chooseAll` / `unchooseAll` / `toggleAll` keep their whole-list semantics", `src/multiple.ts:108-111`) and in A11Y.md "Choose-all (tri-state)".

The prior decisions, inventoried (relayed to the user in discussion):

- Scope split - `docs/llm/A11Y.md:113`, marked "RULED, was an open question": the row acts on the VISIBLE enabled subset; choices outside it (filtered-out or disabled) are preserved either way; the three public methods keep whole-list semantics. Rationale: the programmatic API must not depend on transient UI state (whether a filter query happens to be typed), while the in-popup row follows what the user is looking at. The row's tri-state is computed over that same subset (`src/multiple.ts:434-437`).
- Bulk ops and disabled items - `docs/llm/A11Y.md:121` + the method docstrings: bulk actions act on enabled items only; an already-chosen disabled item is preserved by `chooseAll` AND by `unchooseAll` (the UI cannot toggle it, so bulk ops must not either), and an item that becomes disabled after being chosen stays chosen.
- Row default look - DESIGN.md "Choose-all default: plain counting text (no indicator)", marked RULED with the full three-attempt history (theme glyph, core SVG, text glyph - each removed) so it is not re-litigated.

Assessment: each semantic is individually right - the programmatic API must not depend on transient UI filter state, and an in-popup row following the filtered view is the established behavior of the pattern. The residual hazard is discoverability from the METHOD side: someone reading only `toggleAll()`'s docstring ("Toggle between 'all enabled chosen' and 'none chosen'") never learns the row behaves differently, and there is no public method with the row's subset semantics (it lives in the protected `onLeadingRowActivated`).

Proposal: add one cross-reference sentence to the `toggleAll` (and/or `chooseAll` / `unchooseAll`) docstring naming the divergence. Whether to expose a public visible-subset method: defer until a consumer actually asks (see Decisions).

NEW naming question (user): "All" in `chooseAll` / `unchooseAll` / `toggleAll` does not include disabled items - the methods act on enabled items only and preserve already-chosen disabled entries - and the names do not show that, which strains the explicit-naming principle. Analysis:

- Prior art on the family name: the `choose*` vocabulary is itself a user ruling (naming-conventions.md s7c: `selectAllRow` family -> `chooseAllRow`; "select all" survives only as quoted industry prose). No existing ruling covers the "all = enabled only" scope, so this is a genuinely new decision.
- For keeping the names: "select all" is universally scoped to actionable items (native `<select multiple>` Ctrl+A, mail clients, file managers with locked entries - none includes non-actionable rows), so "all" already means "all eligible" in this domain; each docstring states the exact semantics in its FIRST sentence (`src/multiple.ts:244`, `254`, `263`); and no name of sane length can carry the full rule anyway - `AllEnabled` still would not say "already-chosen disabled preserved", so the docstring stays load-bearing regardless.
- For renaming: this project prefers explicit over short (CLAUDE.md), and the user was genuinely surprised by the semantics - evidence the names under-communicate. Candidates: `chooseAllEnabled()` / `unchooseAllEnabled()` / `toggleAllEnabled()`. Specific hazard: `toggleAllEnabled` misparses as "toggle the enabled flag of all items". Cascade: the `chooseAllRow` setting + `chooseAllRowText` pack key + A11Y.md wording would need a consistency pass under any rename.
- Recommendation: keep the names; record a naming ruling ("`all` in bulk-selection names = the whole ELIGIBLE (enabled) set; the preservation rule lives in the docstring") in naming-conventions.md so it is never re-derived. User decides.

Follow-up question (user): do operations exist that DO affect disabled items? YES - the inventory:

- `setChosenItems()` / `setChosenItem()`: raw assignment, no disabled check anywhere (`src/multiple.ts:202-209`, `src/single.ts:107-117`). They can choose a disabled item and can drop an already-chosen disabled item.
- The clear (x) button (`clearable`): routes through `clearSelection` -> `setChosenItems([])` / `setChosenItem(undefined)` (`src/multiple.ts:419-421`, `src/single.ts:168-170`) - wipes EVERYTHING, chosen-disabled included.
- `chooseAll` / `unchooseAll` / `toggleAll` and the choose-all row: enabled-only, preserve chosen-disabled.

So the existing boundary is carried by the VERB family: `set*` / `clear` = total assignment (disabled-blind); `choose*` / `unchoose*` / `toggle*` = UI-parity ops (enabled-only). Proposed ruling records exactly this split; each side's docstring gains one explicit sentence.

Inconsistency found while answering: `unchooseAll`'s stated rationale is "they cannot be toggled through the UI" (`src/multiple.ts:254-256`), but the clear BUTTON is UI and does remove chosen-disabled items. RESOLVED by the native standard below: keep the full wipe; fix only the rationale wording.

Native `<select>` standard (user ruled: implement to this standard; behavior verified):

- A selected option that becomes disabled STAYS selected; `select.value` keeps reporting it. Disabled only blocks the user from re-picking it through the dropdown UI.
- Programmatic mutation ignores disabled entirely: `value = ...`, `option.selected = ...`, `selectedIndex = ...` all act on disabled options; `selectedIndex = -1` / `value = ''` (the closest native things to "clear") wipe everything, disabled included.
- One nuance with no llselect analogue: form submission omits a selected-but-disabled option's entry; core has no `<form>` integration (DESIGN.md), so nothing to mirror.

Conclusion: llselect already matches native on every applicable point - retention on disable (A11Y.md:121), disabled-blind raw setters, total clear. So the clear button's full wipe stays; the only change is the `unchooseAll` rationale sentence (it says "cannot be toggled through the UI"; keep the claim scoped to toggling, or reword to name the real rule: bulk UI-parity ops mirror clicking, and clicking cannot reach disabled items).

## 8. setChosenItems order-sensitive equality - judgement rejected

Facts: accurate - `src/multiple.ts:202-209` with `arraysEqual` (`554-561`); the order-sensitivity is documented at the setter ("element-wise (order-sensitive)", `src/multiple.ts:198-199`) and at `onChange` (`src/multiple.ts:47-48`).

Why the "weird for something called set" judgement fails: `chosenItems` is an ordered list by contract - "in insertion order" (`src/multiple.ts:158`) - and the order is observable output: tag chips render in that order (`src/multiple.ts:312`) and `onChange` consumers receive the array. Order-INsensitive equality would treat `[a, b] -> [b, a]` as no-change and skip both the re-render and `onChange`, leaving the visible tag order stale - a bug. "set" in the name is the verb (setter), not the Set data structure; the equality follows the value's actual semantics. The cost (a caller rebuilding an equivalent selection in a different order triggers a re-render + `onChange`) is correct behavior for an ordered value.

Proposal: no change. Keep this reasoning as a Q&A when the round lands in FIXME.md.

## 9. Grouping requires pre-sorted data - REOPENED (user: too easy to get wrong)

Facts: accurate. Contiguous-run semantics in `computePopupSegments` (`src/base.ts:1342-1376`); stated in the `itemToGroupKeyFn` docstring ("the data must be pre-sorted by group", `src/base.ts:266-268`); DESIGN.md line 226 records it as "Honest cost (accepted)" and line 244 names the known trap (same as MUI's `groupBy`) plus the mitigation: a non-contiguous key reappearance triggers a `console.warn` (`src/base.ts:1367-1369`).

Why the data model is a flat `T[]` (recorded, DESIGN.md "Optgroup (Phase 10)" lines 200-226 - the user asked to recover this): grouping is a derived projection of `items`, and the nested shape (`{ label, items }[]` or a `setGroups()` channel) was REJECTED for five recorded reasons: (1) single source of truth - a nested shape is a second write channel, the select2 / choices.js dual-write bug pattern this project rejects; (2) identity drives behavior - membership and group-disabled key on `GK`, the label is a separate projection, so renaming a label (i18n) never changes grouping; (3) `GK` is fully generic, mirroring `T`; (4) grouping must be a setting, not a subclass, to compose with filtering etc.; (5) nested's unique wins (empty groups, one item in several groups, group order decoupled from item order) are out of scope, matching native `<select>`. The contiguous-run consequence was then accepted as an "honest cost".

Key correction to the record's framing: PERFORMANCE was never the reason for contiguous-run - the recorded reasons are the order/alignment invariant (`getVisibleItems()` order = `items` order, `itemEls[i]` alignment) and not silently hiding a data problem. Gathering is cheap: one O(n) pass with a `Map` bucket per key for the default `===` equality; with a custom `groupKeyCompareFn` it degrades to O(n x distinct-group-count) via linear key lookup (group counts are small in practice). (Micro-edge if a Map is used: Map keying is SameValueZero, so two `NaN` keys would merge where `===` never does - noted, not worth special-casing.)

Options:

- (A) Gather at the visible-list derive step - RECOMMENDED. Insert the gather after filtering and BEFORE any element building: the visible list itself becomes the gathered order, so everything downstream (element building, segments, keyboard nav, focus, `itemEls[i]` alignment) receives an already-contiguous list and needs zero changes. The DATA is never touched - `items` / `getItems()` keep the caller's order; only the display order is derived. Semantics: groups render in first-appearance order; within a group, items keep their relative order; `null`-key items stay where the walk meets them. Already-sorted input takes a detect-only pass and returns the original array (no allocation, behavior byte-identical to today). The duplicate-header `console.warn` becomes obsolete (the output is now well-defined) - drop it. The rare "two visually separate sections with the same header text" stays expressible: two distinct keys mapped to one string by `groupKeyToStringFn`. Doc follow-ups: DESIGN.md "Grouping semantic (contiguous-run)" + "Honest cost" rewritten, `itemToGroupKeyFn` docstring, and (with item 2) the public `getVisibleItems()` docstring must state that its order is the display order.
- (B) Status quo: contiguous-run + warn (MUI parity). Zero work; keeps the footgun the user objects to.
- (C) Nested input shape: stays rejected - the five recorded reasons hold, and (A) removes the footgun without a second write channel, so (C) buys nothing left.

DIRECTION DECIDED (user): option (A), shaped as the user proposed - the gather is a PUBLIC pure function, the instance uses that same function internally, auto-gather is on by default and can be switched off, and the function is exported for callers who pre-gather themselves ("low-level all the way"; no profiling gate needed for the export - it is the internal implementation exported at zero marginal cost). Converged mechanics:

- Laziness (user asked to confirm): a memoized derived list with a dirty flag. `setItems()` only marks dirty; materialization happens at first NEED - `open()`, a filter recompute while open, `setItems()` while the popup is open (the immediate re-render consumes it), and, once public, a `getVisibleItems()` call while closed - then stays memoized until the next `setItems()`. So "gather on first open" is the common case, and it matches the recorded lazy-popup philosophy (setItems docstring: DOM "built lazily on the next `open()`"). Grouping settings are frozen, so items-change is the only dirty trigger.
- Pipeline position: gather ONCE over the full list (the memoized base); filtering then operates on the gathered base per keystroke - NOT filter-then-gather. Two reasons: (1) group-position stability - items `[A1, B1, A2]` gather to `[A1, A2, B1]`; a query that drops `A1` leaves `[A2, B1]` (group A still before B), while filter-then-gather would yield `[B1, A2]`, making a group JUMP position mid-typing; gather-first matches exactly what pre-sorted data does today. (2) cost - one gather per items-change instead of per keystroke. Filtering preserves contiguity, so `computePopupSegments` never meets a non-contiguous key while auto-gather is on.
- Opt-out semantics: with auto-gather OFF the current contiguous-run behavior stands, INCLUDING the `console.warn` - the honest framing is that the opt-out is a STRICTNESS mode, not a perf knob: with auto-gather on, already-contiguous data pays one detect-only O(n) scan per items-change (no allocation), negligible next to any render. What OFF really buys is "my data is contiguous by construction; if not, do not silently fix it - warn me".
- Names to decide (Decisions list): the exported function and the setting.

Status: mechanics converged as above; function / setting names pending.

## 10. Settings null vs single-select empty undefined - as designed; rationale only half recorded

Facts: accurate. Settings uniformly use `null` for "not set" (DESIGN.md line 33: "`null` (never `undefined`) uniformly meaning 'not set'", enforced by docstring convention per nullable setting). The empty single selection is `undefined` (`src/single.ts:69`, `95-97`; DESIGN.md line 303: clear = `setChosenItem(undefined)`).

Assessment: two different domains with one convention each, both internally consistent. The value-side rationale, which no doc currently states: `undefined` keeps `null` available as a legitimate item value for `T` (a `T` of `string | null` still round-trips through `getChosenItem`), and matches the JS convention for "absent" returns (`Array.prototype.find`). The settings-side `null` is the resolution idiom (`??` fallback) with per-field documented meaning.

Proposal: no behavior change; add one sentence to DESIGN.md recording the value-side rationale so the split stops looking accidental.

## 11. Found during implementation: a subclass `itemToGroupKey` override did not drive grouping render - FIXED (user: fix per the customization model)

Was: `computePopupSegments` and the gather read the SETTING directly, while the protected method `itemToGroupKey(item)` is the documented subclass seam (only the disabled layer called it) - so an override neither turned grouping on nor changed rendered groups, contradicting DESIGN.md's customization model ("the library calls the method directly").

Fix: segmentation and the gather now resolve every key via `this.itemToGroupKey`, unconditionally - no "grouping on" gate is needed because all-`null` keys produce the exact same flat segments as the old early return. So an override that returns keys turns grouping on even with the setting unset, matching the model's "override = replace".

- Q: Why is there no gating problem ("how does the library know grouping is on if the setting is null but the method is overridden")?
  - A: The gate was an optimization, not a semantic: rendering a list where every key is `null` is byte-identical to the grouping-off early return, and the gather detects all-`null` as contiguous and returns `items` itself. "Grouping off" IS "all keys null".
- Costs accepted: non-grouping selects now pay n no-op `itemToGroupKey` calls per render / per gather detect - noise next to the n DOM nodes the same render builds.
- Closed alongside: the gather memo could go stale when an override reads external state that changes (or when item objects are mutated in place, the documented `rerender()` case). `rerender()` now invalidates the gather memo and, while the filter is active, re-runs the filter - so the documented "mutated data -> call `rerender()`" contract refreshes everything. The `itemToGroupKey` docstring states the same contract for overrides reading external state.
- Verified: subclass-seam tests in `test/optgroup.test.ts` (override-enables-grouping incl. gather; external-state flip + `rerender()`).

## Decisions needed (user)

IMPLEMENTED (commits on master): 1 (`isOpened()` + `opened` + ctx cascade), 4 (`setPlaceholder`), 8 (`gatherGroups` + `gatherItemsByGroupKey`, lazy memoized gather, strict mode keeps the warn), 9 (verb-boundary ruling in naming-conventions s2 + docstrings), 10 (clear stays total; `unchooseAll` rationale reworded; A11Y.md records the native-parity rule), 11 (grouping resolves keys via the `itemToGroupKey` seam; `rerender()` refreshes gather + filter). Still open: 2 / 3 (visible items / query readers), 5 (`toggleAllVisible`), 6 (events), 7 (subclassSettings).

Per CLAUDE.md, naming decisions come with full signatures:

1. Open-state reader: DECIDED - `public isOpened(): boolean` + private field `opened` (user ruling, naming-conventions.md s7a.9); ctx cascade `{ isOpen } -> { isOpened }` included; DOM/CSS `open` vocabulary untouched; `this.state` bag dropped by user. Nothing remaining.
2. Visible list: widen `protected getVisibleItems(): readonly T[]` to `public` - the items currently displayed in the popup (filtered subset while a query is active; the full list while closed or unfiltered). Zero new code; docstring gains the while-closed sentence.
3. Filter query reader: add `public getFilterQuery(): string` - the filter input's current query; `''` while closed, while the filter is inactive, or while the input is empty. Or reject (the `filterFn` second argument stays the only channel).
4. Placeholder setter: DECIDED - add `public setPlaceholder(placeholder: string | null): void` - replaces the trigger placeholder text with immediate effect; `null` means fall back to the pack default (`uiTranslationPack.triggerPlaceholder`), mirroring the constructor's unset semantics (`null` meaning assumed, flag any objection). Implementation notes under item 4.
5. Visible-subset bulk toggle: expose the choose-all row's action as e.g. `public toggleAllVisible(): void` - when every visible enabled item is chosen, unchoose exactly those; otherwise choose the missing ones; choices outside the visible subset are preserved. Or defer (recommended) and only add the toggleAll docstring cross-ref from item 7.
6. Events: confirm keep (no `on()`/`off()`, no handler swapping); optional README closure recipe from item 3.
7. subclassSettings: confirm keep (record Q&A), vs the third-generic-param refactor from item 5.
8. Grouping semantics: DIRECTION DECIDED - option (A) as a public pure function used internally, auto-gather default-on with an opt-out (strict mode keeps the warn), lazy dirty-flag materialization; mechanics under item 9. Remaining names:
   - The exported function - proposed `gatherItemsByGroupKey<T, GK = string>(items: readonly T[], itemToGroupKeyFn: (item: T) => GK | null, groupKeyCompareFn?: ((a: GK, b: GK) => boolean) | null): readonly T[]` - stable-buckets items so each group is contiguous, groups ordered by first appearance, within-group relative order kept, `null`-key items staying at their walk position; returns the INPUT array itself when already contiguous (zero allocation), else a new array. "gather" not "sort": it is not comparator ordering, and DESIGN.md already uses exactly this word ("reorder items to gather groups").
   - The opt-out setting - proposed `gatherGroups: boolean` (default `true`; `false` = the caller guarantees contiguous data, non-contiguous keys render the duplicate header + `console.warn` as today).
9. Bulk-op naming: DECIDED - keep the names (user confirmed the existing verb boundary is fine as-is); record the verb-family ruling (`set*` / `clear` = total assignment, disabled-blind; `choose*` / `toggle*` = UI-parity, enabled-only) in naming-conventions.md and add one explicit docstring sentence per method. All of this is documentation; no behavior changes.
10. Clear button vs chosen-disabled: DECIDED - keep the full wipe; it matches the native `<select>` standard (user ruled native as the reference; verification under item 7). Only the `unchooseAll` rationale sentence gets reworded.
