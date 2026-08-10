import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Icelandic pack.
 * @category Language packs
 */
export const is: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Veldu valkost',
  filterInputAriaLabel: 'Leita',
  filterInputPlaceholder: 'Sía (Esc til að hreinsa)',
  popupListNoResults: 'Engar niðurstöður',
  triggerClearButtonAriaLabel: 'Hreinsa val',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjarlægja ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Allt valið (${chosenCount})` : `${chosenCount} af ${totalCount} valið`,
  selectAllRowLabel: (chosenCount, totalCount) => `Velja allt (${chosenCount} / ${totalCount})`,
}
