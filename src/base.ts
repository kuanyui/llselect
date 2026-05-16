// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, options storage,
// and shared rendering primitives for LLSelectSingle and LLSelectMultiple.
// Subclasses own chosen-state and decide what happens on option click.

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
    this.rootEl.append(this.comboboxEl, this.listboxEl)

    this.comboboxEl.addEventListener('click', () => this.toggle())
  }

  public open(): void {
    if (this.isOpen) return
    this.isOpen = true
    this.comboboxEl.setAttribute('aria-expanded', 'true')
    this.rootEl.classList.add(this.classIdMap.openClass)
    this.onOpened()
  }

  public close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.comboboxEl.setAttribute('aria-expanded', 'false')
    this.rootEl.classList.remove(this.classIdMap.openClass)
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
    this.renderListbox()
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
    for (const option of this.options) {
      this.listboxEl.append(this.createOptionEl(option))
    }
  }

  protected createOptionEl(option: T): HTMLElement {
    const el = document.createElement('div')
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
