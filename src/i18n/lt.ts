import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Lithuanian pack.
 * @group Language packs
 */
export const lt: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Pasirinkite',
  filterInputAriaLabel: 'Paieška',
  filterInputPlaceholder: 'Filtras (Esc išvalyti)',
  popupListNoResults: 'Rezultatų nerasta',
  triggerClearButtonAriaLabel: 'Išvalyti pasirinkimą',
  tagRemoveButtonAriaLabel: (itemLabel) => `Pašalinti ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Pasirinkta viskas (${chosenCount})` : `Pasirinkta ${chosenCount} iš ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pasirinkti viską (${chosenCount} / ${totalCount})`,
}
