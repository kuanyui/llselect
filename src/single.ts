import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

/**
 * Resolved settings for {@link LLSelectSingle}. Extends the base settings
 * with the single-mode `onChange` callback.
 */
export interface LLSelectSingleSettings<T> extends LLSelectBaseSettings<T> {
  /**
   * Fired when the chosen value actually changes (compared via `compareFn`).
   * `undefined` means "no selection". Does NOT fire on construction nor on
   * `setChosen` with an equivalent value.
   */
  onChange: (chosen: T | undefined) => void
}

/**
 * Constructor-time settings input for {@link LLSelectSingle}.
 * Every field is optional; missing fields use defaults.
 */
export type LLSelectSingleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & { onChange?: (chosen: T | undefined) => void }

/**
 * Single-selection select. Picking an option replaces any prior chosen value
 * and closes the listbox. Use `setChosen(undefined)` to clear the selection.
 *
 * @typeParam T - option value type. Supply your own `compareFn` for
 *   non-primitive `T`.
 */
export class LLSelectSingle<T = unknown> extends LLSelectBase<T> {
  /** Currently selected value, or `undefined` if none. */
  protected chosen: T | undefined = undefined
  /** Optional change callback supplied via settings. */
  protected onChange: ((chosen: T | undefined) => void) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.renderCombobox()
  }

  /** Return the currently selected value, or `undefined` if none. */
  public getChosen(): T | undefined {
    return this.chosen
  }

  /**
   * Programmatically set the chosen value. Pass `undefined` to clear. Fires
   * `onChange` only when the value actually differs from the current chosen
   * (compared via `compareFn`). Accepts values that are not (yet) in the
   * options list - this supports async data flows; if a later `setOptions`
   * does not include the chosen value it will be dropped automatically.
   */
  public setChosen(option: T | undefined): void {
    if (this.areEqual(option, this.chosen)) return
    this.chosen = option
    this.renderCombobox()
    this.fireChange()
  }

  /** Renders the chosen option's label, or the placeholder when empty. */
  protected override renderContent(): void {
    this.contentEl.textContent = this.chosen === undefined
      ? this.settings.placeholder
      : this.templateOption(this.chosen)
  }

  /** Pick this option as the chosen value and close the listbox. */
  protected override onOptionClick(option: T): void {
    this.setChosen(option)
    this.close()
  }

  /** On open, highlight the currently chosen option (if any), else the first. */
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

  /** Drop the chosen value if `setOptions` removed it from the list. */
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
