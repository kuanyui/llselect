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
  triggerClearButtonAriaLabel: 'Cancella la selezione',
  tagRemoveButtonAriaLabel: (itemLabel) => `Rimuovi ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 su ${totalCount} selezionato` }
    if (chosenCount === totalCount) { return `Tutti i ${chosenCount} selezionati` }
    return `${chosenCount} su ${totalCount} selezionati`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Seleziona tutto (${chosenCount} / ${totalCount})`,
}
