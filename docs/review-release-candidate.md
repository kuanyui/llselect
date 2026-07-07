# API review - release candidate (v0.0.1)

A full-surface API review before the first npm publish: naming-convention
consistency, weird design, and wrong abstractions. Method: the complete
public + protected + settings + texts + classIdMap + exports surface was
extracted from the current sources and audited item-by-item against the
conventions (`naming-conventions.md` s1-s7, `DESIGN.md`, `CLAUDE.md` s5).
Findings were fixed in their own commits (referenced by finding id in the
commit messages); dating and history live in git blame.

## Verdict

The surface is coherent. Three real defects were found and FIXED (F1-F3),
two convention gaps were closed by adding the missing rule instead of
renaming (F4-F5), one minor information gap is recorded as optional (F6).
No wrong abstraction survived the audit; the closest candidates are listed
with their defenses below.

## Findings - fixed

- **F1 - `onItemClick` lied about its trigger conditions.** Keyboard
  Enter / Space activation goes through the same hook (its own docstring said
  "click or keyboard select"), and the select-all row's twin hook was already
  honestly named `onLeadingRowActivated`. Renamed to **`onItemActivated`**
  (protected; base + both variant overrides + README).
- **F2 - a single callback type had a named alias.**
  `LLSelectCreateTriggerArrowContentElFn` was the only callback alias on the
  whole surface (an s4a-rename-era leftover); every other callback is inline.
  Inside a settings literal, contextual typing infers callback types, so an
  alias buys nothing. REMOVED; policy recorded in s3: named aliases are for
  enum-ish VALUE types only (`LLSelectOutsideClickBehavior`,
  `LLSelectTriggerDisplay`, `LLSelectChosenState`, `WidthPolicy`,
  `Placement`), which callers actually declare variables of.
- **F3 - two three-state vocabularies forced a caller-side mapping.**
  `createCheckboxSvgEl` speaks `unchecked | checked | indeterminate` (visual
  domain) while the select-all row speaks `none | some | all` (selection
  domain). Both vocabularies are individually correct, but composing them -
  the primary use case for both - required a hand-written mapping (the demo
  had one). `createCheckboxSvgEl` now ACCEPTS the chosen-state vocabulary
  too (`none -> unchecked`, `some -> indeterminate`, `all -> checked`), so
  `createSelectAllRowContentElFn` passes its state straight through.

## Findings - convention gap closed by a rule (no rename)

- **F4 - `selectAllRow: boolean` is a noun used as a flag**, while the other
  build-this-element flags are `-able` adjectives (`clearable`,
  `searchable`). Renaming was rejected: no natural `-able` form exists
  ("selectAllable" is nonsense) and invented forms (`withSelectAllRow`,
  `showSelectAllRow`) are worse than the noun. Rule added to s7a.1: when no
  natural `-able` adjective exists, an element-presence flag uses the
  element's noun name as a boolean.
- **F5 - `popupListNoResults*` names the popupList family but the element
  is NOT inside the listbox** (it is the listbox's sibling, kept outside so
  the listbox honors its options-only children contract). Kept: the name
  describes what the element is ABOUT (the list's empty state), not where it
  sits; recorded in s7c.

## Findings - recorded, optional

- **F6 - the final disabled state of an item is not externally queryable.**
  `isItemDisabled` (which layers `groupDisabledFn` on top of
  `itemDisabledFn`) is protected. An app that set both predicates can
  recompute the answer itself, so the information gap is real only in
  principle. Do nothing until someone actually needs it; the fix would be a
  one-line visibility promotion.

## Audited clean

- **Settings names vs s3/s7** - all base + variant settings conform:
  predicates end `*Fn` with boolean returns; mappers are `<src>To<dst>Fn`;
  element producers are `create*ContentElFn` per the Container-Content law;
  events are `on*`; capability flags are adjectives or ruled nouns (F4);
  `searchable`'s `boolean | predicate` union is the documented s3 exception.
- **Container-Content law conformance** - all eight pairs verified: trigger,
  item, tag, groupLabel, triggerArrow, triggerClearButton, tagRemoveButton,
  popupListNoResults, selectAllRow (setting + protected method, `null` =
  default content, accessible-name pinning where the container is an
  `option`).
- **texts keys** - all eight are message ids (no `Fn`), attribute strings are
  `<family><Attribute>`, generated strings are `<family><SemanticName>`,
  parameterized messages take resolved primitives (never `T`); every pack is
  key-complete (test-enforced).
- **classIdMap** - every key matches its CSS string and the element family
  list; `openClass` is a state class, documented as such.
- **Methods** - verbs on actions (`open/close/toggle/destroy/rerender`,
  `set*/get*`, `choose*/unchoose*/toggle*`), `is*` predicates, `on*` hooks
  paired past-tense with their settings (`onOpen/onOpened`,
  `onClose/onClosed`, `onChange/onChosenChanged`), activation hooks now
  consistent (`onItemActivated` / `onLeadingRowActivated`, F1).
- **Exports** - every consumer-observable type is importable (R5 rule):
  settings + inputs + contexts, `LLSelectTexts`, `LLSelectSettingsInputOf`,
  enum-ish aliases, icon helpers, `LLSELECT_VERSION`; `llselect/i18n`
  exports the packs + `textsByLocale`. keyboard.ts / positioning.ts
  internals stay unexported by design (implementation modules).
- **Storage model** - one resolved settings bag (`this.settings`, subclass
  fields merged before base construction runs); `null` uniformly means
  "setting unset", `undefined` uniformly means "no selection state".

## Wrong-abstraction audit (candidates that survived)

- **Leading-row machinery in base with one consumer** (`LLSelectMultiple`'s
  select-all). Kept: the split follows the architecture's core seam - the
  keyboard ring, render slot, and O(1) replace are base-owned mechanics; the
  selection semantics are multi-owned. Folding it all into multiple would
  have required base's private focus internals to leak.
- **`LLSelectSettingsInputOf<S>`** - a generic used by three input types and
  any settings-extending wrapper; guarantees the `texts` deep-partial stays
  in sync across all of them.
- **`subclassSettings?: Record<string, unknown>` constructor param** -
  weakly typed at the base boundary, but every internal call site is
  `satisfies`-checked and the pattern is documented for extenders.
- **texts bag vs flat string settings** - ruled (one bag a language pack can
  fill); the flat alternative was shipped first and consciously replaced.
- **`decorateItemFn`** - ruled CLOSED (TODO.md): rare need, fully overlapped
  by the `createItemEl` override, and mutation-of-library-output is the
  undefendable direction.

## Known accepted limitations (pre-existing, documented elsewhere)

- Dual-types edge for TypeScript `moduleResolution: nodenext` consumers who
  `require()` the package (single `.d.ts` set serves both formats) -
  TODO.md "Release readiness".
- Per-item click listeners on huge lists (event delegation deferred until a
  benchmark shows a win) - TODO.md R15.
- ja / ar / he pack translations are LLM-drafted pending native review -
  flagged in `src/i18n.ts`.
