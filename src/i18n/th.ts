import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Thai pack.
 * @group Language packs
 */
export const th: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'โปรดเลือก',
  filterInputAriaLabel: 'ค้นหา',
  filterInputPlaceholder: 'กรอง (กด Esc เพื่อล้าง)',
  popupListNoResults: 'ไม่พบผลลัพธ์',
  triggerClearButtonAriaLabel: 'ล้างการเลือก',
  tagRemoveButtonAriaLabel: (itemText) => `นำ ${itemText} ออก`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `เลือกแล้วทั้งหมด (${chosenCount})` : `เลือกแล้ว ${chosenCount} จาก ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `เลือกทั้งหมด (${chosenCount} / ${totalCount})`,
}
