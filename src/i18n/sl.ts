import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Slovenian pack.
 * @group Language packs
 */
export const sl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Izberite',
  filterInputAriaLabel: 'Iskanje',
  filterInputPlaceholder: 'Filtriraj (Esc za brisanje)',
  popupListNoResults: 'Ni rezultatov',
  triggerButtonsAriaLabel: 'Dejanja za izbor',
  triggerClearButtonAriaLabel: 'Počisti izbor',
  tagRemoveButtonAriaLabel: (itemText) => `Odstrani ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izbrano vse (${chosenCount})` : `Izbrano ${chosenCount} od ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izbrano vse (${chosenCount})` : `Izbrano ${chosenCount} od ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Izberi vse (${chosenCount} / ${totalCount})`,
}
