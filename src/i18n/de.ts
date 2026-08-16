import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * German pack.
 * @group Language packs
 */
export const de: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Bitte auswählen',
  filterInputAriaLabel: 'Suchen',
  filterInputPlaceholder: 'Filtern (Esc zum Löschen)',
  popupListNoResults: 'Keine Treffer',
  triggerClearButtonAriaLabel: 'Auswahl löschen',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} entfernen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  chooseAllRowText: (chosenCount, totalCount) => `Alle auswählen (${chosenCount} / ${totalCount})`,
}
