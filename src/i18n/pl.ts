import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Polish pack.
 * @group Language packs
 */
export const pl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Wybierz',
  filterInputAriaLabel: 'Szukaj',
  filterInputPlaceholder: 'Filtruj (Esc, aby wyczyścić)',
  popupListNoResults: 'Brak wyników',
  triggerButtonsAriaLabel: 'Działania na wyborze',
  triggerClearButtonAriaLabel: 'Wyczyść wybór',
  tagRemoveButtonAriaLabel: (itemText) => `Usuń ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Zaznacz wszystko (${chosenCount} / ${totalCount})`,
}
