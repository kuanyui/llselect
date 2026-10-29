import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Danish pack.
 * @group Language packs
 */
export const da: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vælg en mulighed',
  filterInputAriaLabel: 'Søg',
  filterInputPlaceholder: 'Filtrer (Esc for at rydde)',
  popupListNoResults: 'Ingen resultater',
  triggerButtonsAriaLabel: 'Handlinger for valget',
  triggerClearButtonAriaLabel: 'Ryd valget',
  tagRemoveButtonAriaLabel: (itemText) => `Fjern ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} af ${totalCount} valgt`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} af ${totalCount} valgt`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Vælg alle (${chosenCount} / ${totalCount})`,
}
