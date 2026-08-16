import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Traditional Chinese (Taiwan) pack (`zh-HK` resolves here in uiTranslationPackByLocale).
 * @group Language packs
 */
export const zhTW: LLSelectUiTranslationPack = {
  triggerPlaceholder: '請選擇',
  filterInputAriaLabel: '搜尋',
  filterInputPlaceholder: '篩選（按 Esc 清除）',
  popupListNoResults: '沒有符合的結果',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemText) => `移除 ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
  chooseAllRowText: (chosenCount, totalCount) => `全選（${chosenCount} / ${totalCount}）`,
}
