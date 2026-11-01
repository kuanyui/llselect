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
 * - A touch gesture counts only while one finger touches; a second finger
 *   makes it a zoom or a pan, which the library leaves alone.
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
 *   scrolls as it would without the select component.
 * - `'leave-popup-open-and-block-page-scroll'`: the popup stays open, and
 *   the gesture scrolls nothing.
 * - `'close-popup-and-allow-page-scroll'`: the popup closes, with the close
 *   reason `'scroll-gesture'`, and the gesture scrolls as usual.
 * - `'close-popup-and-block-page-scroll'`: the popup closes, with the close
 *   reason `'scroll-gesture'`, and the gesture scrolls nothing.
 * - A `'touch-start'` scrolls nothing by itself, so its page-scroll half acts
 *   only when the popup closes there: it then holds for the rest of that
 *   touch. While the popup stays open, each move of the touch asks again, as
 *   a `'touch-drag'`.
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
 * What the listeners need from the select component.
 * @internal
 */
export interface ScrollGestureHost {
  readonly rootEl: HTMLElement
  readonly popupEl: HTMLElement
  /** The node an event actually hit, through an open shadow root. */
  targetOf(ev: Event): EventTarget | null
  /** The behavior for one gesture: the protected `scrollGestureToBehavior`. */
  behaviorFor(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior
  /** Closes the popup with the close reason `'scroll-gesture'`. */
  closeFor(gesture: LLSelectScrollGesture): void
  /** Whether a click outside the select component is swallowed while the popup is open: `outsideClickBehavior: 'block'`. */
  readonly swallowsOutsideClick: boolean
}

// A touch that moves farther than this, in CSS pixels, gives no click.
const TAP_SLOP = 10
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

// While the page is pinch-zoomed, a gesture pans the visual viewport.
function isZoomed(): boolean {
  const viewport = window.visualViewport
  return viewport !== null && viewport !== undefined && viewport.scale > 1
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

// Whether an element from `node` up to `boundary` can still take the scroll.
function canScrollWithin(node: EventTarget | null, boundary: Element, dx: number, dy: number): boolean {
  let el: Element | null = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
  while (el !== null) {
    if (canScroll(el, dx, dy)) { return true }
    if (el === boundary) { return false }
    el = el.parentElement
  }
  return false
}

/**
 * The rest of a touch whose touch-down closed the popup: its moves scroll
 * nothing when `block` is set, and its click is swallowed when `swallowClick`
 * is set, so that a tap on the trigger does not reopen the popup. Removes
 * itself when the touch is over.
 */
function holdRestOfTouch(start: Touch, block: boolean, swallowClick: boolean, swallowMousedown: boolean): void {
  let moved = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const onMove = (ev: TouchEvent): void => {
    const t = findTouch(ev.changedTouches, start.identifier)
    if (t === null) { return }
    if (Math.abs(t.clientX - start.clientX) > TAP_SLOP || Math.abs(t.clientY - start.clientY) > TAP_SLOP) { moved = true }
    if (block && ev.cancelable) { ev.preventDefault() }
  }
  const onEnd = (ev: TouchEvent): void => {
    if (findTouch(ev.changedTouches, start.identifier) === null) { return }
    removeTouchListeners()
    if (!swallowClick || moved || ev.type === 'touchcancel') { removeClickListeners(); return }
    timer = setTimeout(removeClickListeners, CLICK_WAIT_MS)
  }
  const onMousedown = (ev: MouseEvent): void => { ev.preventDefault() }
  const onClick = (ev: MouseEvent): void => {
    ev.preventDefault()
    ev.stopPropagation()
    removeClickListeners()
  }
  const removeTouchListeners = (): void => {
    document.removeEventListener('touchmove', onMove, CAPTURE_NON_PASSIVE)
    document.removeEventListener('touchend', onEnd, CAPTURE_PASSIVE)
    document.removeEventListener('touchcancel', onEnd, CAPTURE_PASSIVE)
  }
  const removeClickListeners = (): void => {
    if (timer !== undefined) { clearTimeout(timer) }
    document.removeEventListener('mousedown', onMousedown, true)
    document.removeEventListener('click', onClick, true)
  }
  document.addEventListener('touchmove', onMove, CAPTURE_NON_PASSIVE)
  document.addEventListener('touchend', onEnd, CAPTURE_PASSIVE)
  document.addEventListener('touchcancel', onEnd, CAPTURE_PASSIVE)
  if (swallowClick) {
    if (swallowMousedown) { document.addEventListener('mousedown', onMousedown, true) }
    document.addEventListener('click', onClick, true)
  }
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
 * - A gesture inside the popup that something in the popup can still scroll
 *   is left to the browser and does not reach `behaviorFor`.
 * - A `wheel` with `ctrlKey`, a touch of more than one finger, and any
 *   gesture while the page is pinch-zoomed are left alone.
 * @internal
 */
export function attachScrollGestureListeners(host: ScrollGestureHost, listenOutside: boolean): () => void {
  // The touch that is going on, from its touch-down to its lift.
  let touch: { id: number; x: number; y: number; zone: LLSelectScrollGestureZone; node: EventTarget | null } | null = null
  // True from a second finger's touch-down until every finger lifts.
  let multiTouch = false

  const zoneOf = (node: EventTarget | null): LLSelectScrollGestureZone => {
    if (node instanceof Node && host.popupEl.contains(node)) { return 'popup' }
    if (node instanceof Node && host.rootEl.contains(node)) { return 'trigger' }
    return 'outside'
  }
  const isWithin = (ev: Event, el: HTMLElement): boolean => {
    const node = host.targetOf(ev)
    return node instanceof Node && el.contains(node)
  }
  const carryOut = (gesture: LLSelectScrollGesture, ev: Event): void => {
    const behavior = host.behaviorFor(gesture)
    if (blocks(behavior) && ev.cancelable) { ev.preventDefault() }
    if (closes(behavior)) { host.closeFor(gesture) }
  }

  const onWheel = (ev: WheelEvent): void => {
    if (ev.ctrlKey || isZoomed()) { return }
    const node = host.targetOf(ev)
    const zone = zoneOf(node)
    if (zone === 'popup' && canScrollWithin(node, host.popupEl, Math.sign(ev.deltaX), Math.sign(ev.deltaY))) { return }
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
    if (t === null) { return }
    const node = host.targetOf(ev)
    const zone = zoneOf(node)
    touch = { id: t.identifier, x: t.clientX, y: t.clientY, zone, node }
    const gesture: LLSelectScrollGesture = { kind: 'touch-start', zone }
    const behavior = host.behaviorFor(gesture)
    if (!closes(behavior)) { return }
    touch = null
    const swallowClick = zone === 'trigger' || (zone === 'outside' && host.swallowsOutsideClick)
    holdRestOfTouch(t, blocks(behavior), swallowClick, zone === 'outside')
    host.closeFor(gesture)
  }
  const onTouchMove = (ev: TouchEvent): void => {
    if (touch === null || multiTouch || ev.touches.length !== 1) { return }
    const t = findTouch(ev.touches, touch.id)
    if (t === null) { return }
    // The content scrolls against the finger.
    const dx = touch.x - t.clientX
    const dy = touch.y - t.clientY
    touch.x = t.clientX
    touch.y = t.clientY
    if (dx === 0 && dy === 0) { return }
    if (touch.zone === 'popup' && canScrollWithin(touch.node, host.popupEl, Math.sign(dx), Math.sign(dy))) { return }
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
    listen(host.rootEl, (ev) => isWithin(ev, host.popupEl), false),
  ]
  if (listenOutside) {
    // The document sees an inside gesture first, in the capture phase; the
    // listeners above handle those.
    detachers.push(listen(document, (ev) => isWithin(ev, host.rootEl), true))
  }
  return (): void => {
    for (const detach of detachers) { detach() }
  }
}
