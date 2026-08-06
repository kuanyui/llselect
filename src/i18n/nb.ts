import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Norwegian Bokmål pack (`no` resolves here in uiTranslationPackByLocale). */
export const nb: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Velg et alternativ',
  searchInputAriaLabel: 'Søk',
  searchInputPlaceholder: 'Filtrer (Esc for å tømme)',
  popupListNoResults: 'Ingen treff',
  triggerClearButtonAriaLabel: 'Tøm valget',
  tagRemoveButtonAriaLabel: (itemLabel) => `Fjern ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Alle ${chosenCount} valgt` : `${chosenCount} av ${totalCount} valgt`,
  selectAllRowLabel: (chosenCount, totalCount) => `Velg alle (${chosenCount} / ${totalCount})`,
}
