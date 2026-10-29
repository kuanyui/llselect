import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Slovak pack.
 * @group Language packs
 */
export const sk: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Vyberte',
  filterInputAriaLabel: 'Hľadať',
  filterInputPlaceholder: 'Filter (Esc na vymazanie)',
  popupListNoResults: 'Žiadne výsledky',
  triggerButtonsAriaLabel: 'Akcie s výberom',
  triggerClearButtonAriaLabel: 'Vymazať výber',
  tagRemoveButtonAriaLabel: (itemText) => `Odstrániť ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybrané: všetko (${chosenCount})` : `Vybrané: ${chosenCount} z ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybrané: všetko (${chosenCount})` : `Vybrané: ${chosenCount} z ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Vybrať všetko (${chosenCount} / ${totalCount})`,
}
