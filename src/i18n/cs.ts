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
  triggerClearButtonAriaLabel: 'Vymazat výběr',
  tagRemoveButtonAriaLabel: (itemText) => `Odebrat ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybráno vše (${chosenCount})` : `Vybráno ${chosenCount} z ${totalCount}`,
  chooseAllRowText: (chosenCount, totalCount) => `Vybrat vše (${chosenCount} / ${totalCount})`,
}
