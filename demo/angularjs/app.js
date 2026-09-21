/* Demo app for demo/angularjs/index.html. Demo-only; not part of the library. */
;(function (angular) {
  'use strict'

  var COUNTRIES = [
    'Argentina', 'Australia', 'Austria', 'Brazil', 'Canada', 'Chile', 'China',
    'Denmark', 'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'India',
    'Indonesia', 'Ireland', 'Italy', 'Japan', 'Kenya', 'Mexico', 'Nepal',
    'Netherlands', 'Norway', 'Peru', 'Poland', 'Portugal', 'Singapore',
    'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Taiwan', 'Thailand',
    'Turkey', 'Ukraine', 'United Kingdom', 'United States', 'Vietnam',
  ]

  var FRUITS = ['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry', 'Fig', 'Grape']

  // Pre-sorted by role: llselect groups contiguous runs, it does not reorder.
  var USERS = [
    { id: 1, name: 'Alice Anderson', role: 'admin', suspended: false },
    { id: 2, name: 'Bob Brown', role: 'admin', suspended: true },
    { id: 3, name: 'Carol Chen', role: 'user', suspended: false },
    { id: 4, name: 'David Davis', role: 'user', suspended: false },
    { id: 5, name: 'Eve Evans', role: 'user', suspended: true },
    { id: 6, name: 'Frank Foster', role: 'guest', suspended: false },
    { id: 7, name: 'Grace Garcia', role: 'guest', suspended: false },
  ]

  // Hue (0-360) of a '#rrggbb' color; feeds example 8e's tints.
  function hexToHue(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255
    var g = parseInt(hex.slice(3, 5), 16) / 255
    var b = parseInt(hex.slice(5, 7), 16) / 255
    var max = Math.max(r, g, b)
    var d = max - Math.min(r, g, b)
    if (d === 0) { return 0 }
    var h
    if (max === r) {
      h = ((g - b) / d) % 6
    } else if (max === g) {
      h = (b - r) / d + 2
    } else {
      h = (r - g) / d + 4
    }
    return Math.round(h * 60 + 360) % 360
  }

  // 8e: near-white translucent tint of a language's icon color.
  function langTint(lang) {
    return 'hsl(' + hexToHue(lang.color) + ' 85% 55% / 0.14)'
  }

  // 8e: darkened same-hue counterpart - row / trigger text, trigger border.
  function langShade(lang) {
    return 'hsl(' + hexToHue(lang.color) + ' 75% 32%)'
  }

  // 11 / 1e: the custom-filter case - the item text is derived, and search
  // must match forms no raw field contains (e.g. the space-less "vlan2").
  var INTERFACES = [
    { interfaceType: 'vlan', interfaceNo: '2' },
    { interfaceType: 'vlan', interfaceNo: '10' },
    { interfaceType: 'eth', interfaceNo: '0' },
    { interfaceType: 'eth', interfaceNo: '1' },
    { interfaceType: 'lo', interfaceNo: '0' },
  ]

  // Space-less, case-less normal form shared by both filter flavors.
  function normIface(s) {
    return String(s).toLowerCase().replace(/\s+/g, '')
  }

  // icon/color drive example 7's custom rows (same data shape as the core
  // demo's PROGRAMMING_LANGUAGES); the other examples read only .name.
  var LANGUAGES = [
    { name: 'JavaScript', icon: 'language-javascript', color: '#f7df1e' },
    { name: 'TypeScript', icon: 'language-typescript', color: '#3178c6' },
    { name: 'Python', icon: 'language-python', color: '#3776ab' },
    { name: 'Rust', icon: 'language-rust', color: '#ce412b' },
    { name: 'Go', icon: 'language-go', color: '#00add8' },
    { name: 'Ruby', icon: 'language-ruby', color: '#cc342d' },
    { name: 'Java', icon: 'language-java', color: '#e76f00' },
  ]

  /**
   * 14: the runtime language switch from API.md ("Switching the UI language
   * at runtime"), verbatim. Registered under each existing directive name, so
   * it decorates every <llselect-single> / <llselect-multiple> / <ui-llselect>
   * on the page: the $watch re-packs the live widget through instance() on
   * every language change, and an unmapped key ('en') restores the English
   * defaults with {}.
   */
  function i18nPackSync(ctrlName) {
    return ['$translate', 'LLSELECT_I18N_PACKS', function ($translate, PACKS) {
      return {
        restrict: 'E',
        require: ctrlName,
        link: function (scope, element, attrs, ctrl) {
          scope.$watch(function () { return $translate.use() }, function (langKey) {
            if (langKey) { ctrl.instance().setUiTranslationPack(PACKS[langKey] || {}) }
          })
        },
      }
    }]
  }

  angular.module('demo', ['llselect', 'llselect.uiCompat', 'ngSanitize', 'ui.bootstrap', 'ghiscoding.validation'])

    // The house style, set once. Per-element ll-* attributes still win.
    .config(['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ arrow: 'chevron' })
    }])

    // 14: the packs come from dist/i18n.umd.js (the llselectI18n global).
    .constant('LLSELECT_I18N_PACKS', { 'zh-TW': window.llselectI18n.zhTW, ja: window.llselectI18n.ja })
    .directive('llselectSingle', i18nPackSync('llselectSingle'))
    .directive('llselectMultiple', i18nPackSync('llselectMultiple'))
    .directive('uiLlselect', i18nPackSync('uiLlselect'))

    // ghiscoding/angular-validation hard-depends on angular-translate and reads
    // its messages through it; without this its validators still run but every
    // message is "Could not translate: 'INVALID_REQUIRED'".
    .config(['$translateProvider', function ($translateProvider) {
      $translateProvider.useStaticFilesLoader({
        prefix: 'https://cdn.jsdelivr.net/npm/angular-validation-ghiscoding@1.5.28/locales/validation/',
        suffix: '.json',
      })
      $translateProvider.preferredLanguage('en')
      $translateProvider.useSanitizeValueStrategy(null)
      // 14: the loader above only has angular-validation's locales (no ja /
      // zh-TW), and a failed load never switches the language. An empty table
      // per demo language makes $translate.use() switch at once; the fallback
      // keeps 9's validation messages resolving from en.
      $translateProvider.translations('ja', {})
      $translateProvider.translations('zh-TW', {})
      $translateProvider.fallbackLanguage('en')
    }])

    /**
     * ui-select ships a `highlight` filter and its templates use it everywhere.
     * It is ui-select's, not llselect's, so the bridge does not provide it -
     * copied here (8 lines, from ui-select src/common.js, MIT) so the demo's
     * ui-select-shaped templates work without loading ui-select itself.
     */
    .filter('highlight', function () {
      function escapeRegexp(queryToEscape) {
        return ('' + queryToEscape).replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')
      }
      return function (matchItem, query) {
        return query && matchItem
          ? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), '<span class="ui-select-highlight">$&</span>')
          : matchItem
      }
    })

    // 1e, ui-select style: the repeat's filter chain is the custom filter.
    .filter('ifaceMatch', function () {
      return function (items, query) {
        if (!query) { return items }
        return (items || []).filter(function (i) {
          return normIface(i.interfaceType + ' ' + i.interfaceNo).includes(normIface(query))
        })
      }
    })

    /**
     * 8e's whole-trigger tint: an app policy directive. ll-* attributes cover
     * CONTENT; styling the library-built trigger element is app territory,
     * so this requires the published controller and drives the core public
     * API (API.md "Reaching
     * the instance from your own directive"). instance() is late-bound -
     * safe inside $watch, never in a controller constructor.
     */
    .directive('demoTintTrigger', function () {
      return {
        restrict: 'A',
        require: 'llselectSingle',
        link: function (scope, element, attrs, api) {
          scope.$watch(attrs.demoTintTrigger, function (lang) {
            var t = api.instance().triggerEl
            t.style.background = lang ? langTint(lang) : ''
            t.style.borderColor = lang ? langShade(lang) : ''
            t.style.color = lang ? langShade(lang) : ''
          })
        },
      }
    })

    /**
     * 8c: publishes the llselect directive controller into the scope slot
     * named by the attribute value, so a plain controller fn (here an
     * ll-item-content-fn) can call instance().getFilterQuery() late. The
     * controller exists before any row renders; instance() stays late-bound.
     */
    .directive('demoPublishApi', ['$parse', function ($parse) {
      return {
        restrict: 'A',
        require: ['?llselectSingle', '?llselectMultiple'],
        link: function (scope, element, attrs, ctrls) {
          $parse(attrs.demoPublishApi).assign(scope, ctrls[0] || ctrls[1])
        },
      }
    }])

    .controller('DemoCtrl', ['$scope', '$translate', function ($scope, $translate) {
      var vm = this

      vm.countries = COUNTRIES
      vm.countries2 = COUNTRIES
      vm.fruits = FRUITS.slice()
      vm.users = USERS
      vm.languages = LANGUAGES

      vm.country = undefined
      vm.country2 = 'Japan'
      vm.langs = []
      vm.langsHidden = [] // 3d
      vm.langsCount = []
      vm.langsAll = []
      vm.fruit = 'Cherry'
      vm.toppings = []
      vm.userId = 3
      vm.person = undefined
      vm.person2 = USERS[2] // preset so allow-clear's x is visible on load
      vm.person3 = undefined // 1d, bare text template
      vm.person4 = undefined // 1d, no template
      vm.person5 = undefined // 1f, ng-disabled + tooltip
      vm.quotaLocked = true // 1f starts disabled so the tooltip point shows
      vm.people = []
      vm.peopleHide = [] // 1g
      vm.peopleKeep = [] // 1g
      vm.locked = false
      vm.avFruit = undefined
      vm.country3 = undefined
      vm.lang = undefined
      vm.uiLang = 'en' // 14: $translate.use() is what the recipe watches; this is only the <select>'s model
      vm.setUiLang = function () { $translate.use(vm.uiLang) }
      vm.countryI18n = undefined // 14
      vm.langsI18n = [] // 14
      vm.personI18n = undefined // 14
      vm.langsRich = []
      vm.langsTags = []
      vm.user2 = undefined
      vm.userApi = null // 8c, set by demo-publish-api
      vm.hlCountry = undefined // 8f
      vm.langTinted = undefined
      vm.labelFruit = undefined
      vm.interfaces = INTERFACES
      vm.iface = undefined // 11, ll-filter-fn
      vm.iface2 = undefined // 1e, filter chain
      /**
       * 12a: tags in the trigger; the count, the match count and a Clear all
       * button in the header. The fn runs once at link and the node is ours:
       * ng-change rewrites the count, ll-on-open and ll-on-filter-query-change
       * the match count. The button reaches the widget through instance()
       * (demo-publish-api), so its click is the user-change path.
       */
      vm.countriesHeader = ['Japan', 'Taiwan']
      vm.headerCountApi = null // set by demo-publish-api
      var headerCountEl = document.createElement('span')
      var headerMatchesEl = document.createElement('span')
      var headerClearButton = document.createElement('button')
      headerClearButton.type = 'button'
      headerClearButton.className = 'popup-link-button push-right'
      headerClearButton.textContent = 'Clear all'
      headerClearButton.addEventListener('click', function () {
        if (vm.countriesHeader.length === 0) { return } // aria-disabled, not native disabled: stays perceivable
        vm.headerCountApi.instance().setChosenItems([])
      })
      vm.headerCountEl = function (ctx) {
        var header = document.createElement('div')
        header.className = 'popup-header-row'
        headerCountEl.textContent = ctx.uiTranslationPack.triggerCountSummary(vm.countriesHeader.length, COUNTRIES.length)
        headerClearButton.setAttribute('aria-disabled', String(vm.countriesHeader.length === 0))
        header.append(headerCountEl, headerMatchesEl, headerClearButton)
        return header
      }
      vm.writeHeaderCount = function () {
        var sel = vm.headerCountApi.instance()
        headerCountEl.textContent = sel.getUiTranslationPack().triggerCountSummary(vm.countriesHeader.length, sel.getItems().length)
        headerClearButton.setAttribute('aria-disabled', String(vm.countriesHeader.length === 0))
      }
      vm.writeHeaderMatches = function () {
        var sel = vm.headerCountApi.instance()
        headerMatchesEl.textContent = ', ' + sel.getVisibleItems().length + ' of ' + sel.getItems().length + ' shown'
      }

      /** 12b: column headings. The header repeats the row layout (.user-row) in bold; rows re-render per keystroke, the header never does. */
      vm.userColumns = undefined
      vm.renderUserColumns = function (u) {
        var row = document.createElement('span')
        row.className = 'user-row'
        var name = document.createElement('span')
        name.textContent = u.name
        var role = document.createElement('small')
        role.className = 'hint'
        role.textContent = u.role
        row.append(name, role)
        return row
      }
      vm.userColumnsHeaderEl = function () {
        var head = document.createElement('span')
        head.className = 'user-row'
        var name = document.createElement('strong')
        name.textContent = 'Name'
        var role = document.createElement('strong')
        role.className = 'hint'
        role.textContent = 'Role'
        head.append(name, role)
        return head
      }

      /** 12c: a pinned footer link. The click keeps DOM focus on the combobox; the app closes and navigates (here: a note on the scope, applied from the native listener). */
      vm.countriesFooterLink = []
      vm.footerLinkApi = null // set by demo-publish-api
      vm.footerNote = '(nothing happened yet)'
      vm.footerLinkEl = function () {
        var link = document.createElement('a')
        link.href = '#countries'
        link.textContent = 'Manage countries...'
        link.addEventListener('click', function (ev) {
          ev.preventDefault() // a real app would navigate
          vm.footerLinkApi.instance().close()
          $scope.$applyAsync(function () { vm.footerNote = 'navigated to /countries (demo)' })
        })
        return link
      }

      /**
       * 12d: the 13a commands as pinned header rows. Each is a real <button>
       * wearing the theme's item class from ctx.classIdMap, so every theme
       * paints it like a list row; the demo CSS (.popup-header-commands)
       * zeroes the header padding and resets the button chrome. The counting
       * text is the pack's own chooseAllRowText.
       */
      var HEADER_DEFAULTS = ['Japan', 'Taiwan']
      vm.countriesCommands = HEADER_DEFAULTS.slice()
      vm.headerCommandsApi = null // set by demo-publish-api
      var headerSelectAllRow = document.createElement('button')
      headerSelectAllRow.type = 'button'
      var headerRestoreRow = document.createElement('button')
      headerRestoreRow.type = 'button'
      headerRestoreRow.textContent = 'Restore defaults'
      headerSelectAllRow.addEventListener('click', function () {
        var sel = vm.headerCommandsApi.instance()
        if (sel.getChosenItems().length === sel.getItems().length) {
          sel.unchooseAll()
        } else {
          sel.chooseAll() // the whole list; the built-in row acts on the visible subset instead
        }
      })
      headerRestoreRow.addEventListener('click', function () {
        if (headerRestoreRow.getAttribute('aria-disabled') === 'true') { return }
        vm.headerCommandsApi.instance().setChosenItems(HEADER_DEFAULTS)
      })
      function isHeaderDefault() {
        return vm.countriesCommands.length === HEADER_DEFAULTS.length && HEADER_DEFAULTS.every(function (c) { return vm.countriesCommands.indexOf(c) !== -1 })
      }
      vm.headerCommandsEl = function (ctx) {
        var rows = [headerSelectAllRow, headerRestoreRow]
        rows.forEach(function (row) { row.className = 'popup-row-button ' + ctx.classIdMap.itemClass })
        headerSelectAllRow.textContent = ctx.uiTranslationPack.chooseAllRowText(vm.countriesCommands.length, COUNTRIES.length)
        headerRestoreRow.setAttribute('aria-disabled', 'true') // starts at the defaults
        headerRestoreRow.classList.add(ctx.classIdMap.itemDisabledClass)
        var header = document.createElement('div')
        header.append(headerSelectAllRow, headerRestoreRow)
        return header
      }
      vm.writeHeaderCommands = function () {
        var sel = vm.headerCommandsApi.instance()
        headerSelectAllRow.textContent = sel.getUiTranslationPack().chooseAllRowText(vm.countriesCommands.length, sel.getItems().length)
        headerRestoreRow.setAttribute('aria-disabled', String(isHeaderDefault()))
        headerRestoreRow.classList.toggle(sel.classIdMap.itemDisabledClass, isHeaderDefault())
      }

      /**
       * 13: action rows are plain objects. The directive hands onActivate the
       * widget instance: calling it is the user-change path (ng-model +
       * ng-change, like a click); a plain model write would stay programmatic.
       * textFn / disabledFn run again after every change and read the live model.
       */
      var ROW_DEFAULTS = ['Japan', 'Taiwan']
      function isDefaultChoice(chosen) {
        return chosen.length === ROW_DEFAULTS.length && ROW_DEFAULTS.every(function (c) { return chosen.indexOf(c) !== -1 })
      }
      /** 13a: Restore defaults above the items (after the choose-all row), Clear all below. */
      vm.countriesRows = ROW_DEFAULTS.slice()
      vm.countriesRowsChanges = 0
      vm.countryRowsBefore = [
        {
          textFn: function () { return 'Restore defaults' },
          disabledFn: function () { return isDefaultChoice(vm.countriesRows) },
          onActivate: function (sel) { sel.setChosenItems(ROW_DEFAULTS) },
        },
      ]
      vm.countryRowsAfter = [
        {
          textFn: function () { return 'Clear all (' + vm.countriesRows.length + ')' },
          disabledFn: function () { return vm.countriesRows.length === 0 },
          onActivate: function (sel) { sel.setChosenItems([]) },
        },
      ]
      /**
       * 13b: one leading row on a single. It asks for a name, adds it to the
       * array behind ll-options ($watchCollection hands the new list to the
       * widget), writes the model and closes. Items must be unique: an
       * existing name is picked, not added again. The model write is
       * programmatic, so ng-change stays quiet.
       */
      vm.addRowItems = COUNTRIES.slice(0, 5)
      vm.countryAdded = undefined
      vm.addRowsBefore = [
        {
          textFn: function () { return 'Add a country...' },
          onActivate: function (sel) {
            var name = window.prompt('Country name')
            if (!name) { return }
            if (vm.addRowItems.indexOf(name) === -1) { vm.addRowItems = vm.addRowItems.concat([name]) }
            vm.countryAdded = name
            sel.close()
          },
        },
      ]
      /** 13c: a sort toggle as a leading row. It flips the array behind ll-options; the chosen item survives (same string) and a filter query re-applies. textFn reads the flag per render. */
      vm.sortDescending = false
      vm.sortRowItems = COUNTRIES
      vm.countrySorted = undefined
      vm.sortRowsBefore = [
        {
          textFn: function () { return (vm.sortDescending ? 'Sorted Z to A' : 'Sorted A to Z') + ' - click to flip' },
          onActivate: function () {
            vm.sortDescending = !vm.sortDescending
            vm.sortRowItems = vm.sortDescending ? COUNTRIES.slice().reverse() : COUNTRIES
          },
        },
      ]
      /** 13d: 13a's leading rows, pinned. */
      vm.countriesPinned = ROW_DEFAULTS.slice()
      vm.pinnedRowsBefore = [
        {
          textFn: function () { return 'Restore defaults' },
          disabledFn: function () { return isDefaultChoice(vm.countriesPinned) },
          onActivate: function (sel) { sel.setChosenItems(ROW_DEFAULTS) },
        },
      ]

      /** 11 / 1e: the derived item text - "VLAN 2", "ETH 0", ... */
      vm.ifaceText = function (i) {
        if (!i) { return '' }
        return i.interfaceType.toUpperCase() + ' ' + i.interfaceNo
      }

      /** 11: custom match - "vlan2", "VLAN 2" and "2" all hit "VLAN 2". */
      vm.ifaceMatch = function (i, query) {
        return normIface(vm.ifaceText(i)).includes(normIface(query))
      }

      /**
       * 8a. A render-time DOM factory: called by llselect outside any digest,
       * never $compile'd - custom rows with zero per-row scope or watcher.
       * The accessible name stays the item text from ll-options; this only changes
       * the pixels.
       */
      vm.renderLangRow = function (lang) {
        var row = document.createElement('span')
        row.className = 'lang-row'
        var icon = document.createElement('i')
        icon.className = 'mdi mdi-' + lang.icon
        icon.setAttribute('aria-hidden', 'true') // decorative; aria-label covers the name
        icon.style.color = lang.color
        row.append(icon, document.createTextNode(lang.name))
        return row
      }

      /**
       * 8b, template flavor: the same factory with the markup authored in HTML
       * (the <template id="lang-row-tpl"> in examples.html) and cloned per
       * row. Closest feel to a row template - still no scope, no $compile.
       */
      vm.renderLangRowFromTpl = function (lang) {
        var row = document.getElementById('lang-row-tpl').content.firstElementChild.cloneNode(true)
        var icon = row.querySelector('i')
        icon.classList.add('mdi-' + lang.icon)
        icon.style.color = lang.color
        row.querySelector('.lang-name').textContent = lang.name
        return row
      }

      /**
       * 8c, second content pattern: primary text plus a faded secondary hint
       * pushed to the row's right edge (.user-row), with `disable when`
       * dimming suspended users on top.
       */
      vm.renderUserRow = function (u) {
        var row = document.createElement('span')
        row.className = 'user-row'
        // The name highlights the filter match; the faded hint stays plain.
        var name = window.llselect.createHighlightedTextEl(u.name, vm.userApi ? vm.userApi.instance().getFilterQuery() : '')
        var hint = document.createElement('small')
        hint.className = 'hint'
        hint.textContent = u.role + (u.suspended ? ' - suspended' : '')
        row.append(name, hint)
        return row
      }

      /**
       * 8a (8e reuses it), trigger mirror: the same row renderer feeds the
       * trigger, exactly like the core example - there is no auto-projection.
       * null with nothing chosen falls back to the placeholder.
       */
      vm.renderLangTrigger = function (ctx) {
        return ctx.chosenItem ? vm.renderLangRow(ctx.chosenItem) : null
      }

      /** 8d, tag remove icon; unset, the theme's CSS glyph draws the x. */
      vm.renderTagRemoveIcon = function () {
        var i = document.createElement('i')
        i.className = 'mdi mdi-close-circle-outline'
        i.setAttribute('aria-hidden', 'true') // decorative; the button carries the aria-label
        return i
      }

      /**
       * 8e, per-item background, like native <option style="background-color">
       * (a Chromium-only nicety): 8a's row plus a tint of its icon color's
       * hue. hsl alpha keeps the theme's hover / keyboard-focus backgrounds
       * visible through the tint. Everything is inline on the row except
       * one demo CSS line (.lang-tinted, ../style.css) zeroing the option
       * element's own padding - the renderer never gets that element.
       * The chosen row gets llselect's own createCheckmarkSvgEl at
       * its right edge; the ng-model value IS the chosen state, and rows
       * re-render on chosen changes even while the popup is open, so the
       * marker stays fresh. The whole-trigger tint is the demoTintTrigger
       * directive above; the mirrored trigger row reuses renderLangTrigger
       * untinted (two stacked alphas would show as a darker patch).
       */
      vm.renderTintedLangRow = function (lang) {
        var row = vm.renderLangRow(lang)
        // Fill the option element: block-level flex (inline-flex would
        // shrink-wrap) + the spacing the demo CSS removed from the option.
        row.style.display = 'flex'
        row.style.padding = '0.35rem 0.7rem'
        row.style.background = langTint(lang)
        row.style.color = langShade(lang) // the mdi icon keeps its own brand color
        if (vm.langTinted && vm.langTinted.name === lang.name) {
          var check = window.llselect.createCheckmarkSvgEl() // currentColor -> the shade
          check.style.marginInlineStart = 'auto' // push to the row's far edge
          row.appendChild(check)
        }
        return row
      }

      /**
       * Drops the currently chosen fruit from the list, which is the case that
       * used to mark the form $dirty and null the model behind the user's back
       * (llselect's setItems reconciles the selection and fires onChange for
       * the drop). The write-back gate is what keeps $dirty false here.
       */
      vm.reloadFruits = function () {
        vm.fruits = FRUITS.filter(function (f) { return f !== vm.fruit })
      }
    }])
})(window.angular)
