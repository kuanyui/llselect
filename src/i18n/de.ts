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
  triggerButtonsAriaLabel: 'Aktionen für die Auswahl',
  triggerClearButtonAriaLabel: 'Auswahl löschen',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} entfernen`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} ausgewählt` : `${chosenCount} von ${totalCount} ausgewählt`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Alle auswählen (${chosenCount} / ${totalCount})`,
}
