// Chrome strings (AT labels + generated text) - the i18n surface. One bag a
// language pack fills; `en` is the library default and the single source of
// the English strings. Non-English packs live in i18n.ts (the `llselect/i18n`
// subpath entry), which inlines only this small module - never base.ts.

/**
 * All chrome strings of one select instance.
 * - `placeholder` is NOT here: it is app copy, not chrome (language packs
 *   never set it).
 * - Static strings are plain strings; parameterized messages are functions
 *   taking RESOLVED primitives (never the item type `T`), so a language pack
 *   can implement them. Keys are message ids (no `Fn` suffix); see
 *   naming-conventions.md s7a.4.
 */
export interface LLSelectTexts {
  /**
   * Default text shown in the trigger while nothing is chosen, used only when
   * the app did not pass the `placeholder` setting. An explicit `placeholder`
   * always wins (app copy beats chrome); this key just localizes the library
   * fallback.
   */
  triggerPlaceholder: string
  /**
   * Accessible name (`aria-label`) of the search input (it has no visible
   * label, so screen readers rely on this).
   */
  searchInputAriaLabel: string
  /**
   * Placeholder text of the search input. Also teaches the Esc behavior
   * (first Esc clears the filter). `null` = no placeholder (pass
   * `texts: { searchInputPlaceholder: null }` to remove the default).
   */
  searchInputPlaceholder: string | null
  /**
   * Message shown (and announced via `role="status"`) when the visible item
   * list is empty - a filter matched nothing, or there are no items at all.
   */
  popupListNoResults: string
  /** Accessible name (`aria-label`) of the trigger's clear (x) button (`clearable`). */
  triggerClearButtonAriaLabel: string
  /**
   * itemLabel (already `itemToString`-resolved) -> the accessible name
   * (`aria-label`) of that tag's remove button. `'tags'` mode only.
   */
  tagRemoveButtonAriaLabel: (itemLabel: string) => string
  /**
   * Count summary shown in the multi trigger. Called only when
   * `chosenCount > 0` (an empty selection shows `placeholder` instead).
   */
  triggerCountSummary: (chosenCount: number, totalCount: number) => string
  /**
   * Label (visible text + accessible name) of the multi select-all row
   * (`selectAllRow` setting). Counts refer to the VISIBLE enabled subset the
   * row acts on.
   */
  selectAllRowLabel: (chosenCount: number, totalCount: number) => string
}

/** English texts - the library default. */
export const en: LLSelectTexts = {
  triggerPlaceholder: 'Please select',
  searchInputAriaLabel: 'Search',
  searchInputPlaceholder: 'Filter (Esc to clear)',
  popupListNoResults: 'No results found',
  triggerClearButtonAriaLabel: 'Clear selection',
  tagRemoveButtonAriaLabel: (itemLabel) => `Remove ${itemLabel}`,
  triggerCountSummary: (chosenCount, totalCount) =>
    chosenCount === totalCount ? `All ${chosenCount} selected` : `${chosenCount} / ${totalCount} selected`,
  selectAllRowLabel: (chosenCount, totalCount) => `Select all (${chosenCount} of ${totalCount})`,
}
