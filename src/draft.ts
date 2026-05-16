/*
- Lazy rendering or options list.

 */


export type llselect_mode_t = 'single' | 'multiple'

export interface LLSelectSettings<T = any> {
  /** Default is `llselect` */
  cssClassPrefix: string
  /** Show when nothing selected */
  placeholder: string
  /**
   * - `single` mode: only one option can be selected. (the length of chosenOptions)
   * - `multiple` mode: multiple options can be selected, and options list will not close after clicking on option.
   */
  mode: llselect_mode_t
  /**
   * - By default, compareFn is (a, b) => a === b
   * - If you want to compare object, you should specify your deep-equal function.
   */
  compareFn: (a: T, b: T) => boolean
  /**
   * - If specify, filter box will be enabled.
   * - Option is showed when return true.
  */
  filterFn?: (x: T) => boolean
}

/**
 - You should inherit this interface if you want to add extra attributes for
   rendering (ex: icon, image, description... etc)
 - Reference: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-grouped/
 - Expected HTML structure:
 ```pug
 div(role="listbox")
   ul(role="group" aria-labelledby="GROUP_A")
     li(role="presentation" id="GROUP_A") Group A
     li(role="option" id="OPTION1") Option 1
     li(role="option" id="OPTION2") Option 2
     li(role="option" id="OPTION3") Option 3
   ul(role="group" aria-labelledby="GROUP_B")
     li(role="presentation" id="GROUP_B") Group B
     li(role="option" id="OPTION4") Option 4
     li(role="option" id="OPTION5") Option 5
 ```
 */
export interface LLSelectOptgroup<T = any> {
  /** This is used by default, you can also ignore this if you want to define
   * your template function. */
  optgroupLabel?: string
  optgroupChildren: T[]
}

interface LLSelectKlsMap {
  rootClass: string
  comboboxClass: string
  listboxClass: string
  optionClass: string
  /**
   * - Identifies the element that serves as the select (combobox / aria-combobox).
   * - User should label the combobox via this ID manually (and remember to trigger `comboboxEl.focus()` when click the label.)
   **/
  comboboxId: string
  /**
   * - Identifies the element that serves as the popup (candidate list / aria-listbox).
   * - User should label the listbox via this ID manually.
   **/
  listboxId: string
}

enum LLSelectActions {
  Close,
  CloseSelect,
  GotoFirstItem,
  GotoLastItem,
  Next,
  Open,
  PageDown,
  PageUp,
  Previous,
  Select,
  TypeChar,
}

// None Selected
const SVG_CHECKBOX_BLANK_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>checkbox-blank-outline</title><path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z" /></svg>`
const SVG_CHECKBOX_BLANK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>checkbox-blank</title><path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z" /></svg>`

// Partial selected
const SVG_MINUS_BOX_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>minus-box-outline</title><path d="M19,19V5H5V19H19M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5C3,3.89 3.9,3 5,3H19M17,11V13H7V11H17Z" /></svg>`
const SVG_MINUS_BOX = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>minus-box</title><path d="M17,13H7V11H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z" /></svg>`

// All Selected
const SVG_CHECKBOX_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>checkbox-outline</title><path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,5V19H5V5H19M10,17L6,13L7.41,11.58L10,14.17L16.59,7.58L18,9" /></svg>`
const SVG_CHECKBOX_MARKED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>checkbox-marked</title><path d="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z" /></svg>`

let _LL_ID = 0
function genRootId (cssClassPrefix: string) {
  return `${cssClassPrefix}${++_LL_ID}`
}

/**
 * ensure a given child element is within the parent's visible scroll area.
 * if the child is not visible, scroll the parent
 **/
function maintainScrollVisibility (activeElement: HTMLElement, scrollParent: HTMLElement) {
  const { offsetHeight, offsetTop } = activeElement
  const { offsetHeight: parentOffsetHeight, scrollTop } = scrollParent
  const isAbove = offsetTop < scrollTop
  const isBelow = offsetTop + offsetHeight > scrollTop + parentOffsetHeight
  if (isAbove) {
    scrollParent.scrollTo(0, offsetTop)
  } else if (isBelow) {
    scrollParent.scrollTo(0, offsetTop - parentOffsetHeight + offsetHeight)
  }
}


export class LLSelect<T = any, G extends LLSelectOptgroup<T> = any> {
  // Element Refs
  public readonly rootEl: HTMLElement
  public readonly comboboxEl: HTMLElement
  public readonly listboxEl: HTMLElement

  // State
  protected isListboxOpened: boolean = false
  protected currentFocusedIndex: number = -1
  protected currentChosenOptions: T[] = []
  protected searchText: string = ''

  protected _optgroupIndex: number = 0

  // Data
  protected rawOptions: Array<T | G> = []
  /** flatted */
  protected options: T[] = []
  protected readonly rootId: string
  public readonly classIdMap: LLSelectKlsMap  // TODO: public?
  protected settings: LLSelectSettings<T> = {
    cssClassPrefix: 'llselect',
    placeholder: 'Please select',
    mode: 'single',
    compareFn: (a: T, b: T) => a === b,
  }
  public constructor (targetElement: HTMLElement, settings?: LLSelectSettings<T>) {
    Object.assign(this.settings, settings)
    this.rootId = genRootId(this.settings.cssClassPrefix)
    this.classIdMap = this._mkClassIdMap()
    targetElement.outerHTML = this.templateRoot()
    this.rootEl = targetElement
    this.comboboxEl = this.rootEl.querySelector('[role=combobox]')!
    this.listboxEl = this.rootEl.querySelector('[role=listbox]')!
  }
  private _mkClassIdMap (): LLSelectKlsMap {
    const cssClassPrefix = this.settings.cssClassPrefix
    const rootUniqId = this.rootId
    return {
      rootClass: `${cssClassPrefix}-root`,
      comboboxClass: `${cssClassPrefix}-combobox`,
      listboxClass: `${cssClassPrefix}-listbox`,
      optionClass: `${cssClassPrefix}-option`,
      comboboxId: `${rootUniqId}-combobox`,
      listboxId: `${rootUniqId}-popup`,
    }
  }
  /** Mainly for <div role="combobox" aria-activedescendant="OPTION_EL_ID"> */
  protected getOptionElId (optionIndex: number): string {
    return `${this.rootId}-option${optionIndex}`
  }
  protected generateOptgroupElId (): string {
    const optgroupIndex = this._optgroupIndex++
    return `${this.rootId}-optgroup${optgroupIndex}`
  }

  protected templateRoot (): string {
    const m = this.classIdMap
    return `
<div class="${m.rootClass}">
  <div id="${m.comboboxId}" class="${m.comboboxClass}" role="combobox" tabindex="0"
       aria-controls="${m.listboxId}"
       aria-expanded="false"
       aria-haspopup="listbox" ></div>
  <div id="${m.listboxId}" class="${m.listboxClass}" role="listbox" tabindex="-1">
  </div>
</div>
    `
  }
  /** The HTML template for displaying currently chosen options. Roughly equal to HTML's `<select>`. */
  protected templateCombobox (chosenOptions: T[],): string {
    if (this.settings.mode === 'single') {
      return `<div>${chosenOptions}</div>`
    } else {
      if (chosenOptions.length === 0) {
        return `<div>None selected</div>`
      } else if (chosenOptions.length === this.options.length) {
        return `<div>All selected</div>`
      } else {
        return `<div>${chosenOptions.length} selected</div>`
      }
    }
  }
  /**
   * - only used when `optgroup` is enabled.
   * - Should return:
   *     - role="group" (act as `<optgroup>`)
   *     - role="presentation" (the label of optgroup)
   * - Should not return `role="option"` because they are appended dynamically.
   * */
  protected templateOptgroup (group: G): string {
    const gid = this.generateOptgroupElId()
    return `
    <div role="group" aria-labelledby="${gid}">
      <div role="presentation" id="${gid}"> ${group.optgroupLabel} </div>
    </div>
    `
  }
  /** The HTML template displayed as option in options dropdown list. Roughly equal to HTML's `<option>`. */
  protected templateOption (option: T): string {
    if (this.settings.mode === 'single') {
      return `<div>${option}</div>`
    } else {
      const isChosen = this.isOptionChosen(option)
      const iconHtml = isChosen ? '<i aria-hidden="true" class="mdi mdi-checkbox-outline"></i>' : '<i aria-hidden="true" class="mdi mdi-checkbox-blank-outline"></i>'
      return `<div>${iconHtml} ${option}</div>`
    }
  }
  /** (Only usable when `mode` is `multiple`) The HTML template displayed as "Toggle All" option in options dropdown list. */
  protected templateOptionToggleAll (): string {
    if (this.settings.mode === 'single') {
      return ''
    }
    let iconHtml = ''
    if (this.currentChosenOptions.length === 0) {
      iconHtml = `<i aria-hidden="true" class="mdi mdi-checkbox-blank-outline"></i>`
    } else if (this.currentChosenOptions.length === this.options.length) {
      iconHtml = `<i aria-hidden="true" class="mdi mdi-checkbox-outline"></i>`
    } else {
      iconHtml = `<i aria-hidden="true" class="mdi mdi-minus-box-outline"></i>`
    }
    return `<div>${iconHtml} Select all</div>`
  }
  public isOptionChosen (option: T): boolean {
    return this.options.find(x => this.settings.compareFn(x, option)) !== undefined
  }
  public getChosenOptions (): T[] {
    return this.currentChosenOptions
  }
  /** Returns -1 if the value is invalid (cannot found in options). */
  public setChosenOptions (options: T[]): boolean {
    this.currentChosenOptions = options
  }
  public toggleOption (option: T): boolean {
    if (this.settings.mode === 'single') {
      this.currentChosenOptions.length = 0
      this.currentChosenOptions.push(option)
    } else {
      const idx = this.currentChosenOptions.findIndex(x => this.settings.compareFn(x, option))
      if (idx === -1) {
        this.currentChosenOptions.push(option)
      } else {
        this.currentChosenOptions.splice(idx, 1)
      }
    }
    this.renderCombobox()
    return true
  }
  public getOptions (): T[] {
    return this.options
  }
  public setOptions (options: T[]) {
    this.options = options
    this.renderListbox()
  }
  protected createOptionElement (option: T): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.optionClass
    el.role = 'option'
    const cb = () => { this.toggleOption(option) }
    el.onclick = cb
    const html = this.templateOption(option, this)
    el.innerHTML = html
    return el
  }
  public renderCombobox () {
    this.comboboxEl.innerHTML = this.templateCombobox(this.currentChosenOptions, this)
  }
  public renderListbox () {
    if (!this.isListboxOpened) {
      this.listboxEl.innerHTML = ''
    }
    const optionEls: HTMLElement[] = []
    for (const option of this.options) {
      optionEls.push(this.createOptionElement(option))
    }
    this.listboxEl.innerHTML = ''
    this.listboxEl.append(...optionEls)
  }
  // ==================================================================
  // ARIA
  // ==================================================================
  private onComboboxBlur () {
    this.isListboxOpened = false
    this.renderListbox()
  }
  private onComboboxClick () {
    this.isListboxOpened = !this.isListboxOpened
    this.renderListbox()
  }
  private updateMenuState (toOpenListbox: boolean, toFocusComboEl: boolean) {
    if (this.isListboxOpened === toOpenListbox) { return }
    this.isListboxOpened = toOpenListbox

    this.comboboxEl.setAttribute('aria-expanded', `${toOpenListbox}`)
    toOpenListbox ? this.rootEl.classList.add('open') : this.rootEl.classList.remove('open')

    const focusedOptionID = toOpenListbox ? this.getOptionElId(this.currentFocusedIndex) : ''
    this.comboboxEl.setAttribute('aria-activedescendant', focusedOptionID)
    if (focusedOptionID === '' && !isElementInView(this.comboboxEl)) {
      this.comboboxEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (toFocusComboEl) { this.comboboxEl.focus() }
  }
  private onOptionChange (newIndex: number) {
    this.currentFocusedIndex = newIndex
    const focusedOptionID = this.getOptionElId(newIndex)
    this.comboboxEl.setAttribute('aria-activedescendant', focusedOptionID)
    const focusedOptionEl = document.getElementById(focusedOptionID)
    if (focusedOptionEl && !isElementInView(focusedOptionEl)) {
      focusedOptionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
  private onComboboxKeydown (event: KeyboardEvent) {
    const key = event.key
    const max = this.options.length - 1
    const action = this.getActionFromKey(event)
    switch (action) {
      case LLSelectActions.GotoLastItem:
      case LLSelectActions.GotoFirstItem:
        this.updateMenuState(true, true)
      // intentional fallthrough
      case LLSelectActions.Next:
      case LLSelectActions.Previous:
      case LLSelectActions.PageUp:
      case LLSelectActions.PageDown:
        event.preventDefault()
        return this.onOptionChange(
          getUpdatedIndex(this.activeIndex, max, action)
        )
      case LLSelectActions.CloseSelect:
        event.preventDefault()
        this.selectOption(this.activeIndex)
      // intentional fallthrough
      case LLSelectActions.Close:
        event.preventDefault()
        return this.updateMenuState(false, true)
      case LLSelectActions.TypeChar:
        return this.onComboType(key)
      case LLSelectActions.Open:
        event.preventDefault()
        return this.updateMenuState(true, true)
    }
  }
  private getActionFromKey (ev: KeyboardEvent): LLSelectActions | undefined {
    const { key, altKey, ctrlKey, metaKey } = ev
    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' '] // all keys that will do the default open action
    // handle opening when closed
    if (!this.isListboxOpened && openKeys.includes(key)) {
      return LLSelectActions.Open
    }
    if (key === 'Home') { return LLSelectActions.GotoFirstItem }
    if (key === 'End') { return LLSelectActions.GotoLastItem }
    // handle typing characters when open or closed
    if (
      key === 'Backspace' ||
      key === 'Clear' ||
      (key.length === 1 && key !== ' ' && !altKey && !ctrlKey && !metaKey)
    ) {
      return LLSelectActions.TypeChar
    }
    // handle keys when open
    if (this.isListboxOpened) {
      if (key === 'ArrowUp' && altKey) {
        return LLSelectActions.CloseSelect
      } else if (key === 'ArrowDown' && !altKey) {
        return LLSelectActions.Next
      } else if (key === 'ArrowUp') {
        return LLSelectActions.Previous
      } else if (key === 'PageUp') {
        return LLSelectActions.PageUp
      } else if (key === 'PageDown') {
        return LLSelectActions.PageDown
      } else if (key === 'Escape') {
        return LLSelectActions.Close
      } else if (key === 'Enter' || key === ' ') {
        return LLSelectActions.CloseSelect
      }
    }
  }
}

