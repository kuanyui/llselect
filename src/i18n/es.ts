import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Spanish pack (unsplit: these strings do not differ across regions).
 * @group Language packs
 */
export const es: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Seleccione una opción',
  filterInputAriaLabel: 'Buscar',
  filterInputPlaceholder: 'Filtrar (Esc para borrar)',
  popupListNoResults: 'Sin resultados',
  triggerClearButtonAriaLabel: 'Borrar la selección',
  tagRemoveButtonAriaLabel: (itemText) => `Quitar ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} seleccionado` }
    if (chosenCount === totalCount) { return `Todos los ${chosenCount} seleccionados` }
    return `${chosenCount} de ${totalCount} seleccionados`
  },
  chooseAllRowText: (chosenCount, totalCount) => `Seleccionar todo (${chosenCount} de ${totalCount})`,
}
