import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Arabic pack (RTL). */
export const ar: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'الرجاء الاختيار',
  filterInputAriaLabel: 'بحث',
  filterInputPlaceholder: 'تصفية (Esc للمسح)',
  popupListNoResults: 'لا توجد نتائج',
  triggerClearButtonAriaLabel: 'مسح التحديد',
  tagRemoveButtonAriaLabel: (itemLabel) => `إزالة ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `تم اختيار الكل (${chosenCount})` : `تم اختيار ${chosenCount} من ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `تحديد الكل (${chosenCount} من ${totalCount})`,
}
