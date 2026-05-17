import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// Focus management (see docs/A11Y.md "Focus"): how the popup reacts to focus
// moving in and out of the widget. Distinct from outside-click (pointer
// dismissal) and keyboard (key -> action mapping).

function mount(): { sel: LLSelectSingle<string>; outside: HTMLButtonElement } {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="outside">x</button></body></html>')
  const el = document.getElementById('mount')!
  const outside = document.getElementById('outside') as HTMLButtonElement
  const sel = new LLSelectSingle<string>(el)
  sel.setItems(['a', 'b'])
  return { sel, outside }
}

test('focusout: focus leaving the root closes an open popup', () => {
  const { sel, outside } = mount()
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  sel.triggerEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('focusout: focus moving to an element inside the root keeps the popup open', () => {
  const { sel } = mount()
  sel.open()
  // relatedTarget is inside rootEl (a future in-popup control); must not close.
  sel.triggerEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: sel.popupListEl }))
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('focusout: focus leaving to nothing (relatedTarget null) closes the popup', () => {
  const { sel } = mount()
  sel.open()
  sel.triggerEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})
