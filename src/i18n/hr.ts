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
  triggerClearButtonAriaLabel: 'Očisti odabir',
  tagRemoveButtonAriaLabel: (itemLabel) => `Ukloni ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Odabrano sve (${chosenCount})` : `Odabrano ${chosenCount} od ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Odaberi sve (${chosenCount} / ${totalCount})`,
}
