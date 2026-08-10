import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Malay pack.
 * @category Language packs
 */
export const ms: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Sila pilih',
  filterInputAriaLabel: 'Cari',
  filterInputPlaceholder: 'Tapis (Esc untuk kosongkan)',
  popupListNoResults: 'Tiada hasil',
  triggerClearButtonAriaLabel: 'Kosongkan pilihan',
  tagRemoveButtonAriaLabel: (itemLabel) => `Alih keluar ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
