import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Serbian pack (Cyrillic). */
export const sr: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Изаберите',
  searchInputAriaLabel: 'Претрага',
  searchInputPlaceholder: 'Филтер (Esc за брисање)',
  popupListNoResults: 'Нема резултата',
  triggerClearButtonAriaLabel: 'Обриши избор',
  tagRemoveButtonAriaLabel: (itemLabel) => `Уклони ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Изабрано све (${chosenCount})` : `Изабрано ${chosenCount} од ${totalCount}`,
  selectAllRowLabel: (chosenCount, totalCount) => `Изабери све (${chosenCount} / ${totalCount})`,
}
