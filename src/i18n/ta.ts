import type { LLSelectUiTranslationPack } from '../ui-translation-pack.js'

/** Tamil pack. */
export const ta: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'தேர்ந்தெடுக்கவும்',
  searchInputAriaLabel: 'தேடல்',
  searchInputPlaceholder: 'வடிகட்டு (அழிக்க Esc)',
  popupListNoResults: 'முடிவுகள் இல்லை',
  triggerClearButtonAriaLabel: 'தேர்வை அழி',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ஐ அகற்று`,
  // Tamil number agreement: neuter singular -athu for 1, plural -ana otherwise.
  triggerCountSummary: (chosenCount, totalCount) => {
    if (chosenCount === 1) { return `${totalCount} இல் 1 தேர்ந்தெடுக்கப்பட்டது` }
    if (chosenCount === totalCount) { return `அனைத்தும் தேர்ந்தெடுக்கப்பட்டன (${chosenCount})` }
    return `${totalCount} இல் ${chosenCount} தேர்ந்தெடுக்கப்பட்டன`
  },
  selectAllRowLabel: (chosenCount, totalCount) => `அனைத்தையும் தேர்ந்தெடு (${chosenCount} / ${totalCount})`,
}
