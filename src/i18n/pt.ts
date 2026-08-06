import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Portuguese pack (unsplit: vocabulary valid in both European and Brazilian usage). */
export const pt: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Selecione uma opção',
  searchInputAriaLabel: 'Pesquisar',
  searchInputPlaceholder: 'Filtrar (Esc para limpar)',
  popupListNoResults: 'Nenhum resultado',
  triggerClearButtonAriaLabel: 'Limpar seleção',
  tagRemoveButtonAriaLabel: (itemLabel) => `Remover ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} selecionado` }
    if (chosenCount === totalCount) { return `Todos os ${chosenCount} selecionados` }
    return `${chosenCount} de ${totalCount} selecionados`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `Selecionar tudo (${chosenCount} de ${totalCount})`,
}
