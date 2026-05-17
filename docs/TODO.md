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
- [x] **Phase 4** - positioning module (flip, scroll/resize tracking, auto-close on anchor occlusion)
- [x] **Phase 5** - keyboard navigation (arrows / Home / End / PageUp-Dn / Enter / Esc, aria-activedescendant)
- [x] **Phase 6** - `LLSelectMultiple` (toggle, selectAll/deselectAll/toggleAll, aria-selected, aria-multiselectable)
- [ ] **Phase 7** - type-to-search (first-character typeahead on the input, works even when `readonly`)
- [ ] **Phase 8** - `filterFn` + search input (combobox host moves to the input, trigger becomes a `button`; see `A11Y.md`)
- [ ] **Phase 9** - optgroup support (`role="group"` + `role="presentation"` label, keyboard skips labels)

A11Y model (decided, see `A11Y.md`): APG "combobox with list autocomplete" -
focus on a single always-present input (readonly when filtering is off), list
driven by `aria-activedescendant`, Tab leaves the widget (native-select-like),
select-all is the first listbox `option`, Esc clears the filter then closes.

## API design decisions (open)

- [ ] **`renderTriggerContentFn` settings callback** - mirror the `renderArrowFn`
      pattern. Signature `({ chosenItem(s), items }) => HTMLElement | string | null`.
      Lets users customise trigger display (e.g. tag chips) without subclassing.
      Single default = chosen item label / placeholder; multi default = count summary.
- [ ] **`onChange` diff context** - decide whether to pass `previousChosenItem(s)`
      alongside current, so users can compute added/removed without tracking.

## Done decisions (for reference)

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
