/**
 * Scroll gestures while the popup is open: the types of the
 * `scrollGestureToBehaviorFn` setting, and the listeners that sort each
 * gesture and carry out the behavior the setting picks.
 * - The presets that fill the setting live in `@llselect/core/behavior-presets`.
 * - `base.ts` only wires the setting, the protected methods and these
 *   listeners.
 */

/**
 * What a scroll gesture is. See {@link LLSelectScrollGesture}.
 * - `'wheel'`: a `wheel` event, which a mouse wheel and a touchpad both give.
 * - `'touch-start'`: one finger touching down.
 * - `'touch-drag'`: one finger moving while it touches.
 * - `'touch-end'`: one finger lifting. The library does not send it.
 * @group Behaviors
 */
// TODO: send 'touch-end'. It is not implemented yet; the drag behaviors, a
// later behavior group in docs/llm/TODO.md, are its first user.
export type LLSelectScrollGestureKind = 'wheel' | 'touch-start' | 'touch-drag' | 'touch-end'

/**
 * Where a scroll gesture happens. See {@link LLSelectScrollGesture}.
 * - `'popup'`: inside the popup, its header, footer and filter input included.
 * - `'trigger'`: inside the root element, outside the popup.
 * - `'outside'`: anywhere else on the page.
 * @group Behaviors
 */
export type LLSelectScrollGestureZone = 'popup' | 'trigger' | 'outside'

/**
 * One scroll gesture while the popup is open, as `scrollGestureToBehaviorFn`
 * receives it.
 * - So that a user who needs a larger page can still zoom it, the library
 *   leaves a touch alone from the moment a second finger lands: the touch is
 *   then a zoom or a pan. A touch gesture counts only while one finger
 *   touches.
 * - A pinch starts with one finger, so the touch-down of that finger is a
 *   gesture like any other.
 * - A touch keeps the zone where it touched down, wherever it moves later.
 * @group Behaviors
 */
export interface LLSelectScrollGesture {
  /** What the gesture is. */
  readonly kind: LLSelectScrollGestureKind
  /** Where the gesture happens. */
  readonly zone: LLSelectScrollGestureZone
}

/**
 * What the select component does with one scroll gesture: keep the popup
 * open or close it, and let the page scroll or block it.
 * - `'leave-popup-open-and-allow-page-scroll'`: nothing happens; the browser
 *   scrolls as it would without the select component. Over the popup list,
 *   the browser may still stop such a scroll at the end of the list, which
 *   has the CSS property `overscroll-behavior: contain`.
 * - `'leave-popup-open-and-block-page-scroll'`: the popup stays open, and
 *   the gesture scrolls nothing.
 * - `'close-popup-and-allow-page-scroll'`: the popup closes, with the close
 *   reason `'scroll-gesture'`, and the gesture scrolls as usual.
 * - `'close-popup-and-block-page-scroll'`: the popup closes, with the close
 *   reason `'scroll-gesture'`, and the gesture scrolls nothing.
 * - A `'touch-start'` scrolls nothing by itself, so its page-scroll half acts
 *   only when the popup closes there: it then holds for the rest of that
 *   touch, until a second finger lands. While the popup stays open, each move
 *   of the touch asks again, as a `'touch-drag'`.
 * - A close picked for a `'touch-drag'` blocks that one move at most. The
 *   library sees no later move of that touch and blocks none of them.
 * - When a touch-down closes the popup, the click of that tap would reopen
 *   the popup, or land on what the popup covered. So the library swallows
 *   that click when the touch-down was:
 *   - on the trigger, except on a button of the trigger buttons strip, whose
 *     click does that button's action;
 *   - inside the popup;
 *   - outside the select component, while `outsideClickBehavior` is
 *     `'block'`.
 * - Only a click near the touch-down, within one second of the lift, counts
 *   as the tap's click.
 * @group Behaviors
 */
export type LLSelectScrollGestureBehavior =
  | 'leave-popup-open-and-allow-page-scroll'
  | 'leave-popup-open-and-block-page-scroll'
  | 'close-popup-and-allow-page-scroll'
  | 'close-popup-and-block-page-scroll'

/**
 * A set of behavior settings, spread into the settings of a select
 * component. The presets of `@llselect/core/behavior-presets` have this
 * shape.
 * @group Behaviors
 */
export interface LLSelectBehaviorPreset {
  /** See `scrollGestureToBehaviorFn` in `LLSelectBaseSettings`. */
  readonly scrollGestureToBehaviorFn: (gesture: LLSelectScrollGesture) => LLSelectScrollGestureBehavior
}

/**
 * The mark that `defaultScrollGestureToBehavior` carries. The main bundle and
 * the presets bundle each hold a copy of that function, so the library tests
 * for the mark, not for the identity.
 * @internal
 */
export const DEFAULT_SCROLL_GESTURE_TO_BEHAVIOR_MARK: unique symbol = Symbol.for('llselect.defaultScrollGestureToBehavior')

/**
 * What the listeners need from the select component.
 * @internal
 */
export interface ScrollGestureHost {
  readonly rootEl: HTMLElement
  readonly popupEl: HTMLElement
  /** The behavior for one gesture: the protected `scrollGestureToBehavior`. */
  behaviorFor(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior
  /** Closes the popup with the close reason `'scroll-gesture'`. */
  closeFor(gesture: LLSelectScrollGesture): void
  /** Whether a click with this composed path would toggle the popup: a click on the trigger wrapper, outside the buttons of the trigger buttons strip. */
  clickToggles(path: readonly EventTarget[]): boolean
  /** Whether a click outside the select component is swallowed while the popup is open: `outsideClickBehavior: 'block'`. */
  readonly swallowsOutsideClick: boolean
  /** Takes the function that ends a touch hold early, for `destroy()`. */
  holdStarted(release: () => void): void
  /** Told when that hold has ended, so the select component drops `release`. */
  holdEnded(release: () => void): void
}

// A touch that moves farther than this from its touch-down, in CSS pixels, is
// taken for a drag that gives no click. Chosen to stay above the browsers' own
// tap limits, which the real-device pass in docs/llm/TODO.md checks.
const TAP_SLOP = 16
// How long after the touch lifts a tap's click may still come. Browsers can
// hold it back by about 300 ms on a page without a mobile viewport.
const CLICK_WAIT_MS = 1000

// The events the listeners take, typed for an element and the document alike.
interface ScrollGestureEventMap {
  wheel: WheelEvent
  touchstart: TouchEvent
  touchmove: TouchEvent
  touchend: TouchEvent
  touchcancel: TouchEvent
}
interface ScrollGestureEventTarget {
  addEventListener<K extends keyof ScrollGestureEventMap>(type: K, listener: (ev: ScrollGestureEventMap[K]) => void, options: AddEventListenerOptions): void
  removeEventListener<K extends keyof ScrollGestureEventMap>(type: K, listener: (ev: ScrollGestureEventMap[K]) => void, options: AddEventListenerOptions): void
}

const PASSIVE: AddEventListenerOptions = { passive: true }
const NON_PASSIVE: AddEventListenerOptions = { passive: false }
const CAPTURE_PASSIVE: AddEventListenerOptions = { capture: true, passive: true }
const CAPTURE_NON_PASSIVE: AddEventListenerOptions = { capture: true, passive: false }

function closes(behavior: LLSelectScrollGestureBehavior): boolean {
  return behavior === 'close-popup-and-allow-page-scroll' || behavior === 'close-popup-and-block-page-scroll'
}

function blocks(behavior: LLSelectScrollGestureBehavior): boolean {
  return behavior === 'leave-popup-open-and-block-page-scroll' || behavior === 'close-popup-and-block-page-scroll'
}

// So that a user who needs a larger page can move around it, a gesture is left
// alone while the page is pinch-zoomed: it pans the visual viewport. Firefox
// before 91 on the desktop has no `visualViewport`, so a zoomed page reads as
// unzoomed there.
function isZoomed(): boolean {
  const viewport = window.visualViewport
  return viewport !== null && viewport !== undefined && viewport.scale > 1
}

// The touch target of a hold can be any node, an SVG element included, so its
// listeners take a plain `Event`.
function isTouchEvent(ev: Event): ev is TouchEvent {
  return 'changedTouches' in ev
}

function findTouch(list: TouchList, id: number): Touch | null {
  for (let i = 0; i < list.length; i++) {
    const t = list.item(i)
    if (t !== null && t.identifier === id) { return t }
  }
  return null
}

// Whether `el` can still scroll by the sign of (dx, dy). `scrollLeft` counts
// from the start edge, negative in a right-to-left box.
function canScroll(el: Element, dx: number, dy: number): boolean {
  const style = window.getComputedStyle(el)
  if (dy !== 0 && /auto|scroll|overlay/.test(style.overflowY)) {
    const max = el.scrollHeight - el.clientHeight
    if (dy > 0 ? el.scrollTop < max - 1 : el.scrollTop > 0) { return true }
  }
  if (dx !== 0 && /auto|scroll|overlay/.test(style.overflowX)) {
    const max = el.scrollWidth - el.clientWidth
    const fromStart = Math.abs(el.scrollLeft)
    const towardEnd = style.direction === 'rtl' ? dx < 0 : dx > 0
    if (towardEnd ? fromStart < max - 1 : fromStart > 0) { return true }
  }
  return false
}

// Whether an element on the event's composed path, up to `boundary`, can
// still take the scroll. The composed path crosses into open shadow roots.
function canScrollWithin(path: readonly EventTarget[], boundary: Element, dx: number, dy: number): boolean {
  for (const node of path) {
    if (node instanceof Element && canScroll(node, dx, dy)) { return true }
    if (node === boundary) { return false }
  }
  return false
}

// What a touch hold does with the compatibility `mousedown` of its tap.
// - `'leave'`: nothing; the trigger's own `mousedown` handler keeps DOM focus right.
// - `'prevent-default'`: the contract of an outside press under `outsideClickBehavior: 'block'`.
// - `'swallow'`: the page under the closed popup was never touched on purpose.
type TouchHoldMousedown = 'leave' | 'prevent-default' | 'swallow'

interface TouchHoldOptions {
  /** Whether the moves of the touch scroll nothing. */
  readonly block: boolean
  /** Whether the click of the tap is swallowed. */
  readonly swallowClick: boolean
  /** What happens to the compatibility `mousedown`, while the click is swallowed. */
  readonly mousedown: TouchHoldMousedown
  /** Called once, when the hold ends by itself or through the returned function. */
  readonly ended: () => void
}

/**
 * Holds the rest of a touch whose touch-down closed the popup.
 * - Returns the function that ends the hold early.
 * - The listeners of the touch sit on its own target, which gets every later
 *   event of the touch, even after the close removed that node from the
 *   document.
 * - Its moves scroll nothing while `block` is set.
 * - When `swallowClick` is set, its click is swallowed: the first click near
 *   the touch-down, within one second of the lift.
 * - The hold ends when the touch is over and its click came or cannot come,
 *   and at any later touch-down: a second finger makes a pinch, which gives
 *   no click, and a new touch shows that the held one is over.
 */
function holdRestOfTouch(target: EventTarget, start: Touch, options: TouchHoldOptions): () => void {
  const { block, swallowClick, mousedown } = options
  let moved = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let touchDone = false
  let clickDone = !swallowClick
  let ended = false
  const moveOptions: AddEventListenerOptions = { passive: !block }
  const near = (x: number, y: number, limit: number): boolean => Math.hypot(x - start.clientX, y - start.clientY) <= limit
  const onMove = (ev: Event): void => {
    if (!isTouchEvent(ev)) { return }
    if (ev.touches.length > 1) {
      release()
      return
    }
    const t = findTouch(ev.changedTouches, start.identifier)
    if (t === null) { return }
    if (!near(t.clientX, t.clientY, TAP_SLOP)) { moved = true }
    if (block && ev.cancelable) { ev.preventDefault() }
  }
  const onEnd = (ev: Event): void => {
    if (!isTouchEvent(ev) || findTouch(ev.changedTouches, start.identifier) === null) { return }
    endTouch()
    if (moved || ev.type === 'touchcancel') { endClick(); return }
    if (!clickDone) { timer = setTimeout(endClick, CLICK_WAIT_MS) }
  }
  const onNextTouchStart = (): void => { release() }
  // A click far from the touch-down came from something else, such as a mouse.
  const isTapClick = (ev: MouseEvent): boolean => near(ev.clientX, ev.clientY, 2 * TAP_SLOP)
  const onMousedown = (ev: MouseEvent): void => {
    if (!isTapClick(ev)) { return }
    ev.preventDefault()
    if (mousedown === 'swallow') { ev.stopPropagation() }
  }
  const onClick = (ev: MouseEvent): void => {
    if (!isTapClick(ev)) { return }
    ev.preventDefault()
    ev.stopPropagation()
    endClick()
  }
  const finish = (): void => {
    if (!touchDone || !clickDone || ended) { return }
    ended = true
    document.removeEventListener('touchstart', onNextTouchStart, CAPTURE_PASSIVE)
    options.ended()
  }
  const endTouch = (): void => {
    if (touchDone) { return }
    touchDone = true
    target.removeEventListener('touchmove', onMove, moveOptions)
    target.removeEventListener('touchend', onEnd, PASSIVE)
    target.removeEventListener('touchcancel', onEnd, PASSIVE)
    finish()
  }
  const endClick = (): void => {
    if (clickDone) { return }
    clickDone = true
    if (timer !== undefined) { clearTimeout(timer) }
    document.removeEventListener('mousedown', onMousedown, true)
    document.removeEventListener('click', onClick, true)
    finish()
  }
  const release = (): void => {
    endTouch()
    endClick()
  }
  target.addEventListener('touchmove', onMove, moveOptions)
  target.addEventListener('touchend', onEnd, PASSIVE)
  target.addEventListener('touchcancel', onEnd, PASSIVE)
  document.addEventListener('touchstart', onNextTouchStart, CAPTURE_PASSIVE)
  if (swallowClick) {
    if (mousedown !== 'leave') { document.addEventListener('mousedown', onMousedown, true) }
    document.addEventListener('click', onClick, true)
  }
  return release
}

/**
 * Attaches the scroll-gesture listeners for one open cycle; the returned
 * function detaches them.
 * - On the popup: a `wheel` listener and the touch listeners, which see the
 *   zone `'popup'`. Chromium 156 makes a wheel over the top-layer popup
 *   cancelable only for a non-passive listener on the popup itself, not on
 *   an ancestor such as the root element.
 * - On the root element: the same listeners, which see the zone `'trigger'`
 *   and skip the gestures of the popup.
 * - On the document, only when `listenOutside` is set: the same listeners in
 *   the capture phase, which see the zone `'outside'`. A non-passive `wheel`
 *   or `touchmove` listener there makes every scroll of the page wait for
 *   script, so the default behavior, which leaves the outside alone, does not
 *   attach them.
 * - A wheel or a drag inside the popup that something in the popup can still
 *   scroll is left to the browser and does not reach `behaviorFor`. A
 *   touch-down always reaches it, since it has no direction yet.
 * - A `wheel` with `ctrlKey`, a touch from the moment a second finger lands,
 *   and any gesture while the page is pinch-zoomed are left alone.
 * - In a closed shadow root around the select component, the document sees
 *   no deeper than the shadow host, so every gesture there reads as
 *   `'outside'` to the document's listeners.
 * @internal
 */
export function attachScrollGestureListeners(host: ScrollGestureHost, listenOutside: boolean): () => void {
  // The touch that is going on, from its touch-down to its lift.
  let touch: { id: number; x: number; y: number; zone: LLSelectScrollGestureZone; path: readonly EventTarget[] } | null = null
  // True from a second finger's touch-down until every finger lifts.
  let multiTouch = false

  // The composed path crosses into open shadow roots, which `contains` does not.
  const zoneOf = (path: readonly EventTarget[]): LLSelectScrollGestureZone => {
    if (path.includes(host.popupEl)) { return 'popup' }
    if (path.includes(host.rootEl)) { return 'trigger' }
    return 'outside'
  }
  const carryOut = (gesture: LLSelectScrollGesture, ev: Event): void => {
    const behavior = host.behaviorFor(gesture)
    if (blocks(behavior) && ev.cancelable) { ev.preventDefault() }
    if (closes(behavior)) { host.closeFor(gesture) }
  }

  const onWheel = (ev: WheelEvent): void => {
    if (ev.ctrlKey || isZoomed()) { return }
    const path = ev.composedPath()
    const zone = zoneOf(path)
    if (zone === 'popup' && canScrollWithin(path, host.popupEl, Math.sign(ev.deltaX), Math.sign(ev.deltaY))) { return }
    carryOut({ kind: 'wheel', zone }, ev)
  }
  const onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length !== 1) {
      touch = null
      multiTouch = true
      return
    }
    multiTouch = false
    touch = null
    if (isZoomed()) { return }
    const t = ev.touches.item(0)
    const path = ev.composedPath()
    const target = path[0]
    if (t === null || target === undefined) { return }
    const zone = zoneOf(path)
    touch = { id: t.identifier, x: t.clientX, y: t.clientY, zone, path }
    const gesture: LLSelectScrollGesture = { kind: 'touch-start', zone }
    const behavior = host.behaviorFor(gesture)
    if (!closes(behavior)) { return }
    touch = null
    // The click of the tap would reopen the popup on the trigger, and reach
    // the page under the closed popup inside it. A button of the trigger
    // buttons strip keeps its click: those buttons toggle nothing.
    const swallowClick = zone === 'popup' || (zone === 'trigger' && host.clickToggles(path)) || (zone === 'outside' && host.swallowsOutsideClick)
    const block = blocks(behavior)
    if (block || swallowClick) {
      const release = holdRestOfTouch(target, t, {
        block,
        swallowClick,
        mousedown: zone === 'trigger' ? 'leave' : zone === 'outside' ? 'prevent-default' : 'swallow',
        ended: () => { host.holdEnded(release) },
      })
      host.holdStarted(release)
    }
    host.closeFor(gesture)
  }
  const onTouchMove = (ev: TouchEvent): void => {
    if (ev.touches.length > 1) {
      // A second finger may have landed where no listener saw it.
      touch = null
      multiTouch = true
      return
    }
    if (touch === null || multiTouch || isZoomed()) { return }
    const t = findTouch(ev.touches, touch.id)
    if (t === null) { return }
    // The content scrolls against the finger.
    const dx = touch.x - t.clientX
    const dy = touch.y - t.clientY
    touch.x = t.clientX
    touch.y = t.clientY
    if (dx === 0 && dy === 0) { return }
    if (touch.zone === 'popup' && canScrollWithin(touch.path, host.popupEl, Math.sign(dx), Math.sign(dy))) { return }
    carryOut({ kind: 'touch-drag', zone: touch.zone }, ev)
  }
  const onTouchEnd = (ev: TouchEvent): void => {
    if (ev.touches.length > 0) { return }
    touch = null
    multiTouch = false
  }

  // Attaches the five listeners to `target`, each passing over the events
  // that `skip` names, and returns the function that removes them.
  const listen = (target: ScrollGestureEventTarget, skip: (ev: Event) => boolean, capture: boolean): (() => void) => {
    const blocking = capture ? CAPTURE_NON_PASSIVE : NON_PASSIVE
    const passive = capture ? CAPTURE_PASSIVE : PASSIVE
    const wheel = (ev: WheelEvent): void => { if (!skip(ev)) { onWheel(ev) } }
    const start = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchStart(ev) } }
    const move = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchMove(ev) } }
    const end = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchEnd(ev) } }
    target.addEventListener('wheel', wheel, blocking)
    target.addEventListener('touchstart', start, passive)
    target.addEventListener('touchmove', move, blocking)
    target.addEventListener('touchend', end, passive)
    target.addEventListener('touchcancel', end, passive)
    return (): void => {
      target.removeEventListener('wheel', wheel, blocking)
      target.removeEventListener('touchstart', start, passive)
      target.removeEventListener('touchmove', move, blocking)
      target.removeEventListener('touchend', end, passive)
      target.removeEventListener('touchcancel', end, passive)
    }
  }
  const detachers = [
    listen(host.popupEl, () => false, false),
    // The popup's own listeners handle its gestures.
    listen(host.rootEl, (ev) => ev.composedPath().includes(host.popupEl), false),
  ]
  if (listenOutside) {
    // The document sees an inside gesture first, in the capture phase; the
    // listeners above handle those.
    detachers.push(listen(document, (ev) => ev.composedPath().includes(host.rootEl), true))
  }
  return (): void => {
    for (const detach of detachers) { detach() }
  }
}
