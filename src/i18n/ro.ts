import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Romanian pack.
 * @category Language packs
 */
export const ro: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Selectați',
  filterInputAriaLabel: 'Căutare',
  filterInputPlaceholder: 'Filtrare (Esc pentru golire)',
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
