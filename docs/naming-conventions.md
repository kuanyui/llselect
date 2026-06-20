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
- **`on*`**: real event handlers (`onItemClick`, `onSearchInput`) vs empty subclass
  lifecycle hooks (`onOpened`, `onClosed`).
- **`get*`**: field accessors (`getItems`, `getChosenItem(s)`) vs pure computation
  (`getActionFromKey`, `getUpdatedIndex`, `getVisibleViewport` - the last also reads DOM).

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

## 2. Proposed convention (one verb = one behavior)

| Verb                                | Meaning                                                                    | DOM?           | Returns?    |
|-------------------------------------|----------------------------------------------------------------------------|----------------|-------------|
| `create*`                           | construct + return a new **DOM element** (detached)                        | builds it      | the element |
| `make*`                             | construct + return a new **non-DOM value/object**                          | no             | the value   |
| `compute*`                          | pure computation, no side effects, no DOM                                  | no             | the result  |
| `get*` / `is*`                      | read existing state and return it (accessor)                               | no             | value       |
| `read*`                             | read something out of the **DOM/environment** and return it                | reads only     | value       |
| `render*`                           | from current state, build **content** and write it into a container        | writes content | void        |
| `commit*`                           | write **already-computed** content (e.g. a renderer's return) into the DOM | writes content | void        |
| `reflect*`                          | mirror a single piece of **state onto DOM attributes/class/scroll**        | writes attrs   | void        |
| `recompute*`                        | recompute a derived **internal state** field (no DOM)                      | no             | void        |
| `set*`                              | public: set state (may trigger render + callback)                          | indirect       | void        |
| `attach*` / `detach*`               | add / remove event listeners                                               | listeners      | void        |
| `handle*`                           | handle a real DOM event                                                    | via callees    | void        |
| `on*`                               | subclass lifecycle hook (override point, empty by default)                 | depends        | void        |
| `choose*` / `unchoose*` / `toggle*` | chosen-set domain operations                                               | indirect       | void        |
| `open` / `close` / `toggle`         | popup open-state                                                           | writes         | void        |

Key splits this encodes:
- **create vs make** = DOM element vs non-DOM value. (Resolves the create/build/make mess.)
- **render vs commit** = "compute content then write" vs "write content already given".
- **render vs reflect** = write *content* into a container vs write *attributes/class*
  reflecting one state value.
- **compute/read vs get** = derive/measure vs return a stored field.

## 3. Renames implied (current -> proposed)

### 3a. High-value, low-controversy

| Current                 | Proposed                                       | Why                                                        |
|-------------------------|------------------------------------------------|------------------------------------------------------------|
| `renderItemContent`     | `resolveItemContent` (or `computeItemContent`) | returns a value, writes no DOM - must not be `render*`     |
| `buildTriggerEl`        | `createTriggerEl`                              | returns a DOM element -> `create*`                         |
| `buildSearchInputEl`    | `createSearchInputEl`                          | same                                                       |
| `buildPopupEl`          | `createPopupEl`                                | same                                                       |
| `buildPopupListEl`      | `createPopupListEl`                            | same                                                       |
| `makeSvg`               | `createSvg`                                    | returns a DOM element -> `create*`                         |
| `createPositioner`      | `makePositioner`                               | returns a non-DOM controller object -> `make*`             |
| `renderTriggerDisabled` | `reflectDisabledState`                         | writes attributes (aria/data/tabindex), not content        |
| `syncFocusedIndexToDom` | `reflectFocusedIndex`                          | same family as reflectDisabledState (state -> attrs/class) |
| `onSearchInput`         | `handleSearchInput`                            | it is a real input-event handler, not a lifecycle hook     |

### 3b. Worth doing, slightly bigger blast radius

| Current                                  | Proposed                                   | Why                                                                                                             |
|------------------------------------------|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `getActionFromKey`                       | `computeActionFromKey`                     | pure computation, not a field accessor                                                                          |
| `getUpdatedIndex`                        | `computeUpdatedIndex`                      | pure computation                                                                                                |
| `getVisibleViewport`                     | `readVisibleViewport`                      | reads the DOM/environment                                                                                       |
| `rerenderPopupListItem`                  | `replacePopupListItem`                     | it replaces ONE element (O(1)), distinct from `rerender`                                                        |
| `commitTriggerContentReturnedByRenderer` | keep, OR shorten to `commitTriggerContent` | `commit` now has a defined slot in the convention; the long suffix may be redundant once `commit` is documented |

### 3c. Leave as-is (already consistent with the convention)

`createItemEl`, `makeClassIdMap` (add a note about the counter side effect),
`renderTrigger`, `renderTriggerContent`, `renderTriggerArrow`, `renderPopupList`,
`rerender`, `recomputeFilteredItems`, `computePosition`, `attach*`/`detach*`,
`get*`/`is*` accessors, `choose*`/`toggle*`, `open`/`close`/`toggle`, `handleKeydown`,
`scanEnabledIndex`, `visibleItems`, `matchesQuery`, `itemToString`, `fireChange`,
`measureNaturalWidth` (read-ish; restores style), `captureWindowScroll` (snapshot + restore).

## 4. Open questions (decide before any code changes)

1. **`reflect*` vs `sync*`** for "state -> DOM attributes/class": pick one verb.
   (Recommend `reflect*`: it reads as "make the DOM reflect this state".)
2. **`renderItemContent` new name**: `resolveItemContent` vs `computeItemContent`.
   (Recommend `resolveItemContent`: it "resolves" via the `renderItemContentFn` setting.)
3. **Public `*Svg` factories** (`triangleDownSvg`, `chevronDownSvg`, `checkSvg`,
   `checkboxSvg`): these are exported API and use the common noun-factory style. Rename to
   `create*Svg`, or leave them (noun factories are an accepted convention)? (Recommend LEAVE.)
4. **`commit`**: keep the long, explicit `commitTriggerContentReturnedByRenderer`, or
   shorten to `commitTriggerContent` now that `commit` is a documented verb?
5. **`get*` -> `compute*`** for the keyboard/positioning pure functions: worth the churn,
   or is `get*` acceptable for "compute and return"? (These are exported - renaming changes
   the public surface of those modules.)
6. Scope: apply to **private only** first (zero API impact), then decide on protected/public
   (`createItemEl`, `getItems`, the `*Svg` factories) separately?
