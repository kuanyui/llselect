import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Irish pack. */
export const ga: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Roghnaigh',
  searchInputAriaLabel: 'Cuardaigh',
  searchInputPlaceholder: 'Scag (Esc le glanadh)',
  popupListNoResults: 'Gan torthaí',
  triggerClearButtonAriaLabel: 'Glan an rogha',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bain ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  selectAllRowLabel: (chosenCount, totalCount) => `Roghnaigh uile (${chosenCount} / ${totalCount})`,
}
