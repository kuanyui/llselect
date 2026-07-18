/**
 * llselect bindings for AngularJS 1.x - <llselect-single> and <llselect-multiple>.
 *
 * NOT part of the llselect package. Copy this file into your project and adapt
 * it; it is an example, not a supported wrapper. See demo/angularjs/README.md.
 *
 * Requires window.angular and window.llselect (dist/index.umd.js), in that order.
 *
 *   <llselect-single ng-model="picked" name="fruit" required
 *     ll-options="f.id as f.name group by f.type disable when f.soldOut for f in fruits track by f.id">
 *   </llselect-single>
 *
 *   <llselect-multiple ng-model="pickedMany" name="fruits" ll-trigger-display="'tags'"
 *     ll-options="f.name for f in fruits track by f.id">
 *   </llselect-multiple>
 *
 * The `name` attribute is read by AngularJS off this element (NgModelController
 * reads $attr.name), so form.$valid / myForm.fruit.$error work with no native
 * <select> anywhere. It is NOT submitted with a native <form> - this element is
 * not form-associated. Mirror the value into a hidden input if you need that.
 */
;(function (angular, llselect) {
  'use strict'

  if (!angular) { throw new Error('llselect-angularjs: window.angular not found') }
  if (!llselect) { throw new Error('llselect-angularjs: window.llselect not found; load dist/index.umd.js first') }

  // Copied verbatim from AngularJS src/ng/directive/ngOptions.js (MIT, (c) 2010-2020 Google LLC).
  // Groups: 1 select, 2 label, 3 group by, 4 disable when, 5 array item name,
  //         6 object key name, 7 object value name, 8 collection, 9 track by.
  var NG_OPTIONS_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+group\s+by\s+([\s\S]+?))?(?:\s+disable\s+when\s+([\s\S]+?))?\s+for\s+(?:([$\w][$\w]*)|(?:\(\s*([$\w][$\w]*)\s*,\s*([$\w][$\w]*)\s*\)))\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?$/

  /**
   * Compiles an ng-options-style expression into the llselect settings it maps
   * onto. The clause -> setting mapping is 1:1 except `select as`, which has no
   * llselect equivalent by design: it is the ngModel value projection, and the
   * app (not the library) declares it - exactly what ngOptions does.
   */
  function compileLlOptions($parse, expression) {
    var m = String(expression || '').match(NG_OPTIONS_REGEXP)
    if (!m) {
      throw new Error('llselect-angularjs: cannot parse ll-options: "' + expression + '"')
    }
    if (m[6] || m[7]) {
      throw new Error('llselect-angularjs: "(key, value) in object" is not supported; pass an array')
    }

    var itemName = m[5]
    var selectAs = / as /.test(m[0]) ? m[1] : null
    var displayFn = $parse(m[2] || m[1])
    var groupByFn = m[3] ? $parse(m[3]) : null
    var disableWhenFn = m[4] ? $parse(m[4]) : null
    var itemsFn = $parse(m[8])
    var trackByFn = m[9] ? $parse(m[9]) : null
    var selectAsFn = selectAs ? $parse(selectAs) : null

    function locals(item) {
      var l = {}
      l[itemName] = item
      return l
    }

    return {
      itemsFn: itemsFn,
      hasModelProjection: !!selectAsFn,
      /** item -> the value ng-model holds. Identity unless `select as` is used. */
      toModelValue: function (scope, item) {
        return selectAsFn ? selectAsFn(scope, locals(item)) : item
      },
      /** ng-model value -> item. Reverse lookup; only needed with `select as`. */
      fromModelValue: function (scope, value, items) {
        if (!selectAsFn) { return value }
        for (var i = 0; i < items.length; i++) {
          if (selectAsFn(scope, locals(items[i])) === value) { return items[i] }
        }
        return undefined
      },
      /** The llselect settings derived from the expression's clauses. */
      settings: function (scope) {
        return {
          itemToStringFn: function (item) { return String(displayFn(scope, locals(item))) },
          itemToGroupKeyFn: groupByFn ? function (item) { return groupByFn(scope, locals(item)) } : null,
          itemDisabledFn: disableWhenFn ? function (item) { return !!disableWhenFn(scope, locals(item)) } : null,
          // ngOptions' `track by` is a per-item hash; llselect asks for pairwise
          // equality. Same semantic, different shape.
          compareFn: trackByFn
            ? function (a, b) { return trackByFn(scope, locals(a)) === trackByFn(scope, locals(b)) }
            : null,
        }
      },
    }
  }

  /** Settings shared by both directives, read from ll-* attributes. */
  function commonSettings(scope, attrs, parsed) {
    var settings = parsed.settings(scope)
    settings.ariaLabelledBy = attrs.llAriaLabelledby || null
    settings.ariaLabel = attrs.llAriaLabel || null
    // Settings are immutable in llselect, so these are read once at link time.
    if (attrs.llPlaceholder) { settings.placeholder = scope.$eval(attrs.llPlaceholder) }
    if (attrs.llSearchable) { settings.searchable = scope.$eval(attrs.llSearchable) }
    if (attrs.llPopupWidthPolicy) { settings.popupWidthPolicy = scope.$eval(attrs.llPopupWidthPolicy) }
    return settings
  }

  /** ll-disabled maps to the setDisabled() method, so it gets a watcher. */
  function wireDisabled(scope, attrs, sel) {
    if (!attrs.llDisabled) { return }
    scope.$watch(attrs.llDisabled, function (disabled) { sel.setDisabled(!!disabled) })
  }

  /**
   * llselect's setters fire onChange whenever the value really changes - which
   * includes changes WE caused while pushing the model into the view, and the
   * chosen item llselect drops when setItems no longer contains it. Writing
   * those back through $setViewValue would mark the form $dirty for something
   * the user never did. So view -> model is armed only around real interaction.
   */
  function makeWriteBackGate() {
    var suppressed = false
    return {
      isSuppressed: function () { return suppressed },
      run: function (fn) {
        suppressed = true
        try { fn() } finally { suppressed = false }
      },
    }
  }

  angular.module('llselect', [])

    .directive('llselectSingle', ['$parse', function ($parse) {
      return {
        restrict: 'E',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
          var parsed = compileLlOptions($parse, attrs.llOptions)
          var settings = commonSettings(scope, attrs, parsed)

          if (attrs.llClearable) { settings.clearable = scope.$eval(attrs.llClearable) }

          var gate = makeWriteBackGate()
          // $setViewValue self-applies: it checks $$rootScope.$$phase and wraps
          // $commitViewValue in $apply when outside a digest. No $apply here.
          settings.onChange = function (item) {
            if (gate.isSuppressed()) { return }
            ngModelCtrl.$setViewValue(item === undefined ? null : parsed.toModelValue(scope, item))
          }

          var sel = new llselect.LLSelectSingle(element[0], settings)

          ngModelCtrl.$render = function () {
            var value = ngModelCtrl.$viewValue
            gate.run(function () {
              if (value === null || value === undefined) {
                sel.setChosenItem(undefined)
                return
              }
              sel.setChosenItem(parsed.fromModelValue(scope, value, parsed.itemsFn(scope) || []))
            })
          }

          scope.$watchCollection(parsed.itemsFn, function (items) {
            gate.run(function () { sel.setItems(items || []) })
            // A `select as` model value is a key pointing INTO the list, so a new
            // list must re-resolve it. Without the projection the model holds the
            // item itself and llselect's own setItems already reconciled it.
            if (parsed.hasModelProjection) { ngModelCtrl.$render() }
          })

          wireDisabled(scope, attrs, sel)
          scope.$on('$destroy', function () { sel.destroy() })
        },
      }
    }])

    .directive('llselectMultiple', ['$parse', function ($parse) {
      return {
        restrict: 'E',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
          var parsed = compileLlOptions($parse, attrs.llOptions)
          var settings = commonSettings(scope, attrs, parsed)

          if (attrs.llClearable) { settings.clearable = scope.$eval(attrs.llClearable) }
          if (attrs.llTriggerDisplay) { settings.triggerDisplay = scope.$eval(attrs.llTriggerDisplay) }
          if (attrs.llSelectAllRow) { settings.selectAllRow = scope.$eval(attrs.llSelectAllRow) }

          var gate = makeWriteBackGate()
          settings.onChange = function (items) {
            if (gate.isSuppressed()) { return }
            ngModelCtrl.$setViewValue(items.map(function (item) {
              return parsed.toModelValue(scope, item)
            }))
          }

          var sel = new llselect.LLSelectMultiple(element[0], settings)

          // The model is now a collection, so "empty" changes meaning - without
          // this, `required` passes on an empty selection ([] is not $isEmpty).
          // Same fix AngularJS applies in its own <select multiple> directive.
          ngModelCtrl.$isEmpty = function (value) { return !value || value.length === 0 }

          ngModelCtrl.$render = function () {
            var values = ngModelCtrl.$viewValue
            gate.run(function () {
              if (!values || !values.length) {
                sel.setChosenItems([])
                return
              }
              var items = parsed.itemsFn(scope) || []
              var chosen = []
              for (var i = 0; i < values.length; i++) {
                var item = parsed.fromModelValue(scope, values[i], items)
                if (item !== undefined) { chosen.push(item) }
              }
              sel.setChosenItems(chosen)
            })
          }

          scope.$watchCollection(parsed.itemsFn, function (items) {
            gate.run(function () { sel.setItems(items || []) })
            if (parsed.hasModelProjection) { ngModelCtrl.$render() }
          })

          wireDisabled(scope, attrs, sel)
          scope.$on('$destroy', function () { sel.destroy() })
        },
      }
    }])
})(window.angular, window.llselect)
