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
  triggerClearButtonAriaLabel: 'Kosongkan pilihan',
  tagRemoveButtonAriaLabel: (itemText) => `Alih keluar ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  selectAllRowText: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
