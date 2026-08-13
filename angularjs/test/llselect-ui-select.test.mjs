import test from 'node:test'
import assert from 'node:assert/strict'
import { boot } from './harness.mjs'

const USERS = [
  { id: 1, name: 'Alice', role: 'admin', bad: false },
  { id: 2, name: 'Bob', role: 'user', bad: true },
  { id: 3, name: 'Carol', role: 'user', bad: false },
]

function app(extraAttrs = '') {
  return boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <form name="f" novalidate>
          <ui-llselect ng-model="vm.person" name="person" required ${extraAttrs}>
            <ui-select-match placeholder="Pick">{{$select.selected.name}}</ui-select-match>
            <ui-select-choices repeat="p in vm.users | filter: $select.search"
              ll-item-text="p.name" ui-disable-choice="p.bad">
              <span>{{p.name}}</span>
            </ui-select-choices>
          </ui-llselect>
        </form>
      </div>`,
    controller: function () {
      this.users = USERS
      this.person = undefined
    },
  })
}

test('links, builds llselect DOM, and strips its own template slots', () => {
  const a = app()
  assert.ok(a.$('ui-llselect .llselect-trigger'), 'no trigger inside <ui-llselect>')
  assert.equal(a.$('ui-llselect ui-select-choices'), null, '<ui-select-choices> survived into the DOM')
})

test('name + required work here too', () => {
  const a = app()
  assert.ok(a.scope.f.person, 'myForm.person is not registered')
  assert.equal(a.scope.f.person.$error.required, true)
})

test('the transcluded template renders per row', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  const rows = a.$$('ui-llselect .llselect-item')
  assert.equal(rows.length, 3)
  assert.ok(rows[0].textContent.includes('Alice'), `first row was "${rows[0].textContent}"`)
})

test('rows are interpolated BEFORE llselect measures them (no {{ }} flicker)', () => {
  // Regression: $compile alone does not fill bindings - AngularJS does that on
  // the next digest, and a native click never runs one. llselect then measured
  // and positioned the popup against the literal "{{p.name}}" text and resized a
  // tick later. Assert with NO digest in between: that is the whole point, and a
  // check placed after any digest passes even with the fix removed.
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  const texts = a.$$('ui-llselect .llselect-item').map((r) => r.textContent)
  assert.ok(texts.length > 0, 'no rows rendered')
  const raw = texts.filter((t) => t.includes('{{'))
  assert.deepEqual(raw, [], 'rows were still uninterpolated when llselect measured them')
})

test('ui-disable-choice reaches llselect', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$$('ui-llselect .llselect-item-disabled').length, 1, 'expected Bob disabled')
})

test('ll-item-text becomes the option accessible name', () => {
  // ui-select has no item-to-string concept, so llselect has nothing to name the
  // option with unless the markup says. Without ll-item-text an object item would
  // announce as [object Object].
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$('ui-llselect .llselect-item').getAttribute('aria-label'), 'Alice')
})

test('choosing a row writes the model and renders the match template', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-item')[0].click()
  assert.equal(a.scope.vm.person.name, 'Alice')
  assert.equal(a.text('ui-llselect .llselect-trigger-content'), 'Alice')
})

test('ng-model keeps the parent scope (no scope: true shadowing)', () => {
  // ui-select creates a child scope, which silently shadows a non-dotted
  // ng-model: the parent never sees the value. This bridge does not.
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="plain">
          <ui-select-match>{{$select.selected.name}}</ui-select-match>
          <ui-select-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-select-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS },
  })
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-item')[0].click()
  assert.equal(a.scope.plain?.name, 'Alice', 'a non-dotted ng-model was shadowed onto a child scope')
})

test('a repeat expression without ll-item-text still names the option, via String(item)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.s">
          <ui-select-match>{{$select.selected}}</ui-select-match>
          <ui-select-choices repeat="s in vm.strings"><span>{{s}}</span></ui-select-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.strings = ['a', 'b'] },
  })
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$('ui-llselect .llselect-item').getAttribute('aria-label'), 'a')
})

test('a missing <ui-select-choices> is reported, and no widget is left behind', () => {
  const a = app()
  const el = a.compile('<ui-llselect ng-model="x"></ui-llselect>')
  assert.equal(a.errors.length, 1, 'nothing was reported to $exceptionHandler')
  assert.match(a.errors[0].message, /expected one <ui-select-choices/)
  assert.equal(el[0].querySelector('.llselect-trigger'), null, 'a half-built widget was left behind')
})

test('the bridge renders the default chevron arrow', () => {
  const a = app()
  assert.ok(a.$('ui-llselect .llselect-trigger-arrow svg'), 'bridge arrow missing')
})

test('disabled aligns with ui-select: ng-disabled, static literal, and interpolated - all via $observe', () => {
  // ui-select observes the attribute and rides ngDisabled's attr.$set boolean
  // (select.js:1135, "thanks to ng-disabled ... a boolean instead of a
  // string"); the bridge mirrors that mechanism, string quirks included.
  const a = app('ng-disabled="vm.locked"')
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'false')
  a.scope.$apply(() => { a.scope.vm.locked = true })
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'true', 'ng-disabled did not reach setDisabled')
  a.$('.llselect-trigger').click()
  assert.equal(a.$$('.llselect-item').length, 0, 'a disabled bridge widget must not open')
  a.scope.$apply(() => { a.scope.vm.locked = false })
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'false', 'must re-enable')

  // Static literal: real ui-select treats the truthy string as disabled.
  const b = app('disabled="disabled"')
  b.scope.$digest()
  assert.equal(b.$('.llselect-trigger').getAttribute('data-disabled'), 'true', 'static disabled="disabled" must disable, like ui-select')

  // Interpolated: the value arrives as a STRING, so "false" is truthy - the
  // same trap real ui-select has; the bridge is faithful to it on purpose.
  const c = app('disabled="{{vm.locked}}"')
  c.scope.$apply(() => { c.scope.vm.locked = false })
  assert.equal(c.$('.llselect-trigger').getAttribute('data-disabled'), 'true', 'interpolated "false" is a truthy string - ui-select parity')
})

test('uib-tooltip still shows on hover while the bridge widget is disabled', async () => {
  // The disabled attribute ngDisabled writes is inert on this non-form-
  // associated host (no pointer-event suppression), and setDisabled() keeps
  // the trigger hoverable by design - so a tooltip can explain WHY it is
  // disabled. jsdom dispatches events unconditionally, so what this pins is
  // the integration (uib binds, tooltip renders, disabled state does not
  // unwire it); the browser-level "events still flow" guarantee rests on the
  // host not being form-associated (real-browser pass: docs/llm/TODO.md).
  const a = boot({
    files: ['node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js', 'llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat', 'ui.bootstrap'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" ng-disabled="true" uib-tooltip="Locked by admin">
          <ui-select-match placeholder="Pick">{{$select.selected.name}}</ui-select-match>
          <ui-select-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-select-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = USERS
      this.person = undefined
    },
  })
  assert.deepEqual(a.errors, [])
  assert.equal(a.$('.llselect-trigger').getAttribute('data-disabled'), 'true', 'fixture must be disabled')

  const host = a.$('ui-llselect')
  // jqLite has no native mouseenter: it maps it onto mouseover with a
  // related-target check (MOUSE_EVENT_MAP), so that is the event to dispatch.
  host.dispatchEvent(new a.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: null }))
  // uib shows the popup inside a scope.$apply (or a $timeout when a popup
  // delay is set; default delay is 0); give both paths a beat.
  await new Promise((resolve) => { setTimeout(resolve, 20) })
  a.scope.$digest()
  const tooltip = a.$('.tooltip')
  assert.ok(tooltip, 'tooltip did not render on hover while disabled')
  assert.ok(tooltip.textContent.includes('Locked by admin'), `tooltip text was "${tooltip.textContent}"`)
})
