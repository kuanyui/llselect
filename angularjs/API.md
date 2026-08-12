# @llselect/angularjs API

The complete attribute surface of the `@llselect/angularjs` directives, one entry per attribute. Install and loading, the two `name` attributes, integration gotchas and the design rationale live in the [README](README.md); this page is only the reference.

The directives come from two independent files (see [Files](README.md#files)): `llselect-angularjs.js` registers module `llselect` with `<llselect-single>` / `<llselect-multiple>`, driven by an `ng-options`-style [`ll-options`](#ll-options) expression; `llselect-ui-select.js` registers module `llselect.uiCompat` with [`<ui-llselect>`](#ui-llselect), which takes ui-select's call-site markup instead and needs `llselect-angularjs.js` loaded too.

## `<llselect-single>`

Single selection. `ng-model` holds the chosen item itself, or the `select as` projection when the [`ll-options`](#ll-options) expression has one. Takes the [shared attributes](#shared-attributes).

```html
<llselect-single name="fruit" ng-model="picked" required ll-filterable="true"
  ll-options="f.id as f.name group by f.type disable when f.soldOut for f in fruits track by f.id">
</llselect-single>
```

## `<llselect-multiple>`

Multiple selection. `ng-model` holds an array of chosen items (or of `select as` projections), and `required` treats `[]` as empty. Takes the [shared attributes](#shared-attributes) plus [its own](#llselect-multiple-only).

## Shared attributes

Attributes of both `<llselect-single>` and `<llselect-multiple>`. Every entry opens with its binding mode in bold. **Expression** values are `$eval`'d against the scope once at link time - llselect resolves its settings bag once at construction, so settings are immutable and only the method-backed [`ll-disabled`](#ll-disabled) is watched (see the [Gotchas](README.md#gotchas)); string values need their own quotes: `ll-placeholder="'Pick one'"`. **Literal** values are plain attribute text. **Flag** attributes act by presence alone.

App-wide defaults for `arrow` / `filterable` / `popupWidthPolicy` / `uiTranslationPack` are set once via [`llselectConfigProvider`](#llselectconfigprovider); a per-element attribute always wins.

### `ng-model`

**Expression**, required. The chosen item on `<llselect-single>`; the array of chosen items on `<llselect-multiple>`. With `select as` in [`ll-options`](#ll-options), the projected value(s) instead.

### `ll-options`

**ng-options grammar**, required. Names the label, the identity and the model value of your items in one line. `(key, value) in object` collections throw - pass an array (see [Not supported](#not-supported)).

Grammar: `select as label group by group disable when disable for (key, value) in collection track by trackBy`

The clause grammar maps almost 1:1 onto llselect's `*Fn` settings. `NG_OPTIONS_REGEXP` and its 9 capture groups are copied verbatim from `angular.js` (MIT, (c) 2010-2020 Google LLC) into `llselect-angularjs.js`; nothing else from AngularJS is copied.

| ng-options clause | llselect |
|---|---|
| `label` (group 2, else group 1) | `itemToStringFn` |
| `group by` (group 3) | `itemToGroupKeyFn` |
| `disable when` (group 4) | `itemDisabledFn` |
| `in collection` (group 8) | `setItems()`, via `$watchCollection` |
| `track by` (group 9) | `compareFn` |
| `select as` (group 1, when ` as ` is present) | no equivalent, by design |

`select as` is the ngModel value projection - the "what string/id does this item become in the model" question. It has no llselect setting because that projection belongs to the app, not the library, and `ng-options` is the app stating it. This is also why the library core has no `itemToValueFn`: using `itemToString` for it would conflate display with identity, so switching `uiTranslationPack` to another language would change your submitted values.

`track by` is a per-item hash; `compareFn` is pairwise equality. Same semantic, different shape: `compareFn: (a, b) => trackBy(a) === trackBy(b)`.

### `name`

**Literal**. AngularJS form registration (`myForm.<name>`), with no native `<select>` and no hidden input: `myForm.$valid`, `myForm.<name>.$error.required` and `myForm.$dirty` all work. The value is **not** POSTed by a plain form submit, and the package never generates a `name` for you - the full story, including how AngularJS's `name` and HTML's `name` are unrelated mechanisms, is [The two `name` attributes](README.md#the-two-name-attributes) in the README.

### `required`

**Flag**. The ngModel `required` validator. On `<llselect-multiple>`, `[]` counts as empty via a `$isEmpty` override - AngularJS's default would let `required` silently pass on an empty multi-selection (see the [Gotchas](README.md#gotchas)).

### `ll-disabled`

**Expression, watched** -> `setDisabled()`. The only watched attribute, because it maps to a method rather than an immutable setting.

### `ll-placeholder`

**Expression** -> `placeholder`. A string value, so it needs its own quotes: `ll-placeholder="'Pick one'"`. Per-field copy, which is why it has no app-wide default.

### `ll-filterable`

**Expression** -> `filterable`. `true` / `false` / a predicate `(items) => boolean`.

### `ll-clearable`

**Expression** -> `clearable`. The trigger clear (x) button.

### `ll-popup-width-policy`

**Expression** -> `popupWidthPolicy`. `'fit-content'` (llselect's default) / `'match-trigger'`.

### `ll-arrow`

**Literal**: `chevron` (default) / `triangle` / `none`. The chevron default is this package being batteries-included, unlike the core (which ships no arrow so the app decides). `triangle` picks the other built-in icon; `none` opts out and leaves the slot to the theme. A custom arrow means editing your copy of `llselect-angularjs.js`, which is what a copy-paste package is for.

### `ll-aria-label`

**Literal** -> `ariaLabel`. The accessible name; always set this or `ll-aria-labelledby`.

### `ll-aria-labelledby`

**Literal** -> `ariaLabelledBy`. Space-separated element id(s) of the visible label.

## `<llselect-multiple>` only

### `ll-trigger-display`

**Expression** -> `triggerDisplay`. `'count'` (default) / `'tags'` - quoted: `ll-trigger-display="'tags'"`.

### `ll-select-all-row`

**Expression** -> `selectAllRow`. A tri-state select-all as the first row; it gets the tri-state icon matching the row checkboxes plus the pack's counting label.

### `ll-checkboxes`

**Expression**, default `true`. `<llselect-multiple>` rows get a live checkbox icon by default - the same batteries-included trade as the arrow; `ll-checkboxes="false"` opts out. The core ships neither: its answer is the subclass recipe (demo 5.4 / 5.5). Single-select never gets checkboxes - a radio-like look would misstate multiplicity.

## `llselectConfigProvider`

A house style set once, rather than repeated on 40 elements. Per-element `ll-*` attributes always win over it.

```js
angular.module('app', ['llselect'])
  .config(['llselectConfigProvider', function (llselectConfigProvider) {
    llselectConfigProvider.defaults({
      arrow: 'chevron',          // 'chevron' | 'triangle' | null (null = the theme draws it)
      filterable: true,          // boolean, or a predicate (items) => boolean
      popupWidthPolicy: 'match-trigger',  // llselect's own default is 'fit-content'
      uiTranslationPack: llselectI18n.zhTW,  // an llselect language pack
    })
  }])
```

### `defaults()`

Takes the defaults bag above. Only settings that are app-wide **by nature** are accepted; `placeholder` is deliberately absent for the mirror-image reason - it IS per-field copy. An unknown key throws rather than being ignored, so a typo cannot silently do nothing.

#### `arrow`

`'chevron' | 'triangle' | null` - `null` means the theme draws the arrow. The app-wide default behind [`ll-arrow`](#ll-arrow).

#### `filterable`

Boolean, or a predicate `(items) => boolean`. The app-wide default behind [`ll-filterable`](#ll-filterable).

#### `popupWidthPolicy`

`'fit-content'` (llselect's own default) / `'match-trigger'`. The app-wide default behind [`ll-popup-width-policy`](#ll-popup-width-policy).

#### `uiTranslationPack`

An llselect language pack (e.g. `llselectI18n.zhTW`). The clearest app-wide-by-nature case: an app picks its language once, and llselect's chrome strings are not per-field copy.

## `<ui-llselect>`

The bridge (`llselect-ui-select.js`, module `llselect.uiCompat`) for migrating an existing ui-select codebase without rewriting every call site; it needs `llselect-angularjs.js` loaded too. It takes ui-select's call-site markup, not its CSS. The scoping rule is: **bridge what llselect has; ignore what it does not.** Nothing is half-implemented to look compatible. It always renders the chevron (every ui-select theme has a caret, so a bare trigger would read as broken). How the bridge is built, and why it is not a full ui-select reimplementation: [the README](README.md#the-ui-select-bridge), [`DESIGN.md`](DESIGN.md#the-ui-select-bridge) and [`SPEC.md`](SPEC.md).

### What carries over

| ui-select | `<ui-llselect>` |
|---|---|
| `<ui-select-match>` template (single) | `createTriggerContentElFn` |
| `<ui-select-match>` template (multiple) | `createTagContentElFn` - ui-select ng-repeats this slot over `$select.selected`, so it is per chip, not per trigger |
| `<ui-select-choices>` template | `createItemContentElFn`, `$compile`d against a per-row child scope |
| `repeat="p in people"` | `setItems` via `$watchCollection` |
| `alias as item in source` | the ngModel projection, same role as `ng-options`' `select as` |
| `track by` | `compareFn` |
| `\| filter: $select.search` in the repeat | `filterFn`. llselect owns the search box and asks per item, so the source expression is re-evaluated once per query and answers membership - your filter expression stays authoritative |
| `group-by` | `itemToGroupKeyFn` |
| `ui-disable-choice` | `itemDisabledFn` |
| `multiple` | `LLSelectMultiple` (+ `triggerDisplay: 'tags'`) |
| `search-enabled` | `filterable`. Defaults to `true`, following ui-select's default rather than llselect's `false` - it is ui-select's markup, so its defaults are what the call site expects |
| `placeholder`, `allow-clear` (on `<ui-select-match>`) | `placeholder`, `clearable` |
| `on-select`, `on-remove` | derived from `onChange` by diffing against the previous set |
| `ng-disabled` | `setDisabled()` |
| `$select.selected`, `$select.search`, `$select.multiple` | published on each template's scope |
| `$index` | from `createItemEl(item, index)` |

### `ll-label`

**Expression**, evaluated per item with the `repeat` variable bound (`ll-label="p.name"`). ui-select has no item-to-string concept at all - its label is DOM, and its filtering is an Angular filter expression in `repeat` - but llselect needs a string for the option's accessible name, so this is the single attribute added to ui-select's markup. Without it, an object item degrades to `String(item)`.

### Two deliberate deviations

- **No `scope: true`.** ui-select creates a child scope for `<ui-select>`, which silently shadows a non-dotted `ng-model`: `ng-model="p"` writes `p` onto the child and the parent never sees it. (That is the real reason ui-select's docs push `ng-model="ctrl.p"`.) Every template `<ui-llselect>` compiles gets its own child scope anyway, so `$select` lives there instead and `ng-model` keeps the parent scope. Strictly better, and more compatible in practice.
- **The `highlight` filter is not provided.** It is ui-select's, not llselect's, so the rule says do not bridge it. It is 8 lines; `app.js` copies it from ui-select (MIT) so the demo's templates work without loading ui-select. Copy it the same way if your templates use `| highlight: $select.search`.

Ignored attributes are listed under [Not supported](#not-supported).

## Not supported

Deliberate gaps. Each is reported or simply absent, never silently half-working.

A caveat on "reported", verified rather than assumed: a directive's `throw` never reaches your code. `$compile`'s `invokeLinkFn` wraps every link function in its own `try`/`catch` and hands the error to `$exceptionHandler` (`angular.js:11374`), which by default logs it. So a bad `ll-options` does not crash the page - the widget simply never renders and the reason is in the console. This is not specific to these directives; every AngularJS directive works this way, `uiSelectMinErr` included.

Both directive sets:

- `(key, value) in object` collections. Pass an array.
- Native `<form>` submission. See [The two `name` attributes](README.md#the-two-name-attributes) in the README.

`llselect-angularjs.js`:

- Filters on the collection (`ll-options="c for c in colors | filter:q"`). Filter in your controller and let `$watchCollection` see the result. (`<ui-llselect>` does support `| filter:` inside `repeat`, because that is ui-select's own filtering mechanism.)

`llselect-ui-select.js` - ignored attributes, because llselect has no such concept:

- `tagging`, `tagging-label`, `tagging-tokens` (llselect never creates items).
- `refresh`, `refresh-delay`, `minimum-input-length`, `spinner-enabled` (no async data-fetching API; root README, "No asynchronous data-fetching API").
- `sortable`, `limit`, `remove-selected`, `paste`, `append-to-body`, `close-on-select`, `theme`.
- `$select` members that take a row scope: `isActive`, `isDisabled`, `isLocked`, plus `on-highlight` and `ui-lock-choice`. See [Why it is not a full ui-select reimplementation](README.md#why-it-is-not-a-full-ui-select-reimplementation) in the README.
