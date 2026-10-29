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
  triggerButtonsAriaLabel: 'Seçim işlemleri',
  triggerClearButtonAriaLabel: 'Seçimi temizle',
  // The case suffix lands on the carrier noun "oge" (item), never on the
  // interpolated label (Turkish suffixes vary with vowel harmony).
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} öğesini kaldır`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tümü seçildi (${chosenCount})` : `${chosenCount} / ${totalCount} seçildi`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tümü seçildi (${chosenCount})` : `${totalCount} öğeden ${chosenCount} öğe seçildi`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Tümünü seç (${chosenCount} / ${totalCount})`,
}
