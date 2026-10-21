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
 * Order of the chosen items, as tags, `getChosenItems`, `onChange` and a
 * framework model see them. See `LLSelectMultipleSettings.chosenItemsOrder`.
 * @group Settings
 * @category Multiple
 */
export type LLSelectChosenItemsOrder = 'as-chosen' | 'as-listed'

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
export interface LLSelectMultipleSettings<T, GroupKey = string> extends LLSelectBaseSettings<T, GroupKey> {
  /**
   * Fired **after** the chosen-items set actually changed. Receives the new set
   * and the PREVIOUS one (the snapshot from before this change) - diff them
   * with `compareFn` to compute added / removed. Does NOT fire on
   * construction nor on a setter call that yields an equivalent set
   * (element-wise compared via `compareFn`, order-sensitive).
   * `null` (default) = no listener.
   *
   * > Pairs with `onBeforeChange`, which runs **before** a user change and can stop it.
   *
   * - When `chosenItemsOrder` is `'as-listed'`, the order is normalized first,
   *   so a same-set write in another order is no change for items the list
   *   holds.
   * - When `chosenItemsOrder` is `'as-listed'`, unlisted items go last,
   *   keeping their order relative to each other, so reordering them is a
   *   change.
   * - `meta.source` says who initiated the change: `'user'` for a pointer or
   *   keyboard interaction inside the select widget (an option toggle, a tag's
   *   remove button, the clear button, the choose-all row, an action row's
   *   `onActivate`), `'api'` for any programmatic call. See
   *   {@link LLSelectChangeMeta}.
   * - `meta.reason` says what the change did: `'choose'` or `'unchoose'`
   *   with the one toggled item in `meta.item`, `'clear'` for an empty
   *   whole-value write or an emptying bulk op, `'set'` for a whole-value
   *   write with items or a bulk op whose result is not empty, `'items'`
   *   for a `setItems` reconciliation. See {@link LLSelectChangeReason}.
   * - Runs **after** the value changed and the trigger was updated.
   * - `getChosenItems()` already returns the new value.
   * - A setter may be called from inside it. The nested `onChange` then
   *   reports `meta.source` `'api'`.
   * - A modal dialog may be opened, or focus moved, from inside it.
   * - Focus that already moved outside the select widget is not reclaimed.
   * - Moving focus outside the select widget closes the popup, as always.
   * @group Events
   */
  onChange: ((chosenItems: readonly T[], previousChosenItems: readonly T[], meta: LLSelectChangeMeta<T>) => void) | null
  /**
   * Fired **before** a user interaction changes the chosen items, with a way to
   * stop it.
   *
   * > Pairs with `onChange`, which runs **after** the change was written.
   *
   * - Fires for the library's own pointer and keyboard paths only: a row
   *   toggle in the popup, a tag chip's remove button, the clear button, the
   *   choose-all row. Programmatic setters, the `setItems` reconciliation and
   *   an action row's own setter calls never fire it.
   * - `nextChosenItems` is the list about to be set. `previousChosenItems`
   *   is the current one.
   * - `event.reason` and `event.item` say what the change would do, as in
   *   `onChange`.
   * - `event.preventDefault()` stops the change: nothing is written, nothing
   *   re-renders, `onChange` does not fire. The popup's open state does not
   *   change; a click has already moved the active option to the clicked row.
   * - A change that would change nothing never fires it: the clear button on
   *   an empty selection, the choose-all row with nothing to act on.
   * - Runs **after** the protected `onChosenChanging` hook. Both run, either may
   *   cancel, and `event.defaultPrevented` shows the hook's decision.
   * - A setter called from inside the handler wins, `setItems` included: the
   *   pending change is dropped. That change reports `meta.source` `'user'`,
   *   as the first change of the interaction.
   * - For a confirmation dialog: call `event.preventDefault()`, open the
   *   dialog, and call a setter after the user agreed. That change reports
   *   `meta.source` `'api'`.
   * - An error thrown by a handler propagates. The change does not happen.
   * - `null` (default) = nothing is called; no user change is ever stopped
   *   by it.
   * @group Events
   */
  onBeforeChange: ((nextChosenItems: readonly T[], previousChosenItems: readonly T[], event: LLSelectBeforeChangeEvent<T>) => void) | null
  /**
   * Render the trigger's content ELEMENT without subclassing - the setting
   * equivalent of overriding `renderTriggerContent`. Receives the chosen items
   * + items (same convention as `createPopupListItemContentElFn`):
   * - Called on **every** trigger content render (`renderTriggerContent`: every full trigger render, plus every `setItems`); nothing is kept for a later call.
   * - `HTMLElement` - inserted into the trigger as-is; you own it. Use this for
   *   real markup such as tag chips.
   * - fn returns `null` - use the default for this render (count summary / tags).
   * - setting is `null` (default) - always use that default rendering.
   * The DEFAULT `renderTriggerContent` checks it first; a subclass override
   * replaces that default entirely and may ignore the setting - override
   * wins, per DESIGN.md "Customization model".
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
   * without subclassing. Mirrors `createPopupListItemContentElFn` (the chip is to the
   * trigger what the option content is to the row):
   * - Called once per chosen item on **every** trigger content render (`renderTriggerContent`: every full trigger render, plus every `setItems`) while `triggerDisplay` is `'tags'`, unless `createTriggerContentElFn` returns an element; nothing is kept for a later call.
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
   * - The library sets the item's `lang` from `itemToLangFn` on the element
   *   you return, overwriting yours, when that function returns a code; it
   *   never removes the attribute.
   * @group Trigger
   */
  createTagContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Icon ELEMENT of each tag's remove (x) button in `'tags'` mode, mirroring
   * `createTriggerClearButtonContentElFn` (the clear button's icon hook). The library always owns the
   * button, its click (removes the item + `stopPropagation`), `tabindex="-1"`, and
   * the `aria-label` accessible name (from `itemToTagRemoveButtonAriaLabel`);
   * this only fills the decorative icon.
   * - Called once per chosen item on **every** trigger content render (`renderTriggerContent`: every full trigger render, plus every `setItems`) while `triggerDisplay` is `'tags'`, unless `createTriggerContentElFn` returns an element; nothing is kept for a later call.
   * - Return an `HTMLElement` / `SVGElement`: appended inside the button as its icon.
   * - `null` (setting default, or returned for an item): no icon - the theme
   *   draws the x via its CSS glyph (`.llselect-tag-remove-button:empty::before`).
   * @group Trigger
   */
  createTagRemoveButtonContentElFn: ((item: T) => HTMLElement | SVGElement | null) | null
  /**
   * Hide the rows of chosen items from the popup list.
   * - Default `false`: chosen rows stay listed and show their state.
   * - While `true`, choosing an item removes its row at once and unchoosing
   *   puts it back. Tags, the trigger and `getChosenItems` are unaffected.
   * - When every item is chosen, the popup shows the no-results element.
   * - With `chooseAllRow`, the visible subset is always fully unchosen, so
   *   the row acts as "choose everything still listed", its tri-state never
   *   reaches all-chosen, and it disappears with the last actionable row.
   * - Internals: a `getVisibleItems` subtraction. The default `compareFn`
   *   uses a Set lookup; a custom `compareFn` costs O(visible x chosen).
   *   Either cost is paid once per change of the list or the chosen set -
   *   the result is cached between changes. `toggleItem` swaps its O(1) row
   *   replace for a full rebuild.
   * @group Popup
   */
  hideChosenRows: boolean
  /**
   * Order of the chosen items. Tags, `getChosenItems`, `onChange` and a
   * framework model all see this order.
   * - `'as-chosen'` (default): the order the items were chosen in.
   *   `setChosenItems` keeps the caller's order.
   * - `'as-listed'`: the order of the item list. `setChosenItems([b, a])` is
   *   stored as `[a, b]`. When `setItems` reorders the list, the chosen
   *   items follow and `onChange` fires. A chosen item the list does not
   *   hold goes last, in chosen order, until the next `setItems` drops it.
   * - Cost of `'as-listed'`, per add or replace: a sort of the chosen items,
   *   O(chosen log chosen).
   * - The list positions come from a table built once per item list, O(list)
   *   after each `setItems`.
   * - A custom `compareFn` skips the table: each add or replace is
   *   O(chosen x list + chosen log chosen).
   * - A `setItems` that drops or reorders chosen items rebuilds an open popup
   *   a second time (see `setItems`).
   * @group Selection
   */
  chosenItemsOrder: LLSelectChosenItemsOrder
  /**
   * Whether the popup shows a choose-all row (the industry's "select all")
   * as the first option of the listbox.
   * - Default `false`.
   * - Activating the row (Enter, click, or Space while the filter is off)
   *   commits what `toggleAllVisible` computes, after the before-change
   *   gate: it toggles the items `getVisibleEnabledItems()`
   *   returns; that method's docstring defines exactly which items those
   *   are. The public `chooseAll` / `unchooseAll` / `toggleAll` keep their
   *   whole-list semantics.
   * - The row is tri-state (none / some / all chosen), carried by the
   *   counting text's numbers and the `data-chosen-state` CSS hook.
   * - Its accessible name comes from `uiTranslationPack.chooseAllRowText`.
   * - See `docs/llm/A11Y.md` "Choose-all".
   * @group Choose-all
   */
  chooseAllRow: boolean
  /**
   * The choose-all row's visible content ELEMENT, without subclassing - e.g.
   * a tri-state SVG checkbox (`createOutlinedCheckboxSvgEl`) + the counting text. Mirrors
   * `createPopupListItemContentElFn`. Only used with `chooseAllRow: true`.
   * - Called **every** time the choose-all row is built, which needs the popup open and an enabled visible item; nothing is kept for a later call:
   *   - on each full list render (`renderPopupList`);
   *   - on each `toggleItem` with `hideChosenRows` off, which rebuilds the row in place (with it on, `toggleItem` runs a full list render).
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
export type LLSelectMultipleSettingsInput<T, GroupKey = string> = LLSelectSettingsInputOf<LLSelectMultipleSettings<T, GroupKey>>

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
 * @typeParam GroupKey - group key type of `itemToGroupKeyFn`; see
 *   {@link LLSelectBase}.
 * @typeParam S - resolved settings type, for subclasses extending the
 *   settings bag; see {@link LLSelectBase}.
 * @group Select classes
 */
export class LLSelectMultiple<T = unknown, GroupKey = string, S extends LLSelectMultipleSettings<T, GroupKey> = LLSelectMultipleSettings<T, GroupKey>> extends LLSelectBase<T, GroupKey, S> {
  /**
   * Currently chosen items, in `chosenItemsOrder` order (chosen order by default).
   * @group State (protected)
   */
  // `readonly` so a subclass cannot `push`/`splice` it: every mutation must
  // REPLACE the array (the invariant both `chosenSetCache` and `visibleItemsCache`
  // rely on - a reference change is how they invalidate).
  protected chosenItems: readonly T[] = []

  /**
   * Build the control inside `targetEl`.
   * - Settings are resolved once here; missing fields get defaults.
   * - They are frozen afterwards, except `placeholder` and `uiTranslationPack`,
   *   which have runtime setters; the rule is at {@link LLSelectBaseSettings}.
   * - This plain form infers `T` from a typed callback in `settings` whose
   *   signature contains `T` (`itemToStringFn: (u: User) => ...`). With no
   *   such callback, pass `T` explicitly: `new LLSelectMultiple<string>(...)`.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectMultipleSettingsInput<T, GroupKey>)
  /**
   * Subclass form. `subclassSettings` is the typed pass-through for subclasses
   * that extend the settings bag further; see `LLSelectBase`'s `S` param.
   * @group Lifecycle
   */
  constructor(targetEl: HTMLElement, settings?: LLSelectSettingsInputOf<S>, subclassSettings?: Omit<S, keyof LLSelectMultipleSettings<T, GroupKey>>)
  constructor(targetEl: HTMLElement, settings?: LLSelectSettingsInputOf<S>, subclassSettings?: Omit<S, keyof LLSelectMultipleSettings<T, GroupKey>>) {
    const ownExtras = {
      onChange: settings?.onChange ?? null,
      onBeforeChange: settings?.onBeforeChange ?? null,
      createTriggerContentElFn: settings?.createTriggerContentElFn ?? null,
      triggerDisplay: settings?.triggerDisplay ?? 'count',
      createTagContentElFn: settings?.createTagContentElFn ?? null,
      createTagRemoveButtonContentElFn: settings?.createTagRemoveButtonContentElFn ?? null,
      hideChosenRows: settings?.hideChosenRows ?? false,
      chosenItemsOrder: settings?.chosenItemsOrder ?? 'as-chosen',
      chooseAllRow: settings?.chooseAllRow ?? false,
      createChooseAllRowContentElFn: settings?.createChooseAllRowContentElFn ?? null,
    } satisfies Omit<LLSelectMultipleSettings<T, GroupKey>, keyof LLSelectBaseSettings<T, GroupKey>>
    // Cast mirrored from the base constructor: TS cannot prove "own extras +
    // Omit<S, own keys>" reassembles a generic S's extras. Own extras stay
    // satisfies-checked above; incoming extras are param-typed.
    super(targetEl, settings, { ...ownExtras, ...subclassSettings } as Omit<S, keyof LLSelectBaseSettings<T, GroupKey>>)
    this.popupListEl.setAttribute('aria-multiselectable', 'true')
    this.renderTrigger()
  }

  /**
   * Return the currently chosen items, in `chosenItemsOrder` order (chosen order by default).
   * @group Selection
   */
  public getChosenItems(): readonly T[] {
    return this.chosenItems
  }

  /**
   * Replace the entire chosen-items list.
   * - The input is copied, and duplicates (per `compareFn`) collapse to
   *   their first occurrence: the chosen items are a set.
   * - Fires `onChange` only when the new list differs from the current one.
   *   The comparison is order-sensitive: chosen order is visible state
   *   (tags render in it).
   * - When `chosenItemsOrder` is `'as-listed'`, the input is first put in list
   *   order, so a write of the same set in another order is no change for
   *   items the list holds.
   * - When `chosenItemsOrder` is `'as-listed'`, unlisted items go last,
   *   keeping their order relative to each other.
   * - It ignores disabled state: it can add and drop disabled items, unlike
   *   the `choose*` bulk ops. Assigning to a native `<select>` behaves the
   *   same.
   * @group Selection
   */
  public setChosenItems(chosenItems: readonly T[]): void {
    const next = this.normalizeChosen(chosenItems)
    if (this.arraysEqual(next, this.chosenItems)) { return }
    const previous = this.chosenItems
    this.chosenItems = next
    this.rerender()
    this.fireChange(previous, next.length === 0 ? 'clear' : 'set')
  }

  /**
   * Whether the given item is currently chosen (via `compareFn`).
   * @group Selection
   */
  public isChosen(item: T): boolean {
    // Default (identity) compareFn: O(1) Set membership instead of a linear scan,
    // so a multi popup render is O(visible), not O(visible x chosen). The Set is
    // memoized and invalidated by the chosenItems array reference - every mutation
    // replaces the array, never mutates in place (mirrors visibleItemsCache). A
    // custom compareFn cannot hash, so it stays linear. The Set is SameValueZero,
    // and so is defaultCompareFn, so NaN behaves the same on both paths.
    if (this.settings.compareFn === defaultCompareFn) { return this.chosenSet().has(item) }
    const compareFn = this.settings.compareFn
    return this.chosenItems.some(c => compareFn(c, item))
  }

  private chosenSetCache: { chosen: readonly T[], set: Set<T> } | null = null

  /** Memoized Set of `chosenItems` for the default-compareFn `isChosen` fast path. */
  private chosenSet(): Set<T> {
    const cache = this.chosenSetCache
    if (cache !== null && cache.chosen === this.chosenItems) { return cache.set }
    const set = new Set(this.chosenItems)
    this.chosenSetCache = { chosen: this.chosenItems, set }
    return set
  }

  /**
   * Toggle the membership of `item` in the chosen-items set. Fires `onChange`.
   * - If the item is not chosen, it is added at the end.
   * - When `chosenItemsOrder` is `'as-listed'`, it is added at its list
   *   position instead.
   * - If the item is chosen, it is removed.
   * - While `hideChosenRows` is on, the popup list is rebuilt so the row
   *   leaves or re-enters it.
   * @group Selection
   */
  public toggleItem(item: T): void {
    const previous = this.chosenItems
    const { next, removed, changedItem } = this.nextAfterToggle(item)
    this.chosenItems = next
    // Only one item's selection changed, so the popup list replaces just that
    // one row (plus the choose-all tri-state) instead of rebuilding every row -
    // O(1) in list size. Exceptions: hideChosenRows moves the row in or out of
    // the list and shifts the indexes, so it rebuilds the list instead;
    // chosenItemsOrder 'as-listed' sorts the chosen items on every add. The
    // trigger is refreshed too; its cost depends on triggerDisplay (count =
    // constant, tags = one chip per chosen item, custom = caller-defined), so
    // the whole update is not unconditionally O(1).
    this.renderTrigger()
    if (this.settings.hideChosenRows) {
      if (this.isOpened()) { this.renderPopupList() }
    } else {
      this.replacePopupListItemElInDom(item)
      this.replaceChooseAllRowElInDom()
    }
    this.fireChange(previous, removed ? 'unchoose' : 'choose', changedItem)
  }

  /**
   * Choose every enabled item.
   * - It chooses only enabled items from the current item list, like every
   *   `choose*` bulk op. Bulk ops mirror clicking, and clicking cannot reach
   *   disabled items.
   * - Already-chosen disabled items in the current item list are preserved.
   *   To change disabled items too, use `setChosenItems`.
   * - `setChosenItems()` and `toggleItem()` accept items outside the current
   *   item list. If a chosen item is outside that list, this method drops it
   *   when it rebuilds the selection, disabled or not.
   * - Fires `onChange` only when the chosen items actually change.
   * @group Selection
   */
  public chooseAll(): void {
    this.setChosenItems(this.items.filter(it => !this.isItemEffectivelyDisabled(it) || this.isChosen(it)))
  }

  /**
   * Unchoose every enabled item.
   * - It filters the chosen set: every enabled chosen item leaves the
   *   selection, even if the item is outside the current item list.
   * - Every disabled chosen item stays chosen, even if the item is outside
   *   the current item list.
   * - Clicking a disabled item does not change its selection state, and this
   *   method follows that rule.
   * - The paths that DO drop them:
   *   - the clear button, when `clearable` is on and the control is enabled;
   *   - `toggleItem()` with the item;
   *   - `setChosenItems()` with a selection that excludes the item;
   *   - `setItems()` with a list that no longer contains the item;
   *   - `chooseAll()`, if the item is outside the current item list: it
   *     rebuilds the selection from that list, which drops the item
   *     (`setChosenItems()` and `toggleItem()` can select items outside
   *     the list);
   *   - `toggleAll()`, if the item is outside the current item list, in the
   *     two cases where it calls `chooseAll()`: the list has no enabled item,
   *     or an enabled item in the list is unchosen.
   * - Fires `onChange` only when the chosen items actually change.
   * @group Selection
   */
  public unchooseAll(): void {
    this.setChosenItems(this.chosenItems.filter(c => this.isItemEffectivelyDisabled(c)))
  }

  /**
   * Toggle between "all enabled chosen" and "all enabled unchosen".
   * - If the current item list holds at least one enabled item and every
   *   enabled item is chosen:
   *   - It calls `unchooseAll()`.
   *   - Every enabled chosen item leaves the selection, even if the item is
   *     outside the current item list.
   *   - Every disabled chosen item stays chosen, even if the item is outside
   *     the current item list.
   * - Otherwise:
   *   - It calls `chooseAll()`.
   *   - Every enabled item in the current item list becomes chosen.
   *   - Disabled chosen items in the current item list stay chosen.
   *   - Chosen items outside the current item list leave the selection,
   *     disabled or not.
   * - Disabled items in the current item list keep their selection state,
   *   like with every `choose*` bulk op.
   * - This is NOT the in-popup choose-all row's action. The row acts on the
   *   visible enabled subset only: see {@link toggleAllVisible}.
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
   *   public method. The row computes the same next value and commits it
   *   through the before-change gate, so an override here does not change
   *   the row.
   * - Acts on exactly the items that satisfy all of the following:
   *   - Visible: the item is in `getVisibleItems()`. It matches the active
   *     filter query, and with `hideChosenRows` it is not chosen. With no
   *     query and without `hideChosenRows`, every item is visible.
   *   - Enabled: not disabled via `itemDisabledFn`, and not in a disabled
   *     group.
   * - If all of them are already chosen, it unchooses exactly those.
   * - Otherwise, it chooses the ones still missing.
   * - When `hideChosenRows` is on, a chosen item is not visible, so this
   *   method only chooses.
   * - If this method does not act on a chosen item, that item stays chosen.
   *   This covers:
   *   - items hidden by the active filter query;
   *   - items hidden by `hideChosenRows`;
   *   - disabled items;
   *   - chosen items outside the current item list (`setChosenItems()` and
   *     `toggleItem()` accept such items).
   * - When there is no filter query and `hideChosenRows` is off, this method
   *   acts on every enabled item of the current item list.
   * - `toggleAll` can drop chosen items outside the current item list:
   *   - If the current item list has no enabled item, or an enabled item in
   *     that list is unchosen, `toggleAll` calls `chooseAll()`. That call
   *     drops every chosen item outside the list, disabled or not.
   *   - Otherwise `toggleAll` calls `unchooseAll()`. That call clears every
   *     enabled chosen item outside the list and keeps the disabled ones.
   * - Fires `onChange` only when the chosen items actually change.
   * - The acted-on set is computed by the overridable method `getVisibleEnabledItems`,
   *   shared with the choose-all row.
   * @group Selection
   */
  public toggleAllVisible(): void {
    const next = this.nextAfterToggleAllVisible()
    if (next !== null) { this.setChosenItems(next) }
  }

  /**
   * What the choose-all row would commit: the normalized next chosen array,
   * or `null` when nothing is actionable. Shared by `toggleAllVisible` and
   * the before-change gate, so the hook sees exactly what the setter commits.
   */
  private nextAfterToggleAllVisible(): T[] | null {
    const actionable = this.getVisibleEnabledItems()
    if (actionable.length === 0) { return null }
    const allChosen = actionable.every(i => this.isChosen(i))
    if (allChosen) {
      const compareFn = this.settings.compareFn
      return this.normalizeChosen(this.chosenItems.filter(c => !actionable.some(v => compareFn(v, c))))
    }
    const additions = actionable.filter(v => !this.isChosen(v))
    return this.normalizeChosen([...this.chosenItems, ...additions])
  }

  /**
   * Dedupe and order a raw chosen array: set semantics, as compareFn's
   * contract promises. The choose* bulk ops filter through isChosen and never
   * produce duplicates; setChosenItems is the one door raw arrays (framework
   * model write-back included) come in through, so the dedup lives here.
   */
  private normalizeChosen(chosenItems: readonly T[]): T[] {
    let next: T[]
    if (this.settings.compareFn === defaultCompareFn) {
      next = [...new Set(chosenItems)]
    } else {
      next = []
      const compareFn = this.settings.compareFn
      for (const item of chosenItems) {
        if (!next.some(c => compareFn(c, item))) { next.push(item) }
      }
    }
    return this.orderChosen(next)
  }

  /**
   * What a toggle of `item` would do: the next chosen array, whether the item
   * leaves, and the entry that changes. Shared by `toggleItem` and the
   * before-change gate, so the hook sees exactly what the setter commits.
   * - The removed entry is the STORED one: with a key-based compareFn the
   *   caller's `item` may be a different, equal object, and meta.item must
   *   name what left the selection.
   */
  private nextAfterToggle(item: T): { next: T[]; removed: boolean; changedItem: T } {
    const previous = this.chosenItems
    const compareFn = this.settings.compareFn
    const idx = previous.findIndex(c => compareFn(c, item))
    const removed = idx >= 0
    const changedItem = removed ? previous[idx]! : item
    const next = removed
      ? [...previous.slice(0, idx), ...previous.slice(idx + 1)]
      : this.orderChosen([...previous, item])
    return { next, removed, changedItem }
  }

  /**
   * Return the items a "select all" acts on: the visible, enabled ones.
   * - Visible: the item is in `getVisibleItems()`. It matches the active
   *   filter query, and with `hideChosenRows` it is not chosen. With no
   *   query and without `hideChosenRows`, every item is visible.
   * - Enabled: not disabled via `itemDisabledFn`, and not in a disabled group.
   * - The choose-all row (its counts, its tri-state, its click) and
   *   `toggleAllVisible()` both read this method.
   * - Use it to build your own select-all as an action row, for example in
   *   the trailing rows: count the chosen items with `isChosen`, write the
   *   text with `getUiTranslationPack().chooseAllRowText(chosen, total)`, and
   *   call `toggleAllVisible()` from `onActivate`.
   * - Such a row is a command, not the built-in row. It has no `aria-selected`
   *   and no `data-chosen-state`, the themes give it no tri-state look, it is
   *   never the active option when the popup opens, and it stays rendered
   *   when this list is empty. For those behaviors, use `chooseAllRow`.
   * - Override it to change the subset. The tree-select demo narrows it to
   *   leaf nodes; the choose-all row and `toggleAllVisible()` follow the
   *   override.
   * @group Selection
   */
  public getVisibleEnabledItems(): readonly T[] {
    return this.getVisibleItems().filter(i => !this.isItemEffectivelyDisabled(i))
  }

  /**
   * hideChosenRows subtraction cache. Every layer above (items, gather,
   * filter) and the chosen set REPLACE their arrays on change, never mutate
   * in place - so two reference checks are a complete validity test and no
   * invalidation wiring is needed.
   */
  private visibleItemsCache: { base: readonly T[], chosen: readonly T[], result: readonly T[] } | null = null

  /**
   * Return the items the popup list renders, in display order.
   *
   * ```text
   * base visible items   (LLSelectBase.getVisibleItems: gather + filter)
   *   |  minus chosen    (only while hideChosenRows is on; result cached)
   *   v
   * visible items        (this method's return value)
   * ```
   *
   * - Identical to the base behavior, minus the chosen items while
   *   `hideChosenRows` is on.
   * - While `hideChosenRows` is on and something is chosen, it returns a
   *   cached fresh array, not the live internal one.
   * - The subtraction recomputes only when the base list or the chosen set
   *   changed. Calls in between return the same cached array.
   * @group Items
   */
  public override getVisibleItems(): readonly T[] {
    const list = super.getVisibleItems()
    if (!this.settings.hideChosenRows || this.chosenItems.length === 0) { return list }
    const cache = this.visibleItemsCache
    if (cache !== null && cache.base === list && cache.chosen === this.chosenItems) { return cache.result }
    let result: readonly T[]
    if (this.settings.compareFn === defaultCompareFn) {
      const chosen = new Set(this.chosenItems)
      result = list.filter(it => !chosen.has(it))
    } else {
      result = list.filter(it => !this.isChosen(it))
    }
    this.visibleItemsCache = { base: list, chosen: this.chosenItems, result }
    return result
  }

  /**
   * Orchestrator: composes `syncEmptyStateToDom` + `commitTriggerContentToDom`
   * to (re)build the trigger from state; touches no DOM directly. Default text
   * is a count summary; override (or pass the `createTriggerContentElFn`
   * setting) to display tags / custom markup / etc.
   *
   * - If 0 items are chosen, the text is `placeholder`.
   * - If n > 0, the text is `uiTranslationPack.triggerCountSummary(n, total)`
   *   (English default: `"n / total selected"`, or `"All n selected"` when
   *   all are chosen).
   * @group Subclassing: rendering
   */
  protected override renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    const chosenCount = this.chosenItems.length
    const countValue = chosenCount === 0
      ? this.settings.placeholder
      : this.settings.uiTranslationPack.triggerCountSummary(chosenCount, this.items.length)
    const fn = this.settings.createTriggerContentElFn
    const custom = fn?.({ chosenItems: this.getChosenItems(), items: this.getItems() }) ?? null
    // The value mirror carries the one chosen item's language while it shows
    // exactly that item's text (tags mode, one chip); joined texts and the
    // count summary are mixed or pack language and carry none.
    const mirrorLang = custom === null && this.settings.triggerDisplay === 'tags' && chosenCount === 1 ? this.itemToLang(this.chosenItems[0]!) : null
    this.commitLangToDom(this.triggerValueEl, mirrorLang)
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
   * of overriding `createPopupListItemEl`).
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
   * plain `itemToString` in a span of its own) plus its remove (x) button (from
   * `createTagRemoveButtonEl`). The content element carries the item's `lang`
   * from `itemToLang` when it returns one; the button never does.
   * A chip whose item is effectively disabled gets `aria-disabled="true"` +
   * `tagDisabledClass`, and its x turns inert - mirroring a disabled option row.
   * Override for full control of the chip container; override the two sub-parts
   * for content-only / remove-button-only changes.
   * @group Subclassing: rendering
   */
  protected createTagEl(item: T): HTMLElement {
    const tag = document.createElement('span')
    tag.className = this.classIdMap.tagClass
    // Same null-branch shape as createPopupListItemEl / createGroupEl: null = plain-text
    // default. The text sits in its own span so the item's `lang` covers the
    // text and not the remove button, whose name mixes pack and item text.
    const content = this.createTagContentEl(item)
    const lang = this.itemToLang(item)
    if (content === null) {
      const text = document.createElement('span')
      text.className = this.classIdMap.tagTextClass
      text.textContent = this.itemToString(item)
      this.commitLangToDom(text, lang)
      tag.appendChild(text)
    } else {
      // App-owned content: the library sets or overwrites the attribute when the
      // function returns a code, and never removes it.
      if (lang !== null) { this.commitLangToDom(content, lang) }
      tag.appendChild(content)
    }
    if (this.isItemEffectivelyDisabled(item)) {
      // Mirror createPopupListItemEl's disabled marking: aria-disabled + the class grey the
      // chip so its inert x reads as disabled, not broken (A11Y.md Tags).
      tag.setAttribute('aria-disabled', 'true')
      tag.classList.add(this.classIdMap.tagDisabledClass)
    }
    tag.appendChild(this.createTagRemoveButtonEl(item))
    return tag
  }

  /**
   * Build one chip's remove (x) button. The library owns the button + its click
   * (`stopPropagation` so it never toggles the popup, then the gated toggle,
   * which `onChosenChanging` and `onBeforeChange` may stop, else `toggleItem`; a no-op
   * while the whole control OR the item itself is disabled) + `tabindex="-1"` +
   * `aria-label` (from `itemToTagRemoveButtonAriaLabel`). An effectively-disabled
   * item's button also gets `aria-disabled="true"`.
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
    if (this.isItemEffectivelyDisabled(item)) { btn.setAttribute('aria-disabled', 'true') }
    const icon = this.createTagRemoveButtonContentEl(item)
    if (icon !== null) { btn.appendChild(icon) }
    // Keep DOM focus where it is. A mousedown would focus the button (a
    // tabindex="-1" button is still click-focusable), and the click then
    // rebuilds the chip strip and destroys it: focus drops to <body>, and
    // engines differ on whether a focusout fires (TODO.md). Either way is
    // wrong - a silent drop strands an open popup without its focus host and
    // skips onBlur; a fired focusout closes the popup and reports a blur for a
    // click inside the select widget. Same rule as the popup's mousedown (A11Y.md).
    btn.addEventListener('mousedown', (ev) => { ev.preventDefault() })
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      // Tag chips sit in the trigger, reachable while the whole control or the
      // item itself is disabled. Both block removal (A11Y.md: only user
      // re-toggling is blocked; the item stays chosen). toggleItem stays
      // disabled-blind so the programmatic channel matches native <select>.
      if (this.isDisabled()) { return }
      if (this.isItemEffectivelyDisabled(item)) { return }
      this.focusTriggerIfUnfocused()
      // The focus may run onFocus; a listener that disabled or destroyed the
      // control, removed the item, or reloaded it as a disabled object leaves
      // nothing for this click to remove, and a toggle would add a removed
      // item back. The checks read the chosen entry as it stands now, since a
      // reload swaps the stored object for a compare-equal one. A listener
      // that opened the popup or loaded enabled items does not stop the
      // removal.
      if (this.destroyed || this.isDisabled()) { return }
      const compareFn = this.settings.compareFn
      // By index: an item may itself be `undefined`, which `find` could not tell from no entry.
      const at = this.chosenItems.findIndex(c => compareFn(c, item))
      if (at < 0) { return }
      const current = this.chosenItems[at] as T
      if (this.isItemEffectivelyDisabled(current)) { return }
      this.withUserChangeSource(() => this.requestAndToggle(current))
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
    const fn = this.settings.createTagRemoveButtonContentElFn
    return fn ? fn(item) : null
  }

  /**
   * Per-chip visible content in `'tags'` mode. Mirrors `createPopupListItemContentEl`.
   * Default reads `createTagContentElFn`, else `null` so `createTagEl` falls
   * back to plain text from `itemToString`.
   * @group Subclassing: rendering
   */
  protected createTagContentEl(item: T): HTMLElement | null {
    const fn = this.settings.createTagContentElFn
    return fn ? fn(item) : null
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
   * Toggle the item **after** Enter on its row while it is the active row, Space
   * on it while the filter is inactive, or a click on it, once `onChosenChanging`
   * and `onBeforeChange` allowed it. Multi mode keeps the popup open either way.
   *
   * > No **before** counterpart: there is no `onPopupListItemActivating`.
   * @group Subclassing: reactions
   */
  protected override onPopupListItemActivated(item: T): void {
    this.requestAndToggle(item)
  }

  /** The gated toggle shared by the row activation and the tag remove button. */
  private requestAndToggle(item: T): void {
    const { next, removed, changedItem } = this.nextAfterToggle(item)
    if (this.requestUserChange(next, removed ? 'unchoose' : 'choose', changedItem)) { this.toggleItem(item) }
  }

  /**
   * Clear button empties the chosen-items set to `[]`, after asking
   * `onChosenChanging` and `onBeforeChange`.
   * @group Subclassing: semantics
   */
  protected override clearSelection(): void {
    if (this.requestUserChange([], 'clear')) { this.setChosenItems([]) }
  }

  /**
   * Subclass hook: called **before** a user interaction changes the chosen items,
   * with the way to stop it. Default no-op.
   *
   * > Pairs with `onChosenChanged`, which runs **after** the change was written.
   *
   * - Runs **before** the `onBeforeChange` setting. Both run, either may call
   *   `event.preventDefault()`.
   * - The parameters are the setting's: the list about to be set, the
   *   current one, the event.
   * @group Subclassing: reactions
   */
  protected onChosenChanging(_nextChosenItems: readonly T[], _previousChosenItems: readonly T[], _event: LLSelectBeforeChangeEvent<T>): void {}

  /**
   * The gate every user path to a change runs through: skips a no-op, asks the
   * hook and the setting, and says whether the setter may run.
   */
  private requestUserChange(next: readonly T[], reason: 'choose' | 'unchoose', item: T): boolean
  private requestUserChange(next: readonly T[], reason: 'clear' | 'set'): boolean
  private requestUserChange(next: readonly T[], reason: 'choose' | 'unchoose' | 'clear' | 'set', item?: T): boolean {
    const previous = this.chosenItems
    if (this.arraysEqual(next, previous)) { return false }
    const revision = this.changeRevision
    const allowed = this.dispatchBeforeChange(reason === 'choose' || reason === 'unchoose' ? { reason, item: item as T } : { reason }, (event) => {
      this.onChosenChanging(next, previous, event)
      const fn = this.settings.onBeforeChange
      fn?.(next, previous, event)
    })
    // A setter called inside the handlers wins, setItems included: the pending
    // change is dropped, even when the handler restored the previous value.
    return allowed && this.changeRevision === revision
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
  protected override createPopupListChooseAllRowEl(): HTMLElement | null {
    if (!this.settings.chooseAllRow) { return null }
    const actionable = this.getVisibleEnabledItems()
    if (actionable.length === 0) { return null }
    const chosenCount = actionable.filter(i => this.isChosen(i)).length
    const state: LLSelectChosenState = chosenCount === 0 ? 'none' : chosenCount === actionable.length ? 'all' : 'some'
    const el = document.createElement('div')
    el.id = `${this.classIdMap.popupListId}-choose-all`
    el.className = `${this.classIdMap.popupListRowClass} ${this.classIdMap.chooseAllRowClass}`
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
      // counting text (same pinning as createPopupListItemEl's custom content).
      el.setAttribute('aria-label', text)
      el.appendChild(content)
    }
    el.addEventListener('click', () => {
      // Focus-then-activate, mirroring the item click wiring, guard included.
      const stamp = this.captureStateStamp()
      this.focusChooseAllRow()
      if (this.stateMovedSince(stamp)) { return }
      this.withUserChangeSource(() => this.onChooseAllRowActivated())
    })
    return el
  }

  /**
   * The choose-all row's visible content (rich tri-state). Mirrors
   * `createPopupListItemContentEl`.
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
    const fn = this.settings.createChooseAllRowContentElFn
    return fn ? fn(chosenState, chosenCount, totalCount) : null
  }

  /**
   * Runs **after** Enter on the active choose-all row, Space on it while the
   * filter is inactive, or a click on it, as the library's response to that
   * input.
   *
   * > No **before** counterpart: there is no `onChooseAllRowActivating`.
   *
   * - Computes what {@link toggleAllVisible} would commit.
   * - Asks `onChosenChanging` and `onBeforeChange` with that value.
   * - Then commits exactly that value, even if a handler changed which items
   *   are enabled.
   * @group Subclassing: reactions
   */
  protected override onChooseAllRowActivated(): void {
    const next = this.nextAfterToggleAllVisible()
    if (next === null) { return }
    if (this.requestUserChange(next, next.length === 0 ? 'clear' : 'set')) { this.setChosenItems(next) }
  }

  /**
   * Mark each item with `aria-selected` reflecting its chosen state.
   * @group Subclassing: rendering
   */
  protected override createPopupListItemEl(item: T, index: number): HTMLElement {
    const el = super.createPopupListItemEl(item, index)
    el.setAttribute('aria-selected', String(this.isChosen(item)))
    return el
  }

  /**
   * Re-match the chosen entries against the new list **after** `setItems` installs it.
   *
   * > No **before** counterpart: there is no `onItemsChanging`.
   *
   * - Entries the list no longer holds (by `compareFn`) are dropped and
   *   `onChange` fires for the drop.
   * - When the list holds a compareFn-equal but DIFFERENT object (`track by`
   *   style reload: same key, fresh fields), the stored reference is swapped
   *   to the list's object. A reference swap is not a logical change, so it
   *   does not fire `onChange`.
   * - The trigger content re-renders after every `setItems`, swap or not.
   * - Why: the count summary shows the list total, and a custom
   *   `createTriggerContentElFn` receives `items`.
   * - The arrow re-renders only when a chosen entry is dropped, because that
   *   runs the whole trigger.
   * - `triggerDisplay: 'tags'` is opt-in; `'count'` is the default.
   * - When `triggerDisplay` is `'tags'`, that render is one chip per chosen
   *   item per `setItems`, unless `createTriggerContentElFn` replaces the
   *   content.
   * - That cost is acceptable: `setItems` is a bulk call.
   * @group Subclassing: reactions
   */
  protected override onItemsChanged(): void {
    this.itemPositionCache = null
    const previous = this.chosenItems
    let swapped = false
    const nextChosen: T[] = []
    const compareFn = this.settings.compareFn
    for (const c of previous) {
      const idx = this.items.findIndex(item => compareFn(item, c))
      if (idx < 0) { continue }
      const matched = this.items[idx]!
      // SameValueZero, so a NaN item matching itself is not a swap.
      if (!defaultCompareFn(matched, c)) { swapped = true }
      nextChosen.push(matched)
    }
    const ordered = this.orderChosen(nextChosen)
    // A dropped entry or a new order is visible state: the trigger re-renders
    // and onChange fires, like the order-sensitive setChosenItems.
    if (!this.arraysEqual(ordered, previous)) {
      this.chosenItems = ordered
      this.renderTrigger()
      // setItems rendered the open popup before this reconciliation, so rows
      // whose content read the chosen list must be rebuilt from the final one.
      if (this.isOpened()) { this.renderPopupList() }
      this.fireChange(previous, 'items')
      return
    }
    if (swapped) { this.chosenItems = ordered }
    // The count summary reads the list total and a custom trigger receives
    // `items`, so every list change refreshes the content; the arrow does not
    // depend on the list.
    this.renderTriggerContent()
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
      const compareFn = this.settings.compareFn
      const idx = list.findIndex(i => compareFn(i, firstChosen))
      if (idx >= 0 && !this.isItemEffectivelyDisabled(list[idx]!)) {
        this.setFocusedIndex(idx)
        return
      }
    }
    if (this.focusChooseAllRow()) { return }
    const first = this.findNextEnabledIndex(0, 1, list)
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /** Position of each item in the current list; built once per item list (default `compareFn` only). */
  private itemPositionCache: { items: readonly T[], positions: Map<T, number> } | null = null

  private itemPositions(): Map<T, number> {
    const cache = this.itemPositionCache
    if (cache !== null && cache.items === this.items) { return cache.positions }
    const positions = new Map<T, number>()
    this.items.forEach((item, i) => { if (!positions.has(item)) { positions.set(item, i) } })
    this.itemPositionCache = { items: this.items, positions }
    return positions
  }

  /**
   * Apply `chosenItemsOrder`. `'as-chosen'` returns the array as is;
   * `'as-listed'` sorts by position in the item list, unlisted entries last
   * in their given order.
   */
  private orderChosen(chosen: T[]): T[] {
    if (this.settings.chosenItemsOrder !== 'as-listed' || chosen.length < 2) { return chosen }
    const items = this.items
    const compareFn = this.settings.compareFn
    let positionOf: (c: T) => number
    if (compareFn === defaultCompareFn) {
      const positions = this.itemPositions()
      positionOf = (c) => positions.get(c) ?? items.length
    } else {
      positionOf = (c) => { const i = items.findIndex(item => compareFn(item, c)); return i < 0 ? items.length : i }
    }
    return chosen
      .map((c, i) => ({ c, pos: positionOf(c), i }))
      .sort((a, b) => a.pos - b.pos || a.i - b.i)
      .map(e => e.c)
  }

  private arraysEqual(a: readonly T[], b: readonly T[]): boolean {
    if (a.length !== b.length) { return false }
    const eq = this.settings.compareFn
    for (let i = 0; i < a.length; i++) {
      if (!eq(a[i]!, b[i]!)) { return false }
    }
    return true
  }

  // The overloads make a single-item reason require its item at compile time.
  private fireChange(previousChosenItems: readonly T[], reason: 'choose' | 'unchoose', item: T): void
  private fireChange(previousChosenItems: readonly T[], reason: 'clear' | 'set' | 'items'): void
  private fireChange(previousChosenItems: readonly T[], reason: LLSelectChangeReason, item?: T): void {
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
    onChange?.(this.chosenItems, previousChosenItems, meta)
    // Action rows read live state; after the handler ran, so a row's text may show what it wrote.
    this.replacePopupListActionRowElsInDom()
  }
}
