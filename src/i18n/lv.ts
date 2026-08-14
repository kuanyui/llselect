import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Latvian pack.
 * @group Language packs
 */
export const lv: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Izvēlieties',
  filterInputAriaLabel: 'Meklēt',
  filterInputPlaceholder: 'Filtrs (Esc notīra)',
  popupListNoResults: 'Nav rezultātu',
  triggerClearButtonAriaLabel: 'Notīrīt izvēli',
  tagRemoveButtonAriaLabel: (itemText) => `Noņemt ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  selectAllRowText: (chosenCount, totalCount) => `Izvēlēties visu (${chosenCount} / ${totalCount})`,
}
