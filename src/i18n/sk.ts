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
  triggerClearButtonAriaLabel: 'Vymazať výber',
  tagRemoveButtonAriaLabel: (itemLabel) => `Odstrániť ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Vybrané: všetko (${chosenCount})` : `Vybrané: ${chosenCount} z ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Vybrať všetko (${chosenCount} / ${totalCount})`,
}
