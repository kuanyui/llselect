import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Portuguese pack (unsplit: vocabulary valid in both European and Brazilian usage).
 * @group Language packs
 */
export const pt: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Selecione uma opção',
  filterInputAriaLabel: 'Pesquisar',
  filterInputPlaceholder: 'Filtrar (Esc para limpar)',
  popupListNoResults: 'Nenhum resultado',
  triggerClearButtonAriaLabel: 'Limpar seleção',
  tagRemoveButtonAriaLabel: (itemText) => `Remover ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 de ${totalCount} selecionado` }
    if (chosenCount === totalCount) { return `Todos os ${chosenCount} selecionados` }
    return `${chosenCount} de ${totalCount} selecionados`
  },
  selectAllRowText: (chosenCount, totalCount) => `Selecionar tudo (${chosenCount} de ${totalCount})`,
}
