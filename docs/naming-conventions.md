# Method naming conventions

> STATUS: PROPOSAL, under discussion. Nothing here is applied to the code yet.
> Goal: one verb = one behavior kind. This file now covers EVERY method/function
> in src/ (about 80), so the rename set is exhaustive.

## 1. Signals that carry meaning

- **`*El` suffix = returns a DOM element.** No `El` => not a DOM element.
- **`*ToDom` suffix = writes into existing DOM** (side effect, returns void).
- **Parameter shape splits the `*ToDom` family**:
  - `commit<X>ToDom(content)` TAKES the already-built content/element.
  - `sync<X>ToDom()` takes NO param; reads one `this.*` field and mirrors it.

## 2. Verb vocabulary

### Core verbs (one meaning each)

| Verb / shape                        | Meaning                                                                 |
|-------------------------------------|-------------------------------------------------------------------------|
| `create<X>El`                       | build + return a DOM element                                            |
| `create<X>` (no El)                 | build + return a non-DOM object                                         |
| `commit<X>ToDom(content)`           | write the GIVEN content/element into the DOM                            |
| `sync<X>ToDom()`                    | mirror one `this.*` state field onto attrs/class/scroll                 |
| `render*`                           | no param, read state, compute content, (re)build a container (NARROWED) |
| `recompute*`                        | recompute a derived internal-state field (no DOM)                       |
| `compute*`                          | pure computation, returns a value                                       |
| `get*`                              | read and return a value (field accessor or compute-and-return)          |
| `set*`                              | set a state field (public or internal); may trigger a re-render         |
| `attach*` / `detach*`               | add / remove event listeners                                            |
| `handle*`                           | handle a real DOM event (internal)                                      |
| `on*`                               | settings event OR subclass lifecycle hook ONLY                          |
| `find*`                             | search and return an index/element                                      |
| `choose*` / `unchoose*` / `toggle*` | chosen-set domain ops                                                   |
| `open` / `close` / `toggle`         | popup open-state                                                        |

### Accepted auxiliary verbs (clear, non-conflicting; kept as-is)

`is*` / `are*` / `matches*` (predicates), `fire*` (invoke a user callback),
`focus*` (move focus), `measure*` (read a layout metric), `capture*` (snapshot + return
a restore closure), `ensure*` (guarantee a post-condition). These do not collide with
anything, so they stay.

### Banned / collapsed verbs

`apply*` (vague), `build*` (-> `create*El`), `make*` (-> `create*`), and `render*` as an
INTERNAL verb (-> `create*El` / `commit*ToDom` / `sync*ToDom`; only orchestrators and the
public `rerender` keep `render`).

## 3. Every method (exhaustive)

### 3a. Rename - decided

| File     | Current                                  | Proposed                    |
|----------|------------------------------------------|-----------------------------|
| base.ts  | `renderItemContent`                      | `itemToContent`             |
| base.ts  | `buildTriggerEl`                         | `createTriggerEl`           |
| base.ts  | `buildSearchInputEl`                     | `createSearchInputEl`       |
| base.ts  | `buildPopupEl`                           | `createPopupEl`             |
| base.ts  | `buildPopupListEl`                       | `createPopupListEl`         |
| base.ts  | `makeClassIdMap`                         | `createClassIdMap`          |
| base.ts  | `renderTriggerDisabled`                  | `syncDisabledStateToDom`    |
| base.ts  | `onSearchInput`                          | `handleSearchInput`         |
| icons.ts | `makeSvg`                                | `createSvgEl`               |
| base.ts  | `commitTriggerContentReturnedByRenderer` | `commitTriggerContentToDom` |

### 3b. Rename - newly found, PROPOSED (please confirm)

| File        | Current                       | Proposed               | Why                                                     |
|-------------|-------------------------------|------------------------|---------------------------------------------------------|
| base.ts     | `scanEnabledIndex`            | `findNextEnabledIndex` | `scan` and `find` both "search"; collapse to `find`     |
| base.ts     | `visibleItems`                | `getVisibleItems`      | a getter returning a value -> `get*`, not a noun        |
| base.ts     | `afterItemsChange`            | `onItemsChanged`       | it is a subclass hook; align with `onOpened`/`onClosed` |
| single.ts   | `afterItemsChange` (override) | `onItemsChanged`       | same                                                    |
| multiple.ts | `afterItemsChange` (override) | `onItemsChanged`       | same                                                    |
| base.ts     | `rerenderPopupListItem`       | `replacePopupListItem` | flags O(1) single-element replace vs `rerender`'s O(n)  |

### 3c. Open questions (verb judgement still needed)

| File        | Current                                                        | Question                                                                                                 |
|-------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| base.ts     | `syncFocusedIndexToDom`, `syncDisabledStateToDom`              | is `sync` the right verb for "mutate attrs/class/scroll of an existing element"? alt: `reflect`/`update` |
| base.ts     | `commitTriggerContentToDom`                                    | drop the `ReturnedByRenderer` detail, or keep it?                                                        |
| icons.ts    | `triangleDownSvg`, `chevronDownSvg`, `checkSvg`, `checkboxSvg` | public noun factories: keep (factory convention) or `create*SvgEl`?                                      |
| base.ts     | `focusInitial`                                                 | keep (`focus*` accepted), or `setInitialFocus`?                                                          |
| keyboard.ts | `ensureVisibleInScroll`                                        | keep (`ensure*` accepted), or `scrollChildIntoView`?                                                     |
| single.ts   | `areEqual`                                                     | keep (`are*` predicate), or `isEqual`?                                                                   |
| multiple.ts | `arraysEqual`                                                  | keep, or `isEqual`/`itemArraysEqual`?                                                                    |
| settings    | `renderItemContentFn`                                          | rename to `itemToContentFn` (pairs `itemToStringFn`; public breaking)?                                   |

### 3d. Keep - already consistent

| File           | Method                            | Class                                              |
|----------------|-----------------------------------|----------------------------------------------------|
| base.ts        | `createItemEl`                    | create*El                                          |
| multiple.ts    | `createItemEl` (override)         | create*El                                          |
| positioning.ts | `createPositioner`                | create* (non-DOM)                                  |
| base.ts        | `renderTrigger`                   | render-orch                                        |
| base.ts        | `renderTriggerContent`            | render-orch                                        |
| single.ts      | `renderTriggerContent` (override) | render-orch                                        |
| multiple.ts    | `renderTriggerContent` (override) | render-orch                                        |
| base.ts        | `renderTriggerArrow`              | render-orch                                        |
| base.ts        | `renderPopupList`                 | render-orch                                        |
| base.ts        | `rerender`                        | render (public)                                    |
| base.ts        | `syncFocusedIndexToDom`           | sync (pending 3c verb)                             |
| base.ts        | `recomputeFilteredItems`          | recompute                                          |
| base.ts        | `getItems`                        | get                                                |
| single.ts      | `getChosenItem`                   | get                                                |
| multiple.ts    | `getChosenItems`                  | get                                                |
| keyboard.ts    | `getActionFromKey`                | get (compute+return)                               |
| keyboard.ts    | `getUpdatedIndex`                 | get (compute+return)                               |
| positioning.ts | `getVisibleViewport`              | get (reads DOM)                                    |
| base.ts        | `setItems`                        | set                                                |
| base.ts        | `setDisabled`                     | set                                                |
| single.ts      | `setChosenItem`                   | set                                                |
| multiple.ts    | `setChosenItems`                  | set                                                |
| base.ts        | `setFocusedIndex`                 | set (internal; set a state field, not public-only) |
| base.ts        | `isDisabled`                      | is                                                 |
| base.ts        | `isItemDisabled`                  | is                                                 |
| multiple.ts    | `isChosen`                        | is                                                 |
| positioning.ts | `isClippedByAncestor`             | is                                                 |
| base.ts        | `matchesQuery`                    | matches (predicate)                                |
| base.ts        | `attachOutsideClick`              | attach                                             |
| base.ts        | `attachFocusOut`                  | attach                                             |
| base.ts        | `detachOutsideClick`              | detach                                             |
| base.ts        | `detachFocusOut`                  | detach                                             |
| base.ts        | `handleKeydown`                   | handle                                             |
| base.ts        | `onOpened`                        | on (hook)                                          |
| base.ts        | `onClosed`                        | on (hook)                                          |
| base.ts        | `onItemClick`                     | on (hook)                                          |
| single.ts      | `onItemClick` (override)          | on (hook)                                          |
| multiple.ts    | `onItemClick` (override)          | on (hook)                                          |
| base.ts        | `open` / `close` / `toggle`       | open-state                                         |
| multiple.ts    | `toggleItem`                      | chosen-set                                         |
| multiple.ts    | `toggleAll`                       | chosen-set                                         |
| multiple.ts    | `chooseAll`                       | chosen-set                                         |
| multiple.ts    | `unchooseAll`                     | chosen-set                                         |
| base.ts        | `focusInitial`                    | focus (pending 3c)                                 |
| single.ts      | `focusInitial` (override)         | focus (pending 3c)                                 |
| multiple.ts    | `focusInitial` (override)         | focus (pending 3c)                                 |
| base.ts        | `itemToString`                    | item->value mapping                                |
| base.ts        | `captureWindowScroll`             | capture (snapshot+restore closure)                 |
| keyboard.ts    | `ensureVisibleInScroll`           | ensure (pending 3c)                                |
| positioning.ts | `computePosition`                 | compute                                            |
| positioning.ts | `measureNaturalWidth`             | measure (mutates+restores style)                   |
| single.ts      | `areEqual`                        | are (pending 3c)                                   |
| multiple.ts    | `arraysEqual`                     | are-ish (pending 3c)                               |
| single.ts      | `fireChange`                      | fire                                               |
| multiple.ts    | `fireChange`                      | fire                                               |
| base.ts        | `defaultCompareFn`                | default+noun (a value)                             |

## 4. Decisions log

`*El`/`*ToDom` suffixes; param-shape splits commit vs sync; `render` narrowed not abolished;
`commit` verb CONFIRMED; `build*`/`make*`/internal `render*`/`apply*` banned; auxiliary
verbs (is/are/matches/fire/focus/measure/capture/ensure) accepted as-is.

## 5. Phasing (suggested)

1. private-only renames (zero API impact).
2. protected: `itemToContent`, `createTriggerEl` family, `visibleItems`, `afterItemsChange`,
   `rerenderPopupListItem`.
3. public / settings: `*Svg` factories, `renderItemContentFn` (only if symmetry wins).
