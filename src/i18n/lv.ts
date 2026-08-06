import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Latvian pack. */
export const lv: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Izvēlieties',
  searchInputAriaLabel: 'Meklēt',
  searchInputPlaceholder: 'Filtrs (Esc notīra)',
  popupListNoResults: 'Nav rezultātu',
  triggerClearButtonAriaLabel: 'Notīrīt izvēli',
  tagRemoveButtonAriaLabel: (itemLabel) => `Noņemt ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Izvēlēties visu (${chosenCount} / ${totalCount})`,
}
