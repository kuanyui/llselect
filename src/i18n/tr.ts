import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Turkish pack.
 * @group Language packs
 */
export const tr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Lütfen seçin',
  filterInputAriaLabel: 'Ara',
  filterInputPlaceholder: 'Filtrele (temizlemek için Esc)',
  popupListNoResults: 'Sonuç bulunamadı',
  triggerClearButtonAriaLabel: 'Seçimi temizle',
  // The case suffix lands on the carrier noun "oge" (item), never on the
  // interpolated label (Turkish suffixes vary with vowel harmony).
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} öğesini kaldır`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tümü seçildi (${chosenCount})` : `${chosenCount} / ${totalCount} seçildi`,
  chooseAllRowText: (chosenCount, totalCount) => `Tümünü seç (${chosenCount} / ${totalCount})`,
}
