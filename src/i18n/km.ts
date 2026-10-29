import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Khmer pack.
 * @group Language packs
 */
export const km: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'សូមជ្រើសរើស',
  filterInputAriaLabel: 'ស្វែងរក',
  filterInputPlaceholder: 'ត្រង (Esc ដើម្បីសម្អាត)',
  popupListNoResults: 'គ្មានលទ្ធផល',
  triggerButtonsAriaLabel: 'សកម្មភាពការជ្រើសរើស',
  triggerClearButtonAriaLabel: 'សម្អាតការជ្រើសរើស',
  tagRemoveButtonAriaLabel: (itemText) => `ដក ${itemText} ចេញ`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `បានជ្រើសរើសទាំងអស់ (${chosenCount})` : `បានជ្រើសរើស ${chosenCount} ក្នុងចំណោម ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `បានជ្រើសរើសទាំងអស់ (${chosenCount})` : `បានជ្រើសរើស ${chosenCount} ក្នុងចំណោម ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `ជ្រើសរើសទាំងអស់ (${chosenCount} / ${totalCount})`,
}
