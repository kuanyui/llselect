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
  triggerButtonsAriaLabel: 'Действия с избора',
  triggerClearButtonAriaLabel: 'Изчистване на избора',
  tagRemoveButtonAriaLabel: (itemText) => `Премахване на ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Избрани: всички (${chosenCount})` : `Избрани: ${chosenCount} от ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Избрани: всички (${chosenCount})` : `Избрани: ${chosenCount} от ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Избери всички (${chosenCount} / ${totalCount})`,
}
