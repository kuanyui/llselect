import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Kazakh pack (Cyrillic). */
export const kk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Таңдаңыз',
  filterInputAriaLabel: 'Іздеу',
  filterInputPlaceholder: 'Сүзгі (тазарту үшін Esc)',
  popupListNoResults: 'Нәтиже табылмады',
  triggerClearButtonAriaLabel: 'Таңдауды тазарту',
  // Label-colon frames: Kazakh case suffixes vary with the stem, so nothing
  // is suffixed onto the interpolated label or numerals.
  tagRemoveButtonAriaLabel: (itemLabel) => `Алып тастау: ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Барлығы таңдалды (${chosenCount})` : `Таңдалды: ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Барлығын таңдау (${chosenCount} / ${totalCount})`,
}
