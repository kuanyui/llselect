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
  triggerButtonsAriaLabel: 'Pasirinkimo veiksmai',
  triggerClearButtonAriaLabel: 'Išvalyti pasirinkimą',
  tagRemoveButtonAriaLabel: (itemText) => `Pašalinti ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Pasirinkta viskas (${chosenCount})` : `Pasirinkta ${chosenCount} iš ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Pasirinkta viskas (${chosenCount})` : `Pasirinkta ${chosenCount} iš ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Pasirinkti viską (${chosenCount} / ${totalCount})`,
}
