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
  sel.setItems(['a', 'b'])
  return { sel, btn, calls }
}

function fireMousedown(target: HTMLElement): void {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
}

test('pass-through (default): mousedown outside closes; click still triggers outside button', () => {
  const { sel, btn, calls } = mountWithButton()
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')

  // Mousedown on outside button -> closes popup (pass-through uses mousedown).
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')

  // Subsequent click on the button still fires its handler.
  btn.click()
  assert.deepEqual(calls, [1])
})

test('MEDIUM-76: hosted in a shadow root, an inside pointer-down does not read as outside', () => {
  setupDom('<!doctype html><html><body></body></html>')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const mountEl = document.createElement('div')
  host.attachShadow({ mode: 'open' }).appendChild(mountEl)
  const sel = new LLSelectSingle<string>(mountEl, { ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.isOpened(), true, 'precondition: open')
  // A composed pointer-down on an option inside the shadow tree: at the document
  // level ev.target retargets to the shadow host (outside rootEl), but
  // composedPath()[0] is the real option, so the outside guard must not close.
  const option = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }))
  assert.equal(sel.isOpened(), true, 'an inside click must not read as outside and close the popup')
})

test('block: click outside closes; outside button does NOT receive click', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount, { outsideClickBehavior: 'block' })
  sel.setItems(['a', 'b'])
  sel.open()

  // Click outside; consume mode swallows the click.
  btn.click()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(calls, [])
})

test('block: focus shifting on mousedown before click does not unhook the block (regression)', () => {
  // Real-browser order is: mousedown -> browser focus shift -> focusout on
  // the previously-focused element -> mouseup -> click. Without the
  // mousedown blocker, focusout would close the popup (and detach the click
  // capture handler) BEFORE click fires, letting the outside button receive
  // the click. The previous block test missed this because `btn.click()` in
  // jsdom does not perform the focus shift step. Here we drive the sequence
  // explicitly: dispatch mousedown, simulate the focus shift only if the
  // browser would have done it (i.e. mousedown was not preventDefaulted),
  // then click.
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount, { outsideClickBehavior: 'block' })
  sel.setItems(['a', 'b'])
  sel.triggerEl.focus()
  sel.open()

  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  btn.dispatchEvent(md)
  if (!md.defaultPrevented) {
    // The browser would have shifted focus and fired focusout. Simulate that.
    sel.triggerEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: btn }))
  }
  btn.click()

  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(calls, [])
})

test('click on trigger itself does not trigger outside-close (pass-through)', () => {
  const { sel } = mountWithButton()
  sel.open()
  // mousedown on trigger should NOT close (target is inside rootEl).
  fireMousedown(sel.triggerEl)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('click on option in popup does not trigger outside-close (pass-through)', () => {
  const { sel } = mountWithButton()
  sel.open()
  const firstOption = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  fireMousedown(firstOption)
  // mousedown alone does not select (we use click for selection), but it
  // should NOT close via outside-click logic either since it is inside.
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('listener is detached after close so further outside clicks do nothing', () => {
  const { sel, btn, calls } = mountWithButton()
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  // Click outside again while closed - should not error, button click still works.
  btn.click()
  assert.deepEqual(calls, [1])
})

test('reopen reattaches listener', () => {
  const { sel, btn } = mountWithButton()
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})
