# Popup header / footer slots - research notes

Status: **RESEARCH + TWO COMMITTEE ROUNDS DONE, DECISION PENDING the owner's ratification.** Nothing is implemented. Round 1 reviewed pinned header / footer slots; the owner then split the ask into two kinds (pinned slots and in-list action rows), and round 2 reviewed that. The leading direction below is what the committee converged on; the split points carry their vote counts. Once ratified, the design moves into `DESIGN.md` / `A11Y.md` and this file moves to `archive/`. The committee briefs and the twelve verbatim answers were kept in the session scratchpad only; this file is the durable record.

## The ask

A multi-select app wants a "Restore defaults" button inside the popup; more generally, a header / footer around the option list, or rows before / after the options. llselect has no such API today. What exists: `popupEl` and `popupListEl` are public, the library never rewrites `popupEl`'s child list after construction, and the popup's `mousedown` default-prevention keeps DOM focus on the combobox host - so `sel.popupEl.append(footer)` already works structurally, but undocumented and without a keyboard contract (keydown listeners exist only on the trigger and the filter input, so Esc on a focused footer button does nothing; `close()` returns focus only from the filter input).

## How the ecosystem does it

Placement vocabulary: `outer` = pinned outside the scrolling option list; `inner` = scrolls with the items; `wrapper` = the app receives the whole menu node; `none` = no built-in slot. Verified against official docs / READMEs, or the published source where the docs are silent (marked "source").

| Library | API | Placement | Keyboard / focus for controls inside the slot |
|---|---|---|---|
| Select2 4.1 | custom `dropdownAdapter` only | none / wrapper | not documented |
| Choices.js | `callbackOnCreateTemplates` (override the `dropdown` template) | none | not documented |
| Tom Select | `dropdown_header` plugin; `render.dropdown` | outer (source); wrapper | not documented; the header's close control is a bare `<a>`, not keyboard-reachable |
| Slim Select | - | none | - |
| bootstrap-select | `header`, `actionsBox` (select / deselect all), `doneButton` | outer (source) | Tab only closes / selects; focus never enters the header; the close button is `aria-hidden` |
| ng-select | `ng-header-tmp` / `ng-footer-tmp` | outer (source) | Tab closes the panel; the official demo puts select-all / unselect-all buttons in the header with no focus story |
| Angular Material `mat-select` | - | none | the docs forbid interactive controls inside options |
| Kendo UI (Angular) | `kendoDropDownListHeaderTemplate` / `FooterTemplate`, MultiSelect twins | outer (source) | not documented |
| Syncfusion EJ2 | `headerTemplate` / `footerTemplate` | outer ("shown statically at the top of the popup list items") | not documented |
| PrimeNG `p-select` / `p-multiselect` | `#header` / `#footer` templates | outer (source) | documented: Tab cycles the focusable elements inside the popup (focus trap); Escape closes |
| Ant Design Select | `popupRender(originNode)` (was `dropdownRender`) | wrapper | FAQ: blur closes; call `preventDefault` + `stopPropagation` on `mousedown` in custom content |
| Semi Design Select | `outerTopSlot` / `innerTopSlot` / `innerBottomSlot` / `outerBottomSlot` | both, named | documented: Tab moves into a bottom slot's control while open; Shift+Tab from the first slot control returns to the select |
| TDesign Select | `panelTopContent` / `panelBottomContent` | inner (source: the popup content is the scroller) | not documented |
| Element Plus `el-select` | `header` / `footer` slots (2.4.3) | outer (source) | not documented; blur is ignored while focus is inside the popup (source) |
| Vuetify `v-select` | `prepend-item` / `append-item`; `menu-header` / `menu-footer` | inner; outer | source: Tab walks header -> list -> footer, then closes and refocuses the field |
| vue-multiselect | `beforeList` / `afterList` | inner (inside `ul[role=listbox]`) | source: `mousedown.prevent` on the wrapper, focus never enters slot content |
| vue-select | `list-header` / `list-footer` ("parent element is the `<ul>`") | inner | not documented |
| Quasar `QSelect` | `before-options` / `after-options` | inner | documented: "interactive elements placed here are not keyboard/screen-reader accessible - prefer modeling such actions as regular options or placing them outside of the popup" |
| Naive UI `n-select` | `header` / `action` slots | outer (source) | source: the menu root is focusable; a focus detector after the action slot closes on tab-out and refocuses the trigger |
| react-select | `components.Menu` / `components.MenuList` | wrapper (outer / inner by choice) | not documented |
| MUI Autocomplete | `slots.paper` / `slots.listbox` | wrapper | not documented; the issue-tracker recipe (button in a custom paper + `onMouseDown` preventDefault) has no maintainer answer |
| Radix UI Select | `Select.Content` children | none | source: Tab is `preventDefault`ed ("select should not be navigated using tab key"), focus trapped |
| Headless UI Listbox / Combobox | option children only | none | Combobox: Tab selects the focused item and closes |
| Downshift | you own the markup | none | Tab / blur closes (and selects the highlighted item) |
| React Aria Select / ComboBox | `Popover` children beside `ListBox` | outer (Select: "can include additional components as siblings of the ListBox") | not documented |
| Mantine Combobox | `Combobox.Header` / `Combobox.Footer` | outer | `mousedown` default prevented in header / footer (v7.10.2) so clicks do not close; focus stays on the target |
| Chakra UI v3 / Ark Select | `Select.Content` children | none | listbox pattern; no Tab row |
| shadcn/ui Combobox (Base UI) | `Combobox.Popup` holds `Status` / `Empty` outside `Combobox.List` | outer | not documented |

## Key findings

1. **Outer header + footer is the dominant dedicated-API shape** (ng-select, Kendo, Syncfusion, PrimeNG, bootstrap-select, Tom Select's plugin, Element Plus, Naive UI, Mantine, Vuetify's menu slots, Semi's outer slots). Inner rows exist (Vuetify prepend / append-item, vue-multiselect, vue-select, Quasar, Semi's inner slots, TDesign by accident of its scroller), and the only library that documents their keyboard consequence (Quasar) warns against interactive content there.
2. **"header / footer" is the industry vocabulary** almost everywhere; Semi says top / bottom, Vuetify says prepend / append for the inner rows.
3. **Keyboard handling for interactive slot content splits three ways.** Pointer-only, focus never enters the slot (bootstrap-select, Mantine, vue-multiselect, Ant Design's recipe); Tab moves into the slot while open and leaves past its end (Semi documented; Vuetify and Naive UI in source; PrimeNG traps Tab inside the popup instead); documented "not accessible, put it outside" (Quasar). Nobody puts slot controls into the arrow-key ring, and nobody gives the slot a role.
4. **Only Semi Design and PrimeNG document the focus story at all.** Every other library leaves an app-inserted button's keyboard reachability to whatever its focus model happens to do.
5. **ARIA constrains inner rows hard**: a `listbox` may own only `option` / `group` (WAI-ARIA 1.2), so a row inside the list must be an option, and "Restore defaults" is not a selectable value. llselect's choose-all row is the one tolerated non-item option, and it needed its own ring machinery (`createPopupListLeadingRowEl`, `focusLeadingRow`, `replaceLeadingRowElInDom`, `onLeadingRowActivated`).

## Committee review, round 1 (Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex 5.5)

Each member got the full brief (the facts above, the survey, four candidate designs, eight questions, the author's lean) in a fresh read-only session. Votes: six times SHIP-WITH-CHANGES. Tallies:

- Ship a real API (outer slots), not just a documented `popupEl.append` recipe: 6:0. Reasons: the Explicit principle, a themable class, and the Esc / focus-return gaps cannot be fixed from app code.
- Names `popupHeaderEl` / `popupFooterEl`, `.llselect-popup-header` / `.llselect-popup-footer`, settings `createPopupHeaderContentElFn` / `createPopupFooterContentElFn`: 6:0. `popupListHeader` was called actively wrong (it would read as a listbox child). Opus 5: the STRICT one-word rule then requires the group label to stop being called a "header" in prose and comments (src/base.ts docstrings, theme comments, DESIGN.md, A11Y.md); Sonnet 5 rates that a doc note, not a blocker.
- Slot containers built only when content exists (no resting node otherwise): 6:0. Gate on the METHOD result (the container exists iff `createPopupHeaderContentEl()` returns non-null at construction), so a subclass that overrides only the content method still gets a container.
- No ctx param on the content fn (respects TODO.md "Callback context / instance access review"): 6:0.
- On `LLSelectBase`, not multiple-only: 6:0.
- Slot content fn called ONCE at construction, node kept for the instance's life, never rebuilt by the library: 4:2 over per-open + `rerender()`. The decisive defect in the author's per-open lean: `LLSelectMultiple.setChosenItems` calls `rerender()`, so a "Restore defaults" footer button would rebuild ITSELF from its own click / Enter handler - focus drops to `<body>`, and the popup closes or strands focus. The library cannot preserve focus across an app-built subtree (the clear button's focus-preserving swap works only because the library owns that one element). Call-once also keeps framework-wrapper content mounted once, and makes a whole-element override authoritative.
- Header below the filter input ([filter, header, list, no-results, footer]): 4:2. For below: the input is the combobox host, so forward Tab runs host -> header -> footer -> out, and the AT reading order is button -> combobox -> header -> listbox. For above: a "header" above the input matches bootstrap-select and the plain meaning of the word.
- Inner rows, AS THEN FRAMED (app-supplied arbitrary rows inside the listbox): 6:0 against. Superseded by the owner's refinement below.
- Interactive slot controls reachable by Tab (option b) vs pointer-only like the clear button (option a): 4:2 for (b). Re-asked in round 2 once action rows existed as the keyboard path.

## The owner's refinement after round 1

Round 1 conflated two different things. Pinned content lives outside the scrolling listbox and never scrolls; rows scroll with the list - the choose-all row is one (it is the first child INSIDE `popupListEl`, and no shipped theme pins it). Both kinds ship, with a purpose split. The ARIA objection to inner rows is answered the way the choose-all row already answers it: the LIBRARY builds each row as a standard `role="option"` container with the ARIA wiring (id, `aria-label`, ring membership, disabled state), and the app fills only content and behavior - the Container-Content law. What that does not change: assistive technology announces such a row as an option ("Restore defaults, 2 of 14"), the same documented stretch the choose-all row carries.

## Committee review, round 2 (same six members; six votes SHIP-WITH-CHANGES)

- Purpose split "row = an action a keyboard user must reach with the arrow keys; slot = pinned content nobody runs": workable for the motivating cases, with three documented edge cases - a mixed "3 selected + Clear all" toolbar splits into a slot (the count) and a row (the action); links and other controls that need native semantics stay in a slot; a pinned action (visible after 500 items) cannot have both properties in v1, and a sticky row does not fix it because `ensureVisibleInScroll` measures the full `clientHeight` and the sticky row would cover the active item. Sonnet 5's sharper test: a row is right when "option, N of M" makes sense for it.
- Keyboard contract for controls inside a pinned slot: 3:3 between "pointer-first, recommend `tabindex="-1"` plus a matching row" (Opus 5, Sonnet 4.6, Codex 5.5) and "Tab reaches them, documented" (Opus 4.8, Sonnet 5, Codex Sol). Both camps agree on the facts that settle it: the library cannot keep app-placed controls out of the Tab order (a native `<button>` / `<a href>` in a slot is Tab-focusable whatever the docs say); Tab is not intercepted either way; the two robustness behaviors ship either way (6:0) - Esc while focus is inside `popupEl` closes and returns focus to the trigger; `close()` returns focus to the trigger when focus is inside `popupEl`, never on a focusout-driven close. So the code is identical and only the A11Y.md wording differs. Author's recommendation: a CONDITIONAL contract - the library's own elements form one tab stop; controls the app places in a slot are reached by Tab while the popup is open, in DOM order, with the popup kept open while focus is inside; the docs point list actions to rows.
- Descriptor minimum `{ text, content, disabled, activation }`: 6:0 sufficient for v1, with naming corrections. Function-valued fields carry the `Fn` marker: `textFn: () => string` (fn only, no `string | fn` union - that widening is blessed for capability flags only; 4:2). The activation callback is a settings-style event, present tense like `onOpen` / `onChange`: `onActivate` (past tense marks protected hooks: `onOpened`, `onItemActivated`). `disabledFn` is re-checked at activation, not only at navigation. Deferred 6:0: `visibleFn(query)` (the creatable-row feature), a stable key (index ids, like items and groups), a close-on-activate flag (`close()` is one line in `onActivate`), a ctx param (the open TODO.md review). Arrays and descriptors are shallow-copied at construction (frozen-settings rule); `undefined` and `null` mean the same for the optional fields.
- Shape: an array of descriptors per end: 6:0 (flat settings cap each end at one row; a generic row type would add a class type parameter and duplicate the item machinery for what are a few closures). Naming: `popupListLeadingRows` collides with the choose-all row, which the code and A11Y.md already call "the leading row" (`createPopupListLeadingRowEl`, `focusLeadingRow`) - a STRICT one-word-one-concept violation (3 of 6 flagged it). Proposed instead: `popupListActionRowsBeforeItems` / `popupListActionRowsAfterItems` (family prefix kept, position stated, no reuse of "leading"); type `LLSelectPopupListActionRow`; one class `popupListActionRowClass` on top of `itemClass`. "Action" collides only with the PRIVATE keyboard enum `LLSelectAction`, which can be renamed.
- Ring rules: 6:0 that the current bookkeeping (one `leadingRowFocused` boolean plus `focusedIndex` over items) cannot express N rows before and M rows after the items, and must become one internal ring position over [choose-all, rows before items, items, rows after items] - Opus 5 prefers a tagged position `{ kind, index }` over a flat index because `hideChosenRows` reflows would make a flat index point at the wrong entry. The choose-all row becomes ring position 0 internally while keeping its own public setting (4 of 6 said so explicitly). Keep the protected `focusedIndex` / `setFocusedIndex` item-based for subclass compatibility. Remove the early return on an empty item list, or rows are unreachable exactly when "Clear all" matters (zero matches; `hideChosenRows` with everything chosen). Home / End land on the first / last enabled ring entry; PageUp / PageDown clamp across the ring; in filter-active mode Home / End stay caret keys, so an after-items row in a long filtered list is reached only by arrowing past every item - put keyboard-important commands before the items.
- Initial focus on open: never on an action row (Opus 5, Opus 4.8; a double Enter right after opening must not run an app command). Order: first chosen item, else the choose-all row, else the first enabled item, else nothing. A filter keystroke never lands the active option on a row either. Action rows are never prefix-typeahead targets (the choose-all rule in DESIGN.md "Prefix typeahead" extends to them: their text is app copy and a command is not a match).
- A focused row that disables itself on activation ("Restore defaults" once restored): keep the active option on it and make Enter a no-op, instead of the item rule's jump to the nearest enabled option (Opus 5) - recorded as an A11Y.md exception.
- Row refresh: rows are rebuilt on every list render AND after every chosen change in both variants (single's `setChosenItem` too, not only the multi toggle path); rebuilding rows is safe because DOM focus never sits on a row. The brief's "O(1) per row like `replaceLeadingRowElInDom`" claim was called aspirational - that method handles one element today; the refresh path is new code.
- Row content must not contain interactive descendants (a nested `<button>` would put a real tab stop inside a `role="option"` and reintroduce the rebuild-under-focus defect): a docstring rule, 3 of 6 raised it. `withUserChangeSource` covers synchronous work only: a change made after an `await` inside `onActivate` reports `'api'` - document.
- Filter interplay: rows stay rendered while a query is active (6:0). When no item matches, the no-results status shows next to the rows - acceptable, and a deliberate asymmetry with the choose-all row, which self-hides when nothing is actionable (write it down so nobody "fixes" it). The `role="status"` element sits below the after-items rows in DOM order. Creatable rows (`visibleFn(query)`, exact-match test, Enter precedence) deferred 6:0; reserve the slot in TODO.md.
- Choose-all: keep its own public setting (6:0); its tri-state, `aria-selected`, `data-chosen-state`, self-hiding and `hideChosenRows` rules do not fit the generic descriptor. Ring order [choose-all, rows before items, items, rows after items]; Opus 5 notes the AngularJS checkbox mode draws a checkbox on the choose-all row, so rows between it and the items split the checkbox column - the owner's call whether rows go before the choose-all row instead.
- A11Y wording: acceptable as a documented deviation, but a SECOND, distinct one, not the choose-all one (a command that borrows `option`, with no `aria-selected` and no selectable value). A11Y.md must say: rows are `role="option"` only so the listbox stays valid and the row joins the ring; they are never tab stops; they carry no `aria-selected` (a screen reader may still read "not selected" - ARIA 1.1 gave `option` an implicit `aria-selected="false"`; verify in the AT pass); positional counts include them; activating a row never changes the chosen set or closes the popup by itself - the app's `onActivate` does both; a selection change made from a row is silent unless the row text or a live region reflects it. An NVDA / VoiceOver pass goes to TODO.md.
- Staging: Opus 4.8 would gate action rows on the creatable feature (the ring redesign is the library's most defect-prone, least jsdom-testable code, and the two v1 commands could live in a Tab-reachable footer); Opus 5 wants rows to ship no later than slots if slots are pointer-first. Author's recommendation: two phases in this order - pinned slots plus the two robustness behaviors first (small, round-1 shape), then action rows with the ring redesign (choose-all internalized as ring position 0), each with its own panel post-fix review.

## Committee rounds 3 and 3c (the action-row builder method, and the `index` parameter)

Round 3 asked which protected whole-element builder the action rows get; round 3c asked the owner's broader question - whether whole-element builders should take an `index` at all, or the library should mint ids itself from a per-instance counter (the owner stated this could overturn the shipped `createItemEl(item, index)` / `createGroupEl(key, index, ...)`). Round 3c's brief corrected round 3b's, which had wrongly said no override uses `index`; 3b was stopped after one answer and is not counted.

- Builder shape, 4:2 for ONE builder with a position parameter: `createPopupListActionRowEl(row, position, index)` (Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol) over one builder with a single running index and no position (Opus 4.8, Codex 5.5); two builders, one per end, got no vote (both ends build the same element kind, so an override would be written twice). Majority reasons: `createItemEl` / `createGroupEl` are one-builder-per-element-kind taking render context as parameters; without `position` an override cannot tell which end it is building for. Minority reason: the three sibling methods (`createPopupListActionRowContentEl(row)`, `isPopupListActionRowDisabled(row)`, `onPopupListActionRowActivated(row)`) are position-free, and the builder does not use the position itself.
- Position words `'before-items' | 'after-items'`: 6:0 (they mirror the settings, avoid "leading", which belongs to the choose-all row, and avoid `LLSelectPlacement`'s `'below' | 'above'`). A named alias `LLSelectPopupListActionRowPosition`: 3:3 - for (Opus 5, Sonnet 5, Codex Sol): `LLSelectChosenState` is the precedent of a small union passed to a `create*` method and exported; against (Opus 4.8, Sonnet 4.6, Codex 5.5): naming-conventions.md s3 reserves aliases for value types callers declare variables of, and a protected-method parameter is restated by override authors only.
- Keep `index` on the builders (option A), 5:1. Opus 4.8, Opus 5, Sonnet 5, Codex Sol, Codex 5.5 for A; Sonnet 4.6 for B-lite (drop `index` from `createItemEl` / `createGroupEl`, move it to `createItemContentEl(item, index)`, stamp ids in the orchestrator). Why A holds:
  - `index` is not id plumbing only. The click closure calls `setFocusedIndex(index)` (O(1) click-to-focus), the protected `focusedIndex` / `setFocusedIndex` API already exposes the same coordinate (a position in `getVisibleItems()`), and the AngularJS ui-select bridge stores it synchronously to expose ui-select's `$index` to row templates (angularjs/llselect-ui-select.js:70-76) - a real consumer that needs the raw number in O(1) on a list that can hold 10,000 rows.
  - Three written rules say the builder owns the whole element: naming-conventions.md s7a.3 ("Plain `create<Element>El` builds the WHOLE element"), DESIGN.md "Override = replace", and `createGroupEl`'s documented contract. B splits id ownership from wiring ownership, and the stamping would have to be repeated at three build-then-use sites (the render loop, `replacePopupListItemElInDom`, `replaceLeadingRowElInDom`).
  - B does not remove the parameter, it relocates it: keeping `$index` means `createItemContentEl(item, index)`, which also widens the PUBLIC `createItemContentElFn: (item) => ...` setting.
  - The one real gain B would buy: a plain-JS override that forgets to forward `index` under A mints duplicate `-itemundefined` ids. Documented instead.
- Id scheme: keep index-based ids, 4 for (Opus 4.8, Sonnet 4.6, Codex Sol, Codex 5.5), 1 for a per-instance counter with unchanged signatures (Sonnet 5), 1 neutral (Opus 5: no functional loss found for a counter, no verified benefit either). A counter is workable - `popupListId` already makes ids unique across instances, and growth is harmless - but it makes ids differ from render to render (harder to debug and test, and a memoized element's id would churn) while buying nothing: after an in-place swap `aria-activedescendant` is re-pointed at the new element either way, and whether the id TEXT matters to assistive technology is unverified in both schemes (a screen-reader pass item). No test pins the `-item${n}` / `-group${n}` text; tests read `el.id` dynamically (three reviewers checked; the 3c brief's "six assertions" claim was wrong).
- Side findings logged as DOCUMENTATION-109 in `FIXME.md`: `createItemEl` and `focusedIndex` described the index as a position in `items` (it is a position in `getVisibleItems()`); `createGroupEl` called its id "stable" (nothing reads a group id). Also noted: an item-element override that memoizes elements is already unsafe under A because the click closure captures a stale index; the same-element reuse allowance is clear-button-specific.

## Leading direction (PENDING RATIFICATION)

### Pinned slots (outer)

```ts
// LLSelectBaseSettings<T, GroupKey> - both default null
createPopupHeaderContentElFn: (() => HTMLElement | null) | null
createPopupFooterContentElFn: (() => HTMLElement | null) | null

// LLSelectBase - null when no content was built
public readonly popupHeaderEl: HTMLElement | null
public readonly popupFooterEl: HTMLElement | null
protected createPopupHeaderContentEl(): HTMLElement | null   // thin, reads the setting
protected createPopupFooterContentEl(): HTMLElement | null
protected createPopupHeaderEl(): HTMLElement | null          // whole element; null when the content method returns null
protected createPopupFooterEl(): HTMLElement | null

// LLSelectClassIdMap
popupHeaderClass: string   // `${prefix}-popup-header`
popupFooterClass: string   // `${prefix}-popup-footer`
```

- DOM order inside `popupEl`: `[filterInputEl, popupHeaderEl?, popupListEl, popupListNoResultsEl, popupFooterEl?]`. The containers are plain `div`s: no role, no tabindex, inline `flex: none` (like the list's inline flex rules) so `popupListEl` stays the only scroller; header and footer stay visible while the list is empty.
- Lifecycle: the content fn runs once, inside the constructor (before `new` returns - handlers may close over the eventual instance but must not read it during construction); the node persists until `destroy()`; `open()`, `rerender()` and `setUiTranslationPack()` never touch it. Live state ("3 selected") is the app's job from `onChange` / `onOpen`.
- Keyboard / focus, the conditional contract: the library's own elements form one tab stop; controls the app places in a slot are ordinary focusables, tab stops only while the popup is open (the closed popup is `hidden`), reached by Tab in DOM order (host -> header controls -> footer controls -> out; focusout past the last one closes without reclaiming focus; Shift+Tab from the first slot control returns to the host with the popup open). Arrow keys stay with the focused control; slot controls never enter the `aria-activedescendant` ring. Esc on a slot control closes and returns focus to the trigger: one keydown listener on `popupEl`, attached only when a slot exists, Escape only, skipping events whose target is inside the filter input (its own handler ran), `isComposing` events, and `defaultPrevented` events (so an app text field can own Esc), and calling `preventDefault` so an enclosing modal `<dialog>` does not also close. `close()` returns focus to the trigger whenever focus is inside `popupEl` at close time (through the shadow-aware `focusedElementIn`, generalizing today's filter-input-only rule at the same decision point); tests must pin that the Tab-away and outside-click dismissal paths still follow the user's focus move instead of reclaiming it. The docs point list actions to rows; a slot control is the mouse shortcut for such an action.
- Pointer: the popup `mousedown` default-prevention stays, so a click on a slot button is focus-neutral (keyboard input on the host keeps working). A text field inside a slot must call `stopPropagation` on its own `mousedown` to take pointer focus - documented.
- Docs / recipe rules: slot buttons use `type="button"`, carry accessible names, and use `aria-disabled` rather than native `disabled` (a focused button that becomes natively disabled loses focus); keep slot content compact (a long unwrapped sentence widens a `'fit-content'` popup, a tall slot squeezes the list); slot text is never announced while focus stays on the combobox, so a hint screen-reader users need is not a slot's job.

### Action rows (inner, in the arrow-key ring)

```ts
// LLSelectBaseSettings<T, GroupKey> - both default []; shallow-copied at construction
popupListActionRowsBeforeItems: readonly LLSelectPopupListActionRow[]   // after the choose-all row when present
popupListActionRowsAfterItems: readonly LLSelectPopupListActionRow[]    // after the last item

/** One app command rendered as a role="option" row inside the popup list. */
export interface LLSelectPopupListActionRow {
  /** Accessible name; also the visible text when there is no custom content. Re-read on every row render. */
  textFn: () => string
  /** Rich visible content; null / omitted = plain text from textFn. Must not contain interactive descendants: the row itself is the control. */
  createContentElFn?: (() => HTMLElement | null) | null
  /** Live; null / omitted = never disabled. Re-read on every row render and again at activation. */
  disabledFn?: (() => boolean) | null
  /** Enter, Space while the filter is inactive, or click. The library changes nothing else: choosing and closing are this callback's job. Synchronous work runs under withUserChangeSource; a change made after an await reports 'api'. */
  onActivate: () => void
}

// LLSelectClassIdMap - each row also carries itemClass
popupListActionRowClass: string   // `${prefix}-popup-list-action-row`
// ids: `${popupListId}-action-row-before-items${i}` / `-action-row-after-items${i}`

// LLSelectBase, protected (Container-Content law)
protected createPopupListActionRowEl(row: LLSelectPopupListActionRow, position: 'before-items' | 'after-items', index: number): HTMLElement   // one builder for both ends (round 3, 4:2); index = position within its own array (round 3c, 5:1 keep)
protected createPopupListActionRowContentEl(row: LLSelectPopupListActionRow): HTMLElement | null
protected isPopupListActionRowDisabled(row: LLSelectPopupListActionRow): boolean
protected onPopupListActionRowActivated(row: LLSelectPopupListActionRow): void
```

- Open naming call: `createContentElFn` inside the descriptor (the container is named by the descriptor type) versus the fully spelled `createActionRowContentElFn` (two reviewers read s7a.3 as requiring the container word).
- Row element, mirroring `createItemEl`: `div`, `role="option"`, index id, `itemClass` + `popupListActionRowClass`, `aria-label` = `textFn()` only when custom content is present (plain text otherwise), `aria-disabled` + `itemDisabledClass` when disabled, no click handler while disabled, no `aria-selected`, no `data-chosen-state`.
- Ring: one internal position over [choose-all, rows before items, items, rows after items]; protected `focusedIndex` / `setFocusedIndex` stay item-based. Home / End = first / last enabled ring entry; PageUp / PageDown clamp across the ring; disabled rows skipped in both directions; the empty-item-list early return goes away. Initial focus: first chosen item, else choose-all, else first enabled item, else nothing - never an action row; a filter keystroke never lands on a row; typeahead never matches a row. A focused row that disables itself keeps the active option and Enter does nothing.
- Refresh: rows rebuilt on every list render and after every chosen change in both variants (`fireChange` paths), plus on `rerender()`; `textFn` and `disabledFn` evaluated once per row render.
- Filter: rows stay rendered under a query; the item-only no-results status may show next to them ("no matching items" wording); creatable rows deferred.
- AngularJS: one expression attribute per end evaluating to an array, read once at link; `onActivate` wrapped in the digest / `$exceptionHandler` guard like the other event expressions; `textFn` validated as a function.

## Change list once ratified (moves together, CLAUDE.md), in two phases

- Phase 1, pinned slots: `src/base.ts` (settings, defaults, classIdMap keys, fields, the four protected methods, constructor wiring, the Esc listener, the `close()` focus-return generalization, inline `flex: none`); A11Y.md (the conditional tab-stop contract replacing the "one tab stop" line, the filter-active Tab row, the choose-all "Tab keeps meaning leave the widget" line, the "Tab-to-commit" open question; slot rows in the Elements and Focus sections; the APG deviation recorded next to the multi-select one); DESIGN.md section; naming-conventions.md s4 / s7 tables; the "group header" -> "group label" prose sweep; rules for both classes in all five themes; README capabilities table plus one recipe; demo section; tests (structure, Esc, focus return, Tab order within jsdom's limits); `angularjs/` `ll-popup-header-content-fn` / `ll-popup-footer-content-fn` (the ui-select bridge needs nothing: ui-select 0.19.8 has no header / footer slot); TODO.md manual verification (real-browser Tab / Shift+Tab traversal, Esc from a slot, focus return, shadow DOM hosting, a screen-reader pass).
- Phase 2, action rows: the ring redesign in `src/base.ts` (choose-all internalized as position 0; `handleKeydown`, `focusInitial`, `syncFocusedIndexToDom`, both in-place replace paths, the typeahead matcher's exclusion); the row builders and refresh path; a private rename of the keyboard enum `LLSelectAction`; A11Y.md (the second deviation, ring order, initial-focus and self-disable rules, the choose-all self-hide asymmetry); DESIGN.md; naming tables; themes (`popupListActionRowClass`); README rule for slot vs row plus the "Restore defaults" recipe; demo (a multiple with "Restore defaults" and "Clear all" rows); tests (ring order, Home / End, disabled skip, empty-list reachability, refresh on chosen change, typeahead exclusion); `angularjs/` `ll-popup-list-action-rows-before-items` / `-after-items`; TODO.md (NVDA / VoiceOver pass for option rows without `aria-selected`; the reserved `visibleFn(query)` slot for creatable rows).

## Rejected or deferred

- Wrapper (Ant Design `popupRender` style): hands out the positioner's measured element and lets a setting restructure the ARIA tree.
- Recipe only (`popupEl.append`): promises every `popupEl` child is app-writable (wider than two named slots), cannot fix the Esc / focus-return gaps, has no theme class, and is invisible in the type surface.
- Per-open or per-render rebuilds of SLOT content: the `setChosenItems` -> `rerender()` self-rebuild defect above. (Rows are rebuilt freely: focus never sits on them.)
- Always-built slot containers: two more resting nodes per instance with no ARIA-id or pack-string reason to exist while closed.
- App-supplied arbitrary rows inside the listbox: a listbox may own only options / groups; superseded by library-built action rows.
- A generic row type mirroring the item layer (`rowToStringFn(row)` ...): a class type parameter and duplicated item machinery for a few closures.
- Flat one-row-per-end settings: cannot hold "Restore defaults" plus "Clear all".
- Folding the choose-all row into the descriptor: its tri-state, `aria-selected`, `data-chosen-state`, self-hiding and `hideChosenRows` rules would bloat every row or be lost.
- Deferred together: creatable rows (`visibleFn(query)`, exact-match test, Enter precedence, the ui-select `tagging` mapping) and any ctx param (the open TODO.md callback-context review).
