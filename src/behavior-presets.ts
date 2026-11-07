/**
 * Behavior presets: sets of behavior settings, spread into the settings of a
 * select component, such as
 * `new LLSelectSingle(el, { ...behaviorPresetsOfFirefoxOnWindows })`.
 * - `behaviorPresetsOfLLSelectDefault` is what a select component does when
 *   no preset is passed.
 * - The other presets follow the native `<select>` of one browser on one
 *   operating system, as recorded by hand tests in
 *   `docs/llm/native-select-scrolling.md`.
 * - Nothing here detects the browser: the app picks the preset.
 * @module @llselect/core/behavior-presets
 */
import { DEFAULT_SCROLL_GESTURE_TO_BEHAVIOR_MARK, DEFAULT_ZOOM_GESTURE_TO_BEHAVIOR_MARK, type LLSelectBehaviorPreset, type LLSelectScrollGesture, type LLSelectScrollGestureBehavior, type LLSelectZoomGesture, type LLSelectZoomGestureBehavior } from './behaviors.js'

export type {
  LLSelectBehaviorPreset,
  LLSelectScrollGesture,
  LLSelectScrollGestureBehavior,
  LLSelectScrollGestureKind,
  LLSelectScrollGestureZone,
  LLSelectZoomGesture,
  LLSelectZoomGestureBehavior,
  LLSelectZoomGestureZone,
} from './behaviors.js'

/**
 * llselect's own behavior for a scroll gesture while the popup is open: the
 * default of `scrollGestureToBehaviorFn`.
 * - Inside the popup, a wheel or a drag that the popup cannot scroll any
 *   further scrolls nothing, so the page behind stays where it is.
 * - Everywhere else, the page scrolls, and the popup stays open. When the
 *   trigger leaves the view, the popup closes with the close reason
 *   `'hidden'`.
 * - A touch-down changes nothing anywhere.
 * - `@llselect/core` and `@llselect/core/behavior-presets` each export a
 *   copy of this function. Either copy counts as the default, so neither
 *   makes the library listen outside the select component.
 * @group Behaviors
 */
export function defaultScrollGestureToBehavior(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior {
  if (gesture.zone === 'popup' && gesture.kind !== 'touch-start') { return 'leave-popup-open-and-block-page-scroll' }
  return 'leave-popup-open-and-allow-page-scroll'
}
Object.defineProperty(defaultScrollGestureToBehavior, DEFAULT_SCROLL_GESTURE_TO_BEHAVIOR_MARK, { value: true })

/**
 * llselect's own behavior for a zoom gesture while the popup is open: the
 * default of `zoomGestureToBehaviorFn`.
 * - Every zoom zooms the page, inside the popup too, and the popup stays
 *   open.
 * - `@llselect/core` and `@llselect/core/behavior-presets` each export a
 *   copy of this function. Either copy counts as the default, so neither
 *   makes the library listen outside the select component.
 * @group Behaviors
 */
export function defaultZoomGestureToBehavior(_gesture: LLSelectZoomGesture): LLSelectZoomGestureBehavior {
  return 'leave-popup-open-and-allow-page-zoom'
}
Object.defineProperty(defaultZoomGestureToBehavior, DEFAULT_ZOOM_GESTURE_TO_BEHAVIOR_MARK, { value: true })

/**
 * llselect's own behavior, the one a select component has when no preset is
 * passed. See {@link defaultScrollGestureToBehavior} and
 * {@link defaultZoomGestureToBehavior}.
 * @group Behaviors
 */
export const behaviorPresetsOfLLSelectDefault: LLSelectBehaviorPreset = {
  scrollGestureToBehaviorFn: defaultScrollGestureToBehavior,
  zoomGestureToBehaviorFn: defaultZoomGestureToBehavior,
}

/**
 * The native `<select>` of Firefox on Windows 11, with a mouse and on a
 * touchscreen.
 * - A wheel outside the popup, on the trigger or elsewhere, scrolls
 *   nothing, and the popup stays open.
 * - A touch-down outside the popup, on the trigger or elsewhere, closes the
 *   popup, and the rest of that touch scrolls nothing.
 * - A wheel or a drag inside the popup does not scroll the page.
 * - While the popup is open, a two-finger zoom does not zoom the page,
 *   anywhere, and the popup stays open.
 * - A `wheel` with `ctrlKey` counts as such a zoom.
 * - On a touchscreen, the first finger of a zoom that lands outside the
 *   popup closes it at its touch-down, as above.
 * - The zoom that follows then zooms the page, since the popup is closed.
 * - This preset does not cover one Firefox behavior: Firefox closes the
 *   popup when a drag that started inside the popup moves beyond the popup.
 * - This preset follows the mouse wheel, not the touchpad: Firefox closes
 *   its popup at a two-finger scroll on the touchpad outside it, and the
 *   page cannot tell that scroll from a mouse wheel.
 * @group Behaviors
 */
export const behaviorPresetsOfFirefoxOnWindows: LLSelectBehaviorPreset = {
  scrollGestureToBehaviorFn: (gesture) => {
    if (gesture.zone === 'popup' || gesture.kind === 'wheel') { return 'leave-popup-open-and-block-page-scroll' }
    return 'close-popup-and-block-page-scroll'
  },
  zoomGestureToBehaviorFn: () => 'leave-popup-open-and-block-page-zoom',
}

/**
 * The native `<select>` of Chromium on Windows 11, with a mouse and on a
 * touchscreen.
 * - A wheel or a touch-down outside the popup, on the trigger or elsewhere,
 *   closes the popup, and the gesture scrolls the page as usual.
 * - A wheel or a drag inside the popup does not scroll the page.
 * - A two-finger zoom inside the popup does not zoom the page.
 * - On the trigger or elsewhere, a two-finger zoom closes the popup and
 *   zooms the page.
 * - A `wheel` with `ctrlKey` counts as such a zoom.
 * - This preset does not cover Chromium's touch selection: a drag inside
 *   the popup moves the active row, and a lift there chooses that row.
 * @group Behaviors
 */
export const behaviorPresetsOfChromiumOnWindows: LLSelectBehaviorPreset = {
  scrollGestureToBehaviorFn: (gesture) => {
    if (gesture.zone === 'popup') { return gesture.kind === 'touch-start' ? 'leave-popup-open-and-allow-page-scroll' : 'leave-popup-open-and-block-page-scroll' }
    return 'close-popup-and-allow-page-scroll'
  },
  zoomGestureToBehaviorFn: (gesture) => {
    if (gesture.zone === 'popup') { return 'leave-popup-open-and-block-page-zoom' }
    return 'close-popup-and-allow-page-zoom'
  },
}

/**
 * The native `<select>` of Safari on macOS, with a mouse or a touchpad.
 * - A wheel outside the popup, on the trigger or elsewhere, scrolls
 *   nothing, and the popup stays open.
 * - A two-finger scroll on the touchpad counts as a wheel.
 * - A wheel inside the popup does not scroll the page.
 * - A two-finger zoom, anywhere, does not zoom the page, and the popup stays
 *   open.
 * - A `wheel` with `ctrlKey` counts as such a zoom.
 * - A Mac has no touchscreen, so every touch gets llselect's own behavior,
 *   {@link defaultScrollGestureToBehavior}.
 * @group Behaviors
 */
export const behaviorPresetsOfSafariOnMac: LLSelectBehaviorPreset = {
  scrollGestureToBehaviorFn: (gesture) => {
    if (gesture.kind === 'wheel') { return 'leave-popup-open-and-block-page-scroll' }
    return defaultScrollGestureToBehavior(gesture)
  },
  zoomGestureToBehaviorFn: () => 'leave-popup-open-and-block-page-zoom',
}
