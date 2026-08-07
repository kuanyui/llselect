# llselect + AngularJS 1.x

[![npm version](https://img.shields.io/npm/v/@llselect/angularjs)](https://www.npmjs.com/package/@llselect/angularjs)

AngularJS 1.x directives for [llselect](../README.md), published as `@llselect/angularjs`. Two independent files: pick the one you need, or use both while migrating.

- GitHub: [Git](https://github.com/kuanyui/llselect/tree/master/angularjs) | [Demo](https://kuanyui.github.io/llselect/demo/angularjs/)
- GitLab: [Git](https://gitlab.com/kuanyui/llselect/-/tree/master/angularjs) | [Demo](https://kuanyui.gitlab.io/llselect/demo/angularjs/)

```html
<script src="node_modules/@llselect/core/dist/index.umd.js"></script>
<script src="node_modules/@llselect/angularjs/llselect-angularjs.min.js"></script>
<!-- or, from a CDN, or just dropped in vendor/ -->
<script src="https://cdn.jsdelivr.net/npm/@llselect/angularjs@0/llselect-angularjs.min.js"></script>
```

```js
angular.module('app', ['llselect'])
```

```html
<llselect-single name="fruit" ng-model="picked" required ll-filterable="true"
  ll-options="f.id as f.name group by f.type disable when f.soldOut for f in fruits track by f.id">
</llselect-single>
```

Both files are plain IIFEs reading `window.angular` and `window.llselect` - the same shape angular.js itself, ui-select and angular-validation all ship - so there is nothing to bundle or transpile, and a `<script src>` in `<head>` is a supported way to use this, not a fallback. It is not a generic wrapper: it handles what is documented here and reports the rest.

Every claim below about AngularJS internals was verified against the AngularJS 1.8.3 source, and every claim about ui-select against ui-select 0.19.8. File:line references point at those versions.

Deeper material lives beside this file, split by who reads it: [`DESIGN.md`](DESIGN.md) is why this package exists at all and why each piece is shaped the way it is; [`SPEC.md`](SPEC.md) is the source-level evidence behind every claim made here, with file:line references into AngularJS and ui-select. If you only want to use the directives, this file is enough.

## What this is not

- Not part of `llselect` itself. It is a separate package with its own version, so llselect's build, types and `sideEffects` stay untouched by it.
- Not a generic wrapper. It handles what is documented here and reports the rest.
- Not a styling-compatible ui-select replacement. `<ui-llselect>` takes ui-select's markup, not its CSS. See "The ui-select bridge".

## Files

| file | module | what |
|---|---|---|
| `llselect-angularjs.js` | `llselect` | `<llselect-single>` / `<llselect-multiple>`, driven by an `ng-options`-style `ll-options` expression. Start here. |
| `llselect-ui-select.js` | `llselect.uiCompat` | `<ui-llselect>`, which accepts ui-select's call-site markup. For migrating an existing ui-select codebase; needs `llselect-angularjs.js` loaded too. |

Each ships a `.min.js` beside it (built by `npm run build`, terser only - there is no bundler). The live demo and the benchmark are in [`demo/angularjs/`](../demo/angularjs/) and load these files directly, so what the demo shows is what the package ships.

## The two `name` attributes

The single most useful thing to know here, because it is a name collision that makes an entire class of workaround look necessary when it is not.

**AngularJS's `name` and HTML's `name` are unrelated mechanisms that happen to share a spelling.** On a native element both readers read the same attribute at once, which is why they look like one thing:

```html
<select name="fruit" ng-model="x">
<!--          ^ AngularJS reads this ($attr.name -> myForm.fruit)
              ^ the browser also reads this (the HTTP serialization key) -->
```

AngularJS reads it as a plain attribute off whatever element `ng-model` sits on, with no element-type check anywhere - and the same goes for `required` and for `form.$valid`. So they diverge the moment the element is not a native form control:

| markup | AngularJS `myForm.fruit` | browser HTTP submit |
|---|---|---|
| `<select name="fruit" ng-model="x">` | yes | yes, it is a form-associated element |
| `<llselect-single name="fruit" ng-model="x">` | yes | no, not form-associated; the browser ignores the attribute |
| `<llselect-single name="fruit" ng-model="x">` + a hidden input | yes (on the custom element) | yes (on the hidden input) |

Row 2 is what these directives give you:

```html
<form name="myForm" novalidate>
  <llselect-single name="fruit" ng-model="picked" required
    ll-options="f for f in fruits"></llselect-single>
</form>
<!-- myForm.$valid, myForm.fruit.$error.required, myForm.$dirty all work.
     No native <select>. No hidden input. Nothing generated. -->
```

The value is **not** POSTed by a plain form submit. If you need that too, the two `name` attributes live on two different elements and do not interfere: put a hidden input beside it and mirror the value in `onChange`. See "No native form integration" in [`DESIGN.md`](DESIGN.md) for why the package does not do that for you, and [`SPEC.md`](SPEC.md#verified-facts-about-angularjs) for the source references behind every claim above.

The `name` is always written by you, in your own template - the package never generates one. A generated name (say, an auto-incrementing counter) would key your server contract to JavaScript execution order: reorder your code, or mount two widgets in a different order, and the payload keys silently swap.

## ng-options -> llselect settings

The clause grammar maps almost 1:1 onto llselect's `*Fn` settings. `NG_OPTIONS_REGEXP` and its 9 capture groups are copied verbatim from `angular.js` (MIT, (c) 2010-2020 Google LLC) into `llselect-angularjs.js`; nothing else from AngularJS is copied.

Grammar: `select as label group by group disable when disable for (key, value) in collection track by trackBy`

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

## Gotchas

All verified against AngularJS 1.8.3 source, not folk wisdom.

- **`$setViewValue` self-applies. Do not wrap it in `$scope.$apply()`.** Contrary to what most guides say, `$$debounceViewValueCommit` checks `$$rootScope.$$phase` and wraps `$commitViewValue` in `$scope.$apply` itself when called outside a digest. Wrapping it again is merely redundant. You only need `$apply` if you touch other scope state in the same callback.
- **`LLSelectMultiple` must override `$isEmpty`.** The default is `isUndefined(value) || value === '' || value === null || value !== value` (`angular.js:30570`), so `[]` is not empty and `required` silently passes on an empty multi-selection. AngularJS applies the same fix in its own `<select multiple>` branch (`angular.js:35932`), and `llselect-angularjs.js` copies it.
- **Model -> view must not write back.** llselect's `setChosenItem` / `setChosenItems` fire `onChange` whenever the value really changes, including when *we* change it while rendering the model into the view. `setItems` compounds this: it drops a chosen item that is not in the new list and fires `onChange` for that too (`onItemsChanged` in `src/single.ts` / `src/multiple.ts`). Wired naively, loading data asynchronously marks the form `$dirty` and can null the model, for a field the user never touched. `llselect-angularjs.js` arms view -> model only around real interaction (`makeWriteBackGate`).
- **A `select as` model value must be re-resolved after `setItems`.** It is a key pointing into the list, so a new list needs a fresh reverse lookup. Without the projection the model holds the item itself and llselect's own `setItems` already reconciled it - calling `$render` there would re-add an item that is no longer in the list.
- **Settings are immutable; only methods are watched.** llselect resolves its settings bag once at construction, so `ll-placeholder` / `ll-filterable` / `ll-popup-width-policy` are read once at link time. Only `ll-disabled` gets a `$watch`, because it maps to the `setDisabled()` method.
- **When the chosen item vanishes from the list, the model keeps its value and the view goes empty.** This matches `ngOptions`, which shows its "unknown option" in the same situation and does not null the model. Note the shared consequence: `required` still passes, because the model is not empty.

## ghiscoding/angular-validation

Works on these directives, verified: `<llselect-single name="fruit" ng-model="x" validation="required">` drives `form.$valid` with no native `<select>` anywhere. It is the case that motivates the whole "two names" section, because it is the one thing in this stack that genuinely *requires* a `name` - `validation-common.js:460` throws without one:

```
throw 'Angular-Validation Service requires you to have a (name="") attribute on the element to validate...'
```

But it reads that name the same way everything else in AngularJS does, off the `ng-model` element. Its `validation` directive is `restrict: 'A'`, `require: 'ngModel'`, and it revalidates from a `$watch` on `ctrl.$modelValue` (`validation-directive.js:356`) - all element-agnostic.

Four things to know when wiring it up:

- It hard-depends on `pascalprecht.translate`. Loading `angular-validation.js` without angular-translate fails module instantiation outright.
- Its messages come through `$translateProvider`. Without it pointed at the package's `locales/validation/*.json`, validators still run correctly but every message renders as `Could not translate: 'INVALID_REQUIRED'`.
- Validation is debounced by `typingLimit` (`_INACTIVITY_LIMIT`, default 1000 ms in `validation-common.js:14`). It is not instant, which is easy to misread as "it did not fire".
- Its `elm.bind('blur', ...)` trigger is inert on these directives: blur does not bubble, and the focusable element is llselect's inner trigger, not the custom element the attribute sits on. The `$modelValue` watch is the path that matters for a select, and it works.

## App-wide defaults

A house style set once, rather than repeated on 40 elements. Per-element `ll-*` attributes always win over it.

```js
angular.module('app', ['llselect'])
  .config(['llselectConfigProvider', function (llselectConfigProvider) {
    llselectConfigProvider.defaults({
      arrow: 'chevron',          // 'chevron' | 'triangle' | null (null = the theme draws it)
      filterable: true,          // boolean, or a predicate (items) => boolean
      popupWidthPolicy: 'fit-content',
      uiTranslationPack: llselectI18n.zhTW,  // an llselect language pack
    })
  }])
```

Only settings that are app-wide **by nature** are here, and `uiTranslationPack` is the clearest case: an app picks its language once, and llselect's chrome strings are not per-field copy. `placeholder` is deliberately absent for the mirror-image reason - it IS per-field copy. An unknown key throws rather than being ignored, so a typo cannot silently do nothing.

## The arrow

The chevron is the default - this package is batteries-included, unlike the core (which ships no arrow so the app decides). `ll-arrow="triangle"` picks the other built-in icon; `ll-arrow="none"` opts out and leaves the slot to the theme. A custom arrow means editing your copy of `llselect-angularjs.js`, which is what a copy-paste package is for. The ui-select bridge always renders the chevron (every ui-select theme has a caret, so a bare trigger would read as broken).

## Checkboxes

`<llselect-multiple>` rows get a live checkbox icon by default - the same batteries-included trade as the arrow. `ll-checkboxes="false"` opts out. With `ll-select-all-row="true"` the select-all row gets the matching tri-state icon plus the pack's counting label. Core ships neither: its answer is the subclass recipe (demo 5.4 / 5.5). Single-select never gets checkboxes - a radio-like look would misstate multiplicity.

## The ui-select bridge

`<ui-llselect>` (`ui-llselect.js`) exists so an existing ui-select codebase can migrate without rewriting every call site. The scoping rule is: **bridge what llselect has; ignore what it does not.** Nothing is half-implemented to look compatible.

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

### The one addition: `ll-label`

ui-select has **no item-to-string concept at all** - its label is DOM, and its filtering is an Angular filter expression in `repeat`. llselect needs a string for the option's accessible name. So `<ui-select-choices ... ll-label="p.name">` is the single attribute added to ui-select's markup. Without it, an object item degrades to `String(item)`.

### Two deliberate deviations

- **No `scope: true`.** ui-select creates a child scope for `<ui-select>`, which silently shadows a non-dotted `ng-model`: `ng-model="p"` writes `p` onto the child and the parent never sees it. (That is the real reason ui-select's docs push `ng-model="ctrl.p"`.) Every template `<ui-llselect>` compiles gets its own child scope anyway, so `$select` lives there instead and `ng-model` keeps the parent scope. Strictly better, and more compatible in practice.
- **The `highlight` filter is not provided.** It is ui-select's, not llselect's, so the rule says do not bridge it. It is 8 lines; `app.js` copies it from ui-select (MIT) so the demo's templates work without loading ui-select. Copy it the same way if your templates use `| highlight: $select.search`.

### Implementation notes

Two `protected` methods are overridden by subclassing, which DESIGN.md ("Customization model") names as the sanctioned path for a framework wrapper:

- `renderPopupList` - the single entry point for a list rebuild (open / filter / `setItems` / `rerender`), so it is where the previous round of row scopes is destroyed. Without this, every filter keystroke leaks a scope per row.
- `createItemEl(item, index)` - it calls `createItemContentEl` synchronously, so stashing the index there is what makes `$index` available to templates.

The bridge hangs off a `WeakMap` rather than an instance field because it cannot exist before `super()` runs.

### Why it is not a full ui-select reimplementation

Short version: honoring ui-select's row-scope contract would mean the rows come from its `ng-repeat` and theme template, which is exactly the work llselect's own rendering does - so a faithful reimplementation would use approximately none of llselect. The long version, with the source references, is in [`DESIGN.md`](DESIGN.md#the-ui-select-bridge) and [`SPEC.md`](SPEC.md).


## Not supported

Deliberate gaps. Each is reported or simply absent, never silently half-working.

A caveat on "reported", verified rather than assumed: a directive's `throw` never reaches your code. `$compile`'s `invokeLinkFn` wraps every link function in its own `try`/`catch` and hands the error to `$exceptionHandler` (`angular.js:11374`), which by default logs it. So a bad `ll-options` does not crash the page - the widget simply never renders and the reason is in the console. This is not specific to these directives; every AngularJS directive works this way, `uiSelectMinErr` included.

Both directive sets:

- `(key, value) in object` collections. Pass an array.
- Native `<form>` submission. See "No native form integration" above.

`llselect-angularjs.js`:

- Filters on the collection (`ll-options="c for c in colors | filter:q"`). Filter in your controller and let `$watchCollection` see the result. (`<ui-llselect>` does support `| filter:` inside `repeat`, because that is ui-select's own filtering mechanism.)

`ui-llselect.js` - ignored attributes, because llselect has no such concept:

- `tagging`, `tagging-label`, `tagging-tokens` (llselect never creates items).
- `refresh`, `refresh-delay`, `minimum-input-length`, `spinner-enabled` (no async data-fetching API; root README, "No asynchronous data-fetching API").
- `sortable`, `limit`, `remove-selected`, `paste`, `append-to-body`, `close-on-select`, `theme`.
- `$select` members that take a row scope: `isActive`, `isDisabled`, `isLocked`, plus `on-highlight` and `ui-lock-choice`. See above.
