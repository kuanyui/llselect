# Method naming conventions

> STATUS: PROPOSAL, under discussion. Nothing here is applied to the code yet.
> The goal: one verb = one behavior kind, so a reader knows from the verb alone
> whether a method touches the DOM, returns a value, or only mutates state.

This was triggered by noticing that `render`, `create`, `commit`, `sync`,
`recompute` are used with overlapping / contradictory meanings.

## 1. Current state (from a full inventory of every method, incl. private)

### 1a. Same verb -> different behaviors (collisions)

- **`render*`** spans THREE kinds:
  - writes DOM: `renderTrigger`, `renderTriggerContent` (x3), `renderTriggerArrow`,
    `renderTriggerDisabled`, `renderPopupList`, `rerender`, `rerenderPopupListItem`.
  - returns a value, NO DOM: `renderItemContent` (returns `HTMLElement|string|null`).
  - "produce content" sense in settings: `renderItemContentFn` / `renderArrowFn` /
    `renderTriggerContentFn` return values; the `render*` *methods* mostly write DOM.
- **`make*`**: `makeSvg` builds a DOM element; `makeClassIdMap` returns a data object
  (and bumps a module counter).
- **`set*`**: public state setters that re-render + fire callbacks (`setItems`,
  `setChosenItem(s)`, `setDisabled`) vs an internal nav mutator (`setFocusedIndex`).
- **`toggle*`**: open/close flip (`toggle`) vs chosen-set mutation (`toggleItem`, `toggleAll`).
- **`on*`**: settings events (`onChange/onOpen/onClose`) vs subclass hooks
  (`onOpened`, `onClosed`, `onItemClick`) vs a private DOM-event handler (`onSearchInput`).
- **`get*`**: field accessors (`getItems`, `getChosenItem(s)`) vs pure computation
  (`getActionFromKey`, `getUpdatedIndex`, `getVisibleViewport`).

### 1b. Different verbs -> same behavior

- "construct and return a detached DOM element": `build*` (buildTriggerEl,
  buildSearchInputEl, buildPopupEl, buildPopupListEl), `create*` (createItemEl),
  `make*` (makeSvg), and noun `*Svg` factories (triangleDownSvg, ...).
- "write renderer-returned content into DOM": `commit*`
  (commitTriggerContentReturnedByRenderer) vs the same logic inlined in `createItemEl`.
- "reflect state onto trigger DOM": `render*` (renderTriggerDisabled, renderTriggerArrow)
  vs inline attribute writes inside `open`/`close` (aria-expanded, data-state).
- "scroll / focus-into-view coordination": `capture*` (captureWindowScroll),
  `ensure*` (ensureVisibleInScroll), `sync*` (syncFocusedIndexToDom).

### 1c. Verb/behavior mismatches (verb implies X, body does Y)

1. `renderItemContent` - `render` implies "write DOM" but it only returns a value.
2. `makeClassIdMap` - `make` (value) but has a side effect (`++instanceCounter`).
3. `captureWindowScroll` - reads at call time, but the returned closure WRITES (scrollTo).
4. `getVisibleViewport` - `get` accessor that actually reads DOM.
5. `measureNaturalWidth` - read-flavored, but mutates `el.style.width` (restored after).
6. `rerender` vs `rerenderPopupListItem` - same prefix hides O(n) full rebuild vs O(1)
   single-element replace.

## 2. Proposed convention

Two carry-the-meaning SUFFIXES do the heavy lifting, so the verb does not have to:

- **`*El` suffix = the method returns a DOM element.** (`createItemEl`, `createTriggerEl`,
  `createSvgEl`.) No `El` => not a DOM element (so `createPositioner` is fine as-is).
- **`*ToDom` suffix = the method writes/syncs into existing DOM** (side effect, returns void).

Verbs:

| Verb                                | Meaning                                                                    | DOM?           | Returns?  |
|-------------------------------------|----------------------------------------------------------------------------|----------------|-----------|
| `create*`                           | construct + return a new object; add `El` when it is a DOM element         | builds it      | the thing |
| `compute*` / `get*`                 | derive or read a value and return it (no side effects)                     | no             | value     |
| `read*`                             | read out of the DOM/environment and return it                              | reads only     | value     |
| `commit<X>ToDom`                    | write already-computed content/element X into the DOM                      | writes content | void      |
| `sync<X>ToDom`                      | mirror one piece of state X onto DOM attributes/class/scroll               | writes attrs   | void      |
| `recompute*`                        | recompute a derived internal-state field (no DOM)                          | no             | void      |
| `set*`                              | public: set state (may trigger re-render + callback)                       | indirect       | void      |
| `attach*` / `detach*`               | add / remove event listeners                                               | listeners      | void      |
| `handle*`                           | handle a real DOM event (internal)                                         | via callees    | void      |
| `on*`                               | settings event OR subclass lifecycle hook ONLY (never an internal handler) | depends        | void      |
| `choose*` / `unchoose*` / `toggle*` | chosen-set domain operations                                               | indirect       | void      |
| `open` / `close` / `toggle`         | popup open-state                                                           | writes         | void      |
| `render*` / `rerender*`             | PUBLIC API ONLY: coarse "refresh the view"                                 | writes         | void      |

Key points:
- `render` is no longer an internal verb. Internally: produce with `create*El`, land
  content with `commit*ToDom`, mirror state with `sync*ToDom`. `render`/`rerender` survive
  only as the public `rerender()` (a deliberately coarse "refresh" for consumers).
- `create` no longer has to encode DOM-ness; the `El` suffix does. So `createPositioner`
  (non-DOM controller) and `createItemEl` (DOM) coexist without `make`.
- `item* ` mapping family: `itemToString` (item -> text) and `itemToContent`
  (item -> rich content value); both are pure, both read their `*Fn` setting, neither
  touches the DOM.

## 3. Renames implied (current -> proposed)

### 3a. Decided this round

| Current                 | Proposed                 | Why                                                           |
|-------------------------|--------------------------|---------------------------------------------------------------|
| `renderItemContent`     | `itemToContent`          | pure item->value mapping (like `itemToString`); writes no DOM |
| `buildTriggerEl`        | `createTriggerEl`        | returns a DOM element -> `create*El`                          |
| `buildSearchInputEl`    | `createSearchInputEl`    | same                                                          |
| `buildPopupEl`          | `createPopupEl`          | same                                                          |
| `buildPopupListEl`      | `createPopupListEl`      | same                                                          |
| `makeSvg`               | `createSvgEl`            | returns a DOM element -> `create*El`                          |
| `renderTriggerDisabled` | `syncDisabledStateToDom` | mirrors `disabled` state onto attrs (aria/data/tabindex)      |
| `syncFocusedIndexToDom` | (keep)                   | already matches `sync<X>ToDom`                                |
| `onSearchInput`         | `handleSearchInput`      | internal DOM-event handler, not a settings/hook `on*`         |

### 3b. Reverted (no change after discussion)

| Was proposed                                         | Decision                                                            |
|------------------------------------------------------|---------------------------------------------------------------------|
| `createPositioner` -> `makePositioner`               | KEEP `createPositioner` (no `El` = not a DOM element; clear enough) |
| `getActionFromKey` / `getUpdatedIndex` -> `compute*` | KEEP `get*` (acceptable for "compute and return")                   |
| `getVisibleViewport` -> `readVisibleViewport`        | KEEP (low value)                                                    |

### 3c. Pending the "verb for landing content into DOM" answer (section 5.4)

| Current                                      | Proposed                                                                     |
|----------------------------------------------|------------------------------------------------------------------------------|
| `commitTriggerContentReturnedByRenderer`     | `<verb><X>ToDom` once the verb is locked; assistant's pick is `commit*ToDom` |
| inline content-landing inside `createItemEl` | stays inline (single use; not extracted)                                     |

### 3d. Leave as-is (already consistent)

`createItemEl`, `makeClassIdMap` (note the counter side effect), `recomputeFilteredItems`,
`computePosition`, `attach*`/`detach*`, `get*`/`is*` accessors, `choose*`/`toggle*`,
`open`/`close`/`toggle`, `handleKeydown`, `scanEnabledIndex`, `visibleItems`,
`matchesQuery`, `itemToString`, `fireChange`, `measureNaturalWidth`, `captureWindowScroll`.

## 4. Decisions log (round 1)

1. `*El` suffix is the marker for "returns a DOM element"; the `create`/`make` distinction
   is dropped in favor of it. `make*` for DOM (`makeSvg`) goes away (-> `createSvgEl`).
2. `renderItemContent` -> `itemToContent` (NOT `resolve*`, which was rejected as vague).
3. `createPositioner` stays (no `El`).
4. ToDom verb: assistant proposes `commit*ToDom` for landing content/an element, and
   `sync*ToDom` for mirroring state to attributes. User has a preferred verb withheld to
   avoid sycophancy - TO BE RECONCILED (see 5.4).
5. `onSearchInput` -> `handleSearchInput`; `on*` is reserved for settings events and
   subclass hooks only.
6. `render`/`rerender` become PUBLIC-ONLY; no internal `render*`.
7. The 3b `get*` functions are fine as-is.

## 5. Open questions (decide before coding)

1. **`render` orchestrators** (`renderTrigger`, `renderTriggerContent`, `renderPopupList`,
   `renderTriggerArrow`): under "no internal `render`", what do these become? Options:
   (a) `*ToDom` composites (e.g. `rebuildPopupListToDom`, `writeTriggerContentToDom`), or
   (b) narrowly keep `render*` for "rebuild a container's content from state" only.
2. **Settings symmetry**: if the method is `itemToContent`, the setting `renderItemContentFn`
   is the odd one out vs `itemToStringFn`. Rename setting to `itemToContentFn`? (public,
   breaking) - and do `renderTriggerContentFn` / `renderArrowFn` have the same problem?
3. **ToDom verb (4 above)**: lock `commit*ToDom` vs the user's withheld pick.
4. **Scope / phasing**: apply to private-only first (zero API impact), then decide
   protected (`createItemEl`, `itemToContent`, `renderTrigger*`) and public
   (`getItems`, the `*Svg` factories, any settings rename) separately.
