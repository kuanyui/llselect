export { LLSelectBase } from './base.js'
export type {
  LLSelectBaseSettings,
  LLSelectBaseSettingsInput,
  LLSelectClassIdMap,
  LLSelectCreateArrowElFn,
  LLSelectOutsideClickBehavior,
} from './base.js'

export { LLSelectSingle } from './single.js'
export type {
  LLSelectSingleSettings,
  LLSelectSingleSettingsInput,
  LLSelectSingleTriggerContext,
} from './single.js'

export { LLSelectMultiple } from './multiple.js'
export type {
  LLSelectMultipleSettings,
  LLSelectMultipleSettingsInput,
  LLSelectMultipleTriggerContext,
} from './multiple.js'

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

export const LLSELECT_VERSION = '0.1.0'
