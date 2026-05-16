import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

function mountWithButton(): { sel: LLSelectSingle<string>; btn: HTMLButtonElement; calls: number[] } {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount)
  sel.setOptions(['a', 'b'])
  return { sel, btn, calls }
}

function fireMousedown(target: HTMLElement): void {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
}

test('pass-through (default): mousedown outside closes; click still triggers outside button', () => {
  const { sel, btn, calls } = mountWithButton()
  sel.open()
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'true')

  // Mousedown on outside button -> closes listbox (pass-through uses mousedown).
  fireMousedown(btn)
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')

  // Subsequent click on the button still fires its handler.
  btn.click()
  assert.deepEqual(calls, [1])
})

test('block: click outside closes; outside button does NOT receive click', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount, { outsideClickBehavior: 'block' })
  sel.setOptions(['a', 'b'])
  sel.open()

  // Click outside; consume mode swallows the click.
  btn.click()
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(calls, [])
})

test('click on combobox itself does not trigger outside-close (pass-through)', () => {
  const { sel } = mountWithButton()
  sel.open()
  // mousedown on combobox should NOT close (target is inside rootEl).
  fireMousedown(sel.comboboxEl)
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'true')
})

test('click on option in listbox does not trigger outside-close (pass-through)', () => {
  const { sel } = mountWithButton()
  sel.open()
  const firstOption = sel.listboxEl.querySelector<HTMLElement>('[role="option"]')!
  fireMousedown(firstOption)
  // mousedown alone does not select (we use click for selection), but it
  // should NOT close via outside-click logic either since it is inside.
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'true')
})

test('listener is detached after close so further outside clicks do nothing', () => {
  const { sel, btn, calls } = mountWithButton()
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  // Click outside again while closed - should not error, button click still works.
  btn.click()
  assert.deepEqual(calls, [1])
})

test('reopen reattaches listener', () => {
  const { sel, btn } = mountWithButton()
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
})
