import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Taiwanese Hokkien pack (Taiwan; Han script, MOE recommended characters).
 * DRAFT - see TRANSLATION STATUS: needs the maintainer's native vetting.
 * @group Language packs
 */
export const nanTW: LLSelectUiTranslationPack = {
  triggerPlaceholder: '請揀選',
  filterInputAriaLabel: '搜揣',
  filterInputPlaceholder: '過濾（揤 Esc 清掉）',
  popupListNoResults: '揣無結果',
  triggerClearButtonAriaLabel: '清掉揀的',
  tagRemoveButtonAriaLabel: (itemLabel) => `共 ${itemLabel} 提掉`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全部 ${chosenCount} 項攏揀矣` : `${totalCount} 項揀 ${chosenCount} 項`,
  selectAllRowLabel: (chosenCount, totalCount) => `攏總揀（${chosenCount} / ${totalCount}）`,
}
