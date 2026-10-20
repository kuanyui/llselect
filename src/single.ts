import {
  LLSelectBase,
  defaultCompareFn,
  type LLSelectBaseSettings,
  type LLSelectBeforeChangeEvent,
  type LLSelectChangeMeta,
  type LLSelectChangeReason,
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
   *
   * > Pairs with `onBeforeChange`, which runs **before** a user change and can stop it.
   *
   * - `meta.source` says who initiated the change: `'user'` for a pointer or
   *   keyboard interaction inside the widget, `'api'` for any programmatic
   *   call. See {@link LLSelectChangeMeta}.
   * - `meta.reason` says what the change did: `'choose'` with the item in
   *   `meta.item`, `'clear'` for an empty write, or `'items'` for a
   *   `setItems` drop. See {@link LLSelectChangeReason}.
   * - Runs **after** the value changed and the trigger was updated.
   * - `getChosenItem()` already returns the new value.
   * - A setter may be called from inside it. The nested `onChange` then
   *   reports `meta.source` `'api'`.
   * - A modal dialog may be opened, or focus moved, from inside it.
   * - Focus that already moved outside the widget is not reclaimed.
   * - Moving focus outside the widget closes the popup, as always.
   * - A pick closes the popup when the handler returns, if it is still open.
   * - Other changes leave the popup as it is.
   * @group Events
   */
  onChange: ((chosenItem: T | undefined, previousChosenItem: T | undefined, meta: LLSelectChangeMeta<T>) => void) | null
  /**
   * Fired **before** a user interaction changes the chosen item, with a way to
   * stop it.
   *
   * > Pairs with `onChange`, which runs **after** the change was written.
   *
   * - Fires for the library's own pointer and keyboard paths only: a pick in
   *   the popup, and the clear button. Programmatic setters, the `setItems`
   *   reconciliation and an action row's own setter calls never fire it.
   * - `nextChosenItem` is the value about to be set. `previousChosenItem` is
   *   the current one.
   * - `event.preventDefault()` stops the change: nothing is written, nothing
   *   re-renders, `onChange` does not fire.
   * - A vetoed pick still closes the popup, like any pick in single mode
   *   while the popup is open. Only a pick does this.
   * - A vetoed clear leaves everything as it is.
   * - A pick of the already chosen item never fires it: nothing would change.
   * - Runs **after** the protected `onChosenChanging` hook. Both run, either may
   *   cancel, and `event.defaultPrevented` shows the hook's decision.
   * - A setter called from inside the handler wins, `setItems` included: the
   *   pending change is dropped. That change reports `meta.source` `'user'`,
   *   as the first change of the interaction.
   * - For a confirmation dialog: call `event.preventDefault()`, open the
   *   dialog, and call `setChosenItem` after the user agreed. That change
   *   reports `meta.source` `'api'`.
   * - An error thrown by a handler propagates and the change does not
   *   happen. If a pick threw, the popup does not close.
   * - `null` (default) = nothing is called; no user change is ever stopped
   *   by it.
   * @group Events
   */
  onBeforeChange: ((nextChosenItem: T | undefined, previousChosenItem: T | undefined, event: LLSelectBeforeChangeEvent<T>) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen item
   * + items (same convention as `createPopupListItemContentElFn`):
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
   * - This plain form infers `T` from a typed callback in `settings` whose
   *   signature contains `T` (`itemToStringFn: (u: User) => ...`). With no
   *   such callback, pass `T` explicitly: `new LLSelectSingle<string>(...)`.
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
      onBeforeChange: settings?.onBeforeChange ?? null,
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
    if (item === undefined) { this.fireChange(previous, 'clear') } else { this.fireChange(previous, 'choose', item) }
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
    // The chosen item's language rides on the value mirror and on the content
    // slot, custom content included: AT reads the slot while the filter is
    // inactive and the mirror while it is active, and an app's own lang on its
    // element wins, being nearer. The placeholder is interface text, so an
    // empty selection carries none.
    const lang = this.chosenItem === undefined ? null : this.itemToLang(this.chosenItem!)
    this.commitLangToDom(this.triggerValueEl, lang)
    this.commitLangToDom(this.triggerContentEl, lang)
    const fn = this.settings.createTriggerContentElFn
    const custom = fn?.({ chosenItem: this.chosenItem, items: this.getItems() }) ?? null
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
  protected override createPopupListItemEl(item: T, index: number): HTMLElement {
    const el = super.createPopupListItemEl(item, index)
    el.setAttribute('aria-selected', String(this.areEqual(item, this.chosenItem)))
    return el
  }

  /**
   * Pick this item as the chosen item and close the popup.
   * - Asks `onChosenChanging` and `onBeforeChange` first; a veto keeps the
   *   current value.
   * - Closes the popup either way, unless a handler threw.
   * @group Subclassing: reactions
   */
  protected override onPopupListItemActivated(item: T): void {
    if (this.requestUserChange(item, 'choose', item)) { this.setChosenItem(item) }
    this.closeWithReason('choose')
  }

  /**
   * Clear button empties the single selection to `undefined`, after asking
   * `onChosenChanging` and `onBeforeChange`.
   * @group Subclassing: semantics
   */
  protected override clearSelection(): void {
    if (this.requestUserChange(undefined, 'clear')) { this.setChosenItem(undefined) }
  }

  /**
   * Subclass hook: called **before** a user interaction changes the chosen item,
   * with the way to stop it. Default no-op.
   *
   * > Pairs with `onChosenChanged`, which runs **after** the change was written.
   *
   * - Runs **before** the `onBeforeChange` setting. Both run, either may call
   *   `event.preventDefault()`.
   * - The parameters are the setting's: the value about to be set, the
   *   current one, the event.
   * @group Subclassing: reactions
   */
  protected onChosenChanging(_nextChosenItem: T | undefined, _previousChosenItem: T | undefined, _event: LLSelectBeforeChangeEvent<T>): void {}

  /**
   * The gate every user path to a change runs through: skips a no-op, asks the
   * hook and the setting, and says whether the setter may run.
   */
  private requestUserChange(next: T | undefined, reason: 'choose', item: T): boolean
  private requestUserChange(next: T | undefined, reason: 'clear'): boolean
  private requestUserChange(next: T | undefined, reason: 'choose' | 'clear', item?: T): boolean {
    const previous = this.chosenItem
    if (this.areEqual(next, previous)) { return false }
    const revision = this.changeRevision
    const allowed = this.dispatchBeforeChange(reason === 'choose' ? { reason, item: item as T } : { reason }, (event) => {
      this.onChosenChanging(next, previous, event)
      const fn = this.settings.onBeforeChange
      fn?.(next, previous, event)
    })
    // A setter called inside the handlers wins, setItems included: the pending
    // change is dropped, even when the handler restored the previous value.
    return allowed && this.changeRevision === revision
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
      const compareFn = this.settings.compareFn
      const idx = list.findIndex(o => compareFn(o, c))
      if (idx >= 0 && !this.isItemEffectivelyDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    const first = this.findNextEnabledIndex(0, 1, list)
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /**
   * Closed-state typeahead searches relative to the CHOSEN item, like a
   * native `<select>`: typing its initial cycles to the next match.
   * - Returns `-1` when nothing is chosen, or the chosen item left the list;
   *   the search then starts from the top.
   * @group Subclassing: focus
   */
  protected override computeTypeaheadClosedStartIndex(list: readonly T[]): number {
    const c = this.chosenItem
    if (c === undefined) { return -1 }
    const compareFn = this.settings.compareFn
    return list.findIndex((o) => compareFn(o, c))
  }

  /**
   * Re-match the chosen item against the new list **after** `setItems`.
   * - If the list no longer holds it (by `compareFn`), it is dropped and
   *   `onChange` fires.
   * - If the list holds a compareFn-equal but DIFFERENT object (`track by`
   *   style reload: same key, fresh fields), the stored reference is swapped
   *   to the list's object. The logical value did not change, so `onChange`
   *   does not fire.
   * - The trigger content re-renders after every `setItems`, because a custom
   *   `createTriggerContentElFn` receives `items`.
   * - The arrow re-renders only when the chosen item is dropped, because that
   *   runs the whole trigger.
   * @group Subclassing: reactions
   */
  protected override onItemsChanged(): void {
    const previous = this.chosenItem
    if (previous !== undefined) {
      const compareFn = this.settings.compareFn
      const idx = this.items.findIndex(o => compareFn(o, previous))
      if (idx < 0) {
        this.chosenItem = undefined
        this.renderTrigger()
        this.fireChange(previous, 'items')
        return
      }
      const matched = this.items[idx]!
      // Reference swap = a different VALUE under SameValueZero, so a NaN item
      // matching itself is not a swap.
      if (!defaultCompareFn(matched, previous)) { this.chosenItem = matched }
    }
    // A custom trigger receives `items`, so every list change refreshes the
    // content; the arrow does not depend on the list.
    this.renderTriggerContent()
  }

  private areEqual(a: T | undefined, b: T | undefined): boolean {
    if (a === undefined && b === undefined) { return true }
    if (a === undefined || b === undefined) { return false }
    const compareFn = this.settings.compareFn
    return compareFn(a, b)
  }

  // The overloads make a single-item reason require its item at compile time.
  private fireChange(previousChosenItem: T | undefined, reason: 'choose' | 'unchoose', item: T): void
  private fireChange(previousChosenItem: T | undefined, reason: 'clear' | 'set' | 'items'): void
  private fireChange(previousChosenItem: T | undefined, reason: LLSelectChangeReason, item?: T): void {
    this.changeRevision++
    // Consume the source before any observer runs: a programmatic setter
    // called from inside onChange (or a subclass reaction) must report
    // 'api', not inherit the outer interaction's 'user' attribution.
    const source = this.changeSource
    this.changeSource = 'api'
    // The item shape for the two single-item reasons, even when T admits undefined.
    const meta: LLSelectChangeMeta<T> = reason === 'choose' || reason === 'unchoose'
      ? { source, reason, item: item as T }
      : { source, reason }
    this.onChosenChanged()
    const onChange = this.settings.onChange
    onChange?.(this.chosenItem, previousChosenItem, meta)
    // Action rows read live state; after the handler ran, so a row's text may show what it wrote.
    this.replacePopupListActionRowElsInDom()
  }
}
