# Design notes

Architecture and API conventions for llselect. Code-style rules (braces, language, dash characters, etc.) live in `../../CLAUDE.md`; the keyboard / focus / ARIA behavior contract lives in `A11Y.md`. This file documents **what** to build and **why**, not how to write each line.

## API naming conventions

### Function-typed settings

Different categories of callbacks use different markers so callers can tell at a glance how the library will use the function. The marker is part of the **field name**, not the type alias.

| Category | Marker | Example |
|---|---|---|
| Event callback | `on*` prefix | `onChange`, `onOpen`, `onClose` |
| Other function (comparator, renderer, transformer) | `*Fn` suffix | `compareFn`, `createTriggerArrowContentElFn` |

Rationale:

- **`on*`** prefix is universally recognized in the JS ecosystem (DOM events, React props) as "callback the library invokes when an event happens". Use this for things the library fires AT the caller in response to user actions.
- **`*Fn`** suffix disambiguates settings whose value is a function the library invokes proactively (to compute, format, or produce DOM). Without the suffix, names like `renderArrow` read as a verb / method, creating doubt about whether the setting is a function or a config flag.
- The two prefixes/suffixes are mutually exclusive and have different semantic flavors (reactive vs. invertive), so combining them (e.g. `onChangeFn`) is never necessary.

Apply this rule to all new function-typed settings.

### Settings vs methods

llselect splits surface area by mutability:

- **Settings** (constructor argument, frozen after): immutable configuration - `filterable`, `compareFn`, `onChange`, `createTriggerArrowContentElFn`, `outsideClickBehavior`, `cssClassPrefix`. Behavior knobs.
- **Methods** (mutate state, fire side effects): `setItems`, `setChosenItem` (single) / `setChosenItems` + `toggleItem` (multi), `open`, `close`, `rerender`, `destroy` (tear-down; REQUIRED before discarding an instance that might be open, e.g. a framework wrapper's unmount). The data the component currently holds, plus lifecycle actions.

Never put mutable state (`items`, `chosen`, etc.) in settings as a "convenience". Dual write channels caused subtle bugs in select2 / choices.js that we deliberately avoid.

At runtime there is ONE resolved settings bag: `this.settings` holds base + variant fields, defaults applied, with `null` (never `undefined`) uniformly meaning "not set". The VALUE side deliberately differs: an empty single selection is `undefined` (`getChosenItem()`, `setChosenItem(undefined)`), which keeps `null` usable as a real item value for `T` and matches JS's absent-return convention (`Array.prototype.find`). A variant that adds settings resolves its own fields and passes them through `super(..., subclassSettings)` - the base constructor merges them so the bag is complete before any construction code (e.g. `createTriggerClearButtonEl`) can read it. The channel is typed by each class's third generic param `S`, defaulted to its own settings type: `this.settings` is `S` with no re-typing, and each `subclassSettings` param accepts exactly the extra fields (`Omit<S, keyof OwnSettings>`), so an extender's typo or missing field is a compile error. One commented cast per constructor remains - TS cannot prove "own fields + Omit<S, own keys>" reassembles a generic `S`. No variant setting lives in a loose instance field, and the exported `LLSelect*Settings` types describe the actual runtime object. The bag is frozen by convention, not `Object.freeze` - the library never mutates it after construction (two exceptions, both text chrome: `setUiTranslationPack`, which replaces `uiTranslationPack` and re-resolves `placeholder` - see "Texts (i18n)" - and `setPlaceholder`, which replaces the explicit placeholder), but extenders stay free to hang extra data on it.

The freeze boundary is a rule, not a per-field judgment call: **state and copy move at runtime; capabilities do not.**

- State is what a native `<select>` also mutates live: the items, the value, `disabled`. It never lived in the settings bag - `disabled` is an instance field behind `setDisabled()`, while `focusableWhenDisabled`, the capability DESCRIBING disabled behavior, stays frozen.
- Copy is locale-owned text: the pack and `placeholder`. Language switching changes it at runtime in real apps, and swapping it touches no structure - these are the only two true freeze exceptions.
- Everything else is a capability: it decides what DOM exists and how it is wired at construction. `clearable` gates whether the clear-button element exists; `filterable` decides which element carries `role="combobox"`; `cssClassPrefix` mints every class name. A capability setter would be a mini-rebuild (DOM, ARIA, focus) plus a permanent API surface, so the sanctioned change paths are: rebuild the instance (one build measures ~0.2 ms), or, where runtime variation is genuinely common, a function-valued setting evaluated per use - `filterable`'s predicate form re-evaluates on every open, so `filterable: () => flag` IS the runtime toggle. If a capability ever earns promotion, the filter input is the precedent: it is ALWAYS built and hidden by CSS, so the future toggle is a CSS flip, never a settings write channel.

### Customization model: settings configure, subclassing extends

User-facing guide (when to pick which, with examples): README "Customization". Two layers, not two competing mechanisms:

- **Settings configure; subclassing extends.** A normal user configures one instance via `*Fn` settings (no `extends`). Subclassing is for *extending* the library - a new select type, a framework wrapper, a core behavior change.
- **Each customization point is a `protected` method whose default reads its `*Fn` setting.** The library calls the method directly:
  - `itemToString(item)` - default `= itemToStringFn(item) ?? String(item)`.
  - `renderTriggerContent()` (single / multiple) - default reads `createTriggerContentElFn(ctx)` first, else the variant's label / count. `ctx` is variant-specific (`chosenItem` for single, `chosenItems` for multi).
- **Override = replace.** Overriding the method replaces its default (setting included); the override wins, by plain OO. There is no resolver forcing the setting to win - that machinery was removed, it fought the low-level design. An extender who still wants the setting reads it / calls `super`.
- **The capability line: settings stop at CONTENT.** Every `create*ContentElFn` fills what an element SHOWS; the element itself (e.g. the `role="option"` row: its attributes, its structure) plus the ARIA the library pins on it stays library-owned. Changes to the library-built elements deliberately have no setting (a setting must not be able to break the ARIA contract); they go through the `create*El` overrides, i.e. subclassing. Demo section 14 shows the split side by side.
- **Construction-time overridable methods read only base state.** The constructor renders the trigger once (`renderTrigger()` in the `LLSelectSingle` / `LLSelectMultiple` constructor, right after `super()`), so the trigger `create*El` / `renderTriggerContent` methods run BEFORE a further subclass's own field initializers - JS runs those only after the super constructor returns (the classic virtual-call-in-constructor). An override of a trigger method that reads its OWN subclass fields therefore sees them `undefined` on that first render. The recipe: construction-time CONFIGURATION goes into the typed `subclassSettings` channel, which is complete before any construction code runs (the tree-select demo's `defaultExpandDepth`); genuine instance STATE either tolerates defaults during construction (read the field with a fallback) or is repainted by `rerender()` at the end of your own constructor. The popup-list methods (`createItemEl`, `getVisibleItems`, `createPopupListLeadingRowEl`) do NOT run at construction - they wait for the first `open()` - so an override that reads fields only there (the tree-select demo) needs nothing. The clear-button methods (`createTriggerClearButtonEl` / `createTriggerClearButtonContentEl`) build once in the BASE constructor when `clearable`, even earlier than that trigger render, and `rerender()` rebuilds the button through the same methods - so the same recipe repairs them.

So: configure with settings (the common path); override `protected` methods only when extending. The two coexist with no precedence fight.

### Element family naming

Element refs and the CSS classes that style them share a prefix so the relationship is obvious from the name alone:

```
rootEl              .llselect-root
triggerEl           .llselect-trigger
  triggerContentEl  .llselect-trigger-content
  triggerArrowEl    .llselect-trigger-arrow
popupEl             .llselect-popup
  popupListEl       .llselect-popup-list
                    .llselect-item
                    .llselect-item-focused
                    .llselect-group        (phase 10)
                    .llselect-group-label  (phase 10)
```

Direct children of a major family get the family's prefix (`triggerContentEl`, `popupListEl`). Deeper / structurally-distinct concepts (`item`, `group`) stand on their own without an inherited prefix - they're universally meaningful in the library's namespace.

### ARIA roles vs JS names

ARIA role attribute values (`"combobox"`, `"listbox"`, `"option"`, `"group"`, `"searchbox"`, `"checkbox"`) are spec strings and stay verbatim in `setAttribute` calls. JS-side names are independent and follow the rules above (e.g. our `role="listbox"` element is called `popupListEl`).

The full keyboard / focus / ARIA behavior contract is in `A11Y.md`. The `combobox` role sits on the filter input when `filterable: true` (the trigger demotes to a `button`); with `filterable: false` the trigger itself is the `role="combobox"` host. Both modes shipped with Phase 8 and are final by design, not transitional.

## Library scope

llselect is a **low-level** select library. It provides:

- DOM scaffold + ARIA wiring
- Positioning, keyboard navigation, lifecycle (open/close/rerender)
- Stable CSS class hooks for every structural slot

It does **not** provide:

- Default visual styling (themes are opt-in, shipped separately)
- Item content beyond the configured `itemToString` (no built-in icon / description / avatar slots inside items)
- Arbitrary trigger markup out of the box - the built-in multi-select displays are `'count'` and `'tags'` (`triggerDisplay`); `createTriggerContentElFn` takes over the trigger entirely. See "Tags (triggerDisplay)".

When in doubt, the answer is "lib provides a structural slot; the user fills it". This keeps API surface tight and avoids feature creep.

## `<form>` integration (ruled out of core)

RULED: no form-integration setting; the library never creates form controls. README "`<form>` integration" ships a hidden-`<input>` recipe instead. A "minimal hidden `<select>` + `<option>` mirror" setting was considered and rejected:

- **Form compatibility is an iceberg, not a serializer.** Honest parity needs: a `name` setting, an item-to-submit-string mapping (a new setting - `itemToString` is display text, "Taiwan" not "TW"), `form.reset()` re-sync, constraint validation, `<label for>` focus redirection (this one half DOES ship standalone as the `labelEl` setting - see A11Y.md "Accessible name"), autofill reverse-sync, and the multi `name` spelling the backend dictates (`countries[]` for PHP / Rails, bare repeated `name` for Go / Python - no correct library default exists). Shipping only the submission tip turns a documented limitation into surprise bugs; shipping it all is framework-wrapper territory ("Library scope") - the AngularJS package already gets full form semantics via `ngModel` / `form.$valid` with zero hidden DOM.
- **A hidden `<select>` is the worst mirror shape.** Everything a `<select>` offers over hidden inputs requires the FULL option list plus focusability: autofill needs options to pick and a `change` listener syncing back; `required` on a `display:none` control blocks submit with a console-only "not focusable" error (select2 resorts to sr-only hiding to keep the bubble reachable); `<label for>` sends clicks/focus to the hidden element. A chosen-values-only "minimal" select keeps all of those traps and adds nothing over `<input type="hidden">`, which is inert by spec: unfocusable, no tab stop, outside the a11y tree, excluded from constraint validation.
- **Full-option mirror (the Radix / React Aria shape) also rejected.** It is O(items) resting DOM per instance - the node count the benchmark tables lead with - plus the reverse-sync / reset / validation contract above. Those libs sit inside component frameworks where that contract is cheap to maintain; llselect is the layer such wrappers are built on.
- **A shipped `llselect/form` helper would degenerate into the recipe.** `onChange` is a single callback slot: an attach-style helper fights the app for it, and a helper the app must call from its own `onChange` is just the recipe with a dependency. Revisit only on real demand.
- **`formdata` event rejected as the recipe mainline**: `form.addEventListener('formdata', ...)` would need no hidden DOM at all, but it is Safari 15+, above the Safari 14.1 floor. Hidden inputs are floor-safe.

## Texts (i18n)

All chrome strings (AT labels + generated text) live in ONE base setting `uiTranslationPack` (contract: the `LLSelectUiTranslationPack` interface atop `src/i18n.ts`): input is `Partial<LLSelectUiTranslationPack>`, resolved against the English defaults (`en` - the same object the `@llselect/core/i18n` subpath exports). Static strings are plain strings; parameterized messages are functions taking RESOLVED primitives (`itemText: string`, counts) - never `T` - so a language pack can implement them without knowing the item type. Per-`T` control stays on the protected methods (e.g. `itemToTagRemoveButtonAriaLabel`). Key naming rules: naming-conventions.md s7a.4.

The `placeholder` SETTING stays app copy - an explicit value always wins and packs never set it. But its library DEFAULT (`'Please select'`) is chrome, so it lives in `uiTranslationPack` as `triggerPlaceholder` and localizes with the pack; resolution is `settings.placeholder ?? uiTranslationPack.triggerPlaceholder`. (select2 has no such key only because it ships no default placeholder at all; llselect does, so the default must be translatable.)

The resolved bag is publicly readable via `getUiTranslationPack()` (defaults + pack + overrides merged), so app code can reuse the library's translations - e.g. an app-owned tooltip on a remove button - instead of keeping a second translation source.

The pack is one of the two settings fields mutable after construction: `setUiTranslationPack(pack: Partial<LLSelectUiTranslationPack>): void` re-runs the constructor's resolution (merged over the built-in `en`, NOT over the previous pack; an explicit `placeholder` keeps winning), re-applies the pack-owned attributes `rerender()` cannot reach (filter input placeholder / fallback `aria-label`, clear button `aria-label`), then re-renders - so switching language needs no re-`new` and chosen state survives. The other is the placeholder: `setPlaceholder(placeholder: string | null): void` replaces the explicit placeholder with immediate effect (`null` = revert to the pack default, mirroring an unset constructor `placeholder`; the explicit value keeps winning over later pack changes). These two are the only settings with runtime setters - both are copy, per the freeze rule in "Settings vs methods" (`setDisabled` changes state, which never was a setting, so it is not an exception).

Language packs are pure data under `@llselect/core/i18n` (50+ locales; `uiTranslationPackByLocale` indexes them by minimal BCP 47 tag): opt-in, tree-shakeable, zero behavior, so bundling translations does not violate "low-level". Layout: one file per pack under `src/i18n/<export>.ts` (`en` included - it is just the built-in pack), and `src/i18n.ts` as the barrel (the contract interface + re-exports + the locale index; pack files type-import the barrel - erased at compile time, so no runtime cycle). `base.ts` imports exactly `src/i18n/en.ts`, never the barrel, so the main bundle carries exactly one pack. Usage: `uiTranslationPack: zhTW`, or a per-key override on top: `uiTranslationPack: { ...zhTW, filterInputPlaceholder: '...' }`.

## RTL

Zero new API: the component inherits the environment's direction (`dir` attribute / CSS `direction`) exactly like a native element. There is deliberately no `rtl` / `dir` setting (react-select's `isRtl` prop exists to service its CSS-in-JS pipeline; a DOM library has no such constraint).

Two layers, owned by different parties:

- **Chrome direction (the library's layer).** The trigger is a flex row, so the slot order (content | clear button | arrow) mirrors automatically under `dir="rtl"` - the arrow lands on the LEFT, matching the native `<select>`. (Libraries whose arrow stays on the right in RTL are carrying un-mirrored physical CSS, not making a design choice.) Shipped themes use logical properties only (`padding-inline`, never left/right), and `text-overflow: ellipsis` truncates at the logical end for free. The single direction-aware piece of JS is the `'fit-content'` popup width policy: in RTL it right-aligns to the trigger and grows LEFTWARD (direction read from `getComputedStyle(triggerEl).direction` once per open); `'match-trigger'` is position-identical in both directions.
- **Data direction (the app's layer).** Mixed RTL/LTR item texts are handled by the Unicode Bidi Algorithm per item; items and chips are separate blocks / flex items, so labels never reorder across each other, and the trigger's layout never changes because of a chosen label's script (same as native). The remaining caveat is WEAK characters (digits, parentheses, punctuation): their placement follows the element's base direction, which is inherited, never content-detected. The fix is per-item `dir="auto"` or a `<bdi>` wrapper, supplied by the app via `createItemContentElFn` - the app knows its data, and the library does not force `dir="auto"` because it also flips per-item text alignment, making mixed lists ragged.

Demo: section 12 (the ar / he packs set `dir="rtl"` on the mounts and use a mixed-direction item list, weak-character examples included).

## Rendering model

- State setters (`setItems`, `setChosenItem`, `setChosenItems`, `toggleItem`, `chooseAll`, ...) trigger the needed re-render automatically and fire `onChange` only when the value actually changed (compared via `compareFn`).
- **Render granularity matters at scale.** Rebuilding the whole popup list is O(n) DOM work; for large lists that dominates. So:
  - Bulk changes (replace the whole set, select/deselect all, `setItems`) rebuild the list via `renderPopupList` / `rerender`.
  - Single-item changes (multi-select `toggleItem`) use `replacePopupListItemElInDom(item)`, which replaces just that one item's element. DOM work stays O(1) regardless of list size, so toggling one selection in a 10k-item list does not recreate 10k nodes. (The lookup to find the item is O(n), but a comparison loop is negligible next to DOM mutation + reflow.) A vdom framework would instead diff the list render on each state change; llselect skips that by knowing exactly which item changed. (No published benchmark - this is an implementation description, not a measured comparison.)
- External mutation of an item object's properties (e.g. `users[0].name = 'X'`) is **not** auto-detected. Call `rerender()` to reflect the change in the DOM. `rerender` is a pure visual refresh: it does not fire `onChange` and does not run `onItemsChanged`.

## Popup DOM lifecycle (construction vs open)

The popup's PERSISTENT elements are built in the constructor and stay in the DOM for the instance's whole life, hidden while closed; the option ROWS are lazy (built on `open()`, cleared on `close()` - Phase 3). Per instance the persistent part is five nodes: `popupEl` (`hidden`), `popupListEl` (the listbox), `filterInputEl`, the no-results element, and the hidden value-mirror span next to the trigger.

- The costly axis is the rows (O(n)) and that axis IS lazy; the persistent part is O(1), so pre-building trades five hidden nodes for the guarantees below.
- ARIA needs the listbox to exist while CLOSED: the trigger carries `aria-controls` -> `popupListId` in both states (see the `A11Y.md` role table), and an ID reference to a nonexistent element is a defect that audit tooling flags - and closed is the state nearly every audit sees. The value-mirror span is referenced by the accname chain while closed for the same reason.
- The filter input's always-built rule has its own recorded rationale below ("Filter box (Phase 8) architecture").
- `setUiTranslationPack` re-applies pack-owned attributes (filter placeholder / fallback `aria-label`) while closed; if these elements were lazily built, every such path would need "if built yet" guards.
- Subclass contract stability: the `create*El` element builders are protected extension points with ONE defined call time (construction), not "whenever first open happens".
- The constant child list is also what makes open / close structurally side-effect-free for the host page - see "In-place popup (no body portal)", host sibling-safety.

## In-place popup (no body portal)

`popupEl` stays a child of the component root; it is never appended to `document.body`. Escaping ancestor clipping is `position: fixed`'s job instead: a fixed element's containing block is normally the viewport, so ancestor `overflow` never clips it (demo 2.1 shows the popup working inside a scroll container). What staying in-subtree buys - each point is load-bearing code, not taste:

- Outside-click and focus-out classify inside-vs-outside with `rootEl.contains(target)`; the popup being inside the root makes clicks / focus in the popup "inside" with zero extra cases. A portal would need every such check duplicated against a second subtree.
- `destroy()` is one `rootEl.replaceChildren()`; nothing can be orphaned in `body`. (The benchmark docs record the real-world version of this failure in portaling libraries: leftover containers in `body`, selectors hitting the wrong widget's dropdown.)
- Inherited context is right for free: themes set font / color on `.llselect-root`, and direction comes from the environment's `dir` (see "RTL" - there is no RTL setting). A portaled popup inherits BODY's context and must copy all of it over.
- Reading order: the popup sits immediately after the trigger for AT virtual cursors.
- Top-layer compatibility: inside an open native `<dialog>`, an in-subtree popup renders within the dialog's top-layer context, while a body-portaled popup renders UNDER the dialog and its `::backdrop` - the classic portal-in-dialog failure. In-place is the arrangement that keeps working there.
- Host sibling-safety: the caller's element BECOMES the root (nothing is ever inserted next to it), and the root's child list is invariant from construction to destroy - the popup element exists from the start, `hidden` while closed, out-of-flow (`position: fixed`, set BEFORE unhiding) while open. So sibling-dependent CSS in the host layout (`:nth-child`, `.btn + .btn`, `:first/last-child` - the uib-tooltip-in-a-btn-group / select2-inserted-container breakage class, where SHOWING the popup inserts an element next to the trigger and reflows the host) never flips on open / close. Pinned by `test/structure.test.ts`.

Accepted costs - two classes, both solved by the planned top-layer enhancement (`TODO.md` "Popup top layer via Popover API"), neither fully by a body portal:

- **Displacement**: an ancestor that creates a fixed-position containing block (`transform`, individual `translate` / `scale` / `rotate`, `filter`, `perspective`, `will-change: transform`, `contain: paint` / `layout` - including via `content-visibility`) re-scopes `position: fixed` to itself, so the positioner's viewport coordinates land displaced.
- **Paint trapping**: the themes' `z-index: 1000` on the popup is local to whatever stacking context the ROOT sits in (any ancestor with `z-index` on a positioned element, `opacity < 1`, `mix-blend-mode`, `isolation`, ...). Overlapping content in a higher-ordered context - classic case: a sticky header with a root-level `z-index` painting over a popup that flipped upward out of a low-z-index card - covers the popup even though it is positioned correctly. This is the residual form of the append-to-body-era landmines: `position: fixed` already removed ancestor-overflow clipping and offsetParent coordinate math, the two big ones that forced absolute-positioned popup libraries (UI Bootstrap tooltips / dropdowns etc.) into blanket `appendToBody: true`, but paint order stays context-trapped.

The fix is IMPLEMENTED as a feature-detected top-layer enhancement (constructor + `open()` / `close()` in `base.ts`): where the Popover API exists, the popup carries `popover="manual"` from construction and `open()` calls `showPopover()` - the top layer paints above ALL stacking contexts and has no fixed-position containing block, and the element does NOT move in the DOM, so every in-subtree invariant above keeps holding; the positioner keeps supplying the inline `position: fixed` coordinates unchanged. Browsers without the API run the plain `position: fixed` path unchanged - for them the two failure classes remain the accepted limitation (`TODO.md`). Details locked in:

- `'manual'`, not `'auto'`: `auto` brings the browser's light dismiss (outside click / Esc close), which would fight `outsideClickBehavior` and the library's own Esc handling. `manual` takes only the top-layer painting; behavior authority stays with the library.
- UA `[popover]` stylesheet interactions: `inset: 0` would over-constrain the box (and in an RTL containing block an over-constrained `left` LOSES to `right: 0`), so `open()` pins inline `right/bottom: auto` and `close()` clears them. `showPopover()` must run BEFORE the positioner measures (a popover not in showing state is `display: none !important`). The UA popover chrome (`border` / `padding` / `color` / `background`) is beaten by explicit author declarations in every shipped theme (vanilla gained explicit `color` / `padding` for this); custom themes must set popup chrome explicitly or the UA popover look leaks in top-layer mode.
- Force-hide resilience: `dialog.showModal()` hides all popovers behind the library's back; the paired `hidePopover()` in `close()` then throws `InvalidStateError` and is caught - state resyncs there, and the next open recovers.

A body portal, by contrast, fixes only displacement - a body-appended popup still loses paint order to root-context competitors above its own `z-index`, renders UNDER an open `<dialog>` and its `::backdrop`, and forfeits the invariants above - so it stays rejected.

## Filter box (Phase 8) architecture

Locked decisions for the filterable variant. Keyboard / focus / ARIA contract is in `A11Y.md`.

- **`<input>` is always built** into `popupEl` above `popupListEl`, even when `filterable: false`. The non-filterable case carries the `hidden` attribute (not `disabled`, not `readonly`). Cost: one unused element when not needed. Benefit: future runtime toggle (select2-style `minimumResultsForSearch`, setItems crossing a threshold, ...) is a CSS flip rather than a DOM rebuild.
- **Focus host branches by current filterable state**, not by DOM existence:
  - `filterable: true`: trigger becomes `role="button"` (`aria-haspopup="listbox"`), focus moves to the input on open, `aria-activedescendant` lives on the input.
  - `filterable: false`: trigger stays `role="combobox"`, focus stays on the trigger, `aria-activedescendant` lives on the trigger. Identical to the pre-Phase-8 behaviour - non-filter selects regress nowhere.
- **No subclass split.** Filtering is a capability setting on the existing `LLSelectSingle` / `LLSelectMultiple`. Subclassing per feature would multiply combinatorially (filter x optgroup x ...); a setting composes.
- **Settings:** `filterable: boolean | ((items: readonly T[]) => boolean)` (default `false`). The predicate form is the conditional-display knob (select2's `minimumResultsForSearch`, rewritten as a caller-authored predicate so the condition is self-documenting and not count-only): evaluated against the full item list on every `open()`, never mid-open - crossing the threshold via `setItems` applies on the next open, so the focus host is never yanked while the popup is up. Also: `filterFn: ((item, query) => boolean) | null` (default `null` = case-insensitive substring on `itemToString`); `uiTranslationPack.filterInputAriaLabel` (default `'Search'` - a FALLBACK accessible name for the input, used only when the app supplies neither `ariaLabel` nor `ariaLabelledBy`; the field name replaces it otherwise) and `uiTranslationPack.filterInputPlaceholder` (default `'Filter (Esc to clear)'` - also teaches the Esc-clears-filter behavior; `null` = no placeholder) - see "Texts (i18n)" below. IME-aware filtering (composition-guarded) is part of the contract; see `A11Y.md`.

### Query-match highlighting (helper, not a setting)

`createHighlightedTextEl(text, query, createMatchElFn?)` (query-highlight.ts) builds a detached `<span>` with each case-insensitive `query` occurrence wrapped in `<mark>` (or the caller's element). Decisions:

- Exported pure helper, NOT a boolean setting: the customization point already exists - `createItemContentElFn` re-runs per rendered row per render (filter keystrokes included), so core carries no highlight state. A setting could only affect the default text path and would silently stop the moment a custom content fn takes over; the helper composes with any content fn. Same packaging as `gatherItemsByGroupKey` / the icon builders.
- Mirrors the built-in matcher exactly (`toLowerCase` both sides, no trim): the marks must agree with what filtering kept. A custom `filterFn`'s ranges are unknowable to the library; the docstring says to mark your own.
- Accessible names are immune by construction: when a content fn returns an element the option's `aria-label` comes from `itemToString`, so `<mark>` never leaks into what AT speaks.
- Offsets are found on the lower-cased pair and applied to the original string; when lower-casing changes a length (a Unicode expansion, e.g. U+0130) it degrades to unmarked plain text rather than marking wrong ranges.
- Default mark is a bare `<mark>`: native styling works with zero CSS; themes may restyle. `createMatchElFn` returns a fully built element inserted as-is.
- The ctx-param question (letting `createItemContentElFn` receive the query without the `let sel` closure) is deferred: TODO.md "Callback context / instance access review".

## Disabled (Phase 9)

Two independent axes, modelled differently on purpose.

- **Control-level** (the whole select): runtime *state*, set imperatively.
  - `setDisabled(boolean)` + `isDisabled(): boolean`. Whole-control disabled is universally a boolean (a `disabled` prop in React libs; a method like choices.js `.disable()` / select2 in vanilla ones) - never a predicate. The method form matches both those vanilla libs and llselect's own state-via- method pattern. NOT a setting - disabled is mutable state like `items` / `chosenItems`, and this design keeps mutable state out of settings. Default enabled; to start disabled, call `setDisabled(true)` after construction.
  - `focusableWhenDisabled: boolean` setting (default `false`) - the only knob; controls whether a disabled trigger stays in the tab order.
  - Disabled trigger: `aria-disabled="true"`, `data-disabled="true"`, `tabindex` = `focusableWhenDisabled ? 0 : -1`. `open()` / `toggle()` / keyboard are no-ops; an open popup is closed by `setDisabled(true)`.

- **Item-level** (individual options): derived *property*, read declaratively.
  - `itemDisabledFn: ((item: T) => boolean) | null` setting (default `null` = nothing disabled). Matches react-select `isOptionDisabled` / MUI Autocomplete `getOptionDisabled` - the flat-generic-options libraries closest to llselect. A predicate is the only generic-`T` option: the data-field approach (native / Ant / choices / select2 carry `disabled` ON the option) needs the option to be an object with a known field, which is impossible when `T` is unknown. `protected isItemEffectivelyDisabled(item): boolean` is the internal helper (also for subclasses overriding `createItemEl`); not public. NO `setItemsDisabled`: a predicate subsumes it (it can read an external set and you call `rerender()`), keeps a single source of truth, avoids reconciling a disabled-set across `setItems`, and is faster - item identity is `compareFn`-based, so a maintained set is O(n*d) membership vs the predicate's O(1) property read. Evaluated once per item per render, never cached across renders (avoids react-select's stale-disabled-between-renders bug).
  - Disabled item: `aria-disabled="true"`, `.llselect-item-disabled` class, no click selection - selection is truly blocked, not merely `aria-disabled` (avoids MUI's disabled-options-still-selectable bug) - and skipped by keyboard nav (arrows / Home / End / Page land on the nearest enabled item; if none in the travel direction, focus stays).

Why the asymmetry (method for control, predicate for item): control-disabled is an app decision not derivable from any item, and is universally a plain boolean; item-disabled is typically intrinsic to the item (out-of-stock, no permission) and, for a generic-`T` flat-options library, can only be asked via a predicate - exactly what react-select and MUI Autocomplete do.

Cross-cutting:

- **Never the native `disabled` attribute - always `aria-disabled`.** Native `disabled` suppresses pointer + focus events, which blocks the hover / focus tooltip that would explain *why* a control is disabled. A custom control keeps the element perceivable. The library only exposes hooks (`aria-disabled` / `data-disabled` / `.llselect-item-disabled`); it never ships or wires a reason / tooltip itself (that would fight tooltip libraries' own `aria-describedby`).
- **Themes** convey disabled with `cursor: not-allowed` + opacity, never `pointer-events: none` (which would re-block hover tooltips).
- **Selection retention:** an already-chosen item that becomes disabled stays chosen (matches native: disabling a selected `<option>` keeps it selected). `setChosenItem(s)` is unrestricted - programmatic selection ignores disabled.
- **Bulk ops skip disabled:** `chooseAll` chooses every *enabled* item and preserves any already-chosen disabled item; `unchooseAll` clears enabled choices and preserves disabled-chosen; `toggleAll` compares only enabled items.

Group-level disabled (a disabled optgroup disabling its items) is specified in "Optgroup (Phase 10)" below; it layers on this item-level disabled.

## Optgroup (Phase 10)

Decided: grouping is a **derived projection of the flat `items` list**, not a nested data structure. `items` stays `T[]`; a setting maps each item to a group *key*, and the group's label + disabled state are derived from that key. Design research (how native / select2 / choices / react-select / MUI / Downshift model it) is in `archive/optgroup-research.md`.

### Data model: flat + derived, mirroring the item layer

Rejected: a nested shape (`(T | { label, items: T[] })[]` or a second `setGroups()` channel). Chosen: flat items + `*Fn`s that derive the group. The group layer is a **complete mirror of the item layer** - same four concerns, same shapes:

| concern  | item layer               | group layer                             |
|---|---|---|
| identity | `T`                      | `GroupKey` (grouping key; class `<T, GroupKey = string>`) |
| equality | `compareFn(a, b)`        | `groupKeyCompareFn(a, b)`               |
| display (text) | `itemToStringFn(item)` | `groupKeyToStringFn(key)`             |
| display (rich) | `createItemContentElFn(item)` | `createGroupLabelContentElFn(key, items)` |
| full control (subclass) | `createItemEl` (protected) | `createGroupEl` (protected) |
| disabled | `itemDisabledFn(item)`   | `groupDisabledFn(key)`                  |

Items must be UNIQUE under `compareFn` - it defines item identity and the selection is a set, so compareFn-equal items get stale selection DOM. `setItems` warns once per page under the DEFAULT `compareFn` (an O(n) Set check); a custom `compareFn` is not scanned (an O(n^2) check would tax large lists, per PERFORMANCE-31) and keeping its identity unique is the caller's job. `GroupKey` mirrors this under `groupKeyCompareFn`.

Why this shape, in this codebase specifically:

- **Single source of truth.** `items` stays the only data channel. A nested shape is a second write channel - exactly the select2 / choices.js dual-write pattern this project already rejects ("Settings vs methods" above).
- **Identity, not display, drives behavior.** `itemDisabledFn` takes the item `T` (identity), never `itemToString(item)` (display). Grouping obeys the same rule: membership and group-disabled are keyed on `GroupKey`; the human label is a separate `GroupKey -> string` projection. So renaming a label (i18n) never changes which items group together or which group is disabled.
- **`GroupKey` is fully generic, mirroring `T`.** The class is `<T, GroupKey = string>`; the default leaves every existing `LLSelect*<T>` call unchanged. A number / object key is allowed exactly as `T` is - equality is asked via `groupKeyCompareFn` (default: identity - `===` plus `NaN` equals `NaN`, the same rule as the default `compareFn`), the same way `compareFn` handles arbitrary `T`. This dodges the hard-coded-string-key trap where widening the key type later would be a breaking change.
- **`GroupKey` never touches the DOM.** Group containers get an index-based id (`-group${index}`, like items' `-item${index}`); the `aria-label` comes from `groupKeyToStringFn` (visible content optionally from `createGroupLabelContentElFn`), disabled state from a computed boolean. So an object key needs no `String(key)` serialization anywhere.
- **Settings compose; no subclass split.** Same reasoning as the filter box: a capability that combines with others (filter x optgroup x ...) must be a setting, not a subclass, or the class count multiplies.
- **Nested's unique wins are out of scope.** A nested shape is only strictly needed for empty groups (a header with no items), one item in multiple groups, or group order decoupled from item order. Native `<select>` supports none of these and neither do we ("Library scope"), so we give up nothing real.

Honest cost, since softened: rendering works on contiguous runs. By default the library derives the DISPLAY order by gathering non-contiguous groups (`gatherGroups: true`, see contiguous-run below); the DATA (`items` / `getItems()`) is never reordered. `gatherGroups: false` restores the strict pre-sorted requirement.

### Settings

All live on `LLSelectBaseSettings<T, GroupKey>` (single + multiple; `GroupKey = string` default). Named by return type per the callback convention ("Function-typed settings"; `naming-conventions.md` s3). All but the boolean `gatherGroups` are `| null`; each `null` documented per CLAUDE.md:

- `itemToGroupKeyFn: ((item: T) => GroupKey | null) | null` (default `null`). The one setting that turns grouping on; returns the key of the group an item belongs to. Two distinct `null`s:
  - **setting `null`** (default): grouping off entirely - flat list, no headers, zero behavior change from today. (A subclass `itemToGroupKey` override can still turn grouping on: the method is authoritative - render, gather, and the disabled layer all resolve keys through it.)
  - **fn returns `null`** for an item: that item is in no group and renders ungrouped (like an `<option>` outside any `<optgroup>`); consecutive ungrouped items are not gathered into one group. Backed by `protected itemToGroupKey(item)` (Customization model: override to replace).
- `gatherGroups: boolean` (default `true`). Gathers non-contiguous groups into display order before rendering; `false` = strict pre-sorted mode (duplicate header + `console.warn` on violation). The gather itself is the exported pure function `gatherItemsByGroupKey(items, itemToGroupKeyFn, groupKeyCompareFn?)` - the instance runs the same function internally, so a caller opting out can pre-gather with it.
- `groupKeyCompareFn: ((a: GroupKey, b: GroupKey) => boolean) | null` (default `null` = identity, `===` plus `NaN` equals `NaN`, like the default `compareFn`). Decides whether two adjacent items share a group (see contiguous-run). Mirrors `compareFn`; only worth setting when `GroupKey` is an object without usable reference identity.
- `groupKeyToStringFn: ((groupKey: GroupKey) => string) | null` (default `null` = `String(groupKey)`). The `GroupKey -> display text` projection; the i18n customization point. Backed by `protected groupKeyToString(key)`.
- `groupDisabledFn: ((groupKey: GroupKey) => boolean) | null` (default `null` = no group disabled). `true` = every item in that group is treated as disabled. Backed by `protected isGroupDisabled(key)`.
- `createGroupLabelContentElFn: ((groupKey: GroupKey, itemsInGroup: readonly T[]) => HTMLElement | null) | null` (default `null`). The rich-header customization point, mirroring `createItemContentElFn`: fills the header's visible content (icon, count badge; cf. react-select `formatGroupLabel`, MUI `renderGroup`). `null` (setting or returned) = plain text from `groupKeyToString`. The accessible name stays `groupKeyToString` (container `aria-label`); the label element stays `aria-hidden`. `itemsInGroup` (the group's items) is what makes counts / summaries possible without recomputing the grouping. Backed by `protected createGroupLabelContentEl(key, itemsInGroup)`.

The full-control escape hatch mirrors `createItemEl`: `protected createGroupEl(key, index, items, itemEls)` builds the whole group container (id, `role="group"`, `aria-label`, label element, items) and is overridable for a custom group element.

### Grouping semantic (gather + contiguous-run)

Consecutive visible items whose keys are equal (per `groupKeyCompareFn`) form one group; a differing key opens a new section header. Items whose key is `null` are ungrouped. This preserves the visible-list order and the `itemEls[i] <-> getVisibleItems()[i]` index alignment exactly.

Display order is derived BEFORE rendering: with `gatherGroups: true` (default) the base list runs through `gatherItemsByGroupKey` - groups gather at their key's first appearance, within-group relative order kept, `null`-key items in place; already-contiguous input is detected in one scan and returned as the same array, so sorted data behaves byte-identically to strict mode. The gather is memoized and lazy: `setItems` only invalidates; it materializes at first need (open, or a filter recompute) and the DATA (`items` / `getItems()`) is never reordered - the gather is display-only. Filtering runs over the gathered base, so filter keystrokes never re-gather and a group's position cannot jump while typing (pinned by first appearance in the FULL list).

`gatherGroups: false` is the strict mode for callers who guarantee pre-sorted data (pre-gathering with the exported function counts): the known trap (same as MUI's `groupBy`) returns - a key reappearing after a gap produces a second header for the same group - and the render pass `console.warn`s once, surfacing the broken sort instead of silently fixing it. Two visually separate sections with the same header text stay expressible in both modes: two distinct keys mapped to one display string by `groupKeyToStringFn`.

### Interaction with existing machinery

- **Keyboard / index alignment: free.** Group headers are NOT added to `itemEls`, so `getVisibleItems()` stays a flat `T[]` and keyboard nav skips headers with no extra logic.
- **Filtering: composes for free.** The base list is gathered once (memoized per `setItems`); the filter then runs over that gathered base per keystroke. Filtering preserves contiguity, so regrouping the survivors at render needs nothing extra, and a group whose every item was filtered out emits no header (empty groups vanish).
- **Disabled layering.** `isItemEffectivelyDisabled(item)` also returns `true` when the item's group is disabled (`isGroupDisabled(itemToGroupKey(item))`) - so every existing item-disabled behavior (no click selection, keyboard skip, `aria-disabled`, selection retention, bulk-op skipping) covers group-disabled automatically, with no new code paths. This is the layering the Phase 9 design deferred here.
- **Render granularity unchanged.** Toggling one item's selection does not change its group membership, so multi-select `replacePopupListItemElInDom` stays O(1) DOM work; the group structure is untouched.

### ARIA

Matches the APG grouped-listbox example. Each group is a container `role="group"` with `aria-label` set to `groupKeyToStringFn(key)`; the visible label element carries `.llselect-group-label` and `aria-hidden="true"` (its text is already the group's accessible name via `aria-label`, so it must not be announced twice). A disabled group's container gets `aria-disabled="true"` + `data-disabled`. The keyboard / focus contract is in `A11Y.md` ("Grouping").

### Implementation note (resolved)

`ensureVisibleInScroll` (keyboard.ts) uses `getBoundingClientRect`-delta math (offsetParent-independent), NOT `offsetTop`, so it stays correct when items nest inside group containers regardless of theme CSS - including a `position: relative` group. Measured on a 10k list in Firefox + Chromium (`demo/bench-reflow.html`): rect and offsetTop cost the same per keyboard move (< 0.15% of a 60fps frame), and offsetTop was confirmed correct ONLY while groups stay `position: static` (289575px off once a group is positioned) - exactly the theme fragility rect removes at zero cost.

## Tags (triggerDisplay)

`LLSelectMultiple` shows chosen items two ways, picked by the `triggerDisplay` setting: `'count'` (default, a "3 / 10 selected" summary) or `'tags'` (one removable chip per chosen item). Tags is a capability ON `LLSelectMultiple`, not a subclass - same rule as filterable.

### Why on LLSelectMultiple, not a subclass

- **Not a new kind of select** - still a multi-select, just a different trigger display. `renderTriggerContent` already owns the trigger's look (it renders the count summary); tags is another branch of it, not a new type.
- **Capability = setting** (DESIGN "Filter box"): tags must combine with filterable / optgroup; a subclass would explode into `LLSelectTags` x `LLSelectFilterable` x ... A setting composes.
- **Single has no tags** (one chip is meaningless), so it lives on Multiple, not Base.

### Two-layer content, mirroring the item layer

The overlap with `createTriggerContentElFn` is resolved the same way item / group content is - two granularities:

| granularity | item | trigger-tags |
|---|---|---|
| take over the whole element | `createItemEl` | `createTriggerContentElFn` (whole trigger) |
| fill only the visible content | `createItemContentElFn` | `createTagContentElFn` (one chip) |

- Precedence: `createTriggerContentElFn` (full control) > `triggerDisplay: 'tags'`
> `'count'`. Same as `createItemEl` over `createItemContentEl`.
- `createTagContentElFn: (item) => HTMLElement | null` fills one chip's visible content; the library owns the chip container, remove button, and aria. `null` = plain `itemToString`. The remove button's icon is separately fillable via `createTagRemoveButtonContentElFn` (see "Remove button" below).
- Protected chain (each overridable): `renderTriggerContent` -> `createTagsEl` (chip strip) -> `createTagEl(item)` (one chip; assembles content + remove) -> `createTagContentEl(item)` / `createTagRemoveButtonEl(item)` (each fills one half and reads its `*Fn` setting).

### Remove button + ARIA (select2-style MVP)

Each chip's remove control is `<button aria-label="Remove <itemToString>" tabindex="-1">` (label text from `uiTranslationPack.tagRemoveButtonAriaLabel`, via `itemToTagRemoveButtonAriaLabel`); its click `stopPropagation`s (so it never toggles the popup) then calls `toggleItem`, which re-renders the trigger - unless the whole control or the item itself is effectively disabled, in which case the click is a no-op and the item stays chosen (see A11Y.md Tags / Disabled). `tabindex="-1"` keeps it out of the tab order - keyboard users remove via the popup (deselect), matching select2. Full chip keyboard nav (grid pattern) is deferred: APG has no standalone tag/token pattern and it would fight the combobox `aria-activedescendant` model. See A11Y.md "Tags". By default the button is empty and the x is a CSS glyph (`.llselect-tag-remove-button:empty::before { content: '\00d7' }`), so the theme owns the look and the accessible name stays the `aria-label`. `createTagRemoveButtonContentElFn: (item) => HTMLElement | SVGElement | null` optionally fills a custom icon (mirrors the clear button's `createTriggerClearButtonContentElFn`; the icon is decorative, never the accessible name); `protected createTagRemoveButtonEl(item)` builds the whole button and is the full-control override, mirroring `createTriggerClearButtonEl`.

## Clear button (clearable)

`clearable: boolean` (default false) shows an x button that empties the selection. It lives in its OWN trigger slot, next to the arrow:

    triggerEl > [ triggerContentEl | clearEl (.llselect-trigger-clear-button) | triggerArrowEl ]

### Own slot = no collision with createTriggerContentElFn

Same trick as the arrow: clear and arrow are separate slots, so `createTriggerContentElFn` (which only replaces the content slot) never touches them. This is why the arrow never needed conflict resolution - it was never in the content slot - and clear copies that exactly.

### What the library owns vs what you fill

- Library owns: the `<button>`, its click (`stopPropagation` so it never toggles the popup, then `clearSelection`), `aria-label="Clear selection"`, `tabindex="-1"`, and hide-when-empty (theme hides it under `.llselect-trigger[data-empty='true']`).
- You optionally fill the icon via `createTriggerClearButtonContentElFn: () => HTMLElement | SVGElement | null` (mirrors `createTriggerArrowContentElFn`); `null` = theme CSS glyph (`.llselect-trigger-clear-button:empty::before { content: '\00d7' }`).
- `protected clearSelection()`: base no-op; single -> `setChosenItem(undefined)`, multiple -> `setChosenItems([])`. Both go through the normal setters, so `onChange` fires with the empty value - no separate `onClear`. Clear means "back to empty / placeholder", not "back to some default option" (do that yourself in `onChange` if wanted).
- A configurable cleared value (`clearTo: T` and the like) was considered and REJECTED. Survey: nobody offers one - react-select and MUI clear to `null`, antd and ui-select to `undefined`, Select2 / Slim Select / native return to a placeholder `<option>` whose value is `''` (there, "empty" is itself an option). The type argument is decisive: "nothing chosen" exists at construction, before any clear, so `getChosenItem(): T | undefined` cannot lose the `| undefined` whatever clear returns - a `clearTo` buys no type safety and conflates clearing with choosing a default. The plain-`string`-model recipes live in the `clearable` docstring (a real "none" item, or coerce in `onChange`).

## Choose-all default: plain counting text (no indicator)

The choose-all row's default content is JUST the counting text (`uiTranslationPack.chooseAllRowText`, e.g. "Select all (3 of 10)"). No icon, no glyph. RULED:

- Consistency: the library ships no default visual indicator anywhere - no trigger arrow, no per-item checkboxes; selected state is theme styling off `aria-selected`. A choose-all-only indicator was the single exception, and nothing ever required one.
- The counting text already encodes the tri-state: "0 of 10" / "3 of 10" / "10 of 10". Any indicator restates the numbers.
- The hooks stay: `data-chosen-state="none|some|all"` on the row for CSS, `createChooseAllRowContentElFn` for real content (e.g. `createOutlinedCheckboxSvgEl`). Batteries-included defaults live a layer up - the AngularJS package's `ll-checkboxes` does exactly that.
- History, so this is not re-litigated: the default indicator was first a theme `::before` glyph gated by `:not(:has(*))` (a gate above the browser support floor, so it silently died on floor browsers, and generated content lands in the accessible-name computation), then a core-rendered `createOutlinedCheckboxSvgEl` (couples `icons.ts` into every multi bundle and makes the core pick outlined vs filled), then a core-rendered aria-hidden text glyph (redundant with the numbers, font-dependent look). Each step fixed the previous mechanism's defect; the actual answer was that the indicator itself was never needed.

## hideChosenRows: chosen rows leave the popup list (multiple)

`hideChosenRows: true` (LLSelectMultiple, default `false`) removes chosen items' rows from the popup list; unchoosing puts them back. RULED:

- A setting, not a new default: ui-select (`remove-selected`) and react-select (`hideSelectedOptions`) hide by default, while select2 and native `<select multiple>` keep chosen rows listed. Both camps are legitimate, so the flag defaults to llselect's shipped behavior (keep).
- Multiple only. A single's chosen row staying listed is universal.
- The subtraction is a `getVisibleItems()` override, so every consumer of "visible" (rendering, keyboard nav, `toggleAllVisible`, the choose-all counts, the no-results state) agrees for free. The enabled-filtered variant is its own protected method, `getVisibleEnabledItems` (multiple): the choose-all row (counts, tri-state, click) and `toggleAllVisible` read that one method, so a subclass narrowing the bulk-selection scope overrides it once (the tree-select demo narrows it to leaf nodes). The default `compareFn` gets a Set lookup; a custom `compareFn` costs O(visible x chosen). Either cost is paid once per change: the result is cached, and validity is two reference checks (every upstream layer and the chosen set replace their arrays on change, never mutate in place).
- `toggleItem` keeps its O(1) single-row DOM swap only while the flag is off. With it on, the toggled row leaves or re-enters the list and shifts the indexes, so it falls back to a full `renderPopupList`.
- chooseAllRow + hideChosenRows is ALLOWED, not a throw. Recorded design intent: chooseAllRow is designed for checkbox-style multiples - rows that stay listed and show their chosen state. Combined with hiding, the visible subset is always fully unchosen: the row degrades to "choose everything still listed", its tri-state never reaches all-chosen, and it disappears with the last actionable row (the standing no-actionable -> no-leading-row rule).
- Why permissive here, unlike the AngularJS ll-highlight + ll-item-content-fn throw: that conflict has no coherent behavior (two owners of one content slot), while this combination has exactly one well-defined behavior that falls out of the standing visible-subset semantics. Core stays low level and does not forbid an unusual-but-coherent UI choice.
- When every item is chosen, the popup shows the regular no-results element. No new translation key.

## Popup width policy

Two policies, chosen by the `popupWidthPolicy` setting; `'fit-content'` is the default.

- `'fit-content'` (default): the popup grows to its content's natural width, never narrower than the trigger (`max(trigger, natural)`), shifted and clamped against the viewport (details under Rationale, point 5).
- `'match-trigger'` (opt-in): the positioner sets `popupEl.style.width` to the trigger's measured width on every reposition (`positioning.ts`). Long items wrap (themes default to `white-space: normal`).

Under either policy, long chosen text in the trigger is ellipsized (`overflow: hidden; text-overflow: ellipsis` on `.llselect-trigger-content`), and the library never touches the trigger's own width.

The default was `'match-trigger'` originally; it flipped to `'fit-content'` for native parity - per the table below, a content-sized popup is what the native control does (Chromium / macOS), while `'match-trigger'` is select2's convention, not the native control's. The two render identically whenever the widest item fits inside the trigger (`max(trigger, natural) = trigger`), so the flip only shows in the case where labels overflow the trigger - exactly where `'match-trigger'` wraps them. Cost accepted with the flip: `'fit-content'` re-measures the popup's max-content width on every reposition, one extra forced layout per scroll tick while open; caching it per content change is an open item in `TODO.md`.

### Empirical baselines

Tested 2026 against the native control and select2 on Firefox + Chromium. Captured here so future width / overflow discussions have a shared reference.

| implementation | trigger width | popup width vs trigger | long items in popup | long chosen in trigger |
|---|---|---|---|---|
| native `<select>`, no CSS width | grows to fit widest item | Chromium: = trigger, can overflow viewport (popup escapes). Firefox: popup content gets trimmed (render anomaly observed). | n/a (trigger is already wide) | n/a |
| native `<select>`, CSS width set | fixed by CSS, overflow clipped (no ellipsis) | Chromium: independent of trigger, can overflow viewport. Firefox: popup content gets trimmed. | n/a / depends on browser | clipped |
| select2, no CSS width | grows to fit widest item | matches trigger (with an internal JS cap around ~1021px; appears built-in) | wrap; trigger gets ellipsis if wider than the cap | n/a / ellipsis past cap |
| select2, CSS width set | fixed by CSS, overflow ellipsized | matches trigger | wrap (potentially many lines) | ellipsis |
| **llselect** | fixed by CSS only - library never auto-fits to widest item | default `fit-content`: content's natural width, never narrower than trigger, viewport-clamped; opt-in `match-trigger`: = trigger width (positioner inline `width`) | full width shown (default); wrap under `match-trigger` | ellipsis (default theme) |

### Rationale

1. **Predictable trigger.** Trigger width is whatever the user's CSS says it is; the library never measures items to auto-resize the trigger. The popup does size to content by default - that is the point of `fit-content` - but it is a fixed-position overlay, so its width never reflows the page.
2. **No viewport-overflow surprise.** The native content-sized popup can escape the viewport (Chromium); `fit-content` instead shifts left when the right edge would overflow (so `popup.x` can become smaller than `trigger.x`) and clamps width to `viewport - 2 * VIEWPORT_PADDING`. Opt-in `match-trigger` never sticks out past the trigger's footprint at all.
3. **Long-text full-fidelity by default.** Under the default the full item text simply shows (the popup grows); under `match-trigger` items wrap rather than truncate. Either way no information is hidden behind a hover tooltip.
4. **Users opt in to other policies via their own CSS** - e.g. set `.llselect-item { white-space: nowrap; overflow: hidden; text-overflow: ellipsis }` (pair it with `match-trigger`: a content-fitted popup never overflows its labels, so ellipsis would stay dead). The library deliberately does NOT auto-set a `title` attribute on items so it never fights third-party tooltip libraries (Tippy / Floating UI / etc.). Users who pick ellipsis-on-items pick their own tooltip mechanism (subclass adding `el.title`, or a custom tooltip lib, or none at all).
5. **The edge-aligned look stays one setting away**: `popupWidthPolicy: 'fit-content' | 'match-trigger'` (default `'fit-content'`). `'match-trigger'` pins the popup to the trigger's measured width - the select2-style aligned-edges convention. The setting NEVER touches the trigger's width - that stays entirely CSS-driven.

The trigger ellipsizes its chosen-text by default in every shipped theme (`.llselect-trigger-content { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`). This is non-negotiable in the default themes because a wrapping trigger looks broken; user themes can override if they genuinely want a multi-line trigger.
