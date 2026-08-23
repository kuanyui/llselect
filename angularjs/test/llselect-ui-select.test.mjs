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
          <ui-llselect-match>{{$select.selected.name}}</ui-llselect-match>
          <ui-llselect-choices repeat="p in vm.users" ll-item-text="p.name"><span>{{p.name}}</span></ui-llselect-choices>
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
          <ui-llselect-match>{{$select.selected}}</ui-llselect-match>
          <ui-llselect-choices repeat="s in vm.strings"><span>{{s}}</span></ui-llselect-choices>
        </ui-llselect>
      </div>`,
    controller: function () { this.strings = ['a', 'b'] },
  })
  a.$('ui-llselect .llselect-trigger').click()
  assert.equal(a.$('ui-llselect .llselect-item').getAttribute('aria-label'), 'a')
})

test('a missing <ui-llselect-choices> is reported, and no widget is left behind', () => {
  const a = app()
  const el = a.compile('<ui-llselect ng-model="x"></ui-llselect>')
  assert.equal(a.errors.length, 1, 'nothing was reported to $exceptionHandler')
  assert.match(a.errors[0].message, /expected one <ui-llselect-choices/)
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
  const rows = a.$$('.llselect-item')
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
  assert.equal(a.$$('.llselect-item')[0].textContent, 'Alice (admin)')
  assert.equal(a.$$('.llselect-item')[0].getAttribute('aria-label'), 'Alice') // the string channel stays ll-item-text
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
  assert.equal(a.$$('ui-llselect .llselect-item').length, 3)
  a.$$('ui-llselect .llselect-item')[0].click() // chooses Alice
  assert.equal(a.scope.vm.people[0].name, 'Alice')
  assert.deepEqual(a.$$('ui-llselect .llselect-item').map((el) => el.textContent), ['Bob', 'Carol'])
})

test('remove-selected="false" keeps chosen rows listed', () => {
  const a = multiApp('remove-selected="false"')
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-item')[0].click()
  assert.equal(a.scope.vm.people.length, 1)
  assert.equal(a.$$('ui-llselect .llselect-item').length, 3)
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
  a.$$('ui-llselect .llselect-item')[0].click()
  assert.equal(a.scope.vm.people.length, 1)
  const clearBtn = a.$('ui-llselect .llselect-trigger-clear-button')
  assert.ok(clearBtn, 'clear button missing')
  clearBtn.click()
  assert.equal(a.scope.vm.people.length, 0)
  assert.equal(a.$$('ui-llselect .llselect-item').length, 3, 'clearing must relist every row (remove-selected default)')
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
  assert.equal(a.$('.llselect-item').textContent, 'Alice|ali')
  input.value = ''
  input.dispatchEvent(new a.window.Event('input', { bubbles: true }))
  // filterFn is never called for an empty query; only the render-time sync
  // can reset $select.search here. Before it, this still said "Alice|ali".
  assert.equal(a.$('.llselect-item').textContent, 'Alice|')
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
  a.$('ui-llselect .llselect-trigger').click()
  a.$$('ui-llselect .llselect-item')[0].click() // first toggle creates the chip + row scopes to compare against
  const baseline = countScopes()
  for (let i = 0; i < 6; i++) { a.$$('ui-llselect .llselect-item')[0].click() }
  assert.equal(countScopes(), baseline, 'partial row repaints must free the replaced rows\' scopes')
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
  a.$$('ui-llselect .llselect-item')[0].click() // choose Alice
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
  const texts = a.$$('ui-llselect .llselect-item').map(r => r.textContent.trim())
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
  a.$$('ui-llselect .llselect-item')[1].click() // choose Bob; single closes
  a.scope.$apply(() => { a.scope.vm.users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] })
  a.$('ui-llselect .llselect-trigger').click() // reopen
  const selected = a.$$('ui-llselect .llselect-item').map(r => r.getAttribute('aria-selected'))
  assert.deepEqual(selected, ['false', 'true'], 'the equal fresh row must stay marked selected')
  const focused = a.$('ui-llselect .llselect-item-focused')
  assert.ok(focused && focused.textContent.includes('Bob'), 'reopen must focus the chosen row, not the first-row fallback')
})
