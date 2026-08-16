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
  triggerClearButtonAriaLabel: 'Burahin ang pinili',
  tagRemoveButtonAriaLabel: (itemText) => `Alisin ang ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Napili lahat (${chosenCount})` : `${chosenCount} sa ${totalCount} ang napili`,
  chooseAllRowText: (chosenCount, totalCount) => `Piliin lahat (${chosenCount} / ${totalCount})`,
}
