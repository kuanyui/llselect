import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectBaseSettingsInput,
} from './base.js'

/**
 * Resolved settings for {@link LLSelectMultiple}. Extends the base settings
 * with the multi-mode `onChange` callback (chosen is an array).
 */
export interface LLSelectMultipleSettings<T> extends LLSelectBaseSettings<T> {
  /**
   * Fired when the chosen set actually changes. Does NOT fire on construction
   * nor on a setter call that yields an equivalent set (element-wise compared
   * via `compareFn`, order-sensitive).
   */
  onChange: (chosen: readonly T[]) => void
}

/**
 * Constructor-time settings input for {@link LLSelectMultiple}.
 */
export type LLSelectMultipleSettingsInput<T> =
  & LLSelectBaseSettingsInput<T>
  & { onChange?: (chosen: readonly T[]) => void }

/**
 * Multi-selection select. Clicking an item toggles its membership in the
 * chosen set and keeps the popup open. Each item DOM gets
 * `aria-selected="true|false"`; the popup list gets
 * `aria-multiselectable="true"`.
 *
 * Default trigger display is a count summary ("3 / 10 selected" / "All N
 * selected" / placeholder when empty). Subclass `renderTriggerContent`
 * to customise (e.g. tag chips).
 *
 * @typeParam T - item value type.
 */
export class LLSelectMultiple<T = unknown> extends LLSelectBase<T> {
  /** Currently selected values, in insertion order. */
  protected chosen: T[] = []
  /** Optional change callback supplied via settings. */
  protected onChange: ((chosen: readonly T[]) => void) | undefined

  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T>) {
    super(targetEl, settings)
    this.onChange = settings?.onChange
    this.popupListEl.setAttribute('aria-multiselectable', 'true')
    this.renderTrigger()
  }

  /** Return the currently selected values (insertion order). */
  public getChosen(): readonly T[] {
    return this.chosen
  }

  /**
   * Replace the entire chosen set. The input is shallow-copied. Fires
   * `onChange` only when the new set differs element-wise (order-sensitive)
   * from the current set.
   */
  public setChosen(chosen: T[]): void {
    const next = chosen.slice()
    if (this.arraysEqual(next, this.chosen)) { return }
    this.chosen = next
    this.reflectChosen()
    this.fireChange()
  }

  /** Whether the given value is currently chosen (via `compareFn`). */
  public isChosen(item: T): boolean {
    return this.chosen.some(c => this.settings.compareFn(c, item))
  }

  /**
   * Toggle the membership of `item` in the chosen set. Adds at the end if
   * not present; removes if present. Fires `onChange`.
   */
  public toggleItem(item: T): void {
    const idx = this.chosen.findIndex(c => this.settings.compareFn(c, item))
    if (idx >= 0) {
      this.chosen = [...this.chosen.slice(0, idx), ...this.chosen.slice(idx + 1)]
    } else {
      this.chosen = [...this.chosen, item]
    }
    this.reflectChosen()
    this.fireChange()
  }

  /** Select every current item. No-op if already all selected. */
  public selectAll(): void {
    if (this.chosen.length === this.items.length && this.items.length > 0) { return }
    this.chosen = this.items.slice()
    this.reflectChosen()
    this.fireChange()
  }

  /** Clear the chosen set. No-op if already empty. */
  public deselectAll(): void {
    if (this.chosen.length === 0) { return }
    this.chosen = []
    this.reflectChosen()
    this.fireChange()
  }

  /** Toggle between "all selected" and "none selected". */
  public toggleAll(): void {
    if (this.chosen.length === this.items.length && this.items.length > 0) {
      this.deselectAll()
    } else {
      this.selectAll()
    }
  }

  /**
   * Default trigger label: count summary. Override (or pass a future
   * `renderTriggerContent` setting) to display tags / custom HTML / etc.
   *
   * - 0 chosen: placeholder
   * - 0 < n < total: `"n / total selected"`
   * - n === total > 0: `"All n selected"`
   */
  protected override renderTriggerContent(): void {
    const n = this.chosen.length
    const total = this.items.length
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
    const filtered = this.chosen.filter(c =>
      this.items.some(item => this.settings.compareFn(item, c))
    )
    if (filtered.length === this.chosen.length) { return }
    this.chosen = filtered
    this.renderTrigger()
    this.fireChange()
  }

  /** On open, focus the first chosen item if any, otherwise the first item. */
  protected override focusInitial(): void {
    if (this.items.length === 0) { return }
    const first = this.chosen[0]
    if (first !== undefined) {
      const idx = this.items.findIndex(i => this.settings.compareFn(i, first))
      if (idx >= 0) {
        this.setFocusedIndex(idx)
        return
      }
    }
    this.setFocusedIndex(0)
  }

  /** Re-render trigger + popup list (the latter only if open). */
  private reflectChosen(): void {
    this.renderTrigger()
    if (this.isOpen) { this.renderPopupList() }
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
    this.onChange?.(this.chosen)
  }
}
