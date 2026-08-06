import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Mongolian pack (Cyrillic; the traditional script needs vertical layout and is out of scope). */
export const mn: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Сонгоно уу',
  searchInputAriaLabel: 'Хайх',
  searchInputPlaceholder: 'Шүүлтүүр (цэвэрлэхийн тулд Esc)',
  popupListNoResults: 'Илэрц олдсонгүй',
  triggerClearButtonAriaLabel: 'Сонголтыг арилгах',
  // Label-colon frame: Mongolian case suffixes vary with the stem (vowel
  // harmony), so nothing is suffixed onto the interpolated label.
  tagRemoveButtonAriaLabel: (itemLabel) => `Хасах: ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Бүгд сонгогдсон (${chosenCount})` : `Сонгосон: ${chosenCount} / ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Бүгдийг сонгох (${chosenCount} / ${totalCount})`,
}
