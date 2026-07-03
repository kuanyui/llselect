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

### Customization model: settings configure, subclassing extends

User-facing guide (when to pick which, with examples): README "Customization".
Two layers, not two competing mechanisms:

- **Settings configure; subclassing extends.** A normal user configures one
  instance via `*Fn` settings (no `extends`). Subclassing is for *extending* the
  library - a new select type, a framework wrapper, a core behavior change.
- **Each customization point is a `protected` method whose default reads its
  `*Fn` setting.** The library calls the method directly:
  - `itemToString(item)` - default `= itemToStringFn(item) ?? String(item)`.
  - `renderTriggerContent()` (single / multiple) - default reads
    `renderTriggerContentFn(ctx)` first, else the variant's label / count. `ctx`
    is variant-specific (`chosenItem` for single, `chosenItems` for multi).
- **Override = replace.** Overriding the method replaces its default (setting
  included); the override wins, by plain OO. There is no resolver forcing the
  setting to win - that machinery was removed, it fought the low-level design.
  An extender who still wants the setting reads it / calls `super`.

So: configure with settings (the common path); override `protected` methods only
when extending. The two coexist with no precedence fight.

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
                    .llselect-group        (phase 10)
                    .llselect-group-label  (phase 10)
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
- Arbitrary trigger markup out of the box - the built-in multi-select displays
  are `'count'` and `'tags'` (`triggerDisplay`); `createTriggerContentElFn` takes
  over the trigger entirely. See "Tags (triggerDisplay)".

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

Group-level disabled (a disabled optgroup disabling its items) is specified in
"Optgroup (Phase 10)" below; it layers on this item-level disabled.

## Optgroup (Phase 10)

Decided: grouping is a **derived projection of the flat `items` list**, not a
nested data structure. `items` stays `T[]`; a setting maps each item to a group
*key*, and the group's label + disabled state are derived from that key. Design
research (how native / select2 / choices / react-select / MUI / Downshift model
it) is in `optgroup-research.md`.

### Data model: flat + derived, mirroring the item layer

Rejected: a nested shape (`(T | { label, items: T[] })[]` or a second
`setGroups()` channel). Chosen: flat items + `*Fn`s that derive the group. The
group layer is a **complete mirror of the item layer** - same four concerns,
same shapes:

| concern  | item layer               | group layer                             |
|---|---|---|
| identity | `T`                      | `GK` (grouping key; class `<T, GK = string>`) |
| equality | `compareFn(a, b)`        | `groupKeyCompareFn(a, b)`               |
| display (text) | `itemToStringFn(item)` | `groupKeyToLabelFn(key)`             |
| display (rich) | `createItemContentElFn(item)` | `createGroupLabelContentElFn(key, items)` |
| full control (subclass) | `createItemEl` (protected) | `createGroupEl` (protected) |
| disabled | `itemDisabledFn(item)`   | `groupDisabledFn(key)`                  |

Why this shape, in this codebase specifically:

- **Single source of truth.** `items` stays the only data channel. A nested
  shape is a second write channel - exactly the select2 / choices.js dual-write
  pattern this project already rejects ("Settings vs methods" above).
- **Identity, not display, drives behavior.** `itemDisabledFn` takes the item
  `T` (identity), never `itemToString(item)` (display). Grouping obeys the same
  rule: membership and group-disabled are keyed on `GK`; the human label is a
  separate `GK -> string` projection. So renaming a label (i18n) never changes
  which items group together or which group is disabled.
- **`GK` is fully generic, mirroring `T`.** The class is `<T, GK = string>`; the
  default leaves every existing `LLSelect*<T>` call unchanged. A number / object
  key is allowed exactly as `T` is - equality is asked via `groupKeyCompareFn`
  (default strict `===`), the same way `compareFn` handles arbitrary `T`. This
  dodges the hard-coded-string-key trap where widening the key type later would
  be a breaking change.
- **`GK` never touches the DOM.** Group containers get an index-based id
  (`-group${index}`, like items' `-item${index}`); the `aria-label` comes from
  `groupKeyToLabelFn` (visible content optionally from `createGroupLabelContentElFn`),
  disabled state from a computed boolean. So an
  object key needs no `String(key)` serialization anywhere.
- **Settings compose; no subclass split.** Same reasoning as the search box: a
  capability that combines with others (search x optgroup x ...) must be a
  setting, not a subclass, or the class count multiplies.
- **Nested's unique wins are out of scope.** A nested shape is only strictly
  needed for empty groups (a header with no items), one item in multiple groups,
  or group order decoupled from item order. Native `<select>` supports none of
  these and neither do we ("Library scope"), so we give up nothing real.

Honest cost (accepted): grouping requires the data to be pre-sorted by group
(see contiguous-run below); llselect does not reorder items to gather groups.

### Settings

All live on `LLSelectBaseSettings<T, GK>` (single + multiple; `GK = string`
default). Named by return type per the callback convention ("Function-typed
settings"; `naming-conventions.md` s3). Each `null` documented per CLAUDE.md:

- `itemToGroupKeyFn: ((item: T) => GK | null) | null` (default `null`). The one
  setting that turns grouping on; returns the key of the group an item belongs
  to. Two distinct `null`s:
  - **setting `null`** (default): grouping off entirely - flat list, no headers,
    zero behavior change from today.
  - **fn returns `null`** for an item: that item is in no group and renders
    ungrouped (like an `<option>` outside any `<optgroup>`); consecutive
    ungrouped items are not gathered into one group.
  Backed by `protected itemToGroupKey(item)` (Customization model: override to
  replace).
- `groupKeyCompareFn: ((a: GK, b: GK) => boolean) | null` (default `null` =
  strict `===`). Decides whether two adjacent items share a group (see
  contiguous-run). Mirrors `compareFn`; only worth setting when `GK` is an object
  without usable reference identity.
- `groupKeyToLabelFn: ((groupKey: GK) => string) | null` (default `null` =
  `String(groupKey)`). The `GK -> display text` projection; the i18n seam. Backed
  by `protected groupKeyToLabel(key)`.
- `groupDisabledFn: ((groupKey: GK) => boolean) | null` (default `null` = no
  group disabled). `true` = every item in that group is treated as disabled.
  Backed by `protected isGroupDisabled(key)`.
- `createGroupLabelContentElFn: ((groupKey: GK, itemsInGroup: readonly T[]) => HTMLElement | null) | null`
  (default `null`). The rich-header seam, mirroring `createItemContentElFn`: fills the
  header's visible content (icon, count badge; cf. react-select `formatGroupLabel`,
  MUI `renderGroup`). `null` (setting or returned) = plain text from `groupKeyToLabel`.
  The accessible name stays `groupKeyToLabel` (container `aria-label`); the label
  element stays `aria-hidden`. `itemsInGroup` (the group's items) is what makes
  counts / summaries possible without recomputing the grouping. Backed by `protected
  createGroupLabelContentEl(key, itemsInGroup)`.

The full-control escape hatch mirrors `createItemEl`: `protected createGroupEl(key,
index, items, itemEls)` builds the whole group container (id, `role="group"`,
`aria-label`, label element, items) and is overridable for a custom group element.

### Grouping semantic (contiguous-run)

Consecutive visible items whose keys are equal (per `groupKeyCompareFn`) form one
group; a differing key opens a new section header. Items whose key is `null` are
ungrouped. This preserves `getVisibleItems()` order and the
`itemEls[i] <-> getVisibleItems()[i]` index alignment exactly. The known trap
(same as MUI's `groupBy`): if the data is not sorted by group, a key that
reappears after a gap produces a second header for the same group. The render
pass detects an already-closed key reappearing and `console.warn`s once - it does
not reorder the data (caller's responsibility) and does not otherwise change
behavior.

### Interaction with existing machinery

- **Keyboard / index alignment: free.** Group headers are NOT added to
  `itemEls`, so `getVisibleItems()` stays a flat `T[]` and keyboard nav skips
  headers with no extra logic.
- **Filtering: composes for free.** Filter the flat list first, regroup the
  survivors at render; a group whose every item was filtered out emits no header
  (empty groups vanish).
- **Disabled layering.** `isItemDisabled(item)` also returns `true` when the
  item's group is disabled (`isGroupDisabled(itemToGroupKey(item))`) - so every
  existing item-disabled behavior (no click selection, keyboard skip,
  `aria-disabled`, selection retention, bulk-op skipping) covers group-disabled
  automatically, with no new code paths. This is the layering the Phase 9 design
  deferred here.
- **Render granularity unchanged.** Toggling one item's selection does not change
  its group membership, so multi-select `replacePopupListItemElInDom` stays O(1)
  DOM work; the group structure is untouched.

### ARIA

Matches the APG grouped-listbox example. Each group is a container
`role="group"` with `aria-label` set to `groupKeyToLabelFn(key)`; the visible
label element carries `.llselect-group-label` and `aria-hidden="true"` (its text
is already the group's accessible name via `aria-label`, so it must not be
announced twice). A disabled group's container gets `aria-disabled="true"` +
`data-disabled`. The keyboard / focus contract is in `A11Y.md` ("Grouping").

### Implementation note (resolved)

`ensureVisibleInScroll` (keyboard.ts) uses `getBoundingClientRect`-delta math
(offsetParent-independent), NOT `offsetTop`, so it stays correct when items nest
inside group containers regardless of theme CSS - including a `position:
relative` group. Measured on a 10k list in Firefox + Chromium
(`demo/bench-reflow.html`): rect and offsetTop cost the same per keyboard move
(< 0.15% of a 60fps frame), and offsetTop was confirmed correct ONLY while groups
stay `position: static` (289575px off once a group is positioned) - exactly the
theme fragility rect removes at zero cost.

## Tags (triggerDisplay)

`LLSelectMultiple` shows chosen items two ways, picked by the `triggerDisplay`
setting: `'count'` (default, a "3 / 10 selected" summary) or `'tags'` (one
removable chip per chosen item). Tags is a capability ON `LLSelectMultiple`, not a
subclass - same rule as searchable.

### Why on LLSelectMultiple, not a subclass

- **Not a new kind of select** - still a multi-select, just a different trigger
  display. `renderTriggerContent` already owns the trigger's look (it renders the
  count summary); tags is another branch of it, not a new type.
- **Capability = setting** (DESIGN "Search box"): tags must combine with searchable
  / optgroup; a subclass would explode into `LLSelectTags` x `LLSelectSearchable`
  x ... A setting composes.
- **Single has no tags** (one chip is meaningless), so it lives on Multiple, not
  Base.

### Two-layer content, mirroring the item layer

The overlap with `createTriggerContentElFn` is resolved the same way item / group
content is - two granularities:

| granularity | item | trigger-tags |
|---|---|---|
| take over the whole element | `createItemEl` | `createTriggerContentElFn` (whole trigger) |
| fill only the visible content | `createItemContentElFn` | `createTagContentElFn` (one chip) |

- Precedence: `createTriggerContentElFn` (full control) > `triggerDisplay: 'tags'`
  > `'count'`. Same as `createItemEl` over `createItemContentEl`.
- `createTagContentElFn: (item) => HTMLElement | null` fills one chip's visible
  content; the library owns the chip container, remove button, and aria. `null` =
  plain `itemToString`. The remove button's icon is separately fillable via
  `createTagRemoveElFn` (see "Remove button" below).
- Protected chain (each overridable): `renderTriggerContent` -> `createTagsEl`
  (chip strip) -> `createTagEl(item)` (one chip; assembles content + remove) ->
  `createTagContentEl(item)` / `createTagRemoveEl(item)` (each fills one half and
  reads its `*Fn` setting).

### Remove button + ARIA (select2-style MVP)

Each chip's remove control is `<button aria-label="Remove <itemToString>"
tabindex="-1">`; its click `stopPropagation`s (so it never toggles the popup) then
calls `toggleItem`, which re-renders the trigger. `tabindex="-1"` keeps it out of
the tab order - keyboard users remove via the popup (deselect), matching select2.
Full chip keyboard nav (grid pattern) is deferred: APG has no standalone tag/token
pattern and it would fight the combobox `aria-activedescendant` model. See A11Y.md
"Tags". By default the button is empty and the x is a CSS glyph
(`.llselect-tag-remove:empty::before { content: '\00d7' }`), so the theme owns the
look and the accessible name stays the `aria-label`. `createTagRemoveElFn: (item)
=> HTMLElement | SVGElement | null` optionally fills a custom icon (mirrors the
clear button's `createClearElFn`; the icon is decorative, never the accessible
name); `protected createTagRemoveEl(item)` builds the whole button and is the
full-control override, mirroring `createClearEl`.

## Clear button (clearable)

`clearable: boolean` (default false) shows an x button that empties the selection.
It lives in its OWN trigger slot, next to the arrow:

    triggerEl > [ triggerContentEl | clearEl (.llselect-clear) | triggerArrowEl ]

### Own slot = no collision with createTriggerContentElFn

Same trick as the arrow: clear and arrow are separate slots, so
`createTriggerContentElFn` (which only replaces the content slot) never touches
them. This is why the arrow never needed conflict resolution - it was never in the
content slot - and clear copies that exactly.

### What the library owns vs what you fill

- Library owns: the `<button>`, its click (`stopPropagation` so it never toggles
  the popup, then `clearSelection`), `aria-label="Clear selection"`,
  `tabindex="-1"`, and hide-when-empty (theme hides it under
  `.llselect-trigger[data-empty='true']`).
- You optionally fill the icon via `createClearElFn: () => HTMLElement |
  SVGElement | null` (mirrors `createArrowElFn`); `null` = theme CSS glyph
  (`.llselect-clear:empty::before { content: '\00d7' }`).
- `protected clearSelection()`: base no-op; single -> `setChosenItem(undefined)`,
  multiple -> `setChosenItems([])`. Both go through the normal setters, so
  `onChange` fires with the empty value - no separate `onClear`. Clear means "back
  to empty / placeholder", not "back to some default option" (do that yourself in
  `onChange` if wanted).

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
