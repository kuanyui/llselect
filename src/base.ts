// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, item storage,
// keyboard navigation, and shared rendering primitives for LLSelectSingle and
// LLSelectMultiple. Subclasses own chosen-state and decide what happens on
// item click.

import { createPositioner, isAnchorHidden, type Positioner, type LLSelectWidthPolicy } from './positioning.js'
import { gatherItemsByGroupKey } from './grouping.js'
import {
  LLSelectAction,
  ensureVisibleInScroll,
  findTypeaheadIndex,
  getActionFromKey,
  getUpdatedIndex,
  getUpdatedTypeaheadBuffer,
} from './keyboard.js'
import { en as DEFAULT_UI_TRANSLATION_PACK } from './i18n/en.js'
import type { LLSelectUiTranslationPack } from './i18n.js'

/**
 * What happens when the user clicks outside an open popup.
 *
 * - `'pass-through'` (default): close the popup; the outside click still
 *   triggers its normal action (button click, link navigation, etc.).
 * - `'block'`: close the popup only; the outside click is swallowed so no
 *   underlying handler or default action fires. Avoids accidental side
 *   effects when the user only intended to dismiss the dropdown.
 * @group Settings
 * @category Base
 */
export type LLSelectOutsideClickBehavior = 'pass-through' | 'block'

/**
 * Who initiated a chosen-state change, delivered to `onChange` as
 * `meta.source`.
 * - `'user'`: a pointer or keyboard interaction inside the widget - an
 *   option toggle, a tag's remove button, the clear button, the choose-all
 *   row.
 * - `'api'`: any programmatic call - `setChosenItem` / `setChosenItems`,
 *   `toggleItem`, the `choose*` bulk ops, `setItems` reconciliation.
 * @group Events
 */
export type LLSelectChangeSource = 'user' | 'api'

/**
 * Extra facts about one `onChange` firing, as the callback's third argument.
 * An object on purpose: future fields can be added without breaking the
 * callback signature.
 * @group Events
 */
export interface LLSelectChangeMeta {
  source: LLSelectChangeSource
}

/**
 * Resolved (defaults applied) settings shared by all select variants.
 * Subclasses (`LLSelectSingle`, `LLSelectMultiple`) extend this with their
 * mode-specific options such as `onChange`.
 *
 * Settings are frozen after the constructor. What still changes at runtime:
 * - State changes by method, and never was a setting: the items
 *   (`setItems`), the chosen value (`setChosenItem` / `setChosenItems`),
 *   `disabled` (`setDisabled`).
 * - Two settings have a setter, because they are text: `uiTranslationPack`
 *   (`setUiTranslationPack`) and `placeholder` (`setPlaceholder`).
 * - Every other setting is fixed for the instance's lifetime.
 * - To change a fixed setting, build a new instance. One build takes about
 *   0.2 ms.
 * - If a setting must vary at runtime, use its function form where one
 *   exists. `filterable: (items) => boolean` is re-evaluated on every open
 *   (and consulted by closed-state typeahead - see the setting).
 * @group Settings
 * @category Base
 */
export interface LLSelectBaseSettings<T, GroupKey = string> {
  /**
   * Prefix used for every CSS class and DOM id the library generates
   * (default `'llselect'`). NOTE: the shipped themes target the default
   * prefix only - a custom prefix means bringing your own CSS. Reference the
   * resolved names via `instance.classIdMap` instead of hardcoding strings.
   * @group CSS
   */
  cssClassPrefix: string
  /**
   * Text shown in the trigger when nothing is selected. App copy: an explicit
   * value always wins; when unset, the locale default
   * `uiTranslationPack.triggerPlaceholder` is used (`'Please select'` in English).
   * @group Trigger
   */
  placeholder: string
  /**
   * Accessible name of the field, like the `<label>` text of a native
   * `<select>` (e.g. `'Country'`).
   * - Applied to the trigger, the popup listbox, and (while the filter is active)
   *   the filter input; per-mode wiring: `docs/llm/A11Y.md` "Accessible name".
   * - The name resolves by the FIRST set rung, mirroring the W3C
   *   accessible-name computation order:
   *   1. `ariaLabelledBy`.
   *   2. `ariaLabel` (this setting).
   *   3. `labelEl` - its element's id becomes the resolved `ariaLabelledBy`.
   *   4. None set: the field is unnamed. A combobox requires a name
   *      (WAI-ARIA 1.2), so one `console.warn` per page reports the first
   *      offender.
   * - `null` (default): this rung is skipped. An empty or whitespace-only
   *   string counts as unset too - the accname computation skips a blank
   *   `aria-label`, and so does the ladder.
   * @group Accessible name
   */
  ariaLabel: string | null
  /**
   * Space-separated DOM id(s) of the visible label element(s) naming the
   * field; forwarded as `aria-labelledby` to the same elements as `ariaLabel`.
   * - Prefer this over `ariaLabel` when a visible label element exists: the
   *   spoken name then always matches the visible text.
   * - `null` (default): not forwarded; see `ariaLabel` for the naming
   *   requirement. An empty or whitespace-only string counts as unset too,
   *   same as `ariaLabel`.
   * - Rung 1 of the resolution order (the numbered list at `ariaLabel`): it
   *   wins whenever set, matching the ARIA name computation.
   * @group Accessible name
   */
  ariaLabelledBy: string | null
  /**
   * The widget's visible label element - the one foreign element the library
   * touches. Emulates native `<label for>` (which cannot target these divs)
   * in both directions:
   * - clicking it focuses the trigger (focus ONLY; native `<select>` does not
   *   open on label click, neither does this);
   * - it feeds the accessible name as rung 3 of the resolution order (the
   *   numbered list at `ariaLabel`): with neither aria setting given, the
   *   label's id becomes the resolved `ariaLabelledBy` (an id is minted from
   *   `classIdMap.labelId` if the element has none) - a live reference, so
   *   later label text changes stay correct.
   * - `null` = no label element; the name ladder just skips this rung.
   * - `destroy()` removes the click listener and a minted id.
   * @group Accessible name
   */
  labelEl: HTMLElement | null
  /**
   * Equality predicate for item values - return `true` when `a` and `b` are the
   * same item.
   * - Required for non-primitive `T`. The default compares by identity:
   *   `===`, except that `NaN` equals `NaN` (SameValueZero, the same rule
   *   `Set` uses), so every code path agrees on what "the same item" means.
   * - Used for selection, dedup, and matching the chosen item back to the list.
   * - Symmetric: do not depend on which argument is the candidate vs the
   *   existing item.
   * @group Items
   */
  compareFn: (a: T, b: T) => boolean
  /**
   * See {@link LLSelectOutsideClickBehavior}.
   * @group Popup
   */
  outsideClickBehavior: LLSelectOutsideClickBehavior
  /**
   * The trigger arrow slot's content ELEMENT (typically a dropdown chevron or
   * triangle). Called whenever the arrow may need to change - including on
   * every open/close - so the returned element can vary with `isOpened`.
   * - fn returns `null` - no arrow for that state.
   * - setting is `null` (default) - the library adds nothing to the arrow slot.
   * @group Trigger
   */
  createTriggerArrowContentElFn: ((state: { isOpened: boolean }) => HTMLElement | SVGElement | null) | null
  /**
   * Whether the trigger shows a clear (x) button that empties the selection.
   * - Default `false`.
   * - Clearing sets the empty value: `undefined` for a single select, `[]`
   *   for a multiple. It goes through the normal setters, so `onChange`
   *   fires with that empty value. There is no separate clear event.
   * - The empty value is not configurable, and no library makes it so:
   *   "nothing chosen" already exists before the first choice, so the value
   *   types carry `undefined` either way.
   * - If your model is a plain type like `string` and must never hold
   *   `undefined`, pick one of these:
   *   - Add a real "none" item (for example `''` shown as "(none)") and skip
   *     `clearable`. The model then stays `string` after the first choice,
   *     exactly like a native `<select>` with a placeholder option.
   *   - Keep `clearable` and coerce in `onChange`: `item ?? ''`.
   * - "Clear" means back to empty and the placeholder, never "back to some
   *   default option". If you want a default instead, set it yourself in
   *   `onChange`.
   * - The button sits in its OWN trigger slot (like the arrow, so it never
   *   collides with `createTriggerContentElFn`), is `tabindex="-1"`, and
   *   carries an `aria-label`. The theme hides it via `data-empty` while
   *   nothing is selected.
   * @group Trigger
   */
  clearable: boolean
  /**
   * Content ELEMENT of the clear button (its x icon), mirroring `createTriggerArrowContentElFn`.
   * `null` (default) = the theme's CSS glyph. The library always owns the button,
   * its click (clears + stops propagation) and aria; this only fills the icon.
   * @group Trigger
   */
  createTriggerClearButtonContentElFn: (() => HTMLElement | SVGElement | null) | null
  /**
   * Whether the popup includes a filter input.
   * - `false` (default): never.
   * - `true`: always.
   * - Predicate `(items) => boolean`: conditional - evaluated against the
   *   CURRENT full item list each time the popup OPENS (never mid-open; a
   *   `setItems` crossing the threshold applies on the next open). E.g.
   *   `filterable: (items) => items.length > 10`. A printable key pressed
   *   while CLOSED also calls the predicate, read-only, to decide whether
   *   prefix typeahead may take the key - keep it cheap and side-effect free.
   * The ARIA mode follows the evaluated value per open cycle: active =
   * trigger `role="button"`, focus moves to the input; inactive = exactly
   * like `filterable: false` (trigger stays `role="combobox"`, focus stays on
   * the trigger). See `docs/llm/A11Y.md` and `docs/llm/DESIGN.md`.
   * @group Filtering
   */
  filterable: boolean | ((items: readonly T[]) => boolean)
  /**
   * Chrome strings (AT labels + generated text): the i18n customization point. Resolved
   * against English: pass a language pack whole (`uiTranslationPack: zhTW` from
   * `@llselect/core/i18n`) or override single keys
   * (`uiTranslationPack: { ...zhTW, filterInputPlaceholder: '...' }`).
   * Key-by-key contract (incl. what `null` means where allowed):
   * {@link LLSelectUiTranslationPack}.
   * @group i18n
   */
  uiTranslationPack: LLSelectUiTranslationPack
  /**
   * Predicate used by the filter input; return `true` to keep the item.
   * `null` (default) means the built-in case-insensitive substring match
   * against the item's resolved text (`itemToStringFn` / `itemToString`).
   * Pass a custom function for fuzzy / domain-specific matching.
   * - `query` is the RAW input value: not trimmed and not lower-cased. Normalize
   *   it yourself (the built-in lower-cases both sides; it does not trim).
   * - Not called while the query is empty (an empty box shows every item), but a
   *   whitespace-only query (e.g. `"  "`) does call it.
   * @group Filtering
   */
  filterFn: ((item: T, query: string) => boolean) | null
  /**
   * The no-results message's visible content ELEMENT, without subclassing.
   * Mirrors `createItemContentElFn`: the library owns the message container
   * (`role="status"`, class, show/hide), this fills its content only.
   * - `query` is the current filter query (`''` when the filter is inactive or
   *   the list is simply empty), so "Nothing matches <query>" is possible.
   * - Return an `HTMLElement`: inserted as the content (you own it; include
   *   real text - the status region announces its TEXT content).
   * - `null` (setting default, or returned): plain text from
   *   `uiTranslationPack.popupListNoResults`.
   * Re-evaluated every time the message is shown (the query may differ). The DOM
   * is refreshed only when the resolved TEXT changes - the status region is keyed
   * on text so it announces once, not per keystroke - so rich content whose visible
   * markup varies while its text stays constant is not re-rendered.
   * @group Filtering
   */
  createPopupListNoResultsContentElFn: ((query: string) => HTMLElement | null) | null
  /**
   * How the popup decides its width. Does NOT affect the trigger - trigger
   * width is always whatever your CSS says.
   *
   * - `'fit-content'` (default): popup width grows to its own content (items,
   *   filter input, ...) and never shrinks below the trigger's width - the
   *   native `<select>` dropdown behavior, minus its viewport overflow:
   *   auto-shifts and width-clamps when the natural width would not fit.
   *   Direction-aware: in an RTL context
   *   (`getComputedStyle(trigger).direction === 'rtl'`, read once per open)
   *   it right-aligns to the trigger and grows LEFTWARD, the mirror of LTR.
   * - `'match-trigger'`: popup width equals trigger width; long item text wraps
   *   inside the popup.
   * @group Popup
   */
  popupWidthPolicy: LLSelectWidthPolicy
  /**
   * Predicate deciding whether an individual item is disabled. `null` (default)
   * = nothing disabled. A disabled item is not selectable (click / Enter) and is
   * skipped by keyboard nav; it keeps `role="option"` plus `aria-disabled`.
   * Re-evaluated on every render (never cached). For a generic `T` this is the
   * only way to mark items - the library cannot read a `disabled` field off an
   * unknown type. See `docs/llm/DESIGN.md`.
   * @group Disabling
   */
  itemDisabledFn: ((item: T) => boolean) | null
  /**
   * When the control is disabled via `setDisabled(true)`, whether the trigger
   * stays in the tab order (`tabindex="0"`). `false` (default) takes it out
   * (`-1`). Set `true` so keyboard / AT users can focus the disabled control to
   * read a "why disabled" tooltip.
   * @group Disabling
   */
  focusableWhenDisabled: boolean
  /**
   * Item -> display string, without subclassing.
   * - `null` (default) = `String(item)`.
   * - Read by the `itemToString` method's default; used for list text, the
   *   single trigger text, the option's accessible name, and the default
   *   filter. Inserted as `textContent` (plain text, NOT parsed as HTML).
   * - For rich content (icons etc.), pass `createItemContentElFn`.
   * @group Items
   */
  itemToStringFn: ((item: T) => string) | null
  /**
   * Item -> the visible content ELEMENT of its list row, without subclassing.
   * - Return an `HTMLElement` and the library inserts it as-is (you own the
   *   node); it becomes the row's visible content.
   * - `null` = plain `textContent` from `itemToString`. This is the default,
   *   both when the setting is unset and when your function returns `null` for
   *   a particular item.
   * - Fills the VISIBLE content only. You never touch `aria-*`: when this
   *   returns an element the library sets the option's `aria-label` from
   *   `itemToString`, so the accessible name + match text stay owned by
   *   `itemToString` no matter what you render (icon-only, reordered, ...).
   *   To make the spoken/matched text differ from the visible content, set the
   *   two independently: `itemToStringFn` for the name/matching,
   *   `createItemContentElFn` for the look.
   * - For full control of the option element (tag / wiring), subclass
   *   `createItemEl` instead.
   * - Runs per rendered row per render, and re-runs whenever a row is
   *   rebuilt: open, filter, `setItems`, AND chosen-state changes (both modes
   *   replace the affected rows in place while the popup is open). Content
   *   that reads selection state (e.g. a checkmark on the chosen row via
   *   `createCheckmarkSvgEl`) therefore stays fresh; keep the function cheap.
   *
   * @example
   *   // List shows an icon + the item text; screen readers announce just that text.
   *   itemToStringFn: (lang) => lang.name,
   *   createItemContentElFn: (lang) => {
   *     const row = document.createElement('span')
   *     const icon = document.createElement('i')
   *     icon.className = `mdi mdi-${lang.icon}`
   *     icon.setAttribute('aria-hidden', 'true') // decorative
   *     row.append(icon, lang.name)
   *     return row
   *   }
   * @group Items
   */
  createItemContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Item -> its group's key (identity), enabling optgroup rendering.
   * - `null` (setting, default): grouping off - flat list, no headers.
   * - fn returns `null`: this item is in no group; renders ungrouped.
   * - Contiguous items with an equal key (per `groupKeyCompareFn`) form one
   *   group. By default non-contiguous data is first gathered into display
   *   order (`gatherGroups`); with `gatherGroups: false` the data must be
   *   pre-sorted by group. See `docs/llm/DESIGN.md`.
   * @group Grouping
   */
  itemToGroupKeyFn: ((item: T) => GroupKey | null) | null
  /**
   * Whether the library gathers non-contiguous groups before rendering
   * (`true`, default). Grouping renders contiguous runs, so scattered items
   * sharing a key would otherwise produce a duplicate header per gap.
   * - `true`: the DISPLAY order is derived via {@link gatherItemsByGroupKey}:
   *   groups in first-appearance order, within-group order kept, ungrouped
   *   (`null`-key) items in place. The data itself (`items` / `getItems()`)
   *   is never reordered, and already-contiguous data is detected in one
   *   scan and used as-is.
   * - `false`: strict mode - you guarantee the data is pre-sorted by group; a
   *   key reappearing after a gap renders a duplicate header and
   *   `console.warn`s, so a broken sort is surfaced instead of silently
   *   fixed.
   * No effect while grouping is off (every key `null`).
   * @group Grouping
   */
  gatherGroups: boolean
  /**
   * Equality for two group keys; decides whether items share a group (both
   * the `gatherGroups` gather and the contiguous-run rendering use it).
   * - `null` (default) = identity, the same rule as the default `compareFn`
   *   (`===`, plus `NaN` equals `NaN`); right for string / number keys.
   * - Supply only when `GroupKey` is an object without usable reference identity.
   * - Mirrors `compareFn`, one level up.
   * @group Grouping
   */
  groupKeyCompareFn: ((a: GroupKey, b: GroupKey) => boolean) | null
  /**
   * Group key -> the header's display text. The i18n customization point: keep keys stable,
   * translate here.
   * - `null` (default) = `String(groupKey)`.
   * @group Grouping
   */
  groupKeyToStringFn: ((groupKey: GroupKey) => string) | null
  /**
   * Predicate: is this whole group disabled?
   * - `null` (default) = no group disabled.
   * - `true` = every item in the group is treated as disabled (layers on top of
   *   `itemDisabledFn`).
   * @group Grouping
   */
  groupDisabledFn: ((groupKey: GroupKey) => boolean) | null
  /**
   * Group header -> its visible content ELEMENT (icon / count badge / rich
   * markup), without subclassing. Mirrors `createItemContentElFn`.
   * - Return an `HTMLElement` and the library inserts it as the header's visible
   *   content; the group's accessible name stays `groupKeyToString` (on the
   *   container `aria-label`) and the label element stays `aria-hidden`.
   * - `null` (default, or returned for a group) = plain text from
   *   `groupKeyToString`.
   * - `itemsInGroup` is the group's items, so you can render "Fruits (4)" or a
   *   summary without recomputing the grouping.
   * @group Grouping
   */
  createGroupLabelContentElFn: ((groupKey: GroupKey, itemsInGroup: readonly T[]) => HTMLElement | null) | null
  /**
   * Fired right after the popup opens. An `open()` call that does not actually
   * open the popup (already open, a disabled control, or a trigger scrolled out
   * of view or clipped) does not fire it. Fires in ADDITION to the protected
   * `onOpened` hook - the setting is for consumers, the hook for subclasses;
   * both run. `null` (default) = nothing.
   * @group Events
   */
  onOpen: (() => void) | null
  /**
   * Fired right after the popup closes. A no-op `close()` does not fire it.
   * Additive with the protected `onClosed` hook, like {@link onOpen}.
   * @group Events
   */
  onClose: (() => void) | null
}

/**
 * Constructor input for a resolved settings bag `S`: every field optional,
 * and `uiTranslationPack` accepts a PARTIAL pack (missing keys fall back to
 * English). Shared by the base / single / multiple `*SettingsInput` types;
 * use it for a subclass wrapper that extends the settings bag.
 * @group Settings
 * @category Base
 */
export type LLSelectSettingsInputOf<S extends { uiTranslationPack: LLSelectUiTranslationPack }> =
  & Partial<Omit<S, 'uiTranslationPack'>>
  & { uiTranslationPack?: Partial<LLSelectUiTranslationPack> }

/**
 * Constructor-time settings input - every field is optional and missing
 * fields fall back to the library defaults.
 * @group Settings
 * @category Base
 */
export type LLSelectBaseSettingsInput<T, GroupKey = string> = LLSelectSettingsInputOf<LLSelectBaseSettings<T, GroupKey>>

/**
 * Resolved CSS class names and DOM ids for one instance. Exposed on
 * `instance.classIdMap` so callers can reuse them in their own CSS or query
 * selectors instead of hard-coding the strings.
 * @group CSS & DOM
 */
export interface LLSelectClassIdMap {
  /** Class on `rootEl` (the caller-passed mount element). */
  rootClass: string
  /**
   * Class on `triggerEl` (the interactive trigger). Its `role` is
   * `combobox` while the filter is inactive and `button` while a filterable popup
   * is open; see `docs/llm/A11Y.md`.
   */
  triggerClass: string
  /** Class on the inner span where content (text/tags) is rendered. */
  triggerContentClass: string
  /** Class on the inner span where the optional dropdown arrow lives. */
  triggerArrowClass: string
  /** Class on the clear (x) button slot in the trigger (`clearable`). */
  triggerClearButtonClass: string
  /** Class on `popupEl` (the outer popup wrapper, no ARIA role). */
  popupClass: string
  /** Class on `popupListEl` (the inner element with `role="listbox"`). */
  popupListClass: string
  /**
   * Class on the no-results message element (`role="status"`), shown below
   * the (empty) listbox when the visible item list has zero entries.
   */
  popupListNoResultsClass: string
  /**
   * Class on the choose-all leading row (`LLSelectMultiple`, `chooseAllRow`
   * setting). Also carries `itemClass` plus `data-chosen-state="none|some|all"`
   * for the tri-state visual.
   */
  chooseAllRowClass: string
  /** Class on every item element (`role="option"`) inside the popup list. */
  itemClass: string
  /**
   * Extra class added to the currently keyboard-focused item element.
   * Use this to style the focused item.
   */
  itemFocusedClass: string
  /**
   * Class added to a disabled item element (which also carries
   * `aria-disabled="true"`). A stable hook for styling / tooltip targeting.
   */
  itemDisabledClass: string
  /**
   * Class on a group container (`role="group"`). A disabled group's container
   * also carries `aria-disabled="true"` + `data-disabled="true"`.
   */
  groupClass: string
  /**
   * Class on the visible group label element (`aria-hidden`), inside the group
   * container above its items. A hook for styling / sticky headers.
   */
  groupLabelClass: string
  /** Class on the tag-list container in `triggerDisplay: 'tags'` mode (multi). */
  tagsClass: string
  /** Class on one tag chip (`triggerDisplay: 'tags'`). */
  tagClass: string
  /** Class on a tag's remove (x) button; `aria-label` names the item, `tabindex="-1"`. */
  tagRemoveButtonClass: string
  /**
   * Class on a tag chip whose item is effectively disabled (which also carries
   * `aria-disabled="true"`, and whose x button no longer removes it). Mirrors
   * `itemDisabledClass`; a stable hook for greying the inert chip.
   */
  tagDisabledClass: string
  /**
   * Class added to `rootEl` while the popup is open. Use it as a CSS hook
   * for open-state styling (also available as `[data-state='open']` on the
   * trigger).
   */
  openClass: string
  /** DOM `id` of `triggerEl`. Unique across instances. */
  triggerId: string
  /**
   * DOM `id` minted onto the `labelEl` setting's element when it has none
   * (the resolved `ariaLabelledBy` then references it). Unique across
   * instances. Unused when `labelEl` is null or already carries an id.
   */
  labelId: string
  /** DOM `id` of the trigger content span. Unique across instances. */
  triggerContentId: string
  /**
   * DOM `id` of the hidden plain-text value span (root-level sibling of the
   * trigger). Unique across instances. Referenced by the filterable-mode
   * trigger's `aria-labelledby` chain so the closed button's accessible name
   * includes the current value as PLAIN TEXT - rich trigger content (tag
   * chips with labelled remove buttons) must not leak control names into the
   * field name (see the `ariaLabel` / `ariaLabelledBy` settings).
   */
  triggerValueId: string
  /**
   * DOM `id` of `popupListEl` (the inner listbox). Unique across instances.
   * Referenced by the trigger's `aria-controls` attribute.
   */
  popupListId: string
  /** Class on the filter input element inside the popup. */
  filterInputClass: string
  /** DOM `id` of the filter input. Unique across instances. */
  filterInputId: string
}

const DEFAULT_PREFIX = 'llselect'

let instanceCounter = 0

/**
 * Package-internal (not re-exported): subclasses detect it to pick fast paths.
 * SameValueZero (`===` plus `NaN` equals `NaN`), matching the `Set` those fast
 * paths use - `===` alone let a `NaN` item be chosen twice (QUALITY-92).
 * Second job: the reference-swap check in both `onItemsChanged` ("same value?",
 * a different question from item identity). Keep it SameValueZero for that too.
 */
export function defaultCompareFn<T>(a: T, b: T): boolean {
  return a === b || (a !== a && b !== b)
}

/**
 * Blank and whitespace-only name settings count as UNSET: the accessible-name
 * computation skips an empty `aria-label` and moves on, so the ladder (and
 * the unnamed warn) must do the same instead of treating `''` as "named".
 */
function blankToNull(value: string | null | undefined): string | null {
  return value == null || value.trim() === '' ? null : value
}

/** Once-per-page guard for the unnamed-accessible-name warning. */
let warnedUnnamedName = false

/** Package-internal test hook (not re-exported): reset the once-per-page unnamed-name warning. */
export function resetUnnamedNameWarning(): void {
  warnedUnnamedName = false
}

/** Once-per-page guard for the duplicate-items warning. */
let warnedDuplicateItems = false

/** Package-internal test hook (not re-exported): reset the once-per-page duplicate-items warning. */
export function resetDuplicateItemsWarning(): void {
  warnedDuplicateItems = false
}

function createClassIdMap(prefix: string): LLSelectClassIdMap {
  const uniq = `${prefix}${++instanceCounter}`
  return {
    rootClass: `${prefix}-root`,
    triggerClass: `${prefix}-trigger`,
    triggerContentClass: `${prefix}-trigger-content`,
    triggerArrowClass: `${prefix}-trigger-arrow`,
    triggerClearButtonClass: `${prefix}-trigger-clear-button`,
    popupClass: `${prefix}-popup`,
    popupListClass: `${prefix}-popup-list`,
    popupListNoResultsClass: `${prefix}-popup-list-no-results`,
    chooseAllRowClass: `${prefix}-choose-all-row`,
    itemClass: `${prefix}-item`,
    itemFocusedClass: `${prefix}-item-focused`,
    itemDisabledClass: `${prefix}-item-disabled`,
    groupClass: `${prefix}-group`,
    groupLabelClass: `${prefix}-group-label`,
    tagsClass: `${prefix}-tags`,
    tagClass: `${prefix}-tag`,
    tagRemoveButtonClass: `${prefix}-tag-remove-button`,
    tagDisabledClass: `${prefix}-tag-disabled`,
    openClass: `${prefix}-open`,
    triggerId: `${uniq}-trigger`,
    labelId: `${uniq}-label`,
    triggerContentId: `${uniq}-trigger-content`,
    triggerValueId: `${uniq}-trigger-value`,
    popupListId: `${uniq}-popup-list`,
    filterInputClass: `${prefix}-filter-input`,
    filterInputId: `${uniq}-filter-input`,
  }
}

/**
 * One run in the rendered popup list: a single ungrouped item element, or a
 * group (header + its item elements). Computed from the flat visible list;
 * group headers never enter `itemEls`, so index alignment is preserved.
 */
type PopupListSegment<T, GroupKey> =
  | { readonly group: false; readonly el: HTMLElement }
  | { readonly group: true; readonly key: GroupKey; readonly index: number; readonly items: T[]; readonly els: HTMLElement[] }

/**
 * Abstract base for all select variants. Owns DOM scaffolding, ARIA wiring,
 * positioning, keyboard navigation, lazy popup-list rendering, and
 * outside-click handling. Subclasses (`LLSelectSingle`, `LLSelectMultiple`)
 * own chosen-state, decide what happens on item click, and customise the
 * trigger text via `renderTriggerContent`.
 *
 * @typeParam T - item value type. Use `unknown` (default) only when you
 *   intend to narrow inside templates / handlers; usually pass a concrete
 *   type like `string` or your domain object.
 * @typeParam GroupKey - the group key type `itemToGroupKeyFn` returns
 *   (`null` from that fn means "this item is in no group"). Defaults to
 *   `string`. Open it to objects only together with `groupKeyCompareFn`; see
 *   DESIGN.md "Data model".
 * @typeParam S - the resolved settings type, for subclasses that EXTEND the
 *   settings bag. Plain use never passes it. A subclass declares
 *   `extends LLSelectBase<T, GroupKey, MySettings>` and `this.settings` is
 *   typed `MySettings`; the constructor's `subclassSettings` param then only
 *   accepts exactly the extra fields.
 * @group Select classes
 */
export abstract class LLSelectBase<T = unknown, GroupKey = string, S extends LLSelectBaseSettings<T, GroupKey> = LLSelectBaseSettings<T, GroupKey>> {
  /**
   * The caller-passed mount element, now decorated as the select's root.
   * Library does not replace this node, so the caller's original reference,
   * id, and data-* attributes stay valid.
   * @group DOM elements
   */
  public readonly rootEl: HTMLElement
  /**
   * The interactive trigger element. Receives focus, click, and keydown
   * events; carries `aria-expanded`, `aria-controls`, and
   * `data-state="open|closed"`. Its `role` depends on the filter mode: `combobox`
   * while the filter is inactive (it then also hosts `aria-activedescendant`) and
   * `button` while a filterable popup is open (the filter input hosts
   * `aria-activedescendant`). See `docs/llm/A11Y.md`.
   * @group DOM elements
   */
  public readonly triggerEl: HTMLElement
  /**
   * Inner span inside the trigger where text/tags are written.
   * Subclasses' `renderTriggerContent` writes here so the sibling arrow slot
   * is preserved across re-renders.
   * @group DOM elements
   */
  public readonly triggerContentEl: HTMLElement
  /**
   * Hidden root-level span (sibling of the trigger) mirroring the current
   * value as plain text. Kept in sync by `commitTriggerContentToDom`;
   * referenced by the filterable-mode `aria-labelledby` chain (see
   * `classIdMap.triggerValueId`). Outside the trigger so
   * `triggerEl.textContent` stays exactly the visible content.
   * @group DOM elements
   */
  protected readonly triggerValueEl: HTMLElement
  /**
   * The outer popup wrapper. Has no ARIA role itself - it just hosts the
   * popup chrome (future: filter input, toggle-all control) and the inner
   * `popupListEl`. Hidden via the `hidden` attribute when closed; positioned
   * via inline styles by the positioner when open.
   * @group DOM elements
   */
  public readonly popupEl: HTMLElement
  /**
   * The inner element with `role="listbox"`, holding the item children.
   * Sits inside `popupEl` so siblings (filter input, toggle-all) can live
   * above it without violating ARIA's "listbox children must be options"
   * rule. The trigger's `aria-controls` points to this element.
   * @group DOM elements
   */
  public readonly popupListEl: HTMLElement
  /**
   * Resolved class names and ids for this instance.
   * @group DOM elements
   */
  public readonly classIdMap: LLSelectClassIdMap

  /**
   * Resolved settings (defaults applied) - ONE bag for the whole hierarchy.
   * Typed by the class's `S` param: a subclass that extends the settings
   * passes its resolved extra fields through the constructor's
   * `subclassSettings` param, and this field is `S` with no re-typing
   * (see `LLSelectSingle` / `LLSelectMultiple`).
   * @group State (protected)
   */
  protected readonly settings: S
  /** Raw explicit `placeholder` (constructor or `setPlaceholder`); `setUiTranslationPack` re-resolves against it. */
  private explicitPlaceholder: string | null
  /** True when the constructor minted `classIdMap.labelId` onto `labelEl`; `destroy()` then removes it. */
  private labelElIdMinted = false
  /** Click handler bound to `labelEl`: focus the trigger, never open (native label parity). */
  private readonly handleLabelElClick = (): void => { this.triggerEl.focus() }
  /**
   * Current item list. Defensive copy of what `setItems` was given.
   * @group State (protected)
   */
  protected items: T[] = []
  /** Whether the popup is currently open; public reader {@link isOpened}. */
  private opened = false
  /**
   * Index (into `items`) of the currently keyboard-focused item, or `-1`
   * when nothing is focused (closed popup, or no items).
   * @group State (protected)
   */
  protected focusedIndex = -1
  /** Control-level disabled state (whole select); toggled via `setDisabled`. */
  private disabled = false
  /**
   * Who the change being applied right now is attributed to; the variants'
   * `onChange` firing reads it. Set to `'user'` by `withUserChangeSource`
   * and consumed (reset to `'api'`) by the first `onChange` fired, so a
   * nested api-driven change inside an `onChange` handler reports `'api'`.
   * @group State (protected)
   */
  protected changeSource: LLSelectChangeSource = 'api'
  private triggerArrowEl: HTMLElement
  /** The clear button once a trigger render has built it (`clearable` only), else `null`; every later trigger render swaps it through `createTriggerClearButtonEl` (or keeps it, if that override returns the same element). */
  private triggerClearButtonEl: HTMLElement | null = null
  private positioner: Positioner | undefined
  /**
   * Whether the Popover API exists (feature-detected once per instance).
   * When true the popup renders in the top layer while open - above every
   * stacking context, immune to containing-block-creating ancestors - while
   * staying in place in the DOM. See `docs/llm/DESIGN.md` "In-place popup".
   */
  private readonly popoverSupported: boolean
  private itemEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined
  /**
   * The leading row element (`LLSelectMultiple`'s choose-all) for the current
   * render, or `undefined` when absent. Never part of `itemEls`.
   */
  private leadingRowEl: HTMLElement | undefined
  /** Whether keyboard focus sits on the leading row (mutually exclusive with an item focus). */
  private leadingRowFocused = false
  private outsideHandler: ((ev: Event) => void) | undefined
  private focusOutHandler: ((ev: FocusEvent) => void) | undefined
  /**
   * Block-mode only. Suppresses the browser's default focus shift on outside
   * mousedown so the focusout-close path cannot race ahead of the click
   * capture and detach it before the click fires.
   */
  private blockMouseDownHandler: ((ev: Event) => void) | undefined
  /**
   * Element that owns `aria-activedescendant` and receives keydown for option
   * navigation. Equals the filter input while the filter is active, else the
   * trigger. Re-pointed by `syncFilterModeToDom` (constructor + every open).
   */
  private comboboxEl!: HTMLElement
  /**
   * Filter input element. Always built into the popup DOM and always wired
   * (a `hidden` input receives no events); kept `hidden` while the filter is
   * inactive.
   */
  private filterInputEl!: HTMLInputElement
  /**
   * No-results message element (`role="status"`). Always built (like the
   * filter input), sits AFTER the listbox inside `popupEl` so the listbox
   * keeps its options-only children contract; `hidden` while the visible
   * list has entries.
   */
  private popupListNoResultsEl!: HTMLElement

  /**
   * Text last written into the no-results region, or `null` while it is hidden.
   * Guards a re-announcement: `role="status"` speaks on every content change, so
   * a keystroke that keeps the list empty must not rewrite identical text (A11Y.md:
   * announced once per appearance). Reset to `null` when the region hides, so the
   * next appearance announces again.
   */
  private lastNoResultsText: string | null = null
  /**
   * Whether the filter input is active for the CURRENT open cycle. Evaluated
   * from the `filterable` setting (predicate form reads the current items) in
   * the constructor and on every `open()` - never re-evaluated mid-open, so
   * the focus host cannot be yanked while the popup is up.
   */
  private filterActive: boolean
  private query = ''
  private filteredItems: T[] | undefined
  // Prefix-typeahead state. Expiry is a timestamp delta checked on the next
  // character (getUpdatedTypeaheadBuffer) - no timer to clean up. Reset by close()
  // and by any mapped action key.
  private typeaheadBuffer = ''
  private typeaheadLastTime = 0
  /** Memoized display order of `items` (`gatherGroups` gather); `undefined` = recompute on next need. */
  private gatheredItems: readonly T[] | undefined
  private composing = false

  /**
   * @param targetEl - mount element. Becomes `rootEl`; its existing children
   *   are wiped and replaced with the trigger + popup structure. Pre-set
   *   classes / id / data-* attributes on this element are preserved.
   * @param settings - optional partial settings. Missing fields use defaults
   *   ({@link LLSelectBaseSettings}).
   * @param subclassSettings - for subclasses that EXTEND the settings bag: their
   *   own fields, already resolved (defaults applied). Typed by the class's
   *   `S` param, so it accepts exactly the extra fields and nothing else.
   *   Merged into `this.settings` right here, so the bag is complete before
   *   any base construction code (e.g. `createFilterInputEl` reading the
   *   pack) can read it.
   * @group Lifecycle
   */
  constructor(
    targetEl: HTMLElement,
    settings?: LLSelectSettingsInputOf<S>,
    subclassSettings?: Omit<S, keyof LLSelectBaseSettings<T, GroupKey>>,
  ) {
    // classIdMap first: labelEl id minting below needs labelId.
    this.classIdMap = createClassIdMap(settings?.cssClassPrefix ?? DEFAULT_PREFIX)
    // The pack resolves first: the placeholder's library default is localized
    // chrome (uiTranslationPack.triggerPlaceholder), while an explicit `placeholder` is
    // app copy and wins. The raw input placeholder is kept so
    // setUiTranslationPack can re-run this exact resolution.
    this.explicitPlaceholder = settings?.placeholder ?? null
    const uiTranslationPack: LLSelectUiTranslationPack = { ...DEFAULT_UI_TRANSLATION_PACK, ...settings?.uiTranslationPack }
    // labelEl resolves before the name ladder: with neither `ariaLabelledBy`
    // nor `ariaLabel` given, the label's id becomes the resolved
    // `ariaLabelledBy`, and every downstream consumer (trigger chain, filter
    // input, listbox) works unchanged.
    const labelEl = settings?.labelEl ?? null
    if (labelEl !== null && labelEl.id === '') {
      labelEl.id = this.classIdMap.labelId
      this.labelElIdMinted = true
    }
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: this.explicitPlaceholder ?? uiTranslationPack.triggerPlaceholder,
      ariaLabel: blankToNull(settings?.ariaLabel),
      ariaLabelledBy: blankToNull(settings?.ariaLabelledBy) ?? (blankToNull(settings?.ariaLabel) === null && labelEl !== null ? labelEl.id : null),
      labelEl,
      compareFn: settings?.compareFn ?? defaultCompareFn,
      outsideClickBehavior: settings?.outsideClickBehavior ?? 'pass-through',
      createTriggerArrowContentElFn: settings?.createTriggerArrowContentElFn ?? null,
      clearable: settings?.clearable ?? false,
      createTriggerClearButtonContentElFn: settings?.createTriggerClearButtonContentElFn ?? null,
      filterable: settings?.filterable ?? false,
      uiTranslationPack,
      filterFn: settings?.filterFn ?? null,
      createPopupListNoResultsContentElFn: settings?.createPopupListNoResultsContentElFn ?? null,
      popupWidthPolicy: settings?.popupWidthPolicy ?? 'fit-content',
      itemDisabledFn: settings?.itemDisabledFn ?? null,
      focusableWhenDisabled: settings?.focusableWhenDisabled ?? false,
      itemToStringFn: settings?.itemToStringFn ?? null,
      createItemContentElFn: settings?.createItemContentElFn ?? null,
      itemToGroupKeyFn: settings?.itemToGroupKeyFn ?? null,
      gatherGroups: settings?.gatherGroups ?? true,
      groupKeyCompareFn: settings?.groupKeyCompareFn ?? null,
      groupKeyToStringFn: settings?.groupKeyToStringFn ?? null,
      groupDisabledFn: settings?.groupDisabledFn ?? null,
      createGroupLabelContentElFn: settings?.createGroupLabelContentElFn ?? null,
      onOpen: settings?.onOpen ?? null,
      onClose: settings?.onClose ?? null,
      // Settings cast (one per constructor, see single / multiple): TS
      // cannot prove "base fields + Omit<S, base keys>" reassembles a generic
      // S. The channel itself is typed: the subclassSettings param accepts
      // exactly the extra fields.
      ...subclassSettings,
    } as S
    // Loud failure over a silent a11y violation, like the group-order warn:
    // an unnamed combobox violates WAI-ARIA 1.2 (A11Y.md, name ladder).
    // Once per page, not per instance - a page full of unnamed widgets (a
    // benchmark, a sandbox) must not flood the console nor pay a per-build
    // cost; one nudge carries the rule.
    if (!warnedUnnamedName && this.settings.ariaLabel === null && this.settings.ariaLabelledBy === null) {
      warnedUnnamedName = true
      // The element rides along so DevTools can jump straight to the first
      // offender instead of leaving the developer to hunt.
      console.warn('llselect: this widget has no accessible name - pass ariaLabelledBy, ariaLabel, or labelEl. An unnamed combobox violates WAI-ARIA 1.2. (warned once per page; first offender:)', targetEl)
    }
    // Label click focuses the trigger (native <select> label behavior: focus
    // only, never open). The one listener destroy() must undo outside the root.
    if (labelEl !== null) { labelEl.addEventListener('click', this.handleLabelElClick) }
    // Initial evaluation runs against the empty item list (setItems has not
    // happened yet); every open() re-evaluates.
    this.filterActive = this.computeFilterActive()

    // Caller-passed element becomes root (preserves its id / external refs).
    this.rootEl = targetEl
    this.rootEl.classList.add(this.classIdMap.rootClass)
    // Opt the select subtree out of browser scroll-anchoring. Without this,
    // showing/hiding the popup on first open after a page load can trigger
    // a window scroll as the browser tries to keep an anchor element in
    // place. The property excludes this element and all descendants from
    // being eligible anchor nodes.
    this.rootEl.style.overflowAnchor = 'none'
    this.rootEl.replaceChildren()

    this.triggerEl = this.createTriggerEl()
    this.triggerContentEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerContentClass}`) as HTMLElement
    this.triggerArrowEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerArrowClass}`) as HTMLElement
    // Hidden plain-text mirror of the current value, kept in sync by
    // commitTriggerContentToDom. The filterable-mode aria-labelledby chain
    // references THIS span (not the content span) so labelled controls in rich
    // content (tag remove buttons) never enter the field's accessible name.
    // A root-level sibling, NOT inside triggerEl: hidden-but-referenced text
    // still names the field, while `triggerEl.textContent` stays exactly the
    // visible content (no doubled text for consumers reading it).
    this.triggerValueEl = document.createElement('span')
    this.triggerValueEl.id = this.classIdMap.triggerValueId
    this.triggerValueEl.hidden = true

    this.popupEl = this.createPopupEl()
    this.popupListEl = this.createPopupListEl()
    this.filterInputEl = this.createFilterInputEl()
    // input always built; non-filterable keeps it `hidden`. The filter box must
    // sit above the listbox: listbox children must be options only.
    this.popupListNoResultsEl = this.createPopupListNoResultsEl()
    this.popupEl.append(this.filterInputEl, this.popupListEl, this.popupListNoResultsEl)
    this.popupEl.hidden = true
    this.syncFilterModeToDom()
    // Force border-box on the popup elements so the positioner's max-height
    // calculation stays correct regardless of the host page's box-sizing
    // setting. Without this, themes with non-zero padding/border on the
    // popup would render past the maxHeight set by the positioner and get
    // clipped by the viewport edge.
    this.popupEl.style.boxSizing = 'border-box'
    this.popupListEl.style.boxSizing = 'border-box'
    // popup-list takes the remaining vertical space inside popup and scrolls
    // when items overflow. `min-height: 0` lets flex actually shrink it.
    // These are safe to set in the constructor because they have no effect
    // while the parent is `display: none`.
    this.popupListEl.style.flex = '1'
    this.popupListEl.style.minHeight = '0'
    this.popupListEl.style.overflowY = 'auto'

    // Top layer via the Popover API where it exists: while open the popup
    // paints above every stacking context and ignores containing-block
    // -creating ancestors (transform / filter / contain), WITHOUT moving in
    // the DOM - so the rootEl.contains checks, inheritance, ARIA wiring and
    // destroy() hold verbatim. 'manual' on purpose: it disables the
    // browser's light dismiss, keeping this library's own outside-click /
    // Esc logic the sole authority. Browsers without the API run the plain
    // position:fixed path unchanged. See DESIGN.md "In-place popup".
    this.popoverSupported = typeof this.popupEl.showPopover === 'function'
    if (this.popoverSupported) { this.popupEl.setAttribute('popover', 'manual') }

    this.rootEl.append(this.triggerEl, this.triggerValueEl, this.popupEl)

    this.triggerEl.addEventListener('click', () => this.toggle())
    this.triggerEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    // Hold DOM focus on the combobox host: a mousedown anywhere in the popup - an
    // option, the no-results message, popup padding, or the list element itself
    // (tabindex="-1", so click-focusable) - would move focus off the host and
    // silently kill keyboard input (e.g. multi + filterable: mouse-toggle an item,
    // then typing goes nowhere; or a padding/no-results mousedown blurs the host and
    // focusout closes the popup). preventDefault keeps focus put; `click` still fires
    // (it does not depend on the mousedown default), so selection is unaffected. The
    // listener is on popupEl (not popupListEl) so it also covers the no-results
    // element and padding. Exception: the filter input MUST take focus, so its
    // subtree is let through. Native scrollbar dragging on the list is unaffected -
    // a scrollbar mousedown is not a cancelable content event (verified in a real
    // browser; see TODO.md).
    this.popupEl.addEventListener('mousedown', (ev) => {
      const t = this.eventTargetNode(ev)
      if (t instanceof Node && this.filterInputEl.contains(t)) { return }
      ev.preventDefault()
    })
    // Always wired, regardless of the current filter mode: a `hidden` input
    // receives no events, and the predicate form of `filterable` can activate
    // the filter on any later open().
    this.filterInputEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    this.filterInputEl.addEventListener('input', () => this.handleSearchInputEvent())
    this.filterInputEl.addEventListener('compositionstart', () => { this.composing = true })
    this.filterInputEl.addEventListener('compositionend', () => { this.composing = false; this.handleSearchInputEvent() })
  }

  /**
   * Evaluate the `filterable` setting against the current items: booleans
   * pass through, the predicate form is called with the full item list.
   */
  private computeFilterActive(): boolean {
    const filterable = this.settings.filterable
    return typeof filterable === 'function' ? filterable(this.items) : filterable
  }

  /**
   * Mirror `filterActive` onto the DOM + wiring it decides: the trigger's
   * role (`button` while active, `combobox` while not), the filter input's
   * `hidden` flag, and which element `comboboxEl` points at (the
   * `aria-activedescendant` / focus host). Called from the constructor and
   * from `open()` after re-evaluation.
   */
  private syncFilterModeToDom(): void {
    this.triggerEl.setAttribute('role', this.filterActive ? 'button' : 'combobox')
    this.filterInputEl.hidden = !this.filterActive
    this.comboboxEl = this.filterActive ? this.filterInputEl : this.triggerEl
    this.syncFieldNameToDom()
    this.syncTriggerTabindex()
  }

  /**
   * Reflect the field's accessible name (`ariaLabel` / `ariaLabelledBy`) onto
   * the elements that carry it. Runs with `syncFilterModeToDom` (constructor +
   * every open) because the trigger's wiring depends on the mode:
   * - Trigger, filter inactive (`role="combobox"`): the name directly; the
   *   combobox VALUE already comes from the trigger content.
   * - Trigger, filter active (`role="button"`): a button's name would
   *   otherwise be its content (the current value) with no field name, so
   *   `aria-labelledby` chains label + content span. With only `ariaLabel`
   *   there is no label element to reference, so the chain starts at the
   *   trigger itself - the accname algorithm substitutes its `aria-label`.
   * - Filter input: the field name replaces the `uiTranslationPack.filterInputAriaLabel`
   *   fallback (while the filter is active the input IS the field's combobox).
   * - Listbox: the field name, both modes.
   */
  private syncFieldNameToDom(): void {
    const apply = (el: HTMLElement, labelledBy: string | null, label: string | null): void => {
      if (labelledBy !== null) { el.setAttribute('aria-labelledby', labelledBy) } else { el.removeAttribute('aria-labelledby') }
      if (label !== null) { el.setAttribute('aria-label', label) } else { el.removeAttribute('aria-label') }
    }
    const { ariaLabel, ariaLabelledBy } = this.settings
    const { triggerId, triggerValueId } = this.classIdMap
    if (ariaLabelledBy !== null) {
      apply(this.triggerEl, this.filterActive ? `${ariaLabelledBy} ${triggerValueId}` : ariaLabelledBy, null)
      apply(this.filterInputEl, ariaLabelledBy, null)
      apply(this.popupListEl, ariaLabelledBy, null)
    } else if (ariaLabel !== null) {
      apply(this.triggerEl, this.filterActive ? `${triggerId} ${triggerValueId}` : null, ariaLabel)
      apply(this.filterInputEl, null, ariaLabel)
      apply(this.popupListEl, null, ariaLabel)
    } else {
      apply(this.triggerEl, null, null)
      apply(this.filterInputEl, null, this.settings.uiTranslationPack.filterInputAriaLabel)
      apply(this.popupListEl, null, null)
    }
  }

  /**
   * Open the popup. Builds item elements lazily, attaches the positioner
   * (which auto-closes if the trigger is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the item list.
   * No-op if already open.
   * @group Open & close
   */
  public open(): void {
    if (this.opened || this.disabled) { return }
    // A trigger already scrolled out of view / clipped by an ancestor when
    // open() runs cannot host a visible popup, so opening is a no-op (mirrors
    // the disabled guard). This also prevents the positioner's initial
    // synchronous placement from firing onHide -> close() re-entrantly before
    // this.positioner is assigned and the listeners are attached - which would
    // strand the outside-click / focusout / scroll / resize handlers with the
    // control already reporting itself closed (destroy() -> close() then early-
    // returns and cannot recover them).
    if (isAnchorHidden(this.triggerEl)) { return }
    const restoreWindowScroll = this.captureWindowScroll()
    this.opened = true
    // Filter mode is (re)evaluated once per open cycle, before anything that
    // depends on it (role, focus host, filtering).
    this.filterActive = this.computeFilterActive()
    this.syncFilterModeToDom()
    this.triggerEl.setAttribute('aria-expanded', 'true')
    this.triggerEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    if (this.filterActive) {
      this.query = ''
      this.filterInputEl.value = ''
      this.filterInputEl.setAttribute('aria-expanded', 'true')
      this.recomputeFilteredItems()
    }
    // `position: fixed` MUST be set before `hidden = false`. Otherwise the
    // popup is briefly an in-flow `display: flex` block while `renderPopupList`
    // appends its items, which inflates document height by the popup's
    // natural height; browsers can then run scroll-anchoring / URL-bar
    // resize before the positioner takes over and shift window scroll, even
    // though captureWindowScroll restores it at the end.
    // (Layout / display can only be set while open: setting them in the
    // constructor would override the `[hidden]` UA rule and leak the popup
    // before first open.)
    this.popupEl.style.position = 'fixed'
    this.popupEl.style.display = 'flex'
    this.popupEl.style.flexDirection = 'column'
    this.popupEl.hidden = false
    if (this.popoverSupported && this.popupEl.isConnected) {
      // Enter the top layer BEFORE anything measures: a popover not in its
      // showing state is `display: none !important` (UA rule), so the
      // positioner would measure 0. UA `[popover]` also sets `inset: 0`;
      // the positioner's inline top/left override two edges, but the
      // remaining `right/bottom: 0` over-constrain the box - and in an RTL
      // containing block an over-constrained `left` LOSES to `right: 0` -
      // so neutralize both. (isConnected: showPopover() throws on a
      // disconnected element; a detached widget is invisible either way.)
      this.popupEl.showPopover()
      this.popupEl.style.right = 'auto'
      this.popupEl.style.bottom = 'auto'
    }
    this.renderTriggerArrow()
    this.renderPopupList()
    this.positioner = createPositioner(this.triggerEl, this.popupEl, {
      onHide: () => this.close(),
      widthPolicy: this.settings.popupWidthPolicy,
      innerScrollEl: this.popupListEl,
    })
    this.attachOutsideClick()
    this.attachFocusOut()
    this.focusInitial()
    this.onOpened()
    this.settings.onOpen?.()
    if (this.filterActive) {
      this.filterInputEl.focus({ preventScroll: true })
    }
    restoreWindowScroll()
  }

  /**
   * Close the popup. Detaches positioner and outside-click listener, clears
   * the item DOM, and resets focused-item state. No-op if already closed.
   *
   * Focus return is decided automatically: when `filterable: true` and DOM
   * focus is still on the filter input at the moment of close (Esc on empty
   * filter, single-select pick, click on non-focusable area outside), focus
   * is returned to the trigger. Tab-away and outside clicks on focusable
   * elements have already moved focus elsewhere, so we leave it alone.
   * @group Open & close
   */
  public close(): void {
    if (!this.opened) { return }
    const shouldReturnFocus = this.filterActive && this.isFocused(this.filterInputEl)
    this.opened = false
    this.triggerEl.setAttribute('aria-expanded', 'false')
    this.triggerEl.setAttribute('data-state', 'closed')
    this.syncTriggerTabindex()
    this.rootEl.classList.remove(this.classIdMap.openClass)
    if (this.filterActive) {
      this.filterInputEl.setAttribute('aria-expanded', 'false')
      this.filterInputEl.value = ''
      this.query = ''
      this.filteredItems = undefined
    }
    this.positioner?.detach()
    this.positioner = undefined
    this.detachOutsideClick()
    this.detachFocusOut()
    this.popupListEl.replaceChildren()
    // The no-results region hides with the popup; reset so a reopen with a
    // still-empty list counts as a fresh appearance and re-announces.
    this.lastNoResultsText = null
    if (this.popoverSupported) {
      try {
        this.popupEl.hidePopover()
      } catch {
        // Already force-hidden without us (dialog.showModal() hides all
        // popovers) - hidePopover() then throws InvalidStateError. State
        // resyncs right here, so nothing else to do.
      }
      this.popupEl.style.right = ''
      this.popupEl.style.bottom = ''
    }
    this.popupEl.hidden = true
    // Clear inline display + position so the `[hidden]` UA rule can hide the
    // popup cleanly. (Position was set in open() to keep the popup out of
    // flow before the positioner attached; positioner.detach() also clears
    // it, but be explicit and symmetric with what open() set.)
    this.popupEl.style.position = ''
    this.popupEl.style.display = ''
    this.popupEl.style.flexDirection = ''
    this.itemEls = []
    this.focusedEl = undefined
    this.focusedIndex = -1
    this.typeaheadBuffer = ''
    this.leadingRowEl = undefined
    this.leadingRowFocused = false
    this.comboboxEl.removeAttribute('aria-activedescendant')
    this.renderTriggerArrow()
    this.onClosed()
    this.settings.onClose?.()
    if (shouldReturnFocus) { this.triggerEl.focus({ preventScroll: true }) }
  }

  /**
   * Rebuild the trigger and (while open) the popup list from current state.
   * - Use it after mutating item OBJECTS in place (e.g.
   *   `users[0].name = 'X'`). The library cannot detect that on its own.
   * - It re-derives the display order (the `gatherGroups` gather).
   * - While the filter is active, it re-runs the filter against the current
   *   item text.
   * - The refresh is purely visual: it does NOT fire `onChange` and does NOT
   *   run `onItemsChanged`.
   * - Orchestrator: composes `renderTrigger` + `renderPopupList`; touches no
   *   DOM directly.
   * @group Lifecycle
   */
  public rerender(): void {
    this.gatheredItems = undefined
    if (this.filterActive) { this.recomputeFilteredItems() }
    this.renderTrigger()
    if (this.opened) { this.renderPopupList() }
  }

  /**
   * Tear down the instance: close the popup (which detaches every document /
   * window listener and the positioner), unwire `labelEl` (click listener
   * removed, a minted id removed), remove the library's class and
   * inline styles from the caller's mount element, and empty it. Idempotent.
   * The instance must not be used afterwards.
   * - REQUIRED before discarding an instance that might be OPEN (framework
   *   wrappers: call this on unmount) - skipping it there leaks the
   *   outside-click / focusout / scroll / resize listeners.
   * - Discarding a CLOSED instance without `destroy()` leaks nothing; it only
   *   leaves the root class and `overflow-anchor` style on the mount.
   * @group Lifecycle
   */
  public destroy(): void {
    this.close()
    if (this.settings.labelEl !== null) {
      this.settings.labelEl.removeEventListener('click', this.handleLabelElClick)
      if (this.labelElIdMinted) { this.settings.labelEl.removeAttribute('id') }
    }
    this.rootEl.classList.remove(this.classIdMap.rootClass, this.classIdMap.openClass)
    this.rootEl.style.overflowAnchor = ''
    this.rootEl.replaceChildren()
  }

  /**
   * Open if closed, close if open.
   * @group Open & close
   */
  public toggle(): void {
    if (this.opened) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Whether the popup is currently open.
   * - Pairs with `isDisabled()` (state read via method).
   * - The same state is mirrored on the DOM as CSS hooks:
   *   `data-state="open|closed"` on the trigger, `classIdMap.openClass` on
   *   the root.
   * @group Open & close
   */
  public isOpened(): boolean {
    return this.opened
  }

  /**
   * Return the current item list, in data order (as passed to `setItems`).
   * - The rendered list may differ in order and content: see `getVisibleItems`.
   * - Returns the LIVE internal array, typed read-only. Do not mutate it
   *   (TS blocks it; plain-JS callers must treat it as frozen).
   * - Structural mutation would silently bypass chosen-state reconciliation,
   *   re-filtering, and re-render. Replace the list via `setItems` instead.
   * - Mutating item OBJECTS + `rerender()` is the supported in-place path.
   * @group Items
   */
  public getItems(): readonly T[] {
    return this.items
  }

  /**
   * Return the resolved UI strings: the built-in English defaults merged
   * with the `uiTranslationPack` setting.
   * - Reuse these in your own UI instead of keeping a second translation
   *   source. For example, a tag remove button tooltip:
   *   `sel.getUiTranslationPack().tagRemoveButtonAriaLabel(label)`.
   * - Returns the LIVE object. Treat it as immutable, like `getItems`.
   * @group i18n
   */
  public getUiTranslationPack(): Readonly<LLSelectUiTranslationPack> {
    return this.settings.uiTranslationPack
  }

  /**
   * Replace the UI-translation pack at runtime, so switching language needs
   * no re-`new`.
   * - One of the two settings with a runtime setter (the other is
   *   `setPlaceholder`); both are copy. The rule: {@link LLSelectBaseSettings}.
   * - The pack is resolved exactly like the constructor's: merged over the
   *   built-in English pack, NOT over the previously set pack.
   * - An explicit constructor `placeholder` keeps winning over the new pack's
   *   `triggerPlaceholder`.
   * - Re-renders the trigger and the open popup.
   * - Also re-applies the pack-owned attributes `rerender()` cannot reach:
   *   the filter input placeholder and its fallback `aria-label`.
   * - The clear button needs no such step: `rerender()` rebuilds it, and the
   *   rebuild reads the new pack - unless a `createTriggerClearButtonEl`
   *   override returns the previous element, which then owns the label.
   * @group i18n
   */
  public setUiTranslationPack(uiTranslationPack: Partial<LLSelectUiTranslationPack>): void {
    const pack: LLSelectUiTranslationPack = { ...DEFAULT_UI_TRANSLATION_PACK, ...uiTranslationPack }
    this.settings.uiTranslationPack = pack
    this.settings.placeholder = this.explicitPlaceholder ?? pack.triggerPlaceholder
    // Pack-owned attributes rerender() cannot reach:
    this.syncFieldNameToDom()
    if (pack.filterInputPlaceholder !== null) {
      this.filterInputEl.placeholder = pack.filterInputPlaceholder
    } else {
      this.filterInputEl.removeAttribute('placeholder')
    }
    this.rerender()
  }

  /**
   * Replace the trigger placeholder text at runtime. It is one of the two
   * settings with a runtime setter (the other is `setUiTranslationPack`);
   * both are copy. The rule: {@link LLSelectBaseSettings}.
   * - `null` = fall back to the pack default (`uiTranslationPack.triggerPlaceholder`),
   *   mirroring an unset constructor `placeholder`. An explicit value keeps
   *   winning over later `setUiTranslationPack` calls, exactly like the
   *   constructor input.
   * - Takes effect immediately. Visible only while nothing is chosen - the
   *   placeholder never renders otherwise (the trigger is still re-rendered,
   *   which also refreshes the hidden accessible-value mirror).
   * @group Trigger
   */
  public setPlaceholder(placeholder: string | null): void {
    if (this.explicitPlaceholder === placeholder) { return }
    this.explicitPlaceholder = placeholder
    this.settings.placeholder = placeholder ?? this.settings.uiTranslationPack.triggerPlaceholder
    this.renderTrigger()
  }

  /**
   * Replace the item list.
   * - The input is shallow-copied; later external mutation does not affect
   *   the select.
   * - Items MUST be unique under `compareFn` (it defines item identity, and the
   *   selection is a set). Duplicates render stale selection DOM; the default
   *   compareFn warns once per page, a custom compareFn is the caller's
   *   responsibility (not scanned, to keep large lists cheap).
   * - If the popup is open, it re-renders now. While closed, the DOM is
   *   built lazily on the next `open()`.
   * - Both shipped variants re-render the trigger content from `onItemsChanged`
   *   (the multiple count total, custom content that reads `items`).
   * - `LLSelectMultiple`'s `triggerDisplay: 'tags'` mode is opt-in; `'count'` is
   *   the default.
   * - When `triggerDisplay` is `'tags'`, that content render is one chip per
   *   chosen item, unless `createTriggerContentElFn` replaces the content.
   * - Subclasses may reconcile chosen-state via {@link onItemsChanged}
   *   (e.g. single mode drops a chosen value that is no longer in the list).
   * @group Items
   */
  public setItems(items: readonly T[]): void {
    this.items = items.slice()
    this.warnOnDuplicateItems()
    this.gatheredItems = undefined
    if (this.filterActive) { this.recomputeFilteredItems() }
    if (this.opened) { this.renderPopupList() }
    this.onItemsChanged()
  }

  /**
   * Warn (once per page, never throw) when the item list has duplicates under
   * the DEFAULT compareFn - an O(n) Set check. A custom compareFn is documented
   * only: an O(n^2) scan would tax large lists (see PERFORMANCE-31), and keeping
   * its identity unique is the caller's responsibility.
   * - The Set is SameValueZero, and so is the default compareFn, so a repeated
   *   `NaN` item counts as a duplicate on both sides.
   */
  private warnOnDuplicateItems(): void {
    if (warnedDuplicateItems || this.settings.compareFn !== defaultCompareFn) { return }
    if (new Set(this.items).size === this.items.length) { return }
    warnedDuplicateItems = true
    console.warn('llselect: duplicate items passed to setItems - items must be unique under compareFn (it defines item identity, and the selection is a set). Duplicates render stale selection state. (warned once per page)')
  }

  /**
   * Enable or disable the whole control. Disabled: the trigger gets
   * `aria-disabled` + `data-disabled` (never the native `disabled` attribute,
   * which would suppress the hover / focus events a tooltip needs), opening is
   * blocked, an open popup closes, and the trigger leaves the tab order unless
   * `focusableWhenDisabled` is set. Stored as state, mirroring `setItems` /
   * `setChosenItems` (this design keeps mutable state out of settings).
   * @group Disabling
   */
  public setDisabled(value: boolean): void {
    if (this.disabled === value) { return }
    this.disabled = value
    if (value && this.opened) { this.close() }
    this.syncDisabledStateToDom()
  }

  /**
   * Whether the whole control is disabled.
   * @group Disabling
   */
  public isDisabled(): boolean {
    return this.disabled
  }

  /** Reflect `this.disabled` onto the trigger's ARIA / data / tabindex. */
  private syncDisabledStateToDom(): void {
    if (this.disabled) {
      this.triggerEl.setAttribute('aria-disabled', 'true')
      this.triggerEl.setAttribute('data-disabled', 'true')
    } else {
      this.triggerEl.removeAttribute('aria-disabled')
      this.triggerEl.setAttribute('data-disabled', 'false')
    }
    this.syncTriggerTabindex()
  }

  /**
   * Recompute the trigger's tabindex from every input that owns it: disabled
   * state (with `focusableWhenDisabled`), and the filterable open cycle -
   * while the filter input is the focus host the trigger leaves the tab
   * order, so the open widget stays a single tab stop and Shift+Tab exits
   * instead of landing on the trigger with the popup still open
   * (`docs/llm/A11Y.md` "Focus").
   */
  private syncTriggerTabindex(): void {
    const disabledAndUnfocusable = this.disabled && !this.settings.focusableWhenDisabled
    const filterOwnsFocus = this.opened && this.filterActive
    this.triggerEl.setAttribute('tabindex', disabledAndUnfocusable || filterOwnsFocus ? '-1' : '0')
  }

  /**
   * Subclass hook: called once after the popup finishes opening. Default no-op.
   * The `onOpen` setting fires alongside this (both run) - hook for subclass
   * logic, setting for consumer notification.
   * @group Subclassing: reactions
   */
  protected onOpened(): void {}
  /**
   * Subclass hook: called once after the popup finishes closing. Pairs with the `onClose` setting (both run).
   * @group Subclassing: reactions
   */
  protected onClosed(): void {}
  /**
   * Subclass hook: called after the chosen state actually changed, right
   * before the variant's `onChange` setting fires (hook first, both run -
   * same pairing as `onOpened` / `onClosed`). Default no-op.
   * @group Subclassing: reactions
   */
  protected onChosenChanged(): void {}
  /**
   * Called after `setItems` finishes. Override to reconcile state that
   * depends on the item list (e.g. clear a chosen value that disappeared).
   * Default no-op.
   * @group Subclassing: reactions
   */
  protected onItemsChanged(): void {}

  /**
   * Orchestrator: composes the clear-button rebuild + `renderTriggerContent` +
   * `renderTriggerArrow` to (re)build the whole trigger from state; touches no
   * DOM directly. Subclasses normally override {@link renderTriggerContent},
   * not this.
   * - Runs on every change of the chosen value, the placeholder or the pack.
   * - `rerender()` runs it too.
   * - While `clearable` is on, the first run builds the clear button and every
   *   later run swaps it for whatever `createTriggerClearButtonEl` returns: a
   *   fresh button from the base implementation, like the arrow. An override
   *   may return the previous element; it is then kept in place.
   * - If the button is rebuilt and the old one held focus - on it or inside
   *   its icon - the rebuilt BUTTON gets it.
   * - If the builder returned the same element, nothing was rebuilt, and focus
   *   goes back to the node that held it, if that node is still inside the
   *   button and can take focus; otherwise focus stays on the button.
   * - `setItems` runs `renderTriggerContent` alone, because only the content
   *   reads the list (the multiple count total, a custom
   *   `createTriggerContentElFn`'s `items`).
   * - A `setItems` that drops the chosen entry runs the whole trigger.
   * - Runs once from the `LLSelectSingle` / `LLSelectMultiple` constructor, right
   *   after `super()`.
   * - On that first run a FURTHER subclass's own fields are still `undefined`:
   *   JS runs a subclass's field initializers only after its super constructor
   *   returns (virtual-call-in-constructor). An override of a trigger method
   *   (`renderTriggerContent`, or a `create*El` it calls) that reads such a
   *   field sees `undefined` there.
   * - The recipe: put construction-time configuration in the typed
   *   `subclassSettings` constructor param. `this.settings` is complete before
   *   any construction code runs.
   * - For genuine instance state, tolerate defaults during construction, or call
   *   `rerender()` at the end of your own constructor.
   * - The popup-list methods do NOT run here; they wait for `open()`. See
   *   DESIGN.md "Customization model".
   * @group Subclassing: rendering
   */
  protected renderTrigger(): void {
    this.replaceTriggerClearButtonElInDom()
    this.renderTriggerContent()
    this.renderTriggerArrow()
  }

  /**
   * Write the trigger's content slot (`triggerContentEl`), replacing whatever
   * was there; the sibling arrow slot is untouched. The single DOM-writing
   * primitive behind every `renderTriggerContent` path.
   * - `string` -> set as `textContent` (plain text, NOT parsed as HTML). Used
   *   for the default placeholder / `itemToString` text / count summary.
   * - `HTMLElement` -> inserted as-is via `replaceChildren`; caller owns the
   *   node. Used for whatever the `createTriggerContentElFn` setting returned.
   * - Also mirrors the value into the hidden `triggerValueEl` (the accessible
   *   name source): the string itself, else `plainTextValue`, else the
   *   element's `textContent`. Pass `plainTextValue` whenever the element
   *   contains labelled controls (tag remove buttons) or icon-only content -
   *   the mirror is what AT announces as the field's value.
   * Called by `renderTriggerContent` - the base default and the `LLSelectSingle`
   * / `LLSelectMultiple` overrides.
   * @group Subclassing: rendering
   */
  protected commitTriggerContentToDom(content: HTMLElement | string, plainTextValue?: string): void {
    if (typeof content === 'string') {
      this.triggerContentEl.textContent = content
      this.triggerValueEl.textContent = content
    } else {
      this.triggerContentEl.replaceChildren(content)
      this.triggerValueEl.textContent = plainTextValue ?? content.textContent
    }
  }

  /**
   * Mirror the empty/filled state onto the trigger's `data-empty` attribute
   * (`"true"` when `isEmpty()`, else `"false"`). A CSS / AT styling hook,
   * independent of the rendered content. Called by the subclass
   * `renderTriggerContent` overrides.
   * @group Subclassing: rendering
   */
  protected syncEmptyStateToDom(): void {
    this.triggerEl.setAttribute('data-empty', this.isEmpty() ? 'true' : 'false')
  }

  /**
   * Whether the control currently has no selection (drives `data-empty`).
   * Base default is always `true` (the base trigger only shows the
   * placeholder); `LLSelectSingle` / `LLSelectMultiple` override it.
   * @group Subclassing: semantics
   */
  protected isEmpty(): boolean {
    return true
  }

  /**
   * Orchestrator: composes the `*ToDom` primitives to (re)build the trigger's
   * content slot from state; touches no DOM directly. Override in subclasses to
   * display the chosen value(s); this base default commits the placeholder and
   * the empty flag. Always write via `commitTriggerContentToDom` (content) and
   * `syncEmptyStateToDom` (the `data-empty` flag), never `triggerContentEl`
   * directly, so the sibling arrow slot is always preserved.
   * @group Subclassing: rendering
   */
  protected renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    this.commitTriggerContentToDom(this.settings.placeholder)
  }

  /**
   * Orchestrator: composes the `*ToDom` / `*El` primitives to (re)build the
   * trigger's arrow slot from state; touches no DOM directly. Calls
   * `createTriggerArrowContentEl` with the current `isOpened` and commits whatever it returns
   * (including `null` -> no arrow for this state).
   */
  private renderTriggerArrow(): void {
    this.commitTriggerArrowContentElToDom(this.createTriggerArrowContentEl({ isOpened: this.opened }))
  }

  /**
   * Trigger arrow element for the given open state.
   * - Default reads `createTriggerArrowContentElFn`; `null` (setting unset, or returned for
   *   a state) = no arrow for that state.
   * - Override only when extending; for one-off arrows pass the setting.
   *   Mirrors `createTriggerClearButtonEl` / `createItemContentEl`.
   * @group Subclassing: rendering
   */
  protected createTriggerArrowContentEl(state: { isOpened: boolean }): HTMLElement | SVGElement | null {
    return this.settings.createTriggerArrowContentElFn ? this.settings.createTriggerArrowContentElFn(state) : null
  }

  /**
   * Write the trigger's arrow slot: clear it, then append `el` if non-null.
   * - `el = null`: clear only, leaving the slot empty (no arrow this state).
   * The sole mutator of the arrow slot; called by `renderTriggerArrow`.
   */
  private commitTriggerArrowContentElToDom(el: HTMLElement | SVGElement | null): void {
    this.triggerArrowEl.replaceChildren()
    if (el) { this.triggerArrowEl.appendChild(el) }
  }

  /**
   * Orchestrator: composes `createItemEl` (build) + `computePopupSegments` +
   * `commitPopupSegmentsToDom` (write) to rebuild the popup list from
   * `getVisibleItems()`; touches no DOM directly. Called by `open()` and by
   * `setItems()` while open. Also clamps `focusedIndex` if the list shrank and
   * re-applies focus visuals.
   * - Extend it by wrapping: override, do your work before or after, then
   *   call `super.renderPopupList()`. The ui-select bridge frees its row
   *   scopes this way. Or override one of the methods it calls through `this`:
   *   `createItemEl`, `createPopupListLeadingRowEl`, `itemToGroupKey`,
   *   `getVisibleItems`.
   * - Its other internals stay private on purpose. They re-establish the
   *   `itemEls[i] <-> getVisibleItems()[i]` alignment as one unit, so no
   *   subclass can leave keyboard nav or `aria-activedescendant` half-synced.
   * @group Subclassing: rendering
   */
  protected renderPopupList(): void {
    const list = this.getVisibleItems()
    const els = list.map((item, i) => this.createItemEl(item, i))
    this.itemEls = els
    this.focusedEl = undefined
    this.leadingRowEl = this.createPopupListLeadingRowEl() ?? undefined
    if (!this.leadingRowEl) { this.leadingRowFocused = false }
    this.commitPopupSegmentsToDom(this.computePopupSegments(list, els))
    this.syncPopupListNoResultsToDom()
    this.positioner?.reposition()
    // Clamp focused index if the visible list shrank, then re-apply visuals.
    // The clamp seeks BACKWARD to an enabled row: landing focus on a
    // disabled one would break the disabled-skip contract (A11Y.md).
    if (this.focusedIndex >= list.length) {
      this.focusedIndex = list.length === 0 ? -1 : this.findNextEnabledIndex(list.length - 1, -1, list)
    } else if (this.focusedIndex >= 0 && this.isItemEffectivelyDisabled(list[this.focusedIndex]!)) {
      // Same contract when the row at the focused index BECAME disabled
      // (setItems swapped the item in place): seek backward - the option
      // above the first item is the choose-all leading row when present
      // (A11Y.md ring order) - else forward.
      const back = this.findNextEnabledIndex(this.focusedIndex, -1, list)
      if (back >= 0) {
        this.focusedIndex = back
      } else if (!this.focusLeadingRow()) {
        this.focusedIndex = this.findNextEnabledIndex(this.focusedIndex, 1, list)
      }
    }
    this.syncFocusedIndexToDom()
  }

  /**
   * Split the flat visible list into render segments: ungrouped item elements
   * and contiguous same-key groups. Pure computation - resolves keys via
   * `itemToGroupKey` (the overridable method; all-`null` keys = flat list) and key
   * equality via `groupKeyCompareFn`, touches no DOM. Group headers are NOT
   * added to `itemEls`, so `itemEls[i]`
   * stays aligned with `getVisibleItems()[i]` and keyboard nav skips headers for
   * free. `console.warn`s once per non-contiguous key reappearance (unsorted
   * data would otherwise emit a duplicate header for the same group) -
   * reachable with `gatherGroups: false`; the default gather feeds this an
   * already-contiguous list.
   */
  private computePopupSegments(list: readonly T[], els: HTMLElement[]): PopupListSegment<T, GroupKey>[] {
    const keyEq = this.settings.groupKeyCompareFn ?? defaultCompareFn
    const segments: PopupListSegment<T, GroupKey>[] = []
    const closedKeys: GroupKey[] = []
    let groupIndex = 0
    let i = 0
    while (i < list.length) {
      const key = this.itemToGroupKey(list[i]!)
      if (key === null) {
        segments.push({ group: false, el: els[i]! })
        i += 1
        continue
      }
      const groupItems: T[] = [list[i]!]
      const groupEls: HTMLElement[] = [els[i]!]
      let j = i + 1
      while (j < list.length) {
        const next = this.itemToGroupKey(list[j]!)
        if (next === null || !keyEq(key, next)) { break }
        groupItems.push(list[j]!)
        groupEls.push(els[j]!)
        j += 1
      }
      if (closedKeys.some(k => keyEq(k, key))) {
        console.warn('llselect: group key reappears non-contiguously; sort items by group to avoid a duplicate header.', key)
      }
      closedKeys.push(key)
      segments.push({ group: true, key, index: groupIndex, items: groupItems, els: groupEls })
      groupIndex += 1
      i = j
    }
    return segments
  }

  /** Replace every popup-list child with the leading row (when present) + the rendered segments. */
  private commitPopupSegmentsToDom(segments: PopupListSegment<T, GroupKey>[]): void {
    const children = segments.map(seg =>
      seg.group ? this.createGroupEl(seg.key, seg.index, seg.items, seg.els) : seg.el,
    )
    if (this.leadingRowEl) { children.unshift(this.leadingRowEl) }
    this.popupListEl.replaceChildren(...children)
  }

  /**
   * Build a detached group container: `role="group"` named by `groupKeyToString`,
   * an `aria-hidden` visible label element, then the group's item elements. The
   * label content comes from `createGroupLabelContentEl` (rich header) when
   * non-null, else the plain label text. `aria-disabled` + `data-disabled` when
   * the group is disabled. Override for full control of the group element
   * (mirrors `createItemEl`).
   *
   * @param key - the group's key
   * @param index - group index in the current render; builds a stable id
   * @param items - the group's items (for rich content / counts)
   * @param itemEls - the group's already-built option elements
   * @group Subclassing: rendering
   */
  protected createGroupEl(key: GroupKey, index: number, items: readonly T[], itemEls: HTMLElement[]): HTMLElement {
    const text = this.groupKeyToString(key)
    const group = document.createElement('div')
    group.id = `${this.classIdMap.popupListId}-group${index}`
    group.className = this.classIdMap.groupClass
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', text)
    if (this.isGroupDisabled(key)) {
      group.setAttribute('aria-disabled', 'true')
      group.setAttribute('data-disabled', 'true')
    }
    const labelEl = document.createElement('div')
    labelEl.className = this.classIdMap.groupLabelClass
    labelEl.setAttribute('aria-hidden', 'true')
    const content = this.createGroupLabelContentEl(key, items)
    if (content === null) {
      labelEl.textContent = text
    } else {
      labelEl.appendChild(content)
    }
    group.append(labelEl, ...itemEls)
    return group
  }

  /**
   * Group header -> its visible content element (icon / count badge / rich
   * markup). Mirrors `createItemContentEl`.
   * - Default reads `createGroupLabelContentElFn`, else `null` so `createGroupEl`
   *   uses plain text from `groupKeyToString`.
   * - The group's accessible name stays `groupKeyToString` (container `aria-label`);
   *   this fills only the visible, `aria-hidden` label content.
   * - Override only when extending; for one-off rich headers pass the setting.
   * @group Subclassing: rendering
   */
  protected createGroupLabelContentEl(key: GroupKey, itemsInGroup: readonly T[]): HTMLElement | null {
    return this.settings.createGroupLabelContentElFn
      ? this.settings.createGroupLabelContentElFn(key, itemsInGroup)
      : null
  }

  /**
   * Re-render a single item's element in place instead of rebuilding the
   * whole popup list. The DOM work is O(1) regardless of list size, so
   * flipping one selection in a 10k-item list does not recreate 10k nodes
   * (the lookup to find the item is O(n), but that is a cheap comparison
   * loop next to DOM mutation). No-op if the popup is closed or the item is
   * not in the current list. Used by multi-select toggle.
   * @group Subclassing: rendering
   */
  protected replacePopupListItemElInDom(item: T): void {
    if (!this.opened) { return }
    const list = this.getVisibleItems()
    const index = list.findIndex(i => this.settings.compareFn(i, item))
    if (index < 0) { return }
    const oldEl = this.itemEls[index]
    if (oldEl === undefined) { return }
    const newEl = this.createItemEl(list[index]!, index)
    oldEl.replaceWith(newEl)
    this.itemEls[index] = newEl
    // Preserve focus visuals if the replaced element was the focused one.
    if (this.focusedEl === oldEl) {
      newEl.classList.add(this.classIdMap.itemFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', newEl.id)
      this.focusedEl = newEl
    }
  }

  /**
   * Build the DOM element for one item. The base implementation sets `id`,
   * `role="option"`, a click handler, and fills the visible content via
   * {@link createItemContentEl} (which reads `createItemContentElFn`), falling
   * back to `textContent` from {@link itemToString}. When the content is
   * custom (non-null), the option's `aria-label` is set from `itemToString`
   * so the accessible name stays the plain `itemToString` text. For one-off rich content
   * (icons etc.) prefer the `createItemContentElFn` setting; override this only
   * to control the whole element (tag, extra wiring).
   *
   * @param item - the item value
   * @param index - index in `this.items`; used to build a stable id so
   *   `aria-activedescendant` can point to this element across re-renders.
   * @group Subclassing: rendering
   */
  protected createItemEl(item: T, index: number): HTMLElement {
    const el = document.createElement('div')
    // Ids hang off the listbox id: options belong to the listbox, not the trigger.
    el.id = `${this.classIdMap.popupListId}-item${index}`
    el.className = this.classIdMap.itemClass
    el.setAttribute('role', 'option')
    const content = this.createItemContentEl(item)
    if (content === null) {
      el.textContent = this.itemToString(item)
    } else {
      // Custom content fills the visuals only. The accessible name + match
      // text always come from itemToString, so pin aria-label to it: stays
      // consistent with the plain-text branch (textContent === itemToString)
      // and the caller never touches aria-* themselves.
      el.setAttribute('aria-label', this.itemToString(item))
      el.appendChild(content)
    }
    // No `title` attribute by default: items wrap (themes default), so the
    // full text is already visible and a tooltip is redundant. Adding
    // `title` would also fight third-party tooltip libraries (Tippy etc.).
    // Users who opt into ellipsis-on-items pick their own tooltip mechanism.
    if (this.isItemEffectivelyDisabled(item)) {
      // `aria-disabled` (never native `disabled`) keeps the item perceivable and
      // hoverable for a "why disabled" tooltip. No click handler -> not
      // selectable; keyboard nav skips it too.
      el.setAttribute('aria-disabled', 'true')
      el.classList.add(this.classIdMap.itemDisabledClass)
    } else {
      el.addEventListener('click', () => {
        // Move focus to the clicked item before activating it. Without this,
        // multi mode (which keeps the popup open) leaves the focused styling
        // on the previous keyboard-focused item while a different one was
        // just clicked.
        this.setFocusedIndex(index)
        this.withUserChangeSource(() => this.onItemActivated(item))
      })
    }
    return el
  }

  /**
   * Map an item to its display string. The library calls this everywhere it
   * needs an item's text: list rows, the single trigger text, default filter.
   * - Default reads the `itemToStringFn` setting, else `String(item)`.
   * - Configure via `itemToStringFn` (no subclass needed).
   * - Override only when extending (a new select type); your override replaces
   *   the default. For HTML content, subclass `createItemEl`.
   * @group Subclassing: semantics
   */
  protected itemToString(item: T): string {
    return this.settings.itemToStringFn ? this.settings.itemToStringFn(item) : String(item)
  }

  /**
   * Item -> the visible content of its list row (icon + text etc.).
   * - Default reads `createItemContentElFn`, else `null` so `createItemEl` uses
   *   the plain-text default from `itemToString`.
   * - Override only when extending; for one-off rich content pass the setting.
   * @group Subclassing: rendering
   */
  protected createItemContentEl(item: T): HTMLElement | null {
    return this.settings.createItemContentElFn ? this.settings.createItemContentElFn(item) : null
  }

  /**
   * Whether `item` is effectively disabled - by `itemDisabledFn`, or because
   * its group is disabled (`groupDisabledFn`). Group-disabled layers on top,
   * so every item-disabled behavior (no selection, keyboard skip, aria)
   * covers grouped items with no extra code. False when neither applies.
   * The whole-control disabled state (`isDisabled()`) is a separate layer,
   * not part of this answer.
   * @group Subclassing: semantics
   */
  protected isItemEffectivelyDisabled(item: T): boolean {
    if (this.settings.itemDisabledFn && this.settings.itemDisabledFn(item)) { return true }
    const key = this.itemToGroupKey(item)
    return key !== null && this.isGroupDisabled(key)
  }

  /**
   * Map an item to its group key, or `null` when it belongs to no group.
   * The authoritative method: rendering, the `gatherGroups` gather, and the
   * disabled layer all resolve keys through this method, so an override
   * drives them all - returning keys turns grouping on even with the setting
   * unset (all-`null` keys = flat list). An override reading external state
   * must call `rerender()` after that state changes (same contract as
   * mutating item objects).
   * - Default reads `itemToGroupKeyFn`, else `null` (grouping off).
   * - Override only when extending; configure via the setting.
   * @group Subclassing: semantics
   */
  protected itemToGroupKey(item: T): GroupKey | null {
    return this.settings.itemToGroupKeyFn ? this.settings.itemToGroupKeyFn(item) : null
  }

  /**
   * Map a group key to its header display text.
   * - Default reads `groupKeyToStringFn`, else `String(key)`.
   * @group Subclassing: semantics
   */
  protected groupKeyToString(key: GroupKey): string {
    return this.settings.groupKeyToStringFn ? this.settings.groupKeyToStringFn(key) : String(key)
  }

  /**
   * Whether the whole group `key` is disabled per `groupDisabledFn` (false when unset).
   * @group Subclassing: semantics
   */
  protected isGroupDisabled(key: GroupKey): boolean {
    return this.settings.groupDisabledFn ? this.settings.groupDisabledFn(key) : false
  }

  /**
   * First enabled index scanning from `start` (inclusive) by `step` (+1 / -1).
   * Returns -1 if no enabled item lies in that direction. Used to skip disabled
   * items during keyboard nav and initial focus.
   * @group Subclassing: focus
   */
  protected findNextEnabledIndex(start: number, step: number, list: readonly T[]): number {
    for (let i = start; i >= 0 && i < list.length; i += step) {
      if (!this.isItemEffectivelyDisabled(list[i]!)) { return i }
    }
    return -1
  }

  /**
   * Resolve a nav target index to the nearest enabled item. Arrows / Home / End
   * stay put when no enabled item lies in the travel direction; Page falls back
   * to the opposite direction so it lands as far as it can.
   */
  private findEnabledIndexForAction(target: number, action: LLSelectAction, list: readonly T[]): number {
    const forward = action === LLSelectAction.Next
      || action === LLSelectAction.GotoFirst
      || action === LLSelectAction.PageDown
    const primary = this.findNextEnabledIndex(target, forward ? 1 : -1, list)
    if (primary >= 0) { return primary }
    if (action === LLSelectAction.PageDown) { return this.findNextEnabledIndex(target, -1, list) }
    if (action === LLSelectAction.PageUp) { return this.findNextEnabledIndex(target, 1, list) }
    return -1
  }

  /**
   * Called when an item is activated (click or keyboard select). Default
   * no-op; subclasses implement their selection behaviour (single mode picks
   * and closes, multiple mode toggles and keeps the popup open).
   * @group Subclassing: reactions
   */
  protected onItemActivated(_item: T): void {}

  /**
   * Optional non-item `role="option"` row pinned at the TOP of the listbox:
   * inside the arrow-key ring (ArrowUp from the first item reaches it, Home
   * lands on it, up-actions clamp there) but never inside `itemEls`, so the
   * `itemEls[i] <-> getVisibleItems()[i]` alignment is untouched. Rebuilt on
   * every `renderPopupList`. Base default: `null` = no leading row.
   * `LLSelectMultiple` builds its choose-all row here (`chooseAllRow` setting).
   * @group Subclassing: rendering
   */
  protected createPopupListLeadingRowEl(): HTMLElement | null { return null }

  /**
   * Run `fn` with chosen-state changes attributed to the user. The library
   * wraps exactly its pointer / keyboard entry points with it - option
   * activation, the tag remove button, the clear button, the choose-all row;
   * everything else reports `'api'`.
   * @group Subclassing: reactions
   */
  protected withUserChangeSource<R>(fn: () => R): R {
    const previous = this.changeSource
    this.changeSource = 'user'
    try {
      return fn()
    } finally {
      this.changeSource = previous
    }
  }

  /**
   * Subclass hook: the leading row was activated - Enter while it is focused
   * (subclasses also wire their row's click handler to this). Default no-op.
   * @group Subclassing: reactions
   */
  protected onLeadingRowActivated(): void {}

  /**
   * Decide which item to focus when the popup opens. Default focuses the
   * first item (or no-op if the list is empty). Override to focus the
   * currently chosen item, last-used item, etc.
   * @group Subclassing: focus
   */
  protected focusInitial(): void {
    const first = this.findNextEnabledIndex(0, 1, this.getVisibleItems())
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /**
   * Move keyboard focus to the item at `index`. The value is clamped to
   * `[-1, items.length-1]`; pass `-1` to clear focus. Updates the focused
   * class, `aria-activedescendant`, and scrolls the item into view. No-op
   * if the clamped value equals the current focused index.
   * @group Subclassing: focus
   */
  protected setFocusedIndex(index: number): void {
    const max = this.getVisibleItems().length - 1
    const clamped = Math.max(-1, Math.min(max, index))
    if (clamped === this.focusedIndex && !this.leadingRowFocused) { return }
    this.leadingRowFocused = false
    this.focusedIndex = clamped
    this.syncFocusedIndexToDom()
  }

  /**
   * Move keyboard focus onto the leading row. Returns whether the row is now
   * focused (`false` = none is rendered, nothing changed). The item focus is
   * cleared (`focusedIndex` becomes -1). Protected so a subclass can wire its
   * leading row's click to focus-then-activate (mirroring how item clicks
   * call `setFocusedIndex` before `onItemActivated`) and use it in
   * `focusInitial` (the leading row is the listbox's FIRST option).
   * @group Subclassing: focus
   */
  protected focusLeadingRow(): boolean {
    if (!this.leadingRowEl) { return false }
    if (this.leadingRowFocused) { return true }
    this.leadingRowFocused = true
    this.focusedIndex = -1
    this.syncFocusedIndexToDom()
    return true
  }

  /**
   * Rebuild the leading row in place (tri-state / text refresh) without
   * touching the item elements - O(1) DOM work, mirroring
   * `replacePopupListItemElInDom`. Falls back to a full `renderPopupList`
   * when the row becomes inapplicable (builder returns `null`). No-op while
   * closed or when no leading row is rendered.
   * @group Subclassing: rendering
   */
  protected replaceLeadingRowElInDom(): void {
    if (!this.opened || !this.leadingRowEl) { return }
    const next = this.createPopupListLeadingRowEl()
    if (next === null) {
      this.renderPopupList()
      return
    }
    const old = this.leadingRowEl
    old.replaceWith(next)
    this.leadingRowEl = next
    if (this.focusedEl === old) {
      next.classList.add(this.classIdMap.itemFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', next.id)
      this.focusedEl = next
    }
  }

  /**
   * Make the DOM reflect `focusedIndex`: move the focused class onto the focused
   * item element, point `aria-activedescendant` at it, and scroll it into view;
   * when `focusedIndex` is -1 or out of range, clear the class and the attribute.
   * Reads `itemEls`, so it only has an effect while the popup is open (the list
   * exists). Called after `focusedIndex` changes (`setFocusedIndex`) and after
   * the list is rebuilt (`renderPopupList`).
   */
  private syncFocusedIndexToDom(): void {
    if (this.focusedEl) {
      this.focusedEl.classList.remove(this.classIdMap.itemFocusedClass)
      this.focusedEl = undefined
    }
    if (this.leadingRowFocused && this.leadingRowEl) {
      this.leadingRowEl.classList.add(this.classIdMap.itemFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', this.leadingRowEl.id)
      this.focusedEl = this.leadingRowEl
      ensureVisibleInScroll(this.leadingRowEl, this.popupListEl)
      return
    }
    const i = this.focusedIndex
    if (i >= 0 && i < this.itemEls.length) {
      const el = this.itemEls[i]!
      el.classList.add(this.classIdMap.itemFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', el.id)
      this.focusedEl = el
      ensureVisibleInScroll(el, this.popupListEl)
    } else {
      this.comboboxEl.removeAttribute('aria-activedescendant')
    }
  }

  /**
   * Snapshot the window scroll position and return a function that restores
   * it. Opening the popup must never move the page, but Firefox auto-scrolls
   * the active option of a multiselectable listbox into view at the document
   * level when the popup is shown - even though the popup is `position: fixed`.
   * The returned restore runs synchronously and once more on the next frame,
   * since that accessibility scroll can land after the current layout flush.
   * No-op when nothing actually scrolled, so it never fights real user
   * scrolling (and stays silent under jsdom, which has no `window.scrollTo`).
   * Restores with `behavior: 'instant'`: the two-arg `scrollTo` obeys the
   * page's CSS `scroll-behavior`, so under `scroll-behavior: smooth` the
   * correction would render as a visible glide instead of a revert.
   */
  private captureWindowScroll(): () => void {
    const { scrollX, scrollY } = window
    const restore = (): void => {
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      }
    }
    return (): void => {
      restore()
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(restore)
      }
    }
  }

  /**
   * The element a pointer event actually hit. `ev.target` retargets to the shadow
   * host when llselect is hosted inside an app's shadow root, so an inside click
   * would read as outside and close the popup; `composedPath()[0]` pierces the
   * boundary. With no shadow tree (llselect uses none itself) this equals `ev.target`.
   * - Limitation: a CLOSED host shadow root truncates `composedPath()` at the root,
   *   so `[0]` is only the host and an inside click still reads as outside. A
   *   document-level listener cannot see into a closed root; hosting in an OPEN
   *   shadow root avoids it.
   */
  private eventTargetNode(ev: Event): EventTarget | null {
    return ev.composedPath?.()?.[0] ?? ev.target
  }

  private attachOutsideClick(): void {
    const mode = this.settings.outsideClickBehavior
    if (mode === 'pass-through') {
      // mousedown fires before mouseup/click - feels snappier; we do not
      // preventDefault, so the outside click still triggers its own action.
      this.outsideHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          this.close()
        }
      }
      document.addEventListener('mousedown', this.outsideHandler)
    } else {
      // 'block' needs TWO listeners because of an event-ordering race with
      // the focusout-close path:
      //   mousedown outside -> browser shifts focus to the clicked target ->
      //   focusout fires on trigger -> focusOutHandler closes the popup ->
      //   detachOutsideClick removes the click capture below -> click then
      //   reaches the target and fires its own handler (regression).
      // The mousedown capture below preventDefaults the focus shift on
      // outside mousedowns, so no focusout fires and the click capture stays
      // attached long enough to swallow the click.
      this.blockMouseDownHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          ev.preventDefault()
        }
      }
      document.addEventListener('mousedown', this.blockMouseDownHandler, true)
      // capture phase so we run before the target's own listeners; swallow
      // the click so the underlying button/link/etc. does not fire.
      this.outsideHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          ev.stopPropagation()
          ev.preventDefault()
          this.close()
        }
      }
      document.addEventListener('click', this.outsideHandler, true)
    }
  }

  private detachOutsideClick(): void {
    if (this.outsideHandler) {
      if (this.settings.outsideClickBehavior === 'pass-through') {
        document.removeEventListener('mousedown', this.outsideHandler)
      } else {
        document.removeEventListener('click', this.outsideHandler, true)
      }
      this.outsideHandler = undefined
    }
    if (this.blockMouseDownHandler) {
      document.removeEventListener('mousedown', this.blockMouseDownHandler, true)
      this.blockMouseDownHandler = undefined
    }
  }

  /**
   * Close the popup when keyboard focus leaves the widget entirely (e.g. Tab
   * away). `focusout` bubbles, so listening on `rootEl` catches focus leaving
   * any descendant; `relatedTarget` is the element gaining focus (or `null`).
   * The check is written against `rootEl.contains` rather than "the trigger
   * lost focus" so a future in-popup control - filter input, checkbox - keeps
   * the popup open while it holds focus.
   */
  private attachFocusOut(): void {
    this.focusOutHandler = (ev: FocusEvent): void => {
      const next = ev.relatedTarget
      if (next instanceof Node && this.rootEl.contains(next)) { return }
      this.close()
    }
    this.rootEl.addEventListener('focusout', this.focusOutHandler)
  }

  private detachFocusOut(): void {
    if (!this.focusOutHandler) { return }
    this.rootEl.removeEventListener('focusout', this.focusOutHandler)
    this.focusOutHandler = undefined
  }

  private handleKeydown(ev: KeyboardEvent): void {
    // Leave the keys to the IME while composing.
    if (ev.isComposing || this.composing) { return }
    if (this.disabled) { return }
    const inText = ev.currentTarget === this.filterInputEl
    if (!inText && this.handleTypeaheadKeydown(ev)) { return }
    const action = getActionFromKey(ev, this.opened, inText)
    if (action === undefined) { return }
    ev.preventDefault()
    // Any action key ends the typed prefix (Enter/Space activate, Escape
    // closes, arrows move on).
    this.typeaheadBuffer = ''

    switch (action) {
      case LLSelectAction.Open:
        this.open()
        return
      case LLSelectAction.Close:
        // Esc two-stage while the filter is active: clear the filter first; only
        // close when the filter is already empty. Closing returns focus to
        // the trigger.
        if (this.filterActive && this.query !== '') {
          this.filterInputEl.value = ''
          this.handleSearchInputEvent()
          return
        }
        this.close()
        return
      case LLSelectAction.Select: {
        if (this.leadingRowFocused) {
          this.withUserChangeSource(() => this.onLeadingRowActivated())
          return
        }
        const list = this.getVisibleItems()
        if (this.focusedIndex >= 0 && this.focusedIndex < list.length) {
          const item = list[this.focusedIndex]!
          // Defensive: nav never lands on a disabled item, but guard anyway.
          if (!this.isItemEffectivelyDisabled(item)) { this.withUserChangeSource(() => this.onItemActivated(item)) }
        }
        return
      }
      case LLSelectAction.Next:
      case LLSelectAction.Previous:
      case LLSelectAction.GotoFirst:
      case LLSelectAction.GotoLast:
      case LLSelectAction.PageDown:
      case LLSelectAction.PageUp: {
        const list = this.getVisibleItems()
        if (list.length === 0) { return }
        if (this.leadingRowFocused) {
          // On the leading row (ring top): only downward actions move; treat
          // the row as position -1 so Next lands on the first enabled item.
          if (action === LLSelectAction.Next || action === LLSelectAction.PageDown || action === LLSelectAction.GotoLast) {
            const target = getUpdatedIndex(-1, list.length - 1, action)
            const found = this.findEnabledIndexForAction(target, action, list)
            if (found >= 0) { this.setFocusedIndex(found) }
          }
          return
        }
        // Home lands on the leading row when present (topmost of the ring).
        if (action === LLSelectAction.GotoFirst && this.leadingRowEl) {
          this.focusLeadingRow()
          return
        }
        const target = getUpdatedIndex(this.focusedIndex, list.length - 1, action)
        const found = this.findEnabledIndexForAction(target, action, list)
        // An up-action that cannot move (already at the topmost enabled item)
        // continues onto the leading row.
        const upAction = action === LLSelectAction.Previous || action === LLSelectAction.PageUp
        if (this.leadingRowEl && upAction && (found < 0 || found === this.focusedIndex)) {
          this.focusLeadingRow()
          return
        }
        if (found >= 0) { this.setFocusedIndex(found) }
        return
      }
    }
  }

  /**
   * Native-`<select>`-style prefix typeahead for a printable-character
   * keydown on the trigger.
   * - Returns `true` when the event was consumed.
   * - Runs only while the filter is inactive. With the popup open the filter
   *   input owns typing; while closed, a would-be-filterable open cycle
   *   leaves the keys alone (the `filterable` predicate is evaluated fresh -
   *   the cached `filterActive` can be stale between opens).
   * - Space never joins the buffer; it stays the activate/open key (A11Y.md).
   * - While closed: opens the popup first, then searches relative to
   *   {@link computeTypeaheadClosedStartIndex} - NOT to the convenience focus
   *   `focusInitial` parked, which would skip the first match.
   * - Typing itself never changes the value and never fires `onChange`;
   *   activation stays Enter / Space / click.
   * - Match rule, cycling, and wrap: {@link findTypeaheadIndex}. No match
   *   leaves the active option and the buffer as they are.
   */
  private handleTypeaheadKeydown(ev: KeyboardEvent): boolean {
    // Printable = exactly one code point ('Dead' / 'Process' fail, astral
    // pairs pass). Meta and Ctrl-only chords are commands.
    if (ev.key === ' ' || [...ev.key].length !== 1 || ev.metaKey || (ev.ctrlKey && !ev.altKey)) { return false }
    // Alt-carrying chords (AltGraph, macOS Option) PRODUCE characters and the
    // produced character arrives as ev.key ("@", "a-ring", ...). A chord
    // still delivering a bare ASCII letter / digit produced nothing - that is
    // a shortcut (Windows Alt menus, accesskey, VoiceOver's Ctrl+Option), so
    // it passes through.
    if (ev.altKey && /^[a-zA-Z0-9]$/.test(ev.key)) { return false }
    if (this.opened ? this.filterActive : this.computeFilterActive()) { return false }
    ev.preventDefault()
    const now = Date.now()
    this.typeaheadBuffer = getUpdatedTypeaheadBuffer(this.typeaheadBuffer, ev.key, now - this.typeaheadLastTime)
    this.typeaheadLastTime = now
    const openedByThisKey = !this.opened
    if (openedByThisKey) {
      this.open()
      // open() can refuse (hidden anchor); nothing to move focus in then.
      if (!this.opened) { return true }
    }
    const list = this.getVisibleItems()
    const current = openedByThisKey
      ? this.computeTypeaheadClosedStartIndex(list)
      : (this.leadingRowFocused ? -1 : this.focusedIndex)
    const found = findTypeaheadIndex(
      this.typeaheadBuffer,
      list.length,
      current,
      (i) => this.isItemEffectivelyDisabled(list[i]!) ? undefined : this.itemToString(list[i]!),
    )
    if (found >= 0) { this.setFocusedIndex(found) }
    return true
  }

  /**
   * The option the closed-state typeahead treats as current, as an index into
   * `list`, when the typed character is the keystroke that opens the popup.
   * - The search starts AFTER this option: the opening keystroke is always a
   *   one-character buffer, because `close()` empties the buffer.
   * - Default `-1`: no current option, so the first match from the top wins.
   * - The focus `focusInitial` parks on open is a convenience, not a
   *   selection - it must not shift this search.
   * - Single mode overrides this with the chosen item's index, so a typed
   *   initial cycles past the current selection like a native `<select>`.
   * - Search internals: `findTypeaheadIndex` in `keyboard.ts`.
   * @group Subclassing: focus
   */
  protected computeTypeaheadClosedStartIndex(_list: readonly T[]): number {
    return -1
  }

  private createTriggerEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.triggerId
    el.className = this.classIdMap.triggerClass
    // Filter active: trigger is a button that opens a popup containing a
    // combobox+listbox. Inactive: trigger is itself the combobox.
    el.setAttribute('role', this.filterActive ? 'button' : 'combobox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-haspopup', 'listbox')
    el.setAttribute('data-state', 'closed')
    el.setAttribute('data-disabled', 'false')
    // Child slots: content (text/tags), optional clear button, arrow. Clear and
    // arrow are own slots so they never collide with createTriggerContentElFn.
    const content = document.createElement('span')
    content.id = this.classIdMap.triggerContentId
    content.className = this.classIdMap.triggerContentClass
    el.append(content)
    // The clear button is not built here: the first trigger render builds it
    // (replaceTriggerClearButtonElInDom), so it is built once, not once here
    // and again at that render.
    const arrow = document.createElement('span')
    arrow.className = this.classIdMap.triggerArrowClass
    el.append(arrow)
    return el
  }

  /**
   * Build the clear (x) button for the `clearable` trigger slot.
   * - The library owns the button, its click (stops propagation so it never
   *   toggles the popup, then `clearSelection`; a no-op while the control is
   *   disabled) and its `aria-label` (text from
   *   `uiTranslationPack.triggerClearButtonAriaLabel`).
   * - `createTriggerClearButtonContentElFn` optionally fills the icon; else the
   *   theme's CSS glyph draws it.
   * - The theme hides the button via `data-empty` while nothing is chosen.
   * - It runs on every trigger render (`renderTrigger`).
   * - The first run builds the button.
   * - For `LLSelectSingle` / `LLSelectMultiple` and their subclasses, that
   *   first run is the variant constructor's render, right after `super()`,
   *   so it happens before a FURTHER subclass's field initializers.
   * - A direct `LLSelectBase` subclass gets the button on its first trigger
   *   render (its own `renderTrigger()` call, or `rerender()` /
   *   `setPlaceholder`); until then the trigger is unrendered and there is no
   *   button.
   * - Every later run (a value change, `setPlaceholder`,
   *   `setUiTranslationPack`, `rerender()`) swaps the button in place, unless
   *   this method returns the previous element - then it stays in place.
   * - The base implementation returns a fresh element each run, so, like the
   *   arrow, nothing put on it from outside survives a render; customize it
   *   here.
   * - An override that returns the same element every time owns everything
   *   the rebuild would otherwise refresh on it, including its `aria-label`
   *   after `setUiTranslationPack`.
   * - An override that reads subclass fields calls `rerender()` at the end of
   *   its constructor, like every other trigger method.
   * @group Subclassing: rendering
   */
  protected createTriggerClearButtonEl(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.classIdMap.triggerClearButtonClass
    btn.tabIndex = -1
    btn.setAttribute('aria-label', this.settings.uiTranslationPack.triggerClearButtonAriaLabel)
    const icon = this.createTriggerClearButtonContentEl()
    if (icon !== null) { btn.appendChild(icon) }
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      // Disabled blocks every USER path to a value change (programmatic
      // setters still work), and the clear button is
      // reachable while closed - open() and keydown are already guarded.
      if (this.isDisabled()) { return }
      this.withUserChangeSource(() => this.clearSelection())
    })
    return btn
  }

  /**
   * The element holding DOM focus if that is `el` or a descendant, else `null`.
   * - Read from `el`'s own root: inside a shadow root `document.activeElement`
   *   is the shadow HOST, so the answer must come from the `ShadowRoot`'s
   *   `activeElement` (the `Document`'s otherwise).
   * - The result can sit inside an open shadow root under `el`, so
   *   `el.contains()` may reject it; use `containsComposed` for that check.
   * - A CLOSED shadow root is opaque, so its host is returned.
   */
  private focusedElementIn(el: Element): Element | null {
    const active = (el.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement ?? null
    if (active === null || !el.contains(active)) { return null }
    // Descend through open shadow roots to the element that really holds
    // focus: `activeElement` stops at a shadow host.
    let deepest = active
    while (deepest.shadowRoot !== null && deepest.shadowRoot.activeElement !== null) { deepest = deepest.shadowRoot.activeElement }
    return deepest
  }

  /** Whether `node` is `el` or inside it, walking up through open shadow hosts. */
  private containsComposed(el: Element, node: Node): boolean {
    let cursor: Node | null = node
    while (cursor !== null) {
      if (el.contains(cursor)) { return true }
      // Only a ShadowRoot (a DocumentFragment, nodeType 11) has a host worth
      // climbing to. A detached element is its own root, and an `<a>` /
      // `<area>` root carries a STRING `host` (its URL host) - never follow
      // that. nodeType, not instanceof, so a foreign-realm root still counts.
      const root = cursor.getRootNode()
      cursor = root.nodeType === 11 ? (root as Partial<ShadowRoot>).host ?? null : null
    }
    return false
  }

  /** Whether DOM focus is on `el` or inside it (see `focusedElementIn`). */
  private isFocused(el: Element): boolean {
    return this.focusedElementIn(el) !== null
  }

  /**
   * Build the clear button on the first trigger render, and swap it for a fresh
   * one on every later render, always through `createTriggerClearButtonEl` (the
   * overridable builder) - so `rerender()` repairs an override that reads
   * subclass fields. Keeps DOM focus on the new button when the old one held it.
   * No-op without `clearable`.
   * The order of the steps is load-bearing:
   * 1. Read which node holds focus, if it is the old button or inside it.
   * 2. If one does, park focus on the old button itself. A content fn that
   *    hands back the same icon element each time reparents that icon into
   *    the new button, and the reparenting must not move the focused node.
   * 3. Build the new button.
   * 4. Insert it.
   * 5. If step 1 found focus, move focus to the new button - or, if that
   *    element cannot take focus, to the trigger.
   * 6. Only then remove the old one.
   * Why this order:
   * - Removing the old button first drops DOM focus to `<body>` in every
   *   engine.
   * - Where the engine also fires `focusout` on that removal, its
   *   `relatedTarget` is `null`. The open popup's focus-out guard reads that
   *   as focus leaving the widget.
   * - Moving focus first makes the new button the `relatedTarget`, inside the
   *   root.
   * A builder override that returns the SAME element every time is allowed:
   * the element is kept in place, and focus goes back to the node step 1
   * found, because nothing was rebuilt - unless the override detached that
   * node or moved it out of the button, in which case focus stays on the
   * button.
   */
  private replaceTriggerClearButtonElInDom(): void {
    if (!this.settings.clearable) { return }
    const old = this.triggerClearButtonEl
    const focused = old === null ? null : this.focusedElementIn(old)
    if (old !== null && focused !== null) { old.focus({ preventScroll: true }) }
    const next = this.createTriggerClearButtonEl()
    this.triggerClearButtonEl = next
    if (old === null) {
      this.triggerArrowEl.before(next)
      return
    }
    if (next === old) {
      // Nothing was rebuilt: hand focus back to the node that held it - but
      // only while it is still inside the button. The override may have
      // detached it or moved it elsewhere; then focus stays on the button.
      const holder = focused as (Element & Partial<HTMLOrSVGElement>) | null
      if (holder !== null && holder !== old && this.containsComposed(old, holder) && typeof holder.focus === 'function') {
        holder.focus({ preventScroll: true })
      }
      return
    }
    old.before(next)
    if (focused !== null) {
      next.focus({ preventScroll: true })
      // An override may return a non-focusable element; then the old button
      // still holds focus and removing it would drop focus to <body>. Keep it
      // in the widget instead.
      if (this.focusedElementIn(next) === null) { this.triggerEl.focus({ preventScroll: true }) }
    }
    old.remove()
  }

  /**
   * Clear button's visible content (its x icon).
   * - Default reads `createTriggerClearButtonContentElFn`; `null` (setting
   *   unset, or returned) = no icon - the theme's CSS glyph draws the x.
   * - Override only when extending; for one-off icons pass the setting.
   * @group Subclassing: rendering
   */
  protected createTriggerClearButtonContentEl(): HTMLElement | SVGElement | null {
    return this.settings.createTriggerClearButtonContentElFn
      ? this.settings.createTriggerClearButtonContentElFn()
      : null
  }

  /**
   * Empty the selection (invoked by the clear button). Base is a no-op; single
   * clears to `undefined`, multiple to `[]`. Goes through the normal setters, so
   * `onChange` fires with the empty value. The wipe is total - chosen disabled
   * items are cleared too (native `<select>` parity; `unchooseAll` is the
   * enabled-only bulk op).
   * @group Subclassing: semantics
   */
  protected clearSelection(): void {}

  /**
   * The filter input lives inside the popup, above the listbox. Always built
   * (`hidden` when `filterable: false`) so a future runtime toggle is a CSS
   * flip rather than a DOM rebuild. See `docs/llm/DESIGN.md`.
   */
  private createFilterInputEl(): HTMLInputElement {
    const el = document.createElement('input')
    el.type = 'text'
    el.id = this.classIdMap.filterInputId
    el.className = this.classIdMap.filterInputClass
    el.setAttribute('role', 'combobox')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-autocomplete', 'list')
    el.setAttribute('autocomplete', 'off')
    el.setAttribute('autocapitalize', 'off')
    el.setAttribute('spellcheck', 'false')
    // Accessible name (aria-label / aria-labelledby) is owned by
    // syncFieldNameToDom, which runs right after construction.
    if (this.settings.uiTranslationPack.filterInputPlaceholder !== null) {
      el.placeholder = this.settings.uiTranslationPack.filterInputPlaceholder
    }
    return el
  }

  /**
   * Return the items the popup list renders, in display order.
   *
   * ```text
   * items                (setItems)
   *   |  gather          (only with grouping on; result cached until setItems)
   *   v
   * display base list
   *   |  filter query    (only while a query is active)
   *   v
   * visible items        (this method's return value)
   *   |  render
   *   v
   * DOM rows
   * ```
   *
   * - If no filter query is active (including while closed), it returns the
   *   full list, gathered per `gatherGroups` when grouping is on.
   * - If a filter query is active, it returns the matching subset.
   * - Disabled items are included. They render (grayed); only actions skip
   *   them (keyboard focus, the choose-all row's subset).
   * - Returns the LIVE internal array, typed read-only. Never mutate it
   *   (see `getItems`).
   * - Subclasses use it too (e.g. for selection-by-index), and may override
   *   it to add a step: `LLSelectMultiple` does for `hideChosenRows`.
   * @group Items
   */
  public getVisibleItems(): readonly T[] {
    return this.filteredItems ?? this.getDisplayBaseItems()
  }

  /**
   * The base list in DISPLAY order: `items` gathered per `gatherGroups`
   * (memoized until the next `setItems`), or `items` as-is while grouping is
   * off or `gatherGroups` is false. Filtering and rendering read this, never
   * `items` directly - so the gather runs lazily, at first need after a
   * `setItems`.
   */
  private getDisplayBaseItems(): readonly T[] {
    if (!this.settings.gatherGroups) { return this.items }
    if (this.gatheredItems === undefined) {
      // Keys resolve via the protected overridable method itemToGroupKey, so
      // an override drives the gather exactly like the render. All-null keys
      // (grouping off) detect as contiguous and return `items` itself.
      this.gatheredItems = gatherItemsByGroupKey(this.items, (item) => this.itemToGroupKey(item), this.settings.groupKeyCompareFn)
    }
    return this.gatheredItems
  }

  /**
   * Return the filter input's current query, exactly the string passed to
   * `filterFn`.
   * - It is `''` while the popup is closed, the filter is inactive, or the
   *   input is empty.
   * - It resets on close: each open cycle starts empty.
   * @group Filtering
   */
  public getFilterQuery(): string {
    return this.query
  }

  /**
   * Per-item match predicate for the filter input.
   * - Default reads `filterFn`; else case-insensitive substring on
   *   `itemToString`.
   * - Override only when extending (subclass-wide custom matching); for a
   *   one-off match rule pass the setting.
   * @group Subclassing: semantics
   */
  protected matchesQuery(item: T, query: string): boolean {
    const fn = this.settings.filterFn
    if (fn) { return fn(item, query) }
    return this.itemToString(item).toLowerCase().includes(query.toLowerCase())
  }

  /**
   * Recompute `filteredItems` from the current `items` and `query`. Pure state
   * update: does NOT touch the DOM (the caller re-renders the list separately).
   * No-op when `filterable: false`; an empty query keeps every item. Called from
   * `open()`, from `setItems()`, and on each filter-input event.
   */
  private recomputeFilteredItems(): void {
    if (!this.filterActive) { return }
    const q = this.query
    // Filter over the display base (gathered order): filtering preserves
    // contiguity, so a group's position cannot jump while typing.
    const base = this.getDisplayBaseItems()
    this.filteredItems = q === '' ? base.slice() : base.filter(it => this.matchesQuery(it, q))
  }

  /**
   * Input event on the filter field: re-filter, re-render the list, move the
   * active option to the first match. IME composition is guarded - we wait
   * for `compositionend` and filter once with the composed text.
   */
  private handleSearchInputEvent(): void {
    if (this.composing) { return }
    this.query = this.filterInputEl.value
    this.recomputeFilteredItems()
    this.focusedIndex = -1
    this.renderPopupList()
    // First ENABLED match, not blindly index 0: disabled items are skipped
    // by keyboard navigation (A11Y.md "Disabled"), and the active option a
    // keystroke lands on is keyboard state.
    this.setFocusedIndex(this.findNextEnabledIndex(0, 1, this.getVisibleItems()))
  }

  /** Outer popup wrapper. No ARIA role; structural only. */
  private createPopupEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupClass
    return el
  }

  /**
   * Build the no-results message element. `role="status"` announces its
   * appearance politely; it lives OUTSIDE the listbox (options-only children)
   * and its text comes from `uiTranslationPack.popupListNoResults`.
   */
  private createPopupListNoResultsEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupListNoResultsClass
    el.setAttribute('role', 'status')
    el.hidden = true
    return el
  }

  /**
   * The no-results message's visible content (rich empty-state).
   * - Default reads `createPopupListNoResultsContentElFn`; `null` (setting
   *   unset, or returned) = plain text from `uiTranslationPack.popupListNoResults`.
   * - Override only when extending; for one-off content pass the setting.
   * @group Subclassing: rendering
   */
  protected createPopupListNoResultsContentEl(query: string): HTMLElement | null {
    return this.settings.createPopupListNoResultsContentElFn
      ? this.settings.createPopupListNoResultsContentElFn(query)
      : null
  }

  /**
   * Mirror the visible-list-empty state onto the no-results message element:
   * `hidden` while there is at least one visible item; when shown, fill its
   * content - `createPopupListNoResultsContentEl(query)` first, else the plain
   * text from `uiTranslationPack.popupListNoResults`. Same null-branch shape as
   * `createItemEl` / `createGroupEl`.
   * - The write is SKIPPED when the resolved text matches what is already shown,
   *   so a still-empty next keystroke does not re-announce (see `lastNoResultsText`).
   */
  private syncPopupListNoResultsToDom(): void {
    const empty = this.getVisibleItems().length === 0
    this.popupListNoResultsEl.hidden = !empty
    if (!empty) {
      this.lastNoResultsText = null
      return
    }
    const content = this.createPopupListNoResultsContentEl(this.query)
    const nextText = content === null
      ? this.settings.uiTranslationPack.popupListNoResults
      : content.textContent ?? ''
    if (nextText === this.lastNoResultsText) { return }
    this.lastNoResultsText = nextText
    if (content === null) {
      this.popupListNoResultsEl.textContent = this.settings.uiTranslationPack.popupListNoResults
    } else {
      this.popupListNoResultsEl.replaceChildren(content)
    }
  }

  /** Inner element with `role="listbox"`. Holds item children. */
  private createPopupListEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.popupListId
    el.className = this.classIdMap.popupListClass
    el.setAttribute('role', 'listbox')
    el.setAttribute('tabindex', '-1')
    return el
  }
}
