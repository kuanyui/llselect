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
- [ ] **Phase 10** - optgroup support (`role="group"` + `role="presentation"`
      label, keyboard skips labels). **PARKED**. A disabled group layers on the
      Phase 9 item-level `disabled` (now done). Design research (how native /
      select2 / choices / react-select / MUI / Downshift model it, and the
      leading `groupLabelFn` direction) is recorded in `optgroup-research.md`.

A11Y model (locked, see `A11Y.md`): two ARIA modes picked by `searchable`.
`searchable: true` uses APG "Combobox with list autocomplete" (focus on the
search input, `aria-activedescendant` on the input, trigger is a `button`).
`searchable: false` keeps APG "Combobox (select-only)" (focus on the trigger,
trigger keeps `role="combobox"`). The input is always built into the DOM, just
`hidden` when off, so a future runtime toggle (e.g. `minimumResultsForSearch`)
is a CSS flip rather than a DOM rebuild. Tab leaves the widget; Esc clears the
filter then closes; filtering is IME-aware (composition-guarded).

## API design decisions (open)

- [x] **`renderTriggerContentFn` settings callback** - DONE. `(ctx) => HTMLElement
      | string | null` on single / multiple (variant-specific `ctx`). Customise
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
- [ ] **`renderItemContentFn` settings callback** - the no-subclass path for rich
      item content (icon / checkbox / multi-line HTML). Library keeps the option
      element + wiring; the fn fills the content (`(item, ctx) => HTMLElement |
      string | null`). Until added, rich items need a `createItemEl` subclass
      (the escape hatch). Decide escape-hatch shape: keep `createItemEl` subclass,
      or add a `decorateItemFn(el, item)` setting.
- [ ] **`onChange` diff context** - decide whether to pass `previousChosenItem(s)`
      alongside current, so users can compute added/removed without tracking.

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
- [x] `rerenderPopupListItem(item)` - O(1) single-item DOM update; multi-select
      toggle uses it so flipping one selection in a 10k-item list does not
      rebuild the whole list (verified by the 10k demo + a unit test that the
      untouched items keep the same DOM nodes).

## Notes

- Architecture / naming rationale: see `DESIGN.md`.
- Keyboard / focus / ARIA behavior contract: see `A11Y.md`.
- Code style rules: see `../CLAUDE.md`.
