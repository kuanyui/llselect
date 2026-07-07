import {
  LLSelectBase,
  type LLSelectBaseSettings,
} from './base.js'

/**
 * Trigger display mode of {@link LLSelectMultiple}.
 * - `'count'`: a text summary like "3 / 10 selected".
 * - `'tags'`: one removable chip per chosen item.
 * See {@link LLSelectMultipleSettings.triggerDisplay}.
 */
export type LLSelectTriggerDisplay = 'count' | 'tags'

/** Context passed to {@link LLSelectMultipleSettings.createTriggerContentElFn}. */
export interface LLSelectMultipleTriggerContext<T> {
  chosenItems: readonly T[]
  items: readonly T[]
}

/**
 * Resolved (defaults applied) settings for {@link LLSelectMultiple}: the base
 * settings plus the multi-mode fields - the runtime type of `this.settings`,
 * one bag built complete in the constructor.
 */
export interface LLSelectMultipleSettings<T, GK = string> extends LLSelectBaseSettings<T, GK> {
  /**
   * Fired when the chosen-items set actually changes. Does NOT fire on
   * construction nor on a setter call that yields an equivalent set
   * (element-wise compared via `compareFn`, order-sensitive).
   * `null` (default) = no listener.
   */
  onChange: ((chosenItems: readonly T[]) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen items
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup such as tag chips.
   * - fn returns `null` - use the default for this render (count summary / tags).
   * - setting is `null` (default) - always use that default rendering.
   * Checked before `renderTriggerContent`, so it wins over a subclass override.
   */
  createTriggerContentElFn: ((ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | null) | null
  /**
   * Trigger display mode.
   * - `'count'` (default): a summary like "3 / 10 selected".
   * - `'tags'`: one removable chip per chosen item; its x button removes it.
   * `createTriggerContentElFn` overrides both (full control wins).
   */
  triggerDisplay: LLSelectTriggerDisplay
  /**
   * Item -> the visible content ELEMENT of its tag chip in `'tags'` mode,
   * without subclassing. Mirrors `createItemContentElFn` (the chip is to the
   * trigger what the option content is to the row):
   * - Return an `HTMLElement` and the library inserts it as the chip's content;
   *   the library still owns the chip container + the remove (x) button + aria.
   * - `null` (setting default, or returned for an item) = plain text from
   *   `itemToString`.
   * The remove button's accessible name comes from `itemToTagRemoveLabel`
   * (default `Remove <itemToString>`).
   */
  createTagContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Icon ELEMENT of each tag's remove (x) button in `'tags'` mode, mirroring
   * `createClearElFn` (the clear button's icon hook). The library always owns the
   * button, its click (removes the item + `stopPropagation`), `tabindex="-1"`, and
   * the `aria-label` accessible name (from `itemToTagRemoveLabel`); this only
   * fills the decorative icon.
   * - Return an `HTMLElement` / `SVGElement`: appended inside the button as its icon.
   * - `null` (setting default, or returned for an item): no icon - the theme
   *   draws the x via its CSS glyph (`.llselect-tag-remove:empty::before`).
   */
  createTagRemoveElFn: ((item: T) => HTMLElement | SVGElement | null) | null
  /**
   * Item -> its remove button's accessible name (`aria-label`) in `'tags'`
   * mode. The i18n seam for the removal announcement.
   * - `null` (default) = `Remove <itemToString(item)>`.
   */
  itemToTagRemoveLabelFn: ((item: T) => string) | null
}

/**
 * Constructor-time settings input for {@link LLSelectMultiple}.
 * Every field is optional; missing fields use defaults.
 */
export type LLSelectMultipleSettingsInput<T, GK = string> = Partial<LLSelectMultipleSettings<T, GK>>

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
  /**
   * Re-type only (`declare` emits no field): the multi-mode fields are passed,
   * resolved, through `super()`, so the bag is complete before any base
   * construction code runs.
   */
  protected declare readonly settings: LLSelectMultipleSettings<T, GK>

  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T, GK>) {
    super(targetEl, settings, {
      onChange: settings?.onChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
      triggerDisplay: settings?.triggerDisplay ?? 'count',
      createTagContentElFn: settings?.createTagContentElFn ?? null,
      createTagRemoveElFn: settings?.createTagRemoveElFn ?? null,
      itemToTagRemoveLabelFn: settings?.itemToTagRemoveLabelFn ?? null,
    } satisfies Omit<LLSelectMultipleSettings<T, GK>, keyof LLSelectBaseSettings<T, GK>>)
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
    const custom = this.settings.createTriggerContentElFn?.({ chosenItems: this.getChosenItems(), items: this.getItems() }) ?? null
    if (custom !== null) {
      this.commitTriggerContentToDom(custom)
      return
    }
    if (this.settings.triggerDisplay === 'tags' && this.chosenItems.length > 0) {
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
   * plain `itemToString`) plus its remove (x) button (from `createTagRemoveEl`).
   * Override for full control of the chip container; override the two sub-parts
   * for content-only / remove-button-only changes.
   */
  protected createTagEl(item: T): HTMLElement {
    const tag = document.createElement('span')
    tag.className = this.classIdMap.tagClass
    // Same null-branch shape as createItemEl / createGroupEl: null = plain-text
    // default. Text must be set before the remove button (textContent wipes children).
    const content = this.createTagContentEl(item)
    if (content === null) {
      tag.textContent = this.itemToString(item)
    } else {
      tag.appendChild(content)
    }
    tag.appendChild(this.createTagRemoveEl(item))
    return tag
  }

  /**
   * Build one chip's remove (x) button. The library owns the button + its click
   * (`stopPropagation` so it never toggles the popup, then `toggleItem`) +
   * `tabindex="-1"` + `aria-label` (from `itemToTagRemoveLabel`);
   * `createTagRemoveElFn` optionally fills the icon, else the theme's CSS glyph.
   * Mirrors the clear button's `createClearEl`. Override for full control of
   * the button element.
   */
  protected createTagRemoveEl(item: T): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.classIdMap.tagRemoveClass
    btn.tabIndex = -1
    btn.setAttribute('aria-label', this.itemToTagRemoveLabel(item))
    const icon = this.settings.createTagRemoveElFn?.(item) ?? null
    if (icon !== null) { btn.appendChild(icon) }
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      this.toggleItem(item)
    })
    return btn
  }

  /**
   * Per-chip visible content in `'tags'` mode. Mirrors `createItemContentEl`.
   * Default reads `createTagContentElFn`, else `null` so `createTagEl` falls
   * back to plain text from `itemToString`.
   */
  protected createTagContentEl(item: T): HTMLElement | null {
    return this.settings.createTagContentElFn ? this.settings.createTagContentElFn(item) : null
  }

  /**
   * Item -> its remove button's accessible name in `'tags'` mode.
   * - Default reads `itemToTagRemoveLabelFn`, else `Remove <itemToString(item)>`.
   * - Override only when extending; configure via the setting.
   */
  protected itemToTagRemoveLabel(item: T): string {
    return this.settings.itemToTagRemoveLabelFn
      ? this.settings.itemToTagRemoveLabelFn(item)
      : `Remove ${this.itemToString(item)}`
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
    this.onChosenChanged()
    this.settings.onChange?.(this.chosenItems)
  }
}
