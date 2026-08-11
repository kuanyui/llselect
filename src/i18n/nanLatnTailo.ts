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
  triggerClearButtonAriaLabel: 'Tshing-tiāu kíng--ê',
  tagRemoveButtonAriaLabel: (itemLabel) => `Kā ${itemLabel} the̍h-tiāu`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `Tsuân-pōo ${chosenCount} hāng lóng kíng--ah` : `${totalCount} hāng kíng ${chosenCount} hāng`,
  selectAllRowLabel: (chosenCount, totalCount) => `Lóng-tsóng kíng (${chosenCount} / ${totalCount})`,
}
