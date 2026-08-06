import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Polish pack. */
export const pl: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Wybierz',
  searchInputAriaLabel: 'Szukaj',
  searchInputPlaceholder: 'Filtruj (Esc, aby wyczyścić)',
  popupListNoResults: 'Brak wyników',
  triggerClearButtonAriaLabel: 'Wyczyść wybór',
  tagRemoveButtonAriaLabel: (itemLabel) => `Usuń ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Wybrano wszystkie (${chosenCount})` : `Wybrano ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Zaznacz wszystko (${chosenCount} / ${totalCount})`,
}
