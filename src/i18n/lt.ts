import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Lithuanian pack. */
export const lt: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Pasirinkite',
  searchInputAriaLabel: 'Paieška',
  searchInputPlaceholder: 'Filtras (Esc išvalyti)',
  popupListNoResults: 'Rezultatų nerasta',
  triggerClearButtonAriaLabel: 'Išvalyti pasirinkimą',
  tagRemoveButtonAriaLabel: (itemLabel) => `Pašalinti ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Pasirinkta viskas (${chosenCount})` : `Pasirinkta ${chosenCount} iš ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pasirinkti viską (${chosenCount} / ${totalCount})`,
}
