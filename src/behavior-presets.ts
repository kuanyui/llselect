/**
 * Behavior presets: sets of behavior settings, spread into the settings of a
 * select component, such as
 * `new LLSelectSingle(el, { ...behaviorPresetsOfFirefoxOnWindows })`.
 * - `behaviorPresetsOfLLSelectDefault` is what a select component does when
 *   no preset is passed.
 * - The other presets follow the native `<select>` of one browser on one
 *   operating system, as recorded by hand tests in
 *   `docs/llm/native-select-scrolling.md`.
 * - The `behaviorOfOutsideClick` of the Chromium and Firefox presets comes from
 *   the source code of those browsers instead, as `docs/llm/DESIGN.md`
 *   records.
 * - The `behaviorOfOutsideClick` of the Safari preset is inferred from the
 *   macOS menu that Safari shows.
 * - No hand test has checked these values yet.
 * - Nothing here detects the browser: the app picks the preset.
 * @module @llselect/core/behavior-presets
 */
import { DEFAULT_BEHAVIOR_OF_SCROLL_GESTURE_MARK, DEFAULT_BEHAVIOR_OF_ZOOM_GESTURE_MARK, type LLSelectBehaviorPreset, type LLSelectScrollGesture, type LLSelectScrollGestureBehavior, type LLSelectZoomGesture, type LLSelectZoomGestureBehavior } from './behaviors.js'

export type { LLSelectOutsideClickBehavior } from './base.js'
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
 * default of `behaviorOfScrollGestureFn`.
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
export function defaultBehaviorOfScrollGesture(gesture: LLSelectScrollGesture): LLSelectScrollGestureBehavior {
  if (gesture.zone === 'popup' && gesture.kind !== 'touch-start') { return 'leave-popup-open-and-block-page-scroll' }
  return 'leave-popup-open-and-allow-page-scroll'
}
Object.defineProperty(defaultBehaviorOfScrollGesture, DEFAULT_BEHAVIOR_OF_SCROLL_GESTURE_MARK, { value: true })

/**
 * llselect's own behavior for a zoom gesture while the popup is open: the
 * default of `behaviorOfZoomGestureFn`.
 * - Every zoom zooms the page, inside the popup too, and the popup stays
 *   open.
 * - `@llselect/core` and `@llselect/core/behavior-presets` each export a
 *   copy of this function. Either copy counts as the default, so neither
 *   makes the library listen outside the select component.
 * @group Behaviors
 */
export function defaultBehaviorOfZoomGesture(_gesture: LLSelectZoomGesture): LLSelectZoomGestureBehavior {
  return 'leave-popup-open-and-allow-page-zoom'
}
Object.defineProperty(defaultBehaviorOfZoomGesture, DEFAULT_BEHAVIOR_OF_ZOOM_GESTURE_MARK, { value: true })

/**
 * llselect's own behavior, the one a select component has when no preset is
 * passed. See {@link defaultBehaviorOfScrollGesture} and
 * {@link defaultBehaviorOfZoomGesture}.
 * - A click outside the select component while the popup is open closes the
 *   popup and does nothing else: `behaviorOfOutsideClick: 'block'`.
 * @group Behaviors
 */
export const behaviorPresetsOfLLSelectDefault: LLSelectBehaviorPreset = {
  behaviorOfOutsideClick: 'block',
  behaviorOfScrollGestureFn: defaultBehaviorOfScrollGesture,
  behaviorOfZoomGestureFn: defaultBehaviorOfZoomGesture,
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
 * - A click or a tap outside the select component closes the popup, and the
 *   click also reaches the element under it:
 *   `behaviorOfOutsideClick: 'pass-through'`.
 * - This preset does not cover one Firefox behavior: Firefox closes the
 *   popup when a drag that started inside the popup moves beyond the popup.
 * - This preset follows the mouse wheel, not the touchpad: Firefox closes
 *   its popup at a two-finger scroll on the touchpad outside it, and the
 *   page cannot tell that scroll from a mouse wheel.
 * @group Behaviors
 */
export const behaviorPresetsOfFirefoxOnWindows: LLSelectBehaviorPreset = {
  behaviorOfOutsideClick: 'pass-through',
  behaviorOfScrollGestureFn: (gesture) => {
    if (gesture.zone === 'popup' || gesture.kind === 'wheel') { return 'leave-popup-open-and-block-page-scroll' }
    return 'close-popup-and-block-page-scroll'
  },
  behaviorOfZoomGestureFn: () => 'leave-popup-open-and-block-page-zoom',
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
 * - A click or a tap outside the select component closes the popup, and the
 *   click also reaches the element under it:
 *   `behaviorOfOutsideClick: 'pass-through'`.
 * - This preset does not cover Chromium's touch selection: a drag inside
 *   the popup moves the active row, and a lift there chooses that row.
 * @group Behaviors
 */
export const behaviorPresetsOfChromiumOnWindows: LLSelectBehaviorPreset = {
  behaviorOfOutsideClick: 'pass-through',
  behaviorOfScrollGestureFn: (gesture) => {
    if (gesture.zone === 'popup') { return gesture.kind === 'touch-start' ? 'leave-popup-open-and-allow-page-scroll' : 'leave-popup-open-and-block-page-scroll' }
    return 'close-popup-and-allow-page-scroll'
  },
  behaviorOfZoomGestureFn: (gesture) => {
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
 * - A click outside the select component closes the popup and does nothing
 *   else: `behaviorOfOutsideClick: 'block'`.
 * - A Mac has no touchscreen, so every touch gets llselect's own behavior,
 *   {@link defaultBehaviorOfScrollGesture}.
 * @group Behaviors
 */
export const behaviorPresetsOfSafariOnMac: LLSelectBehaviorPreset = {
  behaviorOfOutsideClick: 'block',
  behaviorOfScrollGestureFn: (gesture) => {
    if (gesture.kind === 'wheel') { return 'leave-popup-open-and-block-page-scroll' }
    return defaultBehaviorOfScrollGesture(gesture)
  },
  behaviorOfZoomGestureFn: () => 'leave-popup-open-and-block-page-zoom',
}
