import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Swahili pack.
 * @category Language packs
 */
export const sw: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Tafadhali chagua',
  filterInputAriaLabel: 'Tafuta',
  filterInputPlaceholder: 'Chuja (Esc kufuta)',
  popupListNoResults: 'Hakuna matokeo',
  triggerClearButtonAriaLabel: 'Futa uteuzi',
  tagRemoveButtonAriaLabel: (itemLabel) => `Ondoa ${itemLabel}`,
  // Personal-subject frame ("you have selected"): the passive would need
  // noun-class agreement with an unknown item class.
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Umechagua zote (${chosenCount})` : `Umechagua ${chosenCount} kati ya ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Chagua zote (${chosenCount} / ${totalCount})`,
}
