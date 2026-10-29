import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Russian pack.
 * @group Language packs
 */
export const ru: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Выберите',
  filterInputAriaLabel: 'Поиск',
  filterInputPlaceholder: 'Фильтр (Esc, чтобы очистить)',
  popupListNoResults: 'Ничего не найдено',
  triggerButtonsAriaLabel: 'Действия с выбором',
  triggerClearButtonAriaLabel: 'Очистить выбор',
  tagRemoveButtonAriaLabel: (itemText) => `Удалить ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Выбраны все (${chosenCount})` : `Выбрано ${chosenCount} из ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Выбраны все (${chosenCount})` : `Выбрано ${chosenCount} из ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Выбрать все (${chosenCount} из ${totalCount})`,
}
