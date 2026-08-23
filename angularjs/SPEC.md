# Spec - llselect-angularjs

The contract, and the evidence for it. Written for an agent: every non-obvious claim this package rests on, with a file:line reference into the source it came from, so nobody has to re-derive it or take it on trust. Usage is [`README.md`](README.md); the reasoning and rejected alternatives are [`DESIGN.md`](DESIGN.md).

Verified against **AngularJS 1.8.3**, **ui-select 0.19.8**, and **angular-validation-ghiscoding 1.5.28**. Line numbers are into those exact versions; re-check them if the pins move.

## Verified facts about AngularJS

These are the load-bearing ones. Several contradict widely repeated folk wisdom, which is why they are pinned here rather than left as comments.

| claim | evidence |
|---|---|
| `name` is a plain attribute read off whatever element `ng-model` sits on, with no element-type check. It is NOT the HTML form-serialization `name`. | `this.$name = $interpolate($attr.name \|\| '', false)($scope)` - `angular.js:30472`, in `NgModelController` |
| `ngModel` works on any element. | `restrict: 'A'`, `require: ['ngModel', '^?form', '^?ngModelOptions']` - `angular.js:31525` |
| `required` works on a custom element, and AngularJS goes out of its way to make it. | `restrict: 'A'`, `require: '?ngModel'`, then `var value = attr.hasOwnProperty('required') \|\| ...; if (!attr.ngRequired) { attr.required = true }` with the comment "force truthy in case we are on non input element" - `angular.js:36061` |
| `form.$valid` needs no `name`; only the named lookup `myForm.fruit` does. | `$addControl` pushes to `$$controls` unconditionally, then `if (control.$name) { this[control.$name] = control }` - `angular.js:24769` |
| `$setViewValue` self-applies. Do NOT wrap it in `$scope.$apply()`. | `$$debounceViewValueCommit` checks `$$rootScope.$$phase` and calls `this.$$scope.$apply(...)` itself when outside a digest - `ngModel.js`, `$$debounceViewValueCommit` |
| The default `$isEmpty` does not treat `[]` as empty, so `required` passes on an empty multi-selection unless overridden. | `isUndefined(value) \|\| value === '' \|\| value === null \|\| value !== value` - `angular.js:30570` |
| Overriding `$isEmpty` for a collection is AngularJS's own fix, not a hack. | `<select multiple>` does exactly this: `// so the meaning of $isEmpty changes` / `ngModelCtrl.$isEmpty = function(value) { return !value \|\| value.length === 0 }` - `angular.js:35932` |
| **A directive can never throw at the caller.** Its error always goes to `$exceptionHandler`, which by default only logs. Not `$apply`'s try/catch - bypassing `$apply` does not help. | `invokeLinkFn` wraps every link fn: `try { linkFn(...) } catch (e) { $exceptionHandler(e, startingTag($element)) }` - `angular.js:11374` |
| `ngOptions` is the one thing that genuinely requires a native `<select>`. | `restrict: 'A'`, `terminal: true`, `require: ['select', 'ngModel']` - `ngOptions.js`. Put it on a `<div>` and the `select` controller is not found. |
| An `<option>`'s `value` under `ngOptions` is a hashed key, not your data - so reading items back out of the DOM is impossible without AngularJS internals. | `self.selectValueMap = {}; // Keys are the hashed values, values the original values` - `angular.js:35259`, a private on the `select` controller |
| Boolean attributes are only normalized to `true` on a known set of elements - which is why `requiredDirective` compensates. | `BOOLEAN_ELEMENTS` = `input,select,option,textarea,button,form,details`; `getBooleanAttrName` returns falsy elsewhere - `angular.js:3630-3653` |
| `ngDisabled` (like every `ng-<boolean-attr>` alias) is one `$watch` whose whole action is toggling the ATTRIBUTE: `attr.$set('disabled', !!value)`. On a non-form-associated element that attribute is inert, so `ng-disabled` on these directives changes markup and nothing else. | `ngBooleanAttrWatchAction` - `angular.js:24528-24531` |
| `ngDisabled`'s `priority: 100` orders link fns on the element; it does NOT guard the expression or the attribute. What priority makes impractical is SUPPRESSING ngDisabled's own attr toggle - out-prioritizing it needs `terminal`, which also kills `ngModel` on the element. Nobody in this stack needs to: on a non-form-associated host the toggle is inert. | `priority: 100` - `angular.js:24549` |
| ui-select itself never fights `ngDisabled` either: it observes the `disabled` ATTRIBUTE and rides `attr.$set`, which hands observers a real boolean; a static literal or interpolated value arrives as a string and is consumed by truthiness (so the string `"false"` disables - a real ui-select quirk). `<ui-llselect>` mirrors the mechanism, quirks included. | `attrs.$observe('disabled', ...)` with the comment "No need to use $eval() (thanks to ng-disabled) since we already get a boolean instead of a string" - ui-select 0.19.8 `dist/select.js:1135-1138` |
| `ngChange` registers into `$viewChangeListeners` and nothing else, and those listeners fire ONLY in `$$writeModelToScope` - the `$setViewValue` commit path. Programmatic model writes never reach them, so `ng-change` on these directives has native semantics for free. | `ctrl.$viewChangeListeners.push(...)` - `angular.js:27997`; `forEach(this.$viewChangeListeners, ...)` in `$$writeModelToScope` - `angular.js:30981` |
| `require` accepts a named OBJECT (since 1.5), and the link fn's fourth argument becomes `{key: controller}` - no controller of your own needed. `?` entries resolve to `null` where the directive is absent, which is what makes a generic policy directive safe on native form controls. | `getControllers`, `isObject(require)` branch building `value[property]` - `angular.js:10792-10797` |

### The ng-options grammar

`NG_OPTIONS_REGEXP` is copied verbatim into `llselect-angularjs.js` from `ngOptions.js` (MIT, (c) 2010-2020 Google LLC). Nothing else from AngularJS is copied.

```
select as label group by group disable when disable for (key, value) in collection track by trackBy
```

| group | clause | maps to |
|---|---|---|
| 1 | `select` (only when ` as ` is present) | the ngModel projection - no llselect equivalent, by design |
| 2 | `label` | `itemToStringFn` |
| 3 | `group by` | `itemToGroupKeyFn` |
| 4 | `disable when` | `itemDisabledFn` |
| 5 | array item name | the locals key every clause is evaluated against |
| 6, 7 | object key / value names | **refused**: `(key, value) in object` is not supported |
| 8 | collection | `setItems()` via `$watchCollection` |
| 9 | `track by` | `compareFn`, as `(a, b) => trackBy(a) === trackBy(b)` |

`displayFn` is `$parse(match[2] || match[1])` and `valueFn` is `$parse(match[2] ? match[1] : valueName)` - i.e. with no ` as `, group 1 IS the label. The directives reproduce that, so `c.name for c in colors` and `c as c.name for c in colors` behave as ngOptions does.

## Verified facts about ui-select

| claim | evidence |
|---|---|
| Its per-digest cost is O(n^2). `ng-class` re-evaluates every digest, once per row, and both functions scan the whole item list. | `ng-class="{active: $select.isActive(this), disabled: $select.isDisabled(this)}"` - `bootstrap/choices.tpl.html:7` (and the select2 / selectize equivalents); `ctrl.items.indexOf(...)` - `uiSelectController.js:317` and `:358` |
| `isDisabled` in multiple mode also deep-compares, with no early exit. | `ctrl.selected.filter(function (selection) { return angular.equals(selection, item) }).length > 0` - `uiSelectController.js:332`. `angular.equals` is a recursive structural compare; `.filter().length` scans the whole array. |
| Its rows come from `ng-repeat` + the theme template, rewritten at compile time - which is why llselect cannot render them and stay compatible. | `choices.attr('ng-repeat', ...)`, `.attr('ng-if', '$select.open')`, `rowsInner.attr('uis-transclude-append', '')`, `clickTarget.attr('ng-click', '$select.select(' + itemName + ',...)')` - `uiSelectChoicesDirective.js:40-52` |
| `uis-transclude-append` exists specifically to link user templates against the ng-repeat ROW scope rather than a fresh transclusion scope. | `transclude(scope, function (clone) { element.append(clone) })` - passing `scope` suppresses the transclusion scope - `common.js:130-138` |
| Its API contract is the scope object itself, not a value. | Templates pass `this`; the controller does `itemScope[ctrl.itemProperty]`, looking the item up by the user's own repeat variable name - `uiSelectController.js:317` |
| It does NOT use a native `<select>` - so AngularJS never forced one. | `restrict: 'EA'`, `require: ['uiSelect', '^ngModel']`, plain templates - `uiSelectDirective.js:5-17` |
| It has no item-to-string concept at all: its row content is DOM and its filtering is an Angular filter expression. This is why `ll-item-text` exists. | `uisRepeatParser.parse` returns `itemName / keyName / source / filters / trackByExp / modelMapper` - no label - `uisRepeatParserService.js:61-75` |
| Its repeat grammar differs from ng-options: the alias comes FIRST, and there is no `label` / `group by` / `disable when` in the expression. | `[alias as] (item \| (key,value)) in source[ \| filters][ track by expr]` - `uisRepeatParserService.js:30` |
| `remove-selected` defaults to true, and only ever removes rows in multiple mode - single is an in-source TODO. The bridge maps it onto `hideChosenRows` with the same default. | `removeSelected: true` - `common.js:108`; `//TODO should implement for single mode removeSelected` above `... \|\| !ctrl.multiple \|\| !ctrl.removeSelected` - `uiSelectController.js:240-241`; attr eval with config fallback - `uiSelectDirective.js:97-99` |
| `allow-clear` defaults to false, and its clear button exists only in the single-mode match templates - `match-multiple` has no field-level clear, only per-chip removes. The bridge honors the attribute in multiple too: a documented deliberate deviation. | `$select.allowClear = ... : false` - `uiSelectMatchDirective.js:25`; the `bootstrap/match-multiple.tpl.html` and `select2/match-multiple.tpl.html` templates contain no `allowClear` |

Bugs found while reading it, listed so nobody reproduces them in the name of compatibility: `uiSelectConfig` has no `paste` key but the controller reads it (`uiSelectController.js:19`, always `undefined`); `close-on-select` is `$parse(attrs.closeOnSelect)()` with no scope, so only literals work; `scope.$watch('sortable', ...)` watches a scope property of that literal name which normally never exists, so `sortable` / `removeSelected` / `skipFocusser` evaluate once and never react; select2 + multiple never renders `no-choice` because that template lacks the slot; `on-highlight` fires from inside `isActive`, i.e. once per digest per active row rather than once per highlight change.

## Verified facts about ghiscoding/angular-validation

| claim | evidence |
|---|---|
| It genuinely requires `name` - it throws without one. This is the case that motivates the whole "two names" section. | `throw 'Angular-Validation Service requires you to have a (name="") attribute on the element to validate...'` - `validation-common.js:460` |
| But it reads that name the AngularJS way, off the ng-model element, so no native `<select>` is needed. | `restrict: 'A'`, `require: 'ngModel'` - `validation-directive.js:17` |
| It revalidates from a watch on the model value - element-agnostic. | `scope.$watch(function () { ... return ctrl.$modelValue }, ...)` in `createWatch()` - `validation-directive.js:356` |
| It hard-depends on `pascalprecht.translate`; without angular-translate the module fails to instantiate. | module dependency; `$translateProvider` must also be pointed at the package's `locales/validation/*.json` or every message renders as `Could not translate: 'INVALID_REQUIRED'` |
| Validation is debounced ~1000 ms, which reads as "it did not fire". | `var _INACTIVITY_LIMIT = 1000` / `this.typingLimit = _INACTIVITY_LIMIT` - `validation-common.js:14`, `:35` |
| Its `elm.bind('blur')` trigger is inert here: blur does not bubble, and the focusable element is llselect's inner trigger, not the custom element the attribute sits on. The `$modelValue` watch is the path that matters for a select. | `elm.bind('blur', blurHandler)` - `validation-directive.js:94` |

## This package's own contract

### Module and element names

| file | angular module | elements |
|---|---|---|
| `llselect-angularjs.js` | `llselect` | `<llselect-single>`, `<llselect-multiple>` |
| `llselect-ui-select.js` | `llselect.uiCompat` | `<ui-llselect>` |

`llselect-ui-select.js` needs `llselect-angularjs.js` loaded first only for load order tidiness; the modules are independent. Both are plain IIFEs reading `window.angular` and `window.llselect`, and both throw at load time if either global is missing.

### Invariants a change must not break

- **View -> model only on real interaction.** llselect's setters fire `onChange` for changes the directive itself causes while rendering the model into the view, and `setItems` fires it again for the chosen item it drops when the item leaves the list. Writing those back marks the form `$dirty` and rewrites the model for a field the user never touched. `makeWriteBackGate` / the `gate` object exists for this; the tests mutation-check it.
- **`$render` runs after every `setItems`**, in both directives, so an async preset resolves once its item arrives. In `<llselect-single>` / `<llselect-multiple>`, `fromModelValue` resolves the value by MEMBERSHIP in the list (`select as` key, `track by` key, or identity), so a value the list lacks resolves to `undefined` - re-rendering never re-adds a dropped item. In `<ui-llselect>` there is no membership test without an alias: the selection is the model itself, ui-select's own semantics.
- **When the chosen item vanishes from the list, `<llselect-single>` / `<llselect-multiple>` keep the model value and the view goes empty.** This matches `ngOptions`, which shows its unknown option in the same situation. The shared consequence: `required` still passes, because the model is not empty. `<ui-llselect>` deviates deliberately: like real ui-select it keeps RENDERING the model value even when the choices list lacks it.
- **`<ui-llselect>` rows must be interpolated before llselect measures them.** `$compile` alone does not fill bindings; AngularJS does that on the next digest, and llselect renders from native events, i.e. outside one. `compileSlot()` digests the row scope before returning the element (guarded on `$rootScope.$$phase`, since `$digest` throws inside a digest and the ambient one already traverses the new child). Without it the popup is positioned against the literal `{{p.name}}` text and resizes a tick later.
- **Row scopes are released where their DOM dies**: wholesale in `renderPopupList` (open / filter / `setItems` / `rerender` rebuild the whole list), and per replaced row after `replacePopupListItemElInDom` (a multi toggle repaints one row; the old row's scope is swept by element disconnection). Without the first, every filter keystroke leaks a scope per row; without the second, every toggle with `remove-selected="false"` does.
- **`<ui-llselect>` must not create a child scope.** ui-select's `scope: true` silently shadows a non-dotted `ng-model`. Every template this bridge compiles gets its own child scope anyway, so `$select` lives there instead.

### App-wide defaults

`llselectConfigProvider.defaults({...})` holds only settings that are app-wide by nature: `arrow`, `filterable`, `popupWidthPolicy`, `uiTranslationPack`. The test for admission is whether an app would plausibly set it once as a house style - `uiTranslationPack` obviously would (i18n is definitionally app-wide), `placeholder` obviously would not (it is per-field copy). Unknown keys throw, so a typo cannot silently do nothing. Precedence is defaults, then this element's `ll-*` attributes.

`ARROWS` maps `'chevron'` / `'triangle'` onto llselect's `createChevronDownSvgEl` / `createTriangleDownSvgEl`. `createTriggerArrowContentElFn` is called per render, so the wrapper must build a fresh element on each call - one SVG cannot be in two triggers at once.

### Settings are frozen; only methods are watched

llselect resolves its settings bag once at construction, so `ll-placeholder` / `ll-filterable` / `ll-filter-fn` / `ll-popup-width-policy` / `ll-arrow` / `ll-checkboxes` / `ll-label-el` are read once at link time and a later scope change does not move them. Only `ll-disabled` gets a `$watch`, because it maps onto the `setDisabled()` method rather than a setting. Any new attribute has to be classified this way before it is added.

### Testing

`npm test` runs jsdom + real angular + the real llselect UMD build off disk (no CDN, no network); a missing `../dist/index.umd.js` fails loudly rather than skipping. Two rules the tests learned the hard way:

- **Assert on `$exceptionHandler`, not `assert.throws`** - see the invokeLinkFn row above.
- **Mutation-test any regression test that guards a timing bug.** The flicker test was false-green until removing the fix failed to turn it red: an earlier check in the same file ran a digest, so it was asserting a state a previous test had already fixed up.
