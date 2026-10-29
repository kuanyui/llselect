import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Filipino pack.
 * @group Language packs
 */
export const fil: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Pumili',
  filterInputAriaLabel: 'Maghanap',
  filterInputPlaceholder: 'Salain (Esc para burahin)',
  popupListNoResults: 'Walang resulta',
  triggerButtonsAriaLabel: 'Mga aksyon sa pinili',
  triggerClearButtonAriaLabel: 'Burahin ang pinili',
  tagRemoveButtonAriaLabel: (itemText) => `Alisin ang ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Napili lahat (${chosenCount})` : `${chosenCount} sa ${totalCount} ang napili`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Napili lahat (${chosenCount})` : `${chosenCount} sa ${totalCount} ang napili`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Piliin lahat (${chosenCount} / ${totalCount})`,
}
