/* Demo-only benchmark: <llselect-single> vs <ui-llselect> vs real ui-select. */
;(function (angular) {
  'use strict'

  // A real timezone picker: every IANA zone this browser knows. Around 420, but
  // the exact count is the browser's and changes with its version - the page
  // reads it back rather than stating a number. A field real apps ship, and
  // already enough to make ui-select crawl. Preferred over a synthetic 3000: a
  // number nobody would recognise invites "well, nobody has 3000 options".
  // Intl.supportedValuesOf is ES2022 - above llselect's stated browser floor,
  // but this is a demo page, not the library. Falls back to a padded list so an
  // older browser still gets a comparable item count rather than an error.
  var ZONES = (typeof Intl.supportedValuesOf === 'function')
    ? Intl.supportedValuesOf('timeZone')
    : Array.from({ length: 420 }, function (_, i) { return 'Etc/Zone_' + i })

  var ITEM_COUNT = Number(new URLSearchParams(location.search).get('items')) || ZONES.length
  var WIDGET_COUNT = Number(new URLSearchParams(location.search).get('widgets')) || 20
  // High enough that even llselect's digest - which is below the clock's 100us
  // clamp for any small batch - totals into something measurable rather than
  // reading 0.00 and making its own ratio meaningless.
  var DIGEST_ROUNDS = 200

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
      note: 'What the app already has. Builds every <option> into the DOM up front, so its cost is linear in the item count.',
      markup: '<select ng-model="picked" ng-options="i.name for i in items track by i.id"></select>',
      rowSel: 'option',
      skipInteraction: true,
    },
    {
      key: 'llselect',
      label: '<llselect-single>',
      note: 'This package. Builds the list only on open, and puts no scope or watcher on any row.',
      markup: '<llselect-single ng-model="picked" ll-searchable="true"' +
        ' ll-options="i.name for i in items track by i.id"></llselect-single>',
      triggerSel: '.llselect-trigger',
      rowSel: '.llselect-item',
      searchSel: 'input',
    },
    {
      key: 'ui-llselect',
      label: '<ui-llselect>',
      note: 'This package, taking ui-select\'s markup. llselect underneath, but that markup forces one child scope and one $compile per row.',
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
      note: 'What you are replacing. ng-repeat + transclusion, and its ng-class calls isActive/isDisabled per row per digest - each an indexOf over the whole list.',
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
    // Time the whole batch and divide, rather than timing each digest and taking
    // a median. Browsers clamp performance.now() to 100us (Spectre mitigation),
    // and a single digest lands at or under that: measured per-digest in real
    // Chromium, every contestant read 0.00 or 0.10 and the column - the most
    // important one on this page - said nothing at all. jsdom hid this by having
    // a much finer clock and a much slower DOM.
    t0 = now()
    for (var d = 0; d < DIGEST_ROUNDS; d++) { scope.$digest() }
    out.digest = (now() - t0) / DIGEST_ROUNDS

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
   * Every contestant bound to ONE shared ng-model, left live on the page.
   *
   * Two jobs. First, feel the difference: a table saying ui-select costs ~100x
   * more per digest is an argument; typing in its search box next to
   * llselect's is evidence, and it takes two seconds.
   *
   * Second, and the reason they share a model: prove the binding actually works
   * both ways, and show what each one means by "the same item". They all bind
   * `picked`, so choosing in any one must move all the others.
   */
  function buildPlayground($compile, $rootScope, el, out) {
    el.innerHTML = ''
    var scope = $rootScope.$new()
    scope.items = ITEMS
    scope.picked = undefined

    CONTESTANTS.forEach(function (c) {
      var box = document.createElement('div')
      box.className = 'try-box'
      var h = document.createElement('h4')
      h.appendChild(document.createElement('code')).textContent = c.label
      var note = document.createElement('small')
      note.textContent = c.note
      box.appendChild(h)
      box.appendChild(note)
      var mount = document.createElement('div')
      mount.className = 'try-mount'
      box.appendChild(mount)
      el.appendChild(box)
      mount.appendChild($compile(c.markup)(scope)[0])
    })

    // The shared model, and the two identity probes it exists to demonstrate.
    scope.sameRef = function () { scope.picked = ITEMS[3] }
    scope.equalCopy = function () { scope.picked = angular.copy(ITEMS[3]) }
    scope.clear = function () { scope.picked = undefined }
    scope.isListRef = function () { return scope.picked === ITEMS[3] }
    // What each widget RESOLVED the model to - the point of the copy probe,
    // since every one of them displays the right text either way.
    scope.resolved = function (i) {
      var boxes = document.querySelectorAll('.try-box .ui-select-container')
      if (!boxes.length) { return null }
      var s2 = angular.element(boxes[0]).scope()
      return s2 && s2.$select ? s2.$select.selected : null
    }
    scope.uiSelectHasListItem = function () { return scope.resolved() === ITEMS[3] }

    var panel = $compile(
      '<div class="model-panel">' +
      '<div class="out">shared ng-model = <b>{{ picked ? picked.name : \'undefined\' }}</b>' +
      '<br><small>{{ picked | json }}</small>' +
      '<br>model IS the object in items[]: <b>{{ isListRef() }}</b>' +
      '<br>ui-select resolved it to the object in items[]: <b>{{ uiSelectHasListItem() }}</b>' +
      '</div>' +
      '<div class="demo-row">' +
      '<button ng-click="sameRef()">Set to items[3]</button>' +
      '<button ng-click="equalCopy()">Set to a COPY of items[3]</button>' +
      '<button ng-click="clear()">Clear</button>' +
      '</div></div>')(scope)[0]
    out.appendChild(panel)
    scope.$digest()
  }

  // A digest is naturally sub-millisecond - llselect's is a few microseconds -
  // so reporting it in ms printed "0.00" for the fastest contestant and made its
  // own column unreadable. Each metric is shown in the unit it actually lives in.
  var METRICS = [
    { key: 'build', label: function () { return 'build ' + WIDGET_COUNT + ' (ms)' }, scale: 1, dp: 1 },
    { key: 'open', label: function () { return 'open (ms)' }, scale: 1, dp: 1 },
    { key: 'digest', label: function () { return 'digest while open (us)' }, scale: 1000, dp: 0 },
    { key: 'filter', label: function () { return 'filter (ms)' }, scale: 1, dp: 1 },
    { key: 'teardown', label: function () { return 'teardown (ms)' }, scale: 1, dp: 1 },
  ]

  function fmt(v, m) {
    return v === null || v === undefined ? '-' : (v * m.scale).toFixed(m.dp)
  }

  /**
   * The labels and notes are literally tag names - '<llselect-single>',
   * 'every <option> up front'. Injected raw into innerHTML the browser parsed
   * them as elements and they rendered as nothing, which is how the whole first
   * column of this table came out unreadable.
   */
  function esc(str) {
    return String(str).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
    })
  }

  function render(rows) {
    var best = {}
    METRICS.forEach(function (m) {
      var vals = rows.map(function (r) { return r[m.key] }).filter(function (v) { return v != null })
      best[m.key] = Math.min.apply(Math, vals)
    })
    var html = '<table class="bench-table"><thead><tr><th>implementation</th>' +
      METRICS.map(function (m) { return '<th>' + m.label() + '</th>' }).join('') +
      '<th>DOM nodes</th><th>rows</th></tr></thead><tbody>'
    rows.forEach(function (r) {
      html += '<tr><td><code class="bench-name">' + esc(r.label) + '</code>' +
        '<br><small>' + esc(r.note) + '</small></td>'
      METRICS.forEach(function (m) {
        var v = r[m.key]
        var isBest = v != null && Math.abs(v - best[m.key]) < 1e-9
        var ratio = v != null && best[m.key] > 0 ? ' <small>(' + (v / best[m.key]).toFixed(1) + 'x)</small>' : ''
        html += '<td' + (isBest ? ' class="bench-best"' : '') + '>' + fmt(v, m) +
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

  /** What this run is actually using, so the page can compare against it. */
  window.angularBenchParams = { items: ITEM_COUNT, widgets: WIDGET_COUNT }

  /** The page states the dataset size; keep it honest rather than hardcoded. */
  window.describeAngularBench = function () {
    var itemsIn = document.getElementById('in-items')
    var widgetsIn = document.getElementById('in-widgets')
    if (itemsIn) { itemsIn.value = String(ITEM_COUNT) }
    if (widgetsIn) { widgetsIn.value = String(WIDGET_COUNT) }
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
      if (playgroundEl) {
        buildPlayground($compile, $rootScope, playgroundEl,
          document.getElementById('model-out') || playgroundEl)
      }
    }])
  }
})(window.angular)
