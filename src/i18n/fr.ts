import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** French pack. */
export const fr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Veuillez sélectionner',
  searchInputAriaLabel: 'Rechercher',
  searchInputPlaceholder: 'Filtrer (Échap pour effacer)',
  popupListNoResults: 'Aucun résultat',
  triggerClearButtonAriaLabel: 'Effacer la sélection',
  tagRemoveButtonAriaLabel: (itemLabel) => `Retirer ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 sur ${totalCount} sélectionné` }
    if (chosenCount === totalCount) { return `Tous les ${chosenCount} sélectionnés` }
    return `${chosenCount} sur ${totalCount} sélectionnés`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Tout sélectionner (${chosenCount} / ${totalCount})`,
}
