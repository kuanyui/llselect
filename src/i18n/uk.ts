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
  tagRemoveButtonAriaLabel: (itemLabel) => `Вилучити ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Вибрати всі (${chosenCount} / ${totalCount})`,
}
