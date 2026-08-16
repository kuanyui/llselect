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
  triggerClearButtonAriaLabel: 'Wyczyść wybór',
  tagRemoveButtonAriaLabel: (itemText) => `Usuń ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  chooseAllRowText: (chosenCount, totalCount) => `Zaznacz wszystko (${chosenCount} / ${totalCount})`,
}
