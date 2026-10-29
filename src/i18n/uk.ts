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
  triggerButtonsAriaLabel: 'Дії з вибором',
  triggerClearButtonAriaLabel: 'Очистити вибір',
  tagRemoveButtonAriaLabel: (itemText) => `Вилучити ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Вибрано всі (${chosenCount})` : `Вибрано ${chosenCount} з ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Вибрати всі (${chosenCount} / ${totalCount})`,
}
