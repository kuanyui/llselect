# llselect + AngularJS 1.x

[![npm version](https://img.shields.io/npm/v/@llselect/angularjs)](https://www.npmjs.com/package/@llselect/angularjs)

AngularJS 1.x directives for [llselect](../README.md), published as `@llselect/angularjs`. Two independent files: pick the one you need, or use both while migrating.

- GitHub: [Git](https://github.com/kuanyui/llselect/tree/master/angularjs) | [Docs](https://kuanyui.github.io/llselect/angularjs/) | [Demo](https://kuanyui.github.io/llselect/demo/angularjs/examples.html)
- GitLab: [Git](https://gitlab.com/kuanyui/llselect/-/tree/master/angularjs) | [Docs](https://kuanyui.gitlab.io/llselect/angularjs/) | [Demo](https://kuanyui.gitlab.io/llselect/demo/angularjs/examples.html)

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

Deeper material lives beside this file, split by who reads it: [`API.md`](API.md) is the complete attribute reference, one entry per attribute; [`DESIGN.md`](DESIGN.md) is why this package exists at all and why each piece is shaped the way it is; [`SPEC.md`](SPEC.md) is the source-level evidence behind every claim made here, with file:line references into AngularJS and ui-select. If you only want to use the directives, this file plus `API.md` is enough.

## Why this exists when React and Vue do not

llselect ships no framework wrappers. All three reasons for that fail for AngularJS specifically:

- **It cannot rot.** AngularJS is end-of-life and frozen, so there is no API churn to chase.
- **It does not have to guess your data.** The `ng-options` grammar is the app declaring its own item type: `c.id as c.name for c in colors track by c.id` states the label, the identity and the model value in one line.
- **There is only one way to sync state.** `ngModel` plus the digest - no Pinia / Redux / signals / form-library choice to get wrong.

React and Vue fail the last two (no standard expression grammar, no standard state layer), so the boundary holds for them. This is not an exception carved out of the rule; the rule's premises just do not apply here. The full reasoning and the rejected alternatives: [`DESIGN.md`](DESIGN.md).

## What this is not

- Not part of `llselect` itself. It is a separate package with its own version, so llselect's build, types and `sideEffects` stay untouched by it.
- Not a generic wrapper. It handles what is documented here and reports the rest.
- Not a styling-compatible ui-select replacement. `<ui-llselect>` takes ui-select's markup, not its CSS. See "The ui-select bridge".

## Files

| file | module | what |
|---|---|---|
| `llselect-angularjs.js` | `llselect` | `<llselect-single>` / `<llselect-multiple>`, driven by an `ng-options`-style `ll-options` expression. Start here. |
| `llselect-ui-select.js` | `llselect.uiCompat` | `<ui-llselect>`, which accepts ui-select's call-site markup. For migrating an existing ui-select codebase; needs `llselect-angularjs.js` loaded too. |

Each ships a `.min.js` beside it (built by `npm run build`, terser only - there is no bundler). The live [examples](../demo/angularjs/examples.html) and [benchmark](../demo/angularjs/benchmark.html) load these files directly, so what the demo shows is what the package ships.

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

## Gotchas

All verified against AngularJS 1.8.3 source, not folk wisdom.

- **`$setViewValue` self-applies. Do not wrap it in `$scope.$apply()`.** Contrary to what most guides say, `$$debounceViewValueCommit` checks `$$rootScope.$$phase` and wraps `$commitViewValue` in `$scope.$apply` itself when called outside a digest. Wrapping it again is merely redundant. You only need `$apply` if you touch other scope state in the same callback.
- **`LLSelectMultiple` must override `$isEmpty`.** The default is `isUndefined(value) || value === '' || value === null || value !== value` (`angular.js:30570`), so `[]` is not empty and `required` silently passes on an empty multi-selection. AngularJS applies the same fix in its own `<select multiple>` branch (`angular.js:35932`), and `llselect-angularjs.js` copies it.
- **Model -> view must not write back.** llselect's `setChosenItem` / `setChosenItems` fire `onChange` whenever the value really changes, including when *we* change it while rendering the model into the view. `setItems` compounds this: it drops a chosen item that is not in the new list and fires `onChange` for that too (`onItemsChanged` in `src/single.ts` / `src/multiple.ts`). Wired naively, loading data asynchronously marks the form `$dirty` and can null the model, for a field the user never touched. `llselect-angularjs.js` arms view -> model only around real interaction (`makeWriteBackGate`).
- **The model must be re-resolved (`$render`) after every `setItems`.** An async preset can only resolve once its item arrives. In `<llselect-single>` / `<llselect-multiple>` re-rendering is safe because `fromModelValue` resolves by membership: a value the new list lacks resolves to `undefined` (view empty, model kept), so it never re-adds a dropped item. `<ui-llselect>` deliberately skips the membership test without an alias - the selection is the model itself, real ui-select's semantics.
- **Attributes are read once; `ll-disabled` is watched; event expressions run per event.** llselect resolves its settings bag once at construction, so `ll-placeholder` / `ll-filterable` / `ll-popup-width-policy` are read once at link time. `ll-disabled` gets a `$watch`, because it maps to the `setDisabled()` method. `ll-on-open` / `ll-on-close` are event expressions, evaluated on each event like `ng-click`.
- **When the chosen item vanishes from the list, the model keeps its value and the view goes empty** - in `<llselect-single>` / `<llselect-multiple>`. This matches `ngOptions`, which shows its "unknown option" in the same situation and does not null the model. Note the shared consequence: `required` still passes, because the model is not empty. `<ui-llselect>` instead keeps rendering the model value, like real ui-select.

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

## The ui-select bridge

`<ui-llselect>` (`llselect-ui-select.js`) exists so an existing ui-select codebase can migrate without rewriting every call site. The scoping rule is: **bridge what llselect has; ignore what it does not.** Nothing is half-implemented to look compatible. What carries over, the one added attribute (`ll-item-text`) and the deliberate deviations are in [`API.md`](API.md#ui-llselect).

### Implementation notes

Four `protected` methods plus `close()` are overridden by subclassing, which DESIGN.md ("Customization model") names as the sanctioned path for a framework wrapper:

- `renderPopupList` - the entry point for a full list rebuild (open / filter / `setItems` / `rerender`), so it is where the previous round of row scopes is destroyed. Without this, every filter keystroke leaks a scope per row.
- `renderTrigger` - same idea for the trigger: the scopes behind the previous match / tag content die exactly when that content is rebuilt.
- `createItemEl(item, index)` - it calls `createItemContentEl` synchronously, so stashing the index there is what makes `$index` available to templates.
- `replacePopupListItemElInDom(item)` - a multi toggle repaints ONE row; afterwards the replaced row's scope is released (found by its element no longer being in the DOM).
- `close()` - detaches every row, so the same element-connectivity release runs there too.

The bridge hangs off a `WeakMap` rather than an instance field because it cannot exist before `super()` runs.

### Why it is not a full ui-select reimplementation

Short version: honoring ui-select's row-scope contract would mean the rows come from its `ng-repeat` and theme template, which is exactly the work llselect's own rendering does - so a faithful reimplementation would use approximately none of llselect. The long version, with the source references, is in [`DESIGN.md`](DESIGN.md#the-ui-select-bridge) and [`SPEC.md`](SPEC.md).
