import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Persian pack (RTL). */
export const fa: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'لطفاً انتخاب کنید',
  searchInputAriaLabel: 'جستجو',
  searchInputPlaceholder: 'فیلتر (Esc برای پاک کردن)',
  popupListNoResults: 'نتیجه‌ای یافت نشد',
  triggerClearButtonAriaLabel: 'پاک کردن انتخاب',
  tagRemoveButtonAriaLabel: (itemLabel) => `حذف ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `همه انتخاب شدند (${chosenCount})` : `${chosenCount} از ${totalCount} انتخاب شده`,
  selectAllRowLabel: (chosenCount, totalCount) => `انتخاب همه (${chosenCount} از ${totalCount})`,
}
