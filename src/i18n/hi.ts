import type { LLSelectUiTranslationPack } from '../i18n.js'

/**
 * Hindi pack.
 * @category Language packs
 */
export const hi: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'कृपया चुनें',
  filterInputAriaLabel: 'खोजें',
  filterInputPlaceholder: 'फ़िल्टर (साफ़ करने के लिए Esc)',
  popupListNoResults: 'कोई परिणाम नहीं मिला',
  triggerClearButtonAriaLabel: 'चयन साफ़ करें',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} हटाएँ`,
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `${totalCount} में से 1 चुना गया` }
    if (chosenCount === totalCount) { return `सभी ${chosenCount} चुने गए` }
    return `${totalCount} में से ${chosenCount} चुने गए`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `सभी चुनें (${chosenCount} / ${totalCount})`,
}
