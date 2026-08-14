import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Catalan pack.
 * @group Language packs
 */
export const ca: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Seleccioneu una opció',
  filterInputAriaLabel: 'Cerca',
  filterInputPlaceholder: 'Filtra (Esc per esborrar)',
  popupListNoResults: 'Cap resultat',
  triggerClearButtonAriaLabel: 'Esborra la selecció',
  tagRemoveButtonAriaLabel: (itemText) => `Suprimeix ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} seleccionat` }
    if (chosenCount === totalCount) { return `Tots els ${chosenCount} seleccionats` }
    return `${chosenCount} de ${totalCount} seleccionats`
  },
  selectAllRowText: (chosenCount, totalCount) => `Selecciona-ho tot (${chosenCount} de ${totalCount})`,
}
