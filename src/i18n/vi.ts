import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Vietnamese pack. */
export const vi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vui lòng chọn',
  searchInputAriaLabel: 'Tìm kiếm',
  searchInputPlaceholder: 'Lọc (Esc để xóa)',
  popupListNoResults: 'Không có kết quả',
  triggerClearButtonAriaLabel: 'Xóa lựa chọn',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bỏ ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Đã chọn tất cả ${chosenCount}` : `Đã chọn ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Chọn tất cả (${chosenCount} / ${totalCount})`,
}
