import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Ukrainian pack. */
export const uk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Виберіть',
  searchInputAriaLabel: 'Пошук',
  searchInputPlaceholder: 'Фільтр (Esc, щоб очистити)',
  popupListNoResults: 'Нічого не знайдено',
  triggerClearButtonAriaLabel: 'Очистити вибір',
  tagRemoveButtonAriaLabel: (itemLabel) => `Вилучити ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Вибрати всі (${chosenCount} / ${totalCount})`,
}
