import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Greek pack.
 * @group Language packs
 */
export const el: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Επιλέξτε',
  filterInputAriaLabel: 'Αναζήτηση',
  filterInputPlaceholder: 'Φίλτρο (Esc για καθαρισμό)',
  popupListNoResults: 'Κανένα αποτέλεσμα',
  triggerButtonsAriaLabel: 'Ενέργειες επιλογής',
  triggerClearButtonAriaLabel: 'Καθαρισμός επιλογής',
  tagRemoveButtonAriaLabel: (itemText) => `Αφαίρεση ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `Επιλέχθηκε 1 από ${totalCount}` }
    if (chosenCount === totalCount) { return `Επιλέχθηκαν όλα (${chosenCount})` }
    return `Επιλέχθηκαν ${chosenCount} από ${totalCount}`
  },
  triggerScreenReaderCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `Επιλέχθηκε 1 από ${totalCount}` }
    if (chosenCount === totalCount) { return `Επιλέχθηκαν όλα (${chosenCount})` }
    return `Επιλέχθηκαν ${chosenCount} από ${totalCount}`
  },
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Επιλογή όλων (${chosenCount} / ${totalCount})`,
}
