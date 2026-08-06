import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Estonian pack. */
export const et: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Valige',
  searchInputAriaLabel: 'Otsi',
  searchInputPlaceholder: 'Filtreeri (Esc tühjendab)',
  popupListNoResults: 'Tulemusi pole',
  triggerClearButtonAriaLabel: 'Tühjenda valik',
  tagRemoveButtonAriaLabel: (itemLabel) => `Eemalda ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kõik valitud (${chosenCount})` : `Valitud ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vali kõik (${chosenCount} / ${totalCount})`,
}
