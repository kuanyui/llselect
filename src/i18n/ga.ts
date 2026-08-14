import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Irish pack.
 * @group Language packs
 */
export const ga: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Roghnaigh',
  filterInputAriaLabel: 'Cuardaigh',
  filterInputPlaceholder: 'Scag (Esc le glanadh)',
  popupListNoResults: 'Gan torthaí',
  triggerClearButtonAriaLabel: 'Glan an rogha',
  tagRemoveButtonAriaLabel: (itemText) => `Bain ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  selectAllRowText: (chosenCount, totalCount) => `Roghnaigh uile (${chosenCount} / ${totalCount})`,
}
