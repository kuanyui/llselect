import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Khmer pack. */
export const km: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'សូមជ្រើសរើស',
  searchInputAriaLabel: 'ស្វែងរក',
  searchInputPlaceholder: 'ត្រង (Esc ដើម្បីសម្អាត)',
  popupListNoResults: 'គ្មានលទ្ធផល',
  triggerClearButtonAriaLabel: 'សម្អាតការជ្រើសរើស',
  tagRemoveButtonAriaLabel: (itemLabel) => `ដក ${itemLabel} ចេញ`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `បានជ្រើសរើសទាំងអស់ (${chosenCount})` : `បានជ្រើសរើស ${chosenCount} ក្នុងចំណោម ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `ជ្រើសរើសទាំងអស់ (${chosenCount} / ${totalCount})`,
}
