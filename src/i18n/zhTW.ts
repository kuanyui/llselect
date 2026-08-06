import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Traditional Chinese (Taiwan) pack (`zh-HK` resolves here in uiTranslationPackByLocale). */
export const zhTW: LLSelectUiTranslationPack = {
  triggerPlaceholder: '請選擇',
  searchInputAriaLabel: '搜尋',
  searchInputPlaceholder: '篩選（按 Esc 清除）',
  popupListNoResults: '沒有符合的結果',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `全選（${chosenCount} / ${totalCount}）`,
}
