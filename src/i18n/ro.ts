import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Romanian pack.
 * @group Language packs
 */
export const ro: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Selectați',
  filterInputAriaLabel: 'Căutare',
  filterInputPlaceholder: 'Filtrare (Esc pentru golire)',
  popupListNoResults: 'Niciun rezultat',
  triggerButtonsAriaLabel: 'Acțiuni pentru selecție',
  triggerClearButtonAriaLabel: 'Golește selecția',
  tagRemoveButtonAriaLabel: (itemText) => `Elimină ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 din ${totalCount} selectat` }
    if (chosenCount === totalCount) { return `Toate cele ${chosenCount} selectate` }
    return `${chosenCount} din ${totalCount} selectate`
  },
  triggerScreenReaderCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 din ${totalCount} selectat` }
    if (chosenCount === totalCount) { return `Toate cele ${chosenCount} selectate` }
    return `${chosenCount} din ${totalCount} selectate`
  },
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Selectează tot (${chosenCount} / ${totalCount})`,
}
