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
            <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
            <ui-llselect-choices repeat="p in vm.users | filter: $select.search"
              ll-item-text="p.name" ui-disable-choice="p.bad">
              <span>{{p.name}}</span>
            </ui-llselect-choices>
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
  assert.equal(a.$('ui-llselect ui-llselect-choices'), null, '<ui-llselect-choices> survived into the DOM')
})

test('a host aria-labelledby is forwarded into the trigger name (MEDIUM-70)', () => {
  const a = app('aria-labelledby="lbl-id"')
  const trigger = a.$('ui-llselect .llselect-trigger')
  const labelledby = trigger.getAttribute('aria-labelledby') || ''
  assert.ok(
    labelledby.split(/\s+/).includes('lbl-id'),
    `trigger aria-labelledby ("${labelledby}") must reference the host's lbl-id`
  )
})

test('name + required work here too', () => {
  const a = app()
  assert.ok(a.scope.f.person, 'myForm.person is not registered')
  assert.equal(a.scope.f.person.$error.required, true)
})

test('the transcluded template renders per row', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  const rows = a.$$('ui-llselect .llselect-popup-list-row')
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
  const texts = a.$$('ui-llselect .llselect-popup-list-row').map((r) => r.textContent)
  assert.ok(texts.length > 0, 'no rows rendered')
  const raw = texts.filter((t) => t.includes('{{'))
  assert.deepEqual(raw, [], 'rows were still uninterpolated when llselect measured them')
})

test('ui-disable-choice reaches llselect', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row-disabled').length, 1, 'expected Bob disabled')
})

test('ll-item-text becomes the option accessible name', () => {
  // ui-select has no item-to-string concept, so llselect has nothing to name the
  // option with unless the markup says. Without ll-item-text an object item would
  // announce as [object Object].
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$('ui-llselect .llselect-popup-list-row').getAttribute('aria-label'), 'Alice')
})

test('choosing a row writes the model and renders the match template', () => {
  const a = app()
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click()
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
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS },
  })
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click()
  assert.equal(a.scope.plain?.name, 'Alice', 'a non-dotted ng-model was shadowed onto a child scope')
})

test('a repeat expression without ll-item-text still names the option, via String(item)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.s">
          <ui-llselect-match>{{$select.selected}}</ui-llselect-match>
          <ui-llselect-choices repeat="s in vm.strings"><span>{{s}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.strings = ['a', 'b'] },
  })
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$('ui-llselect .llselect-popup-list-row').getAttribute('aria-label'), 'a')
})

test('a missing <ui-llselect-choices> is reported, and no select component is left behind', () => {
  const a = app()
  const el = a.compile('<ui-llselect ng-model="x"></ui-llselect>')
  assert.equal(a.errors.length, 1, 'nothing was reported to $exceptionHandler')
  assert.match(a.errors[0].message, /expected one <ui-llselect-choices/)
  assert.equal(el[0].querySelector('.llselect-trigger'), null, 'a half-built select component was left behind')
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
  assert.equal(a.$$('.llselect-popup-list-row').length, 0, 'a disabled select component of the bridge must not open')
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

test('uib-tooltip still shows on hover while the select component of the bridge is disabled', async () => {
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
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
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

test('an empty <ui-llselect-choices> renders rows as plain ll-item-text text', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = USERS
      this.person = undefined
    },
  })
  assert.deepEqual(a.errors, [])
  a.$('.llselect-trigger').click()
  const rows = a.$$('.llselect-popup-list-row')
  assert.equal(rows.length, USERS.length)
  assert.equal(rows[0].textContent, 'Alice') // the ll-item-text string, no template needed
})

test('a bare text-node template (no element) works, as in ui-select', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name">{{p.name}} ({{p.role}})</ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = USERS
      this.person = undefined
    },
  })
  assert.deepEqual(a.errors, [])
  a.$('.llselect-trigger').click()
  assert.equal(a.$$('.llselect-popup-list-row')[0].textContent, 'Alice (admin)')
  assert.equal(a.$$('.llselect-popup-list-row')[0].getAttribute('aria-label'), 'Alice') // the string channel stays ll-item-text
})

function multiApp(extraAttrs = '') {
  return boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.people" ${extraAttrs}>
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users | filter: $select.search" ll-item-text="p.name">
            <span>{{p.name}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = USERS
      this.people = []
    },
  })
}

test('multiple follows remove-selected: chosen rows leave the dropdown by default, exactly like ui-select', () => {
  // ui-select defaults removeSelected to true (common.js:108) and applies it
  // in multiple mode only (uiSelectController.js:240-241). The bridge maps it
  // onto hideChosenRows with the same default, like search-enabled.
  const a = multiApp()
  assert.deepEqual(a.errors, [])
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row').length, 3)
  a.$$('ui-llselect .llselect-popup-list-row')[0].click() // chooses Alice
  assert.equal(a.scope.vm.people[0].name, 'Alice')
  assert.deepEqual(a.$$('ui-llselect .llselect-popup-list-row').map((el) => el.textContent), ['Bob', 'Carol'])
})

test('remove-selected="false" keeps chosen rows listed', () => {
  const a = multiApp('remove-selected="false"')
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click()
  assert.equal(a.scope.vm.people.length, 1)
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row').length, 3)
})

test('allow-clear on a multiple renders a working clear button - the documented deviation', () => {
  // Real ui-select ignores allow-clear in multiple (its match-multiple
  // templates have no clear anchor; default false, uiSelectMatchDirective.js:25).
  // The bridge honors it in both modes: API.md "Deliberate deviations".
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.people">
          <ui-llselect-match placeholder="Pick" allow-clear="true">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name">
            <span>{{p.name}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.people = [] },
  })
  assert.deepEqual(a.errors, [])
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click()
  assert.equal(a.scope.vm.people.length, 1)
  const clearBtn = a.$('ui-llselect .llselect-trigger-clear-button')
  assert.ok(clearBtn, 'clear button missing')
  clearBtn.click()
  assert.equal(a.scope.vm.people.length, 0)
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row').length, 3, 'clearing must relist every row (remove-selected default)')
})

test('aria-label on the host names the field; it wins over title', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="Assignee" title="Person">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
  })
  assert.deepEqual(a.errors, [])
  assert.equal(a.$('ui-llselect .llselect-trigger').getAttribute('aria-label'), 'Assignee')
})

test('$select.search resets when the query is cleared, so rows stop highlighting it', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users | filter: $select.search" ll-item-text="p.name">
            <span>{{p.name}}|{{$select.search}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = USERS
      this.person = undefined
    },
  })
  assert.deepEqual(a.errors, [])
  a.$('.llselect-trigger').click()
  const input = a.$('.llselect-filter-input')
  input.value = 'ali'
  input.dispatchEvent(new a.window.Event('input', { bubbles: true }))
  assert.equal(a.$('.llselect-popup-list-row').textContent, 'Alice|ali')
  input.value = ''
  input.dispatchEvent(new a.window.Event('input', { bubbles: true }))
  // filterFn is never called for an empty query; only the render-time sync
  // can reset $select.search here. Before it, this still said "Alice|ali".
  assert.equal(a.$('.llselect-popup-list-row').textContent, 'Alice|')
})

test('allow-clear="false" disables and a bare allow-clear enables, like ui-select', () => {
  // ui-select's parse (uiSelectMatchDirective.js:25): '' -> true, otherwise
  // only the string 'true'. The old raw truthy check inverted both edges.
  const off = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match placeholder="Pick" allow-clear="false">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
  })
  assert.equal(off.$('ui-llselect .llselect-trigger-clear-button'), null, 'allow-clear="false" must not enable the clear button')
  const bare = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match placeholder="Pick" allow-clear>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
  })
  assert.ok(bare.$('ui-llselect .llselect-trigger-clear-button'), 'a bare allow-clear must enable the clear button')
})

test('async choices: presets resolve; plain objects show from boot, alias keys once items arrive', () => {
  // ui-select semantics: the selection is the MODEL, not a membership test -
  // a plain-object preset renders even while the collection is still empty.
  const plain = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = []; this.person = { id: 1, name: 'Alice' } },
  })
  assert.equal(plain.text('.llselect-trigger-content'), 'Alice', 'object preset must render before items arrive')
  plain.scope.$apply(() => { plain.scope.vm.users = [{ id: 1, name: 'Alice' }] })
  assert.equal(plain.text('.llselect-trigger-content'), 'Alice', 'and must survive their arrival')

  // With an alias the model holds a key into the list, so it can only
  // resolve once the list is there.
  const keyed = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.personId" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p.id as p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = []; this.personId = 2 },
  })
  assert.equal(keyed.text('.llselect-trigger-content'), 'Pick', 'a key preset cannot resolve from an empty list')
  keyed.scope.$apply(() => { keyed.scope.vm.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] })
  assert.equal(keyed.text('.llselect-trigger-content'), 'Bob', 'key preset must resolve once items arrive')
})

test('track by reload: a renamed same-key item refreshes the trigger', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users track by p.id" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = [{ id: 1, name: 'Alice' }]
      this.person = this.users[0]
    },
  })
  assert.equal(a.text('.llselect-trigger-content'), 'Alice')
  a.scope.$apply(() => { a.scope.vm.users = [{ id: 1, name: 'Alicia' }] })
  assert.equal(a.text('.llselect-trigger-content'), 'Alicia', 'the swapped-in list object must repaint the trigger')
})

test('repeated toggles with remove-selected="false" do not leak row scopes', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple remove-selected="false" ng-model="vm.people" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.people = [] },
  })
  const countScopes = () => {
    let n = 0
    const walk = (s) => { for (let c = s.$$childHead; c; c = c.$$nextSibling) { n += 1; walk(c) } }
    walk(a.scope.$root)
    return n
  }
  const cacheSize = () => Object.keys(a.ng.element.cache).length // jqLite's global element-data store
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click() // first toggle creates the chip + row scopes to compare against
  const baseline = countScopes()
  const cacheBaseline = cacheSize()
  for (let i = 0; i < 6; i++) { a.$$('ui-llselect .llselect-popup-list-row')[0].click() }
  assert.equal(countScopes(), baseline, 'partial row repaints must free the replaced rows\' scopes')
  assert.equal(cacheSize(), cacheBaseline, 'the replaced rows\' jqLite data must go too (the core removes them natively)')
})

test('no track by: a reload with equal-but-fresh objects keeps ONE selection (ui-select parity via angular.equals)', () => {
  // ui-select's multiple-mode comparison is angular.equals
  // (_isItemSelected, uiSelectController.js:332): a reload's structurally
  // equal fresh object is the SAME item. Pin: one chip, the fresh row stays
  // hidden under remove-selected (default true), the model keeps its object,
  // and no second entry is addable. Identity here once allowed a double-add.
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.people" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]; this.people = [] },
  })
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click() // choose Alice
  assert.equal(a.scope.vm.people.length, 1)
  const chosenBefore = a.scope.vm.people[0]
  a.scope.$apply(() => { a.scope.vm.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] })
  assert.equal(a.scope.vm.people[0], chosenBefore, 'the model must keep its own object across the reload')
  assert.equal(a.scope.vm.people.length, 1, 'no duplicate entry may enter the model')
  const chips = a.$$('ui-llselect .llselect-tag').map(t => t.textContent.trim())
  assert.deepEqual(chips, ['Alice'], 'exactly one chip must survive the reload')
  // The popup is still open: the equals-equal fresh Alice is the chosen item,
  // so remove-selected keeps her row hidden - only Bob is listed, and no
  // second Alice entry can be added.
  const texts = a.$$('ui-llselect .llselect-popup-list-row').map(r => r.textContent.trim())
  assert.deepEqual(texts, ['Bob'], 'the fresh equal object must stay hidden as the chosen item')
})

test('single without track by: aria-selected and open-focus survive an equal-object reload', () => {
  // With identity compare a reload dropped the chosen row's aria-selected
  // (AT heard "nothing selected") while the trigger kept showing the choice,
  // and reopening focused the first row. angular.equals keeps the marking.
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]; this.person = undefined },
  })
  a.$('ui-llselect .llselect-trigger').click()
  // Choose Bob, NOT the first row: the first row is also focusInitial's
  // fallback, so an identity regression would focus it anyway and the focus
  // assertion would pin nothing.
  a.$$('ui-llselect .llselect-popup-list-row')[1].click() // choose Bob; single closes
  a.scope.$apply(() => { a.scope.vm.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] })
  a.$('ui-llselect .llselect-trigger').click() // reopen
  const selected = a.$$('ui-llselect .llselect-popup-list-row').map(r => r.getAttribute('aria-selected'))
  assert.deepEqual(selected, ['false', 'true'], 'the equal fresh row must stay marked selected')
  const focused = a.$('ui-llselect .llselect-popup-list-row-focused')
  assert.ok(focused && focused.textContent.includes('Bob'), 'reopen must focus the chosen row, not the first-row fallback')
})

test('on-remove hands back the stored entry when the row clicked is a different object equal under track by', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.sel" remove-selected="false" on-remove="vm.removed.push($item)">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users track by p.id" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]; this.sel = []; this.removed = [] },
  })
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  const fresh = { id: 2, name: 'Bob' }
  sel.setChosenItems([fresh]) // a fresh object, equal to the list's Bob under track by
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[1].click() // the list's Bob row deselects the stored `fresh`
  assert.deepEqual(a.errors, [])
  assert.equal(a.scope.vm.removed.length, 1)
  assert.equal(a.scope.vm.removed[0], fresh, 'on-remove must hand back the stored entry, as the previous-set diff did')
})

test('on-remove fires once per removed entry on a bulk change, through the previous-set diff', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.sel" on-select="vm.added.push($item)" on-remove="vm.removed.push($item)">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users track by p.id" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }]; this.sel = []; this.added = []; this.removed = [] },
  })
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  const [alice, bob] = a.scope.vm.users
  sel.setChosenItems([alice, bob]) // a whole-value write: reason 'set', the diff path
  sel.setChosenItems([]) // an empty whole-value write: reason 'clear', the diff path
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.scope.vm.added, [alice, bob], 'on-select once per added entry')
  assert.deepEqual(a.scope.vm.removed, [alice, bob], 'on-remove once per removed entry, the stored objects')
})

test('on-remove fires through the diff when instance().setItems() drops chosen entries (reason items)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.sel" on-remove="vm.removed.push($item)">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users track by p.id" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }]; this.sel = []; this.removed = [] },
  })
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  const [alice, bob, carol] = a.scope.vm.users
  sel.setChosenItems([alice, bob])
  sel.setItems([carol]) // the reconciliation drops both chosen entries: reason 'items', the diff path
  assert.deepEqual(a.errors, [])
  assert.deepEqual(a.scope.vm.removed, [alice, bob], 'on-remove once per dropped entry')
})

test('QUALITY-92: choosing a second item does not re-fire on-select for a NaN already chosen', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.n" on-select="vm.picked.push($item)">
          <ui-llselect-match placeholder="Pick">{{$item}}</ui-llselect-match>
          <ui-llselect-choices repeat="x in vm.nums" ll-item-text="x + ''">
            <span>{{x}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.nums = [NaN, 1]; this.n = [NaN]; this.picked = [] },
  })
  assert.deepEqual(a.errors, [])
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click() // chooses 1 (the chosen NaN row is hidden by remove-selected): the toggle path
  assert.equal(a.scope.vm.n.length, 2)
  assert.deepEqual(a.scope.vm.picked, [1], 'only the newly chosen item fires on-select on the toggle path')
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  sel.setChosenItems([NaN]) // a whole-value write: the diff path; nothing is added
  sel.setChosenItems([NaN, 1]) // the diff path again: NaN is retained under SameValueZero, only 1 is added
  assert.deepEqual(a.scope.vm.picked, [1, 1], 'the diff path keeps the NaN through SameValueZero; an indexOf diff would re-fire it')
})

test('QUALITY-92: a NaN model value resolves through a repeat alias too (the reverse lookup is SameValueZero)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.n">
          <ui-llselect-match placeholder="Pick">{{$select.selected}}</ui-llselect-match>
          <ui-llselect-choices repeat="x as x in vm.nums" ll-item-text="x + ''">
            <span>{{x}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.nums = [NaN, 1]; this.n = NaN },
  })
  assert.deepEqual(a.errors, [])
  assert.equal(a.$('ui-llselect .llselect-trigger-content').textContent.trim(), 'NaN')
})

test('MEDIUM-93: reloads with chips on screen do not leak trigger scopes (setItems rebuilds the content alone)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.people" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS.map((u) => ({ ...u })); this.people = [] },
  })
  const countScopes = () => {
    let n = 0
    const walk = (s) => { for (let c = s.$$childHead; c; c = c.$$nextSibling) { n += 1; walk(c) } }
    walk(a.scope.$root)
    return n
  }
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click() // one chip on screen
  const cacheSize = () => Object.keys(a.ng.element.cache).length // jqLite's global element-data store
  const reload = () => { a.scope.$apply(() => { a.scope.vm.users = a.scope.vm.users.map((u) => ({ ...u })) }) }
  reload() // equal-but-fresh objects: the chosen reference swaps, the chip rebuilds
  const baseline = countScopes()
  const cacheBaseline = cacheSize()
  for (let i = 0; i < 6; i++) { reload() }
  assert.equal(countScopes(), baseline, 'every trigger-content rebuild must free the previous chip scopes')
  assert.equal(cacheSize(), cacheBaseline, 'and their jqLite data (natively removed elements never reach cleanData)')
  assert.equal(a.$$('ui-llselect .llselect-tag').length, 1)
})

test('config uiTranslationPack reaches <ui-llselect> too (an app-wide default is app-wide)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
        <ui-llselect ng-model="vm.person2" aria-label="P2">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined; this.person2 = undefined },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ uiTranslationPack: { triggerPlaceholder: 'Bitte auswaehlen' } })
    }],
  })
  assert.deepEqual(a.errors, [])
  const texts = a.$$('ui-llselect .llselect-trigger-content').map((el) => el.textContent.trim())
  assert.equal(texts[0], 'Bitte auswaehlen', 'the pack must seed the select component of the bridge')
  assert.equal(texts[1], 'Pick', 'a slot placeholder must still win over the pack')
})

test('the i18n recipe covers <ui-llselect>: a same-name directive re-packs it from $translate through instance()', () => {
  // The API.md recipe, one more line: .directive('uiLlselect', i18nPackSync('uiLlselect')).
  let lang
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
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
    config: ['$provide', '$compileProvider', function ($provide, $compileProvider) {
      $provide.value('$translate', { use: function () { return lang } })
      $provide.constant('LLSELECT_I18N_PACKS', { de: { triggerPlaceholder: 'Bitte auswaehlen' } })
      $compileProvider.directive('uiLlselect', i18nPackSync('uiLlselect'))
    }],
  })
  assert.deepEqual(a.errors, [])
  const text = () => a.$('ui-llselect .llselect-trigger-content').textContent.trim()
  assert.equal(text(), 'Please select', 'undefined language must leave the default pack')
  a.scope.$apply(() => { lang = 'de' })
  assert.equal(text(), 'Bitte auswaehlen', 'the select component of the bridge must re-pack through instance()')
  a.scope.$apply(() => { lang = 'fr' })
  assert.equal(text(), 'Please select', 'an unmapped key must restore the English defaults')
})

test('config: <ui-llselect> takes popupWidthPolicy, and NOT arrow / filterable / highlight (ui-select owns those)', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users | filter: $select.search" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ arrow: 'triangle', filterable: false, highlight: true, popupWidthPolicy: 'match-trigger' })
    }],
  })
  assert.deepEqual(a.errors, [])
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  assert.equal(sel.settings.popupWidthPolicy, 'match-trigger', 'popupWidthPolicy is house style: the bridge must take it')
  const chevron = a.window.llselect.createChevronDownSvgEl().querySelector('path').getAttribute('d')
  assert.equal(a.$('ui-llselect .llselect-trigger-arrow path').getAttribute('d'), chevron, 'every ui-select theme has a caret: config arrow must not change it')
  a.$('ui-llselect .llselect-trigger').click()
  const input = a.$('ui-llselect .llselect-filter-input')
  assert.ok(input && !input.hasAttribute('hidden'), 'search-enabled defaults to true in ui-select: config filterable must not switch it off')
  input.value = 'bob' // Angular's filter matches every property, so 'al' would also hit `bad: false`
  input.dispatchEvent(new a.window.Event('input', { bubbles: true }))
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row mark').length, 0, 'highlight is the row template\'s own filter: config highlight must not mark rows')
  assert.equal(a.$$('ui-llselect .llselect-popup-list-row').length, 1, 'the ui-select filter chain must still run')
})

test('config colorScheme reaches <ui-llselect>', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
    config: ['llselectConfigProvider', function (llselectConfigProvider) { llselectConfigProvider.defaults({ colorScheme: 'dark' }) }],
  })
  assert.deepEqual(a.errors, [])
  const sel = a.ng.element(a.$('ui-llselect')).controller('uiLlselect').instance()
  assert.equal(sel.getColorScheme(), 'dark')
  assert.equal(sel.rootEl.getAttribute('data-llselect-color-scheme'), 'dark')
})

test('config uiTranslationPack reaches <ui-llselect multiple>: the tag remove button speaks the pack', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect multiple ng-model="vm.people" aria-label="P">
          <ui-llselect-match>{{$item.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.people = [] },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ uiTranslationPack: { triggerPlaceholder: 'Bitte auswaehlen', tagRemoveButtonAriaLabel: function (text) { return text + ' entfernen' } } })
    }],
  })
  assert.deepEqual(a.errors, [])
  assert.equal(a.$('ui-llselect .llselect-trigger-content').textContent.trim(), 'Bitte auswaehlen')
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-popup-list-row')[0].click()
  assert.equal(a.$('ui-llselect .llselect-tag-remove-button').getAttribute('aria-label'), 'Alice entfernen', 'the multiple-only strings must come from the pack too')
})

test('the bridge module pulls llselect in transitively, whatever the script order', () => {
  const a = boot({
    files: ['llselect-ui-select.js', 'llselect-angularjs.js'], // reversed on purpose: modules resolve at bootstrap
    deps: ['llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" aria-label="P">
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined },
    config: ['llselectConfigProvider', function (llselectConfigProvider) {
      llselectConfigProvider.defaults({ uiTranslationPack: { triggerPlaceholder: 'Bitte auswaehlen' } })
    }],
  })
  assert.deepEqual(a.errors, [])
  assert.equal(a.$('ui-llselect .llselect-trigger-content').textContent.trim(), 'Bitte auswaehlen', 'llselectConfig must be reachable through the transitive dependency alone')
})

test('the control turns touched when focus leaves the select component, as on the llselect directives', () => {
  const a = app()
  const trigger = a.$('ui-llselect .llselect-trigger')
  assert.equal(a.scope.f.person.$touched, false)
  trigger.focus()
  trigger.click() // open: focus moves inside, to the filter input (search-enabled defaults to true)
  assert.equal(a.scope.f.person.$touched, false, 'an inside move does not touch the control')
  const outside = trigger.ownerDocument.createElement('button') // <body> is not focusable in jsdom
  trigger.ownerDocument.body.appendChild(outside)
  outside.focus() // focus leaves the select component
  assert.equal(a.scope.f.person.$touched, true)
  assert.ok(a.$('ui-llselect').classList.contains('ng-touched'))
  assert.deepEqual(a.errors, [])
})

test('on-highlight runs with the repeat locals when the active row lands on an item row, never for a close', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <span id="n">{{vm.hl.join(',')}}</span>
        <ui-llselect ng-model="vm.person" search-enabled="false">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name" ui-disable-choice="p.bad" on-highlight="vm.hl.push(p.name + ':' + $select.multiple)">
            <span>{{p.name}}</span>
          </ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined; this.hl = [] },
  })
  const trigger = a.$('ui-llselect .llselect-trigger')
  trigger.click() // open: the initial row is Alice
  assert.equal(a.$('#n').textContent, 'Alice:false')
  trigger.dispatchEvent(new a.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })) // Bob is disabled: Carol
  assert.equal(a.$('#n').textContent, 'Alice:false,Carol:false')
  trigger.click() // close: no item is active, nothing runs
  assert.equal(a.$('#n').textContent, 'Alice:false,Carol:false')
  assert.deepEqual(a.errors, [])
})

test('on-highlight also runs for an item click, before the pick, and reads the current $select.search without a choices template', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <span id="n">{{vm.hl.join(',')}}</span>
        <ui-llselect ng-model="vm.person">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users | filter: $select.search" ll-item-text="p.name" on-highlight="vm.hl.push(p.name + '/' + $select.search)"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.users = USERS; this.person = undefined; this.hl = [] },
  })
  const trigger = a.$('ui-llselect .llselect-trigger')
  trigger.click() // open: search-enabled defaults to true, the initial row is Alice
  assert.equal(a.$('#n').textContent, 'Alice/')
  const input = a.$('ui-llselect .llselect-filter-input')
  input.value = 'car'
  input.dispatchEvent(new a.window.Event('input', { bubbles: true })) // only Carol matches ('c' alone would keep Alice)
  assert.equal(a.$('#n').textContent, 'Alice/,Carol/car')
  input.value = ''
  input.dispatchEvent(new a.window.Event('input', { bubbles: true }))
  assert.equal(a.$('#n').textContent, 'Alice/,Carol/car,Alice/')
  a.$$('ui-llselect [role="option"]')[2].click() // Carol: the click moves the row, then picks
  assert.equal(a.$('#n').textContent, 'Alice/,Carol/car,Alice/,Carol/')
  assert.equal(a.scope.vm.person.name, 'Carol')
  assert.deepEqual(a.errors, [])
})

test('an on-highlight expression that throws inside a digest reaches $exceptionHandler and the reload completes', () => {
  const a = boot({
    files: ['llselect-angularjs.js', 'llselect-ui-select.js'],
    deps: ['llselect', 'llselect.uiCompat'],
    html: `
      <div ng-controller="C as vm">
        <ui-llselect ng-model="vm.person" search-enabled="false" aria-label="P">
          <ui-llselect-match placeholder="Pick">{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users track by p.id" ll-item-text="p.name" on-highlight="vm.boom()"></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () {
      this.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Carol' }]
      this.person = this.users[0]
      this.boom = function () { throw new Error('boom') }
    },
  })
  a.$('ui-llselect .llselect-trigger').click() // open: the initial row is the chosen Alice; the expression throws outside a digest
  assert.equal(a.errors.length, 1)
  // A reload inside a digest re-renders the open list: index 0 stays valid and now holds Carol, so the
  // expression throws inside the digest. The chosen entry's reconciliation runs AFTER that report: with a raw call the
  // throw skips it and the trigger keeps the old name.
  a.scope.$apply(() => { a.scope.vm.users = [{ id: 2, name: 'Carol' }, { id: 1, name: 'Alicia' }] })
  assert.equal(a.errors.length, 2)
  assert.match(a.errors[1].message, /boom/)
  assert.equal(a.text('.llselect-trigger-content'), 'Alicia', 'the reconciliation after the throwing report ran')
})
