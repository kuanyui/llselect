import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * The built-in English pack - the library default.
 * @group Language packs
 */
export const en: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Please select',
  filterInputAriaLabel: 'Search',
  filterInputPlaceholder: 'Filter (Esc to clear)',
  popupListNoResults: 'No results found',
  triggerClearButtonAriaLabel: 'Clear selection',
  tagRemoveButtonAriaLabel: (itemText) => `Remove ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `All ${chosenCount} selected` : `${chosenCount} / ${totalCount} selected`,
  chooseAllRowText: (chosenCount, totalCount) => `Select all (${chosenCount} of ${totalCount})`,
}
