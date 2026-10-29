import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Croatian pack.
 * @group Language packs
 */
export const hr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Odaberite',
  filterInputAriaLabel: 'Pretraži',
  filterInputPlaceholder: 'Filtriraj (Esc za brisanje)',
  popupListNoResults: 'Nema rezultata',
  triggerButtonsAriaLabel: 'Radnje s odabirom',
  triggerClearButtonAriaLabel: 'Očisti odabir',
  tagRemoveButtonAriaLabel: (itemText) => `Ukloni ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Odabrano sve (${chosenCount})` : `Odabrano ${chosenCount} od ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Odabrano sve (${chosenCount})` : `Odabrano ${chosenCount} od ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Odaberi sve (${chosenCount} / ${totalCount})`,
}
