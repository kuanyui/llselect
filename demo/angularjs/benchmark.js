/* Demo-only benchmark: <llselect-single> vs <ui-llselect> vs real ui-select. */
;(function (angular) {
  'use strict'

  // A real timezone picker: 417 IANA zones, which is a field real apps ship and
  // is already enough to make ui-select crawl. Preferred over a synthetic 3000:
  // a number nobody would recognise invites "well, nobody has 3000 options".
  // Intl.supportedValuesOf is ES2022 - above llselect's stated browser floor,
  // but this is a demo page, not the library. Falls back to a padded list so an
  // older browser still gets a comparable item count rather than an error.
  var ZONES = (typeof Intl.supportedValuesOf === 'function')
    ? Intl.supportedValuesOf('timeZone')
    : Array.from({ length: 417 }, function (_, i) { return 'Etc/Zone_' + i })

  var ITEM_COUNT = Number(new URLSearchParams(location.search).get('items')) || ZONES.length
  var WIDGET_COUNT = Number(new URLSearchParams(location.search).get('widgets')) || 20
  var DIGEST_ROUNDS = 20

  // Repeat the zone list if a reader asks for more than there are zones.
  var ITEMS = Array.from({ length: ITEM_COUNT }, function (_, i) {
    var name = ZONES[i % ZONES.length] + (i >= ZONES.length ? ' #' + Math.floor(i / ZONES.length) : '')
    return { id: i, name: name, bad: i % 17 === 0 }
  })

  var CONTESTANTS = [
    {
      // The baseline the AngularJS port has to beat: what the app already has.
      // Its dropdown is an OS widget, so JS cannot time its open or filter -
      // those are n/a rather than a fake 0 (same rule as the main benchmark's
      // native <select>, docs/SPEC_BENCHMARK.md). Build and digest are real,
      // and digest is the one that decides "is validation slower than before".
      key: 'native',
      label: '<select ng-options>',
      note: 'the incumbent. Renders every <option> up front; no lazy list',
      markup: '<select ng-model="picked" ng-options="i.name for i in items track by i.id"></select>',
      rowSel: 'option',
      skipInteraction: true,
    },
    {
      key: 'llselect',
      label: '<llselect-single>',
      note: 'llselect DOM, no per-row scope',
      markup: '<llselect-single ng-model="picked" ll-searchable="true"' +
        ' ll-options="i.name for i in items track by i.id"></llselect-single>',
      triggerSel: '.llselect-trigger',
      rowSel: '.llselect-item',
      searchSel: 'input',
    },
    {
      key: 'ui-llselect',
      label: '<ui-llselect>',
      note: 'ui-select markup, llselect DOM, one child scope + $compile per row',
      markup: '<ui-llselect ng-model="picked">' +
        '<ui-select-match placeholder="Pick">{{$select.selected.name}}</ui-select-match>' +
        '<ui-select-choices repeat="i in items | filter: $select.search" ll-label="i.name">' +
        '<span ng-bind-html="i.name | highlight: $select.search"></span>' +
        '</ui-select-choices></ui-llselect>',
      triggerSel: '.llselect-trigger',
      rowSel: '.llselect-item',
      searchSel: 'input',
    },
    {
      key: 'ui-select',
      label: 'ui-select 0.19.8',
      note: 'ng-repeat + transclusion; isActive/isDisabled are O(n) each, per row, per digest',
      markup: '<ui-select ng-model="picked" theme="bootstrap">' +
        '<ui-select-match placeholder="Pick">{{$select.selected.name}}</ui-select-match>' +
        '<ui-select-choices repeat="i in items | filter: $select.search">' +
        '<span ng-bind-html="i.name | highlight: $select.search"></span>' +
        '</ui-select-choices></ui-select>',
      // .ui-select-toggle (the inner span) carries ng-click="$select.activate()".
      // NOT .ui-select-match, which is the outer div with no handler - clicking
      // that is a silent no-op, and reports an unopened widget as a fast one.
      triggerSel: '.ui-select-toggle',
      rowSel: '.ui-select-choices-row',
      searchSel: 'input.ui-select-search',
    },
  ]

  var now = function () { return performance.now() }

  function median(xs) {
    var s = xs.slice().sort(function (a, b) { return a - b })
    return s[Math.floor(s.length / 2)]
  }

  function run($compile, $rootScope, stage, c) {
    var out = { label: c.label, note: c.note }

    // --- build: N widgets from scratch -----------------------------------
    stage.innerHTML = ''
    var scopes = []
    var t0 = now()
    for (var i = 0; i < WIDGET_COUNT; i++) {
      var s = $rootScope.$new()
      s.items = ITEMS
      s.picked = undefined
      var el = $compile(c.markup)(s)
      stage.appendChild(el[0])
      scopes.push(s)
      s.$digest()
    }
    out.build = now() - t0
    out.nodes = stage.querySelectorAll('*').length

    // --- open: first widget, list becomes visible -------------------------
    var host = stage.children[0]
    var scope = scopes[0]
    if (c.skipInteraction) {
      // Either the widget has no JS-observable open (native, an OS widget), or
      // this row is only about validation cost. Report n/a, never a fake 0.
      out.open = null
      out.rows = host.querySelectorAll(c.rowSel).length
    } else {
      var trigger = host.querySelector(c.triggerSel)
      if (!trigger) { throw new Error('trigger not found: ' + c.triggerSel) }
      // llselect refuses to open a trigger that is outside the layout viewport
      // or clipped by a scroll ancestor (positioning.ts isAnchorHidden), so the
      // widget about to be measured has to be on-screen first. Same reason the
      // main benchmark does this before every timed interaction.
      // Guarded: jsdom has no scrollIntoView, and it has no layout to scroll.
      if (trigger.scrollIntoView) { trigger.scrollIntoView({ block: 'center', behavior: 'instant' }) }
      t0 = now()
      trigger.click()
      scope.$digest()
      out.open = now() - t0
      out.rows = host.querySelectorAll(c.rowSel).length
      // A click that silently did nothing would otherwise report an unopened
      // widget as the fastest one, and time its digests against an empty list.
      if (out.rows === 0) {
        throw new Error('open was a no-op: 0 rows matched ' + c.rowSel +
          '. If this is llselect, the trigger was most likely off-screen or clipped: ' +
          'llselect deliberately refuses to open then (positioning.ts isAnchorHidden).')
      }
    }

    // --- digest while open: the O(n^2) exposure ---------------------------
    var ds = []
    for (var d = 0; d < DIGEST_ROUNDS; d++) {
      t0 = now()
      scope.$digest()
      ds.push(now() - t0)
    }
    out.digest = median(ds)

    // --- filter: one query, list re-renders --------------------------------
    var search = c.searchSel ? host.querySelector(c.searchSel) : null
    if (search) {
      t0 = now()
      search.value = 'America'
      search.dispatchEvent(new Event('input', { bubbles: true }))
      scope.$digest()
      out.filter = now() - t0
      out.filtered = host.querySelectorAll(c.rowSel).length
    } else {
      out.filter = null
    }

    // --- teardown ---------------------------------------------------------
    t0 = now()
    scopes.forEach(function (s) { s.$destroy() })
    stage.innerHTML = ''
    out.teardown = now() - t0

    return out
  }

  /**
   * One live widget per contestant, left on the page after the run. Numbers do
   * not convey what 220x on a digest actually feels like; typing in ui-select's
   * search box next to llselect's does, in about two seconds. Built AFTER every
   * measurement so these instances cannot contend with a timed one.
   */
  function buildPlayground($compile, $rootScope, el) {
    el.innerHTML = ''
    CONTESTANTS.forEach(function (c) {
      var box = document.createElement('div')
      box.className = 'try-box'
      var h = document.createElement('h4')
      h.textContent = c.label
      var note = document.createElement('small')
      note.textContent = c.note
      box.appendChild(h)
      box.appendChild(note)

      var mount = document.createElement('div')
      mount.className = 'try-mount'
      box.appendChild(mount)
      el.appendChild(box)

      var scope = $rootScope.$new()
      scope.items = ITEMS
      scope.picked = undefined
      mount.appendChild($compile(c.markup)(scope)[0])
      scope.$digest()
    })
  }

  function fmt(v) { return v === null || v === undefined ? '-' : v.toFixed(2) }

  function render(rows) {
    var best = {}
    var metrics = ['build', 'open', 'digest', 'filter', 'teardown']
    metrics.forEach(function (m) {
      var vals = rows.map(function (r) { return r[m] }).filter(function (v) { return v != null })
      best[m] = Math.min.apply(Math, vals)
    })
    var html = '<table class="bench-table"><thead><tr><th>implementation</th>' +
      '<th>build ' + WIDGET_COUNT + ' (ms)</th><th>open (ms)</th>' +
      '<th>digest while open (ms)</th><th>filter (ms)</th><th>teardown (ms)</th>' +
      '<th>DOM nodes</th><th>rows</th></tr></thead><tbody>'
    rows.forEach(function (r) {
      html += '<tr><td><b>' + r.label + '</b><br><small>' + r.note + '</small></td>'
      metrics.forEach(function (m) {
        var isBest = r[m] != null && Math.abs(r[m] - best[m]) < 1e-9
        var ratio = r[m] != null && best[m] > 0 ? ' <small>(' + (r[m] / best[m]).toFixed(1) + 'x)</small>' : ''
        html += '<td' + (isBest ? ' class="bench-best"' : '') + '>' + fmt(r[m]) +
          (isBest ? '' : ratio) + '</td>'
      })
      html += '<td>' + r.nodes + '</td><td>' + r.rows + '</td></tr>'
    })
    return html + '</tbody></table>'
  }

  /**
   * The acceptance question this page has to answer, separately from raw speed:
   * does putting angular-validation on <llselect-single> cost more than putting
   * it on the <select ng-options> it replaces? Same validator, same data, same
   * digests - only the widget differs.
   */
  var VALIDATION_PAIR = [
    {
      key: 'native-av',
      label: '<select ng-options> + validation',
      note: 'the incumbent, validated',
      markup: '<form name="f1"><select name="v1" ng-model="picked" validation="required"' +
        ' ng-options="i.name for i in items track by i.id"></select></form>',
      rowSel: 'option',
      skipInteraction: true,
    },
    {
      key: 'llselect-av',
      label: '<llselect-single> + validation',
      note: 'same validator, llselect widget',
      markup: '<form name="f2"><llselect-single name="v2" ng-model="picked" validation="required"' +
        ' ll-options="i.name for i in items track by i.id"></llselect-single></form>',
      triggerSel: '.llselect-trigger',
      rowSel: '.llselect-item',
      skipInteraction: true, // this pair is about validation cost, not open latency
    },
  ]

  function runSet($compile, $rootScope, stage, list) {
    return list.map(function (c) {
      try {
        return run($compile, $rootScope, stage, c)
      } catch (e) {
        return { label: c.label, note: 'ERROR: ' + e.message, build: null, open: null, digest: null, filter: null, teardown: null, nodes: 0, rows: 0 }
      }
    })
  }

  /**
   * angular-validation reads its messages through angular-translate, so without
   * this every validator rejects a promise per field with "Could not translate:
   * 'INVALID_REQUIRED'" - which is not just console noise here: it is real work
   * inside the timed section, one rejection per validated widget.
   *
   * Inline, deliberately NOT useStaticFilesLoader like the demo page uses: that
   * does an $http GET, and a benchmark must not put network I/O in the middle of
   * what it is measuring. The demo wants real messages; this only needs the
   * validator to resolve without doing extra work.
   */
  angular.module('llselectBenchConfig', [])
    .config(['$translateProvider', function ($translateProvider) {
      $translateProvider.translations('en', { INVALID_REQUIRED: 'required' })
      $translateProvider.preferredLanguage('en')
      $translateProvider.useSanitizeValueStrategy(null)
    }])

  /** The page states the dataset size; keep it honest rather than hardcoded. */
  window.describeAngularBench = function () {
    var counts = { 'zone-count': ITEM_COUNT, 'widget-count': WIDGET_COUNT, 'widget-count-2': WIDGET_COUNT }
    Object.keys(counts).forEach(function (id) {
      var el = document.getElementById(id)
      if (el) { el.textContent = String(counts[id]) }
    })
    var inline = document.querySelectorAll('.zone-count-inline')
    for (var i = 0; i < inline.length; i++) { inline[i].textContent = String(ITEM_COUNT) }
  }

  window.runAngularBench = function (stage, resultsEl, playgroundEl) {
    resultsEl.innerHTML = '<p>Running...</p>'
    var modules = ['ng', 'ngSanitize', 'llselect', 'llselect.uiCompat', 'ui.select',
      'ghiscoding.validation', 'llselectBenchConfig']
    var injector = angular.injector(modules)
    injector.invoke(['$compile', '$rootScope', function ($compile, $rootScope) {
      var main = runSet($compile, $rootScope, stage, CONTESTANTS)
      var av = runSet($compile, $rootScope, stage, VALIDATION_PAIR)
      resultsEl.innerHTML =
        '<h3>Widgets</h3>' + render(main) +
        '<h3>angular-validation: llselect vs the select it replaces</h3>' + render(av)
      if (playgroundEl) { buildPlayground($compile, $rootScope, playgroundEl) }
    }])
  }
})(window.angular)
