import test from 'node:test'
import assert from 'node:assert/strict'
import { boot } from './harness.mjs'

const FRUITS = ['Apple', 'Banana', 'Cherry']
const USERS = [
  { id: 1, name: 'Alice', role: 'admin', bad: false },
  { id: 2, name: 'Bob', role: 'user', bad: true },
  { id: 3, name: 'Carol', role: 'user', bad: false },
]

function app() {
  return boot({
    deps: ['llselect'],
    html: `
      <div ng-controller="C as vm">
        <form name="f" novalidate>
          <llselect-single name="fruit" ng-model="vm.fruit" required
            ll-options="f for f in vm.fruits"></llselect-single>
          <llselect-multiple name="tops" ng-model="vm.tops" required
            ll-options="f for f in vm.fruits"></llselect-multiple>
          <llselect-single name="user" ng-model="vm.userId"
            ll-options="u.id as u.name group by u.role disable when u.bad for u in vm.users track by u.id"></llselect-single>
        </form>
      </div>`,
    controller: function () {
      this.fruits = FRUITS.slice()
      this.users = USERS
      this.fruit = 'Cherry'
      this.tops = []
      this.userId = 3
    },
  })
}

test('builds a trigger and shows the preset model value', () => {
  const a = app()
  assert.ok(a.$('llselect-single .llselect-trigger'), 'no trigger built')
  assert.equal(a.text('[name=fruit] .llselect-trigger-content'), 'Cherry')
})

test('name is read off this element, so form.$valid works with no native select', () => {
  const a = app()
  assert.ok(a.scope.f.fruit, 'myForm.fruit is not registered')
  assert.equal(a.scope.f.fruit.$valid, true)

  a.scope.$apply(() => { a.scope.vm.fruit = null })
  assert.equal(a.scope.f.fruit.$error.required, true)
})

test('multiple overrides $isEmpty, so required fails on an empty selection', () => {
  // Without the override [] is not $isEmpty, and required silently passes.
  const a = app()
  assert.equal(a.scope.f.tops.$error.required, true)
  assert.equal(a.scope.f.$valid, false)
})

test('select as: the model holds the projection, the trigger shows the label', () => {
  const a = app()
  assert.equal(a.text('[name=user] .llselect-trigger-content'), 'Carol')
  assert.equal(a.scope.vm.userId, 3)
})

test('group by and disable when reach llselect', () => {
  const a = app()
  a.$('[name=user] .llselect-trigger').click()
  assert.equal(a.$$('[name=user] .llselect-group').length, 2, 'expected admin + user groups')
  assert.equal(a.$$('[name=user] .llselect-item-disabled').length, 1, 'expected Bob disabled')
})

test('write-back gate: reloading items neither dirties the form nor rewrites the model', () => {
  // llselect's setItems drops a chosen item that is gone from the new list and
  // fires onChange for it. Written back, that marks the form $dirty and nulls
  // the model for a field the user never touched.
  const a = app()
  a.scope.$apply(() => { a.scope.vm.fruit = 'Apple' })
  a.scope.f.$setPristine()

  a.scope.$apply(() => { a.scope.vm.fruits = ['Banana', 'Cherry'] })  // drops Apple

  assert.equal(a.scope.f.$dirty, false, 'a data reload is not a user edit')
  assert.equal(a.scope.vm.fruit, 'Apple', 'the model must keep its value (ngOptions semantic)')
})

test('write-back gate does not suppress real interaction', () => {
  const a = app()
  a.scope.f.$setPristine()
  a.$('[name=fruit] .llselect-trigger').click()
  const item = a.$('[name=fruit] .llselect-item')
  assert.ok(item, 'no item rendered after open')
  item.click()
  assert.equal(a.scope.f.$dirty, true, 'a real click must mark the form dirty')
})

test('ll-disabled maps to setDisabled()', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.x" ll-disabled="vm.locked"
        ll-options="f for f in vm.fruits"></llselect-single></div>`,
    controller: function () { this.fruits = FRUITS.slice(); this.locked = false },
  })
  // llselect writes data-disabled="false" when enabled (it does not omit it),
  // and only adds aria-disabled once actually disabled.
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'false')
  assert.equal(a.$('.llselect-trigger').getAttribute('aria-disabled'), null)
  a.scope.$apply(() => { a.scope.vm.locked = true })
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'true')
  assert.equal(a.$('.llselect-trigger').getAttribute('aria-disabled'), 'true')
})

test('an unparseable ll-options is reported, and no widget is left behind', () => {
  // A directive's throw NEVER reaches the caller: $compile's invokeLinkFn wraps
  // every link fn in its own try/catch and hands the error to $exceptionHandler
  // (angular.js:11374). So the observable contract is "reported, and nothing
  // rendered" - not "throws". Every AngularJS directive works this way,
  // ui-select included.
  const a = app()
  const el = a.compile('<llselect-single ng-model="x" ll-options="totally bogus"></llselect-single>')
  assert.equal(a.errors.length, 1, 'nothing was reported to $exceptionHandler')
  assert.match(a.errors[0].message, /cannot parse ll-options/)
  assert.equal(el[0].querySelector('.llselect-trigger'), null, 'a half-built widget was left behind')
})

test('(key, value) in object is refused explicitly, not silently mishandled', () => {
  const a = app()
  a.compile('<llselect-single ng-model="x" ll-options="v for (k, v) in obj"></llselect-single>')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0].message, /not supported/)
})

test('a valid app reports nothing to $exceptionHandler', () => {
  // Guards the checks above: they only mean something if the fixture is silent.
  const a = app()
  assert.deepEqual(a.errors, [])
})

test('ll-arrow renders a built-in arrow, and a fresh one per trigger', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.a" ll-arrow="chevron" ll-options="f for f in vm.fruits"></llselect-single>
      <llselect-single ng-model="vm.b" ll-arrow="triangle" ll-options="f for f in vm.fruits"></llselect-single>
      <llselect-single ng-model="vm.c" ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice() },
  })
  const arrows = a.$$('.llselect-trigger-arrow')
  assert.equal(arrows.length, 3)
  // One SVG cannot live in two triggers, so each render must build its own.
  assert.ok(arrows[0].querySelector('svg'), 'chevron did not render')
  assert.ok(arrows[1].querySelector('svg'), 'triangle did not render')
  assert.equal(arrows[2].querySelector('svg'), null, 'no ll-arrow must leave the slot to the theme')
})

test('an unknown ll-arrow is reported and names the built-ins', () => {
  const a = app()
  a.compile('<llselect-single ng-model="x" ll-arrow="sparkle" ll-options="f for f in vm.fruits"></llselect-single>')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0].message, /unknown arrow "sparkle".*chevron, triangle/)
})

test('llselectConfigProvider sets app-wide defaults, and ll-* attributes win', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.a" ll-options="f for f in vm.fruits"></llselect-single>
      <llselect-single ng-model="vm.b" ll-arrow="triangle" ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice() },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ arrow: 'chevron', searchable: true })
    }],
  })
  const arrows = a.$$('.llselect-trigger-arrow')
  assert.ok(arrows[0].querySelector('svg'), 'the default arrow did not reach an element with no ll-arrow')
  assert.ok(arrows[1].querySelector('svg'), 'the per-element arrow did not render')
  // searchable: true from config means a search input is built and shown.
  a.$('.llselect-trigger').click()
  assert.equal(a.$('.llselect-popup input').hasAttribute('hidden'), false, 'config searchable did not reach the widget')
})

test('llselectConfigProvider.defaults rejects an unknown key instead of ignoring it', () => {
  assert.throws(() => boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm"></div>`,
    controller: function () {},
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ plcaeholder: 'typo' })
    }],
  }), /unknown key\(s\): plcaeholder/)
})

test('config uiTranslationPack reaches the widget (the case that makes a provider worth having)', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.a" ll-options="f for f in vm.fruits"></llselect-single></div>`,
    controller: function () { this.fruits = FRUITS.slice() },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ uiTranslationPack: { triggerPlaceholder: 'Bitte auswaehlen' } })
    }],
  })
  assert.equal(a.text('.llselect-trigger-content'), 'Bitte auswaehlen')
})
