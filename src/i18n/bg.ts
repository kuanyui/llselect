import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Bulgarian pack.
 * @group Language packs
 */
export const bg: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Изберете',
  filterInputAriaLabel: 'Търсене',
  filterInputPlaceholder: 'Филтър (Esc за изчистване)',
  popupListNoResults: 'Няма резултати',
  triggerClearButtonAriaLabel: 'Изчистване на избора',
  tagRemoveButtonAriaLabel: (itemText) => `Премахване на ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Избрани: всички (${chosenCount})` : `Избрани: ${chosenCount} от ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `Избери всички (${chosenCount} / ${totalCount})`,
}
