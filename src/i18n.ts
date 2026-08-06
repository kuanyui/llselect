// Language packs - the `@llselect/core/i18n` subpath entry, as a barrel: one
// file per pack lives under src/i18n/ (including `en`, the built-in default);
// this module defines the pack contract, re-exports them and builds the locale index. Pure data: each pack is
// a complete LLSelectUiTranslationPack spreadable into the `uiTranslationPack` setting (`uiTranslationPack: zhTW`,
// or `uiTranslationPack: { ...zhTW, searchInputPlaceholder: '...' }` for per-key
// overrides). This module never imports base.ts, so importing
// a pack costs bytes, not behavior.
//
// Ordering: packs and the uiTranslationPackByLocale keys are sorted alphabetically by
// BCP 47 tag (CLDR convention; keeps diffs mechanical).
//
// Typography: the Chinese-script packs (zh-TW / zh-CN / yue / nan-TW) put a
// space between CJK and half-width characters (Pangu spacing); ja follows
// Japanese convention (no such spacing). ar / fa / he / ur strings are RTL;
// embedded Latin runs ("Esc") reorder via the Unicode Bidi Algorithm.
//
// Grammar traps deliberately avoided: languages that inflect around numerals
// or attach suffixes to interpolated words use invariant frames instead - an
// impersonal passive (Slavic "Vybrano n z t"), a label-colon form (kk / mn
// "Selected: n / t"), or a carrier noun taking the suffix (tr "X ogesini
// kaldir"); fr / es / it / pt / ro / sv / hi branch on chosenCount === 1.
//
// TRANSLATION STATUS:
// - user-vetted: zh-TW. Library source: en (src/i18n/en.ts).
// - LLM-drafted, cross-reviewed by a second model, native sign-off pending:
//   all remaining packs. Within those, LOWER CONFIDENCE (review first if you
//   ship them prominently): ga, is, kk, mn, my, km, bn, ur, lt, lv, sw, ta,
//   yue.
// - nan-TW and nan-Latn-tailo are DRAFTS for the maintainer's own native
//   vetting; do not treat them as shipped-quality until this flag is removed.

/**
 * All chrome strings of one select instance.
 * - `placeholder` is NOT here: it is app copy, not chrome (language packs
 *   never set it).
 * - Static strings are plain strings; parameterized messages are functions
 *   taking RESOLVED primitives (never the item type `T`), so a language pack
 *   can implement them. Keys are message ids (no `Fn` suffix); see
 *   naming-conventions.md s7a.4.
 */
export interface LLSelectUiTranslationPack {
  /**
   * Default text shown in the trigger while nothing is chosen, used only when
   * the app did not pass the `placeholder` setting. An explicit `placeholder`
   * always wins (app copy beats chrome); this key just localizes the library
   * fallback.
   */
  triggerPlaceholder: string
  /**
   * Fallback accessible name (`aria-label`) of the search input, used only
   * when the app supplies neither `ariaLabel` nor `ariaLabelledBy` (the field
   * name then replaces this generic operation label). The input has no
   * visible label, so screen readers rely on one of these.
   */
  searchInputAriaLabel: string
  /**
   * Placeholder text of the search input. Also teaches the Esc behavior
   * (first Esc clears the filter). `null` = no placeholder (pass
   * `uiTranslationPack: { searchInputPlaceholder: null }` to remove the default).
   */
  searchInputPlaceholder: string | null
  /**
   * Message shown (and announced via `role="status"`) when the visible item
   * list is empty - a filter matched nothing, or there are no items at all.
   */
  popupListNoResults: string
  /** Accessible name (`aria-label`) of the trigger's clear (x) button (`clearable`). */
  triggerClearButtonAriaLabel: string
  /**
   * itemLabel (already `itemToString`-resolved) -> the accessible name
   * (`aria-label`) of that tag's remove button. `'tags'` mode only.
   */
  tagRemoveButtonAriaLabel: (itemLabel: string) => string
  /**
   * Count summary shown in the multi trigger. Called only when
   * `chosenCount > 0` (an empty selection shows `placeholder` instead).
   */
  triggerCountSummary: (chosenCount: number, totalCount: number) => string
  /**
   * Label (visible text + accessible name) of the multi select-all row
   * (`selectAllRow` setting). Counts refer to the VISIBLE enabled subset the
   * row acts on.
   */
  selectAllRowLabel: (chosenCount: number, totalCount: number) => string
}

import { ar } from './i18n/ar.js'
import { bg } from './i18n/bg.js'
import { bn } from './i18n/bn.js'
import { ca } from './i18n/ca.js'
import { cs } from './i18n/cs.js'
import { da } from './i18n/da.js'
import { de } from './i18n/de.js'
import { el } from './i18n/el.js'
import { en } from './i18n/en.js'
import { es } from './i18n/es.js'
import { et } from './i18n/et.js'
import { fa } from './i18n/fa.js'
import { fi } from './i18n/fi.js'
import { fil } from './i18n/fil.js'
import { fr } from './i18n/fr.js'
import { ga } from './i18n/ga.js'
import { he } from './i18n/he.js'
import { hi } from './i18n/hi.js'
import { hr } from './i18n/hr.js'
import { hu } from './i18n/hu.js'
import { id } from './i18n/id.js'
import { is } from './i18n/is.js'
import { it } from './i18n/it.js'
import { ja } from './i18n/ja.js'
import { kk } from './i18n/kk.js'
import { km } from './i18n/km.js'
import { ko } from './i18n/ko.js'
import { lt } from './i18n/lt.js'
import { lv } from './i18n/lv.js'
import { mn } from './i18n/mn.js'
import { ms } from './i18n/ms.js'
import { my } from './i18n/my.js'
import { nanLatnTailo } from './i18n/nanLatnTailo.js'
import { nanTW } from './i18n/nanTW.js'
import { nb } from './i18n/nb.js'
import { nl } from './i18n/nl.js'
import { pl } from './i18n/pl.js'
import { pt } from './i18n/pt.js'
import { ro } from './i18n/ro.js'
import { ru } from './i18n/ru.js'
import { sk } from './i18n/sk.js'
import { sl } from './i18n/sl.js'
import { sr } from './i18n/sr.js'
import { sv } from './i18n/sv.js'
import { sw } from './i18n/sw.js'
import { ta } from './i18n/ta.js'
import { th } from './i18n/th.js'
import { tr } from './i18n/tr.js'
import { uk } from './i18n/uk.js'
import { ur } from './i18n/ur.js'
import { vi } from './i18n/vi.js'
import { yue } from './i18n/yue.js'
import { zhCN } from './i18n/zhCN.js'
import { zhTW } from './i18n/zhTW.js'

export { ar, bg, bn, ca, cs, da, de, el, en, es, et, fa, fi, fil, fr, ga, he, hi, hr, hu, id, is, it, ja, kk, km, ko, lt, lv, mn, ms, my, nanLatnTailo, nanTW, nb, nl, pl, pt, ro, ru, sk, sl, sr, sv, sw, ta, th, tr, uk, ur, vi, yue, zhCN, zhTW }

/**
 * All packs keyed by their BCP 47 tag, for `navigator.language`-style lookup.
 * - Tags are the MINIMAL sufficient form (BCP 47 / CLDR convention): `ja` and
 *   `en` carry no region (the strings are not region-specific); `zh-TW` /
 *   `zh-CN` must (Traditional vs Simplified differ entirely); `en` / `es` /
 *   `pt` are deliberately unsplit (these strings do not differ by region).
 *   Named exports stay camelCase (`zhTW`, `nanTW`) only because `-` is
 *   illegal in a JS identifier.
 * - Alias keys map onto another tag's pack object: `no` -> `nb` (macrolanguage
 *   tag browsers still report), `zh-HK` -> `zh-TW` (formal written Chinese;
 *   these strings do not differ - written VERNACULAR Cantonese is the
 *   separate primary tag `yue`).
 * - Script / orthography variants of one language differ by subtag, not by
 *   language id: `nan-TW` (Han) vs `nan-Latn-tailo` (Tai-lo romanization).
 * - Browsers may report longer or different tags (`en-GB`, `ja-JP`,
 *   `zh-Hant-TW`), so negotiate instead of indexing blindly - e.g. try the
 *   full tag, then the base language, then fall back:
 *   `uiTranslationPackByLocale[tag] ?? uiTranslationPackByLocale[tag.split('-')[0]!] ?? en`.
 */
export const uiTranslationPackByLocale: Record<string, LLSelectUiTranslationPack> = {
  ar,
  bg,
  bn,
  ca,
  cs,
  da,
  de,
  el,
  en,
  es,
  et,
  fa,
  fi,
  fil,
  fr,
  ga,
  he,
  hi,
  hr,
  hu,
  id,
  is,
  it,
  ja,
  kk,
  km,
  ko,
  lt,
  lv,
  mn,
  ms,
  my,
  'nan-Latn-tailo': nanLatnTailo,
  'nan-TW': nanTW,
  nb,
  nl,
  no: nb,
  pl,
  pt,
  ro,
  ru,
  sk,
  sl,
  sr,
  sv,
  sw,
  ta,
  th,
  tr,
  uk,
  ur,
  vi,
  yue,
  'zh-CN': zhCN,
  'zh-HK': zhTW,
  'zh-TW': zhTW,
}
