import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Serbian pack (Cyrillic).
 * @group Language packs
 */
export const sr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Изаберите',
  filterInputAriaLabel: 'Претрага',
  filterInputPlaceholder: 'Филтер (Esc за брисање)',
  popupListNoResults: 'Нема резултата',
  triggerClearButtonAriaLabel: 'Обриши избор',
  tagRemoveButtonAriaLabel: (itemLabel) => `Уклони ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Изабрано све (${chosenCount})` : `Изабрано ${chosenCount} од ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Изабери све (${chosenCount} / ${totalCount})`,
}
