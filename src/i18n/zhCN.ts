import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Simplified Chinese (mainland) pack.
 * @category Language packs
 */
export const zhCN: LLSelectUiTranslationPack = {
  triggerPlaceholder: '请选择',
  filterInputAriaLabel: '搜索',
  filterInputPlaceholder: '筛选（按 Esc 清除）',
  popupListNoResults: '没有匹配的结果',
  triggerClearButtonAriaLabel: '清除选择',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已选全部 ${chosenCount} 项` : `已选 ${chosenCount} / ${totalCount} 项`,
  selectAllRowLabel: (chosenCount, totalCount) => `全选（${chosenCount} / ${totalCount}）`,
}
