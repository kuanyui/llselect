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
  tagRemoveButtonAriaLabel: (itemLabel) => `حذف ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  selectAllRowLabel: (chosenCount, totalCount) => `انتخاب همه (${chosenCount} از ${totalCount})`,
}
