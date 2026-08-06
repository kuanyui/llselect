import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Czech pack. */
export const cs: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vyberte',
  searchInputAriaLabel: 'Hledat',
  searchInputPlaceholder: 'Filtr (Esc pro vymazání)',
  popupListNoResults: 'Žádné výsledky',
  triggerClearButtonAriaLabel: 'Vymazat výběr',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odebrat ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybráno vše (${chosenCount})` : `Vybráno ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vybrat vše (${chosenCount} / ${totalCount})`,
}
