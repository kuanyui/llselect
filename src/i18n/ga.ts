import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Irish pack. */
export const ga: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Roghnaigh',
  filterInputAriaLabel: 'Cuardaigh',
  filterInputPlaceholder: 'Scag (Esc le glanadh)',
  popupListNoResults: 'Gan torthaí',
  triggerClearButtonAriaLabel: 'Glan an rogha',
  tagRemoveButtonAriaLabel: (itemLabel) => `Bain ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  selectAllRowLabel: (chosenCount, totalCount) => `Roghnaigh uile (${chosenCount} / ${totalCount})`,
}
