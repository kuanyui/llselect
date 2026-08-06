import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Bulgarian pack. */
export const bg: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Изберете',
  searchInputAriaLabel: 'Търсене',
  searchInputPlaceholder: 'Филтър (Esc за изчистване)',
  popupListNoResults: 'Няма резултати',
  triggerClearButtonAriaLabel: 'Изчистване на избора',
  tagRemoveButtonAriaLabel: (itemLabel) => `Премахване на ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Избрани: всички (${chosenCount})` : `Избрани: ${chosenCount} от ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Избери всички (${chosenCount} / ${totalCount})`,
}
