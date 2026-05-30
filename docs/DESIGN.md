# Design notes

Architecture and API conventions for llselect. Code-style rules (braces,
language, dash characters, etc.) live in `../CLAUDE.md`; the keyboard / focus /
ARIA behavior contract lives in `A11Y.md`. This file documents **what** to
build and **why**, not how to write each line.

## API naming conventions

### Function-typed settings

Different categories of callbacks use different markers so callers can tell
at a glance how the library will use the function. The marker is part of the
**field name**, not the type alias.

| Category | Marker | Example |
|---|---|---|
| Event callback | `on*` prefix | `onChange`, future `onOpen` |
| Other function (comparator, renderer, transformer) | `*Fn` suffix | `compareFn`, `renderArrowFn` |

Rationale:

- **`on*`** prefix is universally recognized in the JS ecosystem (DOM events, React
  props) as "callback the library invokes when an event happens". Use this
  for things the library fires AT the caller in response to user actions.
- **`*Fn`** suffix disambiguates settings whose value is a function the library
  invokes proactively (to compute, format, or produce DOM). Without the
  suffix, names like `renderArrow` read as a verb / method, creating doubt
  about whether the setting is a function or a config flag.
- The two prefixes/suffixes are mutually exclusive and have different
  semantic flavors (reactive vs. invertive), so combining them (e.g.
  `onChangeFn`) is never necessary.

Apply this rule to all new function-typed settings.

### Settings vs methods

llselect splits surface area by mutability:

- **Settings** (constructor argument, frozen after): immutable configuration -
  `placeholder`, `compareFn`, `onChange`, `renderArrowFn`, `outsideClickBehavior`,
  `cssClassPrefix`. Behavior knobs.
- **Methods** (mutate state, fire side effects): `setItems`,
  `setChosenItem` (single) / `setChosenItems` + `toggleItem` (multi), `open`,
  `close`, `rerender`. The data the component currently holds, plus lifecycle
  actions.

Never put mutable state (`items`, `chosen`, etc.) in settings as a
"convenience". Dual write channels caused subtle bugs in select2 / choices.js
that we deliberately avoid.

### Element family naming

Element refs and the CSS classes that style them share a prefix so the
relationship is obvious from the name alone:

```
rootEl              .llselect-root
triggerEl           .llselect-trigger
  triggerContentEl  .llselect-trigger-content
  triggerArrowEl    .llselect-trigger-arrow
popupEl             .llselect-popup
  popupListEl       .llselect-popup-list
                    .llselect-item
                    .llselect-item-focused
                    .llselect-group        (phase 9)
                    .llselect-group-label  (phase 9)
```

Direct children of a major family get the family's prefix
(`triggerContentEl`, `popupListEl`). Deeper / structurally-distinct concepts
(`item`, `group`) stand on their own without an inherited prefix - they're
universally meaningful in the library's namespace.

### ARIA roles vs JS names

ARIA role attribute values (`"combobox"`, `"listbox"`, `"option"`, `"group"`,
`"searchbox"`, `"checkbox"`) are spec strings and stay verbatim in
`setAttribute` calls. JS-side names are independent and follow the rules
above (e.g. our `role="listbox"` element is called `popupListEl`).

The full keyboard / focus / ARIA behavior contract is in `A11Y.md`. Note the
target model moves the `combobox` role onto the search input and demotes the
trigger to a `button`; today's code still carries `role="combobox"` on
`triggerEl` as a transitional state until the search input lands (Phase 8).

## Library scope

llselect is a **low-level** select library. It provides:

- DOM scaffold + ARIA wiring
- Positioning, keyboard navigation, lifecycle (open/close/rerender)
- Stable CSS class hooks for every structural slot

It does **not** provide:

- Default visual styling (themes are opt-in, shipped separately)
- Item content beyond the configured `templateItem` (no built-in icon /
  description / avatar slots inside items)
- Tag chips in multi-select trigger (user customises via subclass /
  future `renderTriggerContentFn`)

When in doubt, the answer is "lib provides a structural slot; the user
fills it". This keeps API surface tight and avoids feature creep.

## Rendering model

- State setters (`setItems`, `setChosenItem`, `setChosenItems`, `toggleItem`,
  `selectAll`, ...) trigger the needed re-render automatically and fire
  `onChange` only when the value actually changed (compared via `compareFn`).
- **Render granularity matters at scale.** Rebuilding the whole popup list is
  O(n) DOM work; for large lists that dominates. So:
  - Bulk changes (replace the whole set, select/deselect all, `setItems`)
    rebuild the list via `renderPopupList` / `rerender`.
  - Single-item changes (multi-select `toggleItem`) use
    `rerenderPopupListItem(item)`, which replaces just that one item's
    element. DOM work stays O(1) regardless of list size, so toggling one
    selection in a 10k-item list does not recreate 10k nodes. (The lookup to
    find the item is O(n), but a comparison loop is negligible next to DOM
    mutation + reflow.) This beats vdom frameworks, which must diff the whole
    list on a state change.
- External mutation of an item object's properties (e.g.
  `users[0].name = 'X'`) is **not** auto-detected. Call `rerender()` to
  reflect the change in the DOM. `rerender` is a pure visual refresh: it
  does not fire `onChange` and does not run `afterItemsChange`.

## Search box (Phase 8) architecture

Locked decisions for the searchable variant. Keyboard / focus / ARIA contract
is in `A11Y.md`.

- **`<input>` is always built** into `popupEl` above `popupListEl`, even when
  `searchable: false`. The non-searchable case carries the `hidden` attribute
  (not `disabled`, not `readonly`). Cost: one unused element when not needed.
  Benefit: future runtime toggle (select2-style `minimumResultsForSearch`,
  setItems crossing a threshold, ...) is a CSS flip rather than a DOM rebuild.
- **Focus host branches by current searchable state**, not by DOM existence:
  - `searchable: true`: trigger becomes `role="button"`
    (`aria-haspopup="listbox"`), focus moves to the input on open,
    `aria-activedescendant` lives on the input.
  - `searchable: false`: trigger stays `role="combobox"`, focus stays on the
    trigger, `aria-activedescendant` lives on the trigger. Identical to the
    pre-Phase-8 behaviour - non-search selects regress nowhere.
- **No subclass split.** Search is a capability setting on the existing
  `LLSelectSingle` / `LLSelectMultiple`. Subclassing per feature would
  multiply combinatorially (search x optgroup x ...); a setting composes.
- **Settings:** `searchable: boolean` (default `false`);
  `filterFn: (item, query) => boolean | null` (default `null` =
  case-insensitive substring on `templateItem`). IME-aware filtering
  (composition-guarded) is part of the contract; see `A11Y.md`.

## Popup width policy

Locked: the positioner sets `popupEl.style.width` to the trigger's measured
width on every reposition (`positioning.ts`). Long items wrap (themes default
to `white-space: normal`); long chosen text in the trigger is ellipsized
(`overflow: hidden; text-overflow: ellipsis` on `.llselect-trigger-content`).

### Empirical baselines

Tested 2026 against the native control and select2 on Firefox + Chromium.
Captured here so future width / overflow discussions have a shared reference.

| implementation | trigger width | popup width vs trigger | long items in popup | long chosen in trigger |
|---|---|---|---|---|
| native `<select>`, no CSS width | grows to fit widest item | Chromium: = trigger, can overflow viewport (popup escapes). Firefox: popup content gets trimmed (render anomaly observed). | n/a (trigger is already wide) | n/a |
| native `<select>`, CSS width set | fixed by CSS, overflow clipped (no ellipsis) | Chromium: independent of trigger, can overflow viewport. Firefox: popup content gets trimmed. | n/a / depends on browser | clipped |
| select2, no CSS width | grows to fit widest item | matches trigger (with an internal JS cap around ~1021px; appears built-in) | wrap; trigger gets ellipsis if wider than the cap | n/a / ellipsis past cap |
| select2, CSS width set | fixed by CSS, overflow ellipsized | matches trigger | wrap (potentially many lines) | ellipsis |
| **llselect** | fixed by CSS only - library never auto-fits to widest item | always = trigger width (positioner inline `width`) | wrap (default theme) | ellipsis (default theme) |

### Rationale

1. **Predictable.** Trigger width is whatever the user's CSS says it is; the
   library never measures items and never auto-resizes the trigger or the
   popup. No "popup randomly wide because one row is long" surprise.
2. **No viewport-overflow surprise.** Because popup matches trigger, the popup
   never sticks out horizontally past the trigger's footprint.
3. **Long-text full-fidelity by default.** Items wrap rather than truncate, so
   no information is hidden behind a hover tooltip.
4. **Users opt in to other policies via their own CSS** - e.g. set
   `.llselect-item { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`
   plus a `title` attribute in `createItemEl` for hover preview. The library
   does not add an API setting for this until a real need emerges; if
   popup-grows-to-content is genuinely wanted later, a setting
   `popupWidthPolicy: 'anchor' | 'auto'` would gate the positioner.
