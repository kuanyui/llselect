import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle, type LLSelectSingleSettingsInput } from '../src/single.js'
import type { LLSelectCloseMeta } from '../src/base.js'
import type { LLSelectScrollGesture, LLSelectScrollGestureBehavior, LLSelectScrollGestureKind, LLSelectScrollGestureZone } from '../src/behaviors.js'
import {
  behaviorPresetsOfChromiumOnWindows,
  behaviorPresetsOfFirefoxOnWindows,
  behaviorPresetsOfLLSelectDefault,
  defaultScrollGestureToBehavior,
} from '../src/behavior-presets.js'

const KINDS: LLSelectScrollGestureKind[] = ['wheel', 'touch-start', 'touch-drag']
const ZONES: LLSelectScrollGestureZone[] = ['popup', 'trigger', 'outside']

function table(fn: (g: LLSelectScrollGesture) => LLSelectScrollGestureBehavior): Record<string, LLSelectScrollGestureBehavior> {
  const out: Record<string, LLSelectScrollGestureBehavior> = {}
  for (const kind of KINDS) {
    for (const zone of ZONES) { out[`${kind} ${zone}`] = fn({ kind, zone }) }
  }
  return out
}

test('the default behavior blocks the page scroll inside the popup only, and never closes', () => {
  assert.equal(behaviorPresetsOfLLSelectDefault.scrollGestureToBehaviorFn, defaultScrollGestureToBehavior)
  assert.deepEqual(table(defaultScrollGestureToBehavior), {
    'wheel popup': 'leave-popup-open-and-block-page-scroll',
    'wheel trigger': 'leave-popup-open-and-allow-page-scroll',
    'wheel outside': 'leave-popup-open-and-allow-page-scroll',
    'touch-start popup': 'leave-popup-open-and-allow-page-scroll',
    'touch-start trigger': 'leave-popup-open-and-allow-page-scroll',
    'touch-start outside': 'leave-popup-open-and-allow-page-scroll',
    'touch-drag popup': 'leave-popup-open-and-block-page-scroll',
    'touch-drag trigger': 'leave-popup-open-and-allow-page-scroll',
    'touch-drag outside': 'leave-popup-open-and-allow-page-scroll',
  })
})

test('the Firefox-on-Windows preset blocks every wheel and closes at a touch outside the popup', () => {
  assert.deepEqual(table(behaviorPresetsOfFirefoxOnWindows.scrollGestureToBehaviorFn), {
    'wheel popup': 'leave-popup-open-and-block-page-scroll',
    'wheel trigger': 'leave-popup-open-and-block-page-scroll',
    'wheel outside': 'leave-popup-open-and-block-page-scroll',
    'touch-start popup': 'leave-popup-open-and-block-page-scroll',
    'touch-start trigger': 'close-popup-and-block-page-scroll',
    'touch-start outside': 'close-popup-and-block-page-scroll',
    'touch-drag popup': 'leave-popup-open-and-block-page-scroll',
    'touch-drag trigger': 'close-popup-and-block-page-scroll',
    'touch-drag outside': 'close-popup-and-block-page-scroll',
  })
})

test('the Chromium-on-Windows preset closes at a wheel or a touch outside the popup and lets the page scroll', () => {
  assert.deepEqual(table(behaviorPresetsOfChromiumOnWindows.scrollGestureToBehaviorFn), {
    'wheel popup': 'leave-popup-open-and-block-page-scroll',
    'wheel trigger': 'close-popup-and-allow-page-scroll',
    'wheel outside': 'close-popup-and-allow-page-scroll',
    'touch-start popup': 'leave-popup-open-and-allow-page-scroll',
    'touch-start trigger': 'close-popup-and-allow-page-scroll',
    'touch-start outside': 'close-popup-and-allow-page-scroll',
    'touch-drag popup': 'leave-popup-open-and-block-page-scroll',
    'touch-drag trigger': 'close-popup-and-allow-page-scroll',
    'touch-drag outside': 'close-popup-and-allow-page-scroll',
  })
})

// Records each gesture that reaches the setting. Wrapping the setting instead
// would hide the default function, and the library would listen outside.
class Probe extends LLSelectSingle<string> {
  public readonly seen: LLSelectScrollGesture[] = []
  protected override scrollGestureToBehavior(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior {
    this.seen.push(gesture)
    return super.scrollGestureToBehavior(gesture)
  }
}

class OutsideProbe extends Probe {
  protected override shouldListenForScrollGesturesOutside(): boolean { return true }
}

interface Fixture {
  sel: Probe
  outside: HTMLElement
  closes: LLSelectCloseMeta[]
}

function mount(settings: LLSelectSingleSettingsInput<string> = {}, Ctor: typeof Probe = Probe): Fixture {
  setupDom('<!doctype html><html><body><div id="mount"></div><p id="outside">page</p></body></html>')
  const el = document.getElementById('mount')
  const outside = document.getElementById('outside')
  assert.ok(el && outside)
  const closes: LLSelectCloseMeta[] = []
  const sel = new Ctor(el, { ...settings, onClose: (meta) => { closes.push(meta) } })
  sel.setItems(['a', 'b', 'c'])
  return { sel, outside, closes }
}

function wheel(target: EventTarget, init: WheelEventInit = { deltaY: 3 }): WheelEvent {
  const ev = new window.WheelEvent('wheel', { bubbles: true, cancelable: true, composed: true, ...init })
  target.dispatchEvent(ev)
  return ev
}

// jsdom has no Touch constructor, so the touch lists are plain look-alikes.
function touch(type: string, target: EventTarget, points: Array<{ id: number; x: number; y: number }>, changed = points): Event {
  const list = (ps: typeof points): TouchList => {
    const items = ps.map((p) => ({ identifier: p.id, clientX: p.x, clientY: p.y, target }))
    return { length: items.length, item: (i: number) => items[i] ?? null } as unknown as TouchList
  }
  const ev = new window.Event(type, { bubbles: true, cancelable: true, composed: true })
  const lifted = type === 'touchend' || type === 'touchcancel'
  Object.defineProperty(ev, 'touches', { value: list(lifted ? [] : points) })
  Object.defineProperty(ev, 'changedTouches', { value: list(changed) })
  target.dispatchEvent(ev)
  return ev
}

test('a wheel inside the popup that the popup cannot scroll is blocked, and the popup stays open', () => {
  const { sel, closes } = mount()
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  assert.equal(wheel(row).defaultPrevented, true)
  assert.equal(sel.isOpened(), true)
  assert.deepEqual(closes, [])
})

test('the popup gestures go to non-passive listeners on the popup element itself', (t) => {
  // Chromium 156 dispatches a wheel over the top-layer popup as not
  // cancelable when the only non-passive listener sits on an ancestor.
  const { sel } = mount()
  const spy = t.mock.method(sel.popupEl, 'addEventListener')
  sel.open()
  const blocking = spy.mock.calls
    .filter((call) => { const options = call.arguments[2]; return typeof options === 'object' && options.passive === false })
    .map((call) => call.arguments[0])
  assert.deepEqual(blocking.sort(), ['touchmove', 'wheel'])
})

test('a wheel that the popup list can still scroll is left to the browser and does not reach the setting', () => {
  const { sel } = mount()
  sel.open()
  Object.defineProperty(sel.popupListEl, 'scrollHeight', { value: 200 })
  Object.defineProperty(sel.popupListEl, 'clientHeight', { value: 100 })
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  assert.equal(wheel(row, { deltaY: 3 }).defaultPrevented, false)
  assert.deepEqual(sel.seen, [])
  // At the top of the list, a wheel up has nothing left to scroll.
  assert.equal(wheel(row, { deltaY: -3 }).defaultPrevented, true)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'popup' }])
})

test('a wheel with ctrlKey, and any gesture while the page is zoomed, are left alone', () => {
  const { sel } = mount()
  sel.open()
  assert.equal(wheel(sel.popupEl, { deltaY: 3, ctrlKey: true }).defaultPrevented, false)
  Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true })
  assert.equal(wheel(sel.popupEl).defaultPrevented, false)
  touch('touchstart', sel.popupEl, [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchmove', sel.popupEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, false)
  assert.deepEqual(sel.seen, [])
})

test('a wheel on the trigger reaches the setting with the zone trigger, and the default lets the page scroll', () => {
  const { sel } = mount()
  sel.open()
  assert.equal(wheel(sel.triggerEl).defaultPrevented, false)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'trigger' }])
})

test('by default the library does not listen outside the select component', () => {
  const { sel, outside } = mount()
  sel.open()
  wheel(outside)
  touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }])
  assert.deepEqual(sel.seen, [])
})

test('with the Chromium preset, a wheel outside closes the popup with the gesture and lets the page scroll', () => {
  const { sel, outside, closes } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  assert.equal(wheel(outside).defaultPrevented, false)
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'scroll-gesture', scrollGesture: { kind: 'wheel', zone: 'outside' } }])
})

test('with the Firefox preset, a wheel outside is blocked and the popup stays open', () => {
  const { sel, outside, closes } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  assert.equal(wheel(outside).defaultPrevented, true)
  assert.equal(sel.isOpened(), true)
  assert.deepEqual(closes, [])
})

test('the listeners go with the close: a wheel after it reaches nothing', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  sel.close()
  assert.equal(wheel(sel.popupEl).defaultPrevented, false)
  assert.equal(wheel(outside).defaultPrevented, false)
  assert.deepEqual(sel.seen, [])
})

test('a subclass that overrides shouldListenForScrollGesturesOutside sees the outside, through scrollGestureToBehavior', () => {
  const { sel, outside } = mount({}, OutsideProbe)
  sel.open()
  assert.equal(wheel(outside).defaultPrevented, false)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'outside' }])
})

test('a one-finger drag inside the popup that the popup cannot scroll is blocked', () => {
  const { sel } = mount()
  sel.open()
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, true)
  touch('touchend', sel.popupListEl, [{ id: 1, x: 10, y: 20 }])
})

test('a drag in the popup list goes to the list while the list can scroll that way', () => {
  const { sel } = mount()
  sel.open()
  Object.defineProperty(sel.popupListEl, 'scrollHeight', { value: 200 })
  Object.defineProperty(sel.popupListEl, 'clientHeight', { value: 100 })
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  // A finger moving up scrolls the list down, which it still can.
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, false)
  // A finger moving down scrolls the list up, past its top.
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 60 }]).defaultPrevented, true)
  assert.deepEqual(sel.seen, [{ kind: 'touch-start', zone: 'popup' }, { kind: 'touch-drag', zone: 'popup' }])
})

test('a touch of two fingers is left alone', () => {
  const { sel } = mount()
  sel.open()
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }, { id: 2, x: 40, y: 50 }], [{ id: 2, x: 40, y: 50 }])
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }, { id: 2, x: 40, y: 80 }]).defaultPrevented, false)
  assert.deepEqual(sel.seen, [{ kind: 'touch-start', zone: 'popup' }])
})

test('with the Chromium preset, a touch-down on the trigger closes the popup and its click does not reopen it', () => {
  const { sel, closes } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'scroll-gesture', scrollGesture: { kind: 'touch-start', zone: 'trigger' } }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  sel.triggerEl.click()
  assert.equal(sel.isOpened(), false)
  // The next click is the user's own again.
  sel.triggerEl.click()
  assert.equal(sel.isOpened(), true)
  sel.close()
  assert.deepEqual(closes.at(-1), { reason: 'api' })
})

test('a touch on the trigger that moves gives no click, so a later click is the user\'s own', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchmove', sel.triggerEl, [{ id: 1, x: 5, y: 40 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 40 }])
  sel.triggerEl.click()
  assert.equal(sel.isOpened(), true)
})

test('when a tap\'s click has not come within a second, a later click is the user\'s own', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  t.mock.timers.tick(1000)
  sel.triggerEl.click()
  assert.equal(sel.isOpened(), true)
})

test('by default a tap on the trigger closes the popup through its click, as before', () => {
  const { sel, closes } = mount()
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  assert.equal(sel.isOpened(), true)
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  sel.triggerEl.click()
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'toggle' }])
})

test('with the Firefox preset, a touch-down outside closes the popup and the rest of that touch scrolls nothing', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(sel.isOpened(), false)
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 40 }]).defaultPrevented, true)
  touch('touchend', outside, [{ id: 1, x: 0, y: 40 }])
  touch('touchstart', outside, [{ id: 2, x: 0, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 2, x: 0, y: 40 }]).defaultPrevented, false)
})

test('a touch-down outside that closes swallows its click under outsideClickBehavior block, and not under pass-through', () => {
  for (const outsideClickBehavior of ['block', 'pass-through'] as const) {
    const { sel, outside } = mount({ ...behaviorPresetsOfChromiumOnWindows, outsideClickBehavior })
    let clicks = 0
    outside.addEventListener('click', () => { clicks++ })
    sel.open()
    touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }])
    touch('touchend', outside, [{ id: 1, x: 0, y: 0 }])
    // The browser follows a tap with a mousedown, then the click.
    const mousedown = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true })
    outside.dispatchEvent(mousedown)
    assert.equal(mousedown.defaultPrevented, outsideClickBehavior === 'block', outsideClickBehavior)
    outside.click()
    assert.equal(clicks, outsideClickBehavior === 'block' ? 0 : 1, outsideClickBehavior)
  }
})
