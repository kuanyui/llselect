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
export type LLSelectArrowRenderer = (state: { isOpen: boolean }) => HTMLElement | SVGElement | null

/**
 * Resolved (defaults applied) settings shared by all select variants.
 * Subclasses (`LLSelectSingle`, `LLSelectMultiple`) extend this with their
 * mode-specific options such as `onChange`.
 */
export interface LLSelectBaseSettings<T> {
  /** Prefix used for every CSS class and DOM id the library generates. */
  cssClassPrefix: string
  /** Text shown in the trigger when nothing is selected. */
  placeholder: string
  /**
   * Equality predicate for item values. Required for non-primitive `T`
   * (the default uses `===`, which compares object references).
   */
  compareFn: (a: T, b: T) => boolean
  /** See {@link LLSelectOutsideClickBehavior}. */
  outsideClickBehavior: LLSelectOutsideClickBehavior
  /**
   * See {@link LLSelectArrowRenderer}. `null` (default) means the library
   * adds nothing to the arrow slot.
   */
  renderArrowFn: LLSelectArrowRenderer | null
  /**
   * Whether the popup includes a search input. `false` (default) keeps the
   * trigger as `role="combobox"` and the (always-built) input is `hidden`.
   * `true` makes the trigger `role="button"` and moves focus to the input on
   * open. See `docs/A11Y.md` and `docs/DESIGN.md`.
   */
  searchable: boolean
  /**
   * Predicate used by the search input. `null` (default) means the built-in
   * case-insensitive substring match against `templateItem(item)`. Pass a
   * custom function for fuzzy / domain-specific matching.
   */
  filterFn: ((item: T, query: string) => boolean) | null
  /**
   * How the popup decides its width. Does NOT affect the trigger - trigger
   * width is always whatever your CSS says.
   *
   * - `'match-trigger'` (default): popup width equals trigger width; long
   *   labels wrap inside the popup.
   * - `'fit-content'`: popup width grows to its own content (items, search
   *   input, ...). May be wider than trigger. Auto-shifts left and width-
   *   clamps when the natural width would overflow the viewport.
   */
  popupWidthPolicy: WidthPolicy
}

/**
 * Constructor-time settings input - every field is optional and missing
 * fields fall back to the library defaults.
 */
export type LLSelectBaseSettingsInput<T> = Partial<LLSelectBaseSettings<T>>

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
  /** Class on `popupEl` (the outer popup wrapper, no ARIA role). */
  popupClass: string
  /** Class on `popupListEl` (the inner element with `role="listbox"`). */
  popupListClass: string
  /** Class on every item element (`role="option"`) inside the popup list. */
  itemClass: string
  /**
   * Extra class added to the currently keyboard-focused item element.
   * Use this to style the focus highlight.
   */
  itemFocusedClass: string
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
const DEFAULT_PLACEHOLDER = 'Please select'

let instanceCounter = 0

function defaultCompareFn<T>(a: T, b: T): boolean {
  return a === b
}

function makeClassIdMap(prefix: string): LLSelectClassIdMap {
  const uniq = `${prefix}${++instanceCounter}`
  return {
    rootClass: `${prefix}-root`,
    triggerClass: `${prefix}-trigger`,
    triggerContentClass: `${prefix}-trigger-content`,
    triggerArrowClass: `${prefix}-trigger-arrow`,
    popupClass: `${prefix}-popup`,
    popupListClass: `${prefix}-popup-list`,
    itemClass: `${prefix}-item`,
    itemFocusedClass: `${prefix}-item-focused`,
    openClass: `${prefix}-open`,
    triggerId: `${uniq}-trigger`,
    popupListId: `${uniq}-popup-list`,
    searchInputClass: `${prefix}-search-input`,
    searchInputId: `${uniq}-search-input`,
  }
}

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
export abstract class LLSelectBase<T = unknown> {
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

  /** Resolved settings (defaults applied). */
  protected readonly settings: LLSelectBaseSettings<T>
  /** Current item list. Defensive copy of what `setItems` was given. */
  protected items: T[] = []
  /** Whether the popup is currently open. */
  protected isOpen = false
  /**
   * Index (into `items`) of the currently keyboard-focused item, or `-1`
   * when nothing is focused (closed popup, or no items).
   */
  protected focusedIndex = -1
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
   * navigation. Equals the search input when `searchable: true`, else the
   * trigger. Set once in the constructor.
   */
  private comboboxEl!: HTMLElement
  /**
   * Search input element. Always built into the popup DOM. When
   * `searchable: false` it is kept `hidden` and never wired up.
   */
  private searchInputEl!: HTMLInputElement
  private query = ''
  private filteredItems: T[] | undefined
  private composing = false

  /**
   * @param targetEl - mount element. Becomes `rootEl`; its existing children
   *   are wiped and replaced with the trigger + popup structure. Pre-set
   *   classes / id / data-* attributes on this element are preserved.
   * @param settings - optional partial settings. Missing fields use defaults
   *   ({@link LLSelectBaseSettings}).
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectBaseSettingsInput<T>) {
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: settings?.placeholder ?? DEFAULT_PLACEHOLDER,
      compareFn: settings?.compareFn ?? defaultCompareFn,
      outsideClickBehavior: settings?.outsideClickBehavior ?? 'pass-through',
      renderArrowFn: settings?.renderArrowFn ?? null,
      searchable: settings?.searchable ?? false,
      filterFn: settings?.filterFn ?? null,
      popupWidthPolicy: settings?.popupWidthPolicy ?? 'match-trigger',
    }
    this.classIdMap = makeClassIdMap(this.settings.cssClassPrefix)

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

    this.triggerEl = this.buildTriggerEl()
    this.triggerContentEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerContentClass}`) as HTMLElement
    this.triggerArrowEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerArrowClass}`) as HTMLElement

    this.popupEl = this.buildPopupEl()
    this.popupListEl = this.buildPopupListEl()
    this.searchInputEl = this.buildSearchInputEl()
    // input always built; non-searchable keeps it `hidden`. Search box must
    // sit above the listbox: listbox children must be options only.
    this.popupEl.append(this.searchInputEl, this.popupListEl)
    this.popupEl.hidden = true
    if (this.settings.searchable) {
      this.comboboxEl = this.searchInputEl
    } else {
      this.searchInputEl.hidden = true
      this.comboboxEl = this.triggerEl
    }
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
    if (this.settings.searchable) {
      this.searchInputEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
      this.searchInputEl.addEventListener('input', () => this.onSearchInput())
      this.searchInputEl.addEventListener('compositionstart', () => { this.composing = true })
      this.searchInputEl.addEventListener('compositionend', () => { this.composing = false; this.onSearchInput() })
    }
  }

  /**
   * Open the popup. Builds item elements lazily, attaches the positioner
   * (which auto-closes if the trigger is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the item list.
   * No-op if already open.
   */
  public open(): void {
    if (this.isOpen) { return }
    const restoreWindowScroll = this.captureWindowScroll()
    this.isOpen = true
    this.triggerEl.setAttribute('aria-expanded', 'true')
    this.triggerEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    if (this.settings.searchable) {
      this.query = ''
      this.searchInputEl.value = ''
      this.searchInputEl.setAttribute('aria-expanded', 'true')
      this.applyFilter()
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
    if (this.settings.searchable) {
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
    const shouldReturnFocus = this.settings.searchable && document.activeElement === this.searchInputEl
    this.isOpen = false
    this.triggerEl.setAttribute('aria-expanded', 'false')
    this.triggerEl.setAttribute('data-state', 'closed')
    this.rootEl.classList.remove(this.classIdMap.openClass)
    if (this.settings.searchable) {
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
    if (shouldReturnFocus) { this.triggerEl.focus({ preventScroll: true }) }
  }

  /**
   * Force a DOM re-render from current state. Use this when external code
   * mutates an item object's properties (e.g. `users[0].name = 'X'`) without
   * replacing the items array - the library has no way to detect that on
   * its own. Re-renders the trigger and (if open) the popup list. Does NOT
   * fire `onChange`, does NOT run `afterItemsChange`. Pure visual refresh.
   */
  public rerender(): void {
    this.renderTrigger()
    if (this.isOpen) { this.renderPopupList() }
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
   * Return the current item list. The returned array is read-only;
   * mutating it has no effect on the select.
   */
  public getItems(): readonly T[] {
    return this.items
  }

  /**
   * Replace the item list. The input is shallow-copied so external mutation
   * does not affect the select. If the popup is currently open it is
   * re-rendered; otherwise the DOM is built lazily on the next `open()`.
   * Subclasses may reconcile chosen-state via {@link afterItemsChange}
   * (e.g. single mode drops a chosen value that is no longer in the list).
   */
  public setItems(items: T[]): void {
    this.items = items.slice()
    if (this.settings.searchable) { this.applyFilter() }
    if (this.isOpen) { this.renderPopupList() }
    this.afterItemsChange()
  }

  /** Called once after the popup finishes opening. Default no-op. */
  protected onOpened(): void {}
  /** Called once after the popup finishes closing. Default no-op. */
  protected onClosed(): void {}
  /**
   * Called after `setItems` finishes. Override to reconcile state that
   * depends on the item list (e.g. clear a chosen value that disappeared).
   * Default no-op.
   */
  protected afterItemsChange(): void {}

  /**
   * Orchestrator that re-renders both the trigger's content slot and the
   * arrow slot. Subclasses normally override {@link renderTriggerContent},
   * not this. Call this from subclass code when both slots need to refresh
   * together (constructor, post-state-change, etc.).
   */
  protected renderTrigger(): void {
    this.renderTriggerContent()
    this.renderTriggerArrow()
  }

  /**
   * Write the trigger's content slot. Override in subclasses to display the
   * chosen value(s); default writes the placeholder. Always write to
   * `this.triggerContentEl` (not `this.triggerEl`) so the sibling arrow slot
   * is preserved.
   */
  protected renderTriggerContent(): void {
    this.triggerContentEl.textContent = this.settings.placeholder
  }

  private renderTriggerArrow(): void {
    this.triggerArrowEl.replaceChildren()
    const renderer = this.settings.renderArrowFn
    if (!renderer) { return }
    const el = renderer({ isOpen: this.isOpen })
    if (el) { this.triggerArrowEl.appendChild(el) }
  }

  /**
   * Rebuild the popup-list item elements from the current `items`. Called
   * by `open()` and by `setItems()` while open. Also clamps `focusedIndex`
   * if the item list shrank and re-applies focus visuals.
   */
  protected renderPopupList(): void {
    this.popupListEl.replaceChildren()
    this.itemEls = []
    this.focusedEl = undefined
    const list = this.visibleItems()
    for (let i = 0; i < list.length; i++) {
      const el = this.createItemEl(list[i]!, i)
      this.itemEls.push(el)
      this.popupListEl.append(el)
    }
    this.positioner?.reposition()
    // Clamp focused index if the visible list shrank, then re-apply visuals.
    if (this.focusedIndex >= list.length) {
      this.focusedIndex = list.length === 0 ? -1 : list.length - 1
    }
    this.applyFocus()
  }

  /**
   * Re-render a single item's element in place instead of rebuilding the
   * whole popup list. The DOM work is O(1) regardless of list size, so
   * flipping one selection in a 10k-item list does not recreate 10k nodes
   * (the lookup to find the item is O(n), but that is a cheap comparison
   * loop next to DOM mutation). No-op if the popup is closed or the item is
   * not in the current list. Used by multi-select toggle.
   */
  protected rerenderPopupListItem(item: T): void {
    if (!this.isOpen) { return }
    const list = this.visibleItems()
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
   * Build the DOM element for one item. Override if you need richer markup
   * (e.g. icons, descriptions, HTML). The base implementation sets `id`,
   * `role="option"`, a click handler, and writes `textContent` from
   * {@link templateItem}.
   *
   * @param item - the item value
   * @param index - index in `this.items`; used to build a stable id so
   *   `aria-activedescendant` can point to this element across re-renders.
   */
  protected createItemEl(item: T, index: number): HTMLElement {
    const el = document.createElement('div')
    el.id = `${this.classIdMap.triggerId}-item${index}`
    el.className = this.classIdMap.itemClass
    el.setAttribute('role', 'option')
    el.textContent = this.templateItem(item)
    // No `title` attribute by default: items wrap (themes default), so the
    // full label is already visible and a tooltip is redundant. Adding
    // `title` would also fight third-party tooltip libraries (Tippy etc.).
    // Users who opt into ellipsis-on-items pick their own tooltip mechanism.
    el.addEventListener('click', () => {
      // Move focus to the clicked item before activating it. Without this,
      // multi mode (which keeps the popup open) leaves the previous keyboard-
      // focused item highlighted while a different item was just clicked.
      this.setFocusedIndex(index)
      this.onItemClick(item)
    })
    return el
  }

  /**
   * Map an item value to its display label. Default is `String(item)`,
   * applied as `textContent` (HTML-safe). Override for custom formatting.
   * If you need real HTML output, override {@link createItemEl} instead
   * and treat XSS yourself.
   */
  protected templateItem(item: T): string {
    return String(item)
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
    if (this.visibleItems().length === 0) { return }
    this.setFocusedIndex(0)
  }

  /**
   * Move keyboard focus to the item at `index`. The value is clamped to
   * `[-1, items.length-1]`; pass `-1` to clear focus. Updates the focused
   * class, `aria-activedescendant`, and scrolls the item into view. No-op
   * if the clamped value equals the current focused index.
   */
  protected setFocusedIndex(index: number): void {
    const max = this.visibleItems().length - 1
    const clamped = Math.max(-1, Math.min(max, index))
    if (clamped === this.focusedIndex) { return }
    this.focusedIndex = clamped
    this.applyFocus()
  }

  private applyFocus(): void {
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
    const inText = ev.currentTarget === this.searchInputEl
    const action = getActionFromKey(ev, this.isOpen, inText)
    if (action === undefined) { return }
    ev.preventDefault()

    switch (action) {
      case LLSelectAction.Open:
        this.open()
        return
      case LLSelectAction.Close:
        // Esc two-stage when searchable: clear the filter first; only close
        // when the filter is already empty. Closing returns focus to trigger.
        if (this.settings.searchable && this.query !== '') {
          this.searchInputEl.value = ''
          this.onSearchInput()
          return
        }
        this.close()
        return
      case LLSelectAction.Select: {
        const list = this.visibleItems()
        if (this.focusedIndex >= 0 && this.focusedIndex < list.length) {
          this.onItemClick(list[this.focusedIndex]!)
        }
        return
      }
      case LLSelectAction.Next:
      case LLSelectAction.Previous:
      case LLSelectAction.GotoFirst:
      case LLSelectAction.GotoLast:
      case LLSelectAction.PageDown:
      case LLSelectAction.PageUp: {
        const list = this.visibleItems()
        if (list.length === 0) { return }
        const next = getUpdatedIndex(this.focusedIndex, list.length - 1, action)
        this.setFocusedIndex(next)
        return
      }
    }
  }

  private buildTriggerEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.triggerId
    el.className = this.classIdMap.triggerClass
    // Searchable: trigger is a button that opens a popup containing a
    // combobox+listbox. Non-searchable: trigger is itself the combobox.
    el.setAttribute('role', this.settings.searchable ? 'button' : 'combobox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-haspopup', 'listbox')
    el.setAttribute('data-state', 'closed')
    // Two child slots: content (text/tags) and arrow (optional icon).
    const content = document.createElement('span')
    content.className = this.classIdMap.triggerContentClass
    const arrow = document.createElement('span')
    arrow.className = this.classIdMap.triggerArrowClass
    el.append(content, arrow)
    return el
  }

  /**
   * The search input lives inside the popup, above the listbox. Always built
   * (`hidden` when `searchable: false`) so a future runtime toggle is a CSS
   * flip rather than a DOM rebuild. See `docs/DESIGN.md`.
   */
  private buildSearchInputEl(): HTMLInputElement {
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
    return el
  }

  /**
   * Items currently displayed in the popup. Equals `items` when not
   * searchable or when no filter is active; equals the filtered subset when
   * the user has typed in the search input. Subclasses may read this when
   * they need the visible list (e.g. for selection-by-index).
   */
  protected visibleItems(): T[] {
    return this.filteredItems ?? this.items
  }

  /**
   * Per-item match predicate for the search input. Uses `settings.filterFn`
   * when provided; otherwise case-insensitive substring on `templateItem`.
   */
  private matchesQuery(item: T, query: string): boolean {
    const fn = this.settings.filterFn
    if (fn) { return fn(item, query) }
    return this.templateItem(item).toLowerCase().includes(query.toLowerCase())
  }

  /**
   * Recompute `filteredItems` from current `items` and `query`. No-op when
   * `searchable: false` (filtering is never used).
   */
  private applyFilter(): void {
    if (!this.settings.searchable) { return }
    const q = this.query
    this.filteredItems = q === '' ? this.items.slice() : this.items.filter(it => this.matchesQuery(it, q))
  }

  /**
   * Input event on the search field: re-filter, re-render the list, move the
   * active option to the first match. IME composition is guarded - we wait
   * for `compositionend` and filter once with the composed text.
   */
  private onSearchInput(): void {
    if (this.composing) { return }
    this.query = this.searchInputEl.value
    this.applyFilter()
    this.focusedIndex = -1
    this.renderPopupList()
    this.setFocusedIndex(0)
  }

  /** Outer popup wrapper. No ARIA role; structural only. */
  private buildPopupEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupClass
    return el
  }

  /** Inner element with `role="listbox"`. Holds item children. */
  private buildPopupListEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.popupListId
    el.className = this.classIdMap.popupListClass
    el.setAttribute('role', 'listbox')
    el.setAttribute('tabindex', '-1')
    return el
  }
}
