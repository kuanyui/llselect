# llselect + AngularJS 1.x

Example directives binding llselect to AngularJS 1.x, plus the reasoning behind them. Everything here is demo material: copy `llselect-angularjs.js` into your project and adapt it. It is not part of the llselect package, has no semver contract, and is not a generic wrapper.

Every claim below about AngularJS internals was verified against the AngularJS 1.8.3 source, and every claim about ui-select against ui-select 0.19.8. File:line references point at those versions.

## Why AngularJS gets a demo when React / Vue do not

llselect ships no framework wrappers, for three reasons (see the "No official React / Vue / Angular wrapper" bullet in the root README). All three fail for AngularJS specifically, which is why this folder exists:

1. **"Chasing framework API churn."** AngularJS is end-of-life and frozen. There is no churn left to chase. A binding written against it can never rot.
2. **"A wrapper must pick one item type `T` and will be wrong for someone."** The `ng-options` expression grammar IS the app declaring its own `T` projections: `c.id as c.name for c in colors track by c.id` states the label, the identity, and the model value in one line. The binding never has to guess, because AngularJS solved this in 2012.
3. **"A wrapper must pick one state-sync strategy."** AngularJS has exactly one: `ngModel` + the digest. There is no Pinia / Redux / signals / form-library choice to get wrong.

React and Vue fail reasons 2 and 3 (no standard expression grammar, no standard state layer), so the boundary holds for them. This is not an exception carved out of the rule; the rule's premises simply do not apply here.

Two practical reasons on top: AngularJS is still deployed widely enough to matter (Syncthing's UI, among many), and the only performance bar to clear is ui-select, which is very low (see below).

## What this is not

- Not a package export. Nothing here is importable from `llselect`; there is no `llselect/angularjs`.
- Not a generic wrapper. It handles the cases the demo shows and throws on the rest.
- Not a styling-compatible ui-select replacement. `<ui-llselect>` takes ui-select's markup, not its CSS. See "The ui-select bridge".

## Files

| file | what |
|---|---|
| `llselect-angularjs.js` | `<llselect-single>` / `<llselect-multiple>`, driven by an `ng-options`-style `ll-options` expression. Start here. |
| `ui-llselect.js` | `<ui-llselect>`, which accepts ui-select's call-site markup. For migrating an existing ui-select codebase. |
| `index.html`, `app.js` | The live demo for both. |
| `benchmark.html`, `benchmark.js` | `<llselect-single>` vs `<ui-llselect>` vs real ui-select. |

## The two `name` attributes

This is the single most load-bearing thing in this document, because it is a name collision that makes an entire class of workaround look necessary when it is not.

AngularJS's `name` and HTML's `name` are unrelated mechanisms that happen to share a spelling. On a native element both readers read the same attribute at once, which is why they look like one thing:

```html
<select name="fruit" ng-model="x">
<!--          ^ AngularJS reads this ($attr.name -> myForm.fruit)
              ^ the browser also reads this (the HTTP serialization key) -->
```

`NgModelController` reads it as a plain attribute, with no element-type check whatsoever (`angular.js:30472`):

```js
this.$name = $interpolate($attr.name || '', false)($scope);
```

`ngModelDirective` itself is `restrict: 'A'`, `require: ['ngModel', '^?form', '^?ngModelOptions']` (`angular.js:31525`) - it does not care what element it sits on. Nor does `requiredDirective`, which is `restrict: 'A'`, `require: '?ngModel'`, and explicitly handles non-input elements (`angular.js:36061`):

```js
var value = attr.hasOwnProperty('required') || $parse(attr.ngRequired)(scope);
if (!attr.ngRequired) {
  // force truthy in case we are on non input element
  // (input elements do this automatically for boolean attributes like required)
  attr.required = true;
}
```

And `FormController.$addControl` registers every control unconditionally; the name only adds the named lookup (`angular.js:24769`):

```js
$addControl: function(control) {
  assertNotHasOwnProperty(control.$name, 'input');
  this.$$controls.push(control);        // unconditional, so form.$valid needs no name
  if (control.$name) {
    this[control.$name] = control;      // myForm.fruit needs the name
  }
  control.$$parentForm = this;
},
```

So the two readers diverge the moment the element is not a native form control:

| markup | AngularJS `myForm.fruit` | browser HTTP submit |
|---|---|---|
| `<select name="fruit" ng-model="x">` | yes, reads `$attr.name` | yes, it is a form-associated element |
| `<llselect-single name="fruit" ng-model="x">` | yes, reads `$attr.name` | no, not form-associated; the browser ignores the attribute |
| `<llselect-single name="fruit" ng-model="x">` + a hidden input | yes (on the custom element) | yes (on the hidden input) |

Row 2 is what these directives give you: `myForm.fruit.$error.required` and `myForm.$valid` work, with no native `<select>` and no hidden element anywhere. The value is not POSTed by a plain form submit. If you need that too, the two `name` attributes live on two different elements and do not interfere - see the next section.

The `name` is always written by you, in your own template. The library never generates one. A library-generated name (for example an auto-incrementing counter) would key the server contract to JavaScript execution order: reorder your code, or mount two widgets in a different order, and the payload keys silently swap.

## No native form integration, and why none is needed here

llselect renders plain `div`s, not a form control. This is a deliberate boundary (root README, "No native form integration"), and the AngularJS case does not weaken it: as shown above, `form.$valid` never involved `<form>` or `<select>` in the first place.

Three shapes were considered and rejected for the library core:

- **A generated `<select>` + a full `<option>` list, so `ng-options` can drive it and llselect reads back from the DOM.** Broken. The `<option value>` that `ngOptions` writes is a hashed key string, not your data; the real object lives only in the private `selectCtrl.selectValueMap` (`angular.js:35259`, comment: "Keys are the hashed values, values the original values"), reachable only from a directive on a real `<select>`. llselect would read back `'object:4'` instead of your object, destroying the typed `T` that is the whole point. It also makes `items` a second write channel - exactly the select2 / choices.js dual-write pattern DESIGN.md rejects - and needs a MutationObserver to notice when `ngOptions` re-renders.
- **A generated `<select>` + a single `<option>` for the chosen item.** Architecturally harmless (a one-way output projection; llselect stays the source of truth) but it buys nothing. The submitted bytes are identical to a hidden input's, multi-select included (N same-named hidden inputs serialize exactly like a `<select multiple>`); the `T` -> string projection problem is identical; and `required` fails on both (`<input type="hidden">` is barred from constraint validation per spec, and a hidden `<select required>` blocks submit invisibly). Same output, same limits, more API.
- **Real constraint validation.** Would require llselect to be a form-associated custom element (`static formAssociated`, `ElementInternals.setFormValue` / `setValidity`). That is a different architecture from "a class mounted on a div", and it needs Safari 16.4+ against llselect's documented floor of Safari 14.1+.

If you do need a plain `<form>` POST alongside these directives, mirror the value yourself. The app-side options are a hidden input, N hidden inputs for multiple, or the `formdata` event (`form.addEventListener('formdata', e => e.formData.append(...))`, Safari 15+). That there are three viable strategies with different trade-offs is itself a reason the library blesses none of them.

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

`select as` is the ngModel value projection - the "what string/id does this item become in the model" question. It has no llselect setting because that projection belongs to the app, not the library, and `ng-options` is the app stating it. This is also why the library core has no `itemToValueFn`: using `itemToString` for it would conflate display with identity, so switching `texts` to another language would change your submitted values.

`track by` is a per-item hash; `compareFn` is pairwise equality. Same semantic, different shape: `compareFn: (a, b) => trackBy(a) === trackBy(b)`.

## Gotchas

All verified against AngularJS 1.8.3 source, not folk wisdom.

- **`$setViewValue` self-applies. Do not wrap it in `$scope.$apply()`.** Contrary to what most guides say, `$$debounceViewValueCommit` checks `$$rootScope.$$phase` and wraps `$commitViewValue` in `$scope.$apply` itself when called outside a digest. Wrapping it again is merely redundant. You only need `$apply` if you touch other scope state in the same callback.
- **`LLSelectMultiple` must override `$isEmpty`.** The default is `isUndefined(value) || value === '' || value === null || value !== value` (`angular.js:30570`), so `[]` is not empty and `required` silently passes on an empty multi-selection. AngularJS applies the same fix in its own `<select multiple>` branch (`angular.js:35932`), and `llselect-angularjs.js` copies it.
- **Model -> view must not write back.** llselect's `setChosenItem` / `setChosenItems` fire `onChange` whenever the value really changes, including when *we* change it while rendering the model into the view. `setItems` compounds this: it drops a chosen item that is not in the new list and fires `onChange` for that too (`onItemsChanged` in `src/single.ts` / `src/multiple.ts`). Wired naively, loading data asynchronously marks the form `$dirty` and can null the model, for a field the user never touched. `llselect-angularjs.js` arms view -> model only around real interaction (`makeWriteBackGate`).
- **A `select as` model value must be re-resolved after `setItems`.** It is a key pointing into the list, so a new list needs a fresh reverse lookup. Without the projection the model holds the item itself and llselect's own `setItems` already reconciled it - calling `$render` there would re-add an item that is no longer in the list.
- **Settings are immutable; only methods are watched.** llselect resolves its settings bag once at construction, so `ll-placeholder` / `ll-searchable` / `ll-popup-width-policy` are read once at link time. Only `ll-disabled` gets a `$watch`, because it maps to the `setDisabled()` method.
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

## Why ui-select is slow

Relevant because it is the only thing these directives need to beat, and because the reason is structural rather than a tuning issue.

All three ui-select themes carry this in `choices.tpl.html` (`bootstrap/choices.tpl.html:7`, and the select2 / selectize equivalents):

```html
ng-class="{active: $select.isActive(this), disabled: $select.isDisabled(this)}"
```

`ng-class` re-evaluates every digest, so both functions run once per rendered row per digest. They are:

```js
// uiSelectController.js:317, isActive
var itemIndex = ctrl.items.indexOf(itemScope[ctrl.itemProperty]);   // O(n)

// uiSelectController.js:358, isDisabled
var itemIndex = ctrl.items.indexOf(item);                            // O(n) again

// uiSelectController.js:332, _isItemSelected, called by isDisabled when multiple
return (ctrl.selected && angular.isArray(ctrl.selected) &&
    ctrl.selected.filter(function (selection) { return angular.equals(selection, item); }).length > 0);
```

The last one is doubly bad: `angular.equals` is a recursive deep comparison rather than `===`, and `.filter().length > 0` instead of `.some()` means no early exit, so it always scans the entire selected array.

Total per digest: n rows * (O(n) indexOf + O(m) deep compare) = **O(n^2) per digest**, and digests run on every keystroke and every click. With 1000 choices and 50 selected that is millions of comparisons per keypress.

llselect has no digest, so nothing recomputes on unrelated events; `itemDisabledFn` runs once per item per render and is never cached across renders (DESIGN.md, "Disabled"); and a single toggle goes through `replacePopupListItemElInDom`, which is O(1) DOM work. The gap comes from architecture, not micro-optimization.

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
| `search-enabled` | `searchable`. Defaults to `true`, following ui-select's default rather than llselect's `false` - it is ui-select's markup, so its defaults are what the call site expects |
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

### Why it is not, and cannot be, a full ui-select reimplementation

The attribute surface is the easy part. The hard part is who builds the choice rows.

ui-select rewrites the theme's `choices.tpl.html` at compile time (`uiSelectChoicesDirective.js:40-52`):

```js
choices.attr('ng-repeat', parserResult.repeatExpression(groupByExp))
       .attr('ng-if', '$select.open')
rowsInner.attr('uis-transclude-append', '')
clickTarget.attr('ng-click', '$select.select(' + parserResult.itemName + ',$select.skipFocusser,$event)')
```

So every row is produced by `ng-repeat` + the theme template + transclusion. `uis-transclude-append` (`common.js:130-138`) exists specifically to link the user's template against the ng-repeat row scope instead of a fresh transclusion scope - that is why `p.name` resolves inside `<ui-select-choices repeat="p in people">`. And the templates pass the scope object itself into the controller, which looks the item up by the user's repeat variable name: `itemScope[ctrl.itemProperty]` (`uiSelectController.js:317`). The API contract is the scope, not a value.

Honoring the row-scope contract literally means the rows must come from `ng-repeat` and the theme template - which is exactly the work llselect's `popupListEl` / `createItemEl` / lazy rendering / `replacePopupListItemElInDom` do. The two are mutually exclusive. A `<ui-llselect>` that reproduced that contract would use approximately none of llselect: it would be a fork of ui-select. Fixing the O(n^2) would make such a fork substantially faster than ui-select, but it would keep ng-repeat, a child scope per row, and transclusion - the architecture the migration was meant to escape - and it would demonstrate nothing about llselect. So `<ui-llselect>` does not do that, and `$select.isActive(this)` / `$select.isDisabled(this)` / `on-highlight` / `ui-lock-choice` (all of which take a row scope and exist to drive the theme's `ng-class`) have no bridge. llselect applies its own `.llselect-item-focused` / `.llselect-item-disabled` instead.

What `<ui-llselect>` does not carry over is the theme CSS, and that is not a fixable oversight. llselect exposes only a `cssClassPrefix` knob, and every class name is derived from it (`createClassIdMap`), so `cssClassPrefix: 'select2'` yields `.select2-item-focused`, not the `.select2-highlighted` the CSS wants; there is no per-slot rename. `base.ts` says as much: "the shipped themes target the default prefix only - a custom prefix means bringing your own CSS". Even with matching names, ui-select's CSS encodes ui-select's DOM tree, not just its class names:

```css
.ui-select-container[theme="select2"] .ui-select-dropdown .ui-select-search-hidden input { }
.input-group > .ui-select-bootstrap > input.ui-select-search.form-control { }
.ui-select-bootstrap > .ui-select-match > .btn { }
```

Those child chains, element types, and the `[theme=]` attribute selector do not match llselect's tree, and the themes additionally depend on Bootstrap's own classes (`form-control`, `dropdown-menu`, `btn btn-default`, `caret`, `input-group`). Migrating to llselect means adopting llselect's themes regardless, so this is a cost the migration already pays.

`<ui-llselect>` is the migration aid, not the destination. Once a call site is moving anyway, `<llselect-single>` is both faster (no child scope, no `$compile` per row) and shorter than what it replaces:

```html
<!-- ui-select -->
<ui-select ng-model="p">
  <ui-select-match>{{$select.selected.name}}</ui-select-match>
  <ui-select-choices repeat="p in people | filter: $select.search"><span>{{p.name}}</span></ui-select-choices>
</ui-select>

<!-- <ui-llselect>: same markup, one attribute added, llselect's DOM underneath -->
<ui-llselect ng-model="p">
  <ui-select-match>{{$select.selected.name}}</ui-select-match>
  <ui-select-choices repeat="p in people | filter: $select.search" ll-label="p.name"><span>{{p.name}}</span></ui-select-choices>
</ui-llselect>

<!-- <llselect-single>: the destination -->
<llselect-single ng-model="p" ll-searchable="true" ll-options="p.name for p in people"></llselect-single>
```

For the record, reproducing ui-select exactly would also mean reproducing its bugs, since real apps depend on observed behavior. A sample found while reading the source: `uiSelectConfig` has no `paste` key but the controller reads it (`uiSelectController.js:19`, always `undefined`); `close-on-select` is `$parse(attrs.closeOnSelect)()` with no scope, so only literals work; `scope.$watch('sortable', ...)` watches a scope property of that literal name which normally never exists, so `sortable` / `removeSelected` / `skipFocusser` effectively evaluate once and never react; select2 + multiple never renders `no-choice` because that template lacks the slot; and `on-highlight` fires from inside `isActive`, i.e. once per digest per active row rather than once per highlight change.

## Not supported

Deliberate gaps. Each throws or is simply absent rather than silently half-working.

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
