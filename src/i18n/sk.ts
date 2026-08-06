import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Slovak pack. */
export const sk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vyberte',
  searchInputAriaLabel: 'Hľadať',
  searchInputPlaceholder: 'Filter (Esc na vymazanie)',
  popupListNoResults: 'Žiadne výsledky',
  triggerClearButtonAriaLabel: 'Vymazať výber',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odstrániť ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybrané: všetko (${chosenCount})` : `Vybrané: ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vybrať všetko (${chosenCount} / ${totalCount})`,
}
