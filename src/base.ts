// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, item storage,
// keyboard navigation, and shared rendering primitives for LLSelectSingle and
// LLSelectMultiple. Subclasses own chosen-state and decide what happens on
// item click.

import { createPositioner, type Positioner, type WidthPolicy } from './positioning.js'
import {
  LLSelectAction,
  ensureVisibleInScroll,
  getActionFromKey,
  getUpdatedIndex,
} from './keyboard.js'
import { en as DEFAULT_TEXTS, type LLSelectTexts } from './texts.js'

/**
 * What happens when the user clicks outside an open popup.
 *
 * - `'pass-through'` (default): close the popup; the outside click still
 *   triggers its normal action (button click, link navigation, etc.).
 * - `'block'`: close the popup only; the outside click is swallowed so no
 *   underlying handler or default action fires. Avoids accidental side
 *   effects when the user only intended to dismiss the dropdown.
 */
export type LLSelectOutsideClickBehavior = 'pass-through' | 'block'

/**
 * Function that produces the trigger's arrow element (typically a dropdown
 * chevron or triangle). Called by the library when the arrow may need to
 * change - including on every open/close - so the returned element can vary
 * with `isOpen`. Return `null` to render no arrow for that state.
 */
export type LLSelectCreateTriggerArrowContentElFn = (state: { isOpen: boolean }) => HTMLElement | SVGElement | null

/**
 * Resolved (defaults applied) settings shared by all select variants.
 * Subclasses (`LLSelectSingle`, `LLSelectMultiple`) extend this with their
 * mode-specific options such as `onChange`.
 */
export interface LLSelectBaseSettings<T, GK = string> {
  /**
   * Prefix used for every CSS class and DOM id the library generates
   * (default `'llselect'`). NOTE: the shipped themes target the default
   * prefix only - a custom prefix means bringing your own CSS. Reference the
   * resolved names via `instance.classIdMap` instead of hardcoding strings.
   */
  cssClassPrefix: string
  /**
   * Text shown in the trigger when nothing is selected. App copy: an explicit
   * value always wins; when unset, the locale default
   * `texts.triggerPlaceholder` is used (`'Please select'` in English).
   */
  placeholder: string
  /**
   * Equality predicate for item values - return `true` when `a` and `b` are the
   * same item.
   * - Required for non-primitive `T` (the default `===` compares references).
   * - Used for selection, dedup, and matching the chosen item back to the list.
   * - Symmetric: do not depend on which argument is the candidate vs the
   *   existing item.
   */
  compareFn: (a: T, b: T) => boolean
  /** See {@link LLSelectOutsideClickBehavior}. */
  outsideClickBehavior: LLSelectOutsideClickBehavior
  /**
   * See {@link LLSelectCreateTriggerArrowContentElFn}. `null` (default) means the library
   * adds nothing to the arrow slot.
   */
  createTriggerArrowContentElFn: LLSelectCreateTriggerArrowContentElFn | null
  /**
   * Whether the trigger shows a clear (x) button that empties the selection.
   * `false` (default). The button sits in its OWN trigger slot (like the arrow,
   * so it never collides with `createTriggerContentElFn`), is `tabindex="-1"` with
   * an `aria-label`, and is hidden via `data-empty` when nothing is selected.
   * Clearing goes through the normal setters, so `onChange` fires with the empty
   * value (`undefined` / `[]`).
   */
  clearable: boolean
  /**
   * Content ELEMENT of the clear button (its x icon), mirroring `createTriggerArrowContentElFn`.
   * `null` (default) = the theme's CSS glyph. The library always owns the button,
   * its click (clears + stops propagation) and aria; this only fills the icon.
   */
  createTriggerClearButtonContentElFn: (() => HTMLElement | SVGElement | null) | null
  /**
   * Whether the popup includes a search input.
   * - `false` (default): never.
   * - `true`: always.
   * - Predicate `(items) => boolean`: conditional - evaluated against the
   *   CURRENT full item list each time the popup OPENS (never mid-open; a
   *   `setItems` crossing the threshold applies on the next open). E.g.
   *   `searchable: (items) => items.length > 10`.
   * The ARIA mode follows the evaluated value per open cycle: active =
   * trigger `role="button"`, focus moves to the input; inactive = exactly
   * like `searchable: false` (trigger stays `role="combobox"`, focus stays on
   * the trigger). See `docs/A11Y.md` and `docs/DESIGN.md`.
   */
  searchable: boolean | ((items: readonly T[]) => boolean)
  /**
   * Chrome strings (AT labels + generated text) - the i18n seam. Resolved
   * against English: pass a language pack whole (`texts: zhTW` from
   * `llselect/i18n`) or override single keys
   * (`texts: { ...zhTW, searchInputPlaceholder: '...' }`).
   * Key-by-key contract (incl. what `null` means where allowed):
   * {@link LLSelectTexts}.
   */
  texts: LLSelectTexts
  /**
   * Predicate used by the search input; return `true` to keep the item.
   * `null` (default) means the built-in case-insensitive substring match
   * against the item's resolved label (`itemToStringFn` / `itemToString`).
   * Pass a custom function for fuzzy / domain-specific matching.
   * - `query` is the RAW input value: not trimmed and not lower-cased. Normalize
   *   it yourself (the built-in lower-cases both sides; it does not trim).
   * - Not called while the query is empty (an empty box shows every item), but a
   *   whitespace-only query (e.g. `"  "`) does call it.
   */
  filterFn: ((item: T, query: string) => boolean) | null
  /**
   * How the popup decides its width. Does NOT affect the trigger - trigger
   * width is always whatever your CSS says.
   *
   * - `'match-trigger'` (default): popup width equals trigger width; long
   *   labels wrap inside the popup.
   * - `'fit-content'`: popup width grows to its own content (items, search
   *   input, ...). May be wider than trigger. Auto-shifts and width-clamps
   *   when the natural width would overflow the viewport. Direction-aware:
   *   in an RTL context (`getComputedStyle(trigger).direction === 'rtl'`,
   *   read once per open) it right-aligns to the trigger and grows LEFTWARD,
   *   the mirror of LTR.
   */
  popupWidthPolicy: WidthPolicy
  /**
   * Predicate deciding whether an individual item is disabled. `null` (default)
   * = nothing disabled. A disabled item is not selectable (click / Enter) and is
   * skipped by keyboard nav; it keeps `role="option"` plus `aria-disabled`.
   * Re-evaluated on every render (never cached). For a generic `T` this is the
   * only way to mark items - the library cannot read a `disabled` field off an
   * unknown type. See `docs/DESIGN.md`.
   */
  itemDisabledFn: ((item: T) => boolean) | null
  /**
   * When the control is disabled via `setDisabled(true)`, whether the trigger
   * stays in the tab order (`tabindex="0"`). `false` (default) takes it out
   * (`-1`). Set `true` so keyboard / AT users can focus the disabled control to
   * read a "why disabled" tooltip.
   */
  focusableWhenDisabled: boolean
  /**
   * Item -> display string, without subclassing.
   * - `null` (default) = `String(item)`.
   * - Read by the `itemToString` method's default; used for list text, the
   *   single trigger label, the option's accessible name, and the default
   *   filter. Inserted as `textContent` (plain text, NOT parsed as HTML).
   * - For rich content (icons etc.), pass `createItemContentElFn`.
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
   *   `itemToString`, so the accessible name + search text stay owned by
   *   `itemToString` no matter what you render (icon-only, reordered, ...).
   *   To make the spoken/searched text differ from the visible content, set the
   *   two independently: `itemToStringFn` for the name/search,
   *   `createItemContentElFn` for the look.
   * - For full control of the option element (tag / wiring), subclass
   *   `createItemEl` instead.
   *
   * @example
   *   // List shows an icon + label; screen readers announce just the label.
   *   itemToStringFn: (lang) => lang.name,
   *   createItemContentElFn: (lang) => {
   *     const row = document.createElement('span')
   *     const icon = document.createElement('i')
   *     icon.className = `mdi mdi-${lang.icon}`
   *     icon.setAttribute('aria-hidden', 'true') // decorative
   *     row.append(icon, lang.name)
   *     return row
   *   }
   */
  createItemContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Item -> its group's key (identity), enabling optgroup rendering.
   * - `null` (setting, default): grouping off - flat list, no headers.
   * - fn returns `null`: this item is in no group; renders ungrouped.
   * - Contiguous items with an equal key (per `groupKeyCompareFn`) form one
   *   group, so the data must be pre-sorted by group. See `docs/DESIGN.md`.
   */
  itemToGroupKeyFn: ((item: T) => GK | null) | null
  /**
   * Equality for two group keys; decides whether adjacent items share a group.
   * - `null` (default) = strict `===` (right for string / number keys).
   * - Supply only when `GK` is an object without usable reference identity.
   * - Mirrors `compareFn`, one level up.
   */
  groupKeyCompareFn: ((a: GK, b: GK) => boolean) | null
  /**
   * Group key -> the header's display text. The i18n seam: keep keys stable,
   * translate here.
   * - `null` (default) = `String(groupKey)`.
   */
  groupKeyToLabelFn: ((groupKey: GK) => string) | null
  /**
   * Predicate: is this whole group disabled?
   * - `null` (default) = no group disabled.
   * - `true` = every item in the group is treated as disabled (layers on top of
   *   `itemDisabledFn`).
   */
  groupDisabledFn: ((groupKey: GK) => boolean) | null
  /**
   * Group header -> its visible content ELEMENT (icon / count badge / rich
   * markup), without subclassing. Mirrors `createItemContentElFn`.
   * - Return an `HTMLElement` and the library inserts it as the header's visible
   *   content; the group's accessible name stays `groupKeyToLabel` (on the
   *   container `aria-label`) and the label element stays `aria-hidden`.
   * - `null` (default, or returned for a group) = plain text from
   *   `groupKeyToLabel`.
   * - `itemsInGroup` is the group's items, so you can render "Fruits (4)" or a
   *   summary without recomputing the grouping.
   */
  createGroupLabelContentElFn: ((groupKey: GK, itemsInGroup: readonly T[]) => HTMLElement | null) | null
  /**
   * Fired right after the popup opens. A no-op `open()` (already open, or a
   * disabled control) does not fire it. Fires in ADDITION to the protected
   * `onOpened` hook - the setting is for consumers, the hook for subclasses;
   * both run. `null` (default) = nothing.
   */
  onOpen: (() => void) | null
  /**
   * Fired right after the popup closes. A no-op `close()` does not fire it.
   * Additive with the protected `onClosed` hook, like {@link onOpen}.
   */
  onClose: (() => void) | null
}

/**
 * Constructor input for a resolved settings bag `S`: every field optional,
 * and `texts` accepts a PARTIAL texts object (missing keys fall back to
 * English). Shared by the base / single / multiple `*SettingsInput` types;
 * use it for a subclass wrapper that extends the settings bag.
 */
export type LLSelectSettingsInputOf<S extends { texts: LLSelectTexts }> =
  & Partial<Omit<S, 'texts'>>
  & { texts?: Partial<LLSelectTexts> }

/**
 * Constructor-time settings input - every field is optional and missing
 * fields fall back to the library defaults.
 */
export type LLSelectBaseSettingsInput<T, GK = string> = LLSelectSettingsInputOf<LLSelectBaseSettings<T, GK>>

/**
 * Resolved CSS class names and DOM ids for one instance. Exposed on
 * `instance.classIdMap` so callers can reuse them in their own CSS or query
 * selectors instead of hard-coding the strings.
 */
export interface LLSelectClassIdMap {
  /** Class on `rootEl` (the caller-passed mount element). */
  rootClass: string
  /** Class on `triggerEl` (the interactive trigger, `role="combobox"`). */
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
  /** Class on every item element (`role="option"`) inside the popup list. */
  itemClass: string
  /**
   * Extra class added to the currently keyboard-focused item element.
   * Use this to style the focus highlight.
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
   * Class added to `rootEl` while the popup is open. Use it as a CSS hook
   * for open-state styling (also available as `[data-state='open']` on the
   * trigger).
   */
  openClass: string
  /** DOM `id` of `triggerEl`. Unique across instances. */
  triggerId: string
  /**
   * DOM `id` of `popupListEl` (the inner listbox). Unique across instances.
   * Referenced by the trigger's `aria-controls` attribute.
   */
  popupListId: string
  /** Class on the search input element inside the popup. */
  searchInputClass: string
  /** DOM `id` of the search input. Unique across instances. */
  searchInputId: string
}

const DEFAULT_PREFIX = 'llselect'

let instanceCounter = 0

function defaultCompareFn<T>(a: T, b: T): boolean {
  return a === b
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
    itemClass: `${prefix}-item`,
    itemFocusedClass: `${prefix}-item-focused`,
    itemDisabledClass: `${prefix}-item-disabled`,
    groupClass: `${prefix}-group`,
    groupLabelClass: `${prefix}-group-label`,
    tagsClass: `${prefix}-tags`,
    tagClass: `${prefix}-tag`,
    tagRemoveButtonClass: `${prefix}-tag-remove-button`,
    openClass: `${prefix}-open`,
    triggerId: `${uniq}-trigger`,
    popupListId: `${uniq}-popup-list`,
    searchInputClass: `${prefix}-search-input`,
    searchInputId: `${uniq}-search-input`,
  }
}

/**
 * One run in the rendered popup list: a single ungrouped item element, or a
 * group (header + its item elements). Computed from the flat visible list;
 * group headers never enter `itemEls`, so index alignment is preserved.
 */
type PopupListSegment<T, GK> =
  | { readonly group: false; readonly el: HTMLElement }
  | { readonly group: true; readonly key: GK; readonly index: number; readonly items: T[]; readonly els: HTMLElement[] }

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
 */
export abstract class LLSelectBase<T = unknown, GK = string> {
  /**
   * The caller-passed mount element, now decorated as the select's root.
   * Library does not replace this node, so the caller's original reference,
   * id, and data-* attributes stay valid.
   */
  public readonly rootEl: HTMLElement
  /**
   * The interactive trigger element (`role="combobox"`). Receives focus,
   * click, and keydown events; carries `aria-expanded`, `aria-controls`,
   * `aria-activedescendant`, and `data-state="open|closed"`.
   */
  public readonly triggerEl: HTMLElement
  /**
   * Inner span inside the trigger where text/tags are written.
   * Subclasses' `renderTriggerContent` writes here so the sibling arrow slot
   * is preserved across re-renders.
   */
  public readonly triggerContentEl: HTMLElement
  /**
   * The outer popup wrapper. Has no ARIA role itself - it just hosts the
   * popup chrome (future: filter input, toggle-all control) and the inner
   * `popupListEl`. Hidden via the `hidden` attribute when closed; positioned
   * via inline styles by the positioner when open.
   */
  public readonly popupEl: HTMLElement
  /**
   * The inner element with `role="listbox"`, holding the item children.
   * Sits inside `popupEl` so siblings (filter input, toggle-all) can live
   * above it without violating ARIA's "listbox children must be options"
   * rule. The trigger's `aria-controls` points to this element.
   */
  public readonly popupListEl: HTMLElement
  /** Resolved class names and ids for this instance. */
  public readonly classIdMap: LLSelectClassIdMap

  /**
   * Resolved settings (defaults applied) - ONE bag for the whole hierarchy.
   * Subclasses that extend the settings pass their resolved fields through the
   * constructor's `subclassSettings` param and re-type this field with
   * `declare` (see `LLSelectSingle` / `LLSelectMultiple`).
   */
  protected readonly settings: LLSelectBaseSettings<T, GK>
  /** Current item list. Defensive copy of what `setItems` was given. */
  protected items: T[] = []
  /** Whether the popup is currently open. */
  protected isOpen = false
  /**
   * Index (into `items`) of the currently keyboard-focused item, or `-1`
   * when nothing is focused (closed popup, or no items).
   */
  protected focusedIndex = -1
  /** Control-level disabled state (whole select); toggled via `setDisabled`. */
  private disabled = false
  private triggerArrowEl: HTMLElement
  private positioner: Positioner | undefined
  private itemEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined
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
   * navigation. Equals the search input while search is active, else the
   * trigger. Re-pointed by `syncSearchModeToDom` (constructor + every open).
   */
  private comboboxEl!: HTMLElement
  /**
   * Search input element. Always built into the popup DOM and always wired
   * (a `hidden` input receives no events); kept `hidden` while search is
   * inactive.
   */
  private searchInputEl!: HTMLInputElement
  /**
   * No-results message element (`role="status"`). Always built (like the
   * search input), sits AFTER the listbox inside `popupEl` so the listbox
   * keeps its options-only children contract; `hidden` while the visible
   * list has entries.
   */
  private popupListNoResultsEl!: HTMLElement
  /**
   * Whether the search input is active for the CURRENT open cycle. Evaluated
   * from the `searchable` setting (predicate form reads the current items) in
   * the constructor and on every `open()` - never re-evaluated mid-open, so
   * the focus host cannot be yanked while the popup is up.
   */
  private searchActive: boolean
  private query = ''
  private filteredItems: T[] | undefined
  private composing = false

  /**
   * @param targetEl - mount element. Becomes `rootEl`; its existing children
   *   are wiped and replaced with the trigger + popup structure. Pre-set
   *   classes / id / data-* attributes on this element are preserved.
   * @param settings - optional partial settings. Missing fields use defaults
   *   ({@link LLSelectBaseSettings}).
   * @param subclassSettings - for subclasses that EXTEND the settings bag: their
   *   own fields, already resolved (defaults applied). Merged into
   *   `this.settings` right here, so the bag is complete before any base
   *   construction code (e.g. `createTriggerClearButtonEl` via `createTriggerEl`) can read
   *   it. Pair with a `declare` re-type of `settings` in the subclass.
   */
  constructor(
    targetEl: HTMLElement,
    settings?: LLSelectBaseSettingsInput<T, GK>,
    subclassSettings?: Record<string, unknown>,
  ) {
    // Texts resolve first: the placeholder's library default is localized
    // chrome (texts.triggerPlaceholder), while an explicit `placeholder` is
    // app copy and wins.
    const texts: LLSelectTexts = { ...DEFAULT_TEXTS, ...settings?.texts }
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: settings?.placeholder ?? texts.triggerPlaceholder,
      compareFn: settings?.compareFn ?? defaultCompareFn,
      outsideClickBehavior: settings?.outsideClickBehavior ?? 'pass-through',
      createTriggerArrowContentElFn: settings?.createTriggerArrowContentElFn ?? null,
      clearable: settings?.clearable ?? false,
      createTriggerClearButtonContentElFn: settings?.createTriggerClearButtonContentElFn ?? null,
      searchable: settings?.searchable ?? false,
      texts,
      filterFn: settings?.filterFn ?? null,
      popupWidthPolicy: settings?.popupWidthPolicy ?? 'match-trigger',
      itemDisabledFn: settings?.itemDisabledFn ?? null,
      focusableWhenDisabled: settings?.focusableWhenDisabled ?? false,
      itemToStringFn: settings?.itemToStringFn ?? null,
      createItemContentElFn: settings?.createItemContentElFn ?? null,
      itemToGroupKeyFn: settings?.itemToGroupKeyFn ?? null,
      groupKeyCompareFn: settings?.groupKeyCompareFn ?? null,
      groupKeyToLabelFn: settings?.groupKeyToLabelFn ?? null,
      groupDisabledFn: settings?.groupDisabledFn ?? null,
      createGroupLabelContentElFn: settings?.createGroupLabelContentElFn ?? null,
      onOpen: settings?.onOpen ?? null,
      onClose: settings?.onClose ?? null,
      // Sole settings cast: the subclass spread widens the literal's type past
      // what TS can reconcile with the base type; the extras themselves are
      // `satisfies`-checked at each subclass call site.
      ...subclassSettings,
    } as LLSelectBaseSettings<T, GK>
    this.classIdMap = createClassIdMap(this.settings.cssClassPrefix)
    // Initial evaluation runs against the empty item list (setItems has not
    // happened yet); every open() re-evaluates.
    this.searchActive = this.computeSearchActive()

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

    this.popupEl = this.createPopupEl()
    this.popupListEl = this.createPopupListEl()
    this.searchInputEl = this.createSearchInputEl()
    // input always built; non-searchable keeps it `hidden`. Search box must
    // sit above the listbox: listbox children must be options only.
    this.popupListNoResultsEl = this.createPopupListNoResultsEl()
    this.popupEl.append(this.searchInputEl, this.popupListEl, this.popupListNoResultsEl)
    this.popupEl.hidden = true
    this.syncSearchModeToDom()
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

    this.rootEl.append(this.triggerEl, this.popupEl)

    this.triggerEl.addEventListener('click', () => this.toggle())
    this.triggerEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    // Clicking inside the list must not move DOM focus: the browser's
    // mousedown focus-fixup would focus popupListEl (tabindex="-1" makes it
    // CLICK-focusable) and silently kill keyboard input into the combobox
    // host (search input / trigger) - e.g. multi + searchable: mouse-toggle
    // an item, then typing goes nowhere. Prevent the default on everything
    // except the list element itself, so native scrollbar dragging on the
    // list stays untouched. `click` still fires (it does not depend on the
    // mousedown default), so selection wiring is unaffected.
    this.popupListEl.addEventListener('mousedown', (ev) => {
      if (ev.target !== this.popupListEl) { ev.preventDefault() }
    })
    // Always wired, regardless of the current search mode: a `hidden` input
    // receives no events, and the predicate form of `searchable` can activate
    // search on any later open().
    this.searchInputEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    this.searchInputEl.addEventListener('input', () => this.handleSearchInputEvent())
    this.searchInputEl.addEventListener('compositionstart', () => { this.composing = true })
    this.searchInputEl.addEventListener('compositionend', () => { this.composing = false; this.handleSearchInputEvent() })
  }

  /**
   * Evaluate the `searchable` setting against the current items: booleans
   * pass through, the predicate form is called with the full item list.
   */
  private computeSearchActive(): boolean {
    const searchable = this.settings.searchable
    return typeof searchable === 'function' ? searchable(this.items) : searchable
  }

  /**
   * Mirror `searchActive` onto the DOM + wiring it decides: the trigger's
   * role (`button` while active, `combobox` while not), the search input's
   * `hidden` flag, and which element `comboboxEl` points at (the
   * `aria-activedescendant` / focus host). Called from the constructor and
   * from `open()` after re-evaluation.
   */
  private syncSearchModeToDom(): void {
    this.triggerEl.setAttribute('role', this.searchActive ? 'button' : 'combobox')
    this.searchInputEl.hidden = !this.searchActive
    this.comboboxEl = this.searchActive ? this.searchInputEl : this.triggerEl
  }

  /**
   * Open the popup. Builds item elements lazily, attaches the positioner
   * (which auto-closes if the trigger is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the item list.
   * No-op if already open.
   */
  public open(): void {
    if (this.isOpen || this.disabled) { return }
    const restoreWindowScroll = this.captureWindowScroll()
    this.isOpen = true
    // Search mode is (re)evaluated once per open cycle, before anything that
    // depends on it (role, focus host, filtering).
    this.searchActive = this.computeSearchActive()
    this.syncSearchModeToDom()
    this.triggerEl.setAttribute('aria-expanded', 'true')
    this.triggerEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    if (this.searchActive) {
      this.query = ''
      this.searchInputEl.value = ''
      this.searchInputEl.setAttribute('aria-expanded', 'true')
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
    this.renderTriggerArrow()
    this.renderPopupList()
    this.positioner = createPositioner(this.triggerEl, this.popupEl, {
      onHide: () => this.close(),
      widthPolicy: this.settings.popupWidthPolicy,
    })
    this.attachOutsideClick()
    this.attachFocusOut()
    this.focusInitial()
    this.onOpened()
    this.settings.onOpen?.()
    if (this.searchActive) {
      this.searchInputEl.focus({ preventScroll: true })
    }
    restoreWindowScroll()
  }

  /**
   * Close the popup. Detaches positioner and outside-click listener, clears
   * the item DOM, and resets focused-item state. No-op if already closed.
   *
   * Focus return is decided automatically: when `searchable: true` and DOM
   * focus is still on the search input at the moment of close (Esc on empty
   * filter, single-select pick, click on non-focusable area outside), focus
   * is returned to the trigger. Tab-away and outside clicks on focusable
   * elements have already moved focus elsewhere, so we leave it alone.
   */
  public close(): void {
    if (!this.isOpen) { return }
    const shouldReturnFocus = this.searchActive && document.activeElement === this.searchInputEl
    this.isOpen = false
    this.triggerEl.setAttribute('aria-expanded', 'false')
    this.triggerEl.setAttribute('data-state', 'closed')
    this.rootEl.classList.remove(this.classIdMap.openClass)
    if (this.searchActive) {
      this.searchInputEl.setAttribute('aria-expanded', 'false')
      this.searchInputEl.value = ''
      this.query = ''
      this.filteredItems = undefined
    }
    this.positioner?.detach()
    this.positioner = undefined
    this.detachOutsideClick()
    this.detachFocusOut()
    this.popupListEl.replaceChildren()
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
    this.comboboxEl.removeAttribute('aria-activedescendant')
    this.renderTriggerArrow()
    this.onClosed()
    this.settings.onClose?.()
    if (shouldReturnFocus) { this.triggerEl.focus({ preventScroll: true }) }
  }

  /**
   * Orchestrator: composes `renderTrigger` + `renderPopupList` (the latter only
   * while open) to rebuild from current state; touches no DOM directly. Use this
   * when external code mutates an item object's properties (e.g.
   * `users[0].name = 'X'`) without replacing the items array - the library has
   * no way to detect that on its own. Does NOT fire `onChange`, does NOT run
   * `onItemsChanged`. Pure visual refresh.
   */
  public rerender(): void {
    this.renderTrigger()
    if (this.isOpen) { this.renderPopupList() }
  }

  /**
   * Tear down the instance: close the popup (which detaches every document /
   * window listener and the positioner), remove the library's class and
   * inline styles from the caller's mount element, and empty it. Idempotent.
   * The instance must not be used afterwards.
   * - REQUIRED before discarding an instance that might be OPEN (framework
   *   wrappers: call this on unmount) - skipping it there leaks the
   *   outside-click / focusout / scroll / resize listeners.
   * - Discarding a CLOSED instance without `destroy()` leaks nothing; it only
   *   leaves the root class and `overflow-anchor` style on the mount.
   */
  public destroy(): void {
    this.close()
    this.rootEl.classList.remove(this.classIdMap.rootClass, this.classIdMap.openClass)
    this.rootEl.style.overflowAnchor = ''
    this.rootEl.replaceChildren()
  }

  /** Open if closed, close if open. */
  public toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Return the current item list.
   * - The returned array is the LIVE internal array, typed read-only. Do not
   *   mutate it (TS blocks it; plain-JS callers must treat it as frozen) -
   *   structural mutation would silently bypass chosen-state reconciliation,
   *   re-filtering, and re-render.
   * - Structural change goes through `setItems`; mutating item OBJECTS +
   *   `rerender()` is the supported in-place path.
   */
  public getItems(): readonly T[] {
    return this.items
  }

  /**
   * Resolved chrome strings (English defaults + the `texts` setting merged).
   * Reuse the library's translations in your own UI - e.g. a tooltip on a tag
   * remove button: `sel.getTexts().tagRemoveButtonAriaLabel(label)` - instead
   * of maintaining a second translation source. Live object, treat as
   * immutable (same contract as `getItems`).
   */
  public getTexts(): Readonly<LLSelectTexts> {
    return this.settings.texts
  }

  /**
   * Replace the item list. The input is shallow-copied so external mutation
   * does not affect the select. If the popup is currently open it is
   * re-rendered; otherwise the DOM is built lazily on the next `open()`.
   * Subclasses may reconcile chosen-state via {@link onItemsChanged}
   * (e.g. single mode drops a chosen value that is no longer in the list).
   */
  public setItems(items: T[]): void {
    this.items = items.slice()
    if (this.searchActive) { this.recomputeFilteredItems() }
    if (this.isOpen) { this.renderPopupList() }
    this.onItemsChanged()
  }

  /**
   * Enable or disable the whole control. Disabled: the trigger gets
   * `aria-disabled` + `data-disabled` (never the native `disabled` attribute,
   * which would suppress the hover / focus events a tooltip needs), opening is
   * blocked, an open popup closes, and the trigger leaves the tab order unless
   * `focusableWhenDisabled` is set. Stored as state, mirroring `setItems` /
   * `setChosenItems` (this design keeps mutable state out of settings).
   */
  public setDisabled(value: boolean): void {
    if (this.disabled === value) { return }
    this.disabled = value
    if (value && this.isOpen) { this.close() }
    this.syncDisabledStateToDom()
  }

  /** Whether the whole control is disabled. */
  public isDisabled(): boolean {
    return this.disabled
  }

  /** Reflect `this.disabled` onto the trigger's ARIA / data / tabindex. */
  private syncDisabledStateToDom(): void {
    if (this.disabled) {
      this.triggerEl.setAttribute('aria-disabled', 'true')
      this.triggerEl.setAttribute('data-disabled', 'true')
      this.triggerEl.setAttribute('tabindex', this.settings.focusableWhenDisabled ? '0' : '-1')
    } else {
      this.triggerEl.removeAttribute('aria-disabled')
      this.triggerEl.setAttribute('data-disabled', 'false')
      this.triggerEl.setAttribute('tabindex', '0')
    }
  }

  /**
   * Subclass hook: called once after the popup finishes opening. Default no-op.
   * The `onOpen` setting fires alongside this (both run) - hook for subclass
   * logic, setting for consumer notification.
   */
  protected onOpened(): void {}
  /** Subclass hook: called once after the popup finishes closing. Pairs with the `onClose` setting (both run). */
  protected onClosed(): void {}
  /**
   * Subclass hook: called after the chosen state actually changed, right
   * before the variant's `onChange` setting fires (hook first, both run -
   * same pairing as `onOpened` / `onClosed`). Default no-op.
   */
  protected onChosenChanged(): void {}
  /**
   * Called after `setItems` finishes. Override to reconcile state that
   * depends on the item list (e.g. clear a chosen value that disappeared).
   * Default no-op.
   */
  protected onItemsChanged(): void {}

  /**
   * Orchestrator: composes `renderTriggerContent` + `renderTriggerArrow` to
   * (re)build the whole trigger from state; touches no DOM directly. Subclasses
   * normally override {@link renderTriggerContent}, not this. Call this from
   * subclass code when both slots need to refresh together (constructor,
   * post-state-change, etc.).
   */
  protected renderTrigger(): void {
    this.renderTriggerContent()
    this.renderTriggerArrow()
  }

  /**
   * Write the trigger's content slot (`triggerContentEl`), replacing whatever
   * was there; the sibling arrow slot is untouched. The single DOM-writing
   * primitive behind every `renderTriggerContent` path.
   * - `string` -> set as `textContent` (plain text, NOT parsed as HTML). Used
   *   for the default placeholder / `itemToString` label / count summary.
   * - `HTMLElement` -> inserted as-is via `replaceChildren`; caller owns the
   *   node. Used for whatever the `createTriggerContentElFn` setting returned.
   * Called by `renderTriggerContent` - the base default and the `LLSelectSingle`
   * / `LLSelectMultiple` overrides.
   */
  protected commitTriggerContentToDom(content: HTMLElement | string): void {
    if (typeof content === 'string') {
      this.triggerContentEl.textContent = content
    } else {
      this.triggerContentEl.replaceChildren(content)
    }
  }

  /**
   * Mirror the empty/filled state onto the trigger's `data-empty` attribute
   * (`"true"` when `isEmpty()`, else `"false"`). A CSS / AT styling hook,
   * independent of the rendered content. Called by the subclass
   * `renderTriggerContent` overrides.
   */
  protected syncEmptyStateToDom(): void {
    this.triggerEl.setAttribute('data-empty', this.isEmpty() ? 'true' : 'false')
  }

  /**
   * Whether the control currently has no selection (drives `data-empty`).
   * Base default is always `true` (the base trigger only shows the
   * placeholder); `LLSelectSingle` / `LLSelectMultiple` override it.
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
   */
  protected renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    this.commitTriggerContentToDom(this.settings.placeholder)
  }

  /**
   * Orchestrator: composes the `*ToDom` / `*El` primitives to (re)build the
   * trigger's arrow slot from state; touches no DOM directly. Calls
   * `createTriggerArrowContentEl` with the current `isOpen` and commits whatever it returns
   * (including `null` -> no arrow for this state).
   */
  private renderTriggerArrow(): void {
    this.commitTriggerArrowContentElToDom(this.createTriggerArrowContentEl({ isOpen: this.isOpen }))
  }

  /**
   * Trigger arrow element for the given open state.
   * - Default reads `createTriggerArrowContentElFn`; `null` (setting unset, or returned for
   *   a state) = no arrow for that state.
   * - Override only when extending; for one-off arrows pass the setting.
   *   Mirrors `createTriggerClearButtonEl` / `createItemContentEl`.
   */
  protected createTriggerArrowContentEl(state: { isOpen: boolean }): HTMLElement | SVGElement | null {
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
   */
  protected renderPopupList(): void {
    const list = this.getVisibleItems()
    const els = list.map((item, i) => this.createItemEl(item, i))
    this.itemEls = els
    this.focusedEl = undefined
    this.commitPopupSegmentsToDom(this.computePopupSegments(list, els))
    this.syncPopupListNoResultsToDom()
    this.positioner?.reposition()
    // Clamp focused index if the visible list shrank, then re-apply visuals.
    if (this.focusedIndex >= list.length) {
      this.focusedIndex = list.length === 0 ? -1 : list.length - 1
    }
    this.syncFocusedIndexToDom()
  }

  /**
   * Split the flat visible list into render segments: ungrouped item elements
   * and contiguous same-key groups. Pure computation - reads the group settings,
   * touches no DOM. Group headers are NOT added to `itemEls`, so `itemEls[i]`
   * stays aligned with `getVisibleItems()[i]` and keyboard nav skips headers for
   * free. `console.warn`s once per non-contiguous key reappearance (unsorted
   * data would otherwise emit a duplicate header for the same group).
   */
  private computePopupSegments(list: readonly T[], els: HTMLElement[]): PopupListSegment<T, GK>[] {
    const keyOf = this.settings.itemToGroupKeyFn
    if (!keyOf) { return els.map((el): PopupListSegment<T, GK> => ({ group: false, el })) }
    const keyEq = this.settings.groupKeyCompareFn ?? ((a: GK, b: GK) => a === b)
    const segments: PopupListSegment<T, GK>[] = []
    const closedKeys: GK[] = []
    let groupIndex = 0
    let i = 0
    while (i < list.length) {
      const key = keyOf(list[i]!)
      if (key === null) {
        segments.push({ group: false, el: els[i]! })
        i += 1
        continue
      }
      const groupItems: T[] = [list[i]!]
      const groupEls: HTMLElement[] = [els[i]!]
      let j = i + 1
      while (j < list.length) {
        const next = keyOf(list[j]!)
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

  /** Replace every popup-list child with the rendered segments (items + group containers). */
  private commitPopupSegmentsToDom(segments: PopupListSegment<T, GK>[]): void {
    const children = segments.map(seg =>
      seg.group ? this.createGroupEl(seg.key, seg.index, seg.items, seg.els) : seg.el,
    )
    this.popupListEl.replaceChildren(...children)
  }

  /**
   * Build a detached group container: `role="group"` named by `groupKeyToLabel`,
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
   */
  protected createGroupEl(key: GK, index: number, items: readonly T[], itemEls: HTMLElement[]): HTMLElement {
    const label = this.groupKeyToLabel(key)
    const group = document.createElement('div')
    group.id = `${this.classIdMap.popupListId}-group${index}`
    group.className = this.classIdMap.groupClass
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', label)
    if (this.isGroupDisabled(key)) {
      group.setAttribute('aria-disabled', 'true')
      group.setAttribute('data-disabled', 'true')
    }
    const labelEl = document.createElement('div')
    labelEl.className = this.classIdMap.groupLabelClass
    labelEl.setAttribute('aria-hidden', 'true')
    const content = this.createGroupLabelContentEl(key, items)
    if (content === null) {
      labelEl.textContent = label
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
   *   uses plain text from `groupKeyToLabel`.
   * - The group's accessible name stays `groupKeyToLabel` (container `aria-label`);
   *   this fills only the visible, `aria-hidden` label content.
   * - Override only when extending; for one-off rich headers pass the setting.
   */
  protected createGroupLabelContentEl(key: GK, itemsInGroup: readonly T[]): HTMLElement | null {
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
   */
  protected replacePopupListItemElInDom(item: T): void {
    if (!this.isOpen) { return }
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
   * so the accessible name stays the plain label. For one-off rich content
   * (icons etc.) prefer the `createItemContentElFn` setting; override this only
   * to control the whole element (tag, extra wiring).
   *
   * @param item - the item value
   * @param index - index in `this.items`; used to build a stable id so
   *   `aria-activedescendant` can point to this element across re-renders.
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
      // Custom content fills the visuals only. The accessible name + search
      // text always come from itemToString, so pin aria-label to it: stays
      // consistent with the plain-text branch (textContent === itemToString)
      // and the caller never touches aria-* themselves.
      el.setAttribute('aria-label', this.itemToString(item))
      el.appendChild(content)
    }
    // No `title` attribute by default: items wrap (themes default), so the
    // full label is already visible and a tooltip is redundant. Adding
    // `title` would also fight third-party tooltip libraries (Tippy etc.).
    // Users who opt into ellipsis-on-items pick their own tooltip mechanism.
    if (this.isItemDisabled(item)) {
      // `aria-disabled` (never native `disabled`) keeps the item perceivable and
      // hoverable for a "why disabled" tooltip. No click handler -> not
      // selectable; keyboard nav skips it too.
      el.setAttribute('aria-disabled', 'true')
      el.classList.add(this.classIdMap.itemDisabledClass)
    } else {
      el.addEventListener('click', () => {
        // Move focus to the clicked item before activating it. Without this,
        // multi mode (which keeps the popup open) leaves the previous keyboard-
        // focused item highlighted while a different item was just clicked.
        this.setFocusedIndex(index)
        this.onItemClick(item)
      })
    }
    return el
  }

  /**
   * Map an item to its display string. The library calls this everywhere it
   * needs an item's text: list rows, the single trigger label, default filter.
   * - Default reads the `itemToStringFn` setting, else `String(item)`.
   * - Configure via `itemToStringFn` (no subclass needed).
   * - Override only when extending (a new select type); your override replaces
   *   the default. For HTML content, subclass `createItemEl`.
   */
  protected itemToString(item: T): string {
    return this.settings.itemToStringFn ? this.settings.itemToStringFn(item) : String(item)
  }

  /**
   * Item -> the visible content of its list row (icon + label etc.).
   * - Default reads `createItemContentElFn`, else `null` so `createItemEl` uses
   *   the plain-text default from `itemToString`.
   * - Override only when extending; for one-off rich content pass the setting.
   */
  protected createItemContentEl(item: T): HTMLElement | null {
    return this.settings.createItemContentElFn ? this.settings.createItemContentElFn(item) : null
  }

  /**
   * Whether `item` is disabled - by `itemDisabledFn`, or because its group is
   * disabled (`groupDisabledFn`). Group-disabled layers on top, so every
   * item-disabled behavior (no selection, keyboard skip, aria) covers grouped
   * items with no extra code. False when neither applies.
   */
  protected isItemDisabled(item: T): boolean {
    if (this.settings.itemDisabledFn && this.settings.itemDisabledFn(item)) { return true }
    const key = this.itemToGroupKey(item)
    return key !== null && this.isGroupDisabled(key)
  }

  /**
   * Map an item to its group key, or `null` when it belongs to no group.
   * - Default reads `itemToGroupKeyFn`, else `null` (grouping off).
   * - Override only when extending; configure via the setting.
   */
  protected itemToGroupKey(item: T): GK | null {
    return this.settings.itemToGroupKeyFn ? this.settings.itemToGroupKeyFn(item) : null
  }

  /**
   * Map a group key to its header display text.
   * - Default reads `groupKeyToLabelFn`, else `String(key)`.
   */
  protected groupKeyToLabel(key: GK): string {
    return this.settings.groupKeyToLabelFn ? this.settings.groupKeyToLabelFn(key) : String(key)
  }

  /** Whether the whole group `key` is disabled per `groupDisabledFn` (false when unset). */
  protected isGroupDisabled(key: GK): boolean {
    return this.settings.groupDisabledFn ? this.settings.groupDisabledFn(key) : false
  }

  /**
   * First enabled index scanning from `start` (inclusive) by `step` (+1 / -1).
   * Returns -1 if no enabled item lies in that direction. Used to skip disabled
   * items during keyboard nav and initial focus.
   */
  protected findNextEnabledIndex(start: number, step: number, list: readonly T[]): number {
    for (let i = start; i >= 0 && i < list.length; i += step) {
      if (!this.isItemDisabled(list[i]!)) { return i }
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
   */
  protected onItemClick(_item: T): void {}

  /**
   * Decide which item to focus when the popup opens. Default focuses the
   * first item (or no-op if the list is empty). Override to focus the
   * currently chosen item, last-used item, etc.
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
   */
  protected setFocusedIndex(index: number): void {
    const max = this.getVisibleItems().length - 1
    const clamped = Math.max(-1, Math.min(max, index))
    if (clamped === this.focusedIndex) { return }
    this.focusedIndex = clamped
    this.syncFocusedIndexToDom()
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
   */
  private captureWindowScroll(): () => void {
    const { scrollX, scrollY } = window
    const restore = (): void => {
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo(scrollX, scrollY)
      }
    }
    return (): void => {
      restore()
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(restore)
      }
    }
  }

  private attachOutsideClick(): void {
    const mode = this.settings.outsideClickBehavior
    if (mode === 'pass-through') {
      // mousedown fires before mouseup/click - feels snappier; we do not
      // preventDefault, so the outside click still triggers its own action.
      this.outsideHandler = (ev: Event) => {
        const t = ev.target
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
        const t = ev.target
        if (t instanceof Node && !this.rootEl.contains(t)) {
          ev.preventDefault()
        }
      }
      document.addEventListener('mousedown', this.blockMouseDownHandler, true)
      // capture phase so we run before the target's own listeners; swallow
      // the click so the underlying button/link/etc. does not fire.
      this.outsideHandler = (ev: Event) => {
        const t = ev.target
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
   * lost focus" so a future in-popup control - search input, checkbox - keeps
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
    const inText = ev.currentTarget === this.searchInputEl
    const action = getActionFromKey(ev, this.isOpen, inText)
    if (action === undefined) { return }
    ev.preventDefault()

    switch (action) {
      case LLSelectAction.Open:
        this.open()
        return
      case LLSelectAction.Close:
        // Esc two-stage while search is active: clear the filter first; only
        // close when the filter is already empty. Closing returns focus to
        // the trigger.
        if (this.searchActive && this.query !== '') {
          this.searchInputEl.value = ''
          this.handleSearchInputEvent()
          return
        }
        this.close()
        return
      case LLSelectAction.Select: {
        const list = this.getVisibleItems()
        if (this.focusedIndex >= 0 && this.focusedIndex < list.length) {
          const item = list[this.focusedIndex]!
          // Defensive: nav never lands on a disabled item, but guard anyway.
          if (!this.isItemDisabled(item)) { this.onItemClick(item) }
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
        const target = getUpdatedIndex(this.focusedIndex, list.length - 1, action)
        const found = this.findEnabledIndexForAction(target, action, list)
        if (found >= 0) { this.setFocusedIndex(found) }
        return
      }
    }
  }

  private createTriggerEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.triggerId
    el.className = this.classIdMap.triggerClass
    // Search active: trigger is a button that opens a popup containing a
    // combobox+listbox. Inactive: trigger is itself the combobox.
    el.setAttribute('role', this.searchActive ? 'button' : 'combobox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-haspopup', 'listbox')
    el.setAttribute('data-state', 'closed')
    el.setAttribute('data-disabled', 'false')
    // Child slots: content (text/tags), optional clear button, arrow. Clear and
    // arrow are own slots so they never collide with createTriggerContentElFn.
    const content = document.createElement('span')
    content.className = this.classIdMap.triggerContentClass
    el.append(content)
    if (this.settings.clearable) { el.append(this.createTriggerClearButtonEl()) }
    const arrow = document.createElement('span')
    arrow.className = this.classIdMap.triggerArrowClass
    el.append(arrow)
    return el
  }

  /**
   * Build the clear (x) button for the `clearable` trigger slot. The library owns
   * the button + its click (stops propagation so it never toggles the popup, then
   * `clearSelection`) + `aria-label` (text from `texts.triggerClearButtonAriaLabel`);
   * `createTriggerClearButtonContentElFn` optionally fills the icon,
   * else the theme's CSS glyph. The theme hides it via `data-empty` when empty.
   */
  protected createTriggerClearButtonEl(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.classIdMap.triggerClearButtonClass
    btn.tabIndex = -1
    btn.setAttribute('aria-label', this.settings.texts.triggerClearButtonAriaLabel)
    const icon = this.createTriggerClearButtonContentEl()
    if (icon !== null) { btn.appendChild(icon) }
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      this.clearSelection()
    })
    return btn
  }

  /**
   * Clear button's visible content (its x icon).
   * - Default reads `createTriggerClearButtonContentElFn`; `null` (setting
   *   unset, or returned) = no icon - the theme's CSS glyph draws the x.
   * - Override only when extending; for one-off icons pass the setting.
   */
  protected createTriggerClearButtonContentEl(): HTMLElement | SVGElement | null {
    return this.settings.createTriggerClearButtonContentElFn
      ? this.settings.createTriggerClearButtonContentElFn()
      : null
  }

  /**
   * Empty the selection (invoked by the clear button). Base is a no-op; single
   * clears to `undefined`, multiple to `[]`. Goes through the normal setters, so
   * `onChange` fires with the empty value.
   */
  protected clearSelection(): void {}

  /**
   * The search input lives inside the popup, above the listbox. Always built
   * (`hidden` when `searchable: false`) so a future runtime toggle is a CSS
   * flip rather than a DOM rebuild. See `docs/DESIGN.md`.
   */
  private createSearchInputEl(): HTMLInputElement {
    const el = document.createElement('input')
    el.type = 'text'
    el.id = this.classIdMap.searchInputId
    el.className = this.classIdMap.searchInputClass
    el.setAttribute('role', 'combobox')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-autocomplete', 'list')
    el.setAttribute('autocomplete', 'off')
    el.setAttribute('autocapitalize', 'off')
    el.setAttribute('spellcheck', 'false')
    // The input has no visible label; its accessible name is required.
    el.setAttribute('aria-label', this.settings.texts.searchInputAriaLabel)
    if (this.settings.texts.searchInputPlaceholder !== null) {
      el.placeholder = this.settings.texts.searchInputPlaceholder
    }
    return el
  }

  /**
   * Items currently displayed in the popup. Equals `items` when not
   * searchable or when no filter is active; equals the filtered subset when
   * the user has typed in the search input. Subclasses may read this when
   * they need the visible list (e.g. for selection-by-index). Returns the
   * LIVE internal array, typed read-only - never mutate it (see `getItems`).
   */
  protected getVisibleItems(): readonly T[] {
    return this.filteredItems ?? this.items
  }

  /**
   * Per-item match predicate for the search input.
   * - Default reads `filterFn`; else case-insensitive substring on
   *   `itemToString`.
   * - Override only when extending (subclass-wide custom matching); for a
   *   one-off match rule pass the setting.
   */
  protected matchesQuery(item: T, query: string): boolean {
    const fn = this.settings.filterFn
    if (fn) { return fn(item, query) }
    return this.itemToString(item).toLowerCase().includes(query.toLowerCase())
  }

  /**
   * Recompute `filteredItems` from the current `items` and `query`. Pure state
   * update: does NOT touch the DOM (the caller re-renders the list separately).
   * No-op when `searchable: false`; an empty query keeps every item. Called from
   * `open()`, from `setItems()`, and on each search-input event.
   */
  private recomputeFilteredItems(): void {
    if (!this.searchActive) { return }
    const q = this.query
    this.filteredItems = q === '' ? this.items.slice() : this.items.filter(it => this.matchesQuery(it, q))
  }

  /**
   * Input event on the search field: re-filter, re-render the list, move the
   * active option to the first match. IME composition is guarded - we wait
   * for `compositionend` and filter once with the composed text.
   */
  private handleSearchInputEvent(): void {
    if (this.composing) { return }
    this.query = this.searchInputEl.value
    this.recomputeFilteredItems()
    this.focusedIndex = -1
    this.renderPopupList()
    this.setFocusedIndex(0)
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
   * and its text comes from `texts.popupListNoResults`.
   */
  private createPopupListNoResultsEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupListNoResultsClass
    el.setAttribute('role', 'status')
    el.textContent = this.settings.texts.popupListNoResults
    el.hidden = true
    return el
  }

  /**
   * Mirror the visible-list-empty state onto the no-results message element
   * (`hidden` while there is at least one visible item).
   */
  private syncPopupListNoResultsToDom(): void {
    this.popupListNoResultsEl.hidden = this.getVisibleItems().length > 0
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
