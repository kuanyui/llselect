import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Thai pack.
 * @category Language packs
 */
export const th: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'โปรดเลือก',
  filterInputAriaLabel: 'ค้นหา',
  filterInputPlaceholder: 'กรอง (กด Esc เพื่อล้าง)',
  popupListNoResults: 'ไม่พบผลลัพธ์',
  triggerClearButtonAriaLabel: 'ล้างการเลือก',
  tagRemoveButtonAriaLabel: (itemLabel) => `นำ ${itemLabel} ออก`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `เลือกแล้วทั้งหมด (${chosenCount})` : `เลือกแล้ว ${chosenCount} จาก ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `เลือกทั้งหมด (${chosenCount} / ${totalCount})`,
}
