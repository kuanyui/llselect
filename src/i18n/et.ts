import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Estonian pack.
 * @group Language packs
 */
export const et: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Valige',
  filterInputAriaLabel: 'Otsi',
  filterInputPlaceholder: 'Filtreeri (Esc tühjendab)',
  popupListNoResults: 'Tulemusi pole',
  triggerClearButtonAriaLabel: 'Tühjenda valik',
  tagRemoveButtonAriaLabel: (itemText) => `Eemalda ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kõik valitud (${chosenCount})` : `Valitud ${chosenCount} / ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `Vali kõik (${chosenCount} / ${totalCount})`,
}
