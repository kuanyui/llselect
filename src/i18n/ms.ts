import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Malay pack. */
export const ms: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Sila pilih',
  searchInputAriaLabel: 'Cari',
  searchInputPlaceholder: 'Tapis (Esc untuk kosongkan)',
  popupListNoResults: 'Tiada hasil',
  triggerClearButtonAriaLabel: 'Kosongkan pilihan',
  tagRemoveButtonAriaLabel: (itemLabel) => `Alih keluar ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} daripada ${totalCount} dipilih`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
