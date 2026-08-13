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

  // Hue (0-360) of a '#rrggbb' color; feeds example 7e's tints.
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

  // 7e: near-white translucent tint of a language's icon color.
  function langTint(lang) {
    return 'hsl(' + hexToHue(lang.color) + ' 85% 55% / 0.14)'
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

  angular.module('demo', ['llselect', 'llselect.uiCompat', 'ngSanitize', 'ghiscoding.validation'])

    // The house style, set once. Per-element ll-* attributes still win.
    .config(['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ arrow: 'chevron' })
    }])

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

    /**
     * 7e's whole-trigger tint: an app policy directive. ll-* attributes cover
     * CONTENT; shell styling per state is app territory, so this requires the
     * published controller and drives the core public API (API.md "Reaching
     * the instance from your own directive"). instance() is late-bound -
     * safe inside $watch, never in a controller constructor.
     */
    .directive('demoTintTrigger', function () {
      return {
        restrict: 'A',
        require: 'llselectSingle',
        link: function (scope, element, attrs, api) {
          scope.$watch(attrs.demoTintTrigger, function (lang) {
            api.instance().triggerEl.style.background = lang ? langTint(lang) : ''
          })
        },
      }
    })

    .controller('DemoCtrl', ['$scope', function ($scope) {
      var vm = this

      vm.countries = COUNTRIES
      vm.countries2 = COUNTRIES
      vm.fruits = FRUITS.slice()
      vm.users = USERS
      vm.languages = LANGUAGES

      vm.country = undefined
      vm.country2 = 'Japan'
      vm.langs = []
      vm.langsCount = []
      vm.langsAll = []
      vm.fruit = 'Cherry'
      vm.toppings = []
      vm.userId = 3
      vm.person = undefined
      vm.person2 = USERS[2] // preset so allow-clear's x is visible on load
      vm.people = []
      vm.locked = false
      vm.avFruit = undefined
      vm.country3 = undefined
      vm.lang = undefined
      vm.langsRich = []
      vm.langsTags = []
      vm.user2 = undefined
      vm.langTinted = undefined

      /**
       * 7a. A render-time DOM factory: called by llselect outside any digest,
       * never $compile'd - custom rows with zero per-row scope or watcher.
       * The accessible name stays the ll-options label; this only changes
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
       * 7b, template flavor: the same factory with the markup authored in HTML
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
       * 7c, second content pattern: primary text plus a faded secondary hint
       * pushed to the row's right edge (.user-row), with `disable when`
       * dimming suspended users on top.
       */
      vm.renderUserRow = function (u) {
        var row = document.createElement('span')
        row.className = 'user-row'
        var name = document.createElement('span')
        name.textContent = u.name
        var hint = document.createElement('small')
        hint.className = 'hint'
        hint.textContent = u.role + (u.suspended ? ' - suspended' : '')
        row.append(name, hint)
        return row
      }

      /**
       * 7a (7e reuses it), trigger mirror: the same row renderer feeds the
       * trigger, exactly like the core example - there is no auto-projection.
       * null with nothing chosen falls back to the placeholder.
       */
      vm.renderLangTrigger = function (ctx) {
        return ctx.chosenItem ? vm.renderLangRow(ctx.chosenItem) : null
      }

      /** 7d, tag remove icon; unset, the theme's CSS glyph draws the x. */
      vm.renderTagRemoveIcon = function () {
        var i = document.createElement('i')
        i.className = 'mdi mdi-close-circle-outline'
        i.setAttribute('aria-hidden', 'true') // decorative; the button carries the aria-label
        return i
      }

      /**
       * 7e, per-item background, like native <option style="background-color">
       * (a Chromium-only nicety): 7a's row plus a tint of its icon color's
       * hue. hsl alpha keeps the theme's hover / keyboard-focus backgrounds
       * visible through the tint. The .lang-tinted CSS (../style.css) moves
       * the item padding onto the row (tint reaches the option's edges) and
       * draws the selected row's checkmark from the shell's aria-selected -
       * no JS, never stale. The whole-trigger tint is the demoTintTrigger
       * directive below; the mirrored trigger row reuses renderLangTrigger
       * untinted (two stacked alphas would show as a darker patch).
       */
      vm.renderTintedLangRow = function (lang) {
        var row = vm.renderLangRow(lang)
        row.style.background = langTint(lang)
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
