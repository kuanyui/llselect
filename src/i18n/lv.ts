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
  triggerButtonsAriaLabel: 'Izvēles darbības',
  triggerClearButtonAriaLabel: 'Notīrīt izvēli',
  tagRemoveButtonAriaLabel: (itemText) => `Noņemt ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Izvēlēts: viss (${chosenCount})` : `Izvēlēts: ${chosenCount} no ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Izvēlēties visu (${chosenCount} / ${totalCount})`,
}
