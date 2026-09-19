# Choose-all row and callback instance access: committee rounds 10-12

Companion to `popup-slots-research.md` (rounds 1-4) and `../handoff-popup-command-rows.md` (rounds 5-9). Rounds 10-12 were convened after the owner questioned two things: whether the built-in choose-all row should be one of the action rows (concern: "no pile of special exceptions"), and whether settings callbacks should receive the widget instance at all. The verbatim briefs and answers lived in the session scratchpad; this file records the questions, the votes, the arguments that carried, and the corrections the members made to the briefs. Decisions are the owner's; the status of each is at the end.

## Round 10: is the choose-all row an action row, or its own mechanism?

Question. Three options, equal weight: (1) keep two mechanisms and state the rule in one sentence, with an escape hatch (turn `chooseAllRow` off and write an action row calling `toggleAllVisible()`); (2) unify: the choose-all row becomes a library-provided action-row descriptor the app places anywhere; (3) keep the public boolean, unify the mechanism underneath (rendered through the action-row path, no self-hiding, no initial focus).

Vote: 6:0 for option 1, option 3 second everywhere, option 2 last everywhere.

Arguments that carried:

- The six differences (fixed first position, own builder / class / ring tag, may be the initial active option, vanishes when nothing is actionable, tri-state state and pack text, AngularJS checkbox content) are not six exceptions. They follow from one line: the choose-all row is a selection control that carries selection state; an action row is a command with no selected state. A11Y.md already records the two as two distinct APG deviations.
- The ring is already unified (`ringLength` / `ringEntryAt` / `focusRingPosition`); only the element builder and the storage field differ, and the builder is private to the app's view.
- Option 2 needs a brand check or instance access, a `visibleFn`, a state / attrs hook and an initial-focus flag: each a descriptor field with one consumer. Option 3 drops two user-visible behaviors for internal symmetry and still fixes the position.
- Position survey (members verified Kendo, Syncfusion, PrimeNG, bootstrap-select, DevExtreme, Vueform, React Select, Vuetify, Semi, Element Plus, Quasar; TDesign and Fluent UI v8 from memory): no library exposes a position setting for a BUILT-IN select-all; the two that let the app place it (TDesign `checkAll` option, Fluent UI `SelectAll` item type) put it inside the items array, which llselect's typed `T` items rule out. Apps that want it elsewhere build their own row or slot.
- One split: Opus 5 proposed, as a separately votable change, rendering the choose-all row disabled instead of removing it when nothing is actionable (uniform with action rows; the pinned block would not blink). The other five keep the vanish.
- Every member: make `getVisibleEnabledItems()` public so an app-built select-all row acts on the same subset; the tree-select demo's `protected override` must become `public override`.
- Every member: the pending rename stands (leading / trailing for the blocks, choose-all for the built-in row's hooks). The four hooks (`createPopupListLeadingRowEl`, `focusLeadingRow`, `onLeadingRowActivated`, `replaceLeadingRowElInDom`) shipped in 0.0.8 under the "leading" names, so the rename is a breaking change for subclassers and needs a release note.

Corrections to the brief: the handoff's sentence "rows are one mechanism (choose-all + action rows)" overstates it (they share the ring and the pin flag, not a descriptor); `createPopupListLeadingRowEl`'s docstring and demo 5.5 say "pinned" for "placed first", which collides with the coming sticky meaning; the choose-all docstring says `aria-selected` is set "only when all" but the code always sets it, `"true"` or `"false"`; the choose-all part of `focusInitial` lives in `src/multiple.ts`, not `src/base.ts`.

## Round 11: do settings callbacks receive the widget instance, and in what shape?

Question. Five contracts, equal weight: (A) status quo, the closure recipe documented; (B) the instance as the last parameter of every settings callback; (C) a context object with the instance inside, as the last parameter; (D) the instance only where a closure cannot work (constructor-time and template-sourced callbacks); (E) documented `this` binding.

Vote: 6:0 for B (C second for five members). Every member: neutralize `this` (call with an undefined receiver, optionally `this: void` in the types); never return `this` from mutators; even with the instance in hand, the choose-all row stays its own mechanism (what a descriptor still lacks is structural: selected state, initial focus, vanishing).

Typing proposals, checked afterwards with `tsc --strict` on a scratch model:

- A defaulted `Instance` / `Self` type parameter on the settings interfaces (Opus 4.8, Opus 5, Codex Sol). As written it fails with "Type parameter 'S' has a circular default"; it compiles when the default is spelled `Base<T, GroupKey, BaseSettings<T, GroupKey, any>>` and the class constraint is `S extends BaseSettings<T, GroupKey, any>`. A multiple's action rows then see `toggleAllVisible()` without a cast; a subclass passes itself as the type argument to see its own members.
- Declaration-site typing, no new parameter (Sonnet 4.6, Sonnet 5): base-declared callbacks receive `LLSelectBase<T, GroupKey>`, subclass-declared ones the concrete class. Compiles, and confirms the cost: a row or `filterFn` declared on the base settings cannot call multiple-only methods without a cast.
- A hand-written public-surface interface the class implements (Codex 5.5). Compiles, no circular default, the callback surface is listed explicitly, one more type to maintain.

Corrections to the brief: `LLSelectChangeMeta.source` is `'user' | 'api'`, not `'programmatic'`; function-form `filterable` is a callback too and is the first one the constructor calls (before `rootEl` exists); the constructor does not call `compareFn` or `itemToStringFn` (no initial items or selection); action-row functions are invoked as `row.textFn()`, so their accidental `this` is the descriptor, not the settings bag; a `let sel` closure read during construction throws `TypeError`, the `ReferenceError` of `c65b1cc` came from `const`.

The owner then pointed out that the brief listed the costs of not passing the instance but none of its benefits, so round 12 was convened as a labeled one-sided round.

## Round 12: the case AGAINST passing the instance (deliberately one-sided, then judge)

Question. Build the strongest case against; then state the final position: (a) do not pass, keep the closure recipe, fix the constructor-time slots another way; (b) pass everywhere; (c) something narrower.

Vote: (a) 4 (Opus 4.8, Sonnet 4.6, Codex Sol, Codex 5.5); (c) 2 (Opus 5, Sonnet 5: the `on*` event callbacks receive the instance last, `*Fn` and the translation pack never); (b) 0. Read against round 11: the same six members voted 6:0 for (b) when the brief leaned that way. The framing decided the count; the arguments below are what the owner should weigh.

Arguments that carried:

- Temporal type lie. Header / footer content functions run inside the base constructor before variant field initializers, so `getChosenItems(): readonly T[]` returns `undefined` there; function-form `filterable` runs before `rootEl` exists; the initial trigger render sees variant state but not a further subclass's fields. A fully typed parameter whose contract is "do not use it yet" is a trap, and it fails silently where the closure fails loudly (`c65b1cc`). Single mode hides the error (`undefined` is also "nothing chosen"); multiple mode throws on `.length`; `hideChosenRows` flips the outcome.
- Parameters are the rerun condition. `createTriggerArrowContentElFn({ isOpened })` reruns when the popup opens; a callback that reads `sel.isDisabled()` instead goes stale, because `setDisabled` does not rerender the trigger content. Header / footer functions run once, so every state read in them is stale by design.
- Purity and re-entrancy. `compareFn`, `filterFn`, `itemToStringFn`, `itemToGroupKeyFn`, `groupKeyCompareFn`, the disabled predicates run inside render, filter and grouping loops. `filterFn` calling `setItems()` recurses and the outer computation overwrites the newer result; `itemToGroupKeyFn` calling `getVisibleItems()` under `gatherGroups: true` recurses forever (the gathered cache is written after the pass). A closure can do the same today, but the signature would advertise it. The exported pure `gatherItemsByGroupKey` shares the callback types and would need wrapping.
- The rule cannot be uniform anyway: the translation-pack functions must stay data-only (the i18n bundle does not import `base.ts`), and the six constructor-time callbacks need a "not yet" rule. The exceptions move from the signatures into prose.
- Trailing-parameter hazard: `onOpen: refresh` where `refresh(force?)` has an optional last parameter starts receiving the instance (the `['1','2'].map(parseInt)` shape); TypeScript users get an error, plain-JS and `vendor/` users get a silent behavior change.
- Type coupling: settings interfaces referencing the classes (circular default or a parallel interface), `any` in the class constraint, every subclass passing itself to see its members; the closure's `sel` is inferred exactly, subclass members included, at no cost.
- Precedent, verified by two members against sources: react-select, MUI Autocomplete, Downshift, Headless UI, Vuetify, ng-select all pass narrow data or context; imperative access is a separate ref. Counter-examples: Selectize / Tom Select (`this`), Kendo (`e.sender`), TanStack Table (`table` inside the cell context), flatpickr / Tippy / AG Grid (events get the instance, data functions do not). No maintainer statement of "why not" was found; the rationale is inferred from the API shapes.
- The demonstrated needs have narrower answers: `c65b1cc` fixed the header case by building the DOM outside and applying `classIdMap` classes after `new`; a header count reads the closure from `onOpen` / `onChange` / the pending `onFilterQueryChange`; highlighting needs only the query; action rows are built after `new` returns, so the closure already reaches the instance in every row function.
- Against the alternative "build the slots on first `open()`": it breaks `popupHeaderEl` being non-null right after `new` and the ratified subclass recipe that moves the header above the filter input (DESIGN.md "Popup DOM lifecycle" and "Popup header / footer slots"). Rejected by every member who addressed it.
- The (c) case: `on*` callbacks never fire during construction (`onChange` is documented not to fire at construction; `onOpen` / `onClose` / `onActivate` need a real open, close or activation), so the instance they receive is complete; none of the harms above apply to them; the rule reuses the existing `on*` / `*Fn` split with no new category; the AngularJS wrapper's ratified `onActivate(sel)` would then match the core instead of being wrapper-only. The (a) members answered that events already reach the instance through the closure, and that the type-parameter cost arrives with the first typed instance parameter, events or not.

Mitigations the (c) members require: a rule sentence beside the `on*` / `*Fn` table in DESIGN.md; a test that no `on*` fires during construction; a note that `onClose` also fires from `destroy()`; `this` neutralized; a changelog line about the trailing-parameter hazard.

Fix for the constructor-time slots proposed by the (a) side (Codex Sol): give `createPopupHeaderContentElFn` / `createPopupFooterContentElFn` a narrow read-only context with exactly what is safe to read then, `classIdMap` and the resolved translation pack, in the shape of the existing `{ isOpened }` / `{ chosenItems, items }` contexts; this encodes "read only these during construction" in the type instead of the docs.

## Status

- Round 10: the owner's questions were answered; the owner then re-framed the premise (instance access), so no decision was taken on the choose-all row pending round 12.
- Rounds 11-12: the owner decides between (a) no instance parameter plus the narrow constructor-time context, (c) instance last on `on*` callbacks only, and (b) instance last on every callback. Recorded here so the decision rests on the arguments, not on either round's count.
