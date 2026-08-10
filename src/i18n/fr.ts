import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * French pack.
 * @category Language packs
 */
export const fr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Veuillez sélectionner',
  filterInputAriaLabel: 'Rechercher',
  filterInputPlaceholder: 'Filtrer (Échap pour effacer)',
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
