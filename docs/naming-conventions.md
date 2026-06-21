# Method naming conventions

> STATUS: PROPOSAL, under discussion. Nothing applied to code yet. Covers every
> method/function in src/ (~80). Private names matter least, but docstrings stay clear.
> The render* responsibilities question lives in `render-responsibilities.md` (DECIDED: iii).

## 1. The mechanical rule

A name carries a Dom/El suffix that tells you, without guessing, what it touches:

- **`*El`** = the name's object is a single DOM element. Covers "build + return one"
  (`createItemEl`) and "operate on an existing one" (`replacePopupListItemElInDom`).
- **`*ToDom`** = writes content/state INTO an existing container (object is content/state,
  not one named element): `commitTriggerContentToDom`, `syncFocusedIndexToDom`.
- **`*ElInDom`** = operates on (replace/move/remove) an existing element IN the DOM:
  `replacePopupListItemElInDom`.
- **`create*El`** (no Dom suffix) = builds a DETACHED element; does not touch the document.
- Parameter shape splits the writers: `commit*ToDom(content)` takes the content;
  `sync*ToDom()` takes none (reads one `this.*` field); `render*` takes none.

### Explicit exceptions (touch DOM, NO Dom suffix - listed, never guessed)

`render*` (high-level render, see s2 + `render-responsibilities.md`), `open`/`close`/`toggle`,
`focus*`, `attach*`/`detach*`, `capture*`. Nothing else.

## 2. Verb vocabulary

| Verb / shape                                                             | Meaning                                                                                                 |
|--------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `create<X>El`                                                            | build + return a DOM element (detached)                                                                 |
| `create<X>` (no El)                                                      | build + return a non-DOM object                                                                         |
| `replace<X>ElInDom()`                                                    | swap an existing element for a fresh one                                                                |
| `commit<X>ToDom(content)`                                                | write the GIVEN content into a container                                                                |
| `sync<X>ToDom()`                                                         | mirror one `this.*` state field onto attrs/class/scroll                                                 |
| `render*`                                                                | high-level: rebuild a container's DOM from state (EXCEPTION: no Dom suffix; fixed docstring, see below) |
| `recompute*`                                                             | recompute a derived internal-state field                                                                |
| `compute*` / `get*` / `find*`                                            | derive / read / search and return a value                                                               |
| `set*`                                                                   | set a state field (public or internal)                                                                  |
| `attach*` / `detach*` / `handle*`                                        | listeners / event handling                                                                              |
| `on*`                                                                    | settings event OR subclass hook ONLY                                                                    |
| `itemTo*`                                                                | pure item->value mapping (no DOM): `itemToString`, `itemToContentEl`                                    |
| `is*`/`are*`/`matches*`/`fire*`/`focus*`/`measure*`/`capture*`/`ensure*` | accepted auxiliaries                                                                                    |
| `choose*`/`unchoose*`/`toggle*` / `open`/`close`/`toggle`                | domain ops                                                                                              |

Banned: `apply*`, `build*`, `make*`, internal `render*ToDom` (render* is unsuffixed).

Fixed docstring one-liner for every `render*` (swap `<X>`):
> High-level render of `<X>`'s DOM from state; not a low-level `*ToDom`/`*El` primitive.

## 3. Settings callbacks

- `itemTo*Fn` (item mapping): `itemToStringFn`, `itemToContentElFn`.
- predicate `*Fn`: `compareFn`, `filterFn`, `itemDisabledFn`.
- event `on*`: `onChange`, `onOpen`, `onClose`.
- the old `render*Fn` collide with the method verb `render` and must be renamed; PENDING:
  `renderArrowFn` -> `arrowElFn`?, `renderTriggerContentFn` -> `triggerContentFn`? (s4 open)
- RULE: any callback whose return type includes `null` must state in its docstring exactly
  what returning `null` does (differs per callback). Now also in CLAUDE.md.

## 4. Every method / setting (exhaustive)

### 4a. Rename - DECIDED

| File        | Vis       | Current                                  | Proposed                                                               |
|-------------|-----------|------------------------------------------|------------------------------------------------------------------------|
| base.ts     | protected | `renderItemContent`                      | `itemToContentEl`                                                      |
| base.ts     | setting   | `renderItemContentFn`                    | `itemToContentElFn` (also narrowed to `(item) => HTMLElement \| null`) |
| base.ts     | private   | `buildTriggerEl`                         | `createTriggerEl`                                                      |
| base.ts     | private   | `buildSearchInputEl`                     | `createSearchInputEl`                                                  |
| base.ts     | private   | `buildPopupEl`                           | `createPopupEl`                                                        |
| base.ts     | private   | `buildPopupListEl`                       | `createPopupListEl`                                                    |
| base.ts     | module-fn | `makeClassIdMap`                         | `createClassIdMap`                                                     |
| icons.ts    | module-fn | `makeSvg`                                | `createSvgEl`                                                          |
| base.ts     | private   | `renderTriggerDisabled`                  | `syncDisabledStateToDom`                                               |
| base.ts     | private   | `onSearchInput`                          | `handleSearchInput`                                                    |
| base.ts     | protected | `commitTriggerContentReturnedByRenderer` | `commitTriggerContentToDom`                                            |
| base.ts     | protected | `scanEnabledIndex`                       | `findNextEnabledIndex`                                                 |
| base.ts     | protected | `visibleItems`                           | `getVisibleItems`                                                      |
| base.ts     | protected | `rerenderPopupListItem`                  | `replacePopupListItemElInDom`                                          |
| base.ts     | protected | `afterItemsChange`                       | `onItemsChanged`                                                       |
| single.ts   | protected | `afterItemsChange` (override)            | `onItemsChanged`                                                       |
| multiple.ts | protected | `afterItemsChange` (override)            | `onItemsChanged`                                                       |
| icons.ts    | public    | `triangleDownSvg`                        | `createTriangleDownSvgEl`                                              |
| icons.ts    | public    | `chevronDownSvg`                         | `createChevronDownSvgEl`                                               |
| icons.ts    | public    | `checkSvg`                               | `createCheckSvgEl`                                                     |
| icons.ts    | public    | `checkboxSvg`                            | `createCheckboxSvgEl`                                                  |

### 4b. Open - still need your call

| File     | Vis     | Current                    | Question                                                    |
|----------|---------|----------------------------|-------------------------------------------------------------|
| base.ts  | setting | `renderArrowFn`            | -> `arrowElFn`? (returns element; `render` collides)        |
| base.ts  | setting | `renderTriggerContentFn`   | keep `string`? + `triggerContentFn` vs `triggerContentElFn` |
| settings | -       | callback `null` docstrings | write the `null` meaning into each (mechanical follow-up)   |

### 4c. Keep - consistent (incl. render* under iii, unsuffixed)

| File           | Vis        | Method                                                                                                      | Class                         |
|----------------|------------|-------------------------------------------------------------------------------------------------------------|-------------------------------|
| base.ts        | protected  | `renderTrigger` / `renderTriggerContent` (+2) / `renderPopupList`                                           | render (exception)            |
| base.ts        | private    | `renderTriggerArrow`                                                                                        | render (exception)            |
| base.ts        | public     | `rerender`                                                                                                  | render (exception)            |
| base.ts        | private    | `syncFocusedIndexToDom`                                                                                     | sync                          |
| base.ts        | protected  | `createItemEl` (+1 override)                                                                                | create*El                     |
| positioning.ts | public     | `createPositioner`                                                                                          | create (non-DOM)              |
| base.ts        | private    | `recomputeFilteredItems`                                                                                    | recompute                     |
| base.ts        | public     | `getItems` / `setItems` / `setDisabled` / `isDisabled` / `rerender`                                         | get/set/is                    |
| single.ts      | public     | `getChosenItem` / `setChosenItem`                                                                           | get/set                       |
| multiple.ts    | public     | `getChosenItems` / `setChosenItems` / `isChosen` / `toggleItem` / `toggleAll` / `chooseAll` / `unchooseAll` | get/set/is/domain             |
| keyboard.ts    | public     | `getActionFromKey` / `getUpdatedIndex` / `ensureVisibleInScroll`                                            | get/ensure                    |
| positioning.ts | public/mod | `computePosition` / `measureNaturalWidth` / `getVisibleViewport` / `isClippedByAncestor`                    | compute/measure/get/is        |
| base.ts        | protected  | `setFocusedIndex` / `isItemDisabled` / `itemToString` / `focusInitial` (+2)                                 | set/is/itemTo/focus           |
| base.ts        | private    | `matchesQuery` / `attach*` / `detach*` / `handleKeydown` / `captureWindowScroll`                            | matches/attach/handle/capture |
| base.ts        | protected  | `onOpened` / `onClosed` / `onItemClick` (+2)                                                                | on (hook)                     |
| base.ts        | public     | `open` / `close` / `toggle`                                                                                 | domain                        |
| single.ts      | private    | `areEqual` / `fireChange`                                                                                   | are/fire                      |
| multiple.ts    | private    | `arraysEqual` / `fireChange`                                                                                | are/fire                      |
| base.ts        | module-fn  | `defaultCompareFn`                                                                                          | value                         |

## 5. Decisions log (this session)

- Suffixes: `*El` (element object), `*ToDom` (write content/state), `*ElInDom` (operate on
  existing element). `create*El` = detached build.
- `render*` is an EXCEPTION (no Dom suffix) + carries the fixed docstring one-liner. (iii in
  `render-responsibilities.md`; bodies unchanged.)
- `sync` kept; `commit` confirmed; `build*`/`make*`/`apply*`/internal-`render*ToDom` banned.
- `itemToContentEl(Fn)` joins the `itemTo*` mapping family; `renderItemContentFn` narrowed to
  `HTMLElement | null` (no `string`).
- 4b (`renderArrowFn`/`renderTriggerContentFn`) and per-callback `null` docstrings still open.

## 6. Phasing

1. private-only renames (zero API impact).
2. protected: `itemToContentEl`, `create*El` family, `getVisibleItems`,
   `replacePopupListItemElInDom`, `findNextEnabledIndex`, `onItemsChanged`.
3. public / settings: `create*SvgEl` factories, `itemToContentElFn`, 4b once decided.
