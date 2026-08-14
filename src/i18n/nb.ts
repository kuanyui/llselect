import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Norwegian Bokmål pack (`no` resolves here in uiTranslationPackByLocale).
 * @group Language packs
 */
export const nb: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Velg et alternativ',
  filterInputAriaLabel: 'Søk',
  filterInputPlaceholder: 'Filtrer (Esc for å tømme)',
  popupListNoResults: 'Ingen treff',
  triggerClearButtonAriaLabel: 'Tøm valget',
  tagRemoveButtonAriaLabel: (itemText) => `Fjern ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} av ${totalCount} valgt`,
  selectAllRowText: (chosenCount, totalCount) => `Velg alle (${chosenCount} / ${totalCount})`,
}
