// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, item storage,
// keyboard navigation, and shared rendering primitives for LLSelectSingle and
// LLSelectMultiple. Subclasses own chosen-state and decide what happens on
// item click.

import { createPositioner, type Positioner } from './positioning.js'
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
  renderArrow: LLSelectArrowRenderer | null
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
      renderArrow: settings?.renderArrow ?? null,
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
    this.popupEl.append(this.popupListEl)
    this.popupEl.hidden = true
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
  }

  /**
   * Open the popup. Builds item elements lazily, attaches the positioner
   * (which auto-closes if the trigger is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the item list.
   * No-op if already open.
   */
  public open(): void {
    if (this.isOpen) { return }
    this.isOpen = true
    this.triggerEl.setAttribute('aria-expanded', 'true')
    this.triggerEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    // Layout (flex column) is applied only while open. Setting display
    // inline at construction would override the `[hidden]` UA rule and
    // leak the popup before first open.
    this.popupEl.style.display = 'flex'
    this.popupEl.style.flexDirection = 'column'
    this.popupEl.hidden = false
    this.refreshTriggerArrow()
    this.renderPopupList()
    this.positioner = createPositioner(this.triggerEl, this.popupEl, {
      onHide: () => this.close(),
    })
    this.attachOutsideClick()
    this.focusInitial()
    this.onOpened()
  }

  /**
   * Close the popup. Detaches positioner and outside-click listener, clears
   * the item DOM, and resets focused-item state. No-op if already closed.
   */
  public close(): void {
    if (!this.isOpen) { return }
    this.isOpen = false
    this.triggerEl.setAttribute('aria-expanded', 'false')
    this.triggerEl.setAttribute('data-state', 'closed')
    this.rootEl.classList.remove(this.classIdMap.openClass)
    this.positioner?.detach()
    this.positioner = undefined
    this.detachOutsideClick()
    this.popupListEl.replaceChildren()
    this.popupEl.hidden = true
    // Clear inline display so the `[hidden]` UA rule can hide the popup.
    this.popupEl.style.display = ''
    this.popupEl.style.flexDirection = ''
    this.itemEls = []
    this.focusedEl = undefined
    this.focusedIndex = -1
    this.triggerEl.removeAttribute('aria-activedescendant')
    this.refreshTriggerArrow()
    this.onClosed()
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
    this.refreshTriggerArrow()
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

  private refreshTriggerArrow(): void {
    this.triggerArrowEl.replaceChildren()
    const renderer = this.settings.renderArrow
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
    for (let i = 0; i < this.items.length; i++) {
      const el = this.createItemEl(this.items[i]!, i)
      this.itemEls.push(el)
      this.popupListEl.append(el)
    }
    this.positioner?.reposition()
    // Clamp focused index if items shrank, then re-apply focus visuals.
    if (this.focusedIndex >= this.items.length) {
      this.focusedIndex = this.items.length === 0 ? -1 : this.items.length - 1
    }
    this.applyFocus()
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
    if (this.items.length === 0) { return }
    this.setFocusedIndex(0)
  }

  /**
   * Move keyboard focus to the item at `index`. The value is clamped to
   * `[-1, items.length-1]`; pass `-1` to clear focus. Updates the focused
   * class, `aria-activedescendant`, and scrolls the item into view. No-op
   * if the clamped value equals the current focused index.
   */
  protected setFocusedIndex(index: number): void {
    const max = this.items.length - 1
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
      this.triggerEl.setAttribute('aria-activedescendant', el.id)
      this.focusedEl = el
      ensureVisibleInScroll(el, this.popupListEl)
    } else {
      this.triggerEl.removeAttribute('aria-activedescendant')
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
    if (!this.outsideHandler) { return }
    if (this.settings.outsideClickBehavior === 'pass-through') {
      document.removeEventListener('mousedown', this.outsideHandler)
    } else {
      document.removeEventListener('click', this.outsideHandler, true)
    }
    this.outsideHandler = undefined
  }

  private handleKeydown(ev: KeyboardEvent): void {
    const action = getActionFromKey(ev, this.isOpen)
    if (action === undefined) { return }
    ev.preventDefault()

    switch (action) {
      case LLSelectAction.Open:
        this.open()
        return
      case LLSelectAction.Close:
        this.close()
        return
      case LLSelectAction.Select:
        if (this.focusedIndex >= 0 && this.focusedIndex < this.items.length) {
          this.onItemClick(this.items[this.focusedIndex]!)
        }
        return
      case LLSelectAction.Next:
      case LLSelectAction.Previous:
      case LLSelectAction.GotoFirst:
      case LLSelectAction.GotoLast:
      case LLSelectAction.PageDown:
      case LLSelectAction.PageUp: {
        if (this.items.length === 0) { return }
        const next = getUpdatedIndex(this.focusedIndex, this.items.length - 1, action)
        this.setFocusedIndex(next)
        return
      }
    }
  }

  private buildTriggerEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.triggerId
    el.className = this.classIdMap.triggerClass
    el.setAttribute('role', 'combobox')
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
