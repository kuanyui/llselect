import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectSettingsInputOf,
} from './base.js'

/**
 * Context passed to {@link LLSelectSingleSettings.createTriggerContentElFn}.
 * @group Settings
 * @category Single
 */
export interface LLSelectSingleTriggerContext<T> {
  chosenItem: T | undefined
  items: readonly T[]
}

/**
 * Resolved (defaults applied) settings for {@link LLSelectSingle}: the base
 * settings plus the single-mode fields - the runtime type of `this.settings`,
 * one bag built complete in the constructor.
 * @group Settings
 * @category Single
 */
export interface LLSelectSingleSettings<T, GK = string> extends LLSelectBaseSettings<T, GK> {
  /**
   * Fired when the chosen item actually changes (compared via `compareFn`).
   * Receives the new value and the PREVIOUS one (the snapshot from before
   * this change); `undefined` means "no selection" on either side. Does NOT
   * fire on construction nor on `setChosenItem` with an equivalent item.
   * `null` (default) = no listener.
   * @group Events
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
   * @group Trigger
   */
  createTriggerContentElFn: ((ctx: LLSelectSingleTriggerContext<T>) => HTMLElement | null) | null
}

/**
 * Constructor-time settings input for {@link LLSelectSingle}.
 * Every field is optional; missing fields use defaults.
 * @group Settings
 * @category Single
 */
export type LLSelectSingleSettingsInput<T, GK = string> = LLSelectSettingsInputOf<LLSelectSingleSettings<T, GK>>

/**
 * Single-selection select. Picking an item replaces any prior chosen item
 * and closes the popup. Use `setChosenItem(undefined)` to clear the selection.
 *
 * @typeParam T - item type. Supply your own `compareFn` for non-primitive `T`.
 * @group Select classes
 */
export class LLSelectSingle<T = unknown, GK = string> extends LLSelectBase<T, GK> {
  /**
   * Currently chosen item, or `undefined` if none.
   * @group State (protected)
   */
  protected chosenItem: T | undefined = undefined
  /**
   * Re-type only (`declare` emits no field): the single-mode fields are passed,
   * resolved, through `super()`, so the bag is complete before any base
   * construction code runs.
   * @group State (protected)
   */
  protected declare readonly settings: LLSelectSingleSettings<T, GK>

  /**
   * Build the control inside `targetEl`. Settings are resolved once here
   * (missing fields get defaults) and are immutable afterwards.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T, GK>) {
    super(targetEl, settings, {
      onChange: settings?.onChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
    } satisfies Omit<LLSelectSingleSettings<T, GK>, keyof LLSelectBaseSettings<T, GK>>)
    this.renderTrigger()
  }

  /**
   * Return the currently chosen item, or `undefined` if none.
   * @group Selection
   */
  public getChosenItem(): T | undefined {
    return this.chosenItem
  }

  /**
   * Programmatically set the chosen item; `undefined` clears.
   * - Fires `onChange` only when the item actually differs from the current
   *   one (compared via `compareFn`).
   * - Accepts an item that is not (yet) in the items list (async data flows).
   *   If a later `setItems` does not include it, it is dropped automatically.
   * - No disabled check (native `<select>` parity): a disabled item can be
   *   chosen programmatically.
   * @group Selection
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
   * @group Subclassing: rendering
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const plainValue = this.chosenItem === undefined ? this.settings.placeholder : this.itemToString(this.chosenItem!)
    const custom = this.settings.createTriggerContentElFn?.({ chosenItem: this.chosenItem, items: this.getItems() }) ?? null
    if (custom !== null) {
      this.commitTriggerContentToDom(custom, plainValue)
      return
    }
    this.commitTriggerContentToDom(plainValue)
  }

  /**
   * No selection iff `chosenItem` is unset. Drives the trigger's `data-empty`.
   * @group Subclassing: semantics
   */
  protected override isEmpty(): boolean {
    return this.chosenItem === undefined
  }

  /**
   * Mark the chosen option `aria-selected="true"`, the rest `"false"` (APG select-only).
   * @group Subclassing: rendering
   */
  protected override createItemEl(item: T, index: number): HTMLElement {
    const el = super.createItemEl(item, index)
    el.setAttribute('aria-selected', String(this.areEqual(item, this.chosenItem)))
    return el
  }

  /**
   * Pick this item as the chosen item and close the popup.
   * @group Subclassing: reactions
   */
  protected override onItemActivated(item: T): void {
    this.setChosenItem(item)
    this.close()
  }

  /**
   * Clear button empties the single selection to `undefined`.
   * @group Subclassing: semantics
   */
  protected override clearSelection(): void {
    this.setChosenItem(undefined)
  }

  /**
   * On open, highlight the chosen item (if present and enabled), else the first
   * enabled item. Indices are into `getVisibleItems()` (the rendered list).
   * @group Subclassing: focus
   */
  protected override focusInitial(): void {
    const list = this.getVisibleItems()
    const c = this.chosenItem
    if (c !== undefined) {
      const idx = list.findIndex(o => this.settings.compareFn(o, c))
      if (idx >= 0 && !this.isItemEffectivelyDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    const first = this.findNextEnabledIndex(0, 1, list)
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /**
   * Drop the chosen item if `setItems` removed it from the list.
   * @group Subclassing: reactions
   */
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
