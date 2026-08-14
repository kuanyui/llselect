import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Urdu pack (RTL).
 * @group Language packs
 */
export const ur: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'براہ کرم منتخب کریں',
  filterInputAriaLabel: 'تلاش',
  filterInputPlaceholder: 'فلٹر (صاف کرنے کے لیے Esc)',
  popupListNoResults: 'کوئی نتیجہ نہیں ملا',
  triggerClearButtonAriaLabel: 'انتخاب صاف کریں',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} ہٹائیں`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `سب منتخب (${chosenCount})` : `${totalCount} میں سے ${chosenCount} منتخب`,
  selectAllRowText: (chosenCount, totalCount) => `سب منتخب کریں (${chosenCount} / ${totalCount})`,
}
