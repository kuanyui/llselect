# Method naming conventions

> STATUS: APPLIED to src/ + test/ + demo/ (npm test passes; npm run build green). Covers every method/function in src/, incl. Phase 10 optgroup (s4d). Private names matter least, but docstrings stay clear. render* responsibility: APPLIED=(ii) - see render-responsibilities.md (render* are pure orchestrators with DOM-free bodies).
>
> FORMAT: maintain with LOCAL EDITS only, never a full rewrite (rewrites drift the structure). Tables are pipe-aligned; sections are numbered (s1-s6). Keep both.

## 1. The mechanical rule

A name carries a Dom/El suffix that says, without guessing, what it touches:

- `*El` = the name's object is a single DOM element: build+return (`createItemEl`) or operate on an existing one (`replacePopupListItemElInDom`).
- `*ToDom` = writes content/state INTO an existing container (object = content/state): `commitTriggerContentToDom`, `syncFocusedIndexToDom`.
- `*ElInDom` = operate on (replace/move/remove) an existing element IN the DOM.
- `create*El` (no Dom suffix) = builds a DETACHED element; does not touch the document.
- Param shape: `commit*ToDom(content)` takes the content; `sync*ToDom()` takes none.

Who touches the document DOM: the suffixed primitives above, PLUS this explicit exception list (touch DOM, no suffix, never guessed): `open`/`close`/`toggle`, `focus*`, `attach*`/`detach*`, `capture*`.

NOTE: `render*` is NOT on that list. Under (ii) render* are pure orchestrators - they call the primitives and touch no DOM directly - so they carry no suffix because they do not write DOM.

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
| `itemTo*`                                                                | pure item->string mapping, no DOM: `itemToString`                       |
| `is*`/`are*`/`matches*`/`fire*`/`focus*`/`measure*`/`capture*`/`ensure*` | auxiliaries                                                             |
| `choose*`/`unchoose*`/`toggle*` / `open`/`close`/`toggle`                | domain ops                                                              |

Banned: `apply*`, `build*`, `make*`, and any `*ToDom` on a `render*` (render* are DOM-free now).

`render*` docstring opens with: "Orchestrator: composes the `*ToDom` / `*El` primitives to (re)build `<X>` from state; touches no DOM directly."

## 3. Settings callbacks

By RETURN TYPE (behaviour, not input):
- returns `boolean` -> predicate `*Fn`: `compareFn`, `filterFn`, `itemDisabledFn`, `groupKeyCompareFn`, `groupDisabledFn`.
- maps one input to a value -> `<source>To<target>Fn`: `itemToStringFn` (item->string), `itemToGroupKeyFn` (item->key), `groupKeyToStringFn` (key->string). `itemTo*Fn` is the common case; name the actual source when it is not the item, and the target is the return type (`*Key`, `*Label`, `*String`), not necessarily `string`.
- returns an element -> `create*ElFn`: `createItemContentElFn`, `createTriggerArrowContentElFn`, `createTriggerContentElFn`.
- fires an event -> `on*`: `onChange`, `onOpen`, `onClose`.
- EXCEPTION: a capability FLAG may widen to `boolean | predicate` and keep its flag name (no `*Fn`): the name describes the capability, the TS union already declares the function form, and `searchableFn: boolean | fn` would be worse. Example: `filterable: boolean | ((items) => boolean)`.
- NAMED TYPE ALIASES are for enum-ish VALUE types only (`LLSelectOutsideClickBehavior`, `LLSelectTriggerDisplay`, `LLSelectChosenState`, `WidthPolicy`, `Placement`) - callers declare variables of those. Callback types stay INLINE on the settings field: inside a settings literal, contextual typing infers them, so an alias buys nothing (the one historical callback alias was removed in the RC review).
- RULE (CLAUDE.md): any callback whose type includes `null` documents what `null` does.

## 4. Every method / setting

### 4a. Rename - DONE (applied to code)

> Three After-names were later renamed AGAIN by the precision audit (s7b): `createArrowElFn` -> `createTriggerArrowContentElFn`, `LLSelectCreateArrowElFn` -> `LLSelectCreateTriggerArrowContentElFn` (that alias was then REMOVED in the RC review - see the s3 alias policy), `commitArrowElToDom` -> `commitTriggerArrowContentElToDom`. A fourth changed when the filled variant shipped: `createCheckboxSvgEl` -> `createOutlinedCheckboxSvgEl`, the symmetric twin of `createFilledCheckboxSvgEl` (MUI's Outlined / Filled vocabulary).

| Vis          | Before                                   | After                                                                 |
| ------------ | ---------------------------------------- | --------------------------------------------------------------------- |
| protected    | `renderItemContent`                      | `createItemContentEl`                                                 |
| setting      | `renderItemContentFn`                    | `createItemContentElFn` (narrowed to `(item) => HTMLElement \| null`) |
| private      | `buildTriggerEl`                         | `createTriggerEl`                                                     |
| private      | `buildFilterInputEl`                     | `createFilterInputEl`                                                 |
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
| public       | `checkSvg`                               | `createCheckmarkSvgEl`                                                    |
| public       | `checkboxSvg`                            | `createCheckboxSvgEl`                                                 |
| setting      | `renderArrowFn`                          | `createArrowElFn`                                                     |
| setting      | `renderTriggerContentFn`                 | `createTriggerContentElFn` (narrowed to element-only)                 |
| type         | `LLSelectArrowRenderer`                  | `LLSelectCreateArrowElFn`                                             |
| private      | `nextEnabledForAction`                   | `findEnabledIndexForAction`                                           |

### 4a-new. (ii) refactor **adds** these primitives

| Vis       | Name                  | Signature                                     | Does what (+ null)                                          |
| --------- | --------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| private   | `commitArrowElToDom`  | `(el: HTMLElement\|SVGElement\|null) => void` | clear arrow slot + place el; `null` = clear only (no arrow) |
| private   | `commitItemElsToDom`  | `(els: HTMLElement[]) => void`                | clear list + append all (superseded in Phase 10 by `commitPopupSegmentsToDom`, s4d) |
| protected | `syncEmptyStateToDom` | `() => void`                                  | write `data-empty` from `isEmpty()`                         |
| protected | `isEmpty`             | `() => boolean`                               | nothing chosen? (single/multiple override)                  |

### 4b. DONE - per-callback `null` docstrings

- Each `null`-typed callback now documents its `null`: `createItemContentElFn` -> `null` = plain text from `itemToString`; `createTriggerContentElFn` -> `null` = default label; `createArrowElFn` -> `null` = no arrow this state. `filterFn` / `itemDisabledFn` / `itemToStringFn` / `onOpen` / `onClose` already stated theirs.

### 4c. Keep (names unchanged)

`render*` keep their names; their BODIES are refactored to pure orchestrators (ii).

| File            | Vis       | Method                                | Class                  |
| --------------- | --------- | ------------------------------------- | ---------------------- |
| base            | protected | `renderTrigger`                       | render-orch (body->ii) |
| base            | protected | `renderTriggerContent` (+2 overrides) | render-orch (body->ii) |
| base            | private   | `renderTriggerArrow`                  | render-orch (body->ii) |
| base            | protected | `renderPopupList`                     | render-orch (body->ii) |
| base            | public    | `rerender`                            | render-orch            |
| base            | protected | `createItemEl` (+2 overrides)         | create*El              |
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
| base            | protected | `isItemEffectivelyDisabled`                      | is                     |
| base            | protected | `itemToString`                        | itemTo*                |
| base            | protected | `focusInitial` (+2 overrides)         | focus                  |
| base            | protected | `matchesQuery`                        | matches (seam for `filterFn`) |
| base            | private   | `attachOutsideClick`                  | attach                 |
| base            | private   | `attachFocusOut`                      | attach                 |
| base            | private   | `detachOutsideClick`                  | detach                 |
| base            | private   | `detachFocusOut`                      | detach                 |
| base            | private   | `handleKeydown`                       | handle                 |
| base            | private   | `captureWindowScroll`                 | capture                |
| base            | protected | `onOpened`                            | on (hook)              |
| base            | protected | `onClosed`                            | on (hook)              |
| base            | protected | `onChosenChanged`                     | on (hook)              |
| base            | protected | `onItemActivated` (+2 overrides)          | on (hook)              |
| base            | public    | `open`                                | domain                 |
| base            | public    | `close`                               | domain                 |
| base            | public    | `toggle`                              | domain                 |
| single          | private   | `areEqual`                            | predicate              |
| multiple        | private   | `arraysEqual`                         | predicate              |
| single+multiple | private   | `fireChange`                          | fire                   |
| base            | mod-fn    | `defaultCompareFn`                    | value                  |

### 4d. Phase 10 (optgroup) additions

Settings (s3 by return type). All are `| null` and document their `null` (s4b: grouping off / `===` identity / `String(key)` label / no group disabled):

| Vis     | Name                | Signature                   | s3 category     |
| ------- | ------------------- | --------------------------- | --------------- |
| setting | `itemToGroupKeyFn`  | `(item: T) => GK \| null`   | map item->key   |
| setting | `groupKeyCompareFn` | `(a: GK, b: GK) => boolean` | predicate       |
| setting | `groupKeyToStringFn` | `(key: GK) => string`       | map key->string |
| setting | `groupDisabledFn`   | `(key: GK) => boolean`      | predicate       |
| setting | `createGroupLabelContentElFn` | `(key: GK, items: readonly T[]) => HTMLElement \| null` | `create*ElFn` |

Methods / type:

| Vis       | Name                       | Convention                                      |
| --------- | -------------------------- | ----------------------------------------------- |
| protected | `itemToGroupKey`           | `itemTo*` - pure item->key, no DOM              |
| protected | `groupKeyToString`          | `<src>To<dst>` - pure key->string, no DOM       |
| protected | `isGroupDisabled`          | `is*` predicate auxiliary                       |
| private   | `computePopupSegments`     | `compute*` - derive render segments, no DOM     |
| private   | `commitPopupSegmentsToDom` | `commit*ToDom` - write segments into popup list |
| protected | `createGroupEl`            | `create*El` - group container build (override for full control) |
| protected | `createGroupLabelContentEl`| `create*El` - rich header content (mirrors `createItemContentEl`) |
| (type)    | `PopupListSegment`         | descriptive noun for the render-segment union   |

`classIdMap` gained `groupClass` / `groupLabelClass` (mirrors the `itemClass` family). No code rename was needed - every name already obeys s1-s3.

### 4e. Tags (triggerDisplay) additions

Settings on `LLSelectMultipleSettings` (s3 by return type):

| Vis     | Name                               | Signature                                        | s3            |
| ------- | ---------------------------------- | ------------------------------------------------ | ------------- |
| setting | `triggerDisplay`                   | `'count' \| 'tags'`                              | value (enum)  |
| setting | `createTagContentElFn`             | `(item: T) => HTMLElement \| null`               | `create*ElFn` |
| setting | `createTagRemoveButtonContentElFn` | `(item: T) => HTMLElement \| SVGElement \| null` | `create*ElFn` |

Methods (protected, overridable):

| Name                             | Convention                                                     |
| -------------------------------- | -------------------------------------------------------------- |
| `createTagsEl`                   | `create*El` - the chip strip                                   |
| `createTagEl`                    | `create*El` - one chip (assembles content + remove button)     |
| `createTagContentEl`             | `create*El` - one chip's content (reads the setting)           |
| `createTagRemoveButtonEl`        | `create*El` - one chip's whole remove button (wiring + aria)   |
| `createTagRemoveButtonContentEl` | `create*El` - the remove button's icon (reads the setting)     |

`classIdMap` gained `tagsClass` / `tagClass` / `tagRemoveButtonClass`. All obey s1-s3 + s7.

### 4f. Clear button (clearable) additions

Settings on `LLSelectBaseSettings` (s3 by return type):

| Vis     | Name                                  | Signature                                 | s3            |
| ------- | ------------------------------------- | ----------------------------------------- | ------------- |
| setting | `clearable`                           | `boolean`                                 | value (flag)  |
| setting | `createTriggerClearButtonContentElFn` | `() => HTMLElement \| SVGElement \| null` | `create*ElFn` |

Methods (protected, overridable):

| Name                                | Convention                                                  |
| ----------------------------------- | ----------------------------------------------------------- |
| `createTriggerClearButtonEl`        | `create*El` - the whole clear button (wiring + aria)        |
| `createTriggerClearButtonContentEl` | `create*El` - the clear button's icon (reads the setting)   |
| `clearSelection`                    | domain op - empty the selection (single / multiple)         |

`classIdMap` gained `triggerClearButtonClass`. All obey s1-s3 + s7.

### 4g. uiTranslationPack (chrome strings / i18n)

All user/AT-visible chrome strings live in ONE base setting `uiTranslationPack: LLSelectUiTranslationPack` (input `Partial<LLSelectUiTranslationPack>`, resolved against `en`). Keys are message ids per s7a.4 - no `Fn` suffix; attribute strings = `<elementFamily><Attribute>`, generated content = `<family><SemanticName>`; parameterized messages take resolved primitives, never `T`:

| Key                           | Type                                                  |
| ----------------------------- | ----------------------------------------------------- |
| `triggerPlaceholder`          | `string`                                              |
| `filterInputAriaLabel`        | `string`                                              |
| `filterInputPlaceholder`      | `string \| null`                                      |
| `popupListNoResults`          | `string`                                              |
| `triggerClearButtonAriaLabel` | `string`                                              |
| `tagRemoveButtonAriaLabel`    | `(itemText: string) => string`                       |
| `triggerCountSummary`         | `(chosenCount: number, totalCount: number) => string` |
| `selectAllRowText`           | `(chosenCount: number, totalCount: number) => string` |

`tagRemoveButtonAriaLabel` is backed by `protected itemToTagRemoveButtonAriaLabel(item)` (`itemTo*`, mirrors `itemToString`); string keys need no method (cf. `placeholder`). Language packs (`en` / `ja` / `zhTW`) live under `@llselect/core/i18n`; export names are camelCase only because `-` is illegal in JS identifiers - `uiTranslationPackByLocale` indexes the same packs by their real (minimal) BCP 47 tags (`'zh-TW'`) for `navigator.language` lookup. `LLSelectSettingsInputOf<S>` is the shared input shape (everything optional, `uiTranslationPack` deep-partial). The resolved bag is public via `getUiTranslationPack(): Readonly<LLSelectUiTranslationPack>` (`get*`, live object) and runtime-swappable via `setUiTranslationPack(pack: Partial<LLSelectUiTranslationPack>): void` (`set*`).

## 5. Decisions log

Suffixes `*El`/`*ToDom`/`*ElInDom`; `create*El` = detached build. render* = pure orchestrator (DECIDED ii): DOM-free, no suffix, NOT on the exception list. `commit` confirmed; element-returning callbacks are `create*ElFn`, string-returning is `itemTo*` (`itemToString`); `build*`/`make*`/`apply*` banned. Nothing open: 4a + 4b applied to code. Review follow-up: `nextEnabledForAction` -> `findEnabledIndexForAction` (adds the missing verb prefix). Consistency-review follow-up (R3): `matchesQuery` private -> protected (the subclass seam for `filterFn`); added `protected createTriggerArrowContentEl(state)` reading `createTriggerArrowContentElFn` (mirrors the clear button's content method); `renderTriggerArrow` stays a private orchestrator and `commitTriggerArrowContentElToDom` a private primitive. (Names shown post-s7b.) R20 added private `computeFilterActive` (compute*) + `syncFilterModeToDom` (sync*ToDom). R26 added public `destroy` (domain lifecycle op, industry-standard name; joins `open`/`close`/`toggle` on the DOM-touching exception list). R29 (Phase 13) added base protected `createPopupListLeadingRowEl` (create*El), `onLeadingRowActivated` (on-hook), `focusLeadingRow` (focus*), `replaceLeadingRowElInDom` (replace*ElInDom); multi flag setting `selectAllRow`; classIdMap `selectAllRowClass`. RC review follow-up (F7, user ruling): `isItemDisabled` -> `isItemEffectivelyDisabled` - it composes `itemDisabledFn` OR the group layer, so its name must not mimic a 1:1 `<setting minus Fn>` reader; rule in s7a.6. Label purge (user ruling, s7a.7-8): "label" reserved to HTML-labeled concepts; `groupKeyToLabelFn` -> `groupKeyToStringFn`, pack key `selectAllRowLabel` -> `selectAllRowText`, pack param `itemLabel` -> `itemText`; angularjs `ll-label` (ui-llselect display text) -> `ll-item-text`.

## 6. Phasing

DONE - all three phases applied (npm test passes; npm run build green).

1. private renames (zero API impact) + private (ii) primitive (`commitArrowElToDom`).
2. protected: `createItemContentEl`, `create*El` family, `getVisibleItems`, `replacePopupListItemElInDom`, `findNextEnabledIndex`, `onItemsChanged`, the protected (ii) primitives, render* body refactor.
3. public / settings: `create*SvgEl` factories, `createItemContentElFn`, 4b once decided.

## 7. Precision audit - element nouns, Container-Content law, pack keys

> STATUS: APPLIED (Button-system; long names accepted) - landed via roadmap R16-R19 (rename + texts bag + llselect/i18n + demo; archived in archive/roadmap-v0.0.1.md). Applies ON TOP of s1-s4.

### 7a. New rules

1. **Element names are nouns, never bare verbs.** Any name denoting an ELEMENT (classIdMap key, `*El` field, `create*El` method, pack-key prefix) must read as a noun phrase. Verb-derived elements take `Button` - they are all real `<button>`s, and `<verb> button` is natural English (play button, submit button): `triggerClearButton`, `tagRemoveButton`. Verbs stay verbs on ACTIONS (`clearSelection`, `toggleItem`, `open`); `-able` adjectives stay on capability flags (`clearable`, `filterable`). When no natural `-able` adjective exists, an ELEMENT-PRESENCE flag uses the element's noun name as a boolean (`selectAllRow: boolean` - "selectAllable" would be nonsense).
2. **Family prefix (DESIGN.md "Element family naming") applies to ALL trigger children.** The clear button is a direct child of the trigger, like `triggerContent` / `triggerArrow`, so it carries the `trigger` prefix. Today's `clear*` family violated the existing rule. `tagRemoveButton` needs no extra prefix (`tag` is already in the name).
3. **Container-Content law.** Every "library owns the container element + wiring; the hook fills only its visible content" customization point is named `create<Container>ContentElFn` (setting) + `create<Container>ContentEl` (protected, default reads the setting); `null` = that container's default content. Already conforming: trigger, item, tag, groupLabel. Brought into conformance by 7b: triggerArrow, triggerClearButton, tagRemoveButton. Later additions follow it: popupListNoResults (query-aware), selectAllRow (tri-state + counts). Plain `create<Element>El` (no `Content`) builds the WHOLE element.
4. **pack keys are message ids, never `Fn`-suffixed** (values may be strings or functions; s3 governs settings fields only, and the setting here is `uiTranslationPack`). Attribute strings: `<elementFamily><Attribute>` (`filterInputAriaLabel`, `triggerClearButtonAriaLabel`, `tagRemoveButtonAriaLabel`). Generated content strings: `<family><SemanticName>` (`triggerCountSummary`). Parameterized messages take RESOLVED primitives (`itemText: string`, counts) - never `T` - so a language pack can implement them; per-`T` control stays on the protected method (`itemToTagRemoveButtonAriaLabel`).
5. Private helpers may keep shorter names (they matter least) but still obey the s1 suffix rules.
6. **A predicate that composes MULTIPLE settings must not reuse one setting's bare name.** `is<X>` reading exactly `<x>Fn` is a 1:1 reader (`isGroupDisabled` <-> `groupDisabledFn`); when the answer layers more than that one setting, qualify the name so it cannot be mistaken for the raw read: `isItemEffectivelyDisabled` = `itemDisabledFn` OR the item's group's `groupDisabledFn` ("effectively" = layered final value, layer count not hard-coded).
7. **"label" is reserved for what HTML itself calls a label** (user ruling). The word appears in a name only where HTML names the concept `label`: the `<label>` element (`labelEl`; angularjs `ll-label-el`), `aria-label` / `aria-labelledby` (`ariaLabel`, `ariaLabelledBy`, the pack `*AriaLabel` keys), and `<optgroup label>` (the `groupLabel` element family: `.llselect-group-label`, `createGroupLabelContentElFn`). Anything else that says "label" for a display string is wrong: it collides with the `<label>` family and forces the reader to guess which sense the API means (the `<ui-llselect>` `ll-label` incident). A display string is TEXT - see rule 8.
8. **Display-string vocabulary: `toString` is the conversion, `text` is the value.** A function that CONVERTS an identity to its display string keeps JS's own idiom: `itemToString(Fn)`, `groupKeyToString(Fn)` - "to string" is external JS vocabulary (`Object.prototype.toString`, `String(x)`), quoted the same way ng-options' `label` clause is. A name denoting the display-string VALUE itself uses `Text`: pack key `selectAllRowText`, pack param `itemText: string`, angularjs `ll-item-text` (an expression producing the text; deliberately NOT `ll-item-to-string`, which would read as taking a function value like the `-fn` attributes do). One concept, two grammatical roles - operation vs value - and each role has exactly one word.

### 7b. Rename table (APPLIED)

| Kind               | Before                                        | After                                                                            |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------------- |
| classIdMap + CSS   | `clearClass` / `.llselect-clear`              | `triggerClearButtonClass` / `.llselect-trigger-clear-button`                     |
| classIdMap + CSS   | `tagRemoveClass` / `.llselect-tag-remove`     | `tagRemoveButtonClass` / `.llselect-tag-remove-button`                           |
| setting            | `createArrowElFn`                             | `createTriggerArrowContentElFn`                                                  |
| type alias         | `LLSelectCreateArrowElFn`                     | `LLSelectCreateTriggerArrowContentElFn`                                          |
| setting            | `createClearElFn`                             | `createTriggerClearButtonContentElFn`                                            |
| setting (multiple) | `createTagRemoveElFn`                         | `createTagRemoveButtonContentElFn`                                               |
| protected          | `createArrowEl`                               | `createTriggerArrowContentEl`                                                    |
| protected          | `createClearEl` (whole button)                | `createTriggerClearButtonEl`                                                     |
| protected NEW      | -                                             | `createTriggerClearButtonContentEl` (thin, reads the setting)                    |
| protected          | `createTagRemoveEl` (whole button)            | `createTagRemoveButtonEl`                                                        |
| protected NEW      | -                                             | `createTagRemoveButtonContentEl` (thin, reads the setting)                       |
| protected          | `itemToTagRemoveLabel`                        | `itemToTagRemoveButtonAriaLabel`                                                 |
| private            | `commitArrowElToDom`                          | `commitTriggerArrowContentElToDom`                                               |
| setting -> pack    | `filterInputAriaLabel` (flat)                 | `uiTranslationPack.filterInputAriaLabel`                                                     |
| setting -> pack    | `filterInputPlaceholder` (flat)               | `uiTranslationPack.filterInputPlaceholder`                                                   |
| setting -> pack    | `clearButtonAriaLabel` (flat)                 | `uiTranslationPack.triggerClearButtonAriaLabel`                                              |
| setting -> pack    | `itemToTagRemoveLabelFn: (item: T) => string` | `uiTranslationPack.tagRemoveButtonAriaLabel: (itemText: string) => string`                  |
| pack NEW           | - (hardcoded count summary)                   | `uiTranslationPack.triggerCountSummary: (chosenCount: number, totalCount: number) => string` |

`triggerCountSummary` params are named `chosenCount` / `totalCount`: the project vocabulary is `chosen*` (never `selected` - that is the ARIA spec string; never `all` - that is the bulk-action word).

### 7c. Audited, kept as-is

| Name                                         | Why kept                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `placeholder`                                | control-level concept (same as HTML input placeholder); the filter input's is fully qualified (`uiTranslationPack.filterInputPlaceholder`) |
| `clearable` / `filterable`                   | capability flags describe the CONTROL, not an element; verbs/adjectives are correct on actions and abilities                   |
| `clearSelection` / `toggleItem` / `open` ... | ACTIONS keep verbs (the noun rule is for elements only)                                                                        |
| `openClass` (`.llselect-open`)               | a state class on root, not an element name                                                                                     |
| `triggerDisplay`                             | already family-prefixed                                                                                                        |
| `popupListNoResults*`                        | named for what it DESCRIBES (the list's empty state), not where it sits (a popup child, the listbox's sibling)                 |
| keyboard / positioning / icons module fns    | audited, all conform to s1-s3                                                                                                  |

### 7d. Rulings

- **Button-system RULED IN** (`tagRemoveButton` / `triggerClearButton`): both ARE `<button>`s; one uniform rule; natural English (`<verb> button`). Supersedes the earlier `tagRemover` lean - the -er system has no usable form for clear (`Cleaner` / `Clearer` both broken).
- **Long names RULED ACCEPTABLE** (e.g. `createTriggerClearButtonContentElFn`): explicit beats brief - the reader must never have to guess a word or go grep the docs for what a name means.
