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
  triggerButtonsAriaLabel: 'Gníomhartha an rogha',
  triggerClearButtonAriaLabel: 'Glan an rogha',
  tagRemoveButtonAriaLabel: (itemText) => `Bain ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Gach ceann roghnaithe (${chosenCount})` : `${chosenCount} as ${totalCount} roghnaithe`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Roghnaigh uile (${chosenCount} / ${totalCount})`,
}
