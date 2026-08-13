# @llselect/angularjs API

The complete attribute surface of the `@llselect/angularjs` directives, one entry per attribute. Install and loading, the two `name` attributes, integration gotchas and the design rationale live in the [README](README.md); this page is only the reference.

Two independent files (see [Files](README.md#files)):

- `llselect-angularjs.js` - module `llselect`: `<llselect-single>` / `<llselect-multiple>`, driven by an `ng-options`-style [`ll-options`](#ll-options) expression.
- `llselect-ui-select.js` - module `llselect.uiCompat`: [`<ui-llselect>`](#ui-llselect), which takes ui-select's call-site markup instead. Needs `llselect-angularjs.js` loaded too.

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

Attributes of both `<llselect-single>` and `<llselect-multiple>`. Every entry opens with its binding mode in bold:

- **Expression**: `$eval`'d against the scope ONCE at link time. llselect resolves its settings bag once at construction, so a later scope change does not move them; only the method-backed [`ll-disabled`](#ll-disabled) is watched (see the [Gotchas](README.md#gotchas)). String values need their own quotes: `ll-placeholder="'Pick one'"`.
- **Literal**: plain attribute text.
- **Flag**: acts by presence alone.

App-wide defaults for `arrow` / `filterable` / `popupWidthPolicy` / `uiTranslationPack` are set once via [`llselectConfigProvider`](#llselectconfigprovider); a per-element attribute always wins.

### `ng-model`

**Expression**, required. The chosen item on `<llselect-single>`; the array of chosen items on `<llselect-multiple>`. With `select as` in [`ll-options`](#ll-options), the projected value(s) instead.

### `ng-change`

**Expression**. Runs on each committed user choice - exactly like on a native control, no `ll-change` needed.

- These directives drive a real ngModel; `ng-change` is the standard `$viewChangeListeners` pipeline, which runs only on the `$setViewValue` path: a real user choice.
- It does NOT fire on load, on a programmatic model write, or when a data reload drops the chosen item - the write-back gate keeps those out of the view-change path (see the [Gotchas](README.md#gotchas)).
- The same holds for everything else riding the ngModel pipeline: validators, `$dirty`, angular-validation.

### `ll-options`

**ng-options grammar**, required. Names the label, the identity and the model value of your items in one line:

    select as label group by group disable when disable for (key, value) in collection track by trackBy

| ng-options clause | llselect |
|---|---|
| `label` (group 2, else group 1) | `itemToStringFn` |
| `group by` (group 3) | `itemToGroupKeyFn` |
| `disable when` (group 4) | `itemDisabledFn` |
| `in collection` (group 8) | `setItems()`, via `$watchCollection` |
| `track by` (group 9) | `compareFn` |
| `select as` (group 1, when ` as ` is present) | no equivalent, by design |

- `select as` is the ngModel value projection: "what does this item become in the model". Deliberately no llselect setting - the projection belongs to the app, and `ng-options` is the app stating it. (Also why the core has no `itemToValueFn`: reusing `itemToString` would conflate display with identity, so switching `uiTranslationPack` to another language would change your submitted values.)
- `track by` is a per-item hash; `compareFn` is pairwise equality. Same semantic, different shape: `compareFn: (a, b) => trackBy(a) === trackBy(b)`.
- `(key, value) in object` collections throw - pass an array (see [Not supported](#not-supported)).
- `NG_OPTIONS_REGEXP` and its 9 capture groups are copied verbatim from `angular.js` (MIT, (c) 2010-2020 Google LLC) into `llselect-angularjs.js`; nothing else from AngularJS is copied.

### `name`

**Literal**. AngularJS form registration (`myForm.<name>`): `myForm.$valid`, `myForm.<name>.$error.required` and `myForm.$dirty` all work - with no native `<select>` and no hidden input.

- The value is NOT posted by a plain form submit, and the package never generates a `name` for you.
- AngularJS's `name` and HTML's `name` are unrelated mechanisms: [The two `name` attributes](README.md#the-two-name-attributes) in the README.

### `required`

**Flag**. The ngModel `required` validator. On `<llselect-multiple>`, `[]` counts as empty via a `$isEmpty` override - AngularJS's default would let `required` silently pass on an empty multi-selection (see the [Gotchas](README.md#gotchas)).

### `ll-disabled`

**Expression, watched** -> `setDisabled()`. Disables the widget. The only watched attribute, because it maps to a method rather than an immutable setting.

Disabling must go through llselect's own `setDisabled()`:

- The state belongs on the inner TRIGGER element: `setDisabled()` sets `aria-disabled` / `data-disabled` (and manages `tabindex`) on the focusable combobox itself. A `disabled="true"` attribute would sit on this host element - not a form control, so the browser ignores it completely.
- Hover must survive: llselect never uses the native `disabled` attribute, which suppresses pointer events. A disabled trigger stays hoverable (and focusable via the core `focusableWhenDisabled` setting), so a tooltip can still explain WHY it is disabled.

`ng-disabled` is the same trap one level up: it is one `$watch` whose only action is toggling that inert host attribute (`angular.js:24530`), so the markup looks applied while the widget stays fully interactive. See [Not supported](#not-supported).

### `ll-placeholder`

**Expression** -> `placeholder`. The trigger's empty-state text. A string, so it needs its own quotes: `ll-placeholder="'Pick one'"`. Per-field copy, which is why it has no app-wide default.

### `ll-filterable`

**Expression** -> `filterable`. Shows the search box. `true` / `false` / a predicate `(items) => boolean`.

### `ll-clearable`

**Expression** -> `clearable`. Shows the trigger's clear (x) button.

### `ll-popup-width-policy`

**Expression** -> `popupWidthPolicy`. `'fit-content'` (llselect's default) / `'match-trigger'`.

### `ll-arrow`

**Literal**. The trigger arrow icon: `chevron` (default) / `triangle` / `none`.

- The chevron default is this package being batteries-included, unlike the core (which ships no arrow so the app decides).
- `none` opts out and leaves the slot to the theme.
- A custom arrow means editing your copy of `llselect-angularjs.js` - which is what a copy-paste package is for.

### `ll-item-content-fn`

**Expression** -> `createItemContentElFn`. Custom visible content for each option row.

- Evaluated once at link time to a function `(item) => HTMLElement | null`.
- `null` (for one item, or no attribute at all) = the plain `ll-options` label text.
- Runs per rendered row per render (open / filter / list change), entirely outside any digest. The element is NOT `$compile`d - no Angular directives or bindings inside; build plain DOM (`document.createElement`, or clone a `<template>`).
- The accessible name and the filter text stay owned by the `ll-options` label clause no matter what you render (the library sets the option's `aria-label` from it).
- On `<llselect-multiple>` the element renders beside the default checkbox icon; `ll-checkboxes="false"` hands it the whole row.
- Need real per-row Angular templates? That is [`<ui-llselect>`](#ui-llselect) - one child scope and one `$compile` per row is exactly the trade it prices in.

```js
$scope.renderRow = function (fruit) {
  var row = document.createElement('span')
  var icon = document.createElement('i')
  icon.className = 'mdi mdi-' + fruit.icon
  icon.setAttribute('aria-hidden', 'true')
  row.append(icon, ' ' + fruit.name)
  return row
}
```

```html
<llselect-single ng-model="picked" ll-item-content-fn="renderRow"
  ll-options="f.name for f in fruits"></llselect-single>
```

### `ll-trigger-content-fn`

**Expression** -> `createTriggerContentElFn`. Custom visible content for the trigger, under the same rules as [`ll-item-content-fn`](#ll-item-content-fn) (outside any digest, never `$compile`'d).

- `<llselect-single>`: the function receives `{ chosenItem, items }`; `null` = the default rendering (the chosen item's label, or the placeholder).
- `<llselect-multiple>`: receives `{ chosenItems, items }`; `null` = the count summary / tags. A returned element overrides both display modes.
- The trigger does not mirror rich rows by itself - feeding this the same renderer as `ll-item-content-fn` is what does that (demo 7).

### `ll-aria-label`

**Literal** -> `ariaLabel`. The accessible name. Always set this or `ll-aria-labelledby`.

### `ll-aria-labelledby`

**Literal** -> `ariaLabelledBy`. Space-separated element id(s) of the visible label.

### `ll-label-el`

**Literal** -> `labelEl`. The id of your external label element. Native `<label for>` cannot target these divs; this wires both halves of the label relationship:

- The element names the field (`aria-labelledby`), and clicking it focuses the trigger - focus only, never open, native `<label>` behavior.
- Resolved once at link time via `getElementById`; an unknown id throws (reported in the console, never silent).
- Want only the accessible-name half? Use [`ll-aria-labelledby`](#ll-aria-labelledby).

## `<llselect-multiple>` only

### `ll-trigger-display`

**Expression** -> `triggerDisplay`. `'count'` (default) / `'tags'` - quoted: `ll-trigger-display="'tags'"`.

### `ll-tag-content-fn`

**Expression** -> `createTagContentElFn`. Custom content for one tag chip in `ll-trigger-display="'tags'"` mode.

- A function `(item) => HTMLElement | null`; `null` = the plain label text.
- The library still owns the chip container, the remove (x) button, and the button's `aria-label` (`Remove <label>`).
- The chip itself is a generic `<span>` that ARIA prohibits naming - for icon-only content include your own visually hidden text if the chip should be announced as more than its remove button.

### `ll-tag-remove-button-content-fn`

**Expression** -> `createTagRemoveButtonContentElFn`. The decorative icon inside each tag's remove (x) button.

- A function `(item) => HTMLElement | SVGElement | null`; `null` (the default) = the theme's CSS glyph draws the x.
- The library always owns the button, its click, and its `aria-label`.

### `ll-select-all-row`

**Expression** -> `selectAllRow`. A tri-state select-all row as the first row of the popup; it gets the tri-state icon matching the row checkboxes plus the pack's counting label.

### `ll-checkboxes`

**Expression**, default `true`. Whether `<llselect-multiple>` rows get this package's live checkbox icons.

- On by default - the same batteries-included trade as the arrow.
- `ll-checkboxes="false"` strips every checkbox visual, including the select-all row's icon; that row then shows only the counting label, which is also the core's own default.
- The core itself ships no icons and no default indicator; per item its answer is the subclass recipe (demo 5.4 / 5.5).
- Single-select never gets checkboxes - a radio-like look would misstate multiplicity.

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

## Reaching the instance from your own directive

Both directives publish a controller under their directive names (`llselectSingle` / `llselectMultiple`). An app-owned attribute directive on the same element can `require` it and drive the full llselect public API - the door for app-wide policies (a permission-driven disable, forced `focusableWhenDisabled` tooltips, ...).

- `require` takes the array form or, since AngularJS 1.5, the named object form.
- With `?` the entry is `null` on elements that are not llselect - what keeps a generic directive safe on native form controls.

### `instance()`

Returns the live `LLSelectSingle` / `LLSelectMultiple`. Late-bound: the widget is constructed at link time, AFTER controllers instantiate - call it from a `$watch` or event handler, never from a controller constructor. Before link it throws; it never returns `null`.

A generic permission-driven disable that works on llselect AND native form controls (this exact shape is pinned by a test):

```js
angular.module('app').directive('ownDisabled', ['permissions', function (permissions) {
  return {
    restrict: 'A',
    require: { single: '?llselectSingle', multiple: '?llselectMultiple' },
    link: function (scope, element, attrs, ctrls) {
      var api = ctrls.single || ctrls.multiple // null on non-llselect elements
      scope.$watch(function () { return permissions.canEdit() }, function (ok) {
        if (api) {
          api.instance().setDisabled(!ok) // llselect: state lives on the trigger; see ll-disabled
        } else {
          element.prop('disabled', !ok) // native form controls
        }
      })
    },
  }
}])
```

```html
<llselect-single own-disabled ng-model="vm.fruit" ll-options="f for f in vm.fruits"></llselect-single>
<input own-disabled type="text">
```

## `<ui-llselect>`

The migration bridge for an existing ui-select codebase (`llselect-ui-select.js`, module `llselect.uiCompat`; needs `llselect-angularjs.js` loaded too).

Migrating a call site, at a glance:

| | ui-select | `<ui-llselect>` |
|---|---|---|
| Element | `<ui-select>` | rename to `<ui-llselect>` |
| Item label string | **does not exist in ui-select** | add [`ll-item-text`](#ll-item-text) on `<ui-select-choices>` |
| Templates, `repeat`, `track by`, `group-by`, `multiple`, ... | as you wrote them | unchanged - see [What carries over](#what-carries-over) |
| CSS | ui-select themes | an llselect theme; the bridge takes ui-select's MARKUP, not its CSS |

- Scoping rule: **bridge what llselect has; ignore what it does not.** Nothing is half-implemented to look compatible.
- It always renders the chevron - every ui-select theme has a caret, so a bare trigger would read as broken.
- How the bridge is built, and why it is not a full ui-select reimplementation: [the README](README.md#the-ui-select-bridge), [`DESIGN.md`](DESIGN.md#the-ui-select-bridge) and [`SPEC.md`](SPEC.md).

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
| `ng-disabled` / the `disabled` attribute | `setDisabled()`, via `attrs.$observe('disabled')` - the exact mechanism ui-select itself uses, its string quirks included (a truthy string like interpolated `"false"` disables). The observed attribute stays inert on the host, so hover - and a why-tooltip - keep working while disabled |
| `$select.selected`, `$select.search`, `$select.multiple` | published on each template's scope |
| `$index` | from `createItemEl(item, index)` |

### `ll-item-text`

**Expression** -> `itemToStringFn`. **This attribute does not exist in ui-select - it is the ONE thing you add when migrating.** llselect needs one string per item - the option's accessible name and the search text - and ui-select's markup has no place that states it (its label is template DOM).

Sits on `<ui-select-choices>`, written over the `repeat` variable:

```html
<!-- ui-select, before -->
<ui-select ng-model="vm.person">
  <ui-select-match placeholder="Pick a person">{{$select.selected.name}}</ui-select-match>
  <ui-select-choices repeat="p in vm.people | filter: $select.search">
    <span>{{p.name}}</span>
  </ui-select-choices>
</ui-select>

<!-- ui-llselect, after: the renamed element + ll-item-text. Nothing else changes. -->
<ui-llselect ng-model="vm.person">
  <ui-select-match placeholder="Pick a person">{{$select.selected.name}}</ui-select-match>
  <ui-select-choices repeat="p in vm.people | filter: $select.search" ll-item-text="p.name">
    <span>{{p.name}}</span>
  </ui-select-choices>
</ui-llselect>
```

Without it, an object item degrades to `String(item)` ("[object Object]").

### Two deliberate deviations

- **No `scope: true`.** ui-select creates a child scope for `<ui-select>`, which silently shadows a non-dotted `ng-model`: `ng-model="p"` writes `p` onto the child and the parent never sees it. (That is the real reason ui-select's docs push `ng-model="ctrl.p"`.) Every template `<ui-llselect>` compiles gets its own child scope anyway, so `$select` lives there instead and `ng-model` keeps the parent scope. Strictly better, and more compatible in practice.
- **The `highlight` filter is not provided.** It is ui-select's, not llselect's, so the rule says do not bridge it. It is 8 lines; `app.js` copies it from ui-select (MIT) so the demo's templates work without loading ui-select. Copy it the same way if your templates use `| highlight: $select.search`.

Ignored attributes are listed under [Not supported](#not-supported).

## Not supported

Deliberate gaps. Each is reported or simply absent, never silently half-working.

- What "reported" means here (verified, not assumed): a directive's `throw` never reaches your code - `$compile`'s `invokeLinkFn` wraps every link function in its own `try`/`catch` and hands the error to `$exceptionHandler` (`angular.js:11374`), which by default logs it. So a bad `ll-options` does not crash the page; the widget simply never renders and the reason is in the console. Every AngularJS directive works this way, `uiSelectMinErr` included.

Both directive sets:

- `(key, value) in object` collections. Pass an array.
- Native `<form>` submission. See [The two `name` attributes](README.md#the-two-name-attributes) in the README.

`llselect-angularjs.js`:

- Filters on the collection (`ll-options="c for c in colors | filter:q"`). Filter in your controller and let `$watchCollection` see the result. (`<ui-llselect>` does support `| filter:` inside `repeat`, because that is ui-select's own filtering mechanism.)
- `ng-disabled` / a plain `disabled` attribute. Both only toggle the host's `disabled` attribute, which nothing here honors - the widget stays fully interactive while the markup claims otherwise. Use [`ll-disabled`](#ll-disabled); its entry has the two reasons disabling must go through `setDisabled()`.

`llselect-ui-select.js` - ignored attributes, because llselect has no such concept:

- `tagging`, `tagging-label`, `tagging-tokens` (llselect never creates items).
- `refresh`, `refresh-delay`, `minimum-input-length`, `spinner-enabled` (no async data-fetching API; root README, "No asynchronous data-fetching API").
- `sortable`, `limit`, `remove-selected`, `paste`, `append-to-body`, `close-on-select`, `theme`.
- `$select` members that take a row scope: `isActive`, `isDisabled`, `isLocked`, plus `on-highlight` and `ui-lock-choice`. See [Why it is not a full ui-select reimplementation](README.md#why-it-is-not-a-full-ui-select-reimplementation) in the README.
