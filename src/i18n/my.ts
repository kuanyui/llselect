import type { LLSelectUiTranslationPack } from '../i18n.js'

/** Burmese pack. */
export const my: LLSelectUiTranslationPack = {
  triggerPlaceholder: 'ရွေးချယ်ပါ',
  searchInputAriaLabel: 'ရှာဖွေရန်',
  searchInputPlaceholder: 'စစ်ထုတ်ရန် (ရှင်းရန် Esc)',
  popupListNoResults: 'ရလဒ် မရှိပါ',
  triggerClearButtonAriaLabel: 'ရွေးချယ်မှု ရှင်းလင်းရန်',
  tagRemoveButtonAriaLabel: (itemLabel) => `${itemLabel} ကို ဖယ်ရှားရန်`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `အားလုံး ရွေးထားသည် (${chosenCount})` : `${totalCount} ခုအနက် ${chosenCount} ခု ရွေးထားသည်`,
  selectAllRowLabel: (chosenCount, totalCount) => `အားလုံး ရွေးရန် (${chosenCount} / ${totalCount})`,
}
