# Optgroup / option grouping - research notes (PARKED)

Status: **research only, not implemented.** Phase 10 (optgroup support) is parked
behind Phase 9 (`disabled`), because the hardest part of grouping - a disabled
*group* - is meaningless until item-level and control-level `disabled` exist.
Resume this after `disabled` lands. See `TODO.md`.

This file records how the native control and the main libraries model grouping,
so the eventual API decision is grounded rather than guessed.

## How the ecosystem models grouping

Three distinct patterns:

| Source | Model | Shape | Group key from |
|---|---|---|---|
| native `<optgroup>` | nested structure | `<optgroup label>` wraps `<option>`; single level; `disabled` disables the whole group | structural containment |
| select2 | nested structure | `{ text, children: [...] }` | structure |
| choices.js | nested structure | `{ label, id, disabled, choices: [...] }` | structure |
| react-select | nested structure | `{ label, options: [...] }` + `formatGroupLabel({label, options})` | structure |
| **MUI Autocomplete** | **flat + function** | flat `options[]` + `groupBy(option) => key` + `renderGroup({group, children})` | function, at render time |
| Downshift / Headless UI | DIY (headless) | app renders headers itself; hook tracks a flat index | app's responsibility |

## Key findings

1. **Single level only is the norm.** Native forbids nested optgroups; select2
   errors if you nest. Whatever we do, one level of grouping is enough.

2. **The library whose architecture most resembles llselect (MUI Autocomplete)
   uses a function on a flat list**, not a nested structure. Its docs state the
   grouping "happens during rendering, not in the data structure itself", and
   warn: "Ensure that the options are sorted by the same dimension they are
   grouped by to avoid duplicate headers." That is exactly the
   "consecutive-equal-label = one group" (contiguous-run) semantic.

3. **The headless libraries closest to llselect's philosophy (Downshift,
   Headless UI) push grouping to render time over a flat index** - which is
   precisely llselect's existing `itemEls[i] <-> visibleItems()[i]` model.
   Downshift flags this as a "complex" pattern because keyboard nav depends on
   correct index tracking; llselect already solved that tracking.

4. **The majority (native + select2 + choices + react-select) use a nested
   structure**, which is the most familiar shape when migrating from native
   `<optgroup>` or those libraries, and the only one that cleanly carries
   per-group metadata (a disabled group, a group icon).

## Leading direction (to confirm when we resume)

`groupLabelFn?: (item: T) => string | null` - flat items, grouping derived at
render time. Rationale:

- Keeps the single flat `items` source of truth; no dual representation
  (DESIGN.md explicitly avoids the dual-write-channel pattern that bit
  select2 / choices.js).
- Matches the `*Fn` settings convention (`compareFn`, `filterFn`).
- Smallest change: only `renderPopupList` (emit group-label rows) plus two CSS
  class names; the whole focus / selection / keyboard / lazy-render machinery is
  untouched, because group labels are NOT added to `itemEls` and so are skipped
  by keyboard nav for free.
- Has direct external precedent (MUI `groupBy`), contiguous semantic included.
- Filtering composes for free: filter the flat list, regroup survivors at
  render; empty groups vanish.

Open tension: a nested structure is more native-familiar and is the clean way to
carry per-group metadata. That advantage is currently moot because llselect has
no `disabled` concept yet - which is why `disabled` goes first. Revisit whether
per-group metadata (disabled group, group icon) is wanted before locking this.

## Design sketch for when we resume (not decided)

- Grouping semantic: consecutive items with the same `groupLabelFn` result form
  one group; a new label inserts a section header. Preserves `visibleItems`
  order and index alignment exactly.
- ARIA: group container `role="group"` with `aria-label="<label>"`; the visible
  label element gets `.llselect-group-label`, `role="presentation"`,
  `aria-hidden="true"`. (Matches the APG grouped-listbox example.)
- Scroll math: `ensureVisibleInScroll` uses `offsetTop` (relative to
  offsetParent); nesting items inside group containers can break it. Switch to a
  `getBoundingClientRect`-delta computation so it is correct regardless of theme
  CSS.
- Label customization: start with a plain string (like `templateItem`); add a
  `renderGroupLabelFn` later if needed (cf. react-select `formatGroupLabel`,
  MUI `renderGroup`, which also receive the group's items for count badges).
- Group disabled: a disabled group disables all its items - layers on top of
  item-level `disabled`. This is the dependency that makes `disabled` come
  first.

## Sources

- [MDN: `<optgroup>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/optgroup)
- [select2 data format](https://select2.org/data-sources/formats/)
- [choices.js](https://github.com/Choices-js/Choices)
- [react-select components / formatGroupLabel](https://react-select.com/components)
- [MUI Autocomplete (groupBy / renderGroup)](https://mui.com/material-ui/react-autocomplete/)
- [Downshift useSelect](https://www.downshift-js.com/use-select/)
- [WAI-ARIA APG: grouped listbox example](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-grouped/)
