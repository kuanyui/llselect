import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Polish pack.
 * @category Language packs
 */
export const pl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Wybierz',
  filterInputAriaLabel: 'Szukaj',
  filterInputPlaceholder: 'Filtruj (Esc, aby wyczyścić)',
  popupListNoResults: 'Brak wyników',
  triggerClearButtonAriaLabel: 'Wyczyść wybór',
  tagRemoveButtonAriaLabel: (itemLabel) => `Usuń ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Zaznacz wszystko (${chosenCount} / ${totalCount})`,
}
