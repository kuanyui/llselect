import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** German pack. */
export const de: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Bitte auswählen',
  searchInputAriaLabel: 'Suchen',
  searchInputPlaceholder: 'Filtern (Esc zum Löschen)',
  popupListNoResults: 'Keine Treffer',
  triggerClearButtonAriaLabel: 'Auswahl löschen',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} entfernen`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Alle auswählen (${chosenCount} / ${totalCount})`,
}
