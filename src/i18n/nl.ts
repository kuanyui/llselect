import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Dutch pack.
 * @group Language packs
 */
export const nl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Maak een keuze',
  filterInputAriaLabel: 'Zoeken',
  filterInputPlaceholder: 'Filteren (Esc om te wissen)',
  popupListNoResults: 'Geen resultaten',
  triggerButtonsAriaLabel: 'Selectieacties',
  triggerClearButtonAriaLabel: 'Selectie wissen',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} verwijderen`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} geselecteerd` : `${chosenCount} van ${totalCount} geselecteerd`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} geselecteerd` : `${chosenCount} van ${totalCount} geselecteerd`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Alles selecteren (${chosenCount} / ${totalCount})`,
}
