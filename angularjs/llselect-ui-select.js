/**
 * <ui-llselect> - a ui-select-shaped bridge onto llselect, for AngularJS 1.x.
 *
 * NOT part of the llselect package. Demo material; copy and adapt.
 * Requires window.angular and window.llselect (dist/index.umd.js), in that order.
 * Does not require ui-select itself to be loaded, and does not conflict with it.
 *
 *   <ui-llselect ng-model="p" name="person" required search-enabled="true">
 *     <ui-llselect-match placeholder="Pick one">{{$select.selected.name}}</ui-llselect-match>
 *     <ui-llselect-choices repeat="p in people | filter: $select.search" ll-item-text="p.name">
 *       <span ng-bind-html="p.name | highlight: $select.search"></span>
 *     </ui-llselect-choices>
 *   </ui-llselect>
 *
 * Scope: the call-site markup and your transcluded templates carry over from
 * ui-select. Its CSS themes do not - llselect owns the DOM, so style with an
 * llselect theme. Anything llselect has no concept of (tagging, sortable,
 * append-to-body, async refresh, limit) is NOT bridged: those attributes are
 * ignored, never half-implemented. See README.md.
 */
;(function (angular, llselect) {
  'use strict'

  if (!angular) { throw new Error('ui-llselect: window.angular not found') }
  if (!llselect) { throw new Error('ui-llselect: window.llselect not found; load dist/index.umd.js first') }

  // ui-select's own repeat grammar, copied from ui-select 0.19.8
  // src/uisRepeatParserService.js (MIT). Groups: 1 alias (model mapper),
  // 2 item, 3 key, 4 value, 5 source + filters, 6 track by.
  var REPEAT_REGEXP = /^\s*(?:([\s\S]+?)\s+as\s+)?(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(\s*[\s\S]+?)?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/

  /**
   * Row scopes live as long as the DOM llselect built for them. llselect
   * rebuilds the whole list in renderPopupList (open / filter / setItems /
   * rerender), so that is the one place old scopes become garbage. Subclassing
   * is the sanctioned way to extend llselect for a wrapper (DESIGN.md,
   * "Customization model"); the bridge hangs off a WeakMap because it cannot
   * exist before super() runs.
   */
  var BRIDGES = new WeakMap()

  /**
   * @template {new (...args: any[]) => any} B
   * @param {B} Base
   * @returns {B}
   */
  function defineCompatClass(Base) {
    return class extends Base {
      renderPopupList() {
        var bridge = BRIDGES.get(this)
        if (bridge) { bridge.releaseRowScopes() }
        super.renderPopupList()
      }
      renderTrigger() {
        // The trigger (single match / tag chips) is rebuilt here, so the
        // scopes backing the PREVIOUS trigger content die now - and only now.
        var bridge = BRIDGES.get(this)
        if (bridge) { bridge.releaseTriggerScopes() }
        super.renderTrigger()
      }
      createItemEl(item, index) {
        // createItemEl calls createItemContentEl synchronously, so the index is
        // still current when our createItemContentElFn reads it. That is what
        // makes $index available to transcluded templates.
        var bridge = BRIDGES.get(this)
        if (bridge) { bridge.rowIndex = index }
        return super.createItemEl(item, index)
      }
    }
  }

  var CompatSingle = defineCompatClass(llselect.LLSelectSingle)
  var CompatMultiple = defineCompatClass(llselect.LLSelectMultiple)

  function parseRepeat($parse, expression) {
    var m = String(expression || '').match(REPEAT_REGEXP)
    if (!m) {
      throw new Error('ui-llselect: cannot parse repeat: "' + expression + '"')
    }
    if (m[3] || m[4]) {
      throw new Error('ui-llselect: "(key, value) in collection" is not supported; pass an array')
    }
    return {
      itemName: m[2],
      // `alias as item in source` - the model projection, same role as
      // ng-options' `select as`. The app declares it; llselect never guesses.
      modelMapperFn: m[1] ? $parse(m[1]) : null,
      sourceFn: $parse(m[5]),
      trackByFn: m[6] ? $parse(m[6]) : null,
    }
  }

  /**
   * Pulls the two template slots out before AngularJS can compile them.
   * Emptying tElement during compile stops $compile from descending into the
   * children (compileNodes checks childNodes.length AFTER the compile fn runs),
   * so nothing inside the templates links early. The slot names are
   * llselect's own (<ui-llselect-match> / <ui-llselect-choices>), so real
   * ui-select's directives never match them even when both libraries load.
   */
  function extractSlots(tElement) {
    var root = tElement[0]
    var matchEl = root.querySelector('ui-llselect-match')
    var choicesEl = root.querySelector('ui-llselect-choices')
    if (!choicesEl) {
      throw new Error('ui-llselect: expected one <ui-llselect-choices repeat="..."> child')
    }
    var slots = {
      matchHtml: matchEl ? matchEl.innerHTML.trim() : '',
      matchAttrs: matchEl ? collectAttrs(matchEl) : {},
      choicesHtml: choicesEl.innerHTML.trim(),
      choicesAttrs: collectAttrs(choicesEl),
    }
    tElement.empty()
    return slots
  }

  function collectAttrs(el) {
    var out = {}
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i]
      out[a.name.replace(/^(data-|x-)/, '')] = a.value
    }
    return out
  }

  function link(scope, element, attrs, ngModelCtrl, slots, $parse, $compile, $rootScope, isMultiple) {
    var repeat = parseRepeat($parse, slots.choicesAttrs.repeat)
    var itemName = repeat.itemName
    var choicesAttrs = slots.choicesAttrs

    // <ui-llselect-choices ll-item-text="p.name">. ui-select has NO item -> string
    // concept at all (its row content is DOM, its filtering is an Angular filter in
    // the repeat expression), but llselect needs one for the option's
    // accessible name. This attribute is the single addition to ui-select's
    // markup; without it an object item degrades to String(item).
    var itemTextFn = choicesAttrs['ll-item-text'] ? $parse(choicesAttrs['ll-item-text']) : null
    var groupByFn = choicesAttrs['group-by'] ? $parse(choicesAttrs['group-by']) : null
    var disableFn = choicesAttrs['ui-disable-choice'] ? $parse(choicesAttrs['ui-disable-choice']) : null

    function locals(item) {
      var l = {}
      l[itemName] = item
      return l
    }

    // $select is what transcluded templates bind against. Only the members
    // llselect can actually back are published; the rest would be lies.
    //
    // Deliberately NOT put on `scope`, and this directive deliberately has no
    // `scope: true`. ui-select creates a child scope, which silently shadows a
    // non-dotted ng-model (`ng-model="p"` writes p onto the child, so the
    // parent never sees it) - the classic reason its docs push `ng-model="ctrl.p"`.
    // Every template we compile gets its own child scope anyway, so $select can
    // live there instead: templates see it, ng-model keeps the parent scope.
    var $select = { selected: isMultiple ? [] : undefined, search: '', multiple: !!isMultiple }

    // Template scopes tracked PER SLOT: popup rows die on every list rebuild,
    // but tag chips and the single-mode match live in the TRIGGER, which the
    // core re-renders on its own schedule (every toggle). One shared array
    // meant a popup rebuild $destroy'ed scopes still backing live trigger
    // DOM (frozen bindings), while never-opened popups accumulated row
    // scopes. Each slot is now released exactly when its DOM is rebuilt.
    var rowScopes = []
    var triggerScopes = []

    function newTemplateScope(item, slot) {
      var s = scope.$new()
      s.$select = $select
      s[itemName] = item
      ;(slot === 'trigger' ? triggerScopes : rowScopes).push(s)
      return s
    }

    /**
     * Compile one template slot and hand llselect an element that is ALREADY
     * interpolated. $compile alone does not fill bindings - AngularJS does that
     * on the next digest - and llselect renders from native events, i.e. outside
     * one. Returning an unevaluated clone means llselect measures and positions
     * the popup against the literal "{{p.name}}" text, which then resizes a tick
     * later: the flicker on first open. Digesting the row scope now fills it in
     * place. If a digest is already running (a $watchCollection-driven render),
     * $digest would throw, and the ambient one already traverses the new child.
     */
    function compileSlot(html, rowScope) {
      var el = $compile('<span>' + html + '</span>')(rowScope)[0]
      if (!$rootScope.$$phase) { rowScope.$digest() }
      return el
    }
    var bridge = {
      rowIndex: 0,
      releaseRowScopes: function () {
        for (var i = 0; i < rowScopes.length; i++) { rowScopes[i].$destroy() }
        rowScopes.length = 0
      },
      releaseTriggerScopes: function () {
        for (var i = 0; i < triggerScopes.length; i++) { triggerScopes[i].$destroy() }
        triggerScopes.length = 0
      },
    }

    /**
     * on-select / on-remove run AFTER $setViewValue's self-applied digest has
     * finished, so a plain call would leave anything the app expression
     * writes to scope invisible until some unrelated digest. Real ui-select
     * fires them inside ng-click's apply; mirror that phase-safely.
     */
    function applyOnScope(fn) {
      if ($rootScope.$$phase) { fn() } else { scope.$apply(fn) }
    }

    var onSelectFn = attrs.onSelect ? $parse(attrs.onSelect) : null
    var onRemoveFn = attrs.onRemove ? $parse(attrs.onRemove) : null

    function toModel(item) {
      return repeat.modelMapperFn ? repeat.modelMapperFn(scope, locals(item)) : item
    }
    function fromModel(value, items) {
      if (!repeat.modelMapperFn) { return value }
      for (var i = 0; i < items.length; i++) {
        if (repeat.modelMapperFn(scope, locals(items[i])) === value) { return items[i] }
      }
      return undefined
    }

    // ui-select filters by re-evaluating the repeat source with $select.search
    // bound (that is what `| filter: $select.search` means). llselect owns the
    // search box and asks per item, so evaluate the source once per query and
    // answer membership from it - the user's filter expression stays authoritative.
    var lastQuery = null
    var matchSet = null
    function filterFn(item, query) {
      if (query !== lastQuery) {
        lastQuery = query
        $select.search = query
        matchSet = new Set(repeat.sourceFn(scope, { $select: { search: query } }) || [])
      }
      return matchSet.has(item)
    }

    var settings = {
      // aria-label is the HTML-native way to name the field; title keeps the
      // ui-select-parity mapping (its templates feed aria labels from title).
      ariaLabel: attrs.ariaLabel || attrs.title || null,
      itemToStringFn: itemTextFn
        ? function (item) { return String(itemTextFn(scope, locals(item))) }
        : null,
      itemToGroupKeyFn: groupByFn ? function (item) { return groupByFn(scope, locals(item)) } : null,
      itemDisabledFn: disableFn ? function (item) { return !!disableFn(scope, locals(item)) } : null,
      compareFn: repeat.trackByFn
        ? function (a, b) {
            return repeat.trackByFn(scope, locals(a)) === repeat.trackByFn(scope, locals(b))
          }
        : null,
      createItemContentElFn: function (item) {
        if (!slots.choicesHtml) { return null }
        // Row templates read $select.search (`| highlight:`). filterFn alone
        // cannot keep it current: the library never calls it for an EMPTY
        // query (clearing, close-resets), so the stale query would keep
        // highlighting. Sync from the source of truth at render time.
        $select.search = sel ? sel.getFilterQuery() : ''
        var rowScope = newTemplateScope(item, 'row')
        rowScope.$index = bridge.rowIndex
        return compileSlot(slots.choicesHtml, rowScope)
      },
    }

    if (slots.matchAttrs.placeholder) { settings.placeholder = slots.matchAttrs.placeholder }
    // ui-select defaults searchEnabled to true (uiSelectConfig.searchEnabled);
    // llselect defaults filterable to false. Follow ui-select here - this is its
    // markup, so its defaults are what the call site expects.
    settings.filterable = attrs.searchEnabled ? scope.$eval(attrs.searchEnabled) : true
    // Deliberate deviation: ui-select shows the clear button only in single
    // mode (its match-multiple templates ignore allow-clear; default false,
    // uiSelectMatchDirective.js:25). llselect's multiple has the concept, so
    // the attribute is honored in both modes. See API.md "Deliberate deviations".
    // ui-select's own parse (uiSelectMatchDirective.js:25): a bare attribute
    // (empty value) means true, otherwise the string must be exactly 'true'
    // case-insensitively. A raw truthy check inverted both edges
    // (allow-clear="false" enabled it, bare allow-clear disabled it).
    var allowClear = slots.matchAttrs['allow-clear']
    if (allowClear !== undefined) {
      settings.clearable = allowClear === '' ? true : String(allowClear).toLowerCase() === 'true'
    }
    if (settings.filterable) { settings.filterFn = filterFn }
    // Batteries-included default arrow: every ui-select theme renders a caret,
    // so a bare trigger would read as broken to a migrating call site.
    settings.createTriggerArrowContentElFn = function () { return llselect.createChevronDownSvgEl() }

    var gate = { suppressed: false }
    function withoutWriteBack(fn) {
      gate.suppressed = true
      try { fn() } finally { gate.suppressed = false }
    }

    var sel
    if (isMultiple) {
      settings.triggerDisplay = 'tags'
      // ui-select defaults removeSelected to true (common.js:108) and applies
      // it in multiple mode only (uiSelectController.js:240-241; single is an
      // in-source TODO). Follow its default, like search-enabled: this is its
      // markup, so its defaults are what the call site expects.
      settings.hideChosenRows = attrs.removeSelected ? !!scope.$eval(attrs.removeSelected) : true
      // <ui-llselect-match> in multiple mode is per selected item (ui-select
      // ng-repeats it over $select.selected), so it maps onto one tag's
      // content, not the whole trigger.
      if (slots.matchHtml) {
        settings.createTagContentElFn = function (item) {
          var tagScope = newTemplateScope(item, 'trigger')
          tagScope.$item = item
          return compileSlot(slots.matchHtml, tagScope)
        }
      }
      settings.onChange = function (items, previous) {
        $select.selected = items.slice()
        if (gate.suppressed) { return }
        ngModelCtrl.$setViewValue(items.map(toModel))
        applyOnScope(function () { fireSelectRemove(items, previous) })
      }
      sel = new CompatMultiple(element[0], settings)
      ngModelCtrl.$isEmpty = function (value) { return !value || value.length === 0 }
    } else {
      if (slots.matchHtml) {
        settings.createTriggerContentElFn = function (ctx) {
          if (ctx.chosenItem === undefined) { return null }
          $select.selected = ctx.chosenItem
          return compileSlot(slots.matchHtml, newTemplateScope(ctx.chosenItem, 'trigger'))
        }
      }
      settings.onChange = function (item) {
        $select.selected = item
        if (gate.suppressed) { return }
        ngModelCtrl.$setViewValue(item === undefined ? null : toModel(item))
        if (onSelectFn && item !== undefined) {
          applyOnScope(function () { onSelectFn(scope, { $item: item, $model: toModel(item), $select: $select }) })
        }
      }
      sel = new CompatSingle(element[0], settings)
    }

    function fireSelectRemove(items, previous) {
      if (onSelectFn) {
        items.forEach(function (item) {
          if (previous.indexOf(item) === -1) {
            onSelectFn(scope, { $item: item, $model: toModel(item), $select: $select })
          }
        })
      }
      if (onRemoveFn) {
        previous.forEach(function (item) {
          if (items.indexOf(item) === -1) {
            onRemoveFn(scope, { $item: item, $model: toModel(item), $select: $select })
          }
        })
      }
    }

    BRIDGES.set(sel, bridge)

    ngModelCtrl.$render = function () {
      var value = ngModelCtrl.$viewValue
      var items = repeat.sourceFn(scope, { $select: { search: '' } }) || []
      withoutWriteBack(function () {
        if (isMultiple) {
          var chosen = (value || []).map(function (v) { return fromModel(v, items) })
            .filter(function (i) { return i !== undefined })
          $select.selected = chosen
          sel.setChosenItems(chosen)
          return
        }
        var item = (value === null || value === undefined) ? undefined : fromModel(value, items)
        $select.selected = item
        sel.setChosenItem(item)
      })
    }

    scope.$watchCollection(function () {
      return repeat.sourceFn(scope, { $select: { search: '' } })
    }, function (items) {
      // Invalidate BEFORE setItems: while a query is active, setItems
      // refilters synchronously through filterFn, which would otherwise
      // answer from the previous collection's matchSet and hide newly added
      // matching items until the next keystroke.
      lastQuery = null
      withoutWriteBack(function () { sel.setItems(items ? items.slice() : []) })
      if (repeat.modelMapperFn) { ngModelCtrl.$render() }
    })

    // Disabled, ui-select's own way (select.js:1135): observe the ATTRIBUTE
    // and ride ngDisabled's attr.$set, which hands observers a real boolean; a
    // static literal ("disabled") and an interpolated string stay truthy-string
    // compatible with ui-select - string "false" trap included, the bridge is
    // faithful to the original, quirks and all. The attribute itself stays
    // inert on this non-form-associated host (no pointer-event suppression),
    // and setDisabled() keeps the trigger hoverable by design, so hover
    // tooltips explaining WHY it is disabled keep working.
    attrs.$observe('disabled', function (v) { sel.setDisabled(!!v) })

    scope.$on('$destroy', function () {
      bridge.releaseRowScopes()
      bridge.releaseTriggerScopes()
      sel.destroy()
    })
  }

  angular.module('llselect.uiCompat', [])
    .directive('uiLlselect', ['$parse', '$compile', '$rootScope', function ($parse, $compile, $rootScope) {
      return {
        restrict: 'E',
        require: 'ngModel',
        compile: function (tElement, tAttrs) {
          var slots = extractSlots(tElement)
          // Same test ui-select uses: presence, not value.
          var isMultiple = angular.isDefined(tAttrs.multiple)
          return function (scope, element, attrs, ngModelCtrl) {
            link(scope, element, attrs, ngModelCtrl, slots, $parse, $compile, $rootScope, isMultiple)
          }
        },
      }
    }])
})(/** @type {any} */ (window).angular, /** @type {any} */ (window).llselect) // script-tag globals, cast for checkJs
