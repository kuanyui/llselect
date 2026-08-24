import {
  LLSelectBase,
  defaultCompareFn,
  type LLSelectBaseSettings,
  type LLSelectChangeMeta,
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
export interface LLSelectSingleSettings<T, GroupKey = string> extends LLSelectBaseSettings<T, GroupKey> {
  /**
   * Fired when the chosen item actually changes (compared via `compareFn`).
   * Receives the new value and the PREVIOUS one (the snapshot from before
   * this change); `undefined` means "no selection" on either side. Does NOT
   * fire on construction nor on `setChosenItem` with an equivalent item.
   * `null` (default) = no listener.
   * - `meta.source` says who initiated the change: `'user'` for a pointer or
   *   keyboard interaction inside the widget, `'api'` for any programmatic
   *   call. See {@link LLSelectChangeMeta}.
   * @group Events
   */
  onChange: ((chosenItem: T | undefined, previousChosenItem: T | undefined, meta: LLSelectChangeMeta) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen item
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup (icon + text, etc.).
   * - fn returns `null` - use the default for this render: the chosen item's
   *   `itemToString`, or the placeholder when nothing is chosen.
   * - setting is `null` (default) - always use that default rendering.
   * The DEFAULT `renderTriggerContent` checks it first; a subclass override
   * replaces that default entirely and may ignore the setting - override
   * wins, per DESIGN.md "Customization model".
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
export type LLSelectSingleSettingsInput<T, GroupKey = string> = LLSelectSettingsInputOf<LLSelectSingleSettings<T, GroupKey>>

/**
 * Single-selection select. Picking an item replaces any prior chosen item
 * and closes the popup. Use `setChosenItem(undefined)` to clear the selection.
 *
 * @typeParam T - item type. Supply your own `compareFn` for non-primitive `T`.
 * @typeParam GroupKey - group key type of `itemToGroupKeyFn`; see
 *   {@link LLSelectBase}.
 * @typeParam S - resolved settings type, for subclasses extending the
 *   settings bag; see {@link LLSelectBase}.
 * @group Select classes
 */
export class LLSelectSingle<T = unknown, GroupKey = string, S extends LLSelectSingleSettings<T, GroupKey> = LLSelectSingleSettings<T, GroupKey>> extends LLSelectBase<T, GroupKey, S> {
  /**
   * Currently chosen item, or `undefined` if none.
   * @group State (protected)
   */
  protected chosenItem: T | undefined = undefined

  /**
   * Build the control inside `targetEl`.
   * - Settings are resolved once here; missing fields get defaults.
   * - They are frozen afterwards, except `placeholder` and `uiTranslationPack`,
   *   which have runtime setters; the rule is at {@link LLSelectBaseSettings}.
   * - This plain form infers `T` from any typed callback in `settings`
   *   (`itemToStringFn: (u: User) => ...`). With no callback, pass `T`
   *   explicitly: `new LLSelectSingle<string>(...)`.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectSingleSettingsInput<T, GroupKey>)
  /**
   * Subclass form. `subclassSettings` is the typed pass-through for subclasses
   * that extend the settings bag further; see `LLSelectBase`'s `S` param.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectSettingsInputOf<S>, subclassSettings?: Omit<S, keyof LLSelectSingleSettings<T, GroupKey>>)
  constructor(targetEl: HTMLElement, settings?: LLSelectSettingsInputOf<S>, subclassSettings?: Omit<S, keyof LLSelectSingleSettings<T, GroupKey>>) {
    const ownExtras = {
      onChange: settings?.onChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
    } satisfies Omit<LLSelectSingleSettings<T, GroupKey>, keyof LLSelectBaseSettings<T, GroupKey>>
    // Cast mirrored from the base constructor: TS cannot prove "own extras +
    // Omit<S, own keys>" reassembles a generic S's extras. Own extras stay
    // satisfies-checked above; incoming extras are param-typed.
    super(targetEl, settings, { ...ownExtras, ...subclassSettings } as Omit<S, keyof LLSelectBaseSettings<T, GroupKey>>)
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
   * Set the chosen item programmatically.
   * - `undefined` clears the choice.
   * - Fires `onChange` only when the item actually differs from the current
   *   one (compared via `compareFn`).
   * - Accepts an item that is not (yet) in the items list, for async data
   *   flows. If a later `setItems` does not include it, it is dropped
   *   automatically.
   * - It does not check disabled state: a disabled item can be chosen
   *   programmatically. Native `<select>` behaves the same.
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
   * - `createTriggerContentElFn` is tried first; if it returns `null` or is
   *   unset, the default applies.
   * - The default is the chosen item's string, or the placeholder when
   *   nothing is chosen.
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
   * On open, focus the chosen item (if present and enabled), else the first
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
   * Re-match the chosen item against the new list after `setItems`.
   * - If the list no longer holds it (by `compareFn`), it is dropped and
   *   `onChange` fires.
   * - If the list holds a compareFn-equal but DIFFERENT object (`track by`
   *   style reload: same key, fresh fields), the stored reference is swapped
   *   to the list's object and the trigger re-renders. The logical value did
   *   not change, so `onChange` does not fire.
   * @group Subclassing: reactions
   */
  protected override onItemsChanged(): void {
    const previous = this.chosenItem
    if (previous === undefined) { return }
    const idx = this.items.findIndex(o => this.settings.compareFn(o, previous))
    if (idx < 0) {
      this.chosenItem = undefined
      this.renderTrigger()
      this.fireChange(previous)
      return
    }
    const matched = this.items[idx]!
    // Reference swap = a different VALUE under SameValueZero, so a NaN item
    // matching itself is not a swap (no spurious re-render).
    if (!defaultCompareFn(matched, previous)) {
      this.chosenItem = matched
      this.renderTrigger()
    }
  }

  private areEqual(a: T | undefined, b: T | undefined): boolean {
    if (a === undefined && b === undefined) { return true }
    if (a === undefined || b === undefined) { return false }
    return this.settings.compareFn(a, b)
  }

  private fireChange(previousChosenItem: T | undefined): void {
    // Consume the source before any observer runs: a programmatic setter
    // called from inside onChange (or a subclass reaction) must report
    // 'api', not inherit the outer interaction's 'user' attribution.
    const meta: LLSelectChangeMeta = { source: this.changeSource }
    this.changeSource = 'api'
    this.onChosenChanged()
    this.settings.onChange?.(this.chosenItem, previousChosenItem, meta)
  }
}
