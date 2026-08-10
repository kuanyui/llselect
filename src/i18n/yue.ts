import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Cantonese pack (written VERNACULAR Cantonese, Hong Kong). Deliberately a
 * different register from `zh-HK` (which is formal written Chinese and
 * aliases to `zh-TW`): pick `yue` only when the product speaks colloquial
 * Cantonese on purpose.
 * @category Language packs
 */
export const yue: LLSelectUiTranslationPack = {
  triggerPlaceholder: '請揀',
  filterInputAriaLabel: '搜尋',
  filterInputPlaceholder: '篩選（撳 Esc 清走）',
  popupListNoResults: '搵唔到結果',
  triggerClearButtonAriaLabel: '清走揀咗嘅嘢',
  tagRemoveButtonAriaLabel: (itemLabel) => `移走 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全部 ${chosenCount} 項都揀咗` : `${totalCount} 項揀咗 ${chosenCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `全部揀晒（${chosenCount} / ${totalCount}）`,
}
