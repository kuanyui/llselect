import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Finnish pack.
 * @category Language packs
 */
export const fi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Valitse',
  filterInputAriaLabel: 'Haku',
  filterInputPlaceholder: 'Suodata (Esc tyhjentää)',
  popupListNoResults: 'Ei tuloksia',
  triggerClearButtonAriaLabel: 'Tyhjennä valinta',
  tagRemoveButtonAriaLabel: (itemLabel) => `Poista ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `${chosenCount} / ${totalCount} valittu`,
  selectAllRowLabel: (chosenCount, totalCount) => `Valitse kaikki (${chosenCount} / ${totalCount})`,
}
