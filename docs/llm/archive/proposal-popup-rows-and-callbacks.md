# Popup list rows and settings callbacks: the design options, side by side

This document exists for an independent review. It describes one area of the `llselect` API, states the facts of the code as it is on `dev` today, and lays out every candidate design with the same level of detail. It does not say which candidate is preferred, and reviewers are asked not to guess.

## 1. Scope and the evaluation criteria

Two questions, which interact:

- Axis R, the row model: how the built-in "select all" row and the app-defined command rows inside the popup list relate to each other.
- Axis C, the callback contract: whether a settings callback receives the widget instance, and which ones.

Criteria to evaluate against, all of equal standing:

- Customization flexibility: what an app can build without subclassing, and what it can build with subclassing.
- Design consistency: one rule that explains the behavior, versus a list of special cases.
- Understandability: how much a reader must know to predict what the library does.
- No surprises: the concrete things a developer would trip on, in TypeScript and in plain JavaScript.
- The accessibility contract: the ARIA roles and keyboard rules in `docs/llm/A11Y.md` must stay coherent.
- Implementation and type complexity: generics, circular references, documentation burden.

Not a criterion: backward compatibility with the published version. The API is pre-1.0 and may change freely, so do not weigh migration cost, breaking changes or what has already shipped; judge the options on their merits alone.

## 2. Facts: the code today

Read these in the repo; they are the ground truth for the review.

### 2.1 The popup and its rows

- The popup (`popupEl`) holds, in order: the filter input, an optional header slot, the listbox (`popupListEl`, `role="listbox"`, the only scroll container), a no-results message, an optional footer slot.
- Header and footer slots: filled once, in the base constructor, by `createPopupHeaderContentElFn` / `createPopupFooterContentElFn` (both `(() => HTMLElement | null) | null`). Outside the listbox, never scroll, no ARIA role, never rebuilt. Controls inside are reached by Tab while the popup is open.
- Items: the selectable options, `role="option"`.
- Choose-all row (`LLSelectMultiple` only, setting `chooseAllRow: boolean`): always the first child of the listbox; `role="option"`; text from the translation pack `chooseAllRowText(chosenCount, totalCount)`; `data-chosen-state="none|some|all"`; `aria-selected` always set, `"true"` only when every visible enabled item is chosen; activation calls `toggleAllVisible()`; it is not rendered at all when nothing is actionable (`getVisibleEnabledItems()` is empty, for example when the filter matches nothing or `hideChosenRows` hid everything); it can be the initial active option when the popup opens with nothing chosen. Content hook `createChooseAllRowContentEl(chosenState, chosenCount, totalCount)` and setting `createChooseAllRowContentElFn` with the same three parameters. Class `chooseAllRowClass` plus `itemClass`. Built by the protected `createPopupListLeadingRowEl(): HTMLElement | null` (declared on the base, overridden in `LLSelectMultiple`); companions `focusLeadingRow(): boolean`, `onLeadingRowActivated(): void`, `replaceLeadingRowElInDom(): void`. Source: `src/multiple.ts`, `src/base.ts`.
- Action rows (`LLSelectBaseSettings`, both variants): `popupListActionRowsBeforeItems` / `popupListActionRowsAfterItems: readonly LLSelectPopupListActionRow[]`, default `[]`, copied at construction. Each descriptor is `{ textFn: () => string; createContentElFn?: () => HTMLElement | null; disabledFn?: () => boolean; onActivate: () => void }`. The library builds each row as `role="option"` with `aria-label` from `textFn`, no `aria-selected`, `aria-disabled` and a disabled class when `disabledFn` says so, class `popupListActionRowClass` plus `itemClass`. Rows are rebuilt on every list render and after every chosen change. They are never the initial active option, never a typeahead match, never the target when the focused item vanishes, and they stay rendered when the filter matches nothing. Builders: `createPopupListActionRowBeforeItemsEl(row, index)` / `createPopupListActionRowAfterItemsEl(row, index)` (protected, sharing a private body); per-row hooks `createPopupListActionRowContentEl(row)`, `isPopupListActionRowDisabled(row)`, `onPopupListActionRowActivated(row)`; `replacePopupListActionRowElsInDom()`.
- The ring (arrow-key order, one walk): choose-all row, action rows before the items, items, action rows after the items. Home / End reach the ends; PageUp / PageDown clamp across it; disabled rows are skipped. Initial active option on open: the first chosen item, else the choose-all row, else the first enabled item. `src/base.ts` (`ringLength`, `ringEntryAt`, `focusRingPosition`); contract `docs/llm/A11Y.md` "Action rows", "Choose-all (tri-state)", keyboard tables.
- Public multiple methods: `chooseAll()`, `unchooseAll()`, `toggleAll()`, `toggleAllVisible()`; protected `getVisibleEnabledItems(): readonly T[]` (the subset the choose-all row acts on; the tree-select demo overrides it to leaf nodes).
- Themes draw the dividers around the command rows with sibling selectors keyed on `chooseAllRowClass` and `popupListActionRowClass`.
- AngularJS wrapper (`angularjs/llselect-angularjs.js`): `ll-choose-all-row` (boolean), `ll-checkboxes` (default on: a live checkbox icon in every item and in the choose-all row, through `createChooseAllRowContentElFn`), `ll-popup-list-action-rows-before-items` / `-after-items` (descriptor arrays evaluated in scope; the wrapper clones each descriptor and calls the app's `onActivate` with the widget instance as its only argument, inside a digest).
- Vocabulary already fixed by the owner for any name that refers to the two ends of the list: "leading" for the rows at the start of the listbox and "trailing" for the rows at its end (the words "before" / "after" were read as time). Under every option below, names use leading / trailing.

### 2.2 Two requirements that every option must accommodate

- Pinned blocks: two boolean settings will let the rows at the start of the listbox and the rows at its end stick to the listbox edges while the items scroll (`position: sticky` on a `role="presentation"` wrapper, rows still in the ring). The choose-all row belongs to the leading block. Names of the flags are not part of this review.
- A filter-query event: `onFilterQueryChange: ((query: string) => void) | null`, fired after the list re-renders when the filter text actually changes. Not part of this review.

### 2.3 Facts about settings callbacks

- Every function-valued setting receives domain data only: `compareFn(a, b)`, `filterFn(item, query)`, `itemDisabledFn(item)`, `itemToStringFn(item)`, `itemToGroupKeyFn(item)`, `groupKeyCompareFn(a, b)`, `groupKeyToStringFn(key)`, `groupDisabledFn(key)`, `createItemContentElFn(item)`, `createGroupLabelContentElFn(key, items)`, `createPopupListNoResultsContentElFn(query)`, `createTagContentElFn(item)`, `createTagRemoveButtonContentElFn(item)`, `createChooseAllRowContentElFn(state, chosenCount, totalCount)`, `filterable` in function form `(items) => boolean`. Narrow context objects: `createTriggerContentElFn({ chosenItem, items })` / `({ chosenItems, items })`, `createTriggerArrowContentElFn({ isOpened })`. Nothing: `createTriggerClearButtonContentElFn()`, `createPopupHeaderContentElFn()`, `createPopupFooterContentElFn()`, `onOpen()`, `onClose()`, and the four action-row descriptor functions. Events with a meta object: `onChange(chosen, previous, meta)` with `meta.source: 'user' | 'api'`. No callback receives the instance. The translation pack's three functions (`chooseAllRowText`, `triggerCountSummary`, `tagRemoveButtonAriaLabel`) receive numbers and strings only and are built without importing the widget.
- The documented way to reach the instance is a closure: `let sel; sel = new LLSelectMultiple(el, { ...callbacks reading sel... })` (README, two examples; `demo/main.js`, six). It works for every callback that runs after `new` returns. Action rows are built when the popup opens, so their four functions always run after `new` returns.
- Callbacks the constructor calls, in order: `filterable` in function form (before `rootEl`, `triggerEl`, `popupEl` are assigned); `createPopupHeaderContentElFn` and `createPopupFooterContentElFn` (inside the base constructor, before the variant's field initializers run, so `LLSelectMultiple.chosenItems` is still `undefined` there and `getChosenItems()` would return `undefined` despite its `readonly T[]` type); then, at the end of the variant constructor, the initial trigger render calls `createTriggerClearButtonContentElFn`, `createTriggerContentElFn`, `createTriggerArrowContentElFn` (variant fields initialized, a further subclass's fields not yet). A demo hit the closure's construction-time limit: a header content function read the instance variable during the constructor and threw; the fix built the DOM outside the callback and applied `classIdMap` classes after `new` (commit `c65b1cc`).
- `this` inside a settings callback is currently the frozen settings object for a non-arrow function (calls are `this.settings.fn(...)`); for an action-row function it is the descriptor (`row.textFn()`). Undocumented.
- Typing facts, checked with `tsc --strict` on a scratch model: (1) a defaulted `Instance` type parameter on the settings interfaces fails with "Type parameter 'S' has a circular default" when the default names the class directly; it compiles when the default is written as `Base<T, GroupKey, BaseSettings<T, GroupKey, any>>` and the class constraint is `S extends BaseSettings<T, GroupKey, any>`; then a multiple's action rows see `toggleAllVisible()` without a cast and a subclass can pass itself as the type argument. (2) Typing each callback with the class it is declared on (base-declared callbacks receive `LLSelectBase<T, GroupKey>`, variant-declared ones the variant) compiles, and a row or `filterFn` declared on the base settings then cannot call multiple-only methods without a cast. (3) A hand-written interface of the public surface, implemented by the classes and used as the parameter type, compiles with no circular default and one more type to maintain.
- Precedents (API shapes, not documented rationales): react-select, MUI Autocomplete, Downshift, Headless UI, Vuetify slots and ng-select templates pass data or narrow context objects, with imperative access through a separate ref; Selectize / Tom Select bind the instance as `this`; Kendo passes `e.sender` in events; flatpickr, Tippy.js and AG Grid pass the instance to event hooks but not to data functions; TanStack Table puts `table` inside the cell context; the DOM passes the sender in events (`event.target`).

## 3. Axis R: the row model

### R1: two row kinds, one rule

- Rule: the library's choose-all row is a selection control that carries selection state; there is exactly one, always first, enabled by `chooseAllRow: true`. The app's action rows are commands with no selected state; any number, at the start or the end, in array order.
- API: as today, renamed. Settings `popupListLeadingActionRows` / `popupListTrailingActionRows: readonly LLSelectPopupListActionRow[]`; builders `createPopupListLeadingActionRowEl(row, index)` / `createPopupListTrailingActionRowEl(row, index)`; the choose-all hooks lose the word "leading": `createPopupListChooseAllRowEl(): HTMLElement | null`, `focusChooseAllRow(): boolean`, `onChooseAllRowActivated(): void`, `replaceChooseAllRowElInDom(): void`. `getVisibleEnabledItems()` becomes public so an app can build its own select-all row that acts on the same subset.
- Behavior: unchanged. The choose-all row keeps its fixed position, its tri-state attributes, its pack text, its self-removal when nothing is actionable, and its eligibility as the initial active option. Action rows keep theirs.
- What an app does for "select all somewhere else": `chooseAllRow: false`, plus an action row with `textFn` from `getUiTranslationPack().chooseAllRowText(chosen, total)` over `getVisibleEnabledItems()`, `disabledFn` when that subset is empty, `onActivate: () => sel.toggleAllVisible()`. That row has no `aria-selected`, no `data-chosen-state`, is never the initial active option, and stays rendered when nothing is actionable.

### R2: one row kind, the choose-all row is a descriptor the library provides

- Rule: every row inside the listbox that is not an item is an action row. The library ships one ready-made descriptor for select-all; the app places it wherever it likes among its own rows.
- API:

```ts
export interface LLSelectPopupListActionRow<Instance> {
  textFn: (sel: Instance) => string
  createContentElFn?: ((sel: Instance) => HTMLElement | null) | null
  disabledFn?: ((sel: Instance) => boolean) | null
  visibleFn?: ((sel: Instance) => boolean) | null            // absent = always rendered
  chosenStateFn?: ((sel: Instance) => LLSelectChosenState) | null   // present = the row carries aria-selected and data-chosen-state
  className?: string                                          // extra class on the row element (themes key the tri-state visuals on it)
  onActivate: (sel: Instance) => void
}
export function chooseAllActionRow<T, GroupKey = string>(): LLSelectPopupListActionRow<LLSelectMultiple<T, GroupKey>>
```

- Usage: `new LLSelectMultiple(el, { popupListLeadingActionRows: [chooseAllActionRow(), { textFn: () => 'Restore defaults', onActivate: sel => sel.setChosenItems(defaults) }] })`. The `chooseAllRow: boolean` setting is either removed (sub-option R2a) or kept as sugar that prepends `chooseAllActionRow()` to the leading rows (sub-option R2b). `createChooseAllRowContentElFn` and the choose-all hooks go; the factory's row uses `createContentElFn(sel)` for custom content (the AngularJS checkbox mode included) and the pack text through `sel.getUiTranslationPack()`.
- Behavior: the ring, roles and keyboard rules are unchanged. Initial active option on open: the first chosen item, else the first enabled item; no row is ever the initial active option (the choose-all row loses that). Self-removal becomes `visibleFn` (the factory's descriptor returns false when nothing is actionable), available to every row. Tri-state attributes come from `chosenStateFn`. The position is wherever the app put the descriptor.
- Requires axis C2 or C3 (the descriptor functions must reach the instance), and `getVisibleEnabledItems()` public.
- AngularJS: the `ll-choose-all-row` attribute becomes wrapper sugar for prepending the factory's row; `ll-checkboxes` renders the checkbox through `createContentElFn`. The five themes select the tri-state visuals through the `className` the factory sets.

### R3: keep the public boolean, share the mechanism underneath

- Rule: the app sees exactly what R1 shows (`chooseAllRow: true`, always first, own content hook), but the library builds the choose-all row through the same builder path and the same descriptor type as the action rows, as a library-owned descriptor prepended to the leading rows.
- API: as R1 for settings and the content hook; the choose-all builder hooks (`createPopupListChooseAllRowEl`, `focusChooseAllRow`, `onChooseAllRowActivated`, `replaceChooseAllRowElInDom`) are removed; a subclass reaches the row through the shared per-row hooks (`createPopupListActionRowContentEl(row)` and friends), which then receive the library's own descriptor for that row.
- Behavior: made uniform with the action rows where the uniform rule is cheap. The choose-all row renders disabled instead of disappearing when nothing is actionable, and it is no longer the initial active option (no row ever is). Position stays first. Tri-state attributes and pack text stay (set by the library on its own row).
- Visible behavior changes against today: a disabled row where the row used to vanish; the initial active option lands on the first item instead of the row when nothing is chosen.

## 4. Axis C: the callback contract

### C1: no callback receives the instance

- Rule: settings callbacks receive data and narrow context objects only; the instance is reached through the closure recipe, documented once, with the list of the six callbacks the constructor calls (where the closure cannot be read yet).
- Constructor-time slots: `createPopupHeaderContentElFn` / `createPopupFooterContentElFn` gain a narrow read-only context with exactly what is safe to read during construction:

```ts
export interface LLSelectPopupSlotContext { classIdMap: LLSelectClassIdMap; uiTranslationPack: LLSelectUiTranslationPack }
createPopupHeaderContentElFn: ((ctx: LLSelectPopupSlotContext) => HTMLElement | null) | null
createPopupFooterContentElFn: ((ctx: LLSelectPopupSlotContext) => HTMLElement | null) | null
```

- Everything else keeps its current signature. `this` inside callbacks is documented as unspecified, or neutralized (called with an undefined receiver).
- The AngularJS wrapper keeps passing the instance to `onActivate` as its own addition (templates cannot close over a variable).

### C2: the `on*` event callbacks receive the instance as their last parameter

- Rule: an event callback (`onOpen`, `onClose`, `onChange`, the action-row `onActivate`, the coming `onFilterQueryChange`) receives the widget as its last argument; a `*Fn` callback and the translation pack functions never do. Events never fire during construction, so the instance an event receives is complete.
- Signatures: `onOpen: ((sel) => void) | null`, `onClose: ((sel) => void) | null`, `onChange: ((chosen, previous, meta, sel) => void) | null`, `onActivate: (sel) => void`, `onFilterQueryChange: ((query, sel) => void) | null`. The static type of `sel` follows one of the three typing shapes in section 2.3 (a defaulted `Instance` type parameter on the settings interfaces and on `LLSelectPopupListActionRow`; the declaring class; or a public-surface interface).
- `this` neutralized. The AngularJS wrapper's `onActivate(sel)` then matches the core.
- A surprise to weigh: a named function with an optional trailing parameter passed as `onOpen: refresh` receives the instance in that parameter; plain JavaScript gives no error.

### C3: every settings callback receives the instance as its last parameter

- Rule: one shape for all: `filterFn(item, query, sel)`, `itemToStringFn(item, sel)`, `createItemContentElFn(item, sel)`, `createPopupHeaderContentElFn(sel)`, `textFn(sel)`, `onOpen(sel)`, ... Typing as in C2. `this` neutralized.
- Constructor-time callbacks receive the instance under construction; the docstrings state what may be read then (for example only `classIdMap` and the translation pack), or that it may only be captured for later use.
- The translation pack functions stay data-only (built without the widget).
- The same named-function surprise as C2, on about 25 signatures. The exported pure `gatherItemsByGroupKey`, which shares the grouping callback types, would need wrapping or a second type.

## 5. How the axes combine

- R1 and R3 work with C1, C2 or C3.
- R2 needs C2 or C3 (its descriptor functions compute counts and call `toggleAllVisible()`), or a library-recognized brand on the factory's descriptor instead of a parameter.
- Under every combination: the pinned blocks and the filter-query event of section 2.2 are built the same way; the choose-all row, whatever its mechanism, is part of the leading block.

## 6. What the review should produce

1. For each option on each axis, an evaluation against every criterion in section 1, in plain sentences.
2. One recommended combination (an R option and a C option), with the deciding reason and the strongest objection to it.
3. The three things a developer would most likely trip on under the recommended combination, and under the runner-up.
4. The exact TypeScript signatures the recommended combination changes (only what changes), and the AngularJS attribute changes.
5. Anything in the code or the accessibility contract that the recommended combination contradicts (file and symbol), and what would have to change.
