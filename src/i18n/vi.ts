import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Vietnamese pack.
 * @category Language packs
 */
export const vi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vui lòng chọn',
  filterInputAriaLabel: 'Tìm kiếm',
  filterInputPlaceholder: 'Lọc (Esc để xóa)',
  popupListNoResults: 'Không có kết quả',
  triggerClearButtonAriaLabel: 'Xóa lựa chọn',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bỏ ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Đã chọn tất cả ${chosenCount}` : `Đã chọn ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Chọn tất cả (${chosenCount} / ${totalCount})`,
}
