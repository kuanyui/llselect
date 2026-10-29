import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Czech pack.
 * @group Language packs
 */
export const cs: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vyberte',
  filterInputAriaLabel: 'Hledat',
  filterInputPlaceholder: 'Filtr (Esc pro vymazání)',
  popupListNoResults: 'Žádné výsledky',
  triggerButtonsAriaLabel: 'Akce s výběrem',
  triggerClearButtonAriaLabel: 'Vymazat výběr',
  tagRemoveButtonAriaLabel: (itemText) => `Odebrat ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybráno vše (${chosenCount})` : `Vybráno ${chosenCount} z ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybráno vše (${chosenCount})` : `Vybráno ${chosenCount} z ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Vybrat vše (${chosenCount} / ${totalCount})`,
}
