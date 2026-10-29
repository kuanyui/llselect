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
  triggerButtonsAriaLabel: 'Valiku toimingud',
  triggerClearButtonAriaLabel: 'Tühjenda valik',
  tagRemoveButtonAriaLabel: (itemText) => `Eemalda ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kõik valitud (${chosenCount})` : `Valitud ${chosenCount} / ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kõik valitud (${chosenCount})` : `Valitud ${chosenCount}, kokku ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Vali kõik (${chosenCount} / ${totalCount})`,
}
