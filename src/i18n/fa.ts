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
  triggerClearButtonAriaLabel: 'پاک کردن انتخاب',
  tagRemoveButtonAriaLabel: (itemText) => `حذف ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  selectAllRowText: (chosenCount, totalCount) => `انتخاب همه (${chosenCount} از ${totalCount})`,
}
