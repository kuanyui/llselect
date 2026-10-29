import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Malay pack.
 * @group Language packs
 */
export const ms: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Sila pilih',
  filterInputAriaLabel: 'Cari',
  filterInputPlaceholder: 'Tapis (Esc untuk kosongkan)',
  popupListNoResults: 'Tiada hasil',
  triggerButtonsAriaLabel: 'Tindakan pilihan',
  triggerClearButtonAriaLabel: 'Kosongkan pilihan',
  tagRemoveButtonAriaLabel: (itemText) => `Alih keluar ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
