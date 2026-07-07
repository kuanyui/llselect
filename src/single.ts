import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectSettingsInputOf,
} from './base.js'

/** Context passed to {@link LLSelectSingleSettings.createTriggerContentElFn}. */
export interface LLSelectSingleTriggerContext<T> {
  chosenItem: T | undefined
  items: readonly T[]
}

/**
 * Resolved (defaults applied) settings for {@link LLSelectSingle}: the base
 * settings plus the single-mode fields - the runtime type of `this.settings`,
 * one bag built complete in the constructor.
 */
export interface LLSelectSingleSettings<T, GK = string> extends LLSelectBaseSettings<T, GK> {
  /**
   * Fired when the chosen item actually changes (compared via `compareFn`).
   * Receives the new value and the PREVIOUS one (the snapshot from before
   * this change); `undefined` means "no selection" on either side. Does NOT
   * fire on construction nor on `setChosenItem` with an equivalent item.
   * `null` (default) = no listener.
   */
  onChange: ((chosenItem: T | undefined, previousChosenItem: T | undefined) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen item
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup (icon + text, etc.).
   * - fn returns `null` - use the default for this render: the chosen item's
   *   `itemToString`, or the placeholder when nothing is chosen.
   * - setting is `null` (default) - always use that default rendering.
   * Checked before `renderTriggerContent`, so it wins over a subclass override.
   */
  createTriggerContentElFn: ((ctx: LLSelectSingleTriggerContext<T>) => HTMLElement | null) | null
}

/**
 * Constructor-time settings input for {@link LLSelectSingle}.
 * Every field is optional; missing fields use defaults.
 */
export type LLSelectSingleSettingsInput<T, GK = string> = LLSelectSettingsInputOf<LLSelectSingleSettings<T, GK>>

/**
 * Single-selection select. Picking an item replaces any prior chosen item
 * and closes the popup. Use `setChosenItem(undefined)` to clear the selection.
 *
 * @typeParam T - item type. Supply your own `compareFn` for non-primitive `T`.
 */
export class LLSelectSingle<T = unknown, GK = string> extends LLSelectBase<T, GK> {
  /** Currently chosen item, or `undefined` if none. */
  protected chosenItem: T | undefined = undefined
  /**
   * Re-type only (`declare` emits no field): the single-mode fields are passed,
   * resolved, through `super()`, so the bag is complete before any base
   * construction code runs.
   */
  protected declare readonly settings: LLSelectSingleSettings<T, GK>

  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T, GK>) {
    super(targetEl, settings, {
      onChange: settings?.onChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
    } satisfies Omit<LLSelectSingleSettings<T, GK>, keyof LLSelectBaseSettings<T, GK>>)
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
    const previous = this.chosenItem
    this.chosenItem = item
    this.renderTrigger()
    // Popup open: refresh only the two affected options so their
    // aria-selected stays true to state (O(1); no-op while closed).
    if (previous !== undefined) { this.replacePopupListItemElInDom(previous) }
    if (item !== undefined) { this.replacePopupListItemElInDom(item) }
    this.fireChange(previous)
  }

  /**
   * Orchestrator: composes `syncEmptyStateToDom` + `commitTriggerContentToDom`
   * to (re)build the trigger from state; touches no DOM directly.
   * - `createTriggerContentElFn` first; `null` / unset falls to the default.
   * - Default: the chosen item's string, or the placeholder when empty.
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const custom = this.settings.createTriggerContentElFn?.({ chosenItem: this.chosenItem, items: this.getItems() }) ?? null
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

  /** Mark the chosen option `aria-selected="true"`, the rest `"false"` (APG select-only). */
  protected override createItemEl(item: T, index: number): HTMLElement {
    const el = super.createItemEl(item, index)
    el.setAttribute('aria-selected', String(this.areEqual(item, this.chosenItem)))
    return el
  }

  /** Pick this item as the chosen item and close the popup. */
  protected override onItemActivated(item: T): void {
    this.setChosenItem(item)
    this.close()
  }

  /** Clear button empties the single selection to `undefined`. */
  protected override clearSelection(): void {
    this.setChosenItem(undefined)
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
    const previous = this.chosenItem
    if (previous === undefined) { return }
    const stillPresent = this.items.some(o => this.settings.compareFn(o, previous))
    if (!stillPresent) {
      this.chosenItem = undefined
      this.renderTrigger()
      this.fireChange(previous)
    }
  }

  private areEqual(a: T | undefined, b: T | undefined): boolean {
    if (a === undefined && b === undefined) { return true }
    if (a === undefined || b === undefined) { return false }
    return this.settings.compareFn(a, b)
  }

  private fireChange(previousChosenItem: T | undefined): void {
    this.onChosenChanged()
    this.settings.onChange?.(this.chosenItem, previousChosenItem)
  }
}
