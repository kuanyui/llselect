import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Slovenian pack. */
export const sl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Izberite',
  searchInputAriaLabel: 'Iskanje',
  searchInputPlaceholder: 'Filtriraj (Esc za brisanje)',
  popupListNoResults: 'Ni rezultatov',
  triggerClearButtonAriaLabel: 'Počisti izbor',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odstrani ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izbrano vse (${chosenCount})` : `Izbrano ${chosenCount} od ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Izberi vse (${chosenCount} / ${totalCount})`,
}
