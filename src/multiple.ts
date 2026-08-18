import {
  LLSelectBase,
  type LLSelectBaseSettings,
  type LLSelectSettingsInputOf,
} from './base.js'

/**
 * Trigger display mode of {@link LLSelectMultiple}.
 * - `'count'`: a text summary like "3 / 10 selected".
 * - `'tags'`: one removable chip per chosen item.
 * See {@link LLSelectMultipleSettings.triggerDisplay}.
 * @group Settings
 * @category Multiple
 */
export type LLSelectTriggerDisplay = 'count' | 'tags'

/**
 * Tri-state of the choose-all row (also the `data-chosen-state` attribute
 * value): how much of the VISIBLE enabled subset is currently chosen.
 * @group Settings
 * @category Multiple
 */
export type LLSelectChosenState = 'none' | 'some' | 'all'

/**
 * Context passed to {@link LLSelectMultipleSettings.createTriggerContentElFn}.
 * @group Settings
 * @category Multiple
 */
export interface LLSelectMultipleTriggerContext<T> {
  chosenItems: readonly T[]
  items: readonly T[]
}

/**
 * Resolved (defaults applied) settings for {@link LLSelectMultiple}: the base
 * settings plus the multi-mode fields - the runtime type of `this.settings`,
 * one bag built complete in the constructor.
 * @group Settings
 * @category Multiple
 */
export interface LLSelectMultipleSettings<T, GK = string> extends LLSelectBaseSettings<T, GK> {
  /**
   * Fired when the chosen-items set actually changes. Receives the new set
   * and the PREVIOUS one (the snapshot from before this change) - diff them
   * with `compareFn` to compute added / removed. Does NOT fire on
   * construction nor on a setter call that yields an equivalent set
   * (element-wise compared via `compareFn`, order-sensitive).
   * `null` (default) = no listener.
   * @group Events
   */
  onChange: ((chosenItems: readonly T[], previousChosenItems: readonly T[]) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen items
   * + items (same convention as `createItemContentElFn`):
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup such as tag chips.
   * - fn returns `null` - use the default for this render (count summary / tags).
   * - setting is `null` (default) - always use that default rendering.
   * Checked before `renderTriggerContent`, so it wins over a subclass override.
   * @group Trigger
   */
  createTriggerContentElFn: ((ctx: LLSelectMultipleTriggerContext<T>) => HTMLElement | null) | null
  /**
   * Trigger display mode.
   * - `'count'` (default): a summary like "3 / 10 selected".
   * - `'tags'`: one removable chip per chosen item; its x button removes it.
   * `createTriggerContentElFn` overrides both (full control wins).
   * @group Trigger
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
   * - The remove button's accessible name comes from
   *   `itemToTagRemoveButtonAriaLabel` (default `Remove <itemToString>`) -
   *   that is what AT is guaranteed to announce. The chip is a generic `<span>` (ARIA prohibits naming it), so
   *   for icon-only content include your own (visually hidden) text if the
   *   chip should be announced as more than its remove button. See
   *   `docs/llm/A11Y.md` "Tags".
   * @group Trigger
   */
  createTagContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Icon ELEMENT of each tag's remove (x) button in `'tags'` mode, mirroring
   * `createTriggerClearButtonContentElFn` (the clear button's icon hook). The library always owns the
   * button, its click (removes the item + `stopPropagation`), `tabindex="-1"`, and
   * the `aria-label` accessible name (from `itemToTagRemoveButtonAriaLabel`);
   * this only fills the decorative icon.
   * - Return an `HTMLElement` / `SVGElement`: appended inside the button as its icon.
   * - `null` (setting default, or returned for an item): no icon - the theme
   *   draws the x via its CSS glyph (`.llselect-tag-remove-button:empty::before`).
   * @group Trigger
   */
  createTagRemoveButtonContentElFn: ((item: T) => HTMLElement | SVGElement | null) | null
  /**
   * Whether the popup shows a choose-all row (the industry's "select all"
   * feature) as the FIRST option of the
   * listbox (`false` default). Tri-state (none / some / all chosen - carried
   * by the counting text's numbers and the `data-chosen-state` CSS hook;
   * the accessible name comes from `uiTranslationPack.chooseAllRowText`);
   * Enter / click toggles. Acts on the VISIBLE
   * enabled subset (the filtered list while a filter query is active) - the
   * public `chooseAll` / `unchooseAll` / `toggleAll` keep their whole-list
   * semantics. See `docs/llm/A11Y.md` "Choose-all".
   * @group Choose-all
   */
  chooseAllRow: boolean
  /**
   * The choose-all row's visible content ELEMENT, without subclassing - e.g.
   * a tri-state SVG checkbox (`createOutlinedCheckboxSvgEl`) + the counting text. Mirrors
   * `createItemContentElFn`. Only used with `chooseAllRow: true`.
   * - Receives the tri-state and the counts of the visible enabled subset.
   * - Return an `HTMLElement`: inserted as the row's content; the accessible
   *   name stays pinned to `uiTranslationPack.chooseAllRowText` via `aria-label`, so
   *   icon-only content is still announced with the counts.
   * - `null` (setting default, or returned): the default content - just the
   *   plain counting text; its numbers carry the tri-state. The library
   *   ships no default indicator (consistent with items and the arrow);
   *   passing this setting is how one (e.g. `createOutlinedCheckboxSvgEl`)
   *   gets added. See DESIGN.md "Choose-all default: plain counting text".
   * @group Choose-all
   */
  createChooseAllRowContentElFn:
    ((chosenState: LLSelectChosenState, chosenCount: number, totalCount: number) => HTMLElement | null) | null
}

/**
 * Constructor-time settings input for {@link LLSelectMultiple}.
 * Every field is optional; missing fields use defaults.
 * @group Settings
 * @category Multiple
 */
export type LLSelectMultipleSettingsInput<T, GK = string> = LLSelectSettingsInputOf<LLSelectMultipleSettings<T, GK>>

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
 * @group Select classes
 */
export class LLSelectMultiple<T = unknown, GK = string> extends LLSelectBase<T, GK> {
  /**
   * Currently chosen items, in insertion order.
   * @group State (protected)
   */
  protected chosenItems: T[] = []
  /**
   * Re-type only (`declare` emits no field): the multi-mode fields are passed,
   * resolved, through `super()`, so the bag is complete before any base
   * construction code runs.
   * @group State (protected)
   */
  protected declare readonly settings: LLSelectMultipleSettings<T, GK>

  /**
   * Build the control inside `targetEl`. Settings are resolved once here
   * (missing fields get defaults) and are immutable afterwards.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T, GK>) {
    super(targetEl, settings, {
      onChange: settings?.onChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
      triggerDisplay: settings?.triggerDisplay ?? 'count',
      createTagContentElFn: settings?.createTagContentElFn ?? null,
      createTagRemoveButtonContentElFn: settings?.createTagRemoveButtonContentElFn ?? null,
      chooseAllRow: settings?.chooseAllRow ?? false,
      createChooseAllRowContentElFn: settings?.createChooseAllRowContentElFn ?? null,
    } satisfies Omit<LLSelectMultipleSettings<T, GK>, keyof LLSelectBaseSettings<T, GK>>)
    this.popupListEl.setAttribute('aria-multiselectable', 'true')
    this.renderTrigger()
  }

  /**
   * Return the currently chosen items (insertion order).
   * @group Selection
   */
  public getChosenItems(): readonly T[] {
    return this.chosenItems
  }

  /**
   * Replace the entire chosen-items list.
   * - The input is shallow-copied.
   * - Fires `onChange` only when the new list differs from the current one.
   *   The comparison is order-sensitive: chosen order is visible state
   *   (tags render in it).
   * - No disabled filtering: it can add and drop disabled items, unlike the
   *   `choose*` bulk ops. Assigning to a native `<select>` behaves the same.
   * @group Selection
   */
  public setChosenItems(items: T[]): void {
    const next = items.slice()
    if (this.arraysEqual(next, this.chosenItems)) { return }
    const previous = this.chosenItems
    this.chosenItems = next
    this.rerender()
    this.fireChange(previous)
  }

  /**
   * Whether the given item is currently chosen (via `compareFn`).
   * @group Selection
   */
  public isChosen(item: T): boolean {
    return this.chosenItems.some(c => this.settings.compareFn(c, item))
  }

  /**
   * Toggle the membership of `item` in the chosen-items set. Adds at the end
   * if not present; removes if present. Fires `onChange`.
   * @group Selection
   */
  public toggleItem(item: T): void {
    const previous = this.chosenItems
    const idx = previous.findIndex(c => this.settings.compareFn(c, item))
    if (idx >= 0) {
      this.chosenItems = [...previous.slice(0, idx), ...previous.slice(idx + 1)]
    } else {
      this.chosenItems = [...previous, item]
    }
    // Only one item's selection changed, so the popup list replaces just that
    // one row (plus the choose-all tri-state) instead of rebuilding every row -
    // O(1) in list size. The trigger is refreshed too; its cost depends on
    // triggerDisplay (count = constant, tags = one chip per chosen item,
    // custom = caller-defined), so the whole update is not unconditionally O(1).
    this.renderTrigger()
    this.replacePopupListItemElInDom(item)
    this.replaceLeadingRowElInDom()
    this.fireChange(previous)
  }

  /**
   * Choose every enabled item.
   * - Enabled-only, like every `choose*` bulk op. Bulk ops mirror clicking,
   *   and clicking cannot reach disabled items.
   * - Already-chosen disabled items are preserved. To change disabled items
   *   too, use `setChosenItems`.
   * - Fires `onChange` only when the chosen items actually change.
   * @group Selection
   */
  public chooseAll(): void {
    this.setChosenItems(this.items.filter(it => !this.isItemEffectivelyDisabled(it) || this.isChosen(it)))
  }

  /**
   * Unchoose every enabled item.
   * - Already-chosen disabled items are preserved. Bulk ops mirror clicking,
   *   and clicking cannot reach disabled items.
   * - Two paths DO drop them: the clear button, and `setChosenItems([])`.
   * - Fires `onChange` only when the chosen items actually change.
   * @group Selection
   */
  public unchooseAll(): void {
    this.setChosenItems(this.chosenItems.filter(c => this.isItemEffectivelyDisabled(c)))
  }

  /**
   * Toggle between "all enabled chosen" and "none chosen".
   * - Ignores disabled items, like every `choose*` bulk op.
   * - NOT the in-popup choose-all row's action. The row acts on the visible
   *   enabled subset only: see {@link toggleAllVisible}.
   * @group Selection
   */
  public toggleAll(): void {
    const enabled = this.items.filter(it => !this.isItemEffectivelyDisabled(it))
    const allChosen = enabled.length > 0 && enabled.every(it => this.isChosen(it))
    if (allChosen) { this.unchooseAll() } else { this.chooseAll() }
  }

  /**
   * Toggle the visible enabled items between all-chosen and all-unchosen.
   * - This is the choose-all row's action (the `chooseAllRow` setting) as a
   *   public method. The row delegates here.
   * - Acts on exactly the items that satisfy all of the following:
   *   - Visible: the item matches the active filter query. No query active:
   *     every item counts as visible. Same list as `getVisibleItems`.
   *   - Enabled: not disabled via `itemDisabledFn`, and not in a disabled
   *     group.
   * - All of them already chosen: unchooses exactly those.
   * - Otherwise: chooses the ones still missing.
   * - Choices outside that set (filtered-out or disabled) are preserved
   *   either way.
   * - No filter query active: the acted-on set is every enabled item, the
   *   same scope as `toggleAll`.
   * - Fires `onChange` only when the chosen items actually change.
   * @group Selection
   */
  public toggleAllVisible(): void {
    const actionable = this.getVisibleItems().filter(i => !this.isItemEffectivelyDisabled(i))
    if (actionable.length === 0) { return }
    const allChosen = actionable.every(i => this.isChosen(i))
    if (allChosen) {
      this.setChosenItems(this.chosenItems.filter(c =>
        !actionable.some(v => this.settings.compareFn(v, c))))
    } else {
      const additions = actionable.filter(v => !this.isChosen(v))
      this.setChosenItems([...this.chosenItems, ...additions])
    }
  }

  /**
   * Orchestrator: composes `syncEmptyStateToDom` + `commitTriggerContentToDom`
   * to (re)build the trigger from state; touches no DOM directly. Default text
   * is a count summary; override (or pass the `createTriggerContentElFn`
   * setting) to display tags / custom markup / etc.
   *
   * - 0 chosen: `placeholder`
   * - n > 0: `uiTranslationPack.triggerCountSummary(n, total)` (English default:
   *   `"n / total selected"`, or `"All n selected"` when all are chosen)
   * @group Subclassing: rendering
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const chosenCount = this.chosenItems.length
    const countValue = chosenCount === 0
      ? this.settings.placeholder
      : this.settings.uiTranslationPack.triggerCountSummary(chosenCount, this.items.length)
    const custom = this.settings.createTriggerContentElFn?.({ chosenItems: this.getChosenItems(), items: this.getItems() }) ?? null
    if (custom !== null) {
      this.commitTriggerContentToDom(custom, countValue)
      return
    }
    if (this.settings.triggerDisplay === 'tags' && chosenCount > 0) {
      // Accessible value = the item texts themselves; the chips (with their
      // labelled remove buttons) must not name the field.
      this.commitTriggerContentToDom(this.createTagsEl(), this.chosenItems.map((item) => this.itemToString(item)).join(', '))
      return
    }
    this.commitTriggerContentToDom(countValue)
  }

  /**
   * Build the tag-list element for `'tags'` mode: one chip per chosen item.
   * Override for full control of the chip strip (the trigger-level equivalent
   * of overriding `createItemEl`).
   * @group Subclassing: rendering
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
   * plain `itemToString`) plus its remove (x) button (from `createTagRemoveButtonEl`).
   * Override for full control of the chip container; override the two sub-parts
   * for content-only / remove-button-only changes.
   * @group Subclassing: rendering
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
    tag.appendChild(this.createTagRemoveButtonEl(item))
    return tag
  }

  /**
   * Build one chip's remove (x) button. The library owns the button + its click
   * (`stopPropagation` so it never toggles the popup, then `toggleItem`) +
   * `tabindex="-1"` + `aria-label` (from `itemToTagRemoveButtonAriaLabel`);
   * `createTagRemoveButtonContentElFn` optionally fills the icon, else the theme's CSS glyph.
   * Mirrors the clear button's `createTriggerClearButtonEl`. Override for full control of
   * the button element.
   * @group Subclassing: rendering
   */
  protected createTagRemoveButtonEl(item: T): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.classIdMap.tagRemoveButtonClass
    btn.tabIndex = -1
    btn.setAttribute('aria-label', this.itemToTagRemoveButtonAriaLabel(item))
    const icon = this.createTagRemoveButtonContentEl(item)
    if (icon !== null) { btn.appendChild(icon) }
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      this.toggleItem(item)
    })
    return btn
  }

  /**
   * One chip's remove-button visible content (its x icon). Mirrors
   * `createTriggerClearButtonContentEl`.
   * - Default reads `createTagRemoveButtonContentElFn`; `null` (setting unset,
   *   or returned) = no icon - the theme's CSS glyph draws the x.
   * - Override only when extending; for one-off icons pass the setting.
   * @group Subclassing: rendering
   */
  protected createTagRemoveButtonContentEl(item: T): HTMLElement | SVGElement | null {
    return this.settings.createTagRemoveButtonContentElFn
      ? this.settings.createTagRemoveButtonContentElFn(item)
      : null
  }

  /**
   * Per-chip visible content in `'tags'` mode. Mirrors `createItemContentEl`.
   * Default reads `createTagContentElFn`, else `null` so `createTagEl` falls
   * back to plain text from `itemToString`.
   * @group Subclassing: rendering
   */
  protected createTagContentEl(item: T): HTMLElement | null {
    return this.settings.createTagContentElFn ? this.settings.createTagContentElFn(item) : null
  }

  /**
   * Item -> its remove button's accessible name in `'tags'` mode.
   * - Default: `uiTranslationPack.tagRemoveButtonAriaLabel(itemToString(item))`.
   * - Override only when extending (e.g. a name from another item field);
   *   per-locale text goes through the `uiTranslationPack` setting.
   * @group Subclassing: semantics
   */
  protected itemToTagRemoveButtonAriaLabel(item: T): string {
    return this.settings.uiTranslationPack.tagRemoveButtonAriaLabel(this.itemToString(item))
  }

  /**
   * No selection iff the chosen set is empty. Drives the trigger's `data-empty`.
   * @group Subclassing: semantics
   */
  protected override isEmpty(): boolean {
    return this.chosenItems.length === 0
  }

  /**
   * Toggle on click. Multi mode keeps the popup open.
   * @group Subclassing: reactions
   */
  protected override onItemActivated(item: T): void {
    this.toggleItem(item)
  }

  /**
   * Clear button empties the chosen-items set to `[]`.
   * @group Subclassing: semantics
   */
  protected override clearSelection(): void {
    this.setChosenItems([])
  }

  /**
   * Build the choose-all row (`chooseAllRow` setting) as the listbox's
   * leading `role="option"` row: `data-chosen-state="none|some|all"` (a CSS
   * styling hook), `aria-selected` only when ALL visible
   * enabled items are chosen, accessible name + visible text from
   * `uiTranslationPack.chooseAllRowText(chosenCount, totalCount)` over the visible
   * enabled subset. `null` when the setting is off or nothing is actionable.
   * @group Subclassing: rendering
   */
  protected override createPopupListLeadingRowEl(): HTMLElement | null {
    if (!this.settings.chooseAllRow) { return null }
    const actionable = this.getVisibleItems().filter(i => !this.isItemEffectivelyDisabled(i))
    if (actionable.length === 0) { return null }
    const chosenCount = actionable.filter(i => this.isChosen(i)).length
    const state: LLSelectChosenState = chosenCount === 0 ? 'none' : chosenCount === actionable.length ? 'all' : 'some'
    const el = document.createElement('div')
    el.id = `${this.classIdMap.popupListId}-choose-all`
    el.className = `${this.classIdMap.itemClass} ${this.classIdMap.chooseAllRowClass}`
    el.setAttribute('role', 'option')
    el.setAttribute('data-chosen-state', state)
    // ARIA option has no `mixed`: the indeterminate state is conveyed by the
    // visual (data-chosen-state) + the counting accessible name only.
    el.setAttribute('aria-selected', String(state === 'all'))
    const text = this.settings.uiTranslationPack.chooseAllRowText(chosenCount, actionable.length)
    const content = this.createChooseAllRowContentEl(state, chosenCount, actionable.length)
    if (content === null) {
      // Default content: just the counting text - its numbers already carry
      // the tri-state, and the library ships no default indicator anywhere
      // (DESIGN.md "Choose-all default: plain counting text").
      el.textContent = text
    } else {
      // Custom content fills the visuals only; the accessible name stays the
      // counting text (same pinning as createItemEl's custom content).
      el.setAttribute('aria-label', text)
      el.appendChild(content)
    }
    el.addEventListener('click', () => {
      // Focus-then-activate, mirroring the item click wiring.
      this.focusLeadingRow()
      this.onLeadingRowActivated()
    })
    return el
  }

  /**
   * The choose-all row's visible content (rich tri-state). Mirrors
   * `createItemContentEl`.
   * - Default reads `createChooseAllRowContentElFn`; `null` (setting unset,
   *   or returned) = the default content: plain text from
   *   `uiTranslationPack.chooseAllRowText`.
   * - Override only when extending; for one-off content pass the setting.
   * @group Subclassing: rendering
   */
  protected createChooseAllRowContentEl(
    chosenState: LLSelectChosenState,
    chosenCount: number,
    totalCount: number,
  ): HTMLElement | null {
    return this.settings.createChooseAllRowContentElFn
      ? this.settings.createChooseAllRowContentElFn(chosenState, chosenCount, totalCount)
      : null
  }

  /**
   * Activate the choose-all row: delegates to {@link toggleAllVisible}.
   * @group Subclassing: reactions
   */
  protected override onLeadingRowActivated(): void {
    this.toggleAllVisible()
  }

  /**
   * Mark each item with `aria-selected` reflecting its chosen state.
   * @group Subclassing: rendering
   */
  protected override createItemEl(item: T, index: number): HTMLElement {
    const el = super.createItemEl(item, index)
    el.setAttribute('aria-selected', String(this.isChosen(item)))
    return el
  }

  /**
   * Drop chosen entries that disappeared from the new items list.
   * @group Subclassing: reactions
   */
  protected override onItemsChanged(): void {
    const previous = this.chosenItems
    const filtered = previous.filter(c =>
      this.items.some(item => this.settings.compareFn(item, c))
    )
    if (filtered.length === previous.length) { return }
    this.chosenItems = filtered
    this.renderTrigger()
    this.fireChange(previous)
  }

  /**
   * On open, focus the first chosen item (if present and enabled). Otherwise
   * the FIRST OPTION - which is the choose-all row when rendered (A11Y.md:
   * activedescendant points at the first chosen option, else the first
   * option; the row is the topmost option), so keyboard users discover it
   * immediately. Else the first enabled item. Indices are into
   * `getVisibleItems()`.
   * @group Subclassing: focus
   */
  protected override focusInitial(): void {
    const list = this.getVisibleItems()
    const firstChosen = this.chosenItems[0]
    if (firstChosen !== undefined) {
      const idx = list.findIndex(i => this.settings.compareFn(i, firstChosen))
      if (idx >= 0 && !this.isItemEffectivelyDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    if (this.focusLeadingRow()) { return }
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

  private fireChange(previousChosenItems: readonly T[]): void {
    this.onChosenChanged()
    this.settings.onChange?.(this.chosenItems, previousChosenItems)
  }
}
