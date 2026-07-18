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

  var LANGUAGES = [
    { name: 'JavaScript' }, { name: 'TypeScript' }, { name: 'Python' },
    { name: 'Rust' }, { name: 'Go' }, { name: 'Ruby' }, { name: 'Java' },
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
      vm.fruit = 'Cherry'
      vm.toppings = []
      vm.userId = 3
      vm.person = undefined
      vm.people = []
      vm.locked = false
      vm.avFruit = undefined
      vm.country3 = undefined

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
