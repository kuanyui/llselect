// Language packs - the `llselect/i18n` subpath entry. Pure data: each pack is
// a complete LLSelectTexts spreadable into the `texts` setting (`texts: zhTW`,
// or `texts: { ...zhTW, searchInputPlaceholder: '...' }` for per-key
// overrides). This module inlines only texts.ts, never base.ts, so importing
// a pack costs bytes, not behavior.
//
// Typography: zh-TW strings put a space between CJK and half-width characters
// (Pangu spacing); ja strings follow Japanese convention (no such spacing).
// ar / he strings are RTL; embedded Latin runs ("Esc") reorder via the Unicode
// Bidi Algorithm. TRANSLATION STATUS: ja / ar / he are LLM-drafted and were
// cross-reviewed by a second model; a human native-speaker sign-off is still
// pending. zh-TW is user-vetted.

import { en, type LLSelectTexts } from './texts.js'

export { en }
export type { LLSelectTexts } from './texts.js'

/** Japanese texts. */
export const ja: LLSelectTexts = {
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

/** Traditional Chinese (Taiwan) texts. */
export const zhTW: LLSelectTexts = {
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

/** Arabic texts (RTL). */
export const ar: LLSelectTexts = {
  triggerPlaceholder: 'الرجاء الاختيار',
  searchInputAriaLabel: 'بحث',
  searchInputPlaceholder: 'تصفية (Esc للمسح)',
  popupListNoResults: 'لا توجد نتائج',
  triggerClearButtonAriaLabel: 'مسح التحديد',
  tagRemoveButtonAriaLabel: (itemLabel) => `إزالة ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `تم اختيار الكل (${chosenCount})` : `تم اختيار ${chosenCount} من ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `تحديد الكل (${chosenCount} من ${totalCount})`,
}

/** Hebrew texts (RTL). */
export const he: LLSelectTexts = {
  triggerPlaceholder: 'נא לבחור',
  searchInputAriaLabel: 'חיפוש',
  searchInputPlaceholder: 'סינון (Esc לניקוי)',
  popupListNoResults: 'לא נמצאו תוצאות',
  triggerClearButtonAriaLabel: 'נקה בחירה',
  tagRemoveButtonAriaLabel: (itemLabel) => `הסר ${itemLabel}`,
  // Hebrew number agreement: singular past (nivchar) for 1, plural (nivcheru)
  // otherwise; the all-chosen form needs the noun (kol X ha-pritim).
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `נבחר פריט אחד מתוך ${totalCount}` }
    if (chosenCount === totalCount) { return `נבחרו כל ${totalCount} הפריטים` }
    return `נבחרו ${chosenCount} מתוך ${totalCount}`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `בחר הכל (${chosenCount} מתוך ${totalCount})`,
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
