import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Hungarian pack.
 * @category Language packs
 */
export const hu: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Válasszon',
  filterInputAriaLabel: 'Keresés',
  filterInputPlaceholder: 'Szűrés (Esc: törlés)',
  popupListNoResults: 'Nincs találat',
  triggerClearButtonAriaLabel: 'Kijelölés törlése',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} eltávolítása`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Összes kijelölve (${chosenCount})` : `${chosenCount} / ${totalCount} kijelölve`,
  selectAllRowLabel: (chosenCount, totalCount) => `Összes kijelölése (${chosenCount} / ${totalCount})`,
}
