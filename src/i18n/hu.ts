import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Hungarian pack.
 * @group Language packs
 */
export const hu: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Válasszon',
  filterInputAriaLabel: 'Keresés',
  filterInputPlaceholder: 'Szűrés (Esc: törlés)',
  popupListNoResults: 'Nincs találat',
  triggerButtonsAriaLabel: 'Kijelölési műveletek',
  triggerClearButtonAriaLabel: 'Kijelölés törlése',
  tagRemoveButtonAriaLabel: (itemText) => `${itemText} eltávolítása`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Összes kijelölve (${chosenCount})` : `${chosenCount} / ${totalCount} kijelölve`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Összes kijelölve (${chosenCount})` : `Kijelölve: ${chosenCount}, összesen ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Összes kijelölése (${chosenCount} / ${totalCount})`,
}
