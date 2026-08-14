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
  triggerClearButtonAriaLabel: 'Таңдауды тазарту',
  // Label-colon frames: Kazakh case suffixes vary with the stem, so nothing
  // is suffixed onto the interpolated label or numerals.
  tagRemoveButtonAriaLabel: (itemText) => `Алып тастау: ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Барлығы таңдалды (${chosenCount})` : `Таңдалды: ${chosenCount} / ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `Барлығын таңдау (${chosenCount} / ${totalCount})`,
}
