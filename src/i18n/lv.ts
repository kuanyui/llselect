import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Latvian pack.
 * @category Language packs
 */
export const lv: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Izvēlieties',
  filterInputAriaLabel: 'Meklēt',
  filterInputPlaceholder: 'Filtrs (Esc notīra)',
  popupListNoResults: 'Nav rezultātu',
  triggerClearButtonAriaLabel: 'Notīrīt izvēli',
  tagRemoveButtonAriaLabel: (itemLabel) => `Noņemt ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Izvēlēties visu (${chosenCount} / ${totalCount})`,
}
