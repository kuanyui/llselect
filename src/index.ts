export { LLSelectBase } from './base.js'
export type {
  LLSelectBaseSettings,
  LLSelectBaseSettingsInput,
  LLSelectClassIdMap,
  LLSelectCreateTriggerArrowContentElFn,
  LLSelectOutsideClickBehavior,
  LLSelectSettingsInputOf,
} from './base.js'

// The texts contract (the `texts` setting / language-pack shape). The packs
// themselves live under the `llselect/i18n` subpath.
export type { LLSelectTexts } from './texts.js'

export { LLSelectSingle } from './single.js'
export type {
  LLSelectSingleSettings,
  LLSelectSingleSettingsInput,
  LLSelectSingleTriggerContext,
} from './single.js'

export { LLSelectMultiple } from './multiple.js'
export type {
  LLSelectChosenState,
  LLSelectMultipleSettings,
  LLSelectMultipleSettingsInput,
  LLSelectMultipleTriggerContext,
  LLSelectTriggerDisplay,
} from './multiple.js'

// Types observable through public settings / DOM attributes: importable,
// never infer-only (`popupWidthPolicy` setting; `data-placement` attribute).
export type { WidthPolicy, Placement } from './positioning.js'

export {
  createChevronDownSvgEl,
  createTriangleDownSvgEl,
  createCheckSvgEl,
  createCheckboxSvgEl,
} from './icons.js'
export type {
  IconOptions,
  CheckboxState,
  CheckboxIconOptions,
} from './icons.js'

export const LLSELECT_VERSION = '0.0.1'
