import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Hebrew pack (RTL). */
export const he: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'נא לבחור',
  searchInputAriaLabel: 'חיפוש',
  searchInputPlaceholder: 'סינון (Esc לניקוי)',
  popupListNoResults: 'לא נמצאו תוצאות',
  triggerClearButtonAriaLabel: 'נקה בחירה',
  tagRemoveButtonAriaLabel: (itemLabel) => `הסר ${itemLabel}`,
  // Hebrew number agreement: singular past (nivchar) for 1, plural (nivcheru)
  // otherwise; the all-chosen form needs the noun (kol X ha-pritim).
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `נבחר פריט אחד מתוך ${totalCount}` }
    if (chosenCount === totalCount) { return `נבחרו כל ${totalCount} הפריטים` }
    return `נבחרו ${chosenCount} מתוך ${totalCount}`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `בחר הכל (${chosenCount} מתוך ${totalCount})`,
}
