import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

/** Context passed to {@link LLSelectMultipleSettings.createTriggerContentElFn}. */
export interface LLSelectMultipleTriggerContext<T> {
  chosenItems: readonly T[]
  items: readonly T[]
}

/**
 * Resolved settings for {@link LLSelectMultiple}. Extends the base settings
 * with the multi-mode `onChange` callback (chosen items is an array).
 */
export interface LLSelectMultipleSettings<T, GK = string> extends LLSelectBaseSettings<T, GK> {
  /**
   * Fired when the chosen-items set actually changes. Does NOT fire on
   * construction nor on a setter call that yields an equivalent set
   * (element-wise compared via `compareFn`, order-sensitive).
   */
  onChange: (chosenItems: readonly T[]) => void
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen items
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup such as tag chips.
   * - `null` - use the default count summary.
   * Checked before `renderTriggerContent`, so it wins over a subclass override.
   */
  createTriggerContentElFn?: (ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | null
  /**
   * Trigger display mode.
   * - `'count'` (default): a summary like "3 / 10 selected".
   * - `'tags'`: one removable chip per chosen item; its x button removes it.
   * `createTriggerContentElFn` overrides both (full control wins).
   */
  triggerDisplay?: 'count' | 'tags'
  /**
   * Item -> the visible content ELEMENT of its tag chip in `'tags'` mode,
   * without subclassing. Mirrors `createItemContentElFn` (the chip is to the
   * trigger what the option content is to the row):
   * - Return an `HTMLElement` and the library inserts it as the chip's content;
   *   the library still owns the chip container + the remove (x) button + aria.
   * - `null` (default, or returned for an item) = plain text from `itemToString`.
   * The remove button's accessible name is `"Remove <itemToString>"`.
   */
  createTagContentElFn?: (item: T) => HTMLElement | null
}

/**
 * Constructor-time settings input for {@link LLSelectMultiple}.
 */
export type LLSelectMultipleSettingsInput<T, GK = string> =
  & LLSelectBaseSettingsInput<T, GK>
  & {
    onChange?: (chosenItems: readonly T[]) => void
    createTriggerContentElFn?: (ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | null
    triggerDisplay?: 'count' | 'tags'
    createTagContentElFn?: (item: T) => HTMLElement | null
  }

/**
 * Multi-selection select. Clicking an item toggles its membership in the
 * chosen-items set and keeps the popup open. Each item DOM gets
 * `aria-selected="true|false"`; the popup list gets
 * `aria-multiselectable="true"`.
 *
 * Default trigger display is a count summary ("3 / 10 selected" / "All N
 * selected" / placeholder when empty). Pass `createTriggerContentElFn` (or
 * subclass `renderTriggerContent`) to customise (e.g. tag chips).
 *
 * @typeParam T - item type.
 */
export class LLSelectMultiple<T = unknown, GK = string> extends LLSelectBase<T, GK> {
  /** Currently chosen items, in insertion order. */
  protected chosenItems: T[] = []
  /** Optional change callback supplied via settings. */
  protected onChange: ((chosenItems: readonly T[]) => void) | undefined
  /** Optional trigger-content renderer supplied via settings. */
  protected createTriggerContentElFn:
    ((ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | null) | undefined
  /** Trigger display mode: count summary (default) or removable tag chips. */
  protected triggerDisplay: 'count' | 'tags'
  /** Optional per-chip content renderer for `'tags'` mode (mirrors createItemContentElFn). */
  protected createTagContentElFn: ((item: T) => HTMLElement | null) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T, GK>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.createTriggerContentElFn = settings?.createTriggerContentElFn
    this.triggerDisplay = settings?.triggerDisplay ?? 'count'
    this.createTagContentElFn = settings?.createTagContentElFn
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
    this.replacePopupListItemElInDom(item)
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
   * Orchestrator: composes `syncEmptyStateToDom` + `commitTriggerContentToDom`
   * to (re)build the trigger from state; touches no DOM directly. Default label
   * is a count summary; override (or pass the `createTriggerContentElFn`
   * setting) to display tags / custom markup / etc.
   *
   * - 0 chosen: placeholder
   * - 0 < n < total: `"n / total selected"`
   * - n === total > 0: `"All n selected"`
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const custom = this.createTriggerContentElFn?.({ chosenItems: this.getChosenItems(), items: this.getItems() }) ?? null
    if (custom !== null) {
      this.commitTriggerContentToDom(custom)
      return
    }
    if (this.triggerDisplay === 'tags' && this.chosenItems.length > 0) {
      this.commitTriggerContentToDom(this.createTagsEl())
      return
    }
    const n = this.chosenItems.length
    const total = this.items.length
    const text = n === 0
      ? this.settings.placeholder
      : n === total && total > 0
        ? `All ${n} selected`
        : `${n} / ${total} selected`
    this.commitTriggerContentToDom(text)
  }

  /**
   * Build the tag-list element for `'tags'` mode: one chip per chosen item.
   * Override for full control of the chip strip (the trigger-level equivalent
   * of overriding `createItemEl`).
   */
  protected createTagsEl(): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = this.classIdMap.tagsClass
    for (const item of this.chosenItems) {
      wrap.appendChild(this.createTagEl(item))
    }
    return wrap
  }

  /**
   * Build one removable tag chip: its content (from `createTagContentEl`, else
   * plain `itemToString`) plus a remove (x) button. The button is
   * `tabindex="-1"` with `aria-label="Remove <label>"`; clicking it removes the
   * item via `toggleItem` and stops propagation so it never opens the popup.
   */
  protected createTagEl(item: T): HTMLElement {
    const tag = document.createElement('span')
    tag.className = this.classIdMap.tagClass
    tag.appendChild(this.createTagContentEl(item) ?? document.createTextNode(this.itemToString(item)))
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = this.classIdMap.tagRemoveClass
    remove.tabIndex = -1
    remove.setAttribute('aria-label', `Remove ${this.itemToString(item)}`)
    remove.addEventListener('click', (ev) => {
      ev.stopPropagation()
      this.toggleItem(item)
    })
    tag.appendChild(remove)
    return tag
  }

  /**
   * Per-chip visible content in `'tags'` mode. Mirrors `createItemContentEl`.
   * Default reads `createTagContentElFn`, else `null` so `createTagEl` falls
   * back to plain text from `itemToString`.
   */
  protected createTagContentEl(item: T): HTMLElement | null {
    return this.createTagContentElFn ? this.createTagContentElFn(item) : null
  }

  /** No selection iff the chosen set is empty. Drives the trigger's `data-empty`. */
  protected override isEmpty(): boolean {
    return this.chosenItems.length === 0
  }

  /** Toggle on click. Multi mode keeps the popup open. */
  protected override onItemClick(item: T): void {
    this.toggleItem(item)
  }

  /** Clear button empties the chosen-items set to `[]`. */
  protected override clearSelection(): void {
    this.setChosenItems([])
  }

  /** Mark each item with `aria-selected` reflecting its chosen state. */
  protected override createItemEl(item: T, index: number): HTMLElement {
    const el = super.createItemEl(item, index)
    el.setAttribute('aria-selected', String(this.isChosen(item)))
    return el
  }

  /** Drop chosen entries that disappeared from the new items list. */
  protected override onItemsChanged(): void {
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
   * the first enabled item. Indices are into `getVisibleItems()`.
   */
  protected override focusInitial(): void {
    const list = this.getVisibleItems()
    const firstChosen = this.chosenItems[0]
    if (firstChosen !== undefined) {
      const idx = list.findIndex(i => this.settings.compareFn(i, firstChosen))
      if (idx >= 0 && !this.isItemDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    const first = this.findNextEnabledIndex(0, 1, list)
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
