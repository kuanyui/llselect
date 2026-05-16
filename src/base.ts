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

export interface LLSelectBaseSettings<T> {
  cssClassPrefix: string
  placeholder: string
  compareFn: (a: T, b: T) => boolean
}

export type LLSelectBaseSettingsInput<T> = Partial<LLSelectBaseSettings<T>>

export interface LLSelectClassIdMap {
  rootClass: string
  comboboxClass: string
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
  public readonly listboxEl: HTMLElement
  public readonly classIdMap: LLSelectClassIdMap

  protected readonly settings: LLSelectBaseSettings<T>
  protected options: T[] = []
  protected isOpen = false
  protected focusedIndex = -1
  private positioner: Positioner | undefined
  private optionEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectBaseSettingsInput<T>) {
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: settings?.placeholder ?? DEFAULT_PLACEHOLDER,
      compareFn: settings?.compareFn ?? defaultCompareFn,
    }
    this.classIdMap = makeClassIdMap(this.settings.cssClassPrefix)

    // Caller-passed element becomes root (preserves its id / external refs).
    this.rootEl = targetEl
    this.rootEl.classList.add(this.classIdMap.rootClass)
    this.rootEl.replaceChildren()

    this.comboboxEl = this.buildComboboxEl()
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
    this.rootEl.classList.add(this.classIdMap.openClass)
    this.listboxEl.hidden = false
    this.renderListbox()
    this.positioner = createPositioner(this.comboboxEl, this.listboxEl)
    this.focusInitial()
    this.onOpened()
  }

  public close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.comboboxEl.setAttribute('aria-expanded', 'false')
    this.rootEl.classList.remove(this.classIdMap.openClass)
    this.positioner?.detach()
    this.positioner = undefined
    this.listboxEl.replaceChildren()
    this.listboxEl.hidden = true
    this.optionEls = []
    this.focusedEl = undefined
    this.focusedIndex = -1
    this.comboboxEl.removeAttribute('aria-activedescendant')
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

  protected renderCombobox(): void {
    this.comboboxEl.textContent = this.settings.placeholder
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
