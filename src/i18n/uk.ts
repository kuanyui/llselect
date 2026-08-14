import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Ukrainian pack.
 * @group Language packs
 */
export const uk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Виберіть',
  filterInputAriaLabel: 'Пошук',
  filterInputPlaceholder: 'Фільтр (Esc, щоб очистити)',
  popupListNoResults: 'Нічого не знайдено',
  triggerClearButtonAriaLabel: 'Очистити вибір',
  tagRemoveButtonAriaLabel: (itemText) => `Вилучити ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `Вибрати всі (${chosenCount} / ${totalCount})`,
}
