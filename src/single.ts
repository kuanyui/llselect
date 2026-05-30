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
   * Fired when the chosen item actually changes (compared via `compareFn`).
   * `undefined` means "no selection". Does NOT fire on construction nor on
   * `setChosenItem` with an equivalent item.
   */
  onChange: (chosenItem: T | undefined) => void
}

/**
 * Constructor-time settings input for {@link LLSelectSingle}.
 * Every field is optional; missing fields use defaults.
 */
export type LLSelectSingleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & { onChange?: (chosenItem: T | undefined) => void }

/**
 * Single-selection select. Picking an item replaces any prior chosen item
 * and closes the popup. Use `setChosenItem(undefined)` to clear the selection.
 *
 * @typeParam T - item type. Supply your own `compareFn` for non-primitive `T`.
 */
export class LLSelectSingle<T = unknown> extends LLSelectBase<T> {
  /** Currently chosen item, or `undefined` if none. */
  protected chosenItem: T | undefined = undefined
  /** Optional change callback supplied via settings. */
  protected onChange: ((chosenItem: T | undefined) => void) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.renderTrigger()
  }

  /** Return the currently chosen item, or `undefined` if none. */
  public getChosenItem(): T | undefined {
    return this.chosenItem
  }

  /**
   * Programmatically set the chosen item. Pass `undefined` to clear. Fires
   * `onChange` only when the item actually differs from the current one
   * (compared via `compareFn`). Accepts items that are not (yet) in the
   * items list - this supports async data flows; if a later `setItems` does
   * not include the chosen item it will be dropped automatically.
   */
  public setChosenItem(item: T | undefined): void {
    if (this.areEqual(item, this.chosenItem)) { return }
    this.chosenItem = item
    this.renderTrigger()
    this.fireChange()
  }

  /** Renders the chosen item's label, or the placeholder when empty. */
  protected override renderTriggerContent(): void {
    const empty = this.chosenItem === undefined
    this.triggerContentEl.textContent = empty
      ? this.settings.placeholder
      : this.templateItem(this.chosenItem!)
    this.triggerEl.setAttribute('data-empty', empty ? 'true' : 'false')
  }

  /** Pick this item as the chosen item and close the popup. */
  protected override onItemClick(item: T): void {
    this.setChosenItem(item)
    this.close()
  }

  /** On open, highlight the currently chosen item (if any), else the first. */
  protected override focusInitial(): void {
    if (this.items.length === 0) { return }
    const c = this.chosenItem
    if (c !== undefined) {
      const idx = this.items.findIndex(o => this.settings.compareFn(o, c))
      if (idx >= 0) {
        this.setFocusedIndex(idx)
        return
      }
    }
    this.setFocusedIndex(0)
  }

  /** Drop the chosen item if `setItems` removed it from the list. */
  protected override afterItemsChange(): void {
    const current = this.chosenItem
    if (current === undefined) { return }
    const stillPresent = this.items.some(o => this.settings.compareFn(o, current))
    if (!stillPresent) {
      this.chosenItem = undefined
      this.renderTrigger()
      this.fireChange()
    }
  }

  private areEqual(a: T | undefined, b: T | undefined): boolean {
    if (a === undefined && b === undefined) { return true }
    if (a === undefined || b === undefined) { return false }
    return this.settings.compareFn(a, b)
  }

  private fireChange(): void {
    this.onChange?.(this.chosenItem)
  }
}
