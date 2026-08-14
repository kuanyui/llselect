import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Indonesian pack.
 * @group Language packs
 */
export const id: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Silakan pilih',
  filterInputAriaLabel: 'Cari',
  filterInputPlaceholder: 'Saring (Esc untuk menghapus)',
  popupListNoResults: 'Tidak ada hasil',
  triggerClearButtonAriaLabel: 'Hapus pilihan',
  tagRemoveButtonAriaLabel: (itemText) => `Hapus ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Semua dipilih (${chosenCount})` : `${chosenCount} dari ${totalCount} dipilih`,
  selectAllRowText: (chosenCount, totalCount) => `Pilih semua (${chosenCount} / ${totalCount})`,
}
