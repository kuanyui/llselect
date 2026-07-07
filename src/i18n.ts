// Language packs - the `llselect/i18n` subpath entry. Pure data: each pack is
// a complete LLSelectTexts spreadable into the `texts` setting (`texts: zhTW`,
// or `texts: { ...zhTW, searchInputPlaceholder: '...' }` for per-key
// overrides). This module inlines only texts.ts, never base.ts, so importing
// a pack costs bytes, not behavior.
//
// Typography: zh-TW strings put a space between CJK and half-width characters
// (Pangu spacing); ja strings follow Japanese convention (no such spacing).

import type { LLSelectTexts } from './texts.js'

export { en } from './texts.js'
export type { LLSelectTexts } from './texts.js'

/** Japanese texts. */
export const ja: LLSelectTexts = {
  searchInputAriaLabel: '検索',
  searchInputPlaceholder: '絞り込み（Escでクリア）',
  triggerClearButtonAriaLabel: '選択をクリア',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel}を削除`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全${chosenCount}件を選択` : `${totalCount}件中${chosenCount}件を選択`,
}

/** Traditional Chinese (Taiwan) texts. */
export const zhTW: LLSelectTexts = {
  searchInputAriaLabel: '搜尋',
  searchInputPlaceholder: '篩選（按 Esc 清除）',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
}
