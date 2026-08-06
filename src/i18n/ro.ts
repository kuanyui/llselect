import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Romanian pack. */
export const ro: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Selectați',
  searchInputAriaLabel: 'Căutare',
  searchInputPlaceholder: 'Filtrare (Esc pentru golire)',
  popupListNoResults: 'Niciun rezultat',
  triggerClearButtonAriaLabel: 'Golește selecția',
  tagRemoveButtonAriaLabel: (itemLabel) => `Elimină ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 din ${totalCount} selectat` }
    if (chosenCount === totalCount) { return `Toate cele ${chosenCount} selectate` }
    return `${chosenCount} din ${totalCount} selectate`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Selectează tot (${chosenCount} / ${totalCount})`,
}
