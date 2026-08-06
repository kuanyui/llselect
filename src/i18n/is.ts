import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Icelandic pack. */
export const is: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Veldu valkost',
  searchInputAriaLabel: 'Leita',
  searchInputPlaceholder: 'Sía (Esc til að hreinsa)',
  popupListNoResults: 'Engar niðurstöður',
  triggerClearButtonAriaLabel: 'Hreinsa val',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjarlægja ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Allt valið (${chosenCount})` : `${chosenCount} af ${totalCount} valið`,
  selectAllRowLabel: (chosenCount, totalCount) => `Velja allt (${chosenCount} / ${totalCount})`,
}
