import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Korean pack.
 * @group Language packs
 */
export const ko: LLSelectUiTranslationPack = {
  triggerPlaceholder: '선택하세요',
  filterInputAriaLabel: '검색',
  filterInputPlaceholder: '필터 (Esc로 지우기)',
  popupListNoResults: '결과가 없습니다',
  triggerClearButtonAriaLabel: '선택 지우기',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} 제거`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `전체 ${chosenCount}개 선택됨` : `${totalCount}개 중 ${chosenCount}개 선택됨`,
  chooseAllRowText: (chosenCount, totalCount) => `모두 선택 (${chosenCount} / ${totalCount})`,
}
