# Popup rows and settings functions: what was decided, and why

This document explains one corner of the API that took fourteen committee rounds to settle: the rows inside the popup list (the built-in "select all" row and the app's command rows), the pinned blocks, and whether a settings function receives the instance. Read it before touching any of those. It is written so that a reader with no memory of the discussion can understand each decision from this file alone. The discussion itself is recorded in `archive/popup-slots-research.md` (rounds 1-4), `archive/handoff-popup-command-rows.md` (rounds 5-9) and `archive/choose-all-and-callback-context-research.md` (rounds 10-14, with the final two-stage review). `DESIGN.md` and `A11Y.md` stay the owning contracts; this file is the long-form "why" behind their short rulings.

## 1. The words

- Instance: the object `new LLSelectSingle(...)` or `new LLSelectMultiple(...)` returns.
- Settings function: a field of the settings object whose value is a function. Examples: `filterFn`, `createItemContentElFn`, `onOpen`, and the four functions of an action row.
- The closure recipe: `let sel; sel = new LLSelectMultiple(el, { ...functions that read sel... })`. A settings function reaches the instance by reading the outer variable. This is the documented way. It works in every function that runs after `new` returns.
- Popup: the panel that opens under the trigger.
- Listbox: the scrolling area inside the popup. The only scroll container. `role="listbox"`.
- Item: a selectable option inside the listbox. `role="option"`.
- Choose-all row: the built-in "select all" row of `LLSelectMultiple`. Turned on by `chooseAllRow: true`. Always the first row in the listbox.
- Action row: a command row the app defines, such as "Restore defaults" or "Add a country". Built by the library from a descriptor `{ textFn, createContentElFn?, disabledFn?, onActivate }`.
- Leading rows: the rows at the start of the listbox, above the items: the choose-all row plus the leading action rows. One block.
- Trailing rows: the rows at the end of the listbox, below the items: the trailing action rows. One block.
- Slots: the header and the footer. They sit outside the listbox and never scroll.
- Pinned: stuck to the top or bottom edge of the listbox while the items scroll.
- The ring: the order the arrow keys walk: choose-all row, leading action rows, items, trailing action rows.

## 2. The decisions

- There are two kinds of rows. The choose-all row is a selection control. There is exactly one, always first. Action rows are commands. Any number, leading or trailing, in array order.
- No settings function receives the instance. Use the closure recipe. The two header / footer content functions are the only exception, and they receive a small read-only context, `LLSelectConstructionContext`, not the instance.
- Pinning is per block. One boolean for the leading rows, one for the trailing rows. The choose-all row pins with the leading block. A row cannot be pinned on its own.
- Names: leading / trailing for the two ends of the list. choose-all for the built-in row and its hooks. One builder per place, never one builder with a kind parameter.
- `getVisibleEnabledItems()` is public, so an app can build its own select-all row that acts on the same items as the built-in one.
- Inside a settings function, `this` is `undefined`.

## 3. Why the choose-all row is not an action row

The simplest way to see it:

- An action row is a button. You press it, it does one thing. It has no state.
- The choose-all row is a checkbox. It always shows how many items are chosen. It has three looks: none chosen, some chosen, all chosen. It has state.
- A screen reader reads them differently. The choose-all row is announced with "selected" or "not selected". An action row is not.

What it would take to make the choose-all row an action row:

- The descriptor type would need three more fields that only this one row uses: "do I carry a selected state", "do I disappear when there is nothing to select", "may I be the active option when the popup opens". Everyone who writes an action row would see those fields and skip them.
- Action rows are built one to one from the descriptor array: the i-th rendered row is the i-th descriptor. The choose-all row disappears when nothing is selectable. A row that can vanish breaks the one-to-one mapping, and the code that rebuilds rows in place and the ring position math would have to diff against a filtered list instead.
- The descriptor functions would need the instance to count items and to call `toggleAllVisible()`. Section 4 explains why settings functions do not get the instance.

The two behaviors the choose-all row has and an action row must not have:

- When the popup opens and nothing is chosen, the active option lands on the choose-all row. A keyboard user finds it at once. An action row is never the initial active option, because Enter pressed twice right after opening must not run a command.
- When nothing is selectable (the filter matches nothing, or `hideChosenRows` hid everything), the choose-all row is not rendered. A "select all" with nothing to select is noise. An action row stays rendered; "Add a country" still makes sense with zero matches.

Both behaviors are argued for in `A11Y.md` and pinned by `test/select-all.test.ts`.

The cost of this decision, stated plainly:

- The position of the built-in row is fixed. No setting moves it. None of the eleven libraries surveyed lets an app move a built-in select-all row either; the two that let the app place one (TDesign, Fluent UI v8) put it inside the items array, which the typed items of this library rule out.
- An app that wants "select all" somewhere else turns `chooseAllRow` off and writes an action row: text from `getUiTranslationPack().chooseAllRowText(chosen, total)`, counts from `getVisibleEnabledItems()`, `onActivate: () => sel.toggleAllVisible()`. That row has no `aria-selected` and no `data-chosen-state`, is never the initial active option, and does not disappear.
- A subclass can add the missing state to its own row: override `createPopupListLeadingActionRowEl` or the trailing twin, call `super`, then set `aria-selected`, `data-chosen-state` and `chooseAllRowClass` on the returned element. The themes then draw the tri-state look. A subclass still cannot move the built-in row (the list assembly is private), cannot make its own row the initial active option (the ring focus methods are private), and cannot make it disappear.

The one rule that explains every difference: the library owns the row that carries selection state; the app owns rows that run commands.

## 4. Why settings functions do not receive the instance

### 4.1 Some settings functions run before `new` returns

The constructor calls six settings functions, in this order:

- `filterable` in its function form, before `rootEl`, `triggerEl` and `popupEl` exist.
- `createPopupHeaderContentElFn` and `createPopupFooterContentElFn`, inside the base constructor, before the variant's fields are initialized. `LLSelectMultiple.chosenItems` is still `undefined` here.
- `createTriggerClearButtonContentElFn`, `createTriggerContentElFn`, `createTriggerArrowContentElFn`, from the initial trigger render at the end of the variant constructor. The variant's fields exist; a further subclass's fields do not yet.

If these functions received the instance, they would receive a half-built object with a full type. `getChosenItems()` is typed `readonly T[]` and would return `undefined`. In single mode that even looks correct, because `undefined` also means "nothing chosen". In multiple mode `.length` throws. `hideChosenRows` changes which one you get. A parameter whose contract is "do not use it yet" is a trap. The closure recipe fails loudly instead: reading the empty variable throws at once, which is exactly what happened in demo 15.4 (commit `c65b1cc`).

### 4.2 A function's parameters are its rerun condition

Every content function receives exactly the state that makes the library call it again. `createTriggerArrowContentElFn` receives `{ isOpened }` and reruns when the popup opens or closes. If it could read `sel.isDisabled()` instead, the value would go stale, because `setDisabled` does not rerender the trigger content, and nothing would warn. The header and footer functions run once, so every state read inside them is stale by design.

### 4.3 Data functions must stay data functions

`compareFn`, `filterFn`, `itemToStringFn`, `itemToGroupKeyFn`, `groupKeyCompareFn`, `groupKeyToStringFn`, `groupDisabledFn` and `itemDisabledFn` run inside the filter, sort, group and render loops. Today they take data and return data. They can be shared between instances and tested without a widget.

- `filterFn` calling `setItems()` recurses, and the outer pass then overwrites the newer result.
- `itemToGroupKeyFn` calling `getVisibleItems()` under `gatherGroups: true` recurses forever, because the grouped cache is written after the pass.
- A closure can do the same today. The difference is what the signature advertises. A parameter that hands over every mutator says "this is fine here".

### 4.4 The rule could not be uniform anyway

- The translation pack's functions (`chooseAllRowText`, `triggerCountSummary`, `tagRemoveButtonAriaLabel`) take numbers and strings only. The i18n bundle is built without the widget.
- The exported pure helper `gatherItemsByGroupKey` shares the grouping function types. It would need a wrapper or a second type.
- The six construction-time functions would need a "not yet" rule. The exceptions would move from the signatures into prose.

### 4.5 A trailing parameter surprises plain JavaScript

`onOpen: refresh`, where `refresh(force?)` has an optional last parameter, would start receiving the instance as `force`. This is the `['1', '2'].map(parseInt)` shape. TypeScript reports it; plain JavaScript and the AngularJS `vendor/` users get a silent behavior change.

### 4.6 The type cost is real

The settings interfaces would have to name the classes. A defaulted `Instance` type parameter creates a circular default; it compiles only when the default is spelled `Base<T, GroupKey, BaseSettings<T, GroupKey, any>>` and the class constraint carries `any`. Every subclass that wants its own members visible inside its functions must pass itself as a type argument. With the closure, `sel` is inferred exactly, subclass members included, at no cost. (Annotate it in TypeScript: `let sel: LLSelectMultiple<Country>`. An unannotated `let sel` is an evolving `any` inside the functions, and calls on it are not checked.)

### 4.7 Precedent goes both ways, and the narrow side fits this library

react-select, MUI Autocomplete, Downshift, Headless UI, Vuetify slots and ng-select templates pass data or a narrow context; the instance comes through a separate ref. Selectize and Tom Select bind the instance as `this`; Kendo passes `e.sender` in events; flatpickr, Tippy and AG Grid pass the instance to event hooks but not to data functions; TanStack Table puts `table` inside the cell context. No maintainer statement of "why not" was found. A framework-agnostic widget configured by a plain object and read by arrow functions sits with the first group.

### 4.8 Why not "events only"

Passing the instance to `onOpen`, `onClose`, `onChange` and `onActivate` only would be safe: events never fire during construction. It was rejected because it buys little. The README's own action-row example reads the instance inside `disabledFn`, which would still need the closure; only one of the four descriptor functions would benefit. The type cost of section 4.6 arrives with the first typed instance parameter, events or not. Aligning the core with the AngularJS wrapper's `onActivate(sel)` is not worth that; the wrapper passes the instance because a template has no variable to close over, and that reason is the wrapper's alone.

### 4.9 What the header and footer functions get instead

`createPopupHeaderContentElFn` and `createPopupFooterContentElFn` receive `LLSelectConstructionContext`, a read-only object with `classIdMap` and `uiTranslationPack`. Those are the two things that are complete during construction and the two things the one real bug needed (`c65b1cc` wanted `classIdMap.itemClass`). They are the only settings functions the closure can never serve, because the library calls them once and never again. The trigger content functions also run during construction, but they rerun on every render and already receive their own data, so they get nothing new. The name says the one fact a reader must know: this function runs while the instance is under construction.

### 4.10 `this`

Today `this` inside a non-arrow settings function is whatever the call site happened to bind: the settings object for most, `undefined` for `filterable` and `filterFn`, the descriptor for action-row functions. The rule is now: `this` is `undefined` in every settings function. The library calls them through a local reference. Anyone who wrote `this.close()` gets an error instead of a silent settings object. The translation pack is the one exception: its message functions are called as methods of the pack, so a pack may read its own other messages through `this`.

## 5. Why pinning is per block

- A pinned row is `position: sticky`. Two sticky rows in one block stack at the edge. A sticky row between two scrolling rows pins while its neighbors slide past it. The visual order then differs from the ring order, and the arrow keys walk a list the eye does not see.
- "Rows 1 and 3 pinned, row 2 not" has no sane rendering. Every fallback rule (reorder the ring, warn and degrade, per-row offset math) makes the behavior harder to predict.
- Per block, the wrapper element carries the sticky style, the theme draws one edge line, and the scroll-into-view math measures one height per edge.
- To have pinned commands and scrolling commands at the same end today: put the pinned ones in the header slot (outside the ring, reached by Tab) and the scrolling ones in the leading action rows. If real use ever needs per-row pinning, it would be a new builder such as a pinned-row variant, not a flag on the descriptor.

## 6. Why the names

- leading / trailing, not before / after: "before the items" was read as time by the owner. leading and trailing name a position in a sequence and nothing else.
- choose-all for the built-in row's hooks (`createPopupListChooseAllRowEl`, `focusChooseAllRow`, `onChooseAllRowActivated`, `replaceChooseAllRowElInDom`): "leading" now names the whole first block, so the built-in row cannot keep it.
- Two functions per place (`createPopupHeaderContentElFn` and `createPopupFooterContentElFn`; `createPopupListLeadingActionRowEl` and `createPopupListTrailingActionRowEl`), not one function with a kind parameter: a developer searching for "header" must land on the setting directly, and no builder in this codebase is multiplexed by a kind parameter. Two settings sharing one type is normal; the descriptor type is shared by both action-row arrays.
- `LLSelectConstructionContext`, not a "slot" context: "slot" appears in the docs but in no public identifier, and the name must tell the reader the one fact that matters, that the function runs during construction. The type can serve any other construction-time function later.

## 7. What this design costs

- The built-in choose-all row cannot move. A look-alike elsewhere lacks the initial focus and the self-removal even from a subclass.
- Every settings function that needs the instance uses the closure recipe, two lines, and in TypeScript should annotate the variable.
- A descriptor or handler shared across several instances needs a factory or a per-instance closure. The AngularJS wrapper does this with its late-bound `getSel`.
- The AngularJS wrapper's `onActivate(sel)` stays a wrapper-only addition and is documented as such.

## 8. How the decision was made, and a lesson

Rounds 1-9 designed the slots, the action rows and the pinned blocks. Rounds 10-12 re-opened two premises and produced contradictory counts: the same six members voted 6:0 for passing the instance when the brief leaned that way (round 11) and 4:2 against when asked to argue the other side (round 12). The counts followed the framing. The owner then asked for a two-stage review with every option side by side, no hint of a preferred option, compatibility with the published version explicitly not a criterion, and the reviews anonymized before six fresh judges weighed them. Stage one: five of six for two row kinds plus no instance parameter. Stage two: six of six, with "events only" the unanimous runner-up. The lesson for any future committee round: list the benefits of every option, including the status quo, and never let a brief carry a lean.

## 9. If you want to change this

- To make the choose-all row movable: the descriptor type gains `visibleFn`, `chosenStateFn` and a class field, the library exports a `chooseAllActionRow()` factory, the descriptor functions receive the instance (which means section 4 must be reopened), the initial-focus rule loses the row, and the in-place row rebuild and the ring math must diff against a filtered list. `archive/choose-all-and-callback-context-research.md` records that shape as option R2.
- To pass the instance to settings functions: the mitigations the committee required are a defaulted `Instance` type parameter with the `any` constraint, `this` neutralized, a fixed warning on every construction-time function, and a changelog note about the trailing-parameter hazard. Data functions should stay data functions even then.
- To pin a single row: add a pinned-row builder, not a descriptor flag; define what the ring does with a pinned row between scrolling ones before writing code.
