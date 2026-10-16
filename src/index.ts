/**
 * The package entry: the two select classes, their settings types, and the
 * SVG icon builders. Language packs live in `@llselect/core/i18n`.
 * @module @llselect/core
 */
export { LLSelectBase } from './base.js'
export type {
  LLSelectBaseChangeMeta,
  LLSelectBaseSettings,
  LLSelectBaseSettingsInput,
  LLSelectChangeMeta,
  LLSelectChangeReason,
  LLSelectChangeSource,
  LLSelectClassIdMap,
  LLSelectConstructionContext,
  LLSelectItemChangeMeta,
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
  createTriangleDownSvgEl,
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
export const version = '0.0.10'
