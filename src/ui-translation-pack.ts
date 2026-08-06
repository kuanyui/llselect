// The UI-translation pack CONTRACT - the type every language pack implements:
// the widget's own chrome strings (AT labels + generated text) as one
// swappable bag. Type-only module; the packs themselves (including `en`, the
// built-in default) live one-per-file under src/i18n/, so importing this
// contract costs nothing at runtime anywhere.

/**
 * All chrome strings of one select instance.
 * - `placeholder` is NOT here: it is app copy, not chrome (language packs
 *   never set it).
 * - Static strings are plain strings; parameterized messages are functions
 *   taking RESOLVED primitives (never the item type `T`), so a language pack
 *   can implement them. Keys are message ids (no `Fn` suffix); see
 *   naming-conventions.md s7a.4.
 */
export interface LLSelectUiTranslationPack {
  /**
   * Default text shown in the trigger while nothing is chosen, used only when
   * the app did not pass the `placeholder` setting. An explicit `placeholder`
   * always wins (app copy beats chrome); this key just localizes the library
   * fallback.
   */
  triggerPlaceholder: string
  /**
   * Fallback accessible name (`aria-label`) of the search input, used only
   * when the app supplies neither `ariaLabel` nor `ariaLabelledBy` (the field
   * name then replaces this generic operation label). The input has no
   * visible label, so screen readers rely on one of these.
   */
  searchInputAriaLabel: string
  /**
   * Placeholder text of the search input. Also teaches the Esc behavior
   * (first Esc clears the filter). `null` = no placeholder (pass
   * `uiTranslationPack: { searchInputPlaceholder: null }` to remove the default).
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
