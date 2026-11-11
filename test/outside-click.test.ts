import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle, type LLSelectSingleSettingsInput } from '../src/single.js'
import { behaviorPresetsOfChromiumOnWindows, behaviorPresetsOfFirefoxOnWindows, behaviorPresetsOfOriginalLLSelect, behaviorPresetsOfSafariOnMac } from '../src/behavior-presets.js'

function mountWithButton(settings: LLSelectSingleSettingsInput<string> = {}): { sel: LLSelectSingle<string>; btn: HTMLButtonElement; calls: number[] } {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount, settings)
  sel.setItems(['a', 'b'])
  return { sel, btn, calls }
}

function fireMousedown(target: HTMLElement): MouseEvent {
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

// The click that a pointer makes: a detail of 1, where the keyboard and
// click() give 0.
function firePointerClick(target: HTMLElement, x = 0, y = 0): MouseEvent {
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  return ev
}

// jsdom has no PointerEvent, so the pointer type rides on a MouseEvent.
function fireTouchPointer(target: HTMLElement, type: 'pointerdown' | 'pointerup', x: number, y: number): void {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })
  Object.defineProperty(ev, 'pointerType', { value: 'touch' })
  target.dispatchEvent(ev)
}

test('block is the default: an outside press keeps focus, its click closes the popup and never reaches the button', () => {
  let blurs = 0
  const { sel, btn, calls } = mountWithButton({ onBlur: () => { blurs++ } })
  sel.triggerEl.focus()
  sel.open()
  const down = fireMousedown(btn)
  // jsdom moves no focus at a press; a browser moves it to the button unless
  // the press is default-prevented, so the test makes that move.
  if (!down.defaultPrevented) { btn.focus() }
  assert.equal(sel.isOpened(), true, 'block closes on the click, not on the press')
  assert.equal(firePointerClick(btn).defaultPrevented, true, 'the default action of the click, such as following a link, does not run')
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(calls, [])
  assert.equal(document.activeElement, sel.triggerEl, 'focus stays on the trigger')
  assert.equal(blurs, 0)
  // The close detached the capture listeners: the next press and click are the page's own.
  assert.equal(fireMousedown(btn).defaultPrevented, false)
  assert.equal(firePointerClick(btn).defaultPrevented, false)
  assert.deepEqual(calls, [1])
})

test('the default is the value of behaviorPresetsOfOriginalLLSelect, and each preset carries its own outside click', () => {
  assert.equal(behaviorPresetsOfOriginalLLSelect.behaviorOfOutsideClick, 'block')
  assert.equal(behaviorPresetsOfChromiumOnWindows.behaviorOfOutsideClick, 'pass-through')
  assert.equal(behaviorPresetsOfFirefoxOnWindows.behaviorOfOutsideClick, 'pass-through')
  assert.equal(behaviorPresetsOfSafariOnMac.behaviorOfOutsideClick, 'block')
  // Spread into the settings, the preset's value reaches the outside click.
  const chromium = mountWithButton({ ...behaviorPresetsOfChromiumOnWindows })
  chromium.sel.open()
  fireMousedown(chromium.btn)
  chromium.btn.click()
  assert.equal(chromium.sel.isOpened(), false)
  assert.deepEqual(chromium.calls, [1], 'the Chromium preset lets the outside click through')
  const safari = mountWithButton({ ...behaviorPresetsOfSafariOnMac })
  safari.sel.open()
  fireMousedown(safari.btn)
  safari.btn.click()
  assert.equal(safari.sel.isOpened(), false)
  assert.deepEqual(safari.calls, [], 'the Safari preset swallows the outside click')
})

test('block: the click of an outside press stays swallowed when a page handler moves focus during the press', () => {
  for (const pressType of ['pointerdown', 'mousedown']) {
    const { sel, btn, calls } = mountWithButton()
    // A handler of the page that focuses its own control at the press,
    // whatever the default of the press.
    btn.addEventListener(pressType, () => { btn.focus() })
    sel.triggerEl.focus()
    sel.open()
    btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
    fireMousedown(btn)
    assert.equal(sel.isOpened(), false, `${pressType}: precondition: the focus move closed the popup during the press`)
    btn.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }))
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
    assert.equal(firePointerClick(btn).defaultPrevented, true, pressType)
    assert.deepEqual(calls, [], `${pressType}: the click of the blocked press is still swallowed`)
  }
})

test('block: the mousedown of an outside press stays default-prevented when a page handler closes the popup at the pointerdown', () => {
  let blurs = 0
  const { sel, btn, calls } = mountWithButton({ onBlur: () => { blurs++ } })
  btn.addEventListener('pointerdown', () => { sel.close() })
  sel.triggerEl.focus()
  sel.open()
  btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
  assert.equal(sel.isOpened(), false, 'precondition: the page handler closed the popup at the pointerdown')
  const down = fireMousedown(btn)
  assert.equal(down.defaultPrevented, true, 'so the browser moves no focus')
  if (!down.defaultPrevented) { btn.focus() }
  btn.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }))
  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
  assert.equal(firePointerClick(btn).defaultPrevented, true)
  assert.deepEqual(calls, [])
  assert.equal(document.activeElement, sel.triggerEl)
  assert.equal(blurs, 0)
})

test('block: a click that no pointer made passes the swallow of an outside press, which then takes the press\'s own click', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button><button id="second">second</button></body></html>')
  const btn = document.getElementById('other') as HTMLButtonElement
  const second = document.getElementById('second') as HTMLButtonElement
  const calls: string[] = []
  // Read in the test body: an assertion that throws inside a listener would
  // only be reported by jsdom, not fail the test.
  let secondPrevented: boolean | undefined
  btn.addEventListener('click', () => { calls.push('other') })
  second.addEventListener('click', (ev) => {
    calls.push('second')
    secondPrevented = ev.defaultPrevented
  })
  btn.addEventListener('mousedown', () => { btn.focus() })
  // A handler of the page that clicks another control once focus leaves.
  const sel = new LLSelectSingle<string>(document.getElementById('mount')!, { onBlur: () => { second.click() } })
  sel.setItems(['a', 'b'])
  sel.triggerEl.focus()
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.isOpened(), false, 'precondition: the focus move closed the popup during the press')
  assert.deepEqual(calls, ['second'], 'the click from click() is not the click of the press, so it reaches its button')
  assert.equal(secondPrevented, false, 'the click from click() keeps its default')
  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
  assert.equal(firePointerClick(btn).defaultPrevented, true)
  assert.deepEqual(calls, ['second'], 'the click of the press is still swallowed')
})

test('block: after a tap, the swallow waits for the click that a browser holds back, and takes it near the touch-down only', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { sel, btn, calls } = mountWithButton()
  btn.addEventListener('pointerdown', () => { btn.focus() })
  sel.triggerEl.focus()
  sel.open()
  fireTouchPointer(btn, 'pointerdown', 10, 10)
  assert.equal(sel.isOpened(), false, 'precondition: the focus move closed the popup at the touch-down')
  fireTouchPointer(btn, 'pointerup', 10, 10)
  // A browser can send the compatibility events of a tap about 300 ms later.
  t.mock.timers.tick(300)
  assert.equal(firePointerClick(btn, 100, 100).defaultPrevented, false)
  assert.deepEqual(calls, [1], 'a click far from the touch-down is not the click of the tap')
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
  assert.equal(firePointerClick(btn, 10, 10).defaultPrevented, true)
  assert.deepEqual(calls, [1], 'the click of the tap is swallowed after the delay')
})

test('block: the mousedown of a tap leaves the tap\'s swallow and its wait, also when it comes before the lift', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { sel, btn, calls } = mountWithButton()
  btn.addEventListener('mousedown', () => { btn.focus() })
  sel.triggerEl.focus()
  sel.open()
  fireTouchPointer(btn, 'pointerdown', 10, 10)
  // The compatibility mousedown before the lift, while the popup is open; the
  // handler of the page then closes the popup through focusout.
  btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
  assert.equal(sel.isOpened(), false, 'precondition: the focus move closed the popup at the mousedown')
  fireTouchPointer(btn, 'pointerup', 10, 10)
  t.mock.timers.tick(300)
  btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }))
  assert.equal(firePointerClick(btn, 10, 10).defaultPrevented, true)
  assert.deepEqual(calls, [], 'the click of the tap is swallowed after the delay')
})

test('block: the swallow of a tap ends a second after the lift, and at the next press', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  for (const end of ['the wait', 'the next press'] as const) {
    const { sel, btn, calls } = mountWithButton()
    btn.addEventListener('pointerdown', () => { btn.focus() }, { once: true })
    sel.triggerEl.focus()
    sel.open()
    fireTouchPointer(btn, 'pointerdown', 10, 10)
    assert.equal(sel.isOpened(), false, `${end}: precondition: the focus move closed the popup at the touch-down`)
    fireTouchPointer(btn, 'pointerup', 10, 10)
    if (end === 'the wait') {
      t.mock.timers.tick(1000)
    } else {
      // A new tap close to the first one, whose click the first swallow must not take.
      fireTouchPointer(btn, 'pointerdown', 12, 12)
      fireTouchPointer(btn, 'pointerup', 12, 12)
    }
    assert.equal(firePointerClick(btn, 12, 12).defaultPrevented, false, end)
    assert.deepEqual(calls, [1], `${end}: the click reaches the button`)
  }
})

test('block: the swallow of an outside press ends with the press, so a later click reaches the page', async () => {
  for (const end of ['release without a click', 'pointercancel', 'destroy()'] as const) {
    const { sel, btn, calls } = mountWithButton()
    btn.addEventListener('mousedown', () => { btn.focus() })
    sel.triggerEl.focus()
    sel.open()
    fireMousedown(btn)
    assert.equal(sel.isOpened(), false, `${end}: precondition: the focus move closed the popup during the press`)
    if (end === 'release without a click') {
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      // The swallow ends in the task after the release.
      await new Promise((resolve) => { setTimeout(resolve, 0) })
    } else if (end === 'pointercancel') {
      btn.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }))
    } else {
      sel.destroy()
    }
    // A pointer's click, which a swallow still armed would take.
    assert.equal(firePointerClick(btn).defaultPrevented, false, end)
    assert.deepEqual(calls, [1], `${end}: the later click reaches the button`)
  }
})

test('pass-through: mousedown outside closes; click still triggers outside button', () => {
  const { sel, btn, calls } = mountWithButton({ behaviorOfOutsideClick: 'pass-through' })
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

test('MEDIUM-76 (block mode): an inside click in a shadow root does not close', () => {
  setupDom('<!doctype html><html><body></body></html>')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const mountEl = document.createElement('div')
  host.attachShadow({ mode: 'open' }).appendChild(mountEl)
  const sel = new LLSelectSingle<string>(mountEl, { ariaLabel: 'x', behaviorOfOutsideClick: 'block' })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.isOpened(), true, 'precondition: open')
  // block mode closes on the captured document click; a composed click on an
  // inside NON-option element (the listbox container, which has no select handler)
  // must be recognized as inside via composedPath and NOT close. (Clicking an
  // option would select+close in single mode - a different path.)
  sel.popupListEl.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }))
  assert.equal(sel.isOpened(), true, 'block mode: an inside click must not read as outside')
})

test('block: click outside closes; outside button does NOT receive click', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="other">click me</button></body></html>')
  const mount = document.getElementById('mount')!
  const btn = document.getElementById('other') as HTMLButtonElement
  const calls: number[] = []
  btn.addEventListener('click', () => { calls.push(1) })
  const sel = new LLSelectSingle<string>(mount, { behaviorOfOutsideClick: 'block' })
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
  const sel = new LLSelectSingle<string>(mount, { behaviorOfOutsideClick: 'block' })
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
  const { sel } = mountWithButton({ behaviorOfOutsideClick: 'pass-through' })
  sel.open()
  // mousedown on trigger should NOT close (target is inside rootEl).
  fireMousedown(sel.triggerEl)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('click on option in popup does not trigger outside-close (pass-through)', () => {
  const { sel } = mountWithButton({ behaviorOfOutsideClick: 'pass-through' })
  sel.open()
  const firstOption = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  fireMousedown(firstOption)
  // mousedown alone does not select (we use click for selection), but it
  // should NOT close via outside-click logic either since it is inside.
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('listener is detached after close so further outside clicks do nothing (pass-through)', () => {
  const { sel, btn, calls } = mountWithButton({ behaviorOfOutsideClick: 'pass-through' })
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  // Click outside again while closed - should not error, button click still works.
  btn.click()
  assert.deepEqual(calls, [1])
})

test('reopen reattaches listener (pass-through)', () => {
  const { sel, btn } = mountWithButton({ behaviorOfOutsideClick: 'pass-through' })
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  sel.open()
  fireMousedown(btn)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})
