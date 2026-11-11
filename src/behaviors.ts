/**
 * Scroll and zoom gestures while the popup is open: the types of the
 * `behaviorOfScrollGestureFn` and `behaviorOfZoomGestureFn` settings, and the
 * listeners that sort each gesture and carry out the behavior a setting picks.
 * - The presets that fill the setting live in `@llselect/core/behavior-presets`.
 * - `base.ts` only wires the setting, the protected methods and these
 *   listeners.
 */
import type { LLSelectOutsideClickBehavior } from './base.js'

/**
 * What a scroll gesture is. See {@link LLSelectScrollGesture}.
 * - `'wheel'`: a `wheel` event, which a mouse wheel and a touchpad both give.
 *   A `wheel` with `ctrlKey` is a zoom gesture instead; see
 *   {@link LLSelectZoomGesture}.
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
 * One scroll gesture while the popup is open, as `behaviorOfScrollGestureFn`
 * receives it.
 * - A touch counts as a scroll gesture only while one finger touches. From
 *   the moment a second finger lands until every finger lifts, the touch is
 *   a zoom gesture, which `behaviorOfZoomGestureFn` answers; see
 *   {@link LLSelectZoomGesture}.
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
 *   - outside the select component, while `behaviorOfOutsideClick` is
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
 * Where a zoom gesture happens. See {@link LLSelectZoomGesture}.
 * - `'popup'`: inside the popup, its header, footer and filter input included.
 * - `'trigger'`: inside the root element, outside the popup.
 * - `'outside'`: anywhere else on the page.
 * - The scroll gestures have a type of their own with the same values,
 *   {@link LLSelectScrollGestureZone}, so that each type can change alone.
 * @group Behaviors
 */
export type LLSelectZoomGestureZone = 'popup' | 'trigger' | 'outside'

/**
 * One zoom gesture while the popup is open, as `behaviorOfZoomGestureFn`
 * receives it.
 * - On a touchscreen, a touch becomes a zoom gesture when a second finger
 *   lands, and stays one until every finger lifts.
 * - Its zone is where the first finger touched down. If both fingers land
 *   in one event, the zone is where that event happens.
 * - Every `wheel` with `ctrlKey` is a zoom gesture of its own, whose zone is
 *   where the pointer is. Ctrl with a mouse wheel gives such a wheel, and so
 *   does a touchpad pinch in Chromium; the page cannot tell the two apart.
 * @group Behaviors
 */
export interface LLSelectZoomGesture {
  /** Where the zoom happens. */
  readonly zone: LLSelectZoomGestureZone
}

/**
 * What the select component does with one zoom gesture: keep the popup open
 * or close it, and let the page zoom or block it.
 * - `'leave-popup-open-and-allow-page-zoom'`: nothing happens; the browser
 *   zooms as it would without the select component.
 * - `'leave-popup-open-and-block-page-zoom'`: the popup stays open, and the
 *   gesture does not zoom the page.
 * - `'close-popup-and-allow-page-zoom'`: the popup closes, with the close
 *   reason `'zoom-gesture'`, and the page zooms as usual.
 * - `'close-popup-and-block-page-zoom'`: the popup closes, with the close
 *   reason `'zoom-gesture'`, and the gesture does not zoom the page.
 * - On a touchscreen, the answer holds until every finger lifts, also after
 *   a close.
 * - For a `wheel` with `ctrlKey`, the answer covers that one event. The next
 *   one asks again while the popup is open.
 * - The library blocks a zoom by canceling its events. A browser may still
 *   zoom when it sends them as not cancelable.
 * @group Behaviors
 */
export type LLSelectZoomGestureBehavior =
  | 'leave-popup-open-and-allow-page-zoom'
  | 'leave-popup-open-and-block-page-zoom'
  | 'close-popup-and-allow-page-zoom'
  | 'close-popup-and-block-page-zoom'

/**
 * A set of behavior settings, spread into the settings of a select
 * component. The presets of `@llselect/core/behavior-presets` have this
 * shape.
 * @group Behaviors
 */
export interface LLSelectBehaviorPreset {
  /** See `behaviorOfOutsideClick` in `LLSelectBaseSettings`. */
  readonly behaviorOfOutsideClick: LLSelectOutsideClickBehavior
  /** See `behaviorOfScrollGestureFn` in `LLSelectBaseSettings`. */
  readonly behaviorOfScrollGestureFn: (gesture: LLSelectScrollGesture) => LLSelectScrollGestureBehavior
  /** See `behaviorOfZoomGestureFn` in `LLSelectBaseSettings`. */
  readonly behaviorOfZoomGestureFn: (gesture: LLSelectZoomGesture) => LLSelectZoomGestureBehavior
}

/**
 * The mark that `defaultBehaviorOfScrollGesture` carries. The main bundle and
 * the presets bundle each hold a copy of that function, so the library tests
 * for the mark, not for the identity.
 * @internal
 */
export const DEFAULT_BEHAVIOR_OF_SCROLL_GESTURE_MARK: unique symbol = Symbol.for('llselect.defaultBehaviorOfScrollGesture')

/**
 * The mark that `defaultBehaviorOfZoomGesture` carries, for the reason of
 * {@link DEFAULT_BEHAVIOR_OF_SCROLL_GESTURE_MARK}.
 * @internal
 */
export const DEFAULT_BEHAVIOR_OF_ZOOM_GESTURE_MARK: unique symbol = Symbol.for('llselect.defaultBehaviorOfZoomGesture')

/**
 * What the listeners need from the select component.
 * @internal
 */
export interface GestureHost {
  readonly rootEl: HTMLElement
  readonly popupEl: HTMLElement
  /** Whether scroll gestures outside the select component reach `behaviorFor`: the protected `shouldListenForScrollGesturesOutside`. */
  readonly scrollOutside: boolean
  /** Whether zoom gestures outside the select component reach `zoomBehaviorFor`: the protected `shouldListenForZoomGesturesOutside`. */
  readonly zoomOutside: boolean
  /** The behavior for one scroll gesture: the protected `behaviorOfScrollGesture`. */
  behaviorFor(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior
  /** Closes the popup with the close reason `'scroll-gesture'`. */
  closeFor(gesture: LLSelectScrollGesture): void
  /** The behavior for one zoom gesture: the protected `behaviorOfZoomGesture`. */
  zoomBehaviorFor(gesture: LLSelectZoomGesture): LLSelectZoomGestureBehavior
  /** Closes the popup with the close reason `'zoom-gesture'`. */
  closeForZoom(gesture: LLSelectZoomGesture): void
  /** Whether a click with this composed path would toggle the popup: a click on the trigger wrapper, outside the buttons of the trigger buttons strip. */
  clickToggles(path: readonly EventTarget[]): boolean
  /** Whether a click outside the select component is swallowed while the popup is open: `behaviorOfOutsideClick: 'block'`. */
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
interface GestureEventMap {
  wheel: WheelEvent
  touchstart: TouchEvent
  touchmove: TouchEvent
  touchend: TouchEvent
  touchcancel: TouchEvent
}
interface GestureEventTarget {
  addEventListener<K extends keyof GestureEventMap>(type: K, listener: (ev: GestureEventMap[K]) => void, options: AddEventListenerOptions): void
  removeEventListener<K extends keyof GestureEventMap>(type: K, listener: (ev: GestureEventMap[K]) => void, options: AddEventListenerOptions): void
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

function zoomCloses(behavior: LLSelectZoomGestureBehavior): boolean {
  return behavior === 'close-popup-and-allow-page-zoom' || behavior === 'close-popup-and-block-page-zoom'
}

function zoomBlocks(behavior: LLSelectZoomGestureBehavior): boolean {
  return behavior === 'leave-popup-open-and-block-page-zoom' || behavior === 'close-popup-and-block-page-zoom'
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
// - `'leave'`: nothing; a press on the trigger focuses it natively, and
//   `handleTriggerWrapperMousedown` focuses it for a press elsewhere in the
//   trigger wrapper, unless the `mousedown` was prevented.
// - `'prevent-default'`: the contract of an outside press under `behaviorOfOutsideClick: 'block'`.
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
 * - In a closed shadow root around the select component, the document's
 *   listeners see no deeper than the shadow host:
 *   - A hold that the document's listeners start sits on the shadow host,
 *     not on the touch's own target.
 *   - If the close removed the node that the touch started on, the shadow
 *     host may miss the rest of the touch, as inferred from the code.
 * - Its moves scroll nothing while `block` is set.
 * - When `swallowClick` is set, its click is swallowed: the first click near
 *   the touch-down, within one second of the lift.
 * - The hold ends when the touch is over and its click came or cannot come,
 *   at any later touch-down, and at a move with two touches. A second finger
 *   makes a pinch, which most likely gives no click, and a new touch shows
 *   that the held one is over.
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
    // A second finger whose touch-down no listener saw.
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
 * Blocks the rest of a touchscreen zoom whose answer closed the popup and
 * blocks the zoom, until every finger lifts.
 * - Returns the function that ends the hold early.
 * - `initialTargets` are the targets of the fingers that touch when the hold
 *   starts.
 * - A target keeps getting the events of every finger that started on it
 *   after the close, even when the close removed it from the document, as it
 *   removes the rows of the list.
 * - Also listens on the document, for a finger that lands later.
 * - Such a finger's target joins the hold at its touch-down, in the capture
 *   phase, before a later close can remove it.
 * - The document sees the target of a finger inside a shadow root as the
 *   shadow host.
 * - So the original dispatch target, `composedPath()[0]`, joins too.
 * - In an open shadow root, that target is the finger's real one.
 * - Blocks the touch-down of a further finger, and every move with two or
 *   more touches.
 * - A finger left alone after the others lifted pans as usual.
 */
function holdZoomTouch(initialTargets: Iterable<EventTarget>, ended: () => void): () => void {
  let done = false
  const targets = new Set<EventTarget>()
  const onMove = (ev: Event): void => {
    if (isTouchEvent(ev) && ev.touches.length > 1 && ev.cancelable) { ev.preventDefault() }
  }
  const onEnd = (ev: Event): void => {
    if (isTouchEvent(ev) && ev.touches.length === 0) { release() }
  }
  const track = (target: EventTarget): void => {
    if (targets.has(target)) { return }
    targets.add(target)
    target.addEventListener('touchmove', onMove, NON_PASSIVE)
    target.addEventListener('touchend', onEnd, PASSIVE)
    target.addEventListener('touchcancel', onEnd, PASSIVE)
  }
  const onStart = (ev: Event): void => {
    if (!isTouchEvent(ev)) { return }
    const own = ev.composedPath()[0]
    if (own !== undefined) { track(own) }
    for (let i = 0; i < ev.changedTouches.length; i++) {
      const t = ev.changedTouches.item(i)
      if (t !== null) { track(t.target) }
    }
    if (ev.touches.length > 1 && ev.cancelable) { ev.preventDefault() }
  }
  const release = (): void => {
    if (done) { return }
    done = true
    for (const target of targets) {
      target.removeEventListener('touchmove', onMove, NON_PASSIVE)
      target.removeEventListener('touchend', onEnd, PASSIVE)
      target.removeEventListener('touchcancel', onEnd, PASSIVE)
    }
    document.removeEventListener('touchstart', onStart, CAPTURE_NON_PASSIVE)
    document.removeEventListener('touchmove', onMove, CAPTURE_NON_PASSIVE)
    document.removeEventListener('touchend', onEnd, CAPTURE_PASSIVE)
    document.removeEventListener('touchcancel', onEnd, CAPTURE_PASSIVE)
    ended()
  }
  for (const target of initialTargets) { track(target) }
  document.addEventListener('touchstart', onStart, CAPTURE_NON_PASSIVE)
  document.addEventListener('touchmove', onMove, CAPTURE_NON_PASSIVE)
  document.addEventListener('touchend', onEnd, CAPTURE_PASSIVE)
  document.addEventListener('touchcancel', onEnd, CAPTURE_PASSIVE)
  return release
}

// The parent that the composed path follows: a shadow root leads to its host.
function composedParent(node: Node): Node | null {
  if (node.parentNode !== null) { return node.parentNode }
  return 'host' in node && node.host instanceof Node ? node.host : null
}

// The zones of both gesture groups, which hold the same values today.
type Zone = LLSelectScrollGestureZone & LLSelectZoomGestureZone

/**
 * Attaches the scroll-gesture and zoom-gesture listeners for one open cycle;
 * the returned function detaches them.
 * - On the popup: a `wheel` listener and the touch listeners, which see the
 *   zone `'popup'`. Chromium 156 makes a wheel over the top-layer popup
 *   cancelable only for a non-passive listener on the popup itself, not on
 *   an ancestor such as the root element.
 * - On the root element: the same listeners, which see the zone `'trigger'`
 *   and skip the gestures of the popup.
 * - On the document, only while `host.scrollOutside` or `host.zoomOutside`
 *   is set: the same listeners in the capture phase, which see the zone
 *   `'outside'` and pass each group only the gestures it listens for there.
 *   - A non-passive `wheel` or `touchmove` listener there makes every scroll
 *     of the page wait for script, so the default behaviors, which leave the
 *     outside alone, do not attach them.
 *   - The `touchstart` listener there is non-passive only while
 *     `host.zoomOutside` is set, since only a zoom cancels a touch-down.
 * - A wheel or a drag inside the popup that something in the popup can still
 *   scroll is left to the browser and does not reach `behaviorFor`. A
 *   touch-down always reaches it, since it has no direction yet.
 * - A `wheel` with `ctrlKey` reaches `zoomBehaviorFor` instead of
 *   `behaviorFor`, and so does a touch from the moment a second finger lands
 *   until every finger lifts. The touch asks once, and its answer holds for
 *   the rest of it.
 * - A pinch-zoomed page gets the same calls as a page that is not zoomed.
 * - The hold of a zoom that closed the popup and blocks the zoom lasts until
 *   every finger lifts, or until `destroy()`; see `holdZoomTouch`.
 * - In a closed shadow root around the select component, the document sees
 *   no deeper than the shadow host:
 *   - The document's listeners read every gesture there as `'outside'`,
 *     before the listeners inside see it.
 *   - The hold of a one-finger close that the document's listeners start
 *     sits on the shadow host.
 *   - If the close removed the node that the touch started on, the shadow
 *     host may miss the rest of the touch, as inferred from the code.
 *   - The next touch-down still ends that hold.
 * @internal
 */
export function attachGestureListeners(host: GestureHost): () => void {
  // The touch that is going on, from its touch-down to its lift.
  let touch: { id: number; x: number; y: number; zone: Zone; path: readonly EventTarget[] } | null = null
  // True from a second finger's touch-down until every finger lifts.
  let multiTouch = false
  // The answer to the zoom that the touch became, kept until every finger lifts.
  let zoomAnswer: LLSelectZoomGestureBehavior | null = null

  // The composed path crosses into open shadow roots, which `contains` does not.
  const zoneOf = (path: readonly EventTarget[]): Zone => {
    if (path.includes(host.popupEl)) { return 'popup' }
    if (path.includes(host.rootEl)) { return 'trigger' }
    return 'outside'
  }
  const zoneOfTarget = (target: EventTarget): Zone => {
    for (let node = target instanceof Node ? target : null; node !== null; node = composedParent(node)) {
      if (node === host.popupEl) { return 'popup' }
      if (node === host.rootEl) { return 'trigger' }
    }
    return 'outside'
  }
  // The zone of the first finger of a zoom. A touch keeps its target, so a
  // finger whose touch-down no listener saw, such as one outside while the
  // library does not listen there, still shows where it landed. The state of
  // one open cycle is all there is: a finger that touched down before the
  // popup opened gets the zone where its target sits now, `'outside'` once a
  // close removed it, and among several such fingers the first in `touches`
  // stands in for the first to land (MEDIUM-954).
  const firstFingerZone = (ev: TouchEvent): Zone => {
    if (touch !== null) { return touch.zone }
    for (let i = 0; i < ev.touches.length; i++) {
      const t = ev.touches.item(i)
      if (t !== null && findTouch(ev.changedTouches, t.identifier) === null) { return zoneOfTarget(t.target) }
    }
    return zoneOf(ev.composedPath())
  }
  const carryOut = (gesture: LLSelectScrollGesture, ev: Event): void => {
    if (gesture.zone === 'outside' && !host.scrollOutside) { return }
    const behavior = host.behaviorFor(gesture)
    if (blocks(behavior) && ev.cancelable) { ev.preventDefault() }
    if (closes(behavior)) { host.closeFor(gesture) }
  }
  // Asks about one zoom gesture and carries out the answer on `ev`.
  const carryOutZoom = (zone: Zone, ev: Event): LLSelectZoomGestureBehavior => {
    if (zone === 'outside' && !host.zoomOutside) { return 'leave-popup-open-and-allow-page-zoom' }
    const gesture: LLSelectZoomGesture = { zone }
    const behavior = host.zoomBehaviorFor(gesture)
    if (zoomBlocks(behavior) && ev.cancelable) { ev.preventDefault() }
    if (zoomCloses(behavior)) {
      // The close removes these listeners, so a hold blocks the rest of the touch.
      if (zoomBlocks(behavior) && isTouchEvent(ev)) {
        const targets = new Set<EventTarget>()
        const own = ev.composedPath()[0]
        if (own !== undefined) { targets.add(own) }
        for (let i = 0; i < ev.touches.length; i++) {
          const t = ev.touches.item(i)
          if (t !== null) { targets.add(t.target) }
        }
        const release = holdZoomTouch(targets, () => { host.holdEnded(release) })
        host.holdStarted(release)
      }
      host.closeForZoom(gesture)
    }
    return behavior
  }
  // A touch becomes a zoom when a second finger lands, seen at its touch-down
  // or, where no listener saw that, at the next move with two touches.
  const onMultiTouch = (ev: TouchEvent): void => {
    if (multiTouch) {
      if (zoomAnswer !== null && zoomBlocks(zoomAnswer) && ev.cancelable) { ev.preventDefault() }
      return
    }
    const zone = firstFingerZone(ev)
    touch = null
    multiTouch = true
    zoomAnswer = carryOutZoom(zone, ev)
  }

  const onWheel = (ev: WheelEvent): void => {
    const path = ev.composedPath()
    const zone = zoneOf(path)
    if (ev.ctrlKey) {
      carryOutZoom(zone, ev)
      return
    }
    if (zone === 'popup' && canScrollWithin(path, host.popupEl, Math.sign(ev.deltaX), Math.sign(ev.deltaY))) { return }
    carryOut({ kind: 'wheel', zone }, ev)
  }
  const onTouchStart = (ev: TouchEvent): void => {
    if (ev.touches.length > 1) {
      onMultiTouch(ev)
      return
    }
    multiTouch = false
    zoomAnswer = null
    touch = null
    const t = ev.touches.item(0)
    const path = ev.composedPath()
    const target = path[0]
    if (t === null || target === undefined) { return }
    const zone = zoneOf(path)
    // Kept even where no scroll gesture is asked for: a zoom takes its zone.
    touch = { id: t.identifier, x: t.clientX, y: t.clientY, zone, path }
    if (zone === 'outside' && !host.scrollOutside) { return }
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
      onMultiTouch(ev)
      return
    }
    if (touch === null || multiTouch) { return }
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
    zoomAnswer = null
  }

  // Attaches the five listeners to `target`, each passing over the events
  // that `skip` names, and returns the function that removes them. The
  // `touchstart` listener is non-passive when `startBlocks` is set, so that
  // a zoom can cancel the touch-down of a second finger.
  const listen = (target: GestureEventTarget, skip: (ev: Event) => boolean, capture: boolean, startBlocks: boolean): (() => void) => {
    const blocking = capture ? CAPTURE_NON_PASSIVE : NON_PASSIVE
    const passive = capture ? CAPTURE_PASSIVE : PASSIVE
    const startOptions = startBlocks ? blocking : passive
    const wheel = (ev: WheelEvent): void => { if (!skip(ev)) { onWheel(ev) } }
    const start = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchStart(ev) } }
    const move = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchMove(ev) } }
    const end = (ev: TouchEvent): void => { if (!skip(ev)) { onTouchEnd(ev) } }
    target.addEventListener('wheel', wheel, blocking)
    target.addEventListener('touchstart', start, startOptions)
    target.addEventListener('touchmove', move, blocking)
    target.addEventListener('touchend', end, passive)
    target.addEventListener('touchcancel', end, passive)
    return (): void => {
      target.removeEventListener('wheel', wheel, blocking)
      target.removeEventListener('touchstart', start, startOptions)
      target.removeEventListener('touchmove', move, blocking)
      target.removeEventListener('touchend', end, passive)
      target.removeEventListener('touchcancel', end, passive)
    }
  }
  const detachers = [
    listen(host.popupEl, () => false, false, true),
    // The popup's own listeners handle its gestures.
    listen(host.rootEl, (ev) => ev.composedPath().includes(host.popupEl), false, true),
  ]
  if (host.scrollOutside || host.zoomOutside) {
    // The document sees an inside gesture first, in the capture phase; the
    // listeners above handle those.
    detachers.push(listen(document, (ev) => ev.composedPath().includes(host.rootEl), true, host.zoomOutside))
  }
  return (): void => {
    for (const detach of detachers) { detach() }
  }
}
