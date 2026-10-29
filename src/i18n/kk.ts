import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Kazakh pack (Cyrillic).
 * @group Language packs
 */
export const kk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Таңдаңыз',
  filterInputAriaLabel: 'Іздеу',
  filterInputPlaceholder: 'Сүзгі (тазарту үшін Esc)',
  popupListNoResults: 'Нәтиже табылмады',
  triggerButtonsAriaLabel: 'Таңдау әрекеттері',
  triggerClearButtonAriaLabel: 'Таңдауды тазарту',
  // Label-colon frames: Kazakh case suffixes vary with the stem, so nothing
  // is suffixed onto the interpolated label or numerals.
  tagRemoveButtonAriaLabel: (itemText) => `Алып тастау: ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Барлығы таңдалды (${chosenCount})` : `Таңдалды: ${chosenCount} / ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Барлығы таңдалды (${chosenCount})` : `Таңдалды: ${chosenCount}, барлығы ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Барлығын таңдау (${chosenCount} / ${totalCount})`,
}
