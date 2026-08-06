import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Greek pack. */
export const el: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Επιλέξτε',
  searchInputAriaLabel: 'Αναζήτηση',
  searchInputPlaceholder: 'Φίλτρο (Esc για καθαρισμό)',
  popupListNoResults: 'Κανένα αποτέλεσμα',
  triggerClearButtonAriaLabel: 'Καθαρισμός επιλογής',
  tagRemoveButtonAriaLabel: (itemLabel) => `Αφαίρεση ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `Επιλέχθηκε 1 από ${totalCount}` }
    if (chosenCount === totalCount) { return `Επιλέχθηκαν όλα (${chosenCount})` }
    return `Επιλέχθηκαν ${chosenCount} από ${totalCount}`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Επιλογή όλων (${chosenCount} / ${totalCount})`,
}
