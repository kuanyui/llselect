import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Filipino pack. */
export const fil: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Pumili',
  searchInputAriaLabel: 'Maghanap',
  searchInputPlaceholder: 'Salain (Esc para burahin)',
  popupListNoResults: 'Walang resulta',
  triggerClearButtonAriaLabel: 'Burahin ang pinili',
  tagRemoveButtonAriaLabel: (itemLabel) => `Alisin ang ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Napili lahat (${chosenCount})` : `${chosenCount} sa ${totalCount} ang napili`,
  selectAllRowLabel: (chosenCount, totalCount) => `Piliin lahat (${chosenCount} / ${totalCount})`,
}
