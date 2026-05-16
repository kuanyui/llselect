// LLSelectBase: DOM scaffold + ARIA wiring shared by LLSelectSingle and
// LLSelectMultiple. Holds no chosen-state, no open/close, no option rendering.
// Those land in subclasses and later phases.

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

  constructor(targetEl: HTMLElement, settings?: LLSelectBaseSettingsInput<T>) {
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: settings?.placeholder ?? DEFAULT_PLACEHOLDER,
      compareFn: settings?.compareFn ?? defaultCompareFn,
    }
    this.classIdMap = makeClassIdMap(this.settings.cssClassPrefix)

    // Strategy: keep the caller's element as root (preserves their id/refs);
    // wipe its content and inject combobox + listbox children.
    this.rootEl = targetEl
    this.rootEl.classList.add(this.classIdMap.rootClass)
    this.rootEl.replaceChildren()

    this.comboboxEl = this.buildComboboxEl()
    this.listboxEl = this.buildListboxEl()
    this.rootEl.append(this.comboboxEl, this.listboxEl)
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
