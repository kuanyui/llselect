import type { LLSelectUiTranslationPack } from '../i18n.js'

/** German pack. */
export const de: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Bitte auswählen',
  filterInputAriaLabel: 'Suchen',
  filterInputPlaceholder: 'Filtern (Esc zum Löschen)',
  popupListNoResults: 'Keine Treffer',
  triggerClearButtonAriaLabel: 'Auswahl löschen',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} entfernen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Alle auswählen (${chosenCount} / ${totalCount})`,
}
