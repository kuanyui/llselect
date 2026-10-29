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
  triggerButtonsAriaLabel: 'انتخاب کے اقدامات',
  triggerClearButtonAriaLabel: 'انتخاب صاف کریں',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} ہٹائیں`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `سب منتخب (${chosenCount})` : `${totalCount} میں سے ${chosenCount} منتخب`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `سب منتخب (${chosenCount})` : `${totalCount} میں سے ${chosenCount} منتخب`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join('، '),
  chooseAllRowText: (chosenCount, totalCount) => `سب منتخب کریں (${chosenCount} / ${totalCount})`,
}
