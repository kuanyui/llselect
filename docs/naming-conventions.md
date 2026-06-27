# Method naming conventions

> STATUS: APPLIED to src/ + test/ + demo/ (npm test green: 182; npm run build green). Covers
> every method/function in src/ (~80). Private names matter least, but docstrings stay clear.
> render* responsibility: APPLIED=(ii) - see render-responsibilities.md (render* are pure
> orchestrators with DOM-free bodies).
>
> FORMAT: maintain with LOCAL EDITS only, never a full rewrite (rewrites drift the structure).
> Tables are pipe-aligned; sections are numbered (§1-§6). Keep both.

## 1. The mechanical rule

A name carries a Dom/El suffix that says, without guessing, what it touches:

- `*El` = the name's object is a single DOM element: build+return (`createItemEl`) or operate
  on an existing one (`replacePopupListItemElInDom`).
- `*ToDom` = writes content/state INTO an existing container (object = content/state):
  `commitTriggerContentToDom`, `syncFocusedIndexToDom`.
- `*ElInDom` = operate on (replace/move/remove) an existing element IN the DOM.
- `create*El` (no Dom suffix) = builds a DETACHED element; does not touch the document.
- Param shape: `commit*ToDom(content)` takes the content; `sync*ToDom()` takes none.

Who touches the document DOM: the suffixed primitives above, PLUS this explicit exception list
(touch DOM, no suffix, never guessed): `open`/`close`/`toggle`, `focus*`, `attach*`/`detach*`,
`capture*`.

NOTE: `render*` is NOT on that list. Under (ii) render* are pure orchestrators - they call the
primitives and touch no DOM directly - so they carry no suffix because they do not write DOM.

## 2. Verb vocabulary

| Verb / shape                                                             | Meaning                                                                 |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `create<X>El` / `create<X>`                                              | build + return a DOM element / a non-DOM object                         |
| `replace<X>ElInDom()`                                                    | swap an existing element for a fresh one                                |
| `commit<X>ToDom(content)`                                                | write the GIVEN content into a container                                |
| `sync<X>ToDom()`                                                         | mirror one `this.*` state field onto attrs/class/scroll                 |
| `render*`                                                                | pure ORCHESTRATOR: compute + call primitives; DOM-free body             |
| `recompute*`/`compute*`/`get*`/`find*`                                   | recompute state / derive / read / search, returns                       |
| `set*`                                                                   | set a state field                                                       |
| `attach*`/`detach*`/`handle*`                                            | listeners / DOM-event handling                                          |
| `on*`                                                                    | settings event OR subclass hook ONLY                                    |
| `itemTo*`                                                                | pure item->value mapping, no DOM: `itemToString`, `createItemContentEl` |
| `is*`/`are*`/`matches*`/`fire*`/`focus*`/`measure*`/`capture*`/`ensure*` | auxiliaries                                                             |
| `choose*`/`unchoose*`/`toggle*` / `open`/`close`/`toggle`                | domain ops                                                              |

Banned: `apply*`, `build*`, `make*`, and any `*ToDom` on a `render*` (render* are DOM-free now).

`render*` docstring opens with: "Orchestrator: composes the `*ToDom` / `*El` primitives to
(re)build `<X>` from state; touches no DOM directly."

## 3. Settings callbacks

By RETURN TYPE (behaviour, not input):
- returns `boolean` -> predicate `*Fn`: `compareFn`, `filterFn`, `itemDisabledFn`.
- returns `string` -> `itemTo*Fn` mapping: `itemToStringFn`.
- returns an element -> `create*ElFn`: `createItemContentElFn`, `createArrowElFn`, `createTriggerContentElFn`.
- fires an event -> `on*`: `onChange`, `onOpen`, `onClose`.
- RULE (CLAUDE.md): any callback whose type includes `null` documents what `null` does.

## 4. Every method / setting

### 4a. Rename - DONE (applied to code)

| Vis          | Before                                   | After                                                                 |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------- |
| protected    | `renderItemContent`                      | `createItemContentEl`                                                 |
| setting      | `renderItemContentFn`                    | `createItemContentElFn` (narrowed to `(item) => HTMLElement \| null`) |
| private      | `buildTriggerEl`                         | `createTriggerEl`                                                     |
| private      | `buildSearchInputEl`                     | `createSearchInputEl`                                                 |
| private      | `buildPopupEl`                           | `createPopupEl`                                                       |
| private      | `buildPopupListEl`                       | `createPopupListEl`                                                   |
| mod-fn       | `makeClassIdMap`                         | `createClassIdMap`                                                    |
| mod-fn       | `makeSvg`                                | `createSvgEl`                                                         |
| private      | `renderTriggerDisabled`                  | `syncDisabledStateToDom`                                              |
| private      | `onSearchInput`                          | `handleSearchInputEvent`                                              |
| protected    | `commitTriggerContentReturnedByRenderer` | `commitTriggerContentToDom`                                           |
| protected    | `scanEnabledIndex`                       | `findNextEnabledIndex`                                                |
| protected    | `visibleItems`                           | `getVisibleItems`                                                     |
| protected    | `rerenderPopupListItem`                  | `replacePopupListItemElInDom`                                         |
| protected x3 | `afterItemsChange`                       | `onItemsChanged`                                                      |
| public       | `triangleDownSvg`                        | `createTriangleDownSvgEl`                                             |
| public       | `chevronDownSvg`                         | `createChevronDownSvgEl`                                              |
| public       | `checkSvg`                               | `createCheckSvgEl`                                                    |
| public       | `checkboxSvg`                            | `createCheckboxSvgEl`                                                 |
| setting      | `renderArrowFn`                          | `createArrowElFn`                                                     |
| setting      | `renderTriggerContentFn`                 | `createTriggerContentElFn` (narrowed to element-only)                 |
| type         | `LLSelectArrowRenderer`                  | `LLSelectCreateArrowElFn`                                             |

### 4a-new. (ii) refactor **adds** these primitives

| Vis       | Name                  | Signature                                     | Does what (+ null)                                          |
| --------- | --------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| private   | `commitArrowElToDom`  | `(el: HTMLElement\|SVGElement\|null) => void` | clear arrow slot + place el; `null` = clear only (no arrow) |
| private   | `commitItemElsToDom`  | `(els: HTMLElement[]) => void`                | clear list + append all (no subclass need -> private)       |
| protected | `syncEmptyStateToDom` | `() => void`                                  | write `data-empty` from `isEmpty()`                         |
| protected | `isEmpty`             | `() => boolean`                               | nothing chosen? (single/multiple override)                  |

### 4b. DONE - per-callback `null` docstrings

- Each `null`-typed callback now documents its `null`: `createItemContentElFn` -> `null` =
  plain text from `itemToString`; `createTriggerContentElFn` -> `null` = default label;
  `createArrowElFn` -> `null` = no arrow this state. `filterFn` / `itemDisabledFn` /
  `itemToStringFn` / `onOpen` / `onClose` already stated theirs.

### 4c. Keep (names unchanged)

`render*` keep their names; their BODIES are refactored to pure orchestrators (ii).

| File            | Vis       | Method                                | Class                  |
| --------------- | --------- | ------------------------------------- | ---------------------- |
| base            | protected | `renderTrigger`                       | render-orch (body->ii) |
| base            | protected | `renderTriggerContent` (+2 overrides) | render-orch (body->ii) |
| base            | private   | `renderTriggerArrow`                  | render-orch (body->ii) |
| base            | protected | `renderPopupList`                     | render-orch (body->ii) |
| base            | public    | `rerender`                            | render-orch            |
| base            | protected | `createItemEl` (+1 override)          | create*El              |
| positioning     | public    | `createPositioner`                    | create (non-DOM)       |
| base            | private   | `syncFocusedIndexToDom`               | sync                   |
| base            | private   | `recomputeFilteredItems`              | recompute              |
| base            | public    | `getItems`                            | get                    |
| base            | public    | `setItems`                            | set                    |
| base            | public    | `setDisabled`                         | set                    |
| base            | public    | `isDisabled`                          | is                     |
| single          | public    | `getChosenItem`                       | get                    |
| single          | public    | `setChosenItem`                       | set                    |
| multiple        | public    | `getChosenItems`                      | get                    |
| multiple        | public    | `setChosenItems`                      | set                    |
| multiple        | public    | `isChosen`                            | is                     |
| multiple        | public    | `toggleItem`                          | domain                 |
| multiple        | public    | `toggleAll`                           | domain                 |
| multiple        | public    | `chooseAll`                           | domain                 |
| multiple        | public    | `unchooseAll`                         | domain                 |
| keyboard        | public    | `getActionFromKey`                    | get/compute            |
| keyboard        | public    | `getUpdatedIndex`                     | get/compute            |
| keyboard        | public    | `ensureVisibleInScroll`               | ensure                 |
| positioning     | public    | `computePosition`                     | compute                |
| positioning     | mod-fn    | `measureNaturalWidth`                 | measure                |
| positioning     | mod-fn    | `getVisibleViewport`                  | get                    |
| positioning     | mod-fn    | `isClippedByAncestor`                 | is                     |
| base            | protected | `setFocusedIndex`                     | set                    |
| base            | protected | `isItemDisabled`                      | is                     |
| base            | protected | `itemToString`                        | itemTo*                |
| base            | protected | `focusInitial` (+2 overrides)         | focus                  |
| base            | private   | `matchesQuery`                        | matches                |
| base            | private   | `attachOutsideClick`                  | attach                 |
| base            | private   | `attachFocusOut`                      | attach                 |
| base            | private   | `detachOutsideClick`                  | detach                 |
| base            | private   | `detachFocusOut`                      | detach                 |
| base            | private   | `handleKeydown`                       | handle                 |
| base            | private   | `captureWindowScroll`                 | capture                |
| base            | protected | `onOpened`                            | on (hook)              |
| base            | protected | `onClosed`                            | on (hook)              |
| base            | protected | `onItemClick` (+2 overrides)          | on (hook)              |
| base            | public    | `open`                                | domain                 |
| base            | public    | `close`                               | domain                 |
| base            | public    | `toggle`                              | domain                 |
| single          | private   | `areEqual`                            | predicate              |
| multiple        | private   | `arraysEqual`                         | predicate              |
| single+multiple | private   | `fireChange`                          | fire                   |
| base            | mod-fn    | `defaultCompareFn`                    | value                  |

## 5. Decisions log

Suffixes `*El`/`*ToDom`/`*ElInDom`; `create*El` = detached build. render* = pure orchestrator
(DECIDED ii): DOM-free, no suffix, NOT on the exception list. `commit` confirmed; element-returning callbacks are `create*ElFn`, string-returning is `itemTo*` (`itemToString`); `build*`/`make*`/`apply*` banned. Nothing open: 4a + 4b applied to code.

## 6. Phasing

DONE - all three phases applied (npm test green: 182; npm run build green).

1. private renames (zero API impact) + private (ii) primitive (`commitArrowElToDom`).
2. protected: `createItemContentEl`, `create*El` family, `getVisibleItems`,
   `replacePopupListItemElInDom`, `findNextEnabledIndex`, `onItemsChanged`, the protected
   (ii) primitives, render* body refactor.
3. public / settings: `create*SvgEl` factories, `createItemContentElFn`, 4b once decided.
