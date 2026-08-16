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
  triggerClearButtonAriaLabel: 'Очистить выбор',
  tagRemoveButtonAriaLabel: (itemText) => `Удалить ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Выбраны все (${chosenCount})` : `Выбрано ${chosenCount} из ${totalCount}`,
  chooseAllRowText: (chosenCount, totalCount) => `Выбрать все (${chosenCount} из ${totalCount})`,
}
