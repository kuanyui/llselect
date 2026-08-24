import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// Focus management (see docs/llm/A11Y.md "Focus"): how the popup reacts to focus
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

// jsdom performs no mousedown focus-fixup, so the actual focus loss cannot be
// reproduced here; these pin the MECHANISM (preventDefault) that stops real
// browsers from moving focus off the combobox host. See A11Y.md "Focus".

test('mousedown on an option is default-prevented (focus stays on the combobox host)', () => {
  const { sel } = mount()
  sel.open()
  const option = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  option.dispatchEvent(md)
  assert.equal(md.defaultPrevented, true)
})

test('MEDIUM-68: mousedown on the list element / no-results IS prevented (keeps focus on the host)', () => {
  const { sel } = mount()
  sel.open()
  // The list element itself (padding, or a click that misses a row): previously
  // NOT prevented, which let focus fall onto the tabindex="-1" list and kill the
  // keyboard; now prevented so focus stays on the combobox host.
  const onList = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  sel.popupListEl.dispatchEvent(onList)
  assert.equal(onList.defaultPrevented, true, 'list-element mousedown must be prevented')
  // The no-results element sits in popupEl beside the list; a mousedown there must
  // not blur the host (which would focusout-close the popup).
  const noResults = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  const onNoResults = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  noResults.dispatchEvent(onNoResults)
  assert.equal(onNoResults.defaultPrevented, true, 'no-results mousedown must be prevented')
})

test('MEDIUM-68: mousedown in the filter input is NOT prevented (it must take focus)', () => {
  const { sel } = mount()
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  input.dispatchEvent(md)
  assert.equal(md.defaultPrevented, false, 'the filter input must be allowed to focus')
})
