import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Bengali pack.
 * @group Language packs
 */
export const bn: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'অনুগ্রহ করে নির্বাচন করুন',
  filterInputAriaLabel: 'অনুসন্ধান',
  filterInputPlaceholder: 'ফিল্টার (মুছতে Esc)',
  popupListNoResults: 'কোনো ফলাফল পাওয়া যায়নি',
  triggerClearButtonAriaLabel: 'নির্বাচন মুছুন',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} সরান`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `সব ${chosenCount}টি নির্বাচিত` : `${totalCount}টির মধ্যে ${chosenCount}টি নির্বাচিত`,
  selectAllRowLabel: (chosenCount, totalCount) => `সব নির্বাচন করুন (${chosenCount} / ${totalCount})`,
}
