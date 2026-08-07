import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Indonesian pack. */
export const id: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Silakan pilih',
  filterInputAriaLabel: 'Cari',
  filterInputPlaceholder: 'Saring (Esc untuk menghapus)',
  popupListNoResults: 'Tidak ada hasil',
  triggerClearButtonAriaLabel: 'Hapus pilihan',
  tagRemoveButtonAriaLabel: (itemLabel) => `Hapus ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} dari ${totalCount} dipilih`,
  selectAllRowLabel: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
