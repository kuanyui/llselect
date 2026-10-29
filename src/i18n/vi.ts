import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Vietnamese pack.
 * @group Language packs
 */
export const vi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vui lòng chọn',
  filterInputAriaLabel: 'Tìm kiếm',
  filterInputPlaceholder: 'Lọc (Esc để xóa)',
  popupListNoResults: 'Không có kết quả',
  triggerButtonsAriaLabel: 'Thao tác với lựa chọn',
  triggerClearButtonAriaLabel: 'Xóa lựa chọn',
  tagRemoveButtonAriaLabel: (itemText) => `Bỏ ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Đã chọn tất cả ${chosenCount}` : `Đã chọn ${chosenCount} / ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Đã chọn tất cả ${chosenCount}` : `Đã chọn ${chosenCount} trong số ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Chọn tất cả (${chosenCount} / ${totalCount})`,
}
