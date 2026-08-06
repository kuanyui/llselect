import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Thai pack. */
export const th: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'โปรดเลือก',
  searchInputAriaLabel: 'ค้นหา',
  searchInputPlaceholder: 'กรอง (กด Esc เพื่อล้าง)',
  popupListNoResults: 'ไม่พบผลลัพธ์',
  triggerClearButtonAriaLabel: 'ล้างการเลือก',
  tagRemoveButtonAriaLabel: (itemLabel) => `นำ ${itemLabel} ออก`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `เลือกแล้วทั้งหมด (${chosenCount})` : `เลือกแล้ว ${chosenCount} จาก ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `เลือกทั้งหมด (${chosenCount} / ${totalCount})`,
}
