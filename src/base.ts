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

export type LLSelectOutsideClickBehavior = 'pass-through' | 'block'

// Called by the library to produce the combobox's indicator element (e.g. a
// chevron arrow). Receives the current open/closed state so the renderer may
// return different elements per state. Return null to render nothing.
export type LLSelectIndicatorRenderer = (state: { isOpen: boolean }) => HTMLElement | SVGElement | null

export interface LLSelectBaseSettings<T> {
  cssClassPrefix: string
  placeholder: string
  compareFn: (a: T, b: T) => boolean
  // When the listbox is open and the user clicks outside the select:
  // - 'pass-through' (default): close the listbox; the outside click still
  //   triggers its normal action (button click, link, etc.).
  // - 'block': close the listbox only; the outside click is blocked so no
  //   underlying handlers / navigation fire. Avoids accidental side effects
  //   when the user only intended to close the dropdown.
  outsideClickBehavior: LLSelectOutsideClickBehavior
  // Optional renderer for the combobox's indicator slot (e.g. dropdown arrow).
  // null (default) means no indicator. The library re-invokes this when open
  // state changes so the returned element can vary with isOpen.
  renderIndicator: LLSelectIndicatorRenderer | null
}

export type LLSelectBaseSettingsInput<T> = Partial<LLSelectBaseSettings<T>>

export interface LLSelectClassIdMap {
  rootClass: string
  comboboxClass: string
  comboboxContentClass: string
  comboboxIndicatorClass: string
  listboxClass: string
  optionClass: string
  optionFocusedClass: string
  openClass: string
  comboboxId: string
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

export abstract class LLSelectBase<T = unknown> {
  public readonly rootEl: HTMLElement
  public readonly comboboxEl: HTMLElement
  public readonly contentEl: HTMLElement
  public readonly listboxEl: HTMLElement
  public readonly classIdMap: LLSelectClassIdMap

  protected readonly settings: LLSelectBaseSettings<T>
  protected options: T[] = []
  protected isOpen = false
  protected focusedIndex = -1
  private indicatorEl: HTMLElement
  private positioner: Positioner | undefined
  private optionEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined
  private outsideHandler: ((ev: Event) => void) | undefined

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

  public toggle(): void {
    if (this.isOpen) this.close()
    else this.open()
  }

  public getOptions(): readonly T[] {
    return this.options
  }

  public setOptions(options: T[]): void {
    this.options = options.slice()
    if (this.isOpen) this.renderListbox()
    this.afterOptionsChange()
  }

  // Subclass hooks. Default no-op so base remains instantiable in tests.
  protected onOpened(): void {}
  protected onClosed(): void {}
  protected afterOptionsChange(): void {}

  // Orchestrator: writes content slot then refreshes the indicator slot.
  // Subclasses override `renderContent`, not this.
  protected renderCombobox(): void {
    this.renderContent()
    this.refreshIndicator()
  }

  // Subclass overrides this to write the combobox text. Writes to contentEl
  // so the sibling indicator slot is preserved.
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

  protected createOptionEl(option: T, index: number): HTMLElement {
    const el = document.createElement('div')
    el.id = `${this.classIdMap.comboboxId}-opt${index}`
    el.className = this.classIdMap.optionClass
    el.setAttribute('role', 'option')
    el.textContent = this.templateOption(option)
    el.addEventListener('click', () => this.onOptionClick(option))
    return el
  }

  // Override to change the rendered label for an option. Returned text is
  // applied as textContent (safe). Subclass `createOptionEl` if HTML is needed.
  protected templateOption(option: T): string {
    return String(option)
  }

  protected onOptionClick(_option: T): void {}

  // First focused option when the listbox opens. Override in subclass (e.g.
  // single mode focuses the chosen option if any).
  protected focusInitial(): void {
    if (this.options.length === 0) return
    this.setFocusedIndex(0)
  }

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
