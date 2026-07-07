// Language packs - the `llselect/i18n` subpath entry. Pure data: each pack is
// a complete LLSelectTexts spreadable into the `texts` setting (`texts: zhTW`,
// or `texts: { ...zhTW, searchInputPlaceholder: '...' }` for per-key
// overrides). This module inlines only texts.ts, never base.ts, so importing
// a pack costs bytes, not behavior.
//
// Typography: zh-TW strings put a space between CJK and half-width characters
// (Pangu spacing); ja strings follow Japanese convention (no such spacing).
// ar / he strings are RTL; embedded Latin runs ("Esc") reorder via the Unicode
// Bidi Algorithm. TRANSLATION STATUS: ar / he are LLM-drafted - have a native
// speaker review them before a release.

import { en, type LLSelectTexts } from './texts.js'

export { en }
export type { LLSelectTexts } from './texts.js'

/** Japanese texts. */
export const ja: LLSelectTexts = {
  triggerPlaceholder: '選択してください',
  searchInputAriaLabel: '検索',
  searchInputPlaceholder: '絞り込み（Escでクリア）',
  triggerClearButtonAriaLabel: '選択をクリア',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel}を削除`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `全${chosenCount}件を選択` : `${totalCount}件中${chosenCount}件を選択`,
}

/** Traditional Chinese (Taiwan) texts. */
export const zhTW: LLSelectTexts = {
  triggerPlaceholder: '請選擇',
  searchInputAriaLabel: '搜尋',
  searchInputPlaceholder: '篩選（按 Esc 清除）',
  triggerClearButtonAriaLabel: '清除選擇',
  tagRemoveButtonAriaLabel: (itemLabel) => `移除 ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `已選全部 ${chosenCount} 項` : `已選 ${chosenCount} / ${totalCount} 項`,
}

/** Arabic texts (RTL). */
export const ar: LLSelectTexts = {
  triggerPlaceholder: 'الرجاء الاختيار',
  searchInputAriaLabel: 'بحث',
  searchInputPlaceholder: 'تصفية (Esc للمسح)',
  triggerClearButtonAriaLabel: 'مسح التحديد',
  tagRemoveButtonAriaLabel: (itemLabel) => `إزالة ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `تم اختيار الكل (${chosenCount})` : `تم اختيار ${chosenCount} من ${totalCount}`,
}

/** Hebrew texts (RTL). */
export const he: LLSelectTexts = {
  triggerPlaceholder: 'נא לבחור',
  searchInputAriaLabel: 'חיפוש',
  searchInputPlaceholder: 'סינון (Esc לניקוי)',
  triggerClearButtonAriaLabel: 'נקה בחירה',
  tagRemoveButtonAriaLabel: (itemLabel) => `הסר ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `נבחרו כל ${chosenCount}` : `נבחרו ${chosenCount} מתוך ${totalCount}`,
}

/**
 * All packs keyed by their BCP 47 tag, for `navigator.language`-style lookup.
 * - Tags are the MINIMAL sufficient form (BCP 47 / CLDR convention): `ja` and
 *   `en` carry no region (the strings are not region-specific); `zh-TW` must
 *   (Traditional vs Simplified differ entirely). Named exports stay camelCase
 *   (`zhTW`) only because `-` is illegal in a JS identifier.
 * - Browsers may report longer or different tags (`en-GB`, `ja-JP`,
 *   `zh-Hant-TW`), so negotiate instead of indexing blindly - e.g. try the
 *   full tag, then the base language, then fall back:
 *   `textsByLocale[tag] ?? textsByLocale[tag.split('-')[0]!] ?? en`.
 */
export const textsByLocale: Record<string, LLSelectTexts> = {
  ar,
  en,
  he,
  ja,
  'zh-TW': zhTW,
}
