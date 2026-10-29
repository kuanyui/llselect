import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Mongolian pack (Cyrillic; the traditional script needs vertical layout and is out of scope).
 * @group Language packs
 */
export const mn: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Сонгоно уу',
  filterInputAriaLabel: 'Хайх',
  filterInputPlaceholder: 'Шүүлтүүр (цэвэрлэхийн тулд Esc)',
  popupListNoResults: 'Илэрц олдсонгүй',
  triggerButtonsAriaLabel: 'Сонголтын үйлдлүүд',
  triggerClearButtonAriaLabel: 'Сонголтыг арилгах',
  // Label-colon frame: Mongolian case suffixes vary with the stem (vowel
  // harmony), so nothing is suffixed onto the interpolated label.
  tagRemoveButtonAriaLabel: (itemText) => `Хасах: ${itemText}`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Бүгд сонгогдсон (${chosenCount})` : `Сонгосон: ${chosenCount} / ${totalCount}`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Бүгд сонгогдсон (${chosenCount})` : `Сонгосон: ${chosenCount}, нийт ${totalCount}`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Бүгдийг сонгох (${chosenCount} / ${totalCount})`,
}
