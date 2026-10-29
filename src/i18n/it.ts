import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Italian pack.
 * @group Language packs
 */
export const it: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Seleziona un elemento',
  filterInputAriaLabel: 'Cerca',
  filterInputPlaceholder: 'Filtra (Esc per cancellare)',
  popupListNoResults: 'Nessun risultato',
  triggerButtonsAriaLabel: 'Azioni sulla selezione',
  triggerClearButtonAriaLabel: 'Cancella la selezione',
  tagRemoveButtonAriaLabel: (itemText) => `Rimuovi ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 su ${totalCount} selezionato` }
    if (chosenCount === totalCount) { return `Tutti i ${chosenCount} selezionati` }
    return `${chosenCount} su ${totalCount} selezionati`
  },
  triggerScreenReaderCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 su ${totalCount} selezionato` }
    if (chosenCount === totalCount) { return `Tutti i ${chosenCount} selezionati` }
    return `${chosenCount} su ${totalCount} selezionati`
  },
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Seleziona tutto (${chosenCount} / ${totalCount})`,
}
