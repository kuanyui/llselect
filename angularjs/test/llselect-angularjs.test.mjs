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
  assert.ok(arrows[2].querySelector('svg'), 'no ll-arrow must default to the chevron')
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
      llselectConfigProvider.defaults({ arrow: 'chevron', filterable: true })
    }],
  })
  const arrows = a.$$('.llselect-trigger-arrow')
  assert.ok(arrows[0].querySelector('svg'), 'the default arrow did not reach an element with no ll-arrow')
  assert.ok(arrows[1].querySelector('svg'), 'the per-element arrow did not render')
  // filterable: true from config means a filter input is built and shown.
  a.$('.llselect-trigger').click()
  assert.equal(a.$('.llselect-popup input').hasAttribute('hidden'), false, 'config filterable did not reach the widget')
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

test('arrow defaults to the chevron; ll-arrow="none" leaves the slot empty', () => {
  const a = app()
  assert.ok(a.$('[name=fruit] .llselect-trigger-arrow svg'), 'default chevron missing')
  const b = boot({
    deps: ['llselect'],
    html: `
      <div ng-controller="C as vm">
        <llselect-single ng-model="vm.fruit" ll-arrow="none"
          ll-options="f for f in vm.fruits"></llselect-single>
      </div>`,
    controller: function () { this.fruits = ['a']; this.fruit = null },
  })
  assert.equal(b.$('.llselect-trigger-arrow svg'), null)
})

test('multiple defaults to checkbox rows, live state; ll-checkboxes="false" opts out; select-all matches', () => {
  const a = app()
  a.$('[name=tops] .llselect-trigger').click()
  const items = a.$$('[name=tops] .llselect-item')
  assert.ok(items.length > 0 && items[0].querySelector('svg'), 'default checkbox missing')
  const before = items[0].innerHTML
  items[0].click()
  const after = a.$$('[name=tops] .llselect-item')[0].innerHTML
  assert.notEqual(after, before, 'checkbox did not re-render as checked')

  const b = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-multiple ng-model="vm.t" ll-checkboxes="false" ll-select-all-row="true"
        ll-options="f for f in vm.fruits"></llselect-multiple>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice(); this.t = [] },
  })
  b.$('.llselect-trigger').click()
  assert.equal(b.$('.llselect-item svg'), null, 'opt-out still rendered checkboxes')
  assert.equal(b.$('.llselect-select-all-row svg'), null, 'opt-out must also strip the select-all icon')

  const c = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-multiple ng-model="vm.t" ll-select-all-row="true"
        ll-options="f for f in vm.fruits"></llselect-multiple>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice(); this.t = [] },
  })
  c.$('.llselect-trigger').click()
  assert.ok(c.$('.llselect-select-all-row svg'), 'select-all tri-state icon missing')
})

function customRowApp(markup) {
  return boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">${markup}</div>`,
    // This module's scope has no `document` global - build DOM via the page's.
    controller: function ($document) {
      const doc = $document[0]
      this.fruits = FRUITS.slice()
      this.fruit = null
      this.t = []
      this.renderRow = function (fruit) {
        if (fruit === 'Banana') { return null } // exercise the per-item fallback
        const el = doc.createElement('em')
        el.className = 'custom-row'
        el.textContent = '* ' + fruit
        return el
      }
    },
  })
}

test('ll-item-content-fn renders custom row content; aria-label stays the label clause', () => {
  const a = customRowApp(`<llselect-single ng-model="vm.fruit" ll-item-content-fn="vm.renderRow"
    ll-options="f for f in vm.fruits"></llselect-single>`)
  a.$('.llselect-trigger').click()
  const items = a.$$('.llselect-item')
  assert.ok(items[0].querySelector('em.custom-row'), 'custom element missing from the row')
  // The accessible name must stay owned by the ll-options label clause, not the DOM.
  assert.equal(items[0].getAttribute('aria-label'), 'Apple')
  assert.equal(items[1].querySelector('em.custom-row'), null, 'null must fall back to plain text')
  assert.equal(items[1].textContent, 'Banana')
})

test('multiple: ll-item-content-fn composes with default checkboxes; ll-checkboxes="false" hands it the whole row', () => {
  const a = customRowApp(`<llselect-multiple ng-model="vm.t" ll-item-content-fn="vm.renderRow"
    ll-options="f for f in vm.fruits"></llselect-multiple>`)
  a.$('.llselect-trigger').click()
  const item = a.$('.llselect-item')
  assert.ok(item.querySelector('svg'), 'checkbox missing beside custom content')
  assert.ok(item.querySelector('em.custom-row'), 'custom content missing beside checkbox')

  const b = customRowApp(`<llselect-multiple ng-model="vm.t" ll-checkboxes="false" ll-item-content-fn="vm.renderRow"
    ll-options="f for f in vm.fruits"></llselect-multiple>`)
  b.$('.llselect-trigger').click()
  assert.equal(b.$('.llselect-item svg'), null, 'opted-out checkbox still rendered')
  assert.ok(b.$('.llselect-item em.custom-row'), 'custom content missing after checkbox opt-out')
})

test('ng-change rides the standard ngModel pipeline: real interaction only', () => {
  // Pins the documented contract (API.md ng-change): the write-back gate keeps
  // programmatic writes and data reloads out of the $setViewValue path, which
  // is the only place $viewChangeListeners (= ng-change) fire.
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.fruit" ng-change="vm.changed = vm.changed + 1"
        ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function () {
      this.fruits = FRUITS.slice()
      this.fruit = null
      this.changed = 0
    },
  })
  assert.equal(a.scope.vm.changed, 0, 'must not fire on boot')
  a.$('.llselect-trigger').click()
  a.$$('.llselect-item')[0].click()
  assert.equal(a.scope.vm.changed, 1, 'must fire once on a real choice')
  a.scope.$apply(() => { a.scope.vm.fruit = 'Banana' })
  assert.equal(a.scope.vm.changed, 1, 'must not fire on a programmatic model write')
  a.scope.$apply(() => { a.scope.vm.fruits = ['Cherry'] })
  assert.equal(a.scope.vm.changed, 1, 'must not fire when a data reload drops the chosen item')
})

test('ll-trigger-content-fn renders the trigger; null falls back to the default rendering', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.fruit" ll-trigger-content-fn="vm.renderTrigger"
        ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function ($document) {
      const doc = $document[0]
      this.fruits = FRUITS.slice()
      this.fruit = 'Cherry'
      this.renderTrigger = function (ctx) {
        if (!ctx.chosenItem) { return null } // fall back to the placeholder
        const el = doc.createElement('b')
        el.className = 'custom-trigger'
        el.textContent = '>> ' + ctx.chosenItem
        return el
      }
    },
  })
  assert.equal(a.text('.llselect-trigger b.custom-trigger'), '>> Cherry')
  a.scope.$apply(() => { a.scope.vm.fruit = null })
  assert.equal(a.$('.llselect-trigger b.custom-trigger'), null, 'null must fall back to the default rendering')
})

test('multiple tags: ll-tag-content-fn fills the chip; ll-tag-remove-button-content-fn swaps the x icon', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-multiple ng-model="vm.t" ll-trigger-display="'tags'"
        ll-tag-content-fn="vm.renderTag" ll-tag-remove-button-content-fn="vm.renderX"
        ll-options="f for f in vm.fruits"></llselect-multiple>
    </div>`,
    controller: function ($document) {
      const doc = $document[0]
      this.fruits = FRUITS.slice()
      this.t = ['Apple']
      this.renderTag = function (fruit) {
        const el = doc.createElement('em')
        el.className = 'custom-tag'
        el.textContent = fruit
        return el
      }
      this.renderX = function () {
        const el = doc.createElement('i')
        el.className = 'custom-x'
        return el
      }
    },
  })
  assert.ok(a.$('.llselect-tag em.custom-tag'), 'custom tag chip content missing')
  assert.ok(a.$('.llselect-tag-remove-button i.custom-x'), 'custom remove icon missing')
})

test('an app policy directive reaches the instance via require and stays safe on native controls', () => {
  // Pins the documented own-disabled example (API.md): named object require
  // (angular.js getControllers, isObject branch), the ?-optional guard for
  // non-llselect elements, and instance().setDisabled() on the real widget.
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single own-disabled ng-model="vm.fruit" ll-options="f for f in vm.fruits"></llselect-single>
      <llselect-multiple own-disabled ng-model="vm.t" ll-options="f for f in vm.fruits"></llselect-multiple>
      <input own-disabled type="text">
    </div>`,
    controller: function () { this.fruits = FRUITS.slice(); this.fruit = null; this.t = []; this.canEdit = true },
    config: ['$compileProvider', function ($compileProvider) {
      $compileProvider.directive('ownDisabled', [function () {
        return {
          restrict: 'A',
          require: { single: '?llselectSingle', multiple: '?llselectMultiple' },
          link: function (scope, element, attrs, ctrls) {
            const api = ctrls.single || ctrls.multiple
            scope.$watch('vm.canEdit', function (ok) {
              if (api) { api.instance().setDisabled(!ok) } else { element.prop('disabled', !ok) }
            })
          },
        }
      }])
    }],
  })
  assert.deepEqual(a.errors, [])
  a.scope.$apply(() => { a.scope.vm.canEdit = false })
  const triggers = a.$$('.llselect-trigger')
  assert.equal(triggers[0].getAttribute('data-disabled'), 'true', 'single not disabled through instance()')
  assert.equal(triggers[1].getAttribute('data-disabled'), 'true', 'multiple not disabled through instance()')
  assert.equal(a.$('input[own-disabled]').disabled, true, 'native input branch broken')
  a.scope.$apply(() => { a.scope.vm.canEdit = true })
  assert.equal(a.$$('.llselect-trigger')[0].getAttribute('data-disabled'), 'false', 'must re-enable')
})

test('a non-function ll-item-content-fn is reported and no widget is left behind', () => {
  const a = app()
  const el = a.compile('<llselect-single ng-model="x" ll-item-content-fn="\'nope\'" ll-options="f for f in vm.fruits"></llselect-single>')
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0].message, /ll-item-content-fn must evaluate to a function/)
  assert.equal(el[0].querySelector('.llselect-trigger'), null)
})

test('ll-label-el: the label element names the field and click focuses the trigger', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <label id="lbl-fruit">Fruit</label>
      <llselect-single ng-model="vm.fruit" ll-label-el="lbl-fruit"
        ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice(); this.fruit = null },
  })
  assert.deepEqual(a.errors, [])
  const trigger = a.$('.llselect-trigger')
  assert.ok((trigger.getAttribute('aria-labelledby') || '').split(/\s+/).includes('lbl-fruit'), 'label id missing from aria-labelledby')
  a.$('#lbl-fruit').click()
  assert.equal(a.doc.activeElement, trigger, 'label click must focus the trigger')
})

test('ll-label-el with an unknown id is reported and no widget is left behind', () => {
  const a = boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.fruit" ll-label-el="nope"
        ll-options="f for f in vm.fruits"></llselect-single>
    </div>`,
    controller: function () { this.fruits = FRUITS.slice() },
  })
  assert.equal(a.errors.length, 1)
  assert.match(a.errors[0].message, /ll-label-el: no element with id "nope"/)
  assert.equal(a.$('.llselect-trigger'), null)
})
