import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Urdu pack (RTL). */
export const ur: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'براہ کرم منتخب کریں',
  searchInputAriaLabel: 'تلاش',
  searchInputPlaceholder: 'فلٹر (صاف کرنے کے لیے Esc)',
  popupListNoResults: 'کوئی نتیجہ نہیں ملا',
  triggerClearButtonAriaLabel: 'انتخاب صاف کریں',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ہٹائیں`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `سب منتخب (${chosenCount})` : `${totalCount} میں سے ${chosenCount} منتخب`,
  selectAllRowLabel: (chosenCount, totalCount) => `سب منتخب کریں (${chosenCount} / ${totalCount})`,
}
