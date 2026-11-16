/**
 * The package entry: the two select component classes, their settings types,
 * and the SVG icon builders. Language packs live in `@llselect/core/i18n`, and
 * behavior presets in `@llselect/core/behavior-presets`.
 * @module @llselect/core
 */
export { LLSelectBase } from './base.js'
export type {
  LLSelectBaseChangeMeta,
  LLSelectBaseSettings,
  LLSelectBaseSettingsInput,
  LLSelectBeforeChangeEvent,
  LLSelectChangeMeta,
  LLSelectChangeReason,
  LLSelectChangeSource,
  LLSelectClassIdMap,
  LLSelectCloseMeta,
  LLSelectCloseReason,
  LLSelectConstructionContext,
  LLSelectItemChangeMeta,
  LLSelectOpenMeta,
  LLSelectOpenReason,
  LLSelectOutsideClickBehavior,
  LLSelectPopupListActionRow,
  LLSelectSettingsInputOf,
  LLSelectWholeValueChangeMeta,
} from './base.js'

/**
 * The `colorScheme` setting's values (`'auto' | 'light' | 'dark'`).
 * @group Settings
 */
export type { LLSelectColorScheme } from './color-scheme.js'

/**
 * The pack contract (the `uiTranslationPack` setting / language-pack shape).
 * The packs themselves live under the `@llselect/core/i18n` subpath.
 * @group Pack contract
 */
export type { LLSelectUiTranslationPack } from './i18n.js'

/**
 * The types of the `behaviorOfScrollGestureFn` and `behaviorOfZoomGestureFn`
 * settings.
 * - The presets live under the `@llselect/core/behavior-presets` subpath.
 * @group Behaviors
 */
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
 * The defaults of the `behaviorOfScrollGestureFn` and
 * `behaviorOfZoomGestureFn` settings.
 * - The presets entry point exports them too.
 * @group Behaviors
 */
export { defaultBehaviorOfScrollGesture, defaultBehaviorOfZoomGesture } from './behavior-presets.js'

export { LLSelectSingle } from './single.js'
export type {
  LLSelectSingleSettings,
  LLSelectSingleSettingsInput,
  LLSelectSingleTriggerContext,
} from './single.js'

export { LLSelectMultiple } from './multiple.js'
export type {
  LLSelectChosenItemsOrder,
  LLSelectChosenState,
  LLSelectMultipleSettings,
  LLSelectMultipleSettingsInput,
  LLSelectMultipleTriggerContext,
  LLSelectTriggerDisplay,
} from './multiple.js'

// The gather the `gatherGroups` setting runs internally, exported for callers
// who pre-gather themselves (with `gatherGroups: false`).
export { gatherItemsByGroupKey } from './grouping.js'

// Query-match highlighting for item content (wraps filter matches in <mark>),
// for use inside createPopupListItemContentElFn / createPopupListItemContentEl.
export { createHighlightedTextEl } from './query-highlight.js'

// Types observable through public settings / DOM attributes: importable,
// never infer-only (`popupWidthPolicy` setting; `data-placement` attribute).
export type { LLSelectWidthPolicy, LLSelectPlacement } from './positioning.js'

export {
  createChevronDownSvgEl,
  createChevronUpDownSvgEl,
  createTriangleDownSvgEl,
  createTriangleUpDownSvgEl,
  createCheckmarkSvgEl,
  createOutlinedCheckboxSvgEl,
  createFilledCheckboxSvgEl,
} from './icons.js'
export type {
  LLSelectIconOptions,
  LLSelectCheckboxState,
  LLSelectCheckboxIconOptions,
} from './icons.js'

/**
 * Library version. Mirrors package.json `version` (smoke-test guarded).
 * @group Metadata
 */
export const version = '0.0.15'
