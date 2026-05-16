import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

export interface LLSelectSingleSettings<T> extends LLSelectBaseSettings<T> {
  onChange: (chosen: T | undefined) => void
}

export type LLSelectSingleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & { onChange?: (chosen: T | undefined) => void }

export class LLSelectSingle<T = unknown> extends LLSelectBase<T> {
  protected chosen: T | undefined = undefined
  protected onChange: ((chosen: T | undefined) => void) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.renderCombobox()
  }

  public getChosen(): T | undefined {
    return this.chosen
  }

  public setChosen(option: T | undefined): void {
    if (this.areEqual(option, this.chosen)) return
    this.chosen = option
    this.renderCombobox()
    this.fireChange()
  }

  protected override renderContent(): void {
    this.contentEl.textContent = this.chosen === undefined
      ? this.settings.placeholder
      : this.templateOption(this.chosen)
  }

  protected override onOptionClick(option: T): void {
    this.setChosen(option)
    this.close()
  }

  // On open, highlight the chosen option (if any) instead of the first.
  protected override focusInitial(): void {
    if (this.options.length === 0) return
    const c = this.chosen
    if (c !== undefined) {
      const idx = this.options.findIndex(o => this.settings.compareFn(o, c))
      if (idx >= 0) {
        this.setFocusedIndex(idx)
        return
      }
    }
    this.setFocusedIndex(0)
  }

  // Drop chosen if it is no longer in the options list.
  protected override afterOptionsChange(): void {
    const current = this.chosen
    if (current === undefined) return
    const stillPresent = this.options.some(o => this.settings.compareFn(o, current))
    if (!stillPresent) {
      this.chosen = undefined
      this.renderCombobox()
      this.fireChange()
    }
  }

  private areEqual(a: T | undefined, b: T | undefined): boolean {
    if (a === undefined && b === undefined) return true
    if (a === undefined || b === undefined) return false
    return this.settings.compareFn(a, b)
  }

  private fireChange(): void {
    this.onChange?.(this.chosen)
  }
}
