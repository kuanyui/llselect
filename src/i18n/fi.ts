import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Finnish pack.
 * @group Language packs
 */
export const fi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Valitse',
  filterInputAriaLabel: 'Haku',
  filterInputPlaceholder: 'Suodata (Esc tyhjentää)',
  popupListNoResults: 'Ei tuloksia',
  triggerClearButtonAriaLabel: 'Tyhjennä valinta',
  tagRemoveButtonAriaLabel: (itemText) => `Poista ${itemText}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `${chosenCount} / ${totalCount} valittu`,
  chooseAllRowText: (chosenCount, totalCount) => `Valitse kaikki (${chosenCount} / ${totalCount})`,
}
