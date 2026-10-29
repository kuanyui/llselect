import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Persian pack (RTL).
 * @group Language packs
 */
export const fa: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'لطفاً انتخاب کنید',
  filterInputAriaLabel: 'جستجو',
  filterInputPlaceholder: 'فیلتر (Esc برای پاک کردن)',
  popupListNoResults: 'نتیجه‌ای یافت نشد',
  triggerButtonsAriaLabel: 'عملیات انتخاب',
  triggerClearButtonAriaLabel: 'پاک کردن انتخاب',
  tagRemoveButtonAriaLabel: (itemText) => `حذف ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join('، '),
  chooseAllRowText: (chosenCount, totalCount) => `انتخاب همه (${chosenCount} از ${totalCount})`,
}
