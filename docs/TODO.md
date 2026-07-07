# TODO / Roadmap

Version-controlled source of truth for llselect's remaining work. (The Claude
Code harness keeps its own in-session task list, but that is session-local and
not committed - this file is the durable record.)

Status: `[ ]` todo, `[x]` done, `[~]` in progress.

## Phases

- [x] **Phase 0** - project scaffolding (rollup, tsc, node:test + jsdom, demo)
- [x] **Phase 1** - `LLSelectBase` skeleton (DOM + ARIA + classIdMap)
- [x] **Phase 2** - `LLSelectSingle` + click selection + onChange
- [x] **Phase 3** - lazy render on open/close
- [x] **Phase 4** - positioning module (flip, scroll/resize tracking, auto-close
      when the trigger scrolls out of view - NOT on resize / virtual keyboard, so
      opening a search keyboard on mobile does not dismiss the popup; uses layout
      viewport for the visibility test, visual viewport for max-height)
- [x] **Phase 5** - keyboard navigation (arrows / Home / End / PageUp-Dn / Enter / Esc, aria-activedescendant)
- [x] **Phase 6** - `LLSelectMultiple` (toggle, chooseAll/unchooseAll/toggleAll, aria-selected, aria-multiselectable)
- Phase 7 (native-style typeahead): **DROPPED**. Superseded by the search box.
  Prefix typeahead maps keys to characters, so it is useless for CJK / IME
  input; the search box (with IME-aware filtering) is the single "type to find"
  mechanism.
- [x] **Phase 8** - `filterFn` + search input (combobox host moves to the input, trigger becomes a `button`; see `A11Y.md`). The only type-to-find path.
- [x] **Phase 9** - `disabled` support. Control-level `setDisabled()` /
      `isDisabled()` + `focusableWhenDisabled` (whole select: cannot open,
      trigger out of tab order, `aria-disabled`); item-level `itemDisabledFn`
      predicate (per-item: not selectable, skipped by keyboard nav,
      `aria-disabled`, selection retained, bulk ops skip it). Always
      `aria-disabled`, never native `disabled`. Contract in `DESIGN.md` /
      `A11Y.md`; design research in `optgroup-research.md`. Group-level disabled
      deferred to Phase 10 (layers on item-level).
- [x] **Phase 10** - optgroup support. **DONE.** Grouping is a derived projection
      of the flat `items` list (not a nested structure); the group layer mirrors
      the item layer on a generic key `GK` (class `<T, GK = string>`):
      `itemToGroupKeyFn: (item) => GK | null` (contiguous-run; keys compared by
      `groupKeyCompareFn`, default `===`) + `groupKeyToLabelFn: (key) => string`
      (display / i18n seam) + `groupDisabledFn: (key) => boolean` (layers on the
      Phase 9 item-level `disabled`). `GK` never touches the DOM (group id is
      index-based). ARIA `role="group"` + `aria-label`, header `aria-hidden`,
      keyboard skips headers (never in `itemEls`); non-contiguous key reappearance
      `console.warn`s once. `ensureVisibleInScroll` moved to
      `getBoundingClientRect` deltas (measured equal-cost vs `offsetTop`; robust
      to a positioned group). Themes ship `.llselect-group-label` styling. Spec:
      DESIGN.md "Optgroup (Phase 10)"; research: `optgroup-research.md`.
- [x] **Phase 11** - tags display. **DONE.** `LLSelectMultiple` +
      `triggerDisplay: 'count' | 'tags'` - a capability on the body, not a subclass
      (composes with searchable / optgroup, same rule as searchable). `'tags'`
      renders one removable chip per chosen item; `createTagContentElFn: (item) =>
      HTMLElement | null` fills a chip's content (mirrors `createItemContentElFn`;
      `createTriggerContentElFn` still takes over the whole trigger). Remove button
      is `<button aria-label="Remove <label>" tabindex="-1">`, click
      `stopPropagation` + `toggleItem` (select2-style MVP; keyboard removes via the
      popup). Protected chain `createTagsEl` / `createTagEl` / `createTagContentEl`
      / `createTagRemoveButtonEl` (remove button; `createTagRemoveButtonContentElFn` swaps its icon,
      mirroring `createTriggerClearButtonContentElFn`).
      Themes ship `.llselect-tag*` (x via CSS `\00d7`). Spec: DESIGN.md "Tags
      (triggerDisplay)"; A11Y.md "Tags". Future: focusable-remove flag (A11Y open
      questions).
- [x] **Phase 12** - clear button. **DONE.** `clearable: boolean` (base setting)
      shows an x button in its own trigger slot (like the arrow, so no collision
      with `createTriggerContentElFn`); `createTriggerClearButtonContentElFn` fills the icon (mirrors
      `createTriggerArrowContentElFn`), else theme CSS `\00d7`. Library owns click
      (`stopPropagation` + `clearSelection`), `aria-label`, `tabindex="-1"`, and
      `data-empty` hide-when-empty. `protected clearSelection()`: single ->
      `undefined`, multiple -> `[]`, both through the normal setters so `onChange`
      fires the empty value (no `onClear`). Spec: DESIGN.md "Clear button".

A11Y model (locked, see `A11Y.md`): two ARIA modes picked by `searchable`.
`searchable: true` uses APG "Combobox with list autocomplete" (focus on the
search input, `aria-activedescendant` on the input, trigger is a `button`).
`searchable: false` keeps APG "Combobox (select-only)" (focus on the trigger,
trigger keeps `role="combobox"`). The input is always built into the DOM, just
`hidden` when off, so a future runtime toggle (e.g. `minimumResultsForSearch`)
is a CSS flip rather than a DOM rebuild. Tab leaves the widget; Esc clears the
filter then closes; filtering is IME-aware (composition-guarded).

## API consistency review

Whole-project review findings (API-design inconsistencies + doc drift), with
per-item rulings. Work rule: one commit per item, in order; anything needing a
user ruling is parked under "Open rulings" below and does not block the rest.

- [x] **R1 - de-hardcode all AT strings; the search input gets a name.** The
      search input has no accessible name (violates WCAG 4.1.2: an unnamed
      `role="combobox"`) and no settings at all; the clear / tag-remove
      aria-labels are hardcoded English. Add base settings
      `searchInputAriaLabel: string` (default `'Search'`),
      `searchInputPlaceholder: string | null` (`null` default = no
      placeholder), `clearButtonAriaLabel: string` (default
      `'Clear selection'`); multiple setting
      `itemToTagRemoveLabelFn: ((item: T) => string) | null` (`null` default =
      `Remove <itemToString(item)>`). Flat settings per house style; grouping
      into a `texts` bag is O2. This is the i18n MECHANISM (every
      user/AT-visible string configurable); bundled translations are O1.
- [x] **R2 - single options carry `aria-selected`.** Only multiple sets it;
      A11Y.md's own Elements table and the APG select-only pattern require it
      on single too. Also make `setChosenItem` refresh the two affected option
      elements while the popup is open (O(1) via
      `replacePopupListItemElInDom`) so the attribute cannot go stale.
- [x] **R3 - complete the protected seams.** `matchesQuery` -> protected
      (subclass-wide custom matching; default reads `filterFn`). Add
      `protected createTriggerArrowContentEl(state): HTMLElement | SVGElement | null`
      reading `createTriggerArrowContentElFn` (mirrors `createTriggerClearButtonEl`);
      `renderTriggerArrow` stays a private orchestrator and
      `commitTriggerArrowContentElToDom` a private primitive. Closes the gap vs DESIGN.md's
      "every customization point is a protected method" model.
- [x] **R4 - pair `onChange` with a protected hook.** `onOpen`/`onOpened` and
      `onClose`/`onClosed` are pairs; `onChange` has no sibling. Add base
      `protected onChosenChanged()` (default no-op), fired by single/multiple
      `fireChange` before the setting (hook first, matching `open()`).
- [x] **R5 - export every user-reachable type.** Re-export `WidthPolicy` and
      `Placement` from the package root (referenced by the public
      `popupWidthPolicy` setting / `data-placement` attribute); add + export
      `LLSelectTriggerDisplay = 'count' | 'tags'` (same treatment as
      `LLSelectOutsideClickBehavior`). Rule: a type a consumer can observe
      must be importable, never infer-only.
- [x] **R6 - stop lying about array ownership.** `getItems`'s docstring claims
      mutating the result "has no effect" - false (it is the live internal
      array; only TS `readonly` guards it). Fix the docstring (treat as
      immutable; structural change goes through `setItems`);
      `getVisibleItems` returns `readonly T[]` instead of leaking a mutable
      live array to subclasses. RULED (user asked "make it externally mutable
      instead?"): no - external structural mutation would silently bypass
      `onItemsChanged` reconciliation (chosen-state dropping), searchable
      re-filtering, and re-render. The supported efficient in-place path is
      mutating item OBJECTS + `rerender()` (documented); `setItems` is already
      an O(n) copy, unavoidable for structural change.
- [x] **R8 - fix stale API names in README / DESIGN.md / TODO.md.**
      `renderTriggerContentFn` -> `createTriggerContentElFn`,
      `renderArrowFn` -> `createTriggerArrowContentElFn`, `rerenderPopupListItem` ->
      `replacePopupListItemElInDom`; rewrite DESIGN.md's outdated
      "transitional role=combobox until Phase 8" note (Phase 8 shipped; both
      trigger-role modes are final by design).
- [x] **R9 - render-responsibilities.md / naming-conventions.md reflect
      Phase 10.** `commitItemElsToDom` no longer exists (superseded by
      `computePopupSegments` + `commitPopupSegmentsToDom`); annotate the
      renderPopupList example as the pre-Phase-10 decision-time record; close
      the stale "still open: renderArrowFn / renderTriggerContentFn" pointer
      (both shipped renamed).
- [x] **R10 - A11Y.md tells the truth about chip names.** A chip is a generic
      `<span>` (no role) and ARIA prohibits naming `generic` elements, so the
      doc's "chip accessible name stays itemToString" is not enforceable in
      code (unlike options, which get `aria-label` pinned). Rewrite: the
      item's AT name in tags mode is guaranteed by the remove button's
      `aria-label="Remove <itemToString>"`, which custom content never
      changes; icon-only chip content should include its own (visually
      hidden) text when the chip must be announced. Mirror the guidance in
      the `createTagContentElFn` docstring.
- [x] **R11 - merge icons.ts `CheckboxState` JSDoc** (split into two comment
      blocks; tools show only the second half).
- [x] **R12 - version single-source guard.** `LLSELECT_VERSION` and
      package.json `version` can drift; add a smoke test asserting they
      match.
- [x] **R13 - item/group DOM ids hang off `popupListId`, not `triggerId`.**
      `llselect1-trigger-item3` reads as the trigger's child; options live in
      the listbox. Ids are opaque (no test / consumer contract on the
      format), so the change is safe.
- [x] **R14 - draft.ts gets an ABANDONED header** (only README mentions it;
      the file itself looks live).
- [x] **R16 - apply the s7b rename table** (Button-system; element nouns;
      Container-Content law; naming-conventions.md s7): settings / protected
      methods / classIdMap / CSS classes / themes / demo / docs. Also adds the
      two thin content methods (`createTriggerClearButtonContentEl` /
      `createTagRemoveButtonContentEl`) completing the law.
- [x] **R17 - texts bag.** New `src/texts.ts`: `LLSelectTexts` (message-id
      keys per s7a.4) + `en` (the defaults, single source). Base setting
      `texts` (input `Partial<LLSelectTexts>`, resolved vs `en`); R1's flat
      string settings fold in; the multi count summary reads
      `texts.triggerCountSummary(chosenCount, totalCount)` (called only when
      chosenCount > 0; 0 shows `placeholder`).
- [ ] **R18 - `llselect/i18n` subpath.** `src/i18n.ts` re-exports `en` and
      adds `ja` / `zhTW` (pure data; only inlines texts.ts, never base).
      Rollup config array (second entry -> dist/i18n.*), package.json
      `exports["./i18n"]`. CLAUDE.md gains the i18n non-ASCII exemption;
      zh-TW strings use CJK/half-width spacing, ja follows Japanese
      convention (no spacing).
- [ ] **R19 - demo section for i18n** (zhTW pack on a searchable multi with
      tags + clearable, so every translated string is visible).

Ruled, no code change:

- **R7a - no `isChosen` on single.** Single and multiple are deliberately
  separate APIs (DESIGN.md "Explicit"); `getChosenItem()` + `compareFn`
  covers the need without blurring the two.
- **R7b - clear-button hide-when-empty already ships**: the library sets
  `data-empty` on the trigger and every shipped theme hides
  `.llselect-trigger-clear-button` under `[data-empty='true']`. No new visibility setting
  (YAGNI until someone asks for always-visible); the conditional build (vs
  the always-built search input) stays - nothing needs a runtime `clearable`
  flip, which was the whole reason the search input is always built.
- **R15 - per-item click listeners stay (for now).** Event delegation would
  save memory on a 10k-item open but changes disabled-click wiring and has
  no measured win; lazy render already bounds the cost. Revisit with a
  benchmark (demo/bench-reflow.html precedent).

### Open rulings (waiting on user)

- [x] **O1 - built-in i18n language packs.** RULED: yes - ship `en` / `ja` /
      `zhTW` as pure-data packs under the `llselect/i18n` subpath (best
      practice: pay only if you import them). Translation quality: user vets
      zh-TW; ja is drafted and flagged for review. Work item: R18.
- [x] **O2 - grouped `texts` setting vs flat string settings.** RULED: grouped
      `texts` bag. Static strings are plain strings; parameterized messages
      are functions taking RESOLVED primitives (`itemLabel`, counts - never
      `T`) so packs can implement them; keys are message ids without `Fn`
      (naming-conventions.md s7a.4). The count summary joins as
      `triggerCountSummary`. Work item: R17.

## API design decisions (open)

- [x] **`createTriggerContentElFn` (trigger) settings callback** - DONE (planned
      as `renderTriggerContentFn`, shipped renamed and narrowed to element-only;
      naming-conventions.md s4a).
      `(ctx) => HTMLElement | null` on single / multiple (variant-specific
      `ctx`). Customise
      trigger display (tag chips) without subclassing; `null` = default. Read by
      `renderTriggerContent`'s default; overriding `renderTriggerContent` replaces
      it (override wins). See DESIGN.md "Customization model".
- [x] **`itemToStringFn` settings callback** - DONE. `(item) => string` base
      setting; read by the `itemToString` method's default (no subclass needed).
      Overriding `itemToString` replaces it (override wins; settings configure,
      overriding extends - see DESIGN.md "Customization model").
- [x] **`onOpen` / `onClose` event settings** - DONE. `() => void` base settings,
      fired after the popup opens / closes (no-op open/close does not fire). Run
      ADDITIVELY with the protected `onOpened` / `onClosed` hooks (both run) - the
      setting is for consumers, the hook for subclasses.
- [x] **`createItemContentElFn` settings callback** - DONE (shipped as
      `createItemContentElFn`, renamed from the planned `renderItemContentFn`; see
      naming-conventions.md s4a). The no-subclass path for rich item content (icon /
      checkbox / multi-line HTML): the library keeps the option element + wiring, the
      fn fills the content. Signature narrowed to `(item) => HTMLElement | null`
      (element-only; no `ctx`, no `string`); `null` = plain text from `itemToString`.
      Read by the `createItemContentEl` method's default (override to replace).
- [ ] **rich-item escape-hatch shape** - still open. Subclassing `createItemEl` is the
      current escape hatch for full control of the item element; decide whether to also
      add a `decorateItemFn(el, item)` setting, or keep the subclass-only path.
- [ ] **`onChange` diff context** - decide whether to pass `previousChosenItem(s)`
      alongside current, so users can compute added/removed without tracking.
- [ ] **RTL support** - not handled yet. Clear / arrow slot order, tag chip flow,
      and paddings should move to CSS logical properties + `dir` awareness (the
      clear button's "right side" becomes left in RTL). Cross-cutting across all
      themes + positioning; do it as one pass, not per-feature.

## Done decisions (for reference)

- [x] **Customization model: settings configure, subclassing extends.** Each
      customization point is a `protected` method whose default reads its `*Fn`
      setting; the library calls the method directly. Configuring = pass settings
      (no subclass). Overriding the method replaces its default - override wins,
      plain OO, no precedence machinery. (Removed the earlier "setting wins over
      override" resolver/gate: `effectiveItemToString`, `applyTriggerContentSetting`.
      It fought the low-level design.) See DESIGN.md "Customization model";
      user guide in README "Customization".
- [x] Data API named `items` / `setItems` (not `options`) - break from native
      `<select>` string-only semantics.
- [x] Selection named `chosenItem` (single) / `chosenItems` (multi), not `value`.
- [x] Element family: `trigger*` / `popup*`; `popupListEl` is the `role="listbox"`.
- [x] Function-setting naming: `on*` for events, `*Fn` for other callbacks (see DESIGN.md).
- [x] CSS themes shipped opt-in: vanilla, tailwind, bootstrap-3/4/5.
- [x] `rerender()` for external mutation refresh (trigger + popup list).
- [x] `replacePopupListItemElInDom(item)` - O(1) single-item DOM update; multi-select
      toggle uses it so flipping one selection in a 10k-item list does not
      rebuild the whole list (verified by the 10k demo + a unit test that the
      untouched items keep the same DOM nodes).
- [x] **`render*` refactored to pure orchestrators** - each `render*` computes then
      calls the `*ToDom` / `*El` primitives and touches no DOM in its own body; DOM
      writes live in the suffixed primitives (`commit*ToDom`, `create*El`, `*ElInDom`).
      See render-responsibilities.md.
- [x] **Method naming conventions applied across src/ (~80 methods)** - `*El` /
      `*ToDom` / `*ElInDom` suffixes mark what touches the DOM; `create*El` = detached
      build; settings callbacks named by return type (`create*ElFn` = element,
      `itemTo*Fn` = string, `on*` = event). See naming-conventions.md.

## Notes

- Architecture / naming rationale: see `DESIGN.md`.
- Keyboard / focus / ARIA behavior contract: see `A11Y.md`.
- Method naming conventions (suffixes, callback naming): see `naming-conventions.md`.
- `render*` orchestrator vs `*ToDom` / `*El` primitive split: see `render-responsibilities.md`.
- Code style rules: see `../CLAUDE.md`.
