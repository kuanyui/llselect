import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { assertEveryListenerRemoved } from '../test-utils/listeners.js'
import { LLSelectSingle, type LLSelectSingleSettingsInput } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectCloseMeta } from '../src/base.js'
import { attachGestureListeners, type GestureHost, type LLSelectScrollGesture, type LLSelectScrollGestureBehavior, type LLSelectScrollGestureKind, type LLSelectScrollGestureZone, type LLSelectZoomGesture, type LLSelectZoomGestureBehavior, type LLSelectZoomGestureZone } from '../src/behaviors.js'
import {
  behaviorPresetsOfChromiumOnWindows,
  behaviorPresetsOfFirefoxOnWindows,
  behaviorPresetsOfLLSelectDefault,
  defaultScrollGestureToBehavior,
  defaultZoomGestureToBehavior,
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

const ZOOM_ZONES: LLSelectZoomGestureZone[] = ['popup', 'trigger', 'outside']

function zoomTable(fn: (g: LLSelectZoomGesture) => LLSelectZoomGestureBehavior): Record<string, LLSelectZoomGestureBehavior> {
  const out: Record<string, LLSelectZoomGestureBehavior> = {}
  for (const zone of ZOOM_ZONES) { out[zone] = fn({ zone }) }
  return out
}

test('the zoom answers: the default allows every zoom, Firefox blocks every zoom, Chromium blocks inside the popup and closes elsewhere', () => {
  assert.equal(behaviorPresetsOfLLSelectDefault.zoomGestureToBehaviorFn, defaultZoomGestureToBehavior)
  assert.deepEqual(zoomTable(defaultZoomGestureToBehavior), {
    popup: 'leave-popup-open-and-allow-page-zoom',
    trigger: 'leave-popup-open-and-allow-page-zoom',
    outside: 'leave-popup-open-and-allow-page-zoom',
  })
  assert.deepEqual(zoomTable(behaviorPresetsOfFirefoxOnWindows.zoomGestureToBehaviorFn), {
    popup: 'leave-popup-open-and-block-page-zoom',
    trigger: 'leave-popup-open-and-block-page-zoom',
    outside: 'leave-popup-open-and-block-page-zoom',
  })
  assert.deepEqual(zoomTable(behaviorPresetsOfChromiumOnWindows.zoomGestureToBehaviorFn), {
    popup: 'leave-popup-open-and-block-page-zoom',
    trigger: 'close-popup-and-allow-page-zoom',
    outside: 'close-popup-and-allow-page-zoom',
  })
})

// Records each gesture that reaches the setting. Wrapping the setting instead
// would hide the default function, and the library would listen outside.
class Probe extends LLSelectSingle<string> {
  public readonly seen: LLSelectScrollGesture[] = []
  public readonly zooms: LLSelectZoomGesture[] = []
  protected override scrollGestureToBehavior(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior {
    this.seen.push(gesture)
    return super.scrollGestureToBehavior(gesture)
  }
  protected override zoomGestureToBehavior(gesture: LLSelectZoomGesture): LLSelectZoomGestureBehavior {
    this.zooms.push(gesture)
    return super.zoomGestureToBehavior(gesture)
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

type Point = { id: number; x: number; y: number }

// jsdom has no Touch constructor, so the touch lists are plain look-alikes.
// A lift keeps `remaining` down; every other event has `points` down.
function touch(type: string, target: EventTarget, points: Point[], changed = points, remaining: Point[] = []): Event {
  const list = (ps: Point[]): TouchList => {
    const items = ps.map((p) => ({ identifier: p.id, clientX: p.x, clientY: p.y, target }))
    return { length: items.length, item: (i: number) => items[i] ?? null } as unknown as TouchList
  }
  const ev = new window.Event(type, { bubbles: true, cancelable: true, composed: true })
  const lifted = type === 'touchend' || type === 'touchcancel'
  Object.defineProperty(ev, 'touches', { value: list(lifted ? remaining : points) })
  Object.defineProperty(ev, 'changedTouches', { value: list(changed) })
  target.dispatchEvent(ev)
  return ev
}

function clickAt(target: EventTarget, x: number, y: number): MouseEvent {
  const ev = new window.MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  return ev
}

// A list that overflows by 100 px on the given axis.
function makeScrollable(el: HTMLElement, axis: 'x' | 'y'): void {
  if (axis === 'y') {
    Object.defineProperty(el, 'scrollHeight', { value: 200 })
    Object.defineProperty(el, 'clientHeight', { value: 100 })
  } else {
    el.style.overflowX = 'auto'
    Object.defineProperty(el, 'scrollWidth', { value: 200 })
    Object.defineProperty(el, 'clientWidth', { value: 100 })
  }
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
  // cancelable when the only non-passive listener sits on an ancestor. A
  // zoom cancels the touch-down of a second finger, hence `touchstart`.
  const { sel } = mount()
  const spy = t.mock.method(sel.popupEl, 'addEventListener')
  sel.open()
  const blocking = spy.mock.calls
    .filter((call) => { const options = call.arguments[2]; return typeof options === 'object' && options.passive === false })
    .map((call) => call.arguments[0])
  assert.deepEqual(blocking.sort(), ['touchmove', 'touchstart', 'wheel'])
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

test('a wheel with ctrlKey reaches the zoom setting, not the scroll setting, and the default lets it zoom', () => {
  const { sel } = mount()
  sel.open()
  assert.equal(wheel(sel.popupEl, { deltaY: 3, ctrlKey: true }).defaultPrevented, false)
  assert.deepEqual(sel.seen, [])
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }])
  // A list that could still scroll does not keep a zoom from the setting.
  makeScrollable(sel.popupListEl, 'y')
  wheel(sel.popupListEl, { deltaY: 3, ctrlKey: true })
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }, { zone: 'popup' }])
})

test('by default the library does not listen for zoom gestures outside the select component', () => {
  const { sel, outside } = mount()
  sel.open()
  wheel(outside, { deltaY: 3, ctrlKey: true })
  touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }, { id: 2, x: 50, y: 0 }])
  assert.deepEqual(sel.zooms, [])
})

test('with the Firefox preset, a wheel with ctrlKey is blocked everywhere, and the popup stays open', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  assert.equal(wheel(sel.popupEl, { deltaY: 3, ctrlKey: true }).defaultPrevented, true)
  assert.equal(wheel(sel.triggerEl, { deltaY: 3, ctrlKey: true }).defaultPrevented, true)
  assert.equal(wheel(outside, { deltaY: 3, ctrlKey: true }).defaultPrevented, true)
  assert.equal(sel.isOpened(), true)
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }, { zone: 'trigger' }, { zone: 'outside' }])
  assert.deepEqual(sel.seen, [])
})

test('with the Chromium preset, a wheel with ctrlKey is blocked inside the popup, and outside it closes the popup and zooms', () => {
  const { sel, outside, closes } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  assert.equal(wheel(sel.popupEl, { deltaY: 3, ctrlKey: true }).defaultPrevented, true)
  assert.equal(sel.isOpened(), true)
  assert.equal(wheel(outside, { deltaY: 3, ctrlKey: true }).defaultPrevented, false)
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'zoom-gesture', zoomGesture: { zone: 'outside' } }])
})

test('outside the select component, a group that does not listen there hears nothing, while the other group listens', () => {
  class ScrollOnlyOutside extends Probe {
    protected override shouldListenForZoomGesturesOutside(): boolean { return false }
  }
  const scroll = mount({ ...behaviorPresetsOfFirefoxOnWindows }, ScrollOnlyOutside)
  scroll.sel.open()
  assert.equal(wheel(scroll.outside, { deltaY: 3, ctrlKey: true }).defaultPrevented, false)
  assert.deepEqual(scroll.sel.zooms, [])
  assert.equal(wheel(scroll.outside).defaultPrevented, true)
  assert.deepEqual(scroll.sel.seen, [{ kind: 'wheel', zone: 'outside' }])

  class ZoomOnlyOutside extends Probe {
    protected override shouldListenForScrollGesturesOutside(): boolean { return false }
  }
  const zoom = mount({ ...behaviorPresetsOfFirefoxOnWindows }, ZoomOnlyOutside)
  zoom.sel.open()
  assert.equal(wheel(zoom.outside).defaultPrevented, false)
  touch('touchstart', zoom.outside, [{ id: 1, x: 0, y: 0 }])
  assert.deepEqual(zoom.sel.seen, [])
  assert.equal(zoom.sel.isOpened(), true)
  // The unasked touch-down still gives the zoom its zone.
  touch('touchstart', zoom.sel.popupEl, [{ id: 1, x: 0, y: 0 }, { id: 2, x: 50, y: 0 }], [{ id: 2, x: 50, y: 0 }])
  assert.deepEqual(zoom.sel.zooms, [{ zone: 'outside' }])
})

test('a zoom gesture reaches the zoom setting on a pinch-zoomed page too', () => {
  const { sel } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true })
  assert.equal(wheel(sel.popupEl, { deltaY: -3, ctrlKey: true }).defaultPrevented, true)
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }])
})

test('a pinch-zoomed page gets the same behavior as a page that is not zoomed', () => {
  const { sel } = mount()
  sel.open()
  Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true })
  assert.equal(wheel(sel.popupEl).defaultPrevented, true)
  touch('touchstart', sel.popupEl, [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchmove', sel.popupEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, true)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'popup' }, { kind: 'touch-start', zone: 'popup' }, { kind: 'touch-drag', zone: 'popup' }])
})

test('on a slightly pinch-zoomed page, the presets act as on a page that is not zoomed', () => {
  const chromium = mount({ ...behaviorPresetsOfChromiumOnWindows })
  chromium.sel.open()
  Object.defineProperty(window, 'visualViewport', { value: { scale: 1.05 }, configurable: true })
  assert.equal(wheel(chromium.outside).defaultPrevented, false)
  assert.deepEqual(chromium.closes, [{ reason: 'scroll-gesture', scrollGesture: { kind: 'wheel', zone: 'outside' } }])
  const firefox = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  firefox.sel.open()
  Object.defineProperty(window, 'visualViewport', { value: { scale: 1.05 }, configurable: true })
  assert.equal(wheel(firefox.outside).defaultPrevented, true)
  assert.equal(firefox.sel.isOpened(), true)
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
    let presses = 0
    outside.addEventListener('click', () => { clicks++ })
    outside.addEventListener('mousedown', () => { presses++ })
    sel.open()
    touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }])
    touch('touchend', outside, [{ id: 1, x: 0, y: 0 }])
    // The browser follows a tap with a mousedown, then the click. Under
    // 'block' the mousedown still reaches the page, as a blocked mouse press does.
    const mousedown = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true })
    outside.dispatchEvent(mousedown)
    assert.equal(mousedown.defaultPrevented, outsideClickBehavior === 'block', outsideClickBehavior)
    assert.equal(presses, 1, outsideClickBehavior)
    const click = clickAt(outside, 0, 0)
    assert.equal(click.defaultPrevented, outsideClickBehavior === 'block', outsideClickBehavior)
    assert.equal(clicks, outsideClickBehavior === 'block' ? 0 : 1, outsideClickBehavior)
    // Under 'block' the tap's click ends the hold, and under 'pass-through'
    // there is no hold, so a later press is the user's own.
    const later = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true })
    outside.dispatchEvent(later)
    assert.equal(later.defaultPrevented, false, outsideClickBehavior)
  }
})

test('a hold that ends removes every listener it added, with the same function and capture flag', (t) => {
  const { sel, outside } = mount({ ...behaviorPresetsOfChromiumOnWindows, outsideClickBehavior: 'block' })
  sel.open()
  // Spied after open(), so the added listeners recorded here are only the
  // hold's, not the listeners that open() adds to the document.
  const documentAdd = t.mock.method(document, 'addEventListener')
  const outsideAdd = t.mock.method(outside, 'addEventListener')
  const documentRemove = t.mock.method(document, 'removeEventListener')
  const outsideRemove = t.mock.method(outside, 'removeEventListener')
  touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }])
  assert.equal(sel.isOpened(), false)
  touch('touchend', outside, [{ id: 1, x: 0, y: 0 }])
  clickAt(outside, 0, 0)
  const cases = [
    { where: 'document', adds: documentAdd.mock.calls, removes: documentRemove.mock.calls, types: ['click', 'mousedown', 'touchstart'] },
    { where: 'touched node', adds: outsideAdd.mock.calls, removes: outsideRemove.mock.calls, types: ['touchcancel', 'touchend', 'touchmove'] },
  ]
  for (const { where, adds, removes, types } of cases) {
    assertEveryListenerRemoved(where, adds, removes, types)
  }
})

test('a copy of the default function, as the presets bundle holds, counts as the default', () => {
  // The two bundles share no code, so each holds its own copy, with the mark.
  const copy = (gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior => defaultScrollGestureToBehavior(gesture)
  Object.defineProperty(copy, Symbol.for('llselect.defaultScrollGestureToBehavior'), { value: true })
  const { sel, outside } = mount({ scrollGestureToBehaviorFn: copy })
  sel.open()
  wheel(outside)
  assert.deepEqual(sel.seen, [])
})

test('a second open attaches the listeners once', () => {
  const { sel } = mount()
  sel.open()
  sel.close()
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  wheel(row)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'popup' }])
})

test('while the library listens outside, a gesture inside the select component reaches the function once', () => {
  const { sel } = mount({}, OutsideProbe)
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  wheel(row)
  wheel(sel.triggerEl)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'popup' }, { kind: 'wheel', zone: 'trigger' }])
})

test('the popup list has overscroll-behavior: contain', () => {
  const { sel } = mount()
  assert.equal(sel.popupListEl.style.overscrollBehavior, 'contain')
})

test('a wheel at the bottom of the list, within a pixel of the end, is blocked', () => {
  const { sel } = mount()
  sel.open()
  makeScrollable(sel.popupListEl, 'y')
  Object.defineProperty(sel.popupListEl, 'scrollTop', { value: 99.5 })
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  assert.equal(wheel(row, { deltaY: 3 }).defaultPrevented, true)
  assert.equal(wheel(row, { deltaY: -3 }).defaultPrevented, false)
})

test('a scrollable element around the select component does not count as part of the popup', () => {
  const { sel } = mount()
  const page = document.getElementById('mount')?.parentElement
  assert.ok(page)
  page.style.overflowY = 'auto'
  makeScrollable(page, 'y')
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  assert.equal(wheel(row).defaultPrevented, true)
})

test('a sideways wheel goes to a list that scrolls sideways, left to right and right to left', () => {
  for (const direction of ['ltr', 'rtl'] as const) {
    const { sel } = mount()
    sel.open()
    makeScrollable(sel.popupListEl, 'x')
    sel.popupListEl.style.direction = direction
    // At the start edge: the left one, or the right one, where scrollLeft is 0.
    const row = sel.popupListEl.firstElementChild
    assert.ok(row)
    const towardEnd = direction === 'ltr' ? 3 : -3
    assert.equal(wheel(row, { deltaX: towardEnd }).defaultPrevented, false, direction)
    assert.equal(wheel(row, { deltaX: -towardEnd }).defaultPrevented, true, direction)
    // At the end edge, where a right-to-left box counts scrollLeft negative.
    Object.defineProperty(sel.popupListEl, 'scrollLeft', { value: direction === 'ltr' ? 100 : -100 })
    assert.equal(wheel(row, { deltaX: towardEnd }).defaultPrevented, true, direction)
    assert.equal(wheel(row, { deltaX: -towardEnd }).defaultPrevented, false, direction)
  }
})

test('a gesture inside an open shadow root in the popup counts as the popup', () => {
  let inner: HTMLElement | undefined
  const { sel } = mount({
    createPopupHeaderContentElFn: () => {
      const host = document.createElement('div')
      inner = document.createElement('span')
      host.attachShadow({ mode: 'open' }).appendChild(inner)
      return host
    },
  })
  sel.open()
  assert.ok(inner)
  assert.equal(wheel(inner).defaultPrevented, true)
  assert.deepEqual(sel.seen, [{ kind: 'wheel', zone: 'popup' }])
})

test('in a closed shadow root, a touch-down inside the popup reaches the function as outside, so its click is swallowed under block only', (t) => {
  for (const outsideClickBehavior of ['block', 'pass-through'] as const) {
    setupDom('<!doctype html><html><body><div id="host"></div><p id="outside">page</p></body></html>')
    const host = document.getElementById('host')
    const outside = document.getElementById('outside')
    assert.ok(host && outside)
    const el = document.createElement('div')
    host.attachShadow({ mode: 'closed' }).appendChild(el)
    const sel = new Probe(el, { scrollGestureToBehaviorFn: () => 'close-popup-and-allow-page-scroll', outsideClickBehavior })
    sel.setItems(['a', 'b', 'c'])
    let clicks = 0
    outside.addEventListener('click', () => { clicks++ })
    sel.open()
    const row = sel.popupListEl.firstElementChild
    assert.ok(row)
    const hostAdd = t.mock.method(host, 'addEventListener')
    touch('touchstart', row, [{ id: 1, x: 10, y: 10 }])
    assert.deepEqual(sel.seen, [{ kind: 'touch-start', zone: 'outside' }], outsideClickBehavior)
    assert.equal(sel.isOpened(), false, outsideClickBehavior)
    // Only a hold that swallows the click is attached, and it sits on the shadow host.
    const held = outsideClickBehavior === 'block' ? ['touchcancel', 'touchend', 'touchmove'] : []
    assert.deepEqual(hostAdd.mock.calls.map((call) => call.arguments[0]).sort(), held, outsideClickBehavior)
    touch('touchend', row, [{ id: 1, x: 10, y: 10 }])
    const click = clickAt(outside, 10, 10)
    assert.equal(click.defaultPrevented, outsideClickBehavior === 'block', outsideClickBehavior)
    assert.equal(clicks, outsideClickBehavior === 'block' ? 0 : 1, outsideClickBehavior)
  }
})

test('once a second finger lands where no listener saw it, the touch stays ignored', () => {
  const { sel } = mount()
  sel.open()
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 40 }, { id: 2, x: 300, y: 300 }])
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, false)
  assert.deepEqual(sel.seen, [{ kind: 'touch-start', zone: 'popup' }])
})

test('when one of two fingers lifts, the other one stays ignored', () => {
  const { sel } = mount()
  sel.open()
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }, { id: 2, x: 40, y: 50 }], [{ id: 2, x: 40, y: 50 }])
  touch('touchend', sel.popupListEl, [], [{ id: 2, x: 40, y: 50 }], [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, false)
})

test('with the Chromium preset, the rest of a touch that closed the popup scrolls as usual, through a passive listener', (t) => {
  const { sel, outside } = mount({ ...behaviorPresetsOfChromiumOnWindows, outsideClickBehavior: 'block' })
  const spy = t.mock.method(outside, 'addEventListener')
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 40 }]).defaultPrevented, false)
  const moveOptions = spy.mock.calls.find((call) => call.arguments[0] === 'touchmove')?.arguments[2]
  assert.deepEqual(moveOptions, { passive: true })
})

test('a touch that closed the popup gets no listener when nothing is blocked or swallowed', (t) => {
  const { sel, outside } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  const spy = t.mock.method(outside, 'addEventListener')
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(spy.mock.calls.map((call) => call.arguments[0]), [])
})

test('the rest of a touch whose node the close removed still ends, so a later touch is not blocked', () => {
  // The close rebuilds the arrow, so a touch on the arrow loses its node.
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows, createTriggerArrowContentElFn: () => document.createElement('i') })
  sel.open()
  const arrow = sel.triggerEl.parentElement?.querySelector('i')
  assert.ok(arrow)
  touch('touchstart', arrow, [{ id: 1, x: 5, y: 5 }])
  assert.equal(sel.isOpened(), false)
  assert.equal(arrow.isConnected, false)
  // The browser sends the rest of the touch to the removed node.
  assert.equal(touch('touchmove', arrow, [{ id: 1, x: 5, y: 60 }]).defaultPrevented, true)
  touch('touchend', arrow, [{ id: 1, x: 5, y: 60 }])
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 40 }]).defaultPrevented, false)
})

test('after a touch-down that closed the popup with a blocking behavior, a pinch is left alone', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }, { id: 2, x: 50, y: 100 }], [{ id: 2, x: 50, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 80 }, { id: 2, x: 50, y: 130 }], [{ id: 1, x: 0, y: 80 }]).defaultPrevented, false)
})

test('with a preset, a tap on the clear button closes the popup and still clears', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows, clearable: true })
  sel.setChosenItem('a')
  sel.open()
  const clear = sel.triggerButtonsEl?.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)
  assert.ok(clear)
  touch('touchstart', clear, [{ id: 1, x: 5, y: 5 }])
  assert.equal(sel.isOpened(), false)
  touch('touchend', clear, [{ id: 1, x: 5, y: 5 }])
  clickAt(clear, 5, 5)
  assert.equal(sel.getChosenItem(), undefined)
})

test('a touch-down that closes the popup from inside it swallows the click that would reach the page under it', () => {
  const { sel, outside } = mount({ scrollGestureToBehaviorFn: () => 'close-popup-and-allow-page-scroll' })
  let clicks = 0
  outside.addEventListener('click', () => { clicks++ })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  touch('touchstart', row, [{ id: 1, x: 10, y: 10 }])
  assert.equal(sel.isOpened(), false)
  touch('touchend', row, [{ id: 1, x: 10, y: 10 }])
  assert.equal(clickAt(outside, 10, 10).defaultPrevented, true)
  assert.equal(clicks, 0)
})

test('a click far from the touch-down is not the tap\'s click, so it is not swallowed', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  clickAt(sel.triggerEl, 300, 5)
  assert.equal(sel.isOpened(), true)
})

test('a touch that moved diagonally past the tap limit gives no click, so a later click is the user\'s own', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  // 12 px on each axis is 17 px away, past the 16 px limit.
  touch('touchmove', sel.triggerEl, [{ id: 1, x: 17, y: 17 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 17, y: 17 }])
  clickAt(sel.triggerEl, 5, 5)
  assert.equal(sel.isOpened(), true)
})

test('a canceled touch gives no click, so a later click is the user\'s own', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchcancel', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  clickAt(sel.triggerEl, 5, 5)
  assert.equal(sel.isOpened(), true)
})

test('the next touch ends the wait for a tap\'s click that never came', () => {
  // The blocked move of a wobbling tap can keep the browser from sending the click.
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchmove', sel.triggerEl, [{ id: 1, x: 7, y: 7 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 7, y: 7 }])
  touch('touchstart', outside, [{ id: 2, x: 5, y: 5 }])
  touch('touchend', outside, [{ id: 2, x: 5, y: 5 }])
  clickAt(sel.triggerEl, 5, 5)
  assert.equal(sel.isOpened(), true)
})

test('destroy() ends the rest of a touch that closed the popup', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  sel.destroy()
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 40 }]).defaultPrevented, false)
})

test('with a preset, a tap on a chip\'s text closes the popup and its click does not reopen it', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  const sel = new LLSelectMultiple<string>(el, { ...behaviorPresetsOfChromiumOnWindows, triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.open()
  const chipText = sel.triggerButtonsEl?.querySelector(`.${sel.classIdMap.tagTextClass}`)
  assert.ok(chipText)
  touch('touchstart', chipText, [{ id: 1, x: 5, y: 5 }])
  assert.equal(sel.isOpened(), false)
  touch('touchend', chipText, [{ id: 1, x: 5, y: 5 }])
  clickAt(chipText, 5, 5)
  assert.equal(sel.isOpened(), false)
})

test('a second finger ends the rest of a touch that closed the popup, so a pinch is not blocked and no click is swallowed', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows, outsideClickBehavior: 'block' })
  let clicks = 0
  outside.addEventListener('click', () => { clicks++ })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }, { id: 2, x: 50, y: 100 }], [{ id: 2, x: 50, y: 100 }])
  touch('touchend', outside, [], [{ id: 2, x: 50, y: 100 }], [{ id: 1, x: 0, y: 100 }])
  // Within the tap limit, so that only the end of the hold lets the click through.
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 95 }]).defaultPrevented, false)
  touch('touchend', outside, [{ id: 1, x: 0, y: 95 }])
  clickAt(outside, 0, 100)
  assert.equal(clicks, 1)
})

test('a second finger makes the touch a zoom, asked once with the zone of the first finger, and the answer holds until every finger lifts', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  touch('touchstart', row, [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchstart', outside, [{ id: 1, x: 10, y: 50 }, { id: 2, x: 200, y: 50 }], [{ id: 2, x: 200, y: 50 }]).defaultPrevented, true)
  assert.equal(touch('touchmove', row, [{ id: 1, x: 5, y: 50 }, { id: 2, x: 210, y: 50 }]).defaultPrevented, true)
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 50 }, { id: 2, x: 220, y: 50 }]).defaultPrevented, true)
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }])
  assert.equal(sel.isOpened(), true)
  // A lone finger after the zoom pans; neither setting hears of it.
  touch('touchend', outside, [], [{ id: 2, x: 220, y: 50 }], [{ id: 1, x: 0, y: 50 }])
  assert.equal(touch('touchmove', row, [{ id: 1, x: 0, y: 30 }]).defaultPrevented, false)
  touch('touchend', row, [], [{ id: 1, x: 0, y: 30 }], [])
  // A new touch asks again.
  touch('touchstart', row, [{ id: 3, x: 10, y: 50 }, { id: 4, x: 60, y: 50 }])
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }, { zone: 'popup' }])
})

test('a second finger seen first in a move still makes the touch a zoom', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  touch('touchstart', row, [{ id: 1, x: 10, y: 50 }])
  assert.equal(touch('touchmove', row, [{ id: 1, x: 12, y: 50 }, { id: 2, x: 300, y: 300 }]).defaultPrevented, true)
  assert.deepEqual(sel.zooms, [{ zone: 'popup' }])
  assert.equal(sel.isOpened(), true)
})

test('with the Chromium preset, two fingers that land together on the trigger close the popup with the zoom gesture and zoom', () => {
  const { sel, closes } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  const start = touch('touchstart', sel.triggerEl, [{ id: 1, x: 10, y: 10 }, { id: 2, x: 60, y: 10 }])
  assert.equal(start.defaultPrevented, false)
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'zoom-gesture', zoomGesture: { zone: 'trigger' } }])
  assert.equal(touch('touchmove', sel.triggerEl, [{ id: 1, x: 5, y: 10 }, { id: 2, x: 70, y: 10 }]).defaultPrevented, false)
})

test('a close that blocks the zoom holds the rest of the touch until every finger lifts', () => {
  const { sel, outside, closes } = mount({ zoomGestureToBehaviorFn: () => 'close-popup-and-block-page-zoom' })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  assert.equal(touch('touchstart', row, [{ id: 1, x: 10, y: 50 }, { id: 2, x: 60, y: 50 }]).defaultPrevented, true)
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, [{ reason: 'zoom-gesture', zoomGesture: { zone: 'popup' } }])
  assert.equal(touch('touchmove', row, [{ id: 1, x: 5, y: 50 }, { id: 2, x: 70, y: 50 }]).defaultPrevented, true)
  // The document part of the hold covers a finger whose events go elsewhere.
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 50 }, { id: 2, x: 80, y: 50 }]).defaultPrevented, true)
  // A lone finger pans.
  touch('touchend', row, [], [{ id: 2, x: 80, y: 50 }], [{ id: 1, x: 0, y: 50 }])
  assert.equal(touch('touchmove', row, [{ id: 1, x: 0, y: 30 }]).defaultPrevented, false)
  touch('touchend', row, [], [{ id: 1, x: 0, y: 30 }], [])
  assert.equal(touch('touchmove', row, [{ id: 3, x: 0, y: 50 }, { id: 4, x: 80, y: 50 }]).defaultPrevented, false)
})

test('destroy() ends the hold of a zoom that closed the popup and blocks the zoom', () => {
  const { sel } = mount({ zoomGestureToBehaviorFn: () => 'close-popup-and-block-page-zoom' })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  touch('touchstart', row, [{ id: 1, x: 10, y: 50 }, { id: 2, x: 60, y: 50 }])
  sel.destroy()
  assert.equal(touch('touchmove', row, [{ id: 1, x: 5, y: 50 }, { id: 2, x: 70, y: 50 }]).defaultPrevented, false)
})

test('the touch-down listeners can cancel a second finger: always on the popup and the root, on the document only while zooms outside are asked', (t) => {
  for (const zoomOutside of [false, true]) {
    setupDom('<!doctype html><html><body><div id="root"><div id="popup"></div></div></body></html>')
    const rootEl = document.getElementById('root')
    const popupEl = document.getElementById('popup')
    assert.ok(rootEl && popupEl)
    const adds = [popupEl, rootEl, document].map((target) => t.mock.method(target, 'addEventListener'))
    const detach = attachGestureListeners(gestureHost(rootEl, popupEl, { scrollOutside: true, zoomOutside }))
    const passiveOfTouchStart = adds.map((add) => {
      const options = add.mock.calls.find((call) => call.arguments[0] === 'touchstart')?.arguments[2]
      return typeof options === 'object' ? options.passive : undefined
    })
    assert.deepEqual(passiveOfTouchStart, [false, false, !zoomOutside], `zoomOutside ${zoomOutside}`)
    detach()
    for (const add of adds) { add.mock.restore() }
  }
})

test('a move with two touches, whose second touch-down no listener saw, also ends the hold', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfFirefoxOnWindows, outsideClickBehavior: 'block' })
  let clicks = 0
  outside.addEventListener('click', () => { clicks++ })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 98 }, { id: 2, x: 50, y: 100 }]).defaultPrevented, false)
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 95 }]).defaultPrevented, false)
  touch('touchend', outside, [{ id: 1, x: 0, y: 95 }])
  clickAt(outside, 0, 100)
  assert.equal(clicks, 1)
})

function gestureHost(rootEl: HTMLElement, popupEl: HTMLElement, overrides: Partial<GestureHost> = {}): GestureHost {
  return {
    rootEl,
    popupEl,
    scrollOutside: false,
    zoomOutside: false,
    behaviorFor: () => 'leave-popup-open-and-allow-page-scroll',
    closeFor: () => {},
    zoomBehaviorFor: () => 'leave-popup-open-and-allow-page-zoom',
    closeForZoom: () => {},
    clickToggles: () => false,
    swallowsOutsideClick: false,
    holdStarted: () => {},
    holdEnded: () => {},
    ...overrides,
  }
}

test('the function that attachGestureListeners returns removes every gesture listener, with the same function and capture flag', (t) => {
  setupDom('<!doctype html><html><body><div id="root"><div id="popup"></div></div></body></html>')
  const rootEl = document.getElementById('root')
  const popupEl = document.getElementById('popup')
  assert.ok(rootEl && popupEl)
  const popupAdd = t.mock.method(popupEl, 'addEventListener')
  const rootAdd = t.mock.method(rootEl, 'addEventListener')
  const documentAdd = t.mock.method(document, 'addEventListener')
  const detach = attachGestureListeners(gestureHost(rootEl, popupEl, { scrollOutside: true, zoomOutside: true }))
  const popupRemove = t.mock.method(popupEl, 'removeEventListener')
  const rootRemove = t.mock.method(rootEl, 'removeEventListener')
  const documentRemove = t.mock.method(document, 'removeEventListener')
  detach()
  const types = ['touchcancel', 'touchend', 'touchmove', 'touchstart', 'wheel']
  const cases = [
    { where: 'popup', adds: popupAdd.mock.calls, removes: popupRemove.mock.calls },
    { where: 'root element', adds: rootAdd.mock.calls, removes: rootRemove.mock.calls },
    { where: 'document', adds: documentAdd.mock.calls, removes: documentRemove.mock.calls },
  ]
  for (const { where, adds, removes } of cases) {
    assertEveryListenerRemoved(where, adds, removes, types)
  }
})

test('a hold that ends by itself reports its end with the function that started it', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  setupDom('<!doctype html><html><body><div id="root"><div id="popup"></div><span id="trigger">t</span></div></body></html>')
  const rootEl = document.getElementById('root')
  const popupEl = document.getElementById('popup')
  const trigger = document.getElementById('trigger')
  assert.ok(rootEl && popupEl && trigger)
  const started: Array<() => void> = []
  const ended: Array<() => void> = []
  const detach = attachGestureListeners(gestureHost(rootEl, popupEl, {
    behaviorFor: () => 'close-popup-and-allow-page-scroll',
    clickToggles: () => true,
    holdStarted: (release) => { started.push(release) },
    holdEnded: (release) => { ended.push(release) },
  }))
  touch('touchstart', trigger, [{ id: 1, x: 5, y: 5 }])
  touch('touchend', trigger, [{ id: 1, x: 5, y: 5 }])
  assert.deepEqual(ended, [])
  t.mock.timers.tick(1000)
  assert.equal(started.length, 1)
  assert.deepEqual(ended, started)
  detach()
})

test('a close from inside the popup stops the compatibility mousedown before it reaches the page under the popup', () => {
  const { sel, outside } = mount({ scrollGestureToBehaviorFn: () => 'close-popup-and-allow-page-scroll' })
  let pressed = 0
  outside.addEventListener('mousedown', () => { pressed++ })
  sel.open()
  const row = sel.popupListEl.firstElementChild
  assert.ok(row)
  touch('touchstart', row, [{ id: 1, x: 10, y: 10 }])
  touch('touchend', row, [{ id: 1, x: 10, y: 10 }])
  const mousedown = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })
  outside.dispatchEvent(mousedown)
  assert.equal(mousedown.defaultPrevented, true)
  assert.equal(pressed, 0)
})

test('a close from the trigger leaves the compatibility mousedown unprevented, so the trigger still takes focus', () => {
  const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
  sel.open()
  touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
  const mousedown = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 })
  sel.triggerEl.dispatchEvent(mousedown)
  assert.equal(mousedown.defaultPrevented, false)
})

test('destroy() also ends the wait for the tap\'s click', () => {
  const { sel, outside } = mount({ ...behaviorPresetsOfChromiumOnWindows, outsideClickBehavior: 'block' })
  let clicks = 0
  outside.addEventListener('click', () => { clicks++ })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 0 }])
  sel.destroy()
  touch('touchend', outside, [{ id: 1, x: 0, y: 0 }])
  clickAt(outside, 0, 0)
  assert.equal(clicks, 1)
})

test('the tap limit is 16 px: a move of 16 px still gives a click, a move of 17 px does not', () => {
  for (const [distance, swallowed] of [[16, true], [17, false]] as const) {
    const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
    sel.open()
    touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
    touch('touchmove', sel.triggerEl, [{ id: 1, x: 5, y: 5 + distance }])
    touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 + distance }])
    clickAt(sel.triggerEl, 5, 5)
    assert.equal(sel.isOpened(), !swallowed, `${distance} px`)
  }
})

test('the tap\'s click lands within 32 px of the touch-down; a click 33 px away is someone else\'s', () => {
  for (const [distance, swallowed] of [[32, true], [33, false]] as const) {
    const { sel } = mount({ ...behaviorPresetsOfChromiumOnWindows })
    sel.open()
    touch('touchstart', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
    touch('touchend', sel.triggerEl, [{ id: 1, x: 5, y: 5 }])
    clickAt(sel.triggerEl, 5 + distance, 5)
    assert.equal(sel.isOpened(), !swallowed, `${distance} px`)
  }
})

test('a close picked for a touch-drag blocks that one move only', () => {
  const closeAtDragOutside = (gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior =>
    gesture.kind === 'touch-drag' && gesture.zone === 'outside' ? 'close-popup-and-block-page-scroll' : 'leave-popup-open-and-allow-page-scroll'
  const { sel, outside } = mount({ scrollGestureToBehaviorFn: closeAtDragOutside })
  sel.open()
  touch('touchstart', outside, [{ id: 1, x: 0, y: 100 }])
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 80 }]).defaultPrevented, true)
  assert.equal(sel.isOpened(), false)
  assert.equal(touch('touchmove', outside, [{ id: 1, x: 0, y: 60 }]).defaultPrevented, false)
})

test('a page that gets pinch-zoomed during a touch still sends the rest of that touch', () => {
  const { sel } = mount()
  sel.open()
  touch('touchstart', sel.popupListEl, [{ id: 1, x: 10, y: 50 }])
  Object.defineProperty(window, 'visualViewport', { value: { scale: 2 }, configurable: true })
  assert.equal(touch('touchmove', sel.popupListEl, [{ id: 1, x: 10, y: 20 }]).defaultPrevented, true)
  assert.deepEqual(sel.seen, [{ kind: 'touch-start', zone: 'popup' }, { kind: 'touch-drag', zone: 'popup' }])
})
