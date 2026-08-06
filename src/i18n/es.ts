import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Spanish pack (unsplit: these strings do not differ across regions). */
export const es: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Seleccione una opción',
  searchInputAriaLabel: 'Buscar',
  searchInputPlaceholder: 'Filtrar (Esc para borrar)',
  popupListNoResults: 'Sin resultados',
  triggerClearButtonAriaLabel: 'Borrar la selección',
  tagRemoveButtonAriaLabel: (itemLabel) => `Quitar ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} seleccionado` }
    if (chosenCount === totalCount) { return `Todos los ${chosenCount} seleccionados` }
    return `${chosenCount} de ${totalCount} seleccionados`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Seleccionar todo (${chosenCount} de ${totalCount})`,
}
