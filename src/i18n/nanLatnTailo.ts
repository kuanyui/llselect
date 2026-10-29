import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Taiwanese Hokkien pack (Tai-lo romanization; IANA variant subtag `tailo`).
 * DRAFT - see TRANSLATION STATUS: needs the maintainer's native vetting.
 * Same language as `nan-TW`, distinguished by script (`Latn`) + variant, not
 * by a separate language id.
 * @group Language packs
 */
export const nanLatnTailo: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'Tshiánn kíng-suán',
  filterInputAriaLabel: 'Tshiau-tshuē',
  filterInputPlaceholder: 'Kuè-lī (tshi̍h Esc tshing-tiāu)',
  popupListNoResults: 'Tshuē bô kiat-kó',
  triggerButtonsAriaLabel: 'Kíng--ê ê tshau-tsok',
  triggerClearButtonAriaLabel: 'Tshing-tiāu kíng--ê',
  tagRemoveButtonAriaLabel: (itemText) => `Kā ${itemText} the̍h-tiāu`,
  triggerContentCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tsuân-pōo ${chosenCount} hāng lóng kíng--ah` : `${totalCount} hāng kíng ${chosenCount} hāng`,
  triggerScreenReaderCountText: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tsuân-pōo ${chosenCount} hāng lóng kíng--ah` : `${totalCount} hāng kíng ${chosenCount} hāng`,
  triggerScreenReaderItemsText: (itemTexts) => itemTexts.join(', '),
  chooseAllRowText: (chosenCount, totalCount) => `Lóng-tsóng kíng (${chosenCount} / ${totalCount})`,
}
