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

  /**
   * The built-in arrows, by name. Only llselect's own icons are offered: a
   * custom arrow means editing this file, which is the point of a package you
   * copy. `createTriggerArrowContentElFn` is called per render, so each call
   * must build a fresh element - one SVG cannot be in two triggers at once.
   */
  var ARROWS = {
    chevron: llselect.createChevronDownSvgEl,
    triangle: llselect.createTriangleDownSvgEl,
  }

  function resolveArrow(name) {
    // Batteries-included default: the chevron. Core deliberately ships no
    // arrow (the app decides); these directives are the opposite trade.
    if (name === 'none') { return null }
    if (!name) { name = 'chevron' }
    var create = ARROWS[name]
    if (!create) {
      throw new Error('llselect-angularjs: unknown arrow "' + name +
        '"; supported: ' + Object.keys(ARROWS).join(', ') + ', none')
    }
    return function () { return create() }
  }

  /**
   * $eval an ll-*-fn attribute into a render-time DOM factory: called by
   * llselect outside any digest, and the returned element is NOT $compile'd.
   * Angular templates per row are the <ui-llselect> trade, deliberately not
   * this one. A non-function value is reported loudly.
   * @returns {Function | null}
   */
  function evalFnAttr(scope, attrs, name) {
    if (!attrs[name]) { return null }
    var fn = scope.$eval(attrs[name])
    if (typeof fn !== 'function') {
      throw new Error('llselect-angularjs: ' + attrs.$attr[name] + ' must evaluate to a function')
    }
    return fn
  }

  /**
   * Settings shared by both directives: config defaults first, then this
   * element's ll-* attributes on top.
   *
   * Only settings that are genuinely app-wide have a default. `placeholder` has
   * none on purpose - it is per-field copy, not a house style - and neither do
   * items / disabled, which are per-field state.
   */
  function commonSettings(scope, attrs, parsed, config) {
    var settings = parsed.settings(scope)
    settings.ariaLabelledBy = attrs.llAriaLabelledby || null
    settings.ariaLabel = attrs.llAriaLabel || null

    if (config.uiTranslationPack) { settings.uiTranslationPack = config.uiTranslationPack }
    if (config.filterable !== null) { settings.filterable = config.filterable }
    if (config.popupWidthPolicy) { settings.popupWidthPolicy = config.popupWidthPolicy }
    var arrow = config.arrow

    // Read once at link time; only ll-disabled gets a watcher, because it
    // maps onto a method. (llselect's uiTranslationPack is runtime-swappable
    // too, but as an app-wide config it has no per-element binding here.)
    if (attrs.llPlaceholder) { settings.placeholder = scope.$eval(attrs.llPlaceholder) }
    if (attrs.llFilterable) { settings.filterable = scope.$eval(attrs.llFilterable) }
    if (attrs.llPopupWidthPolicy) { settings.popupWidthPolicy = scope.$eval(attrs.llPopupWidthPolicy) }
    if (attrs.llArrow) { arrow = attrs.llArrow }
    var itemContentFn = evalFnAttr(scope, attrs, 'llItemContentFn')
    if (itemContentFn) { settings.createItemContentElFn = itemContentFn }
    var triggerContentFn = evalFnAttr(scope, attrs, 'llTriggerContentFn')
    if (triggerContentFn) { settings.createTriggerContentElFn = triggerContentFn }

    settings.createTriggerArrowContentElFn = resolveArrow(arrow)
    return settings
  }

  /** ll-disabled maps to the setDisabled() method, so it gets a watcher. */
  function wireDisabled(scope, attrs, sel) {
    if (!attrs.llDisabled) { return }
    scope.$watch(attrs.llDisabled, function (disabled) { sel.setDisabled(!!disabled) })
  }

  /**
   * @typedef {import('@llselect/core').LLSelectSingle<unknown>} LlselectSingleInstance
   * @typedef {import('@llselect/core').LLSelectMultiple<unknown>} LlselectMultipleInstance
   */

  /**
   * The controller other directives on the same element `require` (by the
   * directive names `llselectSingle` / `llselectMultiple`) to reach the live
   * widget - the door for app-owned policy directives (an app-wide
   * permission-driven disable, etc.). instance() is late-bound: the widget is
   * constructed in the post-link, AFTER controllers instantiate, so call it
   * from a $watch / event handler, never from a controller constructor.
   */
  function LlselectApiController() {
    /** @type {LlselectSingleInstance | LlselectMultipleInstance | null} */
    var sel = null
    /**
     * Wired by the owning directive's link; not part of the public surface.
     * @param {LlselectSingleInstance | LlselectMultipleInstance} s
     */
    this.$$setInstance = function (s) { sel = s }
    /**
     * The live LLSelectSingle / LLSelectMultiple. Throws before link; never returns null.
     * @returns {LlselectSingleInstance | LlselectMultipleInstance}
     */
    this.instance = function () {
      if (!sel) {
        throw new Error('llselect-angularjs: instance() is not available yet - the widget is created at link time; call it from a $watch or event handler')
      }
      return sel
    }
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

    /**
     * App-wide defaults, set once in .config(). Without this a 40-select app
     * repeats the same house style 40 times.
     *
     * Only settings that are app-wide by nature are here. `uiTranslationPack` is the
     * clearest case - an app picks its language once, and llselect's chrome
     * strings are not per-field copy. `placeholder` is deliberately absent: it
     * IS per-field copy. Per-element ll-* attributes always win.
     *
     *   angular.module('app', ['llselect'])
     *     .config(['llselectConfigProvider', function (llselectConfigProvider) {
     *       llselectConfigProvider.defaults({ arrow: 'chevron', filterable: true, uiTranslationPack: llselectI18n.zhTW })
     *     }])
     */
    .provider('llselectConfig', function () {
      var config = {
        /** 'chevron' | 'triangle' | null. null = whatever the theme draws. */
        arrow: null,
        /** boolean | ((items) => boolean) | null. null = llselect's own default (off). */
        filterable: null,
        /** 'match-trigger' | 'fit-content' | null. null = llselect's own default. */
        popupWidthPolicy: null,
        /** A UI-translation pack (@llselect/core/i18n), or null for the English defaults. */
        uiTranslationPack: null,
      }
      this.defaults = function (overrides) {
        var unknown = Object.keys(overrides).filter(function (k) { return !(k in config) })
        if (unknown.length) {
          throw new Error('llselectConfigProvider.defaults: unknown key(s): ' + unknown.join(', ') +
            '; supported: ' + Object.keys(config).join(', '))
        }
        angular.extend(config, overrides)
        return this
      }
      this.$get = function () { return config }
    })

    .directive('llselectSingle', ['$parse', 'llselectConfig', function ($parse, llselectConfig) {
      return {
        restrict: 'E',
        require: ['ngModel', 'llselectSingle'],
        controller: LlselectApiController,
        link: function (scope, element, attrs, ctrls) {
          var ngModelCtrl = ctrls[0]
          var parsed = compileLlOptions($parse, attrs.llOptions)
          var settings = commonSettings(scope, attrs, parsed, llselectConfig)

          if (attrs.llClearable) { settings.clearable = scope.$eval(attrs.llClearable) }

          var gate = makeWriteBackGate()
          // $setViewValue self-applies: it checks $$rootScope.$$phase and wraps
          // $commitViewValue in $apply when outside a digest. No $apply here.
          settings.onChange = function (item) {
            if (gate.isSuppressed()) { return }
            ngModelCtrl.$setViewValue(item === undefined ? null : parsed.toModelValue(scope, item))
          }

          var sel = new llselect.LLSelectSingle(element[0], settings)
          ctrls[1].$$setInstance(sel)

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

    .directive('llselectMultiple', ['$parse', 'llselectConfig', function ($parse, llselectConfig) {
      return {
        restrict: 'E',
        require: ['ngModel', 'llselectMultiple'],
        controller: LlselectApiController,
        link: function (scope, element, attrs, ctrls) {
          var ngModelCtrl = ctrls[0]
          var parsed = compileLlOptions($parse, attrs.llOptions)
          var settings = commonSettings(scope, attrs, parsed, llselectConfig)

          if (attrs.llClearable) { settings.clearable = scope.$eval(attrs.llClearable) }
          if (attrs.llTriggerDisplay) { settings.triggerDisplay = scope.$eval(attrs.llTriggerDisplay) }
          if (attrs.llSelectAllRow) { settings.selectAllRow = scope.$eval(attrs.llSelectAllRow) }
          var tagContentFn = evalFnAttr(scope, attrs, 'llTagContentFn')
          if (tagContentFn) { settings.createTagContentElFn = tagContentFn }
          var tagRemoveIconFn = evalFnAttr(scope, attrs, 'llTagRemoveButtonContentFn')
          if (tagRemoveIconFn) { settings.createTagRemoveButtonContentElFn = tagRemoveIconFn }

          // Batteries-included checkboxes: every row gets a live checkbox icon,
          // and (with ll-select-all-row) the row gets the matching tri-state
          // one plus the pack's counting label. ll-checkboxes="false" opts out
          // of every checkbox visual - including the select-all row's default
          // unicode glyph, suppressed via plain-text custom content. Core
          // ships no icons (its select-all default is that plain-text glyph;
          // per item its answer is the subclass recipe, demo 5.4 / 5.5); this
          // package's answer is a default. Rows render only after
          // construction, so reading `sel` here is safe.
          // An ll-item-content-fn composes: its element renders beside the
          // checkbox (null falls back to the label text); opting out of
          // checkboxes hands it the whole row.
          var checkboxes = attrs.llCheckboxes ? scope.$eval(attrs.llCheckboxes) : true
          if (checkboxes) {
            var userContentFn = settings.createItemContentElFn || null
            var checkboxRowEl = function (state, contentNode) {
              var row = document.createElement('span')
              row.style.display = 'inline-flex'
              row.style.alignItems = 'center'
              row.style.gap = '0.4em'
              row.appendChild(llselect.createOutlinedCheckboxSvgEl({ state: state }))
              row.appendChild(contentNode)
              return row
            }
            settings.createItemContentElFn = function (item) {
              var content = userContentFn && userContentFn(item)
              return checkboxRowEl(sel && sel.isChosen(item) ? 'checked' : 'unchecked',
                content || document.createTextNode(settings.itemToStringFn(item)))
            }
            settings.createSelectAllRowContentElFn = function (chosenState, chosenCount, totalCount) {
              return checkboxRowEl(chosenState, document.createTextNode(sel.getUiTranslationPack().selectAllRowLabel(chosenCount, totalCount)))
            }
          } else {
            // `null` would fall back to the default content, which starts
            // with the unicode glyph; "no checkboxes" means no indicator at
            // all, so hand the row just the counting label.
            settings.createSelectAllRowContentElFn = function (chosenState, chosenCount, totalCount) {
              var s = document.createElement('span')
              s.textContent = sel.getUiTranslationPack().selectAllRowLabel(chosenCount, totalCount)
              return s
            }
          }

          var gate = makeWriteBackGate()
          settings.onChange = function (items) {
            if (gate.isSuppressed()) { return }
            ngModelCtrl.$setViewValue(items.map(function (item) {
              return parsed.toModelValue(scope, item)
            }))
          }

          var sel = new llselect.LLSelectMultiple(element[0], settings)
          ctrls[1].$$setInstance(sel)

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
})(/** @type {any} */ (window).angular, /** @type {any} */ (window).llselect) // script-tag globals, cast for checkJs
