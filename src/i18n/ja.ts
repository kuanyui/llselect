import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Japanese pack. */
export const ja: LLSelectUiTranslationPack = {
  triggerPlaceholder: '選択してください',
  searchInputAriaLabel: '検索',
  searchInputPlaceholder: '絞り込み（Escでクリア）',
  popupListNoResults: '該当する結果はありません',
  triggerClearButtonAriaLabel: '選択をクリア',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel}を削除`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全${chosenCount}件を選択中` : `${totalCount}件中${chosenCount}件を選択中`,
  selectAllRowLabel: (chosenCount, totalCount) => `すべて選択（${chosenCount} / ${totalCount}）`,
}
