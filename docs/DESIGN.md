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
| Event callback | `on*` prefix | `onChange`, `onOpen`, `onClose` |
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

### Customization without subclassing

Display hooks exist as BOTH a protected method (subclass) AND a function setting
(no subclass), so the common cases need no `extends`:

- `itemToString(item)` method  <->  `itemToStringFn(item)` setting - item label.
- `renderTriggerContent()` method  <->  `renderTriggerContentFn(ctx)` setting -
  trigger display (e.g. tag chips). `ctx` is variant-specific (`chosenItem` for
  single, `chosenItems` for multi); return a string / element, or `null` to fall
  back to the default.

Precedence: the **setting wins over a method override**. The library never calls
the overridable method directly - it goes through a resolver (`effectiveItemToString`
for labels, `applyTriggerContentSetting` for trigger content) that checks the
setting first. So a per-instance setting beats a class default even when a
subclass overrode the method - passing `itemToStringFn` to `new DerivedSelect()`
is never silently ignored just because the subclass overrode `itemToString`. This
makes the settings reliable for "use without subclassing" (and for framework
wrappers built on a subclass). Subclassing stays the route for behavior with no
setting equivalent (e.g. `onItemClick`).

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
- Item content beyond the configured `itemToString` (no built-in icon /
  description / avatar slots inside items)
- Built-in tag chips in the multi-select trigger (the `renderTriggerContentFn`
  setting is the hook to build them yourself)

When in doubt, the answer is "lib provides a structural slot; the user
fills it". This keeps API surface tight and avoids feature creep.

## Rendering model

- State setters (`setItems`, `setChosenItem`, `setChosenItems`, `toggleItem`,
  `chooseAll`, ...) trigger the needed re-render automatically and fire
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
  case-insensitive substring on `itemToString`). IME-aware filtering
  (composition-guarded) is part of the contract; see `A11Y.md`.

## Disabled (Phase 9)

Two independent axes, modelled differently on purpose.

- **Control-level** (the whole select): runtime *state*, set imperatively.
  - `setDisabled(boolean)` + `isDisabled(): boolean`. Whole-control disabled is
    universally a boolean (a `disabled` prop in React libs; a method like
    choices.js `.disable()` / select2 in vanilla ones) - never a predicate. The
    method form matches both those vanilla libs and llselect's own state-via-
    method pattern. NOT a setting - disabled is mutable state like `items` /
    `chosenItems`, and this design keeps mutable state out of settings. Default
    enabled; to start disabled, call `setDisabled(true)` after construction.
  - `focusableWhenDisabled: boolean` setting (default `false`) - the only knob;
    controls whether a disabled trigger stays in the tab order.
  - Disabled trigger: `aria-disabled="true"`, `data-disabled="true"`, `tabindex`
    = `focusableWhenDisabled ? 0 : -1`. `open()` / `toggle()` / keyboard are
    no-ops; an open popup is closed by `setDisabled(true)`.

- **Item-level** (individual options): derived *property*, read declaratively.
  - `itemDisabledFn: (item: T) => boolean | null` setting (default `null` =
    nothing disabled). Matches react-select `isOptionDisabled` / MUI Autocomplete
    `getOptionDisabled` - the flat-generic-options libraries closest to llselect.
    A predicate is the only generic-`T` option: the data-field approach (native /
    Ant / choices / select2 carry `disabled` ON the option) needs the option to
    be an object with a known field, which is impossible when `T` is unknown.
    `protected isItemDisabled(item): boolean` is the internal helper (also for
    subclasses overriding `createItemEl`); not public. NO `setItemsDisabled`: a
    predicate subsumes it (it can read an external set and you call `rerender()`),
    keeps a single source of truth, avoids reconciling a disabled-set across
    `setItems`, and is faster - item identity is `compareFn`-based, so a
    maintained set is O(n*d) membership vs the predicate's O(1) property read.
    Evaluated once per item per render, never cached across renders (avoids
    react-select's stale-disabled-between-renders bug).
  - Disabled item: `aria-disabled="true"`, `.llselect-item-disabled` class, no
    click selection - selection is truly blocked, not merely `aria-disabled`
    (avoids MUI's disabled-options-still-selectable bug) - and skipped by
    keyboard nav (arrows / Home / End / Page land on the nearest enabled item; if
    none in the travel direction, focus stays).

Why the asymmetry (method for control, predicate for item): control-disabled is
an app decision not derivable from any item, and is universally a plain boolean;
item-disabled is typically intrinsic to the item (out-of-stock, no permission)
and, for a generic-`T` flat-options library, can only be asked via a predicate -
exactly what react-select and MUI Autocomplete do.

Cross-cutting:

- **Never the native `disabled` attribute - always `aria-disabled`.** Native
  `disabled` suppresses pointer + focus events, which blocks the hover / focus
  tooltip that would explain *why* a control is disabled. A custom control keeps
  the element perceivable. The library only exposes hooks (`aria-disabled` /
  `data-disabled` / `.llselect-item-disabled`); it never ships or wires a
  reason / tooltip itself (that would fight tooltip libraries' own
  `aria-describedby`).
- **Themes** convey disabled with `cursor: not-allowed` + opacity, never
  `pointer-events: none` (which would re-block hover tooltips).
- **Selection retention:** an already-chosen item that becomes disabled stays
  chosen (matches native: disabling a selected `<option>` keeps it selected).
  `setChosenItem(s)` is unrestricted - programmatic selection ignores disabled.
- **Bulk ops skip disabled:** `chooseAll` chooses every *enabled* item and
  preserves any already-chosen disabled item; `unchooseAll` clears enabled
  choices and preserves disabled-chosen; `toggleAll` compares only enabled items.

Group-level disabled (a disabled optgroup disabling its items) is deferred to
Phase 10; it layers on item-level disabled. See `optgroup-research.md`.

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
   `.llselect-item { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`.
   The library deliberately does NOT auto-set a `title` attribute on items
   so it never fights third-party tooltip libraries (Tippy / Floating UI /
   etc.). Users who pick ellipsis-on-items pick their own tooltip mechanism
   (subclass adding `el.title`, or a custom tooltip lib, or none at all).
5. **Popup-only width opt-in is available via setting**
   `popupWidthPolicy: 'match-trigger' | 'fit-content'` (default `'match-trigger'`).
   `'fit-content'` lets the popup grow to its content's natural width; if
   the popup would overflow the viewport's right edge it shifts left
   automatically (so `popup.x` can become smaller than `trigger.x`), and the
   popup's width is clamped to `viewport - 2 * VIEWPORT_PADDING`. The
   setting NEVER touches the trigger's width - that stays entirely
   CSS-driven.

The trigger ellipsizes its chosen-text by default in every shipped theme
(`.llselect-trigger-content { white-space: nowrap; overflow: hidden;
text-overflow: ellipsis; }`). This is non-negotiable in the default themes
because a wrapping trigger looks broken; user themes can override if they
genuinely want a multi-line trigger.
