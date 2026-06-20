# Method naming conventions

> STATUS: PROPOSAL, under discussion. Nothing here is applied to the code yet.
> Goal: MECHANICAL consistency - the name tells you the behavior, never guessed.
> Covers EVERY method/function in src/ (~80). Private names matter least, but their
> docstrings must still be clear.

## 1. The mechanical rule

A method name ends in a Dom suffix IF AND ONLY IF it modifies existing document DOM
(content / attributes / class / element structure):

- **`*ToDom`** = writes content or a state field INTO an existing container.
- **`*ElInDom`** = operates on (replaces / moves / removes) an existing element IN the DOM.
- **`create*El`** (NO Dom suffix) = builds a detached element and returns it; does NOT touch
  the document.
- No Dom suffix and not `create*El` => does not write the DOM at all.

So: see `Dom` in the name -> it has a DOM side effect. See none -> it does not (except the
explicitly listed domain verbs below).

### Explicit exceptions (domain / lifecycle verbs; DOM touch is a means, not the job)

These are allowed to touch the DOM without a Dom suffix, and they are listed here so it is
never a guess: `open` / `close` / `toggle`, `focus*`, `attach*` / `detach*`,
`capture*`. Nothing else.

## 2. Verb vocabulary

| Verb / shape                                                                    | Meaning                                                      | DOM side effect?  |
|---------------------------------------------------------------------------------|--------------------------------------------------------------|-------------------|
| `create<X>El`                                                                   | build + return a DOM element (detached)                      | no (returns it)   |
| `create<X>` (no El)                                                             | build + return a non-DOM object                              | no                |
| `replace<X>ElInDom()`                                                           | swap one existing element for a freshly built one            | YES               |
| `commit<X>ToDom(content)`                                                       | write the GIVEN content into a container                     | YES               |
| `sync<X>ToDom()`                                                                | mirror one `this.*` state field onto attrs/class/scroll      | YES               |
| `render<X>ToDom()`                                                              | no param, read state, compute content, (re)build container X | YES               |
| `recompute*`                                                                    | recompute a derived internal-state field                     | no                |
| `compute*`                                                                      | pure computation, returns a value                            | no                |
| `get*` / `find*`                                                                | read/search and return a value/index                         | no                |
| `set*`                                                                          | set a state field; may trigger a re-render                   | indirect          |
| `recompute*`                                                                    | recompute derived state                                      | no                |
| (exceptions) `open`/`close`/`toggle`, `focus*`, `attach*`/`detach*`, `capture*` | domain/lifecycle                                             | yes, by exception |
| `handle*`                                                                       | handle a real DOM event                                      | via callees       |
| `on*`                                                                           | settings event OR subclass hook ONLY                         | depends           |
| `is*`/`are*`/`matches*`                                                         | predicates                                                   | no                |
| `fire*`                                                                         | invoke a user callback                                       | no                |
| `choose*`/`unchoose*`/`toggle*`                                                 | chosen-set ops                                               | indirect          |

Banned: `apply*`, `build*`, `make*`, and bare internal `render*` (must be `render*ToDom`).

## 3. Every method (exhaustive)

### 3a. Rename - decided

| File     | Vis       | Current                                  | Proposed                      | Does what                                     |
|----------|-----------|------------------------------------------|-------------------------------|-----------------------------------------------|
| base.ts  | protected | `renderItemContent`                      | `itemToContent`               | item -> content value; no DOM                 |
| base.ts  | private   | `buildTriggerEl`                         | `createTriggerEl`             | build + return trigger element                |
| base.ts  | private   | `buildSearchInputEl`                     | `createSearchInputEl`         | build + return search input element           |
| base.ts  | private   | `buildPopupEl`                           | `createPopupEl`               | build + return popup wrapper element          |
| base.ts  | private   | `buildPopupListEl`                       | `createPopupListEl`           | build + return listbox element                |
| base.ts  | module-fn | `makeClassIdMap`                         | `createClassIdMap`            | return class/id name map (non-DOM)            |
| icons.ts | module-fn | `makeSvg`                                | `createSvgEl`                 | build + return an `<svg>` element             |
| base.ts  | protected | `scanEnabledIndex`                       | `findNextEnabledIndex`        | next non-disabled index (kbd nav); -1 if none |
| base.ts  | protected | `visibleItems`                           | `getVisibleItems`             | return currently visible items                |
| base.ts  | private   | `renderTriggerDisabled`                  | `syncDisabledStateToDom`      | mirror `disabled` onto aria/data/tabindex     |
| base.ts  | private   | `onSearchInput`                          | `handleSearchInput`           | handle the search input event                 |
| base.ts  | protected | `commitTriggerContentReturnedByRenderer` | `commitTriggerContentToDom`   | write given content into `triggerContentEl`   |
| base.ts  | protected | `rerenderPopupListItem`                  | `replacePopupListItemElInDom` | rebuild + swap one item's element (O(1))      |
| base.ts  | protected | `renderTrigger`                          | `renderTriggerToDom`          | (re)build both trigger slots                  |
| base.ts  | protected | `renderTriggerContent` (+2 overrides)    | `renderTriggerContentToDom`   | (re)build the trigger content slot            |
| base.ts  | private   | `renderTriggerArrow`                     | `renderTriggerArrowToDom`     | (re)build the arrow slot                      |
| base.ts  | protected | `renderPopupList`                        | `renderPopupListToDom`        | clear + rebuild all item elements             |

### 3b. Open questions (need your call)

| File        | Vis       | Current                                           | Question                                                                                    |
|-------------|-----------|---------------------------------------------------|---------------------------------------------------------------------------------------------|
| base.ts     | public    | `rerender`                                        | mechanical `rerenderToDom()`, or keep public `rerender()` as a boundary?                    |
| base.ts     | private   | `syncFocusedIndexToDom`, `syncDisabledStateToDom` | is `sync` the right verb for "mirror state onto attrs/class/scroll"? alt `reflect`/`update` |
| base.ts     | protected | `afterItemsChange` (+2)                           | `onItemsChanged` (recommended), or keep? (hook: drop chosen items gone from the list)       |
| base.ts     | protected | `commitTriggerContentToDom`                       | drop the `ReturnedByRenderer` detail (already dropped above), confirm?                      |
| icons.ts    | public    | `triangleDownSvg` etc                             | public noun factories: keep, or `create*SvgEl`?                                             |
| keyboard.ts | public    | `ensureVisibleInScroll`                           | exception verb `ensure*` (keep), or `scrollChildIntoView`?                                  |
| single.ts   | private   | `areEqual`                                        | keep (`are*`), or `isEqual`?                                                                |
| multiple.ts | private   | `arraysEqual`                                     | keep, or `isEqual`?                                                                         |
| settings    | public    | `renderItemContentFn`                             | `itemToContentFn` (pairs `itemToStringFn`; breaking)?                                       |

### 3c. Keep - already consistent

| File           | Vis       | Method                                               | Class                       |
|----------------|-----------|------------------------------------------------------|-----------------------------|
| base.ts        | protected | `createItemEl` (+1 override)                         | create*El                   |
| positioning.ts | public    | `createPositioner`                                   | create* (non-DOM)           |
| base.ts        | public    | `rerender`                                           | render (public; pending 3b) |
| base.ts        | private   | `recomputeFilteredItems`                             | recompute                   |
| base.ts        | public    | `getItems`                                           | get                         |
| single.ts      | public    | `getChosenItem`                                      | get                         |
| multiple.ts    | public    | `getChosenItems`                                     | get                         |
| keyboard.ts    | public    | `getActionFromKey` / `getUpdatedIndex`               | get (compute+return)        |
| positioning.ts | module-fn | `getVisibleViewport`                                 | get (reads DOM)             |
| base.ts        | public    | `setItems` / `setDisabled`                           | set                         |
| single.ts      | public    | `setChosenItem`                                      | set                         |
| multiple.ts    | public    | `setChosenItems`                                     | set                         |
| base.ts        | protected | `setFocusedIndex`                                    | set (a state field)         |
| base.ts        | public    | `isDisabled`                                         | is                          |
| base.ts        | protected | `isItemDisabled`                                     | is                          |
| multiple.ts    | public    | `isChosen`                                           | is                          |
| positioning.ts | module-fn | `isClippedByAncestor`                                | is                          |
| base.ts        | private   | `matchesQuery`                                       | matches                     |
| base.ts        | private   | `handleKeydown`                                      | handle                      |
| base.ts        | protected | `onOpened` / `onClosed` / `onItemClick` (+overrides) | on (hook)                   |
| base.ts        | private   | `recomputeFilteredItems`                             | recompute                   |
| base.ts        | protected | `itemToString`                                       | item->value                 |
| positioning.ts | public    | `computePosition`                                    | compute                     |
| positioning.ts | module-fn | `measureNaturalWidth`                                | measure                     |
| single.ts      | private   | `fireChange` (+1)                                    | fire                        |
| base.ts        | module-fn | `defaultCompareFn`                                   | default value               |
| multiple.ts    | public    | `toggleItem`/`toggleAll`/`chooseAll`/`unchooseAll`   | chosen-set                  |

### 3d. Exceptions (domain/lifecycle verbs; touch DOM without a Dom suffix - by the list in S1)

| File | Vis | Method |
|---|---|---|
| base.ts | public | `open` / `close` / `toggle` |
| base.ts | protected | `focusInitial` (+2 overrides) |
| base.ts | private | `attachOutsideClick` / `attachFocusOut` / `detachOutsideClick` / `detachFocusOut` |
| base.ts | private | `captureWindowScroll` |
| keyboard.ts | public | `ensureVisibleInScroll` (pending 3b: is `ensure` allowed, or rename) |

## 4. Decisions log

Mechanical rule: `*ToDom`/`*ElInDom` IFF it writes existing document DOM; `create*El` =
detached build; explicit exception list (open/close/toggle, focus*, attach*/detach*,
capture*). `render*` keeps the verb but MUST carry `ToDom`. `commit` confirmed; param-shape
still splits commit(content) vs sync(state) vs render(no param). Banned: apply/build/make/bare-render.

## 5. Phasing

1. private-only renames (zero API impact).
2. protected: `itemToContent`, `create*El` family, `getVisibleItems`,
   `replacePopupListItemElInDom`, `render*ToDom` family, `findNextEnabledIndex`.
3. public / settings: `rerender` (per 3b), `*Svg` factories, `renderItemContentFn`.
