import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

/**
 * Resolved settings for {@link LLSelectSingle}. Extends the base settings
 * with the single-mode `onChange` callback.
 */
/** Context passed to {@link LLSelectSingleSettings.createTriggerContentElFn}. */
export interface LLSelectSingleTriggerContext<T> {
  chosenItem: T | undefined
  items: readonly T[]
}

export interface LLSelectSingleSettings<T> extends LLSelectBaseSettings<T> {
  /**
   * Fired when the chosen item actually changes (compared via `compareFn`).
   * `undefined` means "no selection". Does NOT fire on construction nor on
   * `setChosenItem` with an equivalent item.
   */
  onChange: (chosenItem: T | undefined) => void
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen item
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup (icon + text, etc.).
   * - `null` - use the default: the chosen item's `itemToString`, or the
   *   placeholder when nothing is chosen.
   * Checked before `renderTriggerContent`, so it wins over a subclass override.
   */
  createTriggerContentElFn?: (ctx: LLSelectSingleTriggerContext<T>) => HTMLElement | null
}

/**
 * Constructor-time settings input for {@link LLSelectSingle}.
 * Every field is optional; missing fields use defaults.
 */
export type LLSelectSingleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & {
    onChange?: (chosenItem: T | undefined) => void
    createTriggerContentElFn?: (ctx: LLSelectSingleTriggerContext<T>) => HTMLElement | null
  }

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
  /** Optional trigger-content renderer supplied via settings. */
  protected createTriggerContentElFn:
    ((ctx: LLSelectSingleTriggerContext<T>) => HTMLElement | null) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.createTriggerContentElFn = settings?.createTriggerContentElFn
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

  /**
   * Orchestrator: composes `syncEmptyStateToDom` + `commitTriggerContentToDom`
   * to (re)build the trigger from state; touches no DOM directly.
   * - `createTriggerContentElFn` first; `null` / unset falls to the default.
   * - Default: the chosen item's string, or the placeholder when empty.
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const custom = this.createTriggerContentElFn?.({ chosenItem: this.chosenItem, items: this.getItems() }) ?? null
    if (custom !== null) {
      this.commitTriggerContentToDom(custom)
      return
    }
    this.commitTriggerContentToDom(
      this.chosenItem === undefined ? this.settings.placeholder : this.itemToString(this.chosenItem!),
    )
  }

  /** No selection iff `chosenItem` is unset. Drives the trigger's `data-empty`. */
  protected override isEmpty(): boolean {
    return this.chosenItem === undefined
  }

  /** Pick this item as the chosen item and close the popup. */
  protected override onItemClick(item: T): void {
    this.setChosenItem(item)
    this.close()
  }

  /**
   * On open, highlight the chosen item (if present and enabled), else the first
   * enabled item. Indices are into `getVisibleItems()` (the rendered list).
   */
  protected override focusInitial(): void {
    const list = this.getVisibleItems()
    const c = this.chosenItem
    if (c !== undefined) {
      const idx = list.findIndex(o => this.settings.compareFn(o, c))
      if (idx >= 0 && !this.isItemDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    const first = this.findNextEnabledIndex(0, 1, list)
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /** Drop the chosen item if `setItems` removed it from the list. */
  protected override onItemsChanged(): void {
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
