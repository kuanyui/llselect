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
  triggerButtonsAriaLabel: 'Valinnan toiminnot',
  triggerClearButtonAriaLabel: 'Tyhjennä valinta',
  tagRemoveButtonAriaLabel: (itemText) => `Poista ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `${chosenCount} / ${totalCount} valittu`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Kaikki ${chosenCount} valittu` : `Valittu ${chosenCount}, yhteensä ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Valitse kaikki (${chosenCount} / ${totalCount})`,
}
