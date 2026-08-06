import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Turkish pack. */
export const tr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Lütfen seçin',
  searchInputAriaLabel: 'Ara',
  searchInputPlaceholder: 'Filtrele (temizlemek için Esc)',
  popupListNoResults: 'Sonuç bulunamadı',
  triggerClearButtonAriaLabel: 'Seçimi temizle',
  // The case suffix lands on the carrier noun "oge" (item), never on the
  // interpolated label (Turkish suffixes vary with vowel harmony).
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} öğesini kaldır`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tümü seçildi (${chosenCount})` : `${chosenCount} / ${totalCount} seçildi`,
  selectAllRowLabel: (chosenCount, totalCount) => `Tümünü seç (${chosenCount} / ${totalCount})`,
}
