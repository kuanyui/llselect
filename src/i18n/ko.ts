import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Korean pack. */
export const ko: LLSelectUiTranslationPack = {
  triggerPlaceholder: '선택하세요',
  searchInputAriaLabel: '검색',
  searchInputPlaceholder: '필터 (Esc로 지우기)',
  popupListNoResults: '결과가 없습니다',
  triggerClearButtonAriaLabel: '선택 지우기',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} 제거`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `전체 ${chosenCount}개 선택됨` : `${totalCount}개 중 ${chosenCount}개 선택됨`,
  selectAllRowLabel: (chosenCount, totalCount) => `모두 선택 (${chosenCount} / ${totalCount})`,
}
