import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Danish pack.
 * @category Language packs
 */
export const da: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vælg en mulighed',
  filterInputAriaLabel: 'Søg',
  filterInputPlaceholder: 'Filtrer (Esc for at rydde)',
  popupListNoResults: 'Ingen resultater',
  triggerClearButtonAriaLabel: 'Ryd valget',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjern ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} af ${totalCount} valgt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vælg alle (${chosenCount} / ${totalCount})`,
}
