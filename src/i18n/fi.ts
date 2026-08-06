import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Finnish pack. */
export const fi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Valitse',
  searchInputAriaLabel: 'Haku',
  searchInputPlaceholder: 'Suodata (Esc tyhjentää)',
  popupListNoResults: 'Ei tuloksia',
  triggerClearButtonAriaLabel: 'Tyhjennä valinta',
  tagRemoveButtonAriaLabel: (itemLabel) => `Poista ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `${chosenCount} / ${totalCount} valittu`,
  selectAllRowLabel: (chosenCount, totalCount) => `Valitse kaikki (${chosenCount} / ${totalCount})`,
}
