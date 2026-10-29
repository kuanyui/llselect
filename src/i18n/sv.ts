import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Swedish pack.
 * @group Language packs
 */
export const sv: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Välj ett alternativ',
  filterInputAriaLabel: 'Sök',
  filterInputPlaceholder: 'Filtrera (Esc för att rensa)',
  popupListNoResults: 'Inga resultat',
  triggerButtonsAriaLabel: 'Åtgärder för valet',
  triggerClearButtonAriaLabel: 'Rensa valet',
  tagRemoveButtonAriaLabel: (itemText) => `Ta bort ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 av ${totalCount} vald` }
    if (chosenCount === totalCount) { return `Alla ${chosenCount} valda` }
    return `${chosenCount} av ${totalCount} valda`
  },
  triggerScreenReaderCountText: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `1 av ${totalCount} vald` }
    if (chosenCount === totalCount) { return `Alla ${chosenCount} valda` }
    return `${chosenCount} av ${totalCount} valda`
  },
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Välj alla (${chosenCount} / ${totalCount})`,
}
