import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Traditional Chinese (Taiwan) pack (`zh-HK` resolves here in uiTranslationPackByLocale).
 * @category Language packs
 */
export const zhTW: LLSelectUiTranslationPack = {
  triggerPlaceholder: '請選擇',
  filterInputAriaLabel: '搜尋',
  filterInputPlaceholder: '篩選（按 Esc 清除）',
  popupListNoResults: '沒有符合的結果',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `全選（${chosenCount} / ${totalCount}）`,
}
