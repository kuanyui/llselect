import test from 'node:test'
import assert from 'node:assert/strict'
import { boot } from './harness.mjs'

// llselect refuses to open a trigger that is off-screen or clipped
// (positioning.ts isAnchorHidden). jsdom cannot see this on its own: every
// getBoundingClientRect is 0x0 at 0,0, and the check uses strict comparisons
// precisely so an unsized jsdom anchor reads as "in viewport, no rect yet"
// rather than off-screen. So a real browser can hit a no-op open that every
// jsdom test passes straight through - which is exactly what happened to the
// benchmark's off-screen stage. Stubbing the rect makes the path observable.
function withRect(el, rect) {
  el.getBoundingClientRect = () => ({
    top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right,
    width: rect.right - rect.left, height: rect.bottom - rect.top, x: rect.left, y: rect.top,
  })
}

function app() {
  return boot({
    deps: ['llselect'],
    html: `<div ng-controller="C as vm">
      <llselect-single ng-model="vm.x" ll-options="f for f in vm.fruits"></llselect-single></div>`,
    controller: function () { this.fruits = ['Apple', 'Banana'] },
  })
}

test('an on-screen trigger opens and renders rows', () => {
  const a = app()
  const trigger = a.$('.llselect-trigger')
  withRect(trigger, { top: 10, left: 10, bottom: 40, right: 210 })
  trigger.click()
  assert.equal(a.$$('.llselect-item').length, 2)
})

test('an off-screen trigger does NOT open - the trap the benchmark stage fell into', () => {
  const a = app()
  const trigger = a.$('.llselect-trigger')
  // What `position: absolute; left: -9999px` actually produces.
  withRect(trigger, { top: 0, left: -9999, bottom: 30, right: -9699 })
  trigger.click()
  assert.equal(a.$$('.llselect-item').length, 0,
    'llselect opened an off-screen trigger; if this changed, the benchmark stage rules can relax')
})
