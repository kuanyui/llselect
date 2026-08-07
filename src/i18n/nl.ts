import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Dutch pack. */
export const nl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Maak een keuze',
  filterInputAriaLabel: 'Zoeken',
  filterInputPlaceholder: 'Filteren (Esc om te wissen)',
  popupListNoResults: 'Geen resultaten',
  triggerClearButtonAriaLabel: 'Selectie wissen',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} verwijderen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} geselecteerd` : `${chosenCount} van ${totalCount} geselecteerd`,
  selectAllRowLabel: (chosenCount, totalCount) => `Alles selecteren (${chosenCount} / ${totalCount})`,
}
