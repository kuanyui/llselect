// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, options storage,
// keyboard navigation, and shared rendering primitives for LLSelectSingle and
// LLSelectMultiple. Subclasses own chosen-state and decide what happens on
// option click.

import { createPositioner, type Positioner } from './positioning.js'
import {
  LLSelectAction,
  ensureVisibleInScroll,
  getActionFromKey,
  getUpdatedIndex,
} from './keyboard.js'

/**
 * What happens when the user clicks outside an open listbox.
 *
 * - `'pass-through'` (default): close the listbox; the outside click still
 *   triggers its normal action (button click, link navigation, etc.).
 * - `'block'`: close the listbox only; the outside click is swallowed so no
 *   underlying handler or default action fires. Avoids accidental side
 *   effects when the user only intended to dismiss the dropdown.
 */
export type LLSelectOutsideClickBehavior = 'pass-through' | 'block'

/**
 * Function that produces the combobox's indicator element (e.g. a dropdown
 * arrow). Called by the library when the indicator may need to change -
 * including on every open/close - so the returned element can vary with
 * `isOpen`. Return `null` to render no indicator for that state.
 */
export type LLSelectIndicatorRenderer = (state: { isOpen: boolean }) => HTMLElement | SVGElement | null

/**
 * Resolved (defaults applied) settings shared by all select variants.
 * Subclasses (`LLSelectSingle`, `LLSelectMultiple`) extend this with their
 * mode-specific options such as `onChange`.
 */
export interface LLSelectBaseSettings<T> {
  /** Prefix used for every CSS class and DOM id the library generates. */
  cssClassPrefix: string
  /** Text shown in the combobox when nothing is selected. */
  placeholder: string
  /**
   * Equality predicate for option values. Required for non-primitive `T`
   * (the default uses `===`, which compares object references).
   */
  compareFn: (a: T, b: T) => boolean
  /** See {@link LLSelectOutsideClickBehavior}. */
  outsideClickBehavior: LLSelectOutsideClickBehavior
  /**
   * See {@link LLSelectIndicatorRenderer}. `null` (default) means the library
   * adds nothing to the indicator slot.
   */
  renderIndicator: LLSelectIndicatorRenderer | null
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
  /** Class on `comboboxEl` (the interactive trigger, `role="combobox"`). */
  comboboxClass: string
  /** Class on the inner span where content (text/tags) is rendered. */
  comboboxContentClass: string
  /** Class on the inner span where the optional indicator icon lives. */
  comboboxIndicatorClass: string
  /** Class on `listboxEl` (the popup, `role="listbox"`). */
  listboxClass: string
  /** Class on every option element (`role="option"`) inside the listbox. */
  optionClass: string
  /**
   * Extra class added to the currently keyboard-focused option element.
   * Use this to style the focus highlight.
   */
  optionFocusedClass: string
  /**
   * Class added to `rootEl` while the listbox is open. Use it as a CSS hook
   * for open-state styling (also available as `[data-state='open']` on the
   * combobox).
   */
  openClass: string
  /** DOM `id` of `comboboxEl`. Unique across instances. */
  comboboxId: string
  /**
   * DOM `id` of `listboxEl`. Unique across instances. Used by the combobox's
   * `aria-controls` attribute.
   */
  listboxId: string
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
    comboboxClass: `${prefix}-combobox`,
    comboboxContentClass: `${prefix}-combobox-content`,
    comboboxIndicatorClass: `${prefix}-combobox-indicator`,
    listboxClass: `${prefix}-listbox`,
    optionClass: `${prefix}-option`,
    optionFocusedClass: `${prefix}-option-focused`,
    openClass: `${prefix}-open`,
    comboboxId: `${uniq}-combobox`,
    listboxId: `${uniq}-popup`,
  }
}

/**
 * Abstract base for all select variants. Owns DOM scaffolding, ARIA wiring,
 * positioning, keyboard navigation, lazy listbox rendering, and outside-click
 * handling. Subclasses (`LLSelectSingle`, `LLSelectMultiple`) own
 * chosen-state, decide what happens on option click, and customise the
 * combobox text via `renderContent`.
 *
 * @typeParam T - option value type. Use `unknown` (default) only when you
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
  public readonly comboboxEl: HTMLElement
  /**
   * Inner span inside the combobox where text/tags are written.
   * Subclasses' `renderContent` writes here so the sibling indicator slot
   * is preserved across re-renders.
   */
  public readonly contentEl: HTMLElement
  /**
   * The popup element (`role="listbox"`). Hidden via the `hidden` attribute
   * when closed; positioned via inline styles by the positioner when open.
   * Lazily populated with option elements on open and cleared on close.
   */
  public readonly listboxEl: HTMLElement
  /** Resolved class names and ids for this instance. */
  public readonly classIdMap: LLSelectClassIdMap

  /** Resolved settings (defaults applied). */
  protected readonly settings: LLSelectBaseSettings<T>
  /** Current option list. Defensive copy of what `setOptions` was given. */
  protected options: T[] = []
  /** Whether the listbox is currently open. */
  protected isOpen = false
  /**
   * Index (into `options`) of the currently keyboard-focused option, or `-1`
   * when nothing is focused (closed listbox, or no options).
   */
  protected focusedIndex = -1
  private indicatorEl: HTMLElement
  private positioner: Positioner | undefined
  private optionEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined
  private outsideHandler: ((ev: Event) => void) | undefined

  /**
   * @param targetEl - mount element. Becomes `rootEl`; its existing children
   *   are wiped and replaced with the combobox + listbox structure. Pre-set
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
      renderIndicator: settings?.renderIndicator ?? null,
    }
    this.classIdMap = makeClassIdMap(this.settings.cssClassPrefix)

    // Caller-passed element becomes root (preserves its id / external refs).
    this.rootEl = targetEl
    this.rootEl.classList.add(this.classIdMap.rootClass)
    this.rootEl.replaceChildren()

    this.comboboxEl = this.buildComboboxEl()
    this.contentEl = this.comboboxEl.querySelector(`.${this.classIdMap.comboboxContentClass}`) as HTMLElement
    this.indicatorEl = this.comboboxEl.querySelector(`.${this.classIdMap.comboboxIndicatorClass}`) as HTMLElement
    this.listboxEl = this.buildListboxEl()
    this.listboxEl.hidden = true
    this.listboxEl.style.overflowY = 'auto'
    this.rootEl.append(this.comboboxEl, this.listboxEl)

    this.comboboxEl.addEventListener('click', () => this.toggle())
    this.comboboxEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
  }

  /**
   * Open the listbox. Builds option elements lazily, attaches the positioner
   * (which auto-closes if the combobox is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the option list.
   * No-op if already open.
   */
  public open(): void {
    if (this.isOpen) return
    this.isOpen = true
    this.comboboxEl.setAttribute('aria-expanded', 'true')
    this.comboboxEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    this.listboxEl.hidden = false
    this.refreshIndicator()
    this.renderListbox()
    this.positioner = createPositioner(this.comboboxEl, this.listboxEl, {
      onHide: () => this.close(),
    })
    this.attachOutsideClick()
    this.focusInitial()
    this.onOpened()
  }

  /**
   * Close the listbox. Detaches positioner and outside-click listener, clears
   * the option DOM, and resets focused-option state. No-op if already closed.
   */
  public close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.comboboxEl.setAttribute('aria-expanded', 'false')
    this.comboboxEl.setAttribute('data-state', 'closed')
    this.rootEl.classList.remove(this.classIdMap.openClass)
    this.positioner?.detach()
    this.positioner = undefined
    this.detachOutsideClick()
    this.listboxEl.replaceChildren()
    this.listboxEl.hidden = true
    this.optionEls = []
    this.focusedEl = undefined
    this.focusedIndex = -1
    this.comboboxEl.removeAttribute('aria-activedescendant')
    this.refreshIndicator()
    this.onClosed()
  }

  /** Open if closed, close if open. */
  public toggle(): void {
    if (this.isOpen) this.close()
    else this.open()
  }

  /**
   * Return the current option list. The returned array is read-only;
   * mutating it has no effect on the select.
   */
  public getOptions(): readonly T[] {
    return this.options
  }

  /**
   * Replace the option list. The input is shallow-copied so external mutation
   * does not affect the select. If the listbox is currently open it is
   * re-rendered; otherwise the DOM is built lazily on the next `open()`.
   * Subclasses may reconcile chosen-state via {@link afterOptionsChange}
   * (e.g. single mode drops a chosen value that is no longer in the list).
   */
  public setOptions(options: T[]): void {
    this.options = options.slice()
    if (this.isOpen) this.renderListbox()
    this.afterOptionsChange()
  }

  /** Called once after the listbox finishes opening. Default no-op. */
  protected onOpened(): void {}
  /** Called once after the listbox finishes closing. Default no-op. */
  protected onClosed(): void {}
  /**
   * Called after `setOptions` finishes. Override to reconcile state that
   * depends on the option list (e.g. clear a chosen value that disappeared).
   * Default no-op.
   */
  protected afterOptionsChange(): void {}

  /**
   * Orchestrator that re-renders both the combobox content slot and the
   * indicator slot. Subclasses normally override {@link renderContent}, not
   * this. Call this from subclass code when both slots need to refresh
   * together (constructor, post-state-change, etc.).
   */
  protected renderCombobox(): void {
    this.renderContent()
    this.refreshIndicator()
  }

  /**
   * Write the combobox's content slot. Override in subclasses to display the
   * chosen value(s); default writes the placeholder. Always write to
   * `this.contentEl` (not `this.comboboxEl`) so the sibling indicator slot
   * is preserved.
   */
  protected renderContent(): void {
    this.contentEl.textContent = this.settings.placeholder
  }

  private refreshIndicator(): void {
    this.indicatorEl.replaceChildren()
    const renderer = this.settings.renderIndicator
    if (!renderer) return
    const el = renderer({ isOpen: this.isOpen })
    if (el) this.indicatorEl.appendChild(el)
  }

  /**
   * Rebuild the listbox option elements from the current `options`. Called
   * by `open()` and by `setOptions()` while open. Also clamps `focusedIndex`
   * if the option list shrank and re-applies focus visuals.
   */
  protected renderListbox(): void {
    this.listboxEl.replaceChildren()
    this.optionEls = []
    this.focusedEl = undefined
    for (let i = 0; i < this.options.length; i++) {
      const el = this.createOptionEl(this.options[i]!, i)
      this.optionEls.push(el)
      this.listboxEl.append(el)
    }
    this.positioner?.reposition()
    // Clamp focused index if options shrank, then re-apply focus visuals.
    if (this.focusedIndex >= this.options.length) {
      this.focusedIndex = this.options.length === 0 ? -1 : this.options.length - 1
    }
    this.applyFocus()
  }

  /**
   * Build the DOM element for one option. Override if you need richer markup
   * (e.g. icons, descriptions, HTML). The base implementation sets `id`,
   * `role="option"`, a click handler, and writes `textContent` from
   * {@link templateOption}.
   *
   * @param option - the option value
   * @param index - index in `this.options`; used to build a stable id so
   *   `aria-activedescendant` can point to this element across re-renders.
   */
  protected createOptionEl(option: T, index: number): HTMLElement {
    const el = document.createElement('div')
    el.id = `${this.classIdMap.comboboxId}-opt${index}`
    el.className = this.classIdMap.optionClass
    el.setAttribute('role', 'option')
    el.textContent = this.templateOption(option)
    el.addEventListener('click', () => this.onOptionClick(option))
    return el
  }

  /**
   * Map an option value to its display label. Default is `String(option)`,
   * applied as `textContent` (HTML-safe). Override for custom formatting.
   * If you need real HTML output, override {@link createOptionEl} instead
   * and treat XSS yourself.
   */
  protected templateOption(option: T): string {
    return String(option)
  }

  /**
   * Called when an option is activated (click or keyboard select). Default
   * no-op; subclasses implement their selection behaviour (single mode picks
   * and closes, multiple mode toggles and keeps the listbox open).
   */
  protected onOptionClick(_option: T): void {}

  /**
   * Decide which option to focus when the listbox opens. Default focuses
   * the first option (or no-op if the list is empty). Override to focus the
   * currently chosen option, last-used option, etc.
   */
  protected focusInitial(): void {
    if (this.options.length === 0) return
    this.setFocusedIndex(0)
  }

  /**
   * Move keyboard focus to the option at `index`. The value is clamped to
   * `[-1, options.length-1]`; pass `-1` to clear focus. Updates the focused
   * class, `aria-activedescendant`, and scrolls the option into view. No-op
   * if the clamped value equals the current focused index.
   */
  protected setFocusedIndex(index: number): void {
    const max = this.options.length - 1
    const clamped = Math.max(-1, Math.min(max, index))
    if (clamped === this.focusedIndex) return
    this.focusedIndex = clamped
    this.applyFocus()
  }

  private applyFocus(): void {
    if (this.focusedEl) {
      this.focusedEl.classList.remove(this.classIdMap.optionFocusedClass)
      this.focusedEl = undefined
    }
    const i = this.focusedIndex
    if (i >= 0 && i < this.optionEls.length) {
      const el = this.optionEls[i]!
      el.classList.add(this.classIdMap.optionFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', el.id)
      this.focusedEl = el
      ensureVisibleInScroll(el, this.listboxEl)
    } else {
      this.comboboxEl.removeAttribute('aria-activedescendant')
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
    if (!this.outsideHandler) return
    if (this.settings.outsideClickBehavior === 'pass-through') {
      document.removeEventListener('mousedown', this.outsideHandler)
    } else {
      document.removeEventListener('click', this.outsideHandler, true)
    }
    this.outsideHandler = undefined
  }

  private handleKeydown(ev: KeyboardEvent): void {
    const action = getActionFromKey(ev, this.isOpen)
    if (action === undefined) return
    ev.preventDefault()

    switch (action) {
      case LLSelectAction.Open:
        this.open()
        return
      case LLSelectAction.Close:
        this.close()
        return
      case LLSelectAction.Select:
        if (this.focusedIndex >= 0 && this.focusedIndex < this.options.length) {
          this.onOptionClick(this.options[this.focusedIndex]!)
        }
        return
      case LLSelectAction.Next:
      case LLSelectAction.Previous:
      case LLSelectAction.GotoFirst:
      case LLSelectAction.GotoLast:
      case LLSelectAction.PageDown:
      case LLSelectAction.PageUp: {
        if (this.options.length === 0) return
        const next = getUpdatedIndex(this.focusedIndex, this.options.length - 1, action)
        this.setFocusedIndex(next)
        return
      }
    }
  }

  private buildComboboxEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.comboboxId
    el.className = this.classIdMap.comboboxClass
    el.setAttribute('role', 'combobox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-controls', this.classIdMap.listboxId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-haspopup', 'listbox')
    el.setAttribute('data-state', 'closed')
    // Two child slots: content (text/tags) and indicator (optional icon).
    const content = document.createElement('span')
    content.className = this.classIdMap.comboboxContentClass
    const indicator = document.createElement('span')
    indicator.className = this.classIdMap.comboboxIndicatorClass
    el.append(content, indicator)
    return el
  }

  private buildListboxEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.listboxId
    el.className = this.classIdMap.listboxClass
    el.setAttribute('role', 'listbox')
    el.setAttribute('tabindex', '-1')
    return el
  }
}
