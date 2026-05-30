import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

/** Context passed to {@link LLSelectMultipleSettings.renderTriggerContentFn}. */
export interface LLSelectMultipleTriggerContext<T> {
  chosenItems: readonly T[]
  items: readonly T[]
}

/**
 * Resolved settings for {@link LLSelectMultiple}. Extends the base settings
 * with the multi-mode `onChange` callback (chosen items is an array).
 */
export interface LLSelectMultipleSettings<T> extends LLSelectBaseSettings<T> {
  /**
   * Fired when the chosen-items set actually changes. Does NOT fire on
   * construction nor on a setter call that yields an equivalent set
   * (element-wise compared via `compareFn`, order-sensitive).
   */
  onChange: (chosenItems: readonly T[]) => void
  /**
   * Render the trigger's content without subclassing - the setting equivalent
   * of overriding `renderTriggerContent`. Receives the chosen items + items;
   * return a string / element to display (e.g. tag chips), or `null` to use the
   * default count summary. Checked before `renderTriggerContent`, so it wins
   * over a subclass override.
   */
  renderTriggerContentFn?: (ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | string | null
}

/**
 * Constructor-time settings input for {@link LLSelectMultiple}.
 */
export type LLSelectMultipleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & {
    onChange?: (chosenItems: readonly T[]) => void
    renderTriggerContentFn?: (ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | string | null
  }

/**
 * Multi-selection select. Clicking an item toggles its membership in the
 * chosen-items set and keeps the popup open. Each item DOM gets
 * `aria-selected="true|false"`; the popup list gets
 * `aria-multiselectable="true"`.
 *
 * Default trigger display is a count summary ("3 / 10 selected" / "All N
 * selected" / placeholder when empty). Pass `renderTriggerContentFn` (or
 * subclass `renderTriggerContent`) to customise (e.g. tag chips).
 *
 * @typeParam T - item type.
 */
export class LLSelectMultiple<T = unknown> extends LLSelectBase<T> {
  /** Currently chosen items, in insertion order. */
  protected chosenItems: T[] = []
  /** Optional change callback supplied via settings. */
  protected onChange: ((chosenItems: readonly T[]) => void) | undefined
  /** Optional trigger-content renderer supplied via settings. */
  protected renderTriggerContentFn:
    ((ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | string | null) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.renderTriggerContentFn = settings?.renderTriggerContentFn
    this.popupListEl.setAttribute('aria-multiselectable', 'true')
    this.renderTrigger()
  }

  /** Return the currently chosen items (insertion order). */
  public getChosenItems(): readonly T[] {
    return this.chosenItems
  }

  /**
   * Replace the entire chosen-items set. The input is shallow-copied. Fires
   * `onChange` only when the new set differs element-wise (order-sensitive)
   * from the current set.
   */
  public setChosenItems(items: T[]): void {
    const next = items.slice()
    if (this.arraysEqual(next, this.chosenItems)) { return }
    this.chosenItems = next
    this.rerender()
    this.fireChange()
  }

  /** Whether the given item is currently chosen (via `compareFn`). */
  public isChosen(item: T): boolean {
    return this.chosenItems.some(c => this.settings.compareFn(c, item))
  }

  /**
   * Toggle the membership of `item` in the chosen-items set. Adds at the end
   * if not present; removes if present. Fires `onChange`.
   */
  public toggleItem(item: T): void {
    const idx = this.chosenItems.findIndex(c => this.settings.compareFn(c, item))
    if (idx >= 0) {
      this.chosenItems = [...this.chosenItems.slice(0, idx), ...this.chosenItems.slice(idx + 1)]
    } else {
      this.chosenItems = [...this.chosenItems, item]
    }
    // Only one item's selection changed: re-render the trigger (count) and
    // that single item's element, not the whole list. O(1) DOM work.
    this.renderTrigger()
    this.rerenderPopupListItem(item)
    this.fireChange()
  }

  /**
   * Choose every enabled item. Already-chosen disabled items are preserved
   * (they cannot be toggled through the UI, so bulk ops leave them as-is).
   * Fires `onChange` only when the set actually changes.
   */
  public chooseAll(): void {
    this.setChosenItems(this.items.filter(it => !this.isItemDisabled(it) || this.isChosen(it)))
  }

  /**
   * Clear enabled choices. Already-chosen disabled items are preserved (not
   * togglable through the UI). Fires `onChange` only when the set changes.
   */
  public unchooseAll(): void {
    this.setChosenItems(this.chosenItems.filter(c => this.isItemDisabled(c)))
  }

  /** Toggle between "all enabled chosen" and "none chosen". Ignores disabled. */
  public toggleAll(): void {
    const enabled = this.items.filter(it => !this.isItemDisabled(it))
    const allChosen = enabled.length > 0 && enabled.every(it => this.isChosen(it))
    if (allChosen) { this.unchooseAll() } else { this.chooseAll() }
  }

  /**
   * Default trigger label: count summary. Override (or pass the
   * `renderTriggerContentFn` setting) to display tags / custom HTML / etc.
   *
   * - 0 chosen: placeholder
   * - 0 < n < total: `"n / total selected"`
   * - n === total > 0: `"All n selected"`
   */
  protected override renderTriggerContent(): void {
    const n = this.chosenItems.length
    const total = this.items.length
    this.triggerEl.setAttribute('data-empty', n === 0 ? 'true' : 'false')
    // renderTriggerContentFn first; null / unset falls to the count summary.
    const fn = this.renderTriggerContentFn
    const custom = fn ? fn({ chosenItems: this.getChosenItems(), items: this.getItems() }) : null
    if (custom !== null) {
      this.applyTriggerContent(custom)
      return
    }
    if (n === 0) {
      this.triggerContentEl.textContent = this.settings.placeholder
    } else if (n === total && total > 0) {
      this.triggerContentEl.textContent = `All ${n} selected`
    } else {
      this.triggerContentEl.textContent = `${n} / ${total} selected`
    }
  }

  /** Toggle on click. Multi mode keeps the popup open. */
  protected override onItemClick(item: T): void {
    this.toggleItem(item)
  }

  /** Mark each item with `aria-selected` reflecting its chosen state. */
  protected override createItemEl(item: T, index: number): HTMLElement {
    const el = super.createItemEl(item, index)
    el.setAttribute('aria-selected', String(this.isChosen(item)))
    return el
  }

  /** Drop chosen entries that disappeared from the new items list. */
  protected override afterItemsChange(): void {
    const filtered = this.chosenItems.filter(c =>
      this.items.some(item => this.settings.compareFn(item, c))
    )
    if (filtered.length === this.chosenItems.length) { return }
    this.chosenItems = filtered
    this.renderTrigger()
    this.fireChange()
  }

  /**
   * On open, focus the first chosen item (if present and enabled), otherwise
   * the first enabled item. Indices are into `visibleItems()`.
   */
  protected override focusInitial(): void {
    const list = this.visibleItems()
    const firstChosen = this.chosenItems[0]
    if (firstChosen !== undefined) {
      const idx = list.findIndex(i => this.settings.compareFn(i, firstChosen))
      if (idx >= 0 && !this.isItemDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    const first = this.scanEnabledIndex(0, 1, list)
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  private arraysEqual(a: readonly T[], b: readonly T[]): boolean {
    if (a.length !== b.length) { return false }
    const eq = this.settings.compareFn
    for (let i = 0; i < a.length; i++) {
      if (!eq(a[i]!, b[i]!)) { return false }
    }
    return true
  }

  private fireChange(): void {
    this.onChange?.(this.chosenItems)
  }
}
