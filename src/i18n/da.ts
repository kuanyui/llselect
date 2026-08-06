import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Danish pack. */
export const da: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vælg en mulighed',
  searchInputAriaLabel: 'Søg',
  searchInputPlaceholder: 'Filtrer (Esc for at rydde)',
  popupListNoResults: 'Ingen resultater',
  triggerClearButtonAriaLabel: 'Ryd valget',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjern ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} af ${totalCount} valgt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vælg alle (${chosenCount} / ${totalCount})`,
}
