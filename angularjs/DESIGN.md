# Design notes - llselect-angularjs

Why this package exists and why each piece is shaped the way it is. Written for an agent picking the work up cold: it records the reasoning and the rejected alternatives, not the usage - that is [`README.md`](README.md). The evidence behind every factual claim here is in [`SPEC.md`](SPEC.md), with file:line references.

Conventions follow the root [`CLAUDE.md`](../CLAUDE.md) and [`docs/llm/DESIGN.md`](../docs/llm/DESIGN.md); where they disagree about llselect itself, the root wins.

## Why AngularJS gets a package when React / Vue do not

llselect ships no framework wrappers, for three reasons (see the "No official React / Vue / Angular wrapper" bullet in the root README). All three fail for AngularJS specifically, which is why this package exists:

1. **"Chasing framework API churn."** AngularJS is end-of-life and frozen. There is no churn left to chase. A binding written against it can never rot.
2. **"A wrapper must pick one item type `T` and will be wrong for someone."** The `ng-options` expression grammar IS the app declaring its own `T` projections: `c.id as c.name for c in colors track by c.id` states the label, the identity, and the model value in one line. The binding never has to guess, because AngularJS solved this in 2012.
3. **"A wrapper must pick one state-sync strategy."** AngularJS has exactly one: `ngModel` + the digest. There is no Pinia / Redux / signals / form-library choice to get wrong.

React and Vue fail reasons 2 and 3 (no standard expression grammar, no standard state layer), so the boundary holds for them. This is not an exception carved out of the rule; the rule's premises simply do not apply here.

Two practical reasons on top: AngularJS is still deployed widely enough to matter (Syncthing's UI, among many), and the only performance bar to clear is ui-select, which is very low (see below).

## No native form integration, and why none is needed here

llselect renders plain `div`s, not a form control. This is a deliberate boundary (root README, "No native form integration"), and the AngularJS case does not weaken it: as shown above, `form.$valid` never involved `<form>` or `<select>` in the first place.

Three shapes were considered and rejected for the library core:

- **A generated `<select>` + a full `<option>` list, so `ng-options` can drive it and llselect reads back from the DOM.** Broken. The `<option value>` that `ngOptions` writes is a hashed key string, not your data; the real object lives only in the private `selectCtrl.selectValueMap` (`angular.js:35259`, comment: "Keys are the hashed values, values the original values"), reachable only from a directive on a real `<select>`. llselect would read back `'object:4'` instead of your object, destroying the typed `T` that is the whole point. It also makes `items` a second write channel - exactly the select2 / choices.js dual-write pattern DESIGN.md rejects - and needs a MutationObserver to notice when `ngOptions` re-renders.
- **A generated `<select>` + a single `<option>` for the chosen item.** Architecturally harmless (a one-way output projection; llselect stays the source of truth) but it buys nothing. The submitted bytes are identical to a hidden input's, multi-select included (N same-named hidden inputs serialize exactly like a `<select multiple>`); the `T` -> string projection problem is identical; and `required` fails on both (`<input type="hidden">` is barred from constraint validation per spec, and a hidden `<select required>` blocks submit invisibly). Same output, same limits, more API.
- **Real constraint validation.** Would require llselect to be a form-associated custom element (`static formAssociated`, `ElementInternals.setFormValue` / `setValidity`). That is a different architecture from "a class mounted on a div", and it needs Safari 16.4+ against llselect's documented floor of Safari 14.1+.

If you do need a plain `<form>` POST alongside these directives, mirror the value yourself. The app-side options are a hidden input, N hidden inputs for multiple, or the `formdata` event (`form.addEventListener('formdata', e => e.formData.append(...))`, Safari 15+). That there are three viable strategies with different trade-offs is itself a reason the library blesses none of them.

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

<!-- <ui-llselect>: renamed elements, one attribute added, llselect's DOM underneath -->
<ui-llselect ng-model="p">
  <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
  <ui-llselect-choices repeat="p in people | filter: $select.search" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
</ui-llselect>

<!-- <llselect-single>: the destination -->
<llselect-single ng-model="p" ll-filterable="true" ll-options="p.name for p in people"></llselect-single>
```

For the record, reproducing ui-select exactly would also mean reproducing its bugs, since real apps depend on observed behavior. A sample found while reading the source: `uiSelectConfig` has no `paste` key but the controller reads it (`uiSelectController.js:19`, always `undefined`); `close-on-select` is `$parse(attrs.closeOnSelect)()` with no scope, so only literals work; `scope.$watch('sortable', ...)` watches a scope property of that literal name which normally never exists, so `sortable` / `removeSelected` / `skipFocusser` effectively evaluate once and never react; select2 + multiple never renders `no-choice` because that template lacks the slot; and `on-highlight` fires from inside `isActive`, i.e. once per digest per active row rather than once per highlight change.
