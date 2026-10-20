// LLSelectBase: DOM scaffold, ARIA wiring, open/close state, item storage,
// keyboard navigation, and shared rendering primitives for LLSelectSingle and
// LLSelectMultiple. Subclasses own chosen-state and decide what happens on
// item click.

import { createPositioner, isAnchorHidden, type Positioner, type LLSelectWidthPolicy } from './positioning.js'
import { gatherItemsByGroupKey } from './grouping.js'
import {
  LLSelectKeyboardAction,
  ensureVisibleInScroll,
  findTypeaheadIndex,
  getActionFromKey,
  getUpdatedIndex,
  getUpdatedTypeaheadBuffer,
} from './keyboard.js'
import { en as DEFAULT_UI_TRANSLATION_PACK } from './i18n/en.js'
import type { LLSelectUiTranslationPack } from './i18n.js'
import {
  COLOR_SCHEME_ATTRIBUTE,
  cancelFirstDecision,
  claimColorSchemeRoot,
  queueFirstDecision,
  readColorSchemeInputs,
  resolveColorScheme,
  subscribeColorScheme,
  unsubscribeColorScheme,
  type LLSelectColorScheme,
} from './color-scheme.js'

/**
 * What happens when the user clicks outside an open popup.
 *
 * - `'pass-through'` (default): close the popup; the outside click still
 *   triggers its normal action (button click, link navigation, etc.).
 * - `'block'`: close the popup only; the outside click is swallowed so no
 *   underlying handler or default action fires. Avoids accidental side
 *   effects when the user only intended to dismiss the dropdown.
 * @group Settings
 * @category Base
 */
export type LLSelectOutsideClickBehavior = 'pass-through' | 'block'

/**
 * Who initiated a chosen-state change, delivered to `onChange` as
 * `meta.source`.
 * - `'user'`: a pointer or keyboard interaction inside the widget - an
 *   option toggle, a tag's remove button, the clear button, the choose-all
 *   row, an action row's `onActivate`.
 * - `'api'`: any programmatic call - `setChosenItem` / `setChosenItems`,
 *   `toggleItem`, the `choose*` bulk ops, `setItems` reconciliation.
 * - Only the first chosen-state change of one interaction reports `'user'`.
 *   A later change in the same interaction reports `'api'`.
 * - One exception today: a `setItems` call inside an action row's
 *   `onActivate`, before any other chosen-state change, has its
 *   reconciliation report `'user'`.
 * @group Events
 */
export type LLSelectChangeSource = 'user' | 'api'

/**
 * What a chosen-state change did to the data, delivered to `onChange` as
 * `meta.reason`.
 * - It names the operation. `meta.source` names who started it.
 * - A single-item operation keeps its reason even when the result is empty.
 * - In multiple mode, a whole-value write or a bulk op reads its result:
 *   empty is `'clear'`, otherwise `'set'`.
 * - In single mode, setting an item is `'choose'` and the empty write is
 *   `'clear'`.
 * - `'choose'`: one item was added, or the single value was set to an item.
 * - `'unchoose'`: one item was removed, even when that empties the selection.
 * - `'clear'`: an empty whole-value write - the clear button,
 *   `setChosenItem(undefined)`, `setChosenItems([])`, or a bulk op whose
 *   result is empty.
 * - `'set'`: a whole-value write with items (`setChosenItems`), or a bulk op
 *   whose result is not empty (a `choose*` method, the choose-all row).
 * - `'items'`: a `setItems` call dropped or reordered chosen entries, even
 *   when that empties the selection.
 * - `meta.item` holds the one item of a `'choose'` or `'unchoose'`.
 * @group Events
 */
export type LLSelectChangeReason = 'choose' | 'unchoose' | 'clear' | 'set' | 'items'

/**
 * Why the popup opened: the value of `meta.reason` in {@link LLSelectOpenMeta}.
 * - `'toggle'`: a click on the trigger, or a `toggle()` call.
 * - `'keyboard'`: ArrowDown, ArrowUp, Enter or Space on the closed trigger.
 * - `'typeahead'`: a printable character typed on the closed trigger.
 * - `'api'`: an `open()` call.
 * @group Events
 */
export type LLSelectOpenReason = 'toggle' | 'keyboard' | 'typeahead' | 'api'

/**
 * `onOpen`'s argument.
 * @group Events
 */
export interface LLSelectOpenMeta {
  /** Why the popup opened. See {@link LLSelectOpenReason}. */
  reason: LLSelectOpenReason
}

/**
 * Why the popup closed: the value of `meta.reason` in {@link LLSelectCloseMeta}.
 * - `'choose'`: a pick in single mode, vetoed or not; a veto stops the
 *   value, not the close.
 * - `'escape'`: Escape or Alt+ArrowUp on the trigger or the filter input,
 *   and Escape on a control the app placed in a header / footer slot.
 * - `'outside'`: a mousedown or click outside the widget.
 * - `'blur'`: DOM focus left the widget.
 * - `'toggle'`: a click on the trigger, or a `toggle()` call.
 * - `'api'`: a `close()` call.
 * - `'disabled'`: `setDisabled(true)`.
 * - `'destroy'`: `destroy()`.
 * - `'hidden'`: the trigger scrolled out of view or was clipped, so the
 *   popup could not stay anchored.
 * @group Events
 */
export type LLSelectCloseReason = 'choose' | 'escape' | 'outside' | 'blur' | 'toggle' | 'api' | 'disabled' | 'destroy' | 'hidden'

/**
 * `onClose`'s argument.
 * @group Events
 */
export interface LLSelectCloseMeta {
  /** Why the popup closed. See {@link LLSelectCloseReason}. */
  reason: LLSelectCloseReason
}

/**
 * The part of `onChange`'s third argument that both shapes share: who started
 * the change and what it did. See {@link LLSelectChangeMeta} for the shapes.
 * @group Events
 */
export interface LLSelectBaseChangeMeta {
  /** Who started the change. See {@link LLSelectChangeSource}. */
  source: LLSelectChangeSource
  /**
   * What the change did to the data, whoever started it.
   * - `'choose'`: one item was added, or the single value was set to an item.
   * - `'unchoose'`: one item was removed.
   * - `'clear'`: an empty whole-value write, or a bulk op whose result is empty.
   * - `'set'`: a whole-value write with items, or a bulk op whose result is not empty.
   * - `'items'`: a `setItems` call dropped or reordered chosen entries.
   * - See {@link LLSelectChangeReason} for which operation gets which value.
   */
  reason: LLSelectChangeReason
}

/**
 * `onChange`'s third argument when one item was added or removed.
 * - `reason` is `'choose'` or `'unchoose'`.
 * - `item` is that one item, always present.
 * @group Events
 */
export interface LLSelectItemChangeMeta<T> extends LLSelectBaseChangeMeta {
  reason: 'choose' | 'unchoose'
  /**
   * The one item that was added or removed.
   * - On `'unchoose'` it is the stored entry, not an equal object the caller
   *   passed to `toggleItem`.
   */
  item: T
}

/**
 * `onChange`'s third argument when the whole value changed at once.
 * - `reason` is `'clear'`, `'set'` or `'items'`.
 * - There is no single item, so `item` is never present.
 * @group Events
 */
export interface LLSelectWholeValueChangeMeta extends LLSelectBaseChangeMeta {
  reason: 'clear' | 'set' | 'items'
  /** Never present: these reasons concern the whole value. */
  item?: never
}

/**
 * Extra facts about one `onChange` firing, as the callback's third argument.
 * - A discriminated union on `reason`: after `if (meta.reason === 'choose')`
 *   the type of `meta.item` is `T`, with no `undefined`.
 * - `T` is the item type. It defaults to `unknown`, so a bare
 *   `LLSelectChangeMeta` annotation keeps compiling.
 * - An object on purpose: future fields can be added without breaking the
 *   callback signature.
 * @group Events
 */
export type LLSelectChangeMeta<T = unknown> = LLSelectItemChangeMeta<T> | LLSelectWholeValueChangeMeta

/**
 * The argument of `onBeforeChange` and `onChosenChanging`: what a user change
 * is about to do, and the way to stop it.
 * - The same facts as {@link LLSelectChangeMeta}, read-only: `source`,
 *   `reason`, and `item` for a `'choose'` or `'unchoose'`.
 * - After `if (event.reason === 'choose')` the type of `event.item` is `T`.
 * @group Events
 */
export type LLSelectBeforeChangeEvent<T = unknown> = Readonly<LLSelectChangeMeta<T>> & {
  /** Always `'user'`: only the library's own pointer and keyboard paths dispatch it. */
  readonly source: 'user'
  /** Never `'items'`: the `setItems` reconciliation is not a user change. */
  readonly reason: Exclude<LLSelectChangeReason, 'items'>
  /** `true` once `preventDefault()` was called while the hook or the setting ran; a later call does nothing. */
  readonly defaultPrevented: boolean
  /**
   * Stop the change: nothing is written, nothing re-renders, `onChange` does
   * not fire.
   * - Counts only while the hook and the setting run. A call after they
   *   returned does nothing.
   */
  preventDefault(): void
}

/**
 * One app command rendered by the library as a `role="option"` row inside the
 * popup list: the entries of `popupListLeadingActionRows` /
 * `popupListTrailingActionRows`.
 * - The library builds the row element (id, `role="option"`, classes,
 *   `aria-label`, `aria-disabled`, click and Enter); this object supplies
 *   only the text, the optional rich content, the disabled state and what
 *   activation does.
 * - `textFn` is the accessible name, and the visible text when there is no
 *   custom content. It is re-read on every row render, so copy can follow
 *   app state or a language switch.
 * - `createContentElFn`: rich visible content; `null` / omitted = plain text
 *   from `textFn`. Put no focusable control inside: the row itself is the
 *   control.
 * - `disabledFn`: `null` / omitted = never disabled. Re-read on every row
 *   render and again at activation. A disabled row is skipped by the arrow
 *   keys and cannot be activated.
 * - `onActivate` runs on Enter, on Space while the filter is inactive, and on
 *   click. The library changes nothing else: choosing and closing are this
 *   callback's job (call `setChosenItems` / `close()` yourself). Synchronous
 *   work runs with the change source `'user'`; a change made after an
 *   `await` reports `'api'`.
 * - Rows are rebuilt on every list render and after every chosen change, so
 *   the three functions may read live state. They receive no parameters:
 *   close over your instance variable.
 * @group Action rows
 */
export interface LLSelectPopupListActionRow {
  textFn: () => string
  createContentElFn?: (() => HTMLElement | null) | null
  disabledFn?: (() => boolean) | null
  onActivate: () => void
}

/**
 * What a settings function may read while the instance is still being built.
 * - Only two settings functions receive it: `createPopupHeaderContentElFn`
 *   and `createPopupFooterContentElFn`. The trigger content functions also
 *   run during construction, but they get their own data instead and rerun
 *   on every render.
 * - `new` has not returned yet. The variable that will hold the instance is
 *   still empty. Do not read it here.
 * - `classIdMap`: the resolved class and id names.
 * - `uiTranslationPack`: the resolved translation pack.
 * - If you need the instance, do that work in an event handler on the element
 *   you return. Handlers run after `new` returns.
 * @group Popup slots
 */
export interface LLSelectConstructionContext {
  readonly classIdMap: Readonly<LLSelectClassIdMap>
  readonly uiTranslationPack: Readonly<LLSelectUiTranslationPack>
}

/**
 * Resolved (defaults applied) settings shared by all select variants.
 * Subclasses (`LLSelectSingle`, `LLSelectMultiple`) extend this with their
 * mode-specific options such as `onChange`.
 *
 * Settings are frozen after the constructor. What still changes at runtime:
 * - State changes by method, and never was a setting: the items
 *   (`setItems`), the chosen value (`setChosenItem` / `setChosenItems`),
 *   `disabled` (`setDisabled`).
 * - Two settings have a setter, because they are text: `uiTranslationPack`
 *   (`setUiTranslationPack`) and `placeholder` (`setPlaceholder`).
 * - Every other setting is fixed for the instance's lifetime.
 * - To change a fixed setting, build a new instance. One build takes about
 *   0.2 ms.
 * - If a setting must vary at runtime, use its function form where one
 *   exists. `filterable: (items) => boolean` is re-evaluated on every open
 *   (and consulted by closed-state typeahead - see the setting).
 * @group Settings
 * @category Base
 */
export interface LLSelectBaseSettings<T, GroupKey = string> {
  /**
   * Prefix used for every CSS class and DOM id the library generates
   * (default `'llselect'`). NOTE: the shipped themes target the default
   * prefix only - a custom prefix means bringing your own CSS. Reference the
   * resolved names via `instance.classIdMap` instead of hardcoding strings.
   * @group CSS
   */
  cssClassPrefix: string
  /**
   * Text shown in the trigger when nothing is selected. App copy: an explicit
   * value always wins; when unset, the locale default
   * `uiTranslationPack.triggerPlaceholder` is used (`'Please select'` in English).
   * @group Trigger
   */
  placeholder: string
  /**
   * Accessible name of the field, like the `<label>` text of a native
   * `<select>` (e.g. `'Country'`).
   * - Applied to the trigger, the popup listbox, and (while the filter is active)
   *   the filter input; per-mode wiring: `docs/llm/A11Y.md` "Accessible name".
   * - The name resolves by the FIRST set rung, mirroring the W3C
   *   accessible-name computation order:
   *   1. `ariaLabelledBy`.
   *   2. `ariaLabel` (this setting).
   *   3. `labelEl` - its element's id becomes the resolved `ariaLabelledBy`.
   *   4. None set: the field is unnamed. A combobox requires a name
   *      (WAI-ARIA 1.2), so one `console.warn` per page reports the first
   *      offender.
   * - `null` (default): this rung is skipped. An empty or whitespace-only
   *   string counts as unset too - the accname computation skips a blank
   *   `aria-label`, and so does the ladder.
   * @group Accessible name
   */
  ariaLabel: string | null
  /**
   * Space-separated DOM id(s) of the visible label element(s) naming the
   * field; forwarded as `aria-labelledby` to the same elements as `ariaLabel`.
   * - Prefer this over `ariaLabel` when a visible label element exists: the
   *   spoken name then always matches the visible text.
   * - `null` (default): not forwarded; see `ariaLabel` for the naming
   *   requirement. An empty or whitespace-only string counts as unset too,
   *   same as `ariaLabel`.
   * - Rung 1 of the resolution order (the numbered list at `ariaLabel`): it
   *   wins whenever set, matching the ARIA name computation.
   * @group Accessible name
   */
  ariaLabelledBy: string | null
  /**
   * The widget's visible label element - the one foreign element the library
   * touches. Emulates native `<label for>` (which cannot target these divs)
   * in both directions:
   * - Kept **by reference**: the library reads the element's `id` once, at construction, and, when neither `ariaLabel` nor `ariaLabelledBy` is given, points `aria-labelledby` at it; assistive technology then reads the element's current text, so later text changes stay correct, while a later `id` change does not.
   * - clicking it focuses the trigger (focus ONLY; native `<select>` does not
   *   open on label click, neither does this);
   * - it feeds the accessible name as rung 3 of the resolution order (the
   *   numbered list at `ariaLabel`): with neither aria setting given, the
   *   label's id becomes the resolved `ariaLabelledBy` (an id is minted from
   *   `classIdMap.labelId` if the element has none).
   * - `null` = no label element; the name ladder just skips this rung.
   * - `destroy()` removes the click listener and a minted id.
   * @group Accessible name
   */
  labelEl: HTMLElement | null
  /**
   * Equality predicate for item values - return `true` when `a` and `b` are the
   * same item.
   * - Called **every** time the library compares two items; nothing is kept for a later call, except that the multiple select reuses its `hideChosenRows` subtraction until the base visible list (gathered, then filtered) or the chosen list is replaced:
   *   - on each row render and in-place row rebuild (the chosen check: `isChosen` in the multiple select, the `aria-selected` compare in the single select), on each selection change, on open, on each active-row move between two item rows (the new active item is compared with the last reported one), on typeahead, in the `setItems` reconciliation, in `hideChosenRows` filtering, and in `'as-listed'` ordering;
   *   - a custom function pays this on every call; in the multiple select the default is skipped by `Set`- and `Map`-based fast paths and by the duplicate-items warning, while the single select calls it as given.
   * - Required for non-primitive `T`. The default compares by identity:
   *   `===`, except that `NaN` equals `NaN` (SameValueZero, the same rule
   *   `Set` uses), so every code path agrees on what "the same item" means.
   * - Used for selection, dedup, and matching the chosen item back to the list.
   * - Symmetric: the result must not depend on argument order.
   * @group Items
   */
  compareFn: (a: T, b: T) => boolean
  /**
   * See {@link LLSelectOutsideClickBehavior}.
   * @group Popup
   */
  outsideClickBehavior: LLSelectOutsideClickBehavior
  /**
   * Which color scheme the widget shows: light or dark.
   * - `'auto'`, the default: the library chooses the scheme from the two CSS sources below.
   * - `'light'` or `'dark'`: the widget shows that scheme. The CSS sources and the operating system do not matter. The bootstrap-5 theme still takes its colors from Bootstrap's own CSS variables, which turn dark only under `data-bs-theme="dark"`; see the README section "Dark color scheme".
   * - For `'auto'`, the library checks two sources in order. The widget root is the element the widget is mounted on, class `llselect-root`.
   *   1. The CSS variable `--llselect-color-scheme`, from the widget root's computed style. The root or any ancestor may set it. The root's own declaration wins; otherwise the nearest ancestor's value is inherited. The value `light` or `dark` is the answer. The value `auto` follows the operating system's color preference: dark when dark is preferred, otherwise light. If the variable is not set, or has any other value, the library checks the next source.
   *   2. The CSS property `color-scheme`, from the widget root's computed style. If it does not list `dark`, the answer is light. If it lists `dark` without `light`, the answer is dark. If it lists both, the answer follows the operating system's color preference. This is the property that also drives native form controls.
   * - So the widget uses light when the variable is not set and the property does not list `dark`. This holds on a dark operating system too.
   * - The themes set `--llselect-color-scheme` for these classes: `dark`, `theme-dark`, `dark-mode`, `theme-light`, `light-mode`. They recognize the attributes `data-theme` and `data-bs-theme` with the value `light` or `dark`. They recognize `data-color-scheme` with the value `light`, `dark` or `auto`. These classes and attributes count on the widget root or on any ancestor. If your page selects the scheme with another class or attribute, add one CSS rule, for example `.night { --llselect-color-scheme: dark; }`.
   * - The result is written to the widget root as `data-llselect-color-scheme="light"` or `data-llselect-color-scheme="dark"`. The themes apply their dark colors when the value is `dark`. Do not write that attribute yourself. This attribute name and the `--llselect-*` variable names are fixed; `cssClassPrefix` does not change them.
   * - If `colorScheme` is `'auto'`, the library queues the first check during construction. The check runs after the current script finishes, before the browser paints again. If `colorScheme` is `'light'` or `'dark'`, the library writes that value to the attribute during construction.
   * - The library also checks when `open()` or `refreshColorScheme()` runs. It checks when the operating system's color preference changes. It also checks when an attribute of `<html>` or `<body>` changes.
   * - If the widget is inside a shadow root, an operating-system change does not reach it, and neither does an attribute change on `<html>` or `<body>`. The widget still checks when `open()` or `refreshColorScheme()` runs.
   * - `getColorScheme()` returns the result. If `colorScheme` is `'auto'`, the attribute may be missing until the first queued check runs. If you call `getColorScheme()` before that, the method checks at once and returns the scheme.
   * @group Color scheme
   */
  colorScheme: LLSelectColorScheme
  /**
   * The trigger arrow slot's content ELEMENT (typically a dropdown chevron or
   * triangle).
   * - Called on **every** open and close, and on **every** full trigger render (`renderTrigger`: construction in the shipped classes, a selection change, `rerender()`, `setPlaceholder()` with a changed argument, `setUiTranslationPack()`, and a `setItems` that drops or reorders chosen items); nothing is kept for a later call.
   *   - The returned element can vary with `isOpened`.
   *   - A `setItems` that leaves the selection as it is re-renders the trigger content only and does not call it.
   * - fn returns `null` - no arrow for that state.
   * - setting is `null` (default) - the library adds nothing to the arrow slot.
   * @group Trigger
   */
  createTriggerArrowContentElFn: ((state: { isOpened: boolean }) => HTMLElement | SVGElement | null) | null
  /**
   * Whether the trigger shows a clear (x) button that empties the selection.
   * - Default `false`.
   * - Clearing sets the empty value: `undefined` for a single select, `[]`
   *   for a multiple. It goes through the normal setters, so `onChange`
   *   fires with that empty value. There is no separate clear event.
   * - The empty value is not configurable, and no library makes it so:
   *   "nothing chosen" already exists before the first choice, so the value
   *   types carry `undefined` either way.
   * - If your model is a plain type like `string` and must never hold
   *   `undefined`, pick one of these:
   *   - Add a real "none" item (for example `''` shown as "(none)") and skip
   *     `clearable`. The model then stays `string` after the first choice,
   *     exactly like a native `<select>` with a placeholder option.
   *   - Keep `clearable` and coerce in `onChange`: `item ?? ''`.
   * - "Clear" means back to empty and the placeholder, never "back to some
   *   default option". If you want a default instead, set it yourself in
   *   `onChange`.
   * - The button sits in its OWN trigger slot (like the arrow, so it never
   *   collides with `createTriggerContentElFn`), is `tabindex="-1"`, and
   *   carries an `aria-label`. The theme hides it via `data-empty` while
   *   nothing is selected.
   * @group Trigger
   */
  clearable: boolean
  /**
   * Content ELEMENT of the clear button (its x icon), mirroring `createTriggerArrowContentElFn`.
   * - Called on **every** full trigger render (`renderTrigger`: construction in the shipped classes, a selection change, `rerender()`, `setPlaceholder()` with a changed argument, `setUiTranslationPack()`, and a `setItems` that drops or reorders chosen items) while `clearable` is on; nothing is kept for a later call. A `setItems` that leaves the selection as it is does not call it.
   * `null` (default) = the theme's CSS glyph. The library always owns the button,
   * its click (clears + stops propagation) and aria; this only fills the icon.
   * @group Trigger
   */
  createTriggerClearButtonContentElFn: (() => HTMLElement | SVGElement | null) | null
  /**
   * Whether the popup includes a filter input.
   * - `false` (default): never.
   * - `true`: always.
   * - Predicate `(items) => boolean`: conditional. E.g. `filterable: (items) => items.length > 10`.
   *   - Called **once** at construction with the empty item list (`setItems` has not run yet), and at **every** open with the current full item list; never mid-open, so a `setItems` crossing the threshold applies on the next open.
   *   - A printable key pressed while closed also calls it, read-only, to decide whether prefix typeahead may take the key; keep it cheap and side-effect free.
   * The ARIA mode follows the evaluated value per open cycle: active =
   * trigger `role="button"`, focus moves to the input; inactive = exactly
   * like `filterable: false` (trigger stays `role="combobox"`, focus stays on
   * the trigger). See `docs/llm/A11Y.md` and `docs/llm/DESIGN.md`.
   * @group Filtering
   */
  filterable: boolean | ((items: readonly T[]) => boolean)
  /**
   * Chrome strings (AT labels + generated text): the i18n customization point. Resolved
   * against English: pass a language pack whole (`uiTranslationPack: zhTW` from
   * `@llselect/core/i18n`) or override single keys
   * (`uiTranslationPack: { ...zhTW, filterInputPlaceholder: '...' }`).
   * Key-by-key contract (incl. what `null` means where allowed):
   * {@link LLSelectUiTranslationPack}.
   * - Copied **once** at construction, as a shallow merge over the English defaults: later changes to your object do nothing, and `setUiTranslationPack()` replaces the copy. The pack's functions, such as `triggerCountSummary`, run at each render that needs them.
   * @group i18n
   */
  uiTranslationPack: LLSelectUiTranslationPack
  /**
   * Predicate used by the filter input; return `true` to keep the item.
   * `null` (default) means the built-in case-insensitive substring match
   * against the item's resolved text (`itemToStringFn` / `itemToString`).
   * Pass a custom function for fuzzy / domain-specific matching.
   * - Called once per candidate item on **every** recompute of the filtered list with a non-empty query:
   *   - on each filter input event outside an IME composition, and at the composition's end;
   *   - on `setItems`, `rerender()` and a bulk selection write of the multiple select (`setChosenItems` and the choose-all methods, which run `rerender()`) while the popup is open with a query;
   *   - never on open, which clears the query;
   *   - the matching subset is kept until the next recompute or the close that clears the query; nothing else is kept.
   * - `query` is the RAW input value: not trimmed and not lower-cased. Normalize
   *   it yourself (the built-in lower-cases both sides; it does not trim).
   * - Not called while the query is empty (an empty box shows every item), but a
   *   whitespace-only query (e.g. `"  "`) does call it.
   * @group Filtering
   */
  filterFn: ((item: T, query: string) => boolean) | null
  /**
   * The no-results message's visible content ELEMENT, without subclassing.
   * Mirrors `createPopupListItemContentElFn`: the library owns the message container
   * (`role="status"`, class, show/hide), this fills its content only.
   * - Called **every** time a full list render (`renderPopupList`, only while the popup is open: on open, on each filter input event outside an IME composition, at the composition's end, and on the Esc that clears the query, on `setItems`, `rerender()` and a bulk selection write of the multiple select (`setChosenItems` and the choose-all methods), and on `toggleItem` while `hideChosenRows` is on or when its choose-all row rebuild falls back to a full render) ends with no visible item, so the query may differ between calls; nothing is kept for a later call.
   * - The returned element replaces the message only when its text differs from the text shown: the status region is keyed on text, so while the message stays shown, unchanged text is neither re-rendered nor re-announced, and text that changes with the query is announced on each change; after the message hides, its next appearance renders again. Rich content whose markup varies while its text stays constant is therefore not re-rendered.
   * - `query` is the current filter query (`''` when the filter is inactive or
   *   the list is simply empty), so "Nothing matches <query>" is possible.
   * - Return an `HTMLElement`: inserted as the content (you own it; include
   *   real text - the status region announces its TEXT content).
   * - `null` (setting default, or returned): plain text from
   *   `uiTranslationPack.popupListNoResults`.
   * @group Filtering
   */
  createPopupListNoResultsContentElFn: ((query: string) => HTMLElement | null) | null
  /**
   * Content for a pinned header above the option list, without subclassing.
   * - Called **once**, inside the constructor, before `new` returns.
   *   The variable that will hold the instance is still empty: do not read it
   *   in this function. Event handlers on the returned element may read it,
   *   because they run after `new` returns.
   * - `ctx` is a {@link LLSelectConstructionContext}: `classIdMap` (for the
   *   theme's classes) and `uiTranslationPack`. That is all this function can
   *   safely read.
   * - Return an `HTMLElement`: the library wraps it in the `popupHeaderEl`
   *   container (class `popupHeaderClass`, no ARIA role) and keeps that node
   *   until `destroy()`. `open()`, `rerender()` and `setUiTranslationPack()`
   *   never rebuild it. Update it yourself, from `onChange` or `onOpen`.
   * - `null` (setting default, or returned): no header element is built.
   * - Where it sits: between the filter input and the listbox, outside the
   *   scroll area, so it never scrolls with the items. To put it above the
   *   filter input, move it from a subclass constructor:
   *   `if (this.popupHeaderEl) { this.popupEl.prepend(this.popupHeaderEl) }`.
   *   The library never rewrites the popup's child list. A header above the
   *   filter input should hold no focusable controls, or Shift+Tab from the
   *   input lands in it instead of leaving the widget.
   * - Pointer: a click inside keeps DOM focus on the combobox host (the popup
   *   `mousedown` rule), so a button works without stealing keyboard input. A
   *   text field inside must call `stopPropagation` on its own `mousedown`.
   * - Keep it compact: a long unwrapped line widens a `'fit-content'` popup,
   *   and a tall slot squeezes the list, the only child that flexes.
   * - Contract: `docs/llm/DESIGN.md` "Popup header / footer slots";
   *   keyboard and focus rules: `docs/llm/A11Y.md`.
   * @group Popup slots
   */
  createPopupHeaderContentElFn: ((ctx: LLSelectConstructionContext) => HTMLElement | null) | null
  /**
   * Content for a pinned footer below the option list, without subclassing.
   * - Called **once**, inside the constructor, before `new` returns.
   * - Same contract as {@link createPopupHeaderContentElFn}: a
   *   {@link LLSelectConstructionContext} argument, the `popupFooterEl`
   *   container (class `popupFooterClass`, no ARIA role) around the result,
   *   never rebuilt by the library.
   * - `null` (setting default, or returned): no footer element is built.
   * - Where it sits: after the no-results message, at the bottom of the
   *   popup, outside the scroll area.
   * @group Popup slots
   */
  createPopupFooterContentElFn: ((ctx: LLSelectConstructionContext) => HTMLElement | null) | null
  /**
   * Commands rendered as `role="option"` rows at the TOP of the option list,
   * after the choose-all row when there is one, in array order.
   * - Copied **once** at construction, as a shallow copy: later changes to your array do nothing. Default `[]`.
   *   - Each entry object stays yours: its `textFn`, `disabledFn` and `createContentElFn` run at every rebuild of the rows, which happens while the popup is open on each full list render, at the end of each committed selection change, and at the end of each `setItems`; one `setItems` may rebuild them more than once.
   *   - `disabledFn` runs once more when its row is activated.
   * - Each entry is a {@link LLSelectPopupListActionRow}. The library builds
   *   the row elements and wires them into the arrow-key ring: Home / End
   *   reach the ring's ends, disabled rows are skipped, and the popup opens
   *   with the active option on an item or the choose-all row, never on one
   *   of these rows.
   * - Rows scroll with the items unless their block is pinned
   *   (`popupListLeadingRowsPinned`). For content that is not a command, use
   *   `createPopupHeaderContentElFn` / `createPopupFooterContentElFn`.
   * - Assistive technology announces a row as an option with its text and a
   *   positional count; it has no selected state. If the command changes the
   *   selection, say so in the row text or a live region.
   * - A "select all" placed here is a command, not the choose-all row: call
   *   `toggleAllVisible()` from `onActivate` and count with
   *   `getVisibleEnabledItems()` (both on `LLSelectMultiple`). It has no
   *   selected state and is never the active option when the popup opens.
   *   For a row with selection state, use `chooseAllRow`.
   * - Contract: `docs/llm/A11Y.md` "Action rows"; design: `docs/llm/DESIGN.md`.
   * @group Action rows
   */
  popupListLeadingActionRows: readonly LLSelectPopupListActionRow[]
  /**
   * Commands rendered as `role="option"` rows at the BOTTOM of the option
   * list, after the last item, in array order. Same contract as
   * {@link popupListLeadingActionRows}.
   * - Copied **once** at construction, as a shallow copy, with the leading rows' entry contract.
   * - While the filter is active, Home / End move the text caret, so a row
   *   down here is reached only by arrowing past every match: put commands
   *   keyboard users need often in the leading rows.
   * @group Action rows
   */
  popupListTrailingActionRows: readonly LLSelectPopupListActionRow[]
  /**
   * Keep the leading rows in view while the items scroll.
   * - The leading rows are the choose-all row (when on) plus
   *   `popupListLeadingActionRows`. With `true`, that whole block sticks to
   *   the top edge of the listbox and the items scroll under it.
   * - The rows stay in the arrow-key ring, keep their roles, and are still
   *   counted by assistive technology. Only their scrolling changes.
   * - The library wraps the block in a `div` with `role="presentation"`
   *   (`popupListPinnedLeadingRowsEl`, class
   *   `popupListPinnedLeadingRowsClass`) and sets `position: sticky` and
   *   `top: 0` on it inline, so the setting works in any theme. The shipped
   *   themes give the wrapper an opaque background and its edge line.
   * - When the block has no rows, for example when the choose-all row hides
   *   because nothing is selectable and there are no leading action rows,
   *   the wrapper is not in the listbox.
   * - Scrolling an item into view accounts for the wrapper's height. When the
   *   pinned blocks leave no room for the items, scrolling is best-effort.
   * - Default `false`: the rows scroll with the items.
   * - Pinning is per block, never per row. Why: `docs/llm/popup-rows-and-callbacks.md`
   *   section 5. Contract: `docs/llm/A11Y.md` "Action rows".
   * @group Action rows
   */
  popupListLeadingRowsPinned: boolean
  /**
   * Keep the trailing rows in view while the items scroll.
   * - The trailing rows are `popupListTrailingActionRows`. With `true`, that
   *   block sticks to the bottom edge of the listbox.
   * - Same contract as {@link popupListLeadingRowsPinned}. The wrapper is
   *   `popupListPinnedTrailingRowsEl`, class
   *   `popupListPinnedTrailingRowsClass`, with `bottom: 0`.
   * - Default `false`.
   * @group Action rows
   */
  popupListTrailingRowsPinned: boolean
  /**
   * How the popup decides its width. Does NOT affect the trigger - trigger
   * width is always whatever your CSS says.
   *
   * - `'fit-content'` (default): popup width grows to its own content (items,
   *   filter input, ...) and never shrinks below the trigger's width - the
   *   native `<select>` dropdown behavior, minus its viewport overflow:
   *   auto-shifts and width-clamps when the natural width would not fit.
   *   Direction-aware: in an RTL context
   *   (`getComputedStyle(trigger).direction === 'rtl'`, read once per open)
   *   it right-aligns to the trigger and grows LEFTWARD, the mirror of LTR.
   * - `'match-trigger'`: popup width equals trigger width; long item text wraps
   *   inside the popup.
   * @group Popup
   */
  popupWidthPolicy: LLSelectWidthPolicy
  /**
   * Predicate deciding whether an individual item is disabled. `null` (default)
   * = nothing disabled. A disabled item is not selectable (click / Enter) and is
   * skipped by keyboard nav; it keeps `role="option"` plus `aria-disabled`.
   * For a generic `T` this is the only way to mark items - the library cannot
   * read a `disabled` field off an unknown type. See `docs/llm/DESIGN.md`.
   * - Called **every** time the library asks whether an item is disabled (`isItemEffectivelyDisabled`); nothing is kept for a later call:
   *   - for each item row on a full list render and on an in-place row rebuild;
   *   - for each item position tested by keyboard or typeahead navigation, and when the initial active row is picked on open;
   *   - on keyboard activation of a row;
   *   - in the choose-all operations and in `getVisibleEnabledItems()`;
   *   - for each tag chip and its remove button, and twice more on the remove button's click, before and after the focus it moves.
   * - When a chosen item becomes disabled, it stays chosen. The bullets below describe that state.
   * - For an `LLSelectSingle`:
   *   - `getChosenItem()` still returns the item.
   *   - The trigger shows the item's text by default.
   *   - Choosing another item replaces it, as in a native `<select>`.
   * - For an `LLSelectMultiple`:
   *   - `getChosenItems()` still includes the item.
   *   - When `triggerDisplay` is `'count'`, the default, the count summary includes the item.
   *   - When `triggerDisplay` is `'tags'`:
   *     - The trigger shows a chip for the item.
   *     - The chip has `aria-disabled` set to true.
   *     - Clicking the chip's remove button does nothing.
   *   - `clearable` is off by default.
   *   - When `clearable` is off, no built-in user action removes the item.
   * - Your app can remove the disabled chosen item:
   *   - For a single select, call `setChosenItem()` with another item or with `undefined`.
   *   - For a multiple select, call `setChosenItems()` with a selection that excludes the item.
   *   - For a multiple select, call `toggleItem()` with the item.
   *   - In both classes, call `setItems()` with a list that no longer contains the item.
   *   - For a multiple select, if the item is outside the current item list:
   *     - `chooseAll()` removes it from the selection.
   *     - If the current item list has no enabled item, or an enabled item in it is unchosen, `toggleAll()` calls `chooseAll()`, which removes it as above.
   * - An action row you supply can make any of those calls.
   * - `setChosenItem()`, `setChosenItems()` and `toggleItem()` ignore the item's disabled state, like setting `option.selected` in script.
   * - If you supply a custom trigger content function, that function controls what the trigger shows.
   * - When the item's row is rendered:
   *   - The row has `aria-selected` and `aria-disabled` set to true.
   *   - Clicking the row does nothing.
   * - When `clearable` is on and the control is enabled:
   *   - Clicking the trigger's clear button clears the selection.
   *   - That also removes the disabled chosen item.
   * - When `clearable` is on, pressing Tab does not reach the clear button.
   * - A native `<select>` behaves the same way: a selected `<option>` keeps its selection when it is disabled.
   * - Removing the selected `<option>` removes that option from a native select's selection. `setItems()` with a list that excludes the chosen item removes the item here the same way.
   * - After the selected option is removed:
   *   - If a native single select has display size 1 and an enabled option remains, it selects its first enabled option.
   *   - An `LLSelectSingle` shows the placeholder.
   * - When a form submits, the browser omits selected options that are disabled.
   * - A native select's required check still counts those options as selections.
   * - llselect does not submit form values, so your app decides what to submit. The README section on form integration shows the hidden-input mirror, which does not exclude disabled items by itself.
   * @group Disabling
   */
  itemDisabledFn: ((item: T) => boolean) | null
  /**
   * When the control is disabled via `setDisabled(true)`, whether the trigger
   * stays in the tab order (`tabindex="0"`). `false` (default) takes it out
   * (`-1`). Set `true` so keyboard / AT users can focus the disabled control to
   * read a "why disabled" tooltip.
   * @group Disabling
   */
  focusableWhenDisabled: boolean
  /**
   * Item -> display string, without subclassing.
   * - Called **every** time the library needs an item's text; nothing is kept for a later call:
   *   - for each item row on a full list render or in-place rebuild;
   *   - on each trigger content render that shows item text: the single select with a chosen item; the multiple select in `'tags'` mode, unless `createTriggerContentElFn` returns an element, once per chosen item for the hidden value mirror, once more for the chip's remove-button name, and once more for the chip's text unless `createTagContentElFn` returns an element;
   *   - for each candidate on a recompute of the filtered list with the default filter;
   *   - on typeahead.
   * - `null` (default) = `String(item)`.
   * - Read by the `itemToString` method's default; used for list text, the
   *   single trigger text, the option's accessible name, and the default
   *   filter. Inserted as `textContent` (plain text, NOT parsed as HTML).
   * - For rich content (icons etc.), pass `createPopupListItemContentElFn`.
   * @group Items
   */
  itemToStringFn: ((item: T) => string) | null
  /**
   * Item -> its BCP 47 language code, such as `'de'` or `'zh-TW'`, written as
   * the `lang` attribute. It is not a language name.
   * - Called **every** time the library writes an item's text; nothing is kept for a later call:
   *   - for each item row on a full list render or in-place rebuild;
   *   - on each trigger content render of the single select with a chosen item;
   *   - for each chip in the multiple select's `'tags'` mode, plus once for the hidden value mirror when exactly one chip shows and no custom trigger content replaces the chips;
   *   - never for the count summary.
   * - `null` (default) = the library writes no `lang` anywhere.
   * - A function returning `null` = the library writes no `lang` for that item;
   *   its own text then inherits the page's language, and your custom chip
   *   content keeps whatever `lang` it has.
   * - An empty string sets `lang=""`, which HTML reads as "language unknown".
   * - Why: a screen reader that switches voices by language reads an option
   *   in the voice of the `lang` in effect on its row.
   * - Without this setting every row inherits the page's language, so on an
   *   English page the rows of a language picker are read in the English voice.
   * - Example, a language picker on an English page:
   *   ```ts
   *   new LLSelectSingle(el, {
   *     itemToStringFn: (l) => l.name, // 'English', 'Deutsch', 'Francais'
   *     itemToLangFn: (l) => l.code,   // 'en', 'de', 'fr'
   *   })
   *   ```
   *   Without the setting the row is `<div role="option">Deutsch</div>`,
   *   read in the English voice. With it, `<div role="option" lang="de">Deutsch</div>`.
   * - Written where the library shows that item's text:
   *   - the option row;
   *   - the single select's trigger content slot and its hidden value mirror
   *     whenever an item is chosen; custom trigger content inherits the slot's
   *     code, and its own `lang` wins;
   *   - a tag chip's text span, or its custom content.
   * - Not written on a chip's remove button, whose name mixes interface text
   *   with the item's text, nor on the multiple select's count summary.
   * - The multiple select's value mirror carries the code only while exactly
   *   one chip shows; the joined texts of several items carry none.
   * - Read by the `itemToLang` method's default.
   * @group Items
   */
  itemToLangFn: ((item: T) => string | null) | null
  /**
   * Item -> the visible content ELEMENT of its popup list row, without subclassing.
   * - Called once per visible row; nothing is kept for a later call:
   *   - on **every** full list render (`renderPopupList`, only while the popup is open: on open, on each filter input event outside an IME composition, at the composition's end, and on the Esc that clears the query, on `setItems`, `rerender()` and a bulk selection write of the multiple select (`setChosenItems` and the choose-all methods), and on `toggleItem` while `hideChosenRows` is on or when its choose-all row rebuild falls back to a full render);
   *   - for each row rebuilt in place by `setChosenItem` or `toggleItem` while the popup is open.
   * - The trigger never calls it: single mode has `createTriggerContentElFn`, tags have `createTagContentElFn`.
   * - When the select is an `LLSelectMultiple`, read chosen state through
   *   `isChosen`.
   * - When the select is an `LLSelectSingle`, compare with `getChosenItem()`.
   * - Never derive content from the chosen ORDER.
   * - When `toggleItem` changes one item, only that row is rebuilt, so
   *   sibling rows would keep an old position.
   * - While `hideChosenRows` is on, `toggleItem` rebuilds the whole list
   *   instead.
   * - Return an `HTMLElement` and the library inserts it as-is (you own the
   *   node); it becomes the row's visible content.
   * - `null` = plain `textContent` from `itemToString`. This is the default,
   *   both when the setting is unset and when your function returns `null` for
   *   a particular item.
   * - Fills the VISIBLE content only. You never touch `aria-*`: when this
   *   returns an element the library sets the option's `aria-label` from
   *   `itemToString`, so the accessible name + match text stay owned by
   *   `itemToString` no matter what you render (icon-only, reordered, ...).
   *   To make the spoken/matched text differ from the visible content, set the
   *   two independently: `itemToStringFn` for the name/matching,
   *   `createPopupListItemContentElFn` for the look.
   * - For full control of the option element (tag / wiring), subclass
   *   `createPopupListItemEl` instead.
   * - Content that reads selection state (e.g. a checkmark on the chosen row via
   *   `createCheckmarkSvgEl`) therefore stays fresh; keep the function cheap.
   *
   * @example
   *   // List shows an icon + the item text; screen readers announce just that text.
   *   itemToStringFn: (lang) => lang.name,
   *   createPopupListItemContentElFn: (lang) => {
   *     const row = document.createElement('span')
   *     const icon = document.createElement('i')
   *     icon.className = `mdi mdi-${lang.icon}`
   *     icon.setAttribute('aria-hidden', 'true') // decorative
   *     row.append(icon, lang.name)
   *     return row
   *   }
   * @group Popup
   */
  createPopupListItemContentElFn: ((item: T) => HTMLElement | null) | null
  /**
   * Item -> its group's key (identity), enabling optgroup rendering.
   * - Called with nothing kept for a later call except the gathered order:
   *   - on **every** full list render (`renderPopupList`, only while the popup is open), once per visible item in the scan that splits the list into groups, plus one lookahead read of the item that ends a grouped run, so a run that closes at the end of the list costs no extra read;
   *   - in the group gather, once per item up to and including the first item whose non-null key recurs outside its own run (the whole list when it is contiguous), and once more per item when the list must be re-bucketed; the gathered order is kept until the next `setItems`, `rerender()` or bulk selection write of the multiple select (`setChosenItems` and the choose-all methods); there is no gather while `gatherGroups` is `false`;
   *   - whenever the library asks whether an item is disabled and `itemDisabledFn` did not already disable it.
   * - `null` (setting, default): grouping off - flat list, no labels.
   * - fn returns `null`: this item is in no group; renders ungrouped.
   * - Contiguous items with an equal key (per `groupKeyCompareFn`) form one
   *   group. By default non-contiguous data is first gathered into display
   *   order (`gatherGroups`); with `gatherGroups: false` the data must be
   *   pre-sorted by group. See `docs/llm/DESIGN.md`.
   * @group Grouping
   */
  itemToGroupKeyFn: ((item: T) => GroupKey | null) | null
  /**
   * Whether the library gathers non-contiguous groups before rendering
   * (`true`, default). Grouping renders contiguous runs, so scattered items
   * sharing a key would otherwise produce a duplicate label per gap.
   * - `true`: the DISPLAY order is derived via {@link gatherItemsByGroupKey}:
   *   groups in first-appearance order, within-group order kept, ungrouped
   *   (`null`-key) items in place. The data itself (`items` / `getItems()`)
   *   is never reordered, and already-contiguous data is detected in one
   *   scan and used as-is.
   * - `false`: strict mode - you guarantee the data is pre-sorted by group; a
   *   key reappearing after a gap renders a duplicate label and
   *   `console.warn`s, so a broken sort is surfaced instead of silently
   *   fixed.
   * No effect while grouping is off (every key `null`).
   * @group Grouping
   */
  gatherGroups: boolean
  /**
   * Equality for two group keys; decides whether items share a group (both
   * the `gatherGroups` gather and the contiguous-run rendering use it).
   * - Called with nothing kept for a later call except the gathered order:
   *   - on **every** full list render (`renderPopupList`, only while the popup is open), in the scan that splits the list into groups: each item's key against the key that opened the current run, and each run's key against the runs already closed, stopping at the first match, to warn about a key that reappears;
   *   - in the group gather: each item's key against the key that opened the current run, and each run's opening key against every key seen so far, stopping at the first match, which is what detects a non-contiguous list; when the list must be re-bucketed, each key against the buckets' keys as well; the gathered order is kept until the next `setItems`, `rerender()` or bulk selection write of the multiple select (`setChosenItems` and the choose-all methods); there is no gather while `gatherGroups` is `false`.
   * - `null` (default) = identity, the same rule as the default `compareFn`
   *   (`===`, plus `NaN` equals `NaN`); right for string / number keys.
   * - Supply only when `GroupKey` is an object without usable reference identity.
   * - Mirrors `compareFn`, one level up.
   * @group Grouping
   */
  groupKeyCompareFn: ((a: GroupKey, b: GroupKey) => boolean) | null
  /**
   * Group key -> the label's display text. The i18n customization point: keep keys stable,
   * translate here.
   * - Called once per group on **every** full list render (`renderPopupList`, only while the popup is open), never on an in-place row rebuild; nothing is kept for a later call.
   * - `null` (default) = `String(groupKey)`.
   * @group Grouping
   */
  groupKeyToStringFn: ((groupKey: GroupKey) => string) | null
  /**
   * Group key -> the group's BCP 47 language code, such as `'de'` or `'zh-TW'`,
   * written as the `lang` attribute of the group container. It is not a
   * language name.
   * - Called once per group on **every** full list render (`renderPopupList`, only while the popup is open), never on an in-place row rebuild; nothing is kept for a later call.
   * - `null` (default) = the library writes no `lang` on any group.
   * - A function returning `null` = no `lang` for that group; its label then
   *   inherits the page's language.
   * - An empty string sets `lang=""`, which HTML reads as "language unknown".
   * - Why: the group's accessible name is the container's `aria-label`, and a
   *   screen reader reads it in the voice of the `lang` in effect on that
   *   element. The visible label is `aria-hidden`, so the code goes on the
   *   container, where the name lives.
   * - The group's option rows inherit the code, unless `itemToLangFn` writes
   *   their own. Custom label content from `createGroupLabelContentElFn`
   *   inherits it too, and its own `lang` wins.
   * - Example, languages grouped under their own names on an English page:
   *   ```ts
   *   new LLSelectSingle(el, {
   *     itemToGroupKeyFn: (l) => l.code,      // 'de', 'fr'
   *     groupKeyToStringFn: (c) => NAMES[c],  // 'Deutsch', 'Francais'
   *     groupKeyToLangFn: (c) => c,
   *   })
   *   ```
   * - Read by the `groupKeyToLang` method's default. The sibling of
   *   {@link itemToLangFn}.
   * @group Grouping
   */
  groupKeyToLangFn: ((groupKey: GroupKey) => string | null) | null
  /**
   * Predicate: is this whole group disabled?
   * - Called once per group on **every** full list render, and whenever the library asks whether an item in a group is disabled and `itemDisabledFn` did not already disable it; nothing is kept for a later call.
   * - `null` (default) = no group disabled.
   * - `true` = every item in the group is treated as disabled (layers on top of
   *   `itemDisabledFn`).
   * @group Grouping
   */
  groupDisabledFn: ((groupKey: GroupKey) => boolean) | null
  /**
   * Group label -> its visible content ELEMENT (icon / count badge / rich
   * markup), without subclassing. Mirrors `createPopupListItemContentElFn`.
   * - Called once per group on **every** full list render (`renderPopupList`, only while the popup is open), never on an in-place row rebuild; nothing is kept for a later call.
   * - Return an `HTMLElement` and the library inserts it as the label's visible
   *   content; the group's accessible name stays `groupKeyToString` (on the
   *   container `aria-label`) and the label element stays `aria-hidden`.
   * - `null` (default, or returned for a group) = plain text from
   *   `groupKeyToString`.
   * - `itemsInGroup` is the group's items, so you can render "Fruits (4)" or a
   *   summary without recomputing the grouping.
   * @group Grouping
   */
  createGroupLabelContentElFn: ((groupKey: GroupKey, itemsInGroup: readonly T[]) => HTMLElement | null) | null
  /**
   * Fired right **after** the popup opens.
   *
   * > No **before** counterpart: there is no `onBeforeOpen`.
   *
   * - `meta.reason` says why: `'toggle'`, `'keyboard'`, `'typeahead'` or
   *   `'api'`. See {@link LLSelectOpenReason}.
   * - An `open()` call that does not actually open the popup (already open, a
   *   disabled control, or a trigger scrolled out of view or clipped) does
   *   not fire it.
   * - Fires in ADDITION to the protected `onOpened` hook: the setting is for
   *   consumers, the hook for subclasses, both run.
   * - `null` (default) = no consumer listener.
   * @group Events
   */
  onOpen: ((meta: LLSelectOpenMeta) => void) | null
  /**
   * Fired right **after** the popup closes.
   *
   * > No **before** counterpart: there is no `onBeforeClose`.
   *
   * - `meta.reason` says why, one value per close path. See
   *   {@link LLSelectCloseReason}.
   * - A no-op `close()` does not fire it. The first close that takes effect
   *   reports its reason; a `close()` called while that close runs is a
   *   no-op.
   * - Additive with the protected `onClosed` hook, like {@link onOpen}: both run.
   * - When focus leaving the widget closes the popup, this fires **before**
   *   {@link onBlur}.
   * - `null` (default) = no consumer listener.
   * @group Events
   */
  onClose: ((meta: LLSelectCloseMeta) => void) | null
  /**
   * Fired **after** DOM focus entered the widget.
   *
   * > No **before** counterpart: there is no `onBeforeFocus`, and the `focusin` / `focusout` events the library observes are not cancelable, so none could stop the move.
   *
   * - DOM focus is the element that receives keyboard input,
   *   `document.activeElement`. Inside the widget it can be the trigger, the
   *   filter input, a chip's remove button, or a control the app placed in a
   *   header / footer slot.
   * - Fires once when focus comes from outside the widget or from nowhere:
   *   Tab onto the trigger, a click on the trigger or on the label, a
   *   programmatic `triggerEl.focus()`, an `open()` call on an unfocused
   *   widget whose filter is active, which moves focus to the filter input
   *   **after** `onOpen`, or a click on the clear button or on a chip's remove
   *   button while the widget holds no focus, which focuses the trigger.
   * - Does not fire for a move inside the widget, such as `open()` moving
   *   focus from the trigger to the filter input.
   * - Has no link to the active row, the row the arrow keys move inside the
   *   popup; that row never holds DOM focus.
   * - `null` (default) = no consumer listener; no `focusin` listener is
   *   attached.
   * @group Events
   */
  onFocus: (() => void) | null
  /**
   * Fired **after** DOM focus left the widget.
   *
   * > No **before** counterpart: there is no `onBeforeBlur`, and the `focusin` / `focusout` events the library observes are not cancelable, so none could stop the move.
   *
   * - Fires once when focus moves to an element outside the widget or to
   *   nowhere: Tab away, a click on an element outside, a click on a
   *   non-focusable area.
   * - Does not fire for a move inside the widget.
   * - When focus leaving closes the popup, {@link onClose} fires first, so
   *   `isOpened()` is already `false` here.
   * - Does not fire from `destroy()` or from `setDisabled(true)`.
   *   `setDisabled(true)` closes an open popup, which returns focus to the
   *   trigger, inside the widget; `destroy()` detaches the focus listeners
   *   before its teardown can move focus.
   * - While the popup is open with `outsideClickBehavior: 'block'`, an
   *   outside mousedown is default-prevented: focus stays, the popup closes,
   *   and this does not fire.
   * - `null` (default) = no consumer listener.
   * @group Events
   */
  onBlur: (() => void) | null
  /**
   * Fired **after** the active row changed to another item, or to no item.
   *
   * > No **before** counterpart: there is no `onBeforeActiveItemChange`.
   *
   * - The active row is the row of the popup list that the arrow keys move
   *   and that `aria-activedescendant` points to. It never holds DOM focus;
   *   {@link onFocus} reports DOM focus.
   * - `item` is the item of the new active row, or `undefined` when no item
   *   row is active: the popup is closed, no item matches the filter, or the
   *   active row is the choose-all row or an action row.
   * - Fires on open with the initial row, **after** {@link onOpen}; on every
   *   arrow, page, Home / End and typeahead move; on a click, **before** the
   *   change it requests; when a filter keystroke, `setItems()`, `rerender()`
   *   or a chosen-state re-render moves the row; and on close with
   *   `undefined`, **after** {@link onClose}.
   * - A listener may close or reopen the widget. The report is the last step
   *   of `open()` and of `close()`, so that nested transition runs after the
   *   outer one completed. A click or a filter keystroke whose listener closed
   *   the popup activates nothing and reports no query change.
   * - Fires only when the item changed under `compareFn`. A row rebuilt in
   *   place for the same item does not fire, and a move between the
   *   choose-all row and an action row does not fire either: both are "no
   *   item".
   * - Runs **after** the DOM reflects the new row, so `getVisibleItems()` is
   *   current. Never fires for a mouse hover: hovering does not move the
   *   active row.
   * - An item that is itself `undefined` cannot be told from "no item".
   * - `null` (default) = no consumer listener.
   * @group Events
   */
  onActiveItemChange: ((item: T | undefined) => void) | null
  /**
   * Called **after** the filter text changed and the list was re-rendered.
   *
   * > No **before** counterpart: there is no `onBeforeFilterQueryChange`.
   *
   * - Fires on typing, when an IME composition ends, and when Esc clears a
   *   non-empty query. `query` is the new text.
   * - Does not fire when the text stays the same, when `close()` clears the
   *   query (use `onClose`), when `open()` starts with an empty query, or on
   *   `setItems()` / `rerender()`.
   * - Runs **after** the list is rebuilt, so `getVisibleItems()` already
   *   reflects the new text. Rewrite a header count from here, from `onOpen`
   *   and from `onChange`.
   * - `null` (default): nothing is called.
   * @group Events
   */
  onFilterQueryChange: ((query: string) => void) | null
}

/**
 * Constructor input for a resolved settings bag `S`: every field optional,
 * and `uiTranslationPack` accepts a PARTIAL pack (missing keys fall back to
 * English). Shared by the base / single / multiple `*SettingsInput` types;
 * use it for a subclass wrapper that extends the settings bag.
 * @group Settings
 * @category Base
 */
export type LLSelectSettingsInputOf<S extends { uiTranslationPack: LLSelectUiTranslationPack }> =
  & Partial<Omit<S, 'uiTranslationPack'>>
  & { uiTranslationPack?: Partial<LLSelectUiTranslationPack> }

/**
 * Constructor-time settings input - every field is optional and missing
 * fields fall back to the library defaults.
 * @group Settings
 * @category Base
 */
export type LLSelectBaseSettingsInput<T, GroupKey = string> = LLSelectSettingsInputOf<LLSelectBaseSettings<T, GroupKey>>

/**
 * Resolved CSS class names and DOM ids for one instance. Exposed on
 * `instance.classIdMap` so callers can reuse them in their own CSS or query
 * selectors instead of hard-coding the strings.
 * @group CSS & DOM
 */
export interface LLSelectClassIdMap {
  /** Class on `rootEl` (the caller-passed mount element). */
  rootClass: string
  /**
   * Class on `triggerEl` (the interactive trigger). Its `role` is
   * `combobox` while the filter is inactive and `button` while a filterable popup
   * is open; see `docs/llm/A11Y.md`.
   */
  triggerClass: string
  /** Class on the inner span where content (text/tags) is rendered. */
  triggerContentClass: string
  /** Class on the inner span where the optional dropdown arrow lives. */
  triggerArrowClass: string
  /** Class on the clear (x) button slot in the trigger (`clearable`). */
  triggerClearButtonClass: string
  /** Class on `popupEl` (the outer popup wrapper, no ARIA role). */
  popupClass: string
  /** Class on `popupListEl` (the inner element with `role="listbox"`). */
  popupListClass: string
  /**
   * Class on the no-results message element (`role="status"`), shown below
   * the (empty) listbox when the visible item list has zero entries.
   */
  popupListNoResultsClass: string
  /**
   * Class on `popupHeaderEl`, the pinned header container between the filter
   * input and the listbox. The element exists only when header content was
   * built (`createPopupHeaderContentElFn`, or a `createPopupHeaderEl` override).
   */
  popupHeaderClass: string
  /**
   * Class on `popupFooterEl`, the pinned footer container at the bottom of
   * the popup. Exists only when footer content was built.
   */
  popupFooterClass: string
  /**
   * Class on every action row (`popupListLeadingActionRows` /
   * `popupListTrailingActionRows`). Also carries `popupListRowClass`, so hover /
   * focused / disabled styling comes from there.
   */
  popupListActionRowClass: string
  /**
   * Class on `popupListPinnedLeadingRowsEl`, the sticky wrapper around the
   * leading rows when `popupListLeadingRowsPinned` is on.
   */
  popupListPinnedLeadingRowsClass: string
  /**
   * Class on `popupListPinnedTrailingRowsEl`, the sticky wrapper around the
   * trailing rows when `popupListTrailingRowsPinned` is on.
   */
  popupListPinnedTrailingRowsClass: string
  /**
   * Class on the choose-all row (`LLSelectMultiple`, `chooseAllRow`
   * setting). Also carries `popupListRowClass` plus `data-chosen-state="none|some|all"`
   * for the tri-state visual.
   */
  chooseAllRowClass: string
  /** Class on every row of the popup list (`role="option"`): item rows, the choose-all row, and action rows. */
  popupListRowClass: string
  /** Extra class on the active row: the row `aria-activedescendant` points to, which the arrow keys move. Style the active row with it. The row never holds DOM focus. */
  popupListRowFocusedClass: string
  /** Class on a disabled row, which also carries `aria-disabled="true"`. A stable hook for styling and tooltip targeting. */
  popupListRowDisabledClass: string
  /**
   * Class on a group container (`role="group"`). A disabled group's container
   * also carries `aria-disabled="true"` + `data-disabled="true"`.
   */
  groupClass: string
  /**
   * Class on the visible group label element (`aria-hidden`), inside the group
   * container above its items. A hook for styling / sticky labels.
   */
  groupLabelClass: string
  /** Class on the tag-list container in `triggerDisplay: 'tags'` mode (multi). */
  tagsClass: string
  /** Class on one tag chip (`triggerDisplay: 'tags'`). */
  tagClass: string
  /** Class on a tag's remove (x) button; `aria-label` names the item, `tabindex="-1"`. */
  tagRemoveButtonClass: string
  /** Class on a tag's default text span (built when `createTagContentElFn` is unset or returns `null`); it carries the item's `lang` from `itemToLangFn`. */
  tagTextClass: string
  /**
   * Class on a tag chip whose item is effectively disabled (which also carries
   * `aria-disabled="true"`, and whose x button no longer removes it). Mirrors
   * `popupListRowDisabledClass`; a stable hook for greying the inert chip.
   */
  tagDisabledClass: string
  /**
   * Class added to `rootEl` while the popup is open. Use it as a CSS hook
   * for open-state styling (also available as `[data-state='open']` on the
   * trigger).
   */
  openClass: string
  /** DOM `id` of `triggerEl`. Unique across instances. */
  triggerId: string
  /**
   * DOM `id` minted onto the `labelEl` setting's element when it has none
   * (the resolved `ariaLabelledBy` then references it). Unique across
   * instances. Unused when `labelEl` is null or already carries an id.
   */
  labelId: string
  /** DOM `id` of the trigger content span. Unique across instances. */
  triggerContentId: string
  /**
   * DOM `id` of the hidden plain-text value span (root-level sibling of the
   * trigger). Unique across instances. Referenced by the filterable-mode
   * trigger's `aria-labelledby` chain so the closed button's accessible name
   * includes the current value as PLAIN TEXT - rich trigger content (tag
   * chips with labelled remove buttons) must not leak control names into the
   * field name (see the `ariaLabel` / `ariaLabelledBy` settings).
   */
  triggerValueId: string
  /**
   * DOM `id` of `popupListEl` (the inner listbox). Unique across instances.
   * Referenced by the trigger's `aria-controls` attribute.
   */
  popupListId: string
  /** Class on the filter input element inside the popup. */
  filterInputClass: string
  /** DOM `id` of the filter input. Unique across instances. */
  filterInputId: string
}

const DEFAULT_PREFIX = 'llselect'

let instanceCounter = 0

/**
 * Package-internal (not re-exported): subclasses detect it to pick fast paths.
 * SameValueZero (`===` plus `NaN` equals `NaN`), matching the `Set` those fast
 * paths use - `===` alone let a `NaN` item be chosen twice (QUALITY-92).
 * Second job: the reference-swap check in both `onItemsChanged` ("same value?",
 * a different question from item identity). Keep it SameValueZero for that too.
 */
export function defaultCompareFn<T>(a: T, b: T): boolean {
  return a === b || (a !== a && b !== b)
}

/**
 * Blank and whitespace-only name settings count as UNSET: the accessible-name
 * computation skips an empty `aria-label` and moves on, so the ladder (and
 * the unnamed warn) must do the same instead of treating `''` as "named".
 */
function blankToNull(value: string | null | undefined): string | null {
  return value == null || value.trim() === '' ? null : value
}

/** Once-per-page guard for the unnamed-accessible-name warning. */
let warnedUnnamedName = false

/** Package-internal test hook (not re-exported): reset the once-per-page unnamed-name warning. */
export function resetUnnamedNameWarning(): void {
  warnedUnnamedName = false
}

/** Once-per-page guard for the duplicate-items warning. */
let warnedDuplicateItems = false

/** Package-internal test hook (not re-exported): reset the once-per-page duplicate-items warning. */
export function resetDuplicateItemsWarning(): void {
  warnedDuplicateItems = false
}

function createClassIdMap(prefix: string): LLSelectClassIdMap {
  const uniq = `${prefix}${++instanceCounter}`
  return {
    rootClass: `${prefix}-root`,
    triggerClass: `${prefix}-trigger`,
    triggerContentClass: `${prefix}-trigger-content`,
    triggerArrowClass: `${prefix}-trigger-arrow`,
    triggerClearButtonClass: `${prefix}-trigger-clear-button`,
    popupClass: `${prefix}-popup`,
    popupListClass: `${prefix}-popup-list`,
    popupListNoResultsClass: `${prefix}-popup-list-no-results`,
    popupHeaderClass: `${prefix}-popup-header`,
    popupFooterClass: `${prefix}-popup-footer`,
    popupListActionRowClass: `${prefix}-popup-list-action-row`,
    popupListPinnedLeadingRowsClass: `${prefix}-popup-list-pinned-leading-rows`,
    popupListPinnedTrailingRowsClass: `${prefix}-popup-list-pinned-trailing-rows`,
    chooseAllRowClass: `${prefix}-choose-all-row`,
    popupListRowClass: `${prefix}-popup-list-row`,
    popupListRowFocusedClass: `${prefix}-popup-list-row-focused`,
    popupListRowDisabledClass: `${prefix}-popup-list-row-disabled`,
    groupClass: `${prefix}-group`,
    groupLabelClass: `${prefix}-group-label`,
    tagsClass: `${prefix}-tags`,
    tagClass: `${prefix}-tag`,
    tagRemoveButtonClass: `${prefix}-tag-remove-button`,
    tagTextClass: `${prefix}-tag-text`,
    tagDisabledClass: `${prefix}-tag-disabled`,
    openClass: `${prefix}-open`,
    triggerId: `${uniq}-trigger`,
    labelId: `${uniq}-label`,
    triggerContentId: `${uniq}-trigger-content`,
    triggerValueId: `${uniq}-trigger-value`,
    popupListId: `${uniq}-popup-list`,
    filterInputClass: `${prefix}-filter-input`,
    filterInputId: `${uniq}-filter-input`,
  }
}

/**
 * A non-item entry of the arrow-key ring that can hold the active option: the
 * choose-all row, or an action row (by block and array index).
 */
type FocusedRingRow =
  | { kind: 'choose-all' }
  | { kind: 'leading' | 'trailing'; index: number }

/** One entry of the arrow-key ring, in ring order: choose-all row, leading action rows, items, trailing action rows. */
type RingEntry =
  | { kind: 'choose-all' }
  | { kind: 'leading' | 'trailing'; index: number }
  | { kind: 'item'; index: number }

/**
 * One run in the rendered popup list: a single ungrouped item element, or a
 * group (label + its item elements). Computed from the flat visible list;
 * group labels never enter `itemEls`, so index alignment is preserved.
 */
type PopupListSegment<T, GroupKey> =
  | { readonly group: false; readonly el: HTMLElement }
  | { readonly group: true; readonly key: GroupKey; readonly index: number; readonly items: T[]; readonly els: HTMLElement[] }

/**
 * Abstract base for all select variants. Owns DOM scaffolding, ARIA wiring,
 * positioning, keyboard navigation, lazy popup-list rendering, and
 * outside-click handling. Subclasses (`LLSelectSingle`, `LLSelectMultiple`)
 * own chosen-state, decide what happens on item click, and customise the
 * trigger text via `renderTriggerContent`.
 *
 * @typeParam T - item value type. Use `unknown` (default) only when you
 *   intend to narrow inside templates / handlers; usually pass a concrete
 *   type like `string` or your domain object.
 * @typeParam GroupKey - the group key type `itemToGroupKeyFn` returns
 *   (`null` from that fn means "this item is in no group"). Defaults to
 *   `string`. Open it to objects only together with `groupKeyCompareFn`; see
 *   DESIGN.md "Data model".
 * @typeParam S - the resolved settings type, for subclasses that EXTEND the
 *   settings bag. Plain use never passes it. A subclass declares
 *   `extends LLSelectBase<T, GroupKey, MySettings>` and `this.settings` is
 *   typed `MySettings`; the constructor's `subclassSettings` param then only
 *   accepts exactly the extra fields.
 * @group Select classes
 */
export abstract class LLSelectBase<T = unknown, GroupKey = string, S extends LLSelectBaseSettings<T, GroupKey> = LLSelectBaseSettings<T, GroupKey>> {
  /**
   * The caller-passed mount element, now decorated as the select's root.
   * Library does not replace this node, so the caller's original reference,
   * id, and data-* attributes stay valid.
   * @group DOM elements
   */
  public readonly rootEl: HTMLElement
  /**
   * The interactive trigger element. Receives focus, click, and keydown
   * events; carries `aria-expanded`, `aria-controls`, and
   * `data-state="open|closed"`. Its `role` depends on the filter mode: `combobox`
   * while the filter is inactive (it then also hosts `aria-activedescendant`) and
   * `button` while a filterable popup is open (the filter input hosts
   * `aria-activedescendant`). See `docs/llm/A11Y.md`.
   * @group DOM elements
   */
  public readonly triggerEl: HTMLElement
  /**
   * Inner span inside the trigger where text/tags are written.
   * Subclasses' `renderTriggerContent` writes here so the sibling arrow slot
   * is preserved across re-renders.
   * @group DOM elements
   */
  public readonly triggerContentEl: HTMLElement
  /**
   * Hidden root-level span (sibling of the trigger) mirroring the current
   * value as plain text. Kept in sync by `commitTriggerContentToDom`;
   * referenced by the filterable-mode `aria-labelledby` chain (see
   * `classIdMap.triggerValueId`). Outside the trigger so
   * `triggerEl.textContent` stays exactly the visible content.
   * @group DOM elements
   */
  protected readonly triggerValueEl: HTMLElement
  /**
   * The outer popup wrapper. Has no ARIA role itself - it just hosts the
   * popup chrome (future: filter input, toggle-all control) and the inner
   * `popupListEl`. Hidden via the `hidden` attribute when closed; positioned
   * via inline styles by the positioner when open.
   * @group DOM elements
   */
  public readonly popupEl: HTMLElement
  /**
   * The inner element with `role="listbox"`, holding the item children.
   * Sits inside `popupEl` so siblings (filter input, toggle-all) can live
   * above it without violating ARIA's "listbox children must be options"
   * rule. The trigger's `aria-controls` points to this element.
   * @group DOM elements
   */
  public readonly popupListEl: HTMLElement
  /**
   * The pinned header container between the filter input and the listbox,
   * or `null` when no header content was built. No ARIA role; outside the
   * scroll area. Built once in the constructor (`createPopupHeaderEl`) and
   * kept until `destroy()`; the library never rebuilds or moves it.
   * @group DOM elements
   */
  public readonly popupHeaderEl: HTMLElement | null
  /**
   * The pinned footer container at the bottom of the popup, after the
   * no-results message, or `null` when no footer content was built. Same
   * lifecycle as {@link popupHeaderEl}.
   * @group DOM elements
   */
  public readonly popupFooterEl: HTMLElement | null
  /**
   * The wrapper around the pinned leading rows, or `null`.
   * - Built once in the constructor when `popupListLeadingRowsPinned` is
   *   `true`; `null` otherwise.
   * - A `div` with `role="presentation"` and class
   *   `popupListPinnedLeadingRowsClass`; the library sets `position: sticky`
   *   and `top: 0` on it inline.
   * - In the listbox only while the leading rows exist. The library moves it
   *   in and out on every list render. Its classes are yours to change after
   *   `new`.
   * - `data-edge-to-items` is set on every list render: `"true"` when that
   *   render lists items, `"false"` when it lists none; absent before the
   *   first render.
   * - It is a CSS hook for the themes: they draw the block's edge line only
   *   when it is true, so two blocks that touch draw no line between them.
   * @group DOM elements
   */
  public readonly popupListPinnedLeadingRowsEl: HTMLElement | null
  /**
   * The wrapper around the pinned trailing rows, or `null`.
   * - Same contract as {@link popupListPinnedLeadingRowsEl}, for
   *   `popupListTrailingRowsPinned`, with `bottom: 0`.
   * @group DOM elements
   */
  public readonly popupListPinnedTrailingRowsEl: HTMLElement | null
  /**
   * Resolved class names and ids for this instance.
   * @group DOM elements
   */
  public readonly classIdMap: LLSelectClassIdMap

  /**
   * Resolved settings (defaults applied) - ONE bag for the whole hierarchy.
   * Typed by the class's `S` param: a subclass that extends the settings
   * passes its resolved extra fields through the constructor's
   * `subclassSettings` param, and this field is `S` with no re-typing
   * (see `LLSelectSingle` / `LLSelectMultiple`).
   * @group State (protected)
   */
  protected readonly settings: S
  /** Raw explicit `placeholder` (constructor or `setPlaceholder`); `setUiTranslationPack` re-resolves against it. */
  private explicitPlaceholder: string | null
  /** True when the constructor minted `classIdMap.labelId` onto `labelEl`; `destroy()` then removes it. */
  private labelElIdMinted = false
  /** Click handler bound to `labelEl`: focus the trigger, never open (native label parity). */
  private readonly handleLabelElClick = (): void => { this.triggerEl.focus() }
  /**
   * Current item list. Defensive copy of what `setItems` was given.
   * @group State (protected)
   */
  protected items: T[] = []
  /** Whether the popup is currently open; public reader {@link isOpened}. */
  private opened = false
  /** True while `close()` returns focus to the trigger; `open()` refuses during that call. */
  private closing = false
  /**
   * Position in `getVisibleItems()` (the rendered list, not `items`) of the
   * currently keyboard-focused item, or `-1` when no item is focused: the
   * popup is closed, no item is rendered, or the choose-all row or an action
   * row is the active row. "Focused" here means the active row, the row
   * `aria-activedescendant` points to; DOM focus stays on the trigger or the
   * filter input.
   * @group State (protected)
   */
  protected focusedIndex = -1
  /** Control-level disabled state (whole select); toggled via `setDisabled`. */
  private disabled = false
  /**
   * Becomes true in `destroy()` and stays true.
   * - The clear button's and the chip remove button's clicks check it after
   *   their focus step, since an `onFocus` listener may destroy the widget
   *   there.
   * @internal
   */
  protected destroyed = false
  /** The latest decision; see `getColorScheme()`. */
  private resolvedColorScheme: 'light' | 'dark' = 'light'
  /** True from construction until the first decision ran (batched into a microtask, see color-scheme.ts). */
  private colorSchemeDecisionPending = false
  private readonly colorSchemeDecision = { decideNow: (): void => { this.syncColorScheme() } }
  /**
   * Who the change being applied right now is attributed to; the variants'
   * `onChange` firing reads it. Set to `'user'` by `withUserChangeSource`
   * and consumed (reset to `'api'`) by the first chosen-state change, before
   * `onChosenChanged` runs, so a nested api-driven change inside an
   * `onChange` handler reports `'api'`.
   * @group State (protected)
   */
  protected changeSource: LLSelectChangeSource = 'api'
  /**
   * Bumped by every chosen-state change and every `setItems`. The
   * before-change gate drops a pending change when it moved during the
   * handlers, so a setter called inside them wins, even one that restores
   * the previous value.
   * @internal
   */
  protected changeRevision = 0
  private triggerArrowEl: HTMLElement
  /** The clear button once a trigger render has built it (`clearable` only), else `null`; every later trigger render swaps it through `createTriggerClearButtonEl` (or keeps it, if that override returns the same element). */
  private triggerClearButtonEl: HTMLElement | null = null
  private positioner: Positioner | undefined
  /**
   * Whether the Popover API exists (feature-detected once per instance).
   * When true the popup renders in the top layer while open - above every
   * stacking context, immune to containing-block-creating ancestors - while
   * staying in place in the DOM. See `docs/llm/DESIGN.md` "In-place popup".
   */
  private readonly popoverSupported: boolean
  private itemEls: HTMLElement[] = []
  private focusedEl: HTMLElement | undefined
  /**
   * The choose-all row element (`LLSelectMultiple` only) for the current
   * render, or `undefined` when absent. Never part of `itemEls`.
   */
  private chooseAllRowEl: HTMLElement | undefined
  /**
   * The non-item ring entry that holds the active option (the choose-all
   * row today), or `null` when an item does, or nothing does.
   * Mutually exclusive with `focusedIndex >= 0`.
   */
  private focusedRow: FocusedRingRow | null = null
  /** The last item reported to `onActiveItemChange`, or none; see `reportActiveItem`. */
  private reportedActiveItem: { active: true; item: T } | { active: false } = { active: false }
  /** Above zero while `open()` renders and places the initial row; its tail reports once instead. A depth, so a nested open inside a content function cannot end the outer suspension early. */
  private activeItemReportSuspendDepth = 0
  /**
   * Bumped by `open`, `close`, `rerender` and `destroy`. With `changeRevision`
   * it forms the stamp a row click takes before its active-row move
   * (`captureStateStamp`); the click activates nothing when a listener moved
   * either counter, since a close, a reopen, a rebuild or a value change
   * under it leaves the row it meant in a popup state that is gone
   * (DESIGN.md "Active item change").
   */
  private transitionGeneration = 0
  /** The rendered action rows of the current render, in array order; empty while closed. Never part of `itemEls`. */
  private leadingActionRowEls: HTMLElement[] = []
  private trailingActionRowEls: HTMLElement[] = []
  private outsideHandler: ((ev: Event) => void) | undefined
  /**
   * The reason the next `open()` / `close()` reports. An internal path sets
   * it right before the call (`openWithReason` / `closeWithReason`); the
   * method reads and resets it first thing, so a call from outside reports
   * `'api'` and a refused call leaves nothing behind.
   */
  private pendingOpenReason: LLSelectOpenReason = 'api'
  private pendingCloseReason: LLSelectCloseReason = 'api'
  /** The whole-life focus listeners on `rootEl`; see `attachFocusListeners`. */
  private focusInHandler: ((ev: FocusEvent) => void) | undefined
  private focusOutHandler: ((ev: FocusEvent) => void) | undefined
  /**
   * Block-mode only. Suppresses the browser's default focus shift on outside
   * mousedown so the focusout-close path cannot race ahead of the click
   * capture and detach it before the click fires.
   */
  private blockMouseDownHandler: ((ev: Event) => void) | undefined
  /**
   * Element that owns `aria-activedescendant` and receives keydown for option
   * navigation. Equals the filter input while the filter is active, else the
   * trigger. Re-pointed by `syncFilterModeToDom` (constructor + every open).
   */
  private comboboxEl!: HTMLElement
  /**
   * Filter input element. Always built into the popup DOM and always wired
   * (a `hidden` input receives no events); kept `hidden` while the filter is
   * inactive.
   */
  private filterInputEl!: HTMLInputElement
  /**
   * No-results message element (`role="status"`). Always built (like the
   * filter input), sits AFTER the listbox inside `popupEl` so the listbox
   * keeps its options-only children contract; `hidden` while the visible
   * list has entries.
   */
  private popupListNoResultsEl!: HTMLElement

  /**
   * Text last written into the no-results region, or `null` while it is hidden.
   * Guards a re-announcement: `role="status"` speaks on every content change, so
   * a keystroke that keeps the list empty must not rewrite identical text (A11Y.md:
   * announced once per appearance). Reset to `null` when the region hides, so the
   * next appearance announces again.
   */
  private lastNoResultsText: string | null = null
  /**
   * Whether the filter input is active for the CURRENT open cycle. Evaluated
   * from the `filterable` setting (predicate form reads the current items) in
   * the constructor and on every `open()` - never re-evaluated mid-open, so
   * the focus host cannot be yanked while the popup is up.
   */
  private filterActive: boolean
  private query = ''
  private filteredItems: T[] | undefined
  // Prefix-typeahead state. Expiry is a timestamp delta checked on the next
  // character (getUpdatedTypeaheadBuffer) - no timer to clean up. Reset by close()
  // and by any mapped action key.
  private typeaheadBuffer = ''
  private typeaheadLastTime = 0
  /** Memoized display order of `items` (`gatherGroups` gather); `undefined` = recompute on next need. */
  private gatheredItems: readonly T[] | undefined
  private composing = false

  /**
   * @param targetEl - mount element. Becomes `rootEl`; its existing children
   *   are wiped and replaced with the trigger + popup structure. Pre-set
   *   classes / id / data-* attributes on this element are preserved.
   * @param settings - optional partial settings. Missing fields use defaults
   *   ({@link LLSelectBaseSettings}).
   * @param subclassSettings - for subclasses that EXTEND the settings bag: their
   *   own fields, already resolved (defaults applied). Typed by the class's
   *   `S` param, so it accepts exactly the extra fields and nothing else.
   *   Merged into `this.settings` right here, so the bag is complete before
   *   any base construction code (e.g. `createFilterInputEl` reading the
   *   pack) can read it.
   * @group Lifecycle
   */
  constructor(
    targetEl: HTMLElement,
    settings?: LLSelectSettingsInputOf<S>,
    subclassSettings?: Omit<S, keyof LLSelectBaseSettings<T, GroupKey>>,
  ) {
    // classIdMap first: labelEl id minting below needs labelId.
    this.classIdMap = createClassIdMap(settings?.cssClassPrefix ?? DEFAULT_PREFIX)
    // The pack resolves first: the placeholder's library default is localized
    // chrome (uiTranslationPack.triggerPlaceholder), while an explicit `placeholder` is
    // app copy and wins. The raw input placeholder is kept so
    // setUiTranslationPack can re-run this exact resolution.
    this.explicitPlaceholder = settings?.placeholder ?? null
    const uiTranslationPack: LLSelectUiTranslationPack = { ...DEFAULT_UI_TRANSLATION_PACK, ...settings?.uiTranslationPack }
    // Copied: the settings bag is frozen, and a caller's later array edits must not leak in.
    const leadingActionRows: readonly LLSelectPopupListActionRow[] = settings?.popupListLeadingActionRows ? [...settings.popupListLeadingActionRows] : []
    const trailingActionRows: readonly LLSelectPopupListActionRow[] = settings?.popupListTrailingActionRows ? [...settings.popupListTrailingActionRows] : []
    // labelEl resolves before the name ladder: with neither `ariaLabelledBy`
    // nor `ariaLabel` given, the label's id becomes the resolved
    // `ariaLabelledBy`, and every downstream consumer (trigger chain, filter
    // input, listbox) works unchanged.
    const labelEl = settings?.labelEl ?? null
    if (labelEl !== null && labelEl.id === '') {
      labelEl.id = this.classIdMap.labelId
      this.labelElIdMinted = true
    }
    this.settings = {
      cssClassPrefix: settings?.cssClassPrefix ?? DEFAULT_PREFIX,
      placeholder: this.explicitPlaceholder ?? uiTranslationPack.triggerPlaceholder,
      ariaLabel: blankToNull(settings?.ariaLabel),
      ariaLabelledBy: blankToNull(settings?.ariaLabelledBy) ?? (blankToNull(settings?.ariaLabel) === null && labelEl !== null ? labelEl.id : null),
      labelEl,
      compareFn: settings?.compareFn ?? defaultCompareFn,
      outsideClickBehavior: settings?.outsideClickBehavior ?? 'pass-through',
      colorScheme: settings?.colorScheme ?? 'auto',
      createTriggerArrowContentElFn: settings?.createTriggerArrowContentElFn ?? null,
      clearable: settings?.clearable ?? false,
      createTriggerClearButtonContentElFn: settings?.createTriggerClearButtonContentElFn ?? null,
      filterable: settings?.filterable ?? false,
      uiTranslationPack,
      filterFn: settings?.filterFn ?? null,
      createPopupListNoResultsContentElFn: settings?.createPopupListNoResultsContentElFn ?? null,
      createPopupHeaderContentElFn: settings?.createPopupHeaderContentElFn ?? null,
      createPopupFooterContentElFn: settings?.createPopupFooterContentElFn ?? null,
      popupListLeadingActionRows: leadingActionRows,
      popupListTrailingActionRows: trailingActionRows,
      popupListLeadingRowsPinned: settings?.popupListLeadingRowsPinned ?? false,
      popupListTrailingRowsPinned: settings?.popupListTrailingRowsPinned ?? false,
      popupWidthPolicy: settings?.popupWidthPolicy ?? 'fit-content',
      itemDisabledFn: settings?.itemDisabledFn ?? null,
      focusableWhenDisabled: settings?.focusableWhenDisabled ?? false,
      itemToStringFn: settings?.itemToStringFn ?? null,
      itemToLangFn: settings?.itemToLangFn ?? null,
      createPopupListItemContentElFn: settings?.createPopupListItemContentElFn ?? null,
      itemToGroupKeyFn: settings?.itemToGroupKeyFn ?? null,
      gatherGroups: settings?.gatherGroups ?? true,
      groupKeyCompareFn: settings?.groupKeyCompareFn ?? null,
      groupKeyToStringFn: settings?.groupKeyToStringFn ?? null,
      groupKeyToLangFn: settings?.groupKeyToLangFn ?? null,
      groupDisabledFn: settings?.groupDisabledFn ?? null,
      createGroupLabelContentElFn: settings?.createGroupLabelContentElFn ?? null,
      onOpen: settings?.onOpen ?? null,
      onClose: settings?.onClose ?? null,
      onFocus: settings?.onFocus ?? null,
      onBlur: settings?.onBlur ?? null,
      onActiveItemChange: settings?.onActiveItemChange ?? null,
      onFilterQueryChange: settings?.onFilterQueryChange ?? null,
      // Settings cast (one per constructor, see single / multiple): TS
      // cannot prove "base fields + Omit<S, base keys>" reassembles a generic
      // S. The channel itself is typed: the subclassSettings param accepts
      // exactly the extra fields.
      ...subclassSettings,
    } as S
    // Loud failure over a silent a11y violation, like the group-order warn:
    // an unnamed combobox violates WAI-ARIA 1.2 (A11Y.md, name ladder).
    // Once per page, not per instance - a page full of unnamed widgets (a
    // benchmark, a sandbox) must not flood the console nor pay a per-build
    // cost; one nudge carries the rule.
    if (!warnedUnnamedName && this.settings.ariaLabel === null && this.settings.ariaLabelledBy === null) {
      warnedUnnamedName = true
      // The element rides along so DevTools can jump straight to the first
      // offender instead of leaving the developer to hunt.
      console.warn('llselect: this widget has no accessible name - pass ariaLabelledBy, ariaLabel, or labelEl. An unnamed combobox violates WAI-ARIA 1.2. (warned once per page; first offender:)', targetEl)
    }
    // Label click focuses the trigger (native <select> label behavior: focus
    // only, never open). The one listener destroy() must undo outside the root.
    if (labelEl !== null) { labelEl.addEventListener('click', this.handleLabelElClick) }
    // Initial evaluation runs against the empty item list (setItems has not
    // happened yet); every open() re-evaluates.
    this.filterActive = this.computeFilterActive()

    // Caller-passed element becomes root (preserves its id / external refs).
    this.rootEl = targetEl
    this.rootEl.classList.add(this.classIdMap.rootClass)
    // Opt the select subtree out of browser scroll-anchoring. Without this,
    // showing/hiding the popup on first open after a page load can trigger
    // a window scroll as the browser tries to keep an anchor element in
    // place. The property excludes this element and all descendants from
    // being eligible anchor nodes.
    this.rootEl.style.overflowAnchor = 'none'
    this.rootEl.replaceChildren()
    // This instance owns the element from now on (an older instance on it
    // loses its pending decision and its subscription). A forced scheme is
    // written now; an 'auto' instance decides in a microtask (before the
    // first paint, one style flush per batch of widgets) and re-decides on
    // the shared page listeners.
    claimColorSchemeRoot(this.rootEl)
    if (this.settings.colorScheme === 'auto') {
      this.colorSchemeDecisionPending = true
      queueFirstDecision(this.rootEl, this.colorSchemeDecision)
      subscribeColorScheme(this.rootEl, { refresh: () => { this.syncColorScheme() } })
    } else {
      this.syncColorScheme()
    }

    this.triggerEl = this.createTriggerEl()
    this.triggerContentEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerContentClass}`) as HTMLElement
    this.triggerArrowEl = this.triggerEl.querySelector(`.${this.classIdMap.triggerArrowClass}`) as HTMLElement
    // Hidden plain-text mirror of the current value, kept in sync by
    // commitTriggerContentToDom. The filterable-mode aria-labelledby chain
    // references THIS span (not the content span) so labelled controls in rich
    // content (tag remove buttons) never enter the field's accessible name.
    // A root-level sibling, NOT inside triggerEl: hidden-but-referenced text
    // still names the field, while `triggerEl.textContent` stays exactly the
    // visible content (no doubled text for consumers reading it).
    this.triggerValueEl = document.createElement('span')
    this.triggerValueEl.id = this.classIdMap.triggerValueId
    this.triggerValueEl.hidden = true

    this.popupEl = this.createPopupEl()
    this.popupListEl = this.createPopupListEl()
    // Pinned blocks: one presentational sticky wrapper per pinned block, built
    // once; commitPopupSegmentsToDom puts it in the listbox only while the
    // block has rows.
    this.popupListPinnedLeadingRowsEl = this.settings.popupListLeadingRowsPinned
      ? this.createPopupListPinnedRowsEl(this.classIdMap.popupListPinnedLeadingRowsClass, 'top')
      : null
    this.popupListPinnedTrailingRowsEl = this.settings.popupListTrailingRowsPinned
      ? this.createPopupListPinnedRowsEl(this.classIdMap.popupListPinnedTrailingRowsClass, 'bottom')
      : null
    this.filterInputEl = this.createFilterInputEl()
    // input always built; non-filterable keeps it `hidden`. The filter box must
    // sit above the listbox: listbox children must be options only.
    this.popupListNoResultsEl = this.createPopupListNoResultsEl()
    this.popupEl.append(this.filterInputEl, this.popupListEl, this.popupListNoResultsEl)
    // Pinned slots: built once, only when their content method returns an
    // element, and never rebuilt (DESIGN.md "Popup header / footer slots").
    // Order: [filter input, header, list, no-results, footer].
    this.popupHeaderEl = this.createPopupHeaderEl()
    if (this.popupHeaderEl !== null) { this.popupListEl.before(this.popupHeaderEl) }
    this.popupFooterEl = this.createPopupFooterEl()
    if (this.popupFooterEl !== null) { this.popupEl.append(this.popupFooterEl) }
    // Esc from a focusable control the app placed in a slot closes the popup
    // like Esc on the combobox host. Attached only when a slot exists: without
    // one, nothing inside the popup can hold DOM focus except the filter
    // input, whose own handler already covers Esc (A11Y.md "Focus").
    if (this.popupHeaderEl !== null || this.popupFooterEl !== null) {
      this.popupEl.addEventListener('keydown', (ev) => this.handleSlotKeydown(ev))
    }
    this.popupEl.hidden = true
    this.syncFilterModeToDom()
    // Force border-box on the popup elements so the positioner's max-height
    // calculation stays correct regardless of the host page's box-sizing
    // setting. Without this, themes with non-zero padding/border on the
    // popup would render past the maxHeight set by the positioner and get
    // clipped by the viewport edge.
    this.popupEl.style.boxSizing = 'border-box'
    this.popupListEl.style.boxSizing = 'border-box'
    // popup-list takes the remaining vertical space inside popup and scrolls
    // when items overflow. `min-height: 0` lets flex actually shrink it.
    // These are safe to set in the constructor because they have no effect
    // while the parent is `display: none`.
    this.popupListEl.style.flex = '1'
    this.popupListEl.style.minHeight = '0'
    this.popupListEl.style.overflowY = 'auto'

    // Top layer via the Popover API where it exists: while open the popup
    // paints above every stacking context and ignores containing-block
    // -creating ancestors (transform / filter / contain), WITHOUT moving in
    // the DOM - so the rootEl.contains checks, inheritance, ARIA wiring and
    // destroy() hold verbatim. 'manual' on purpose: it disables the
    // browser's light dismiss, keeping this library's own outside-click /
    // Esc logic the sole authority. Browsers without the API run the plain
    // position:fixed path unchanged. See DESIGN.md "In-place popup".
    this.popoverSupported = typeof this.popupEl.showPopover === 'function'
    if (this.popoverSupported) { this.popupEl.setAttribute('popover', 'manual') }

    this.rootEl.append(this.triggerEl, this.triggerValueEl, this.popupEl)

    this.triggerEl.addEventListener('click', () => this.toggle())
    this.triggerEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    this.attachFocusListeners()
    // Hold DOM focus on the combobox host: a mousedown anywhere in the popup - an
    // option, the no-results message, a header / footer slot, popup padding, or
    // the list element itself (tabindex="-1", so click-focusable) - would move focus off the host and
    // silently kill keyboard input (e.g. multi + filterable: mouse-toggle an item,
    // then typing goes nowhere; or a padding/no-results mousedown blurs the host and
    // focusout closes the popup). preventDefault keeps focus put; `click` still fires
    // (it does not depend on the mousedown default), so selection is unaffected. The
    // listener is on popupEl (not popupListEl) so it also covers the no-results
    // element and padding. Exception: the filter input MUST take focus, so its
    // subtree is let through. Native scrollbar dragging on the list is unaffected -
    // a scrollbar mousedown is not a cancelable content event (verified in a real
    // browser; see TODO.md).
    this.popupEl.addEventListener('mousedown', (ev) => {
      const t = this.eventTargetNode(ev)
      if (t instanceof Node && this.filterInputEl.contains(t)) { return }
      ev.preventDefault()
    })
    // Always wired, regardless of the current filter mode: a `hidden` input
    // receives no events, and the predicate form of `filterable` can activate
    // the filter on any later open().
    this.filterInputEl.addEventListener('keydown', (ev) => this.handleKeydown(ev))
    this.filterInputEl.addEventListener('input', () => this.handleSearchInputEvent())
    this.filterInputEl.addEventListener('compositionstart', () => { this.composing = true })
    this.filterInputEl.addEventListener('compositionend', () => { this.composing = false; this.handleSearchInputEvent() })
  }

  /**
   * Evaluate the `filterable` setting against the current items: booleans
   * pass through, the predicate form is called with the full item list.
   */
  private computeFilterActive(): boolean {
    const filterable = this.settings.filterable
    return typeof filterable === 'function' ? filterable(this.items) : filterable
  }

  /**
   * Mirror `filterActive` onto the DOM + wiring it decides: the trigger's
   * role (`button` while active, `combobox` while not), the filter input's
   * `hidden` flag, and which element `comboboxEl` points at (the
   * `aria-activedescendant` / focus host). Called from the constructor and
   * from `open()` after re-evaluation.
   */
  private syncFilterModeToDom(): void {
    this.triggerEl.setAttribute('role', this.filterActive ? 'button' : 'combobox')
    this.filterInputEl.hidden = !this.filterActive
    this.comboboxEl = this.filterActive ? this.filterInputEl : this.triggerEl
    this.syncFieldNameToDom()
    this.syncTriggerTabindex()
  }

  /**
   * Reflect the field's accessible name (`ariaLabel` / `ariaLabelledBy`) onto
   * the elements that carry it. Runs with `syncFilterModeToDom` (constructor +
   * every open) because the trigger's wiring depends on the mode:
   * - Trigger, filter inactive (`role="combobox"`): the name directly; the
   *   combobox VALUE already comes from the trigger content.
   * - Trigger, filter active (`role="button"`): a button's name would
   *   otherwise be its content (the current value) with no field name, so
   *   `aria-labelledby` chains label + content span. With only `ariaLabel`
   *   there is no label element to reference, so the chain starts at the
   *   trigger itself - the accname algorithm substitutes its `aria-label`.
   * - Filter input: the field name replaces the `uiTranslationPack.filterInputAriaLabel`
   *   fallback (while the filter is active the input IS the field's combobox).
   * - Listbox: the field name, both modes.
   */
  private syncFieldNameToDom(): void {
    const apply = (el: HTMLElement, labelledBy: string | null, label: string | null): void => {
      if (labelledBy !== null) { el.setAttribute('aria-labelledby', labelledBy) } else { el.removeAttribute('aria-labelledby') }
      if (label !== null) { el.setAttribute('aria-label', label) } else { el.removeAttribute('aria-label') }
    }
    const { ariaLabel, ariaLabelledBy } = this.settings
    const { triggerId, triggerValueId } = this.classIdMap
    if (ariaLabelledBy !== null) {
      apply(this.triggerEl, this.filterActive ? `${ariaLabelledBy} ${triggerValueId}` : ariaLabelledBy, null)
      apply(this.filterInputEl, ariaLabelledBy, null)
      apply(this.popupListEl, ariaLabelledBy, null)
    } else if (ariaLabel !== null) {
      apply(this.triggerEl, this.filterActive ? `${triggerId} ${triggerValueId}` : null, ariaLabel)
      apply(this.filterInputEl, null, ariaLabel)
      apply(this.popupListEl, null, ariaLabel)
    } else {
      apply(this.triggerEl, null, null)
      apply(this.filterInputEl, null, this.settings.uiTranslationPack.filterInputAriaLabel)
      apply(this.popupListEl, null, null)
    }
  }

  /**
   * Open the popup. Builds item elements lazily, attaches the positioner
   * (which auto-closes if the trigger is scrolled out of view), wires the
   * outside-click handler, and moves keyboard focus into the item list.
   * No-op if already open, and while `close()` is returning focus to the
   * trigger: a focus handler that calls `open()` there is ignored.
   * @group Open & close
   */
  public open(): void {
    const reason = this.pendingOpenReason
    this.pendingOpenReason = 'api'
    if (this.opened || this.disabled || this.closing) { return }
    // A trigger already scrolled out of view / clipped by an ancestor when
    // open() runs cannot host a visible popup, so opening is a no-op (mirrors
    // the disabled guard). This also prevents the positioner's initial
    // synchronous placement from firing onHide -> close() re-entrantly before
    // this.positioner is assigned and the listeners are attached - which would
    // strand the outside-click / focusout / scroll / resize handlers with the
    // control already reporting itself closed (destroy() -> close() then early-
    // returns and cannot recover them).
    if (isAnchorHidden(this.triggerEl)) { return }
    this.syncColorScheme()
    const restoreWindowScroll = this.captureWindowScroll()
    this.opened = true
    this.transitionGeneration++
    // Filter mode is (re)evaluated once per open cycle, before anything that
    // depends on it (role, focus host, filtering).
    this.filterActive = this.computeFilterActive()
    this.syncFilterModeToDom()
    this.triggerEl.setAttribute('aria-expanded', 'true')
    this.triggerEl.setAttribute('data-state', 'open')
    this.rootEl.classList.add(this.classIdMap.openClass)
    if (this.filterActive) {
      this.query = ''
      this.filterInputEl.value = ''
      this.filterInputEl.setAttribute('aria-expanded', 'true')
      this.recomputeFilteredItems()
    }
    // `position: fixed` MUST be set before `hidden = false`. Otherwise the
    // popup is briefly an in-flow `display: flex` block while `renderPopupList`
    // appends its items, which inflates document height by the popup's
    // natural height; browsers can then run scroll-anchoring / URL-bar
    // resize before the positioner takes over and shift window scroll, even
    // though captureWindowScroll restores it at the end.
    // (Layout / display can only be set while open: setting them in the
    // constructor would override the `[hidden]` UA rule and leak the popup
    // before first open.)
    this.popupEl.style.position = 'fixed'
    this.popupEl.style.display = 'flex'
    this.popupEl.style.flexDirection = 'column'
    this.popupEl.hidden = false
    if (this.popoverSupported && this.popupEl.isConnected) {
      // Enter the top layer BEFORE anything measures: a popover not in its
      // showing state is `display: none !important` (UA rule), so the
      // positioner would measure 0. UA `[popover]` also sets `inset: 0`;
      // the positioner's inline top/left override two edges, but the
      // remaining `right/bottom: 0` over-constrain the box - and in an RTL
      // containing block an over-constrained `left` LOSES to `right: 0` -
      // so neutralize both. UA `[popover]` also sets `height: fit-content`:
      // WebKit 18 resolves that to 0 for this column flex box under its
      // `max-height` with a `flex-basis: 0%` list, so the popup showed as
      // its two borders (Safari 18, GNOME Web; FIXME HIGH-705); `auto` is the
      // same shrink-to-fit box in every engine. (isConnected: showPopover()
      // throws on a disconnected element; a detached widget is invisible
      // either way.)
      this.popupEl.showPopover()
      this.popupEl.style.right = 'auto'
      this.popupEl.style.bottom = 'auto'
      this.popupEl.style.height = 'auto'
    }
    this.renderTriggerArrow()
    // Start from no active row: a `setFocusedIndex` made while closed must
    // not be reported as the initial row before `focusInitial` places it;
    // the report itself waits for the tail of this method.
    this.focusedRow = null
    this.focusedIndex = -1
    this.activeItemReportSuspendDepth++
    try {
      this.renderPopupList()
      this.positioner = createPositioner(this.triggerEl, this.popupEl, {
        onHide: () => this.closeWithReason('hidden'),
        widthPolicy: this.settings.popupWidthPolicy,
        innerScrollEl: this.popupListEl,
      })
      this.attachOutsideClick()
      this.focusInitial()
    } finally {
      this.activeItemReportSuspendDepth--
    }
    this.onOpened()
    const onOpen = this.settings.onOpen
    onOpen?.({ reason })
    // A hook above may have closed the popup: nothing below is left to do.
    if (!this.opened) { restoreWindowScroll(); return }
    if (this.filterActive) {
      this.filterInputEl.focus({ preventScroll: true })
    }
    restoreWindowScroll()
    // Last, so a listener that closes the widget does so after this open
    // completed, with no step above left to run on a closed popup.
    this.reportActiveItem()
  }

  /**
   * Close the popup. Detaches positioner and outside-click listener, clears
   * the item DOM, and resets focused-item state. No-op if already closed.
   *
   * Focus return is decided automatically: when DOM focus is still inside
   * the popup at the moment of close - the filter input (Esc on an empty
   * filter, a single-select pick, an outside press on a non-focusable area)
   * or a focusable control the app placed in a header / footer slot (Esc
   * there, or `close()` called from its own click) - focus is returned to
   * the trigger. Tab-away and outside clicks on focusable elements have
   * already moved focus elsewhere, so we leave it alone.
   * - The return happens before the popup is hidden and before `onClose`:
   *   hiding a focused element first would let the browser drop focus to
   *   `<body>`, a blur and focus pair the widget never meant.
   * @group Open & close
   */
  public close(): void {
    const reason = this.pendingCloseReason
    this.pendingCloseReason = 'api'
    if (!this.opened) { return }
    const shouldReturnFocus = this.isFocused(this.popupEl)
    this.opened = false
    this.transitionGeneration++
    this.triggerEl.setAttribute('aria-expanded', 'false')
    this.triggerEl.setAttribute('data-state', 'closed')
    this.syncTriggerTabindex()
    if (shouldReturnFocus) {
      // A focus handler on the trigger may call open(); refuse it until the
      // teardown below is done, or it would set up a popup this close()
      // then hides and strips of its listeners.
      this.closing = true
      try {
        this.triggerEl.focus({ preventScroll: true })
      } finally {
        this.closing = false
      }
    }
    this.rootEl.classList.remove(this.classIdMap.openClass)
    if (this.filterActive) {
      this.filterInputEl.setAttribute('aria-expanded', 'false')
      this.filterInputEl.value = ''
      this.query = ''
      this.filteredItems = undefined
    }
    this.positioner?.detach()
    this.positioner = undefined
    this.detachOutsideClick()
    this.popupListEl.replaceChildren()
    // The no-results region hides with the popup; reset so a reopen with a
    // still-empty list counts as a fresh appearance and re-announces.
    this.lastNoResultsText = null
    if (this.popoverSupported) {
      try {
        this.popupEl.hidePopover()
      } catch {
        // Already force-hidden without us (dialog.showModal() hides all
        // popovers) - hidePopover() then throws InvalidStateError. State
        // resyncs right here, so nothing else to do.
      }
      this.popupEl.style.right = ''
      this.popupEl.style.bottom = ''
      this.popupEl.style.height = ''
    }
    this.popupEl.hidden = true
    // Clear inline display + position so the `[hidden]` UA rule can hide the
    // popup cleanly. (Position was set in open() to keep the popup out of
    // flow before the positioner attached; positioner.detach() also clears
    // it, but be explicit and symmetric with what open() set.)
    this.popupEl.style.position = ''
    this.popupEl.style.display = ''
    this.popupEl.style.flexDirection = ''
    this.itemEls = []
    this.focusedEl = undefined
    this.focusedIndex = -1
    this.typeaheadBuffer = ''
    this.chooseAllRowEl = undefined
    this.leadingActionRowEls = []
    this.trailingActionRowEls = []
    this.focusedRow = null
    this.comboboxEl.removeAttribute('aria-activedescendant')
    this.renderTriggerArrow()
    this.onClosed()
    const onClose = this.settings.onClose
    onClose?.({ reason })
    // Last, so a listener that reopens the widget does so after this close
    // completed, with no step above left to run on an open popup.
    this.reportActiveItem()
  }

  /** `open()` with a stated reason; see `pendingOpenReason`. */
  private openWithReason(reason: LLSelectOpenReason): void {
    this.pendingOpenReason = reason
    this.open()
  }

  /**
   * `close()` with a stated reason; see `pendingCloseReason`. Protected for
   * the single select's pick, which closes with `'choose'`.
   * @internal
   */
  protected closeWithReason(reason: LLSelectCloseReason): void {
    this.pendingCloseReason = reason
    this.close()
  }

  /**
   * Rebuild the trigger and (while open) the popup list from current state.
   * - Use it after mutating item OBJECTS in place (e.g.
   *   `users[0].name = 'X'`). The library cannot detect that on its own.
   * - Use it too when a function it reruns reads state that changed outside
   *   the items, such as the page language.
   * - It reruns `itemToStringFn` and every content function of the trigger
   *   and the popup list.
   * - It does not rerun the header and footer content functions.
   * - It cannot reach the pack-owned attributes of the filter input, its
   *   placeholder and fallback `aria-label`; `setUiTranslationPack` does.
   * - It re-derives the display order (the `gatherGroups` gather).
   * - While the filter is active, it re-runs the filter against the current
   *   item text.
   * - The refresh is purely visual: it does NOT fire `onChange` and does NOT
   *   run `onItemsChanged`.
   * - Orchestrator: composes `renderTrigger` + `renderPopupList`; touches no
   *   DOM directly.
   * @group Lifecycle
   */
  public rerender(): void {
    this.transitionGeneration++
    this.gatheredItems = undefined
    if (this.filterActive) { this.recomputeFilteredItems() }
    this.renderTrigger()
    if (this.opened) { this.renderPopupList() }
  }

  /**
   * Tear down the instance.
   * - Closes the popup, which removes every document and window listener and
   *   stops the popup positioning.
   * - Removes the click listener from `labelEl`, and removes an id the
   *   library minted on it.
   * - Removes the library's class, its inline styles and the
   *   `data-llselect-color-scheme` attribute from the mount element, ends the
   *   automatic color-scheme checks, and empties the element.
   * - After `destroy()`, call no method except `destroy()` itself. Each
   *   `destroy()` call repeats the cleanup and empties the mount element. Do
   *   not call it again once the mount element has been reused, for other
   *   content or for a second instance.
   * - REQUIRED before discarding an instance whose popup might be open; a
   *   framework wrapper calls it on unmount. Skipping it there leaks the
   *   outside-click, focusout, scroll and resize listeners.
   * - Discarding a CLOSED instance without `destroy()` leaks nothing: only
   *   its mount element and `labelEl` retain it, through its own DOM
   *   listeners. Once those elements leave the document and the application
   *   holds no reference to them, the instance is collectable. The root
   *   class, the `overflow-anchor` style and the
   *   `data-llselect-color-scheme` attribute stay on the mount. If the mount
   *   stays in the document outside a shadow root, the automatic checks
   *   continue for an `'auto'` instance: it decides again when the operating
   *   system's color preference changes, and when an attribute of `<html>`
   *   or `<body>` changes.
   * - Building a second instance on the same element replaces the first. The
   *   library drops the first instance's queued scheme decision and its
   *   automatic checks. Call `destroy()` on the first instance BEFORE
   *   building the second. After the rebuild, call no method of the first
   *   instance; its `destroy()` would empty the element under the new widget.
   * @group Lifecycle
   */
  public destroy(): void {
    // First: the close() below and the replaceChildren() at the end can move
    // focus, and no parting focusout may reach onBlur (A11Y.md "Focus").
    this.detachFocusListeners()
    this.destroyed = true
    this.transitionGeneration++
    this.closeWithReason('destroy')
    if (this.settings.labelEl !== null) {
      this.settings.labelEl.removeEventListener('click', this.handleLabelElClick)
      if (this.labelElIdMinted) { this.settings.labelEl.removeAttribute('id') }
    }
    this.rootEl.classList.remove(this.classIdMap.rootClass, this.classIdMap.openClass)
    this.rootEl.style.overflowAnchor = ''
    unsubscribeColorScheme(this.rootEl)
    cancelFirstDecision(this.rootEl, this.colorSchemeDecision)
    this.colorSchemeDecisionPending = false
    this.rootEl.removeAttribute(COLOR_SCHEME_ATTRIBUTE)
    this.rootEl.replaceChildren()
  }

  /**
   * Open if closed, close if open.
   * @group Open & close
   */
  public toggle(): void {
    if (this.opened) {
      this.closeWithReason('toggle')
    } else {
      this.openWithReason('toggle')
    }
  }

  /**
   * Whether the popup is currently open.
   * - Read through a method, like `isDisabled()`.
   * - The same state is mirrored on the DOM as CSS hooks:
   *   `data-state="open|closed"` on the trigger, `classIdMap.openClass` on
   *   the root.
   * @group Open & close
   */
  public isOpened(): boolean {
    return this.opened
  }

  /**
   * Return the full list the user chooses from, in data order (as passed to `setItems`).
   * - The chosen items are a subset of it.
   * - The rendered list may differ in order and content: see `getVisibleItems`.
   * - Returns the LIVE internal array, typed read-only. Do not mutate it
   *   (TS blocks it; plain-JS callers must treat it as frozen).
   * - Structural mutation would silently bypass chosen-state reconciliation,
   *   re-filtering, and re-render. Replace the list via `setItems` instead.
   * - Mutating item OBJECTS + `rerender()` is the supported in-place path.
   * @group Items
   */
  public getItems(): readonly T[] {
    return this.items
  }

  /**
   * Return the resolved UI strings: the built-in English defaults merged
   * with the `uiTranslationPack` setting.
   * - Reuse these in your own UI instead of keeping a second translation
   *   source. For example, a tag remove button tooltip:
   *   `sel.getUiTranslationPack().tagRemoveButtonAriaLabel(label)`.
   * - Returns the LIVE object. Treat it as immutable, like `getItems`.
   * @group i18n
   */
  public getUiTranslationPack(): Readonly<LLSelectUiTranslationPack> {
    return this.settings.uiTranslationPack
  }

  /**
   * Replace the UI-translation pack at runtime, so switching language needs
   * no re-`new`.
   * - One of the two settings with a runtime setter (the other is
   *   `setPlaceholder`); both are copy. The rule: {@link LLSelectBaseSettings}.
   * - The pack is resolved exactly like the constructor's: merged over the
   *   built-in English pack, NOT over the previously set pack.
   * - An explicit constructor `placeholder` keeps winning over the new pack's
   *   `triggerPlaceholder`.
   * - Re-renders the trigger and the open popup.
   * - Also re-applies the pack-owned attributes `rerender()` cannot reach:
   *   the filter input placeholder and its fallback `aria-label`.
   * - The clear button needs no such step: `rerender()` rebuilds it, and the
   *   rebuild reads the new pack - unless a `createTriggerClearButtonEl`
   *   override returns the previous element, which then owns the label.
   * @group i18n
   */
  public setUiTranslationPack(uiTranslationPack: Partial<LLSelectUiTranslationPack>): void {
    const pack: LLSelectUiTranslationPack = { ...DEFAULT_UI_TRANSLATION_PACK, ...uiTranslationPack }
    this.settings.uiTranslationPack = pack
    this.settings.placeholder = this.explicitPlaceholder ?? pack.triggerPlaceholder
    // Pack-owned attributes rerender() cannot reach:
    this.syncFieldNameToDom()
    if (pack.filterInputPlaceholder !== null) {
      this.filterInputEl.placeholder = pack.filterInputPlaceholder
    } else {
      this.filterInputEl.removeAttribute('placeholder')
    }
    this.rerender()
  }

  /**
   * Replace the trigger placeholder text at runtime. It is one of the two
   * settings with a runtime setter (the other is `setUiTranslationPack`);
   * both are copy. The rule: {@link LLSelectBaseSettings}.
   * - `null` = fall back to the pack default (`uiTranslationPack.triggerPlaceholder`),
   *   mirroring an unset constructor `placeholder`. An explicit value keeps
   *   winning over later `setUiTranslationPack` calls, exactly like the
   *   constructor input.
   * - Takes effect immediately. Visible only while nothing is chosen - the
   *   placeholder never renders otherwise (the trigger is still re-rendered,
   *   which also refreshes the hidden accessible-value mirror).
   * @group Trigger
   */
  public setPlaceholder(placeholder: string | null): void {
    if (this.explicitPlaceholder === placeholder) { return }
    this.explicitPlaceholder = placeholder
    this.settings.placeholder = placeholder ?? this.settings.uiTranslationPack.triggerPlaceholder
    this.renderTrigger()
  }

  /**
   * Replace the full list the user chooses from.
   * - A chosen item the new list does not hold is dropped.
   * - The input is shallow-copied; later external mutation does not affect
   *   the select.
   * - Items MUST be unique under `compareFn` (it defines item identity, and the
   *   selection is a set). Duplicates render stale selection DOM; the default
   *   compareFn warns once per page, a custom compareFn is the caller's
   *   responsibility (not scanned, to keep large lists cheap).
   * - If the popup is open, it re-renders now. While closed, the DOM is
   *   built lazily on the next `open()`.
   * - `LLSelectMultiple` renders an open popup once more when this call
   *   drops or reorders chosen items, so rows see the final chosen list.
   * - Both shipped variants re-render the trigger content from `onItemsChanged`
   *   (the multiple count total, custom content that reads `items`).
   * - `LLSelectMultiple`'s `triggerDisplay: 'tags'` mode is opt-in; `'count'` is
   *   the default.
   * - When `triggerDisplay` is `'tags'`, that content render is one chip per
   *   chosen item, unless `createTriggerContentElFn` replaces the content.
   * - Subclasses may reconcile chosen-state via {@link onItemsChanged}
   *   (e.g. single mode drops a chosen value that is no longer in the list).
   * @group Items
   */
  public setItems(items: readonly T[]): void {
    this.items = items.slice()
    this.changeRevision++
    this.warnOnDuplicateItems()
    this.gatheredItems = undefined
    if (this.filterActive) { this.recomputeFilteredItems() }
    if (this.opened) { this.renderPopupList() }
    this.onItemsChanged()
    // The rows rendered above may have read chosen objects that the variant's
    // reconciliation just swapped for compare-equal reloads (no change fires).
    this.replacePopupListActionRowElsInDom()
  }

  /**
   * Warn (once per page, never throw) when the item list has duplicates under
   * the DEFAULT compareFn - an O(n) Set check. A custom compareFn is documented
   * only: an O(n^2) scan would tax large lists (see PERFORMANCE-31), and keeping
   * its identity unique is the caller's responsibility.
   * - The Set is SameValueZero, and so is the default compareFn, so a repeated
   *   `NaN` item counts as a duplicate on both sides.
   */
  private warnOnDuplicateItems(): void {
    if (warnedDuplicateItems || this.settings.compareFn !== defaultCompareFn) { return }
    if (new Set(this.items).size === this.items.length) { return }
    warnedDuplicateItems = true
    console.warn('llselect: duplicate items passed to setItems - items must be unique under compareFn (it defines item identity, and the selection is a set). Duplicates render stale selection state. (warned once per page)')
  }

  /**
   * Enable or disable the whole control. Disabled: the trigger gets
   * `aria-disabled` + `data-disabled` (never the native `disabled` attribute,
   * which would suppress the hover / focus events a tooltip needs), opening is
   * blocked, an open popup closes, and the trigger leaves the tab order unless
   * `focusableWhenDisabled` is set. Stored as state, mirroring `setItems` /
   * `setChosenItems` (this design keeps mutable state out of settings).
   * @group Disabling
   */
  public setDisabled(value: boolean): void {
    if (this.disabled === value) { return }
    this.disabled = value
    if (value && this.opened) { this.closeWithReason('disabled') }
    this.syncDisabledStateToDom()
  }

  /**
   * Whether the whole control is disabled.
   * @group Disabling
   */
  public isDisabled(): boolean {
    return this.disabled
  }

  /**
   * The color scheme the widget currently shows.
   * - Returns the result of the latest decision, `'light'` or `'dark'`. If the first decision is still queued, it decides now and returns that result.
   * - Never `'auto'`. The `colorScheme` setting explains how `'auto'` resolves.
   * @group Color scheme
   */
  public getColorScheme(): 'light' | 'dark' {
    if (this.colorSchemeDecisionPending) { this.syncColorScheme() }
    return this.resolvedColorScheme
  }

  /**
   * Decide the color scheme again, now.
   * - Call it after replacing a stylesheet that affects the scheme.
   * - Call it after a class or attribute that selects the scheme changes on the widget root or on an ancestor below `<body>`. The same holds for the variable `--llselect-color-scheme` set there.
   * - If you build the widget before inserting its element into the document, call it after the insertion. A detached element has no computed style, so an `'auto'` widget decided light.
   * - The library checks by itself when the popup opens. Outside a shadow root, it also checks when the operating system's color preference changes, and when an attribute of `<html>` or `<body>` changes.
   * - A widget inside a shadow root misses those two automatic checks. Call it after such a change.
   * - Changes nothing when the `colorScheme` setting is `'light'` or `'dark'`.
   * @group Color scheme
   */
  public refreshColorScheme(): void {
    this.syncColorScheme()
  }

  /** Run the decision and reflect it on the root attribute (only when it changed: the root may itself be an observed element). */
  private syncColorScheme(): void {
    if (this.colorSchemeDecisionPending) {
      this.colorSchemeDecisionPending = false
      cancelFirstDecision(this.rootEl, this.colorSchemeDecision)
    }
    const scheme = resolveColorScheme(readColorSchemeInputs(this.rootEl, this.settings.colorScheme))
    this.resolvedColorScheme = scheme
    if (this.rootEl.getAttribute(COLOR_SCHEME_ATTRIBUTE) !== scheme) { this.rootEl.setAttribute(COLOR_SCHEME_ATTRIBUTE, scheme) }
  }

  /** Reflect `this.disabled` onto the trigger's ARIA / data / tabindex. */
  private syncDisabledStateToDom(): void {
    if (this.disabled) {
      this.triggerEl.setAttribute('aria-disabled', 'true')
      this.triggerEl.setAttribute('data-disabled', 'true')
    } else {
      this.triggerEl.removeAttribute('aria-disabled')
      this.triggerEl.setAttribute('data-disabled', 'false')
    }
    this.syncTriggerTabindex()
  }

  /**
   * Recompute the trigger's tabindex from every input that owns it: disabled
   * state (with `focusableWhenDisabled`), and the filterable open cycle -
   * while the filter input is the focus host the trigger leaves the tab
   * order, so the open widget stays a single tab stop and Shift+Tab exits
   * instead of landing on the trigger with the popup still open
   * (`docs/llm/A11Y.md` "Focus").
   */
  private syncTriggerTabindex(): void {
    const disabledAndUnfocusable = this.disabled && !this.settings.focusableWhenDisabled
    const filterOwnsFocus = this.opened && this.filterActive
    this.triggerEl.setAttribute('tabindex', disabledAndUnfocusable || filterOwnsFocus ? '-1' : '0')
  }

  /**
   * Subclass hook: called once **after** the popup finishes opening. Default no-op.
   * The `onOpen` setting fires alongside this (both run) - hook for subclass
   * logic, setting for consumer notification.
   *
   * > No **before** counterpart: there is no `onOpening`.
   * @group Subclassing: reactions
   */
  protected onOpened(): void {}
  /**
   * Subclass hook: called once **after** the popup finishes closing. The `onClose` setting fires alongside this (both run).
   *
   * > No **before** counterpart: there is no `onClosing`.
   * @group Subclassing: reactions
   */
  protected onClosed(): void {}
  /**
   * Subclass hook: called **after** the chosen state actually changed, right
   * **before** the variant's `onChange` setting fires (the hook runs first and both run,
   * as with `onOpened` / `onClosed`). Default no-op.
   *
   * > Pairs with the variant's `onChosenChanging`, which runs **before** a user change and can stop it.
   * @group Subclassing: reactions
   */
  protected onChosenChanged(): void {}
  /**
   * Called inside `setItems`, **after** the new list is installed and an open
   * popup list re-rendered, and **before** the final action-row rebuild at the
   * end of the call. Override to reconcile state that depends on the item list
   * (e.g. clear a chosen value that disappeared). Default no-op.
   *
   * > No **before** counterpart: there is no `onItemsChanging`.
   * @group Subclassing: reactions
   */
  protected onItemsChanged(): void {}

  /**
   * Orchestrator: composes the clear-button rebuild + `renderTriggerContent` +
   * `renderTriggerArrow` to (re)build the whole trigger from state; touches no
   * DOM directly. Subclasses normally override {@link renderTriggerContent},
   * not this.
   * - Runs on every change of the chosen value, the placeholder or the pack.
   * - `rerender()` runs it too.
   * - While `clearable` is on, the first run builds the clear button and every
   *   later run swaps it for whatever `createTriggerClearButtonEl` returns: a
   *   fresh button from the base implementation, like the arrow. An override
   *   may return the previous element; it is then kept in place.
   * - If the button is rebuilt and the old one held focus - on it or inside
   *   its icon - the rebuilt BUTTON gets it.
   * - If the builder returned the same element, nothing was rebuilt, and focus
   *   goes back to the node that held it, if that node is still inside the
   *   button and can take focus; otherwise focus stays on the button.
   * - `setItems` runs `renderTriggerContent` alone, because only the content
   *   reads the list (the multiple count total, a custom
   *   `createTriggerContentElFn`'s `items`).
   * - A `setItems` that drops the chosen entry runs the whole trigger.
   * - Runs once from the `LLSelectSingle` / `LLSelectMultiple` constructor, right
   *   after `super()`.
   * - On that first run a FURTHER subclass's own fields are still `undefined`:
   *   JS runs a subclass's field initializers only after its super constructor
   *   returns (virtual-call-in-constructor). An override of a trigger method
   *   (`renderTriggerContent`, or a `create*El` it calls) that reads such a
   *   field sees `undefined` there.
   * - The recipe: put construction-time configuration in the typed
   *   `subclassSettings` constructor param. `this.settings` is complete before
   *   any construction code runs.
   * - For genuine instance state, tolerate defaults during construction, or call
   *   `rerender()` at the end of your own constructor.
   * - The popup-list methods do NOT run here; they wait for `open()`. See
   *   DESIGN.md "Customization model".
   * @group Subclassing: rendering
   */
  protected renderTrigger(): void {
    this.replaceTriggerClearButtonElInDom()
    this.renderTriggerContent()
    this.renderTriggerArrow()
  }

  /**
   * Write the trigger's content slot (`triggerContentEl`), replacing whatever
   * was there; the sibling arrow slot is untouched. The single DOM-writing
   * primitive behind every `renderTriggerContent` path.
   * - `string` -> set as `textContent` (plain text, NOT parsed as HTML). Used
   *   for the default placeholder / `itemToString` text / count summary.
   * - `HTMLElement` -> inserted as-is via `replaceChildren`; caller owns the
   *   node. Used for whatever the `createTriggerContentElFn` setting returned.
   * - Also mirrors the value into the hidden `triggerValueEl` (the accessible
   *   name source): the string itself, else `plainTextValue`, else the
   *   element's `textContent`. Pass `plainTextValue` whenever the element
   *   contains labelled controls (tag remove buttons) or icon-only content -
   *   the mirror is what AT announces as the field's value.
   * Called by `renderTriggerContent` - the base default and the `LLSelectSingle`
   * / `LLSelectMultiple` overrides.
   * @group Subclassing: rendering
   */
  protected commitTriggerContentToDom(content: HTMLElement | string, plainTextValue?: string): void {
    if (typeof content === 'string') {
      this.triggerContentEl.textContent = content
      this.triggerValueEl.textContent = content
    } else {
      this.triggerContentEl.replaceChildren(content)
      this.triggerValueEl.textContent = plainTextValue ?? content.textContent
    }
  }

  /**
   * Mirror the empty/filled state onto the trigger's `data-empty` attribute
   * (`"true"` when `isEmpty()`, else `"false"`). A CSS / AT styling hook,
   * independent of the rendered content. Called by the subclass
   * `renderTriggerContent` overrides.
   * @group Subclassing: rendering
   */
  protected syncEmptyStateToDom(): void {
    this.triggerEl.setAttribute('data-empty', this.isEmpty() ? 'true' : 'false')
  }

  /**
   * Whether the control currently has no selection (drives `data-empty`).
   * Base default is always `true` (the base trigger only shows the
   * placeholder); `LLSelectSingle` / `LLSelectMultiple` override it.
   * @group Subclassing: semantics
   */
  protected isEmpty(): boolean {
    return true
  }

  /**
   * Orchestrator: composes the `*ToDom` primitives to (re)build the trigger's
   * content slot from state; touches no DOM directly. Override in subclasses to
   * display the chosen value(s); this base default commits the placeholder and
   * the empty flag. Always write via `commitTriggerContentToDom` (content) and
   * `syncEmptyStateToDom` (the `data-empty` flag), never `triggerContentEl`
   * directly, so the sibling arrow slot is always preserved.
   * @group Subclassing: rendering
   */
  protected renderTriggerContent(): void {
    this.syncEmptyStateToDom()
    this.commitTriggerContentToDom(this.settings.placeholder)
  }

  /**
   * Orchestrator: composes the `*ToDom` / `*El` primitives to (re)build the
   * trigger's arrow slot from state; touches no DOM directly. Calls
   * `createTriggerArrowContentEl` with the current `isOpened` and commits whatever it returns
   * (including `null` -> no arrow for this state).
   */
  private renderTriggerArrow(): void {
    this.commitTriggerArrowContentElToDom(this.createTriggerArrowContentEl({ isOpened: this.opened }))
  }

  /**
   * Trigger arrow element for the given open state.
   * - Default reads `createTriggerArrowContentElFn`; `null` (setting unset, or returned for
   *   a state) = no arrow for that state.
   * - Override only when extending; for one-off arrows pass the setting.
   *   Mirrors `createTriggerClearButtonEl` / `createPopupListItemContentEl`.
   * @group Subclassing: rendering
   */
  protected createTriggerArrowContentEl(state: { isOpened: boolean }): HTMLElement | SVGElement | null {
    const fn = this.settings.createTriggerArrowContentElFn
    return fn ? fn(state) : null
  }

  /**
   * Write the trigger's arrow slot: clear it, then append `el` if non-null.
   * - `el = null`: clear only, leaving the slot empty (no arrow this state).
   * The sole mutator of the arrow slot; called by `renderTriggerArrow`.
   */
  private commitTriggerArrowContentElToDom(el: HTMLElement | SVGElement | null): void {
    this.triggerArrowEl.replaceChildren()
    if (el) { this.triggerArrowEl.appendChild(el) }
  }

  /**
   * Orchestrator: composes `createPopupListItemEl` (build) + `computePopupSegments` +
   * `commitPopupSegmentsToDom` (write) to rebuild the popup list from
   * `getVisibleItems()`; touches no DOM directly. Called by `open()` and by
   * `setItems()` while open. Also clamps `focusedIndex` if the list shrank and
   * re-applies focus visuals.
   * - Extend it by wrapping: override, do your work before or after, then
   *   call `super.renderPopupList()`. The ui-select bridge frees its row
   *   scopes this way. Or override one of the methods it calls through `this`:
   *   `createPopupListItemEl`, `createPopupListChooseAllRowEl`,
   *   `createPopupListLeadingActionRowEl` /
   *   `createPopupListTrailingActionRowEl`, `itemToGroupKey`,
   *   `getVisibleItems`.
   * - Its other internals stay private on purpose. They re-establish the
   *   `itemEls[i] <-> getVisibleItems()[i]` alignment as one unit, so no
   *   subclass can leave keyboard nav or `aria-activedescendant` half-synced.
   * @group Subclassing: rendering
   */
  protected renderPopupList(): void {
    const list = this.getVisibleItems()
    const els = list.map((item, i) => this.createPopupListItemEl(item, i))
    this.itemEls = els
    this.focusedEl = undefined
    this.chooseAllRowEl = this.createPopupListChooseAllRowEl() ?? undefined
    if (!this.chooseAllRowEl && this.focusedRow?.kind === 'choose-all') { this.focusedRow = null }
    this.leadingActionRowEls = this.settings.popupListLeadingActionRows.map((row, i) => this.createPopupListLeadingActionRowEl(row, i))
    this.trailingActionRowEls = this.settings.popupListTrailingActionRows.map((row, i) => this.createPopupListTrailingActionRowEl(row, i))
    this.commitPopupSegmentsToDom(this.computePopupSegments(list, els))
    this.syncPopupListNoResultsToDom()
    this.positioner?.reposition()
    // Clamp focused index if the visible list shrank, then re-apply visuals.
    // The clamp seeks BACKWARD to an enabled row: landing focus on a
    // disabled one would break the disabled-skip contract (A11Y.md).
    if (this.focusedIndex >= list.length) {
      this.focusedIndex = list.length === 0 ? -1 : this.findNextEnabledIndex(list.length - 1, -1, list)
    } else if (this.focusedIndex >= 0 && this.isItemEffectivelyDisabled(list[this.focusedIndex]!)) {
      // Same contract when the row at the focused index BECAME disabled
      // (setItems swapped the item in place): seek backward - the option
      // above the first item is the choose-all row when present
      // (A11Y.md ring order) - else forward.
      const back = this.findNextEnabledIndex(this.focusedIndex, -1, list)
      if (back >= 0) {
        this.focusedIndex = back
      } else if (!this.focusChooseAllRow()) {
        this.focusedIndex = this.findNextEnabledIndex(this.focusedIndex, 1, list)
      }
    }
    this.syncFocusedIndexToDom()
  }

  /**
   * Split the flat visible list into render segments: ungrouped item elements
   * and contiguous same-key groups. Pure computation - resolves keys via
   * `itemToGroupKey` (the overridable method; all-`null` keys = flat list) and key
   * equality via `groupKeyCompareFn`, touches no DOM. Group labels are NOT
   * added to `itemEls`, so `itemEls[i]`
   * stays aligned with `getVisibleItems()[i]` and keyboard nav skips labels for
   * free. `console.warn`s once per non-contiguous key reappearance (unsorted
   * data would otherwise emit a duplicate label for the same group) -
   * reachable with `gatherGroups: false`; the default gather feeds this an
   * already-contiguous list.
   */
  private computePopupSegments(list: readonly T[], els: HTMLElement[]): PopupListSegment<T, GroupKey>[] {
    const keyEq = this.settings.groupKeyCompareFn ?? defaultCompareFn
    const segments: PopupListSegment<T, GroupKey>[] = []
    const closedKeys: GroupKey[] = []
    let groupIndex = 0
    let i = 0
    while (i < list.length) {
      const key = this.itemToGroupKey(list[i]!)
      if (key === null) {
        segments.push({ group: false, el: els[i]! })
        i += 1
        continue
      }
      const groupItems: T[] = [list[i]!]
      const groupEls: HTMLElement[] = [els[i]!]
      let j = i + 1
      while (j < list.length) {
        const next = this.itemToGroupKey(list[j]!)
        if (next === null || !keyEq(key, next)) { break }
        groupItems.push(list[j]!)
        groupEls.push(els[j]!)
        j += 1
      }
      if (closedKeys.some(k => keyEq(k, key))) {
        console.warn('llselect: group key reappears non-contiguously; sort items by group to avoid a duplicate label.', key)
      }
      closedKeys.push(key)
      segments.push({ group: true, key, index: groupIndex, items: groupItems, els: groupEls })
      groupIndex += 1
      i = j
    }
    return segments
  }

  /**
   * Replace every popup-list child with the leading rows, the rendered
   * segments and the trailing rows. A pinned block goes inside its sticky
   * wrapper, and the wrapper is left out while the block has no rows.
   */
  private commitPopupSegmentsToDom(segments: PopupListSegment<T, GroupKey>[]): void {
    const children = segments.map(seg =>
      seg.group ? this.createGroupEl(seg.key, seg.index, seg.items, seg.els) : seg.el,
    )
    const leading = this.chooseAllRowEl ? [this.chooseAllRowEl, ...this.leadingActionRowEls] : this.leadingActionRowEls
    const trailing = this.trailingActionRowEls
    const leadingWrap = this.popupListPinnedLeadingRowsEl
    const trailingWrap = this.popupListPinnedTrailingRowsEl
    // A wrapper's inner edge line belongs only where items follow / precede
    // it; the themes read this attribute, so two adjacent blocks draw none.
    const hasItems = children.length > 0
    if (leadingWrap) {
      leadingWrap.replaceChildren(...leading)
      leadingWrap.setAttribute('data-edge-to-items', String(hasItems))
      if (leading.length > 0) { children.unshift(leadingWrap) }
    } else {
      children.unshift(...leading)
    }
    if (trailingWrap) {
      trailingWrap.replaceChildren(...trailing)
      trailingWrap.setAttribute('data-edge-to-items', String(hasItems))
      if (trailing.length > 0) { children.push(trailingWrap) }
    } else {
      children.push(...trailing)
    }
    this.popupListEl.replaceChildren(...children)
  }

  /**
   * Build the whole group container of the popup list: the label element followed by the group's item rows.
   * - The library calls it, once per group of the current render, on every
   *   list render. You never call it yourself.
   * - All four params come from the library. Forward them to `super` unchanged.
   * - `index` is the group's position among this render's groups, counted
   *   from 0. It only mints the group id. It is not an identity: it changes
   *   whenever the visible list changes.
   * - To change only the label's content, do not override this. Pass the
   *   `createGroupLabelContentElFn` setting instead.
   * - To change the element itself, override it, call `super.createGroupEl(...)`,
   *   and edit the returned element. Keep the `role` and `aria-label` the base set.
   * - Internals: the base sets the id, `role="group"` named by `groupKeyToString`
   *   (`aria-label`), `lang` from {@link groupKeyToLang} (none for `null`), an
   *   `aria-hidden` visible label element filled from
   *   {@link createGroupLabelContentEl} (else the plain label text), then the
   *   group's item elements; `aria-disabled` + `data-disabled` when the group
   *   is disabled.
   *
   * @param key - the group's key, supplied by the library
   * @param index - the group's position among this render's groups, supplied by the library
   * @param itemsInGroup - the group's items, supplied by the library (for counts / rich content)
   * @param itemEls - the group's already-built option elements, supplied by the library
   * @group Subclassing: rendering
   */
  protected createGroupEl(key: GroupKey, index: number, itemsInGroup: readonly T[], itemEls: HTMLElement[]): HTMLElement {
    const text = this.groupKeyToString(key)
    const group = document.createElement('div')
    group.id = `${this.classIdMap.popupListId}-group${index}`
    group.className = this.classIdMap.groupClass
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', text)
    this.commitLangToDom(group, this.groupKeyToLang(key))
    if (this.isGroupDisabled(key)) {
      group.setAttribute('aria-disabled', 'true')
      group.setAttribute('data-disabled', 'true')
    }
    const labelEl = document.createElement('div')
    labelEl.className = this.classIdMap.groupLabelClass
    labelEl.setAttribute('aria-hidden', 'true')
    const content = this.createGroupLabelContentEl(key, itemsInGroup)
    if (content === null) {
      labelEl.textContent = text
    } else {
      labelEl.appendChild(content)
    }
    group.append(labelEl, ...itemEls)
    return group
  }

  /**
   * Group label -> its visible content element (icon / count badge / rich
   * markup). Mirrors `createPopupListItemContentEl`.
   * - Default reads `createGroupLabelContentElFn`, else `null` so `createGroupEl`
   *   uses plain text from `groupKeyToString`.
   * - The group's accessible name stays `groupKeyToString` (container `aria-label`);
   *   this fills only the visible, `aria-hidden` label content.
   * - Override only when extending; for one-off rich labels pass the setting.
   * @group Subclassing: rendering
   */
  protected createGroupLabelContentEl(key: GroupKey, itemsInGroup: readonly T[]): HTMLElement | null {
    const fn = this.settings.createGroupLabelContentElFn
    return fn ? fn(key, itemsInGroup) : null
  }

  /**
   * Re-render a single item's element in place instead of rebuilding the
   * whole popup list. The DOM work is O(1) regardless of list size, so
   * flipping one selection in a 10k-item list does not recreate 10k nodes
   * (the lookup to find the item is O(n), but that is a cheap comparison
   * loop next to DOM mutation). No-op if the popup is closed or the item is
   * not in the current list. Used by multi-select toggle.
   * @group Subclassing: rendering
   */
  protected replacePopupListItemElInDom(item: T): void {
    if (!this.opened) { return }
    const list = this.getVisibleItems()
    const compareFn = this.settings.compareFn
    const index = list.findIndex(i => compareFn(i, item))
    if (index < 0) { return }
    const oldEl = this.itemEls[index]
    if (oldEl === undefined) { return }
    const newEl = this.createPopupListItemEl(list[index]!, index)
    oldEl.replaceWith(newEl)
    this.itemEls[index] = newEl
    // Preserve focus visuals if the replaced element was the focused one.
    if (this.focusedEl === oldEl) {
      newEl.classList.add(this.classIdMap.popupListRowFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', newEl.id)
      this.focusedEl = newEl
    }
  }

  /**
   * Build the whole DOM element for one item row of the popup list.
   * - The library calls it, once per row of `getVisibleItems()`, on every
   *   list render. You never call it yourself.
   * - Both params come from the library. Forward them to `super` unchanged.
   * - `item` is the row's item.
   * - `index` is the row's position in `getVisibleItems()`, counted from 0.
   *   That is the list as rendered: grouped, filtered, minus hidden chosen
   *   rows. It is NOT the position in `items`.
   * - `index` is not an identity. It changes whenever the visible list
   *   changes. Item identity is `compareFn`. Never store it.
   * - To change only what a row shows, do not override this. Pass the
   *   `createPopupListItemContentElFn` setting instead.
   * - To change the element itself, override it, call
   *   `super.createPopupListItemEl(item, index)`, and edit the returned element: add a
   *   class, a `title`, a wrapper. Demo sections 9.1, 13.1 and 13.2 do this.
   * - Keep the `id` and `role` the base set. Do not put focusable controls
   *   inside the row. The row itself is the control.
   * - The element is rebuilt on every render. Do not keep a reference to it.
   * - Internals: the base sets `id` (`<listbox id>-item<index>`, the target of
   *   `aria-activedescendant`), `role="option"`, the visible content from
   *   {@link createPopupListItemContentEl} (else `textContent` from {@link itemToString}),
   *   `aria-label` = `itemToString` when the content is custom, `lang` from
   *   {@link itemToLang} when it returns one, `aria-disabled`
   *   plus the disabled class when {@link isItemEffectivelyDisabled}, and a
   *   click handler that focuses the row by `index`, then runs `onPopupListItemActivated`.
   *
   * @param item - the row's item, supplied by the library
   * @param index - the row's position in `getVisibleItems()`, supplied by the library
   * @group Subclassing: rendering
   */
  protected createPopupListItemEl(item: T, index: number): HTMLElement {
    const el = document.createElement('div')
    // Ids hang off the listbox id: options belong to the listbox, not the trigger.
    el.id = `${this.classIdMap.popupListId}-item${index}`
    el.className = this.classIdMap.popupListRowClass
    el.setAttribute('role', 'option')
    const content = this.createPopupListItemContentEl(item)
    if (content === null) {
      el.textContent = this.itemToString(item)
    } else {
      // Custom content fills the visuals only. The accessible name + match
      // text always come from itemToString, so pin aria-label to it: stays
      // consistent with the plain-text branch (textContent === itemToString)
      // and the caller never touches aria-* themselves.
      el.setAttribute('aria-label', this.itemToString(item))
      el.appendChild(content)
    }
    this.commitLangToDom(el, this.itemToLang(item))
    // No `title` attribute by default: items wrap (themes default), so the
    // full text is already visible and a tooltip is redundant. Adding
    // `title` would also fight third-party tooltip libraries (Tippy etc.).
    // Users who opt into ellipsis-on-items pick their own tooltip mechanism.
    if (this.isItemEffectivelyDisabled(item)) {
      // `aria-disabled` (never native `disabled`) keeps the item perceivable and
      // hoverable for a "why disabled" tooltip. No click handler -> not
      // selectable; keyboard nav skips it too.
      el.setAttribute('aria-disabled', 'true')
      el.classList.add(this.classIdMap.popupListRowDisabledClass)
    } else {
      el.addEventListener('click', () => {
        // Move focus to the clicked item before activating it. Without this,
        // multi mode (which keeps the popup open) leaves the focused styling
        // on the previous keyboard-focused item while a different one was
        // just clicked.
        const stamp = this.captureStateStamp()
        this.setFocusedIndex(index)
        // The move reports the active item; a listener that closed, rebuilt
        // or changed the widget leaves nothing for this click to activate.
        if (this.stateMovedSince(stamp)) { return }
        this.withUserChangeSource(() => this.onPopupListItemActivated(item))
      })
    }
    return el
  }

  /**
   * Map an item to its display string. The library calls this everywhere it
   * needs an item's text: list rows, the single trigger text, default filter.
   * - Default reads the `itemToStringFn` setting, else `String(item)`.
   * - Configure via `itemToStringFn` (no subclass needed).
   * - Override only when extending (a new select type); your override replaces
   *   the default. For HTML content, subclass `createPopupListItemEl`.
   * @group Subclassing: semantics
   */
  protected itemToString(item: T): string {
    const fn = this.settings.itemToStringFn
    return fn ? fn(item) : String(item)
  }

  /**
   * Map an item to the value of its `lang` attribute, or `null` for none.
   * - Default reads the `itemToLangFn` setting; `null` while it is unset.
   * - The library writes the result where it shows that item's text; the
   *   `itemToLangFn` docstring lists the places.
   * - Configure via `itemToLangFn` (no subclass needed); override only when
   *   extending.
   * @group Subclassing: semantics
   */
  protected itemToLang(item: T): string | null {
    const fn = this.settings.itemToLangFn
    return fn ? fn(item) : null
  }

  /**
   * Set or remove an element's `lang` attribute. `null` removes it; an empty
   * string sets `lang=""`, HTML's "language unknown".
   * @internal
   */
  protected commitLangToDom(el: HTMLElement, lang: string | null): void {
    if (lang === null) { el.removeAttribute('lang') } else { el.setAttribute('lang', lang) }
  }

  /**
   * Item -> the visible content of its popup list row (icon + text etc.).
   * - Default reads `createPopupListItemContentElFn`, else `null` so `createPopupListItemEl` uses
   *   the plain-text default from `itemToString`.
   * - Override only when extending; for one-off rich content pass the setting.
   * @group Subclassing: rendering
   */
  protected createPopupListItemContentEl(item: T): HTMLElement | null {
    const fn = this.settings.createPopupListItemContentElFn
    return fn ? fn(item) : null
  }

  /**
   * Whether `item` is effectively disabled - by `itemDisabledFn`, or because
   * its group is disabled (`groupDisabledFn`). Group-disabled layers on top,
   * so every item-disabled behavior (no selection, keyboard skip, aria)
   * covers grouped items with no extra code. False when neither applies.
   * The whole-control disabled state (`isDisabled()`) is a separate layer,
   * not part of this answer.
   * @group Subclassing: semantics
   */
  protected isItemEffectivelyDisabled(item: T): boolean {
    const itemDisabledFn = this.settings.itemDisabledFn
    if (itemDisabledFn && itemDisabledFn(item)) { return true }
    const key = this.itemToGroupKey(item)
    return key !== null && this.isGroupDisabled(key)
  }

  /**
   * Map an item to its group key, or `null` when it belongs to no group.
   * The authoritative method: rendering, the `gatherGroups` gather, and the
   * disabled layer all resolve keys through this method, so an override
   * drives them all - returning keys turns grouping on even with the setting
   * unset (all-`null` keys = flat list). An override reading external state
   * must call `rerender()` after that state changes (same contract as
   * mutating item objects).
   * - Default reads `itemToGroupKeyFn`, else `null` (grouping off).
   * - Override only when extending; configure via the setting.
   * @group Subclassing: semantics
   */
  protected itemToGroupKey(item: T): GroupKey | null {
    const fn = this.settings.itemToGroupKeyFn
    return fn ? fn(item) : null
  }

  /**
   * Map a group key to its label display text.
   * - Default reads `groupKeyToStringFn`, else `String(key)`.
   * @group Subclassing: semantics
   */
  protected groupKeyToString(key: GroupKey): string {
    const fn = this.settings.groupKeyToStringFn
    return fn ? fn(key) : String(key)
  }

  /**
   * Map a group key to the value of the group's `lang` attribute, or `null`
   * for none.
   * - Default reads the `groupKeyToLangFn` setting; `null` while it is unset.
   * - `createGroupEl` writes the result on the group container.
   * - Configure via `groupKeyToLangFn` (no subclass needed); override only
   *   when extending. Mirrors `itemToLang`.
   * @group Subclassing: semantics
   */
  protected groupKeyToLang(key: GroupKey): string | null {
    const fn = this.settings.groupKeyToLangFn
    return fn ? fn(key) : null
  }

  /**
   * Whether the whole group `key` is disabled per `groupDisabledFn` (false when unset).
   * @group Subclassing: semantics
   */
  protected isGroupDisabled(key: GroupKey): boolean {
    const fn = this.settings.groupDisabledFn
    return fn ? fn(key) : false
  }

  /**
   * First enabled index scanning from `start` (inclusive) by `step` (+1 / -1).
   * Returns -1 if no enabled item lies in that direction. Used to skip disabled
   * items during keyboard nav and initial focus.
   * @group Subclassing: focus
   */
  protected findNextEnabledIndex(start: number, step: number, list: readonly T[]): number {
    for (let i = start; i >= 0 && i < list.length; i += step) {
      if (!this.isItemEffectivelyDisabled(list[i]!)) { return i }
    }
    return -1
  }

  /** Number of entries in the arrow-key ring for the current render. */
  private ringLength(): number {
    return (this.chooseAllRowEl ? 1 : 0) + this.leadingActionRowEls.length + this.getVisibleItems().length + this.trailingActionRowEls.length
  }

  /** Ring position of the active option, or -1 when nothing holds it. */
  private ringPosition(): number {
    const lead = this.chooseAllRowEl ? 1 : 0
    const r = this.focusedRow
    if (r !== null) {
      if (r.kind === 'choose-all') { return 0 }
      if (r.kind === 'leading') { return lead + r.index }
      return lead + this.leadingActionRowEls.length + this.getVisibleItems().length + r.index
    }
    return this.focusedIndex >= 0 ? lead + this.leadingActionRowEls.length + this.focusedIndex : -1
  }

  /** The ring entry at a position (caller keeps `0 <= position < ringLength()`). */
  private ringEntryAt(position: number): RingEntry {
    let p = position
    if (this.chooseAllRowEl) {
      if (p === 0) { return { kind: 'choose-all' } }
      p -= 1
    }
    const nLeading = this.leadingActionRowEls.length
    if (p < nLeading) { return { kind: 'leading', index: p } }
    p -= nLeading
    const nItems = this.getVisibleItems().length
    if (p < nItems) { return { kind: 'item', index: p } }
    return { kind: 'trailing', index: p - nItems }
  }

  private isRingPositionEnabled(position: number): boolean {
    const e = this.ringEntryAt(position)
    switch (e.kind) {
      case 'choose-all': return true
      case 'item': return !this.isItemEffectivelyDisabled(this.getVisibleItems()[e.index]!)
      case 'leading': return this.leadingActionRowEls[e.index]?.getAttribute('aria-disabled') !== 'true'
      case 'trailing': return this.trailingActionRowEls[e.index]?.getAttribute('aria-disabled') !== 'true'
    }
  }

  /** First enabled ring position from `start` walking in `direction`, or -1. */
  private findNextEnabledRingPosition(start: number, direction: 1 | -1, total: number): number {
    for (let p = start; p >= 0 && p < total; p += direction) {
      if (this.isRingPositionEnabled(p)) { return p }
    }
    return -1
  }

  /** Ring twin of `findEnabledIndexForAction`: search in the travel direction, Page keys fall back the other way. */
  private findEnabledRingPositionForKeyboardAction(target: number, action: LLSelectKeyboardAction, total: number): number {
    const forward = action === LLSelectKeyboardAction.Next
      || action === LLSelectKeyboardAction.GotoFirst
      || action === LLSelectKeyboardAction.PageDown
    const primary = this.findNextEnabledRingPosition(target, forward ? 1 : -1, total)
    if (primary >= 0) { return primary }
    if (action === LLSelectKeyboardAction.PageDown) { return this.findNextEnabledRingPosition(target, -1, total) }
    if (action === LLSelectKeyboardAction.PageUp) { return this.findNextEnabledRingPosition(target, 1, total) }
    return -1
  }

  /** Move the active option to a ring position through the entry's own focus method. */
  private focusRingPosition(position: number): void {
    const e = this.ringEntryAt(position)
    switch (e.kind) {
      case 'choose-all': this.focusChooseAllRow(); return
      case 'item': this.setFocusedIndex(e.index); return
      default: this.focusActionRow(e.kind, e.index)
    }
  }

  /** Move the active option onto an action row (mirrors `focusChooseAllRow`). */
  private focusActionRow(kind: 'leading' | 'trailing', index: number): void {
    const r = this.focusedRow
    if (r !== null && r.kind === kind && r.index === index) { return }
    this.focusedRow = { kind, index }
    this.focusedIndex = -1
    this.syncFocusedIndexToDom()
  }

  /** The element of the action row holding the active option, if one does. */
  private focusedActionRowEl(): HTMLElement | undefined {
    const r = this.focusedRow
    if (r === null || r.kind === 'choose-all') { return undefined }
    return (r.kind === 'leading' ? this.leadingActionRowEls : this.trailingActionRowEls)[r.index]
  }

  /** The descriptor of the action row holding the active option, if one does. */
  private focusedActionRow(): LLSelectPopupListActionRow | undefined {
    const r = this.focusedRow
    if (r === null || r.kind === 'choose-all') { return undefined }
    return (r.kind === 'leading' ? this.settings.popupListLeadingActionRows : this.settings.popupListTrailingActionRows)[r.index]
  }

  /** Enter / click on an action row: re-check disabled, then run the hook as a user change. */
  private activatePopupListActionRow(row: LLSelectPopupListActionRow): void {
    if (this.isPopupListActionRowDisabled(row)) { return }
    this.withUserChangeSource(() => this.onPopupListActionRowActivated(row))
  }

  /**
   * Called **after** the user's Enter on the active item row, Space on it while
   * the filter is inactive, or click on the row, as the library's response to
   * that input. Default no-op; subclasses implement their selection behaviour (single mode picks
   * and closes, multiple mode toggles and keeps the popup open).
   *
   * > No **before** counterpart: there is no `onPopupListItemActivating`.
   * @group Subclassing: reactions
   */
  protected onPopupListItemActivated(_item: T): void {}

  /**
   * Build the whole DOM element for one leading action row (above the items).
   * - The library calls it, once per entry of `popupListLeadingActionRows`,
   *   on every list render and after every chosen change. You never call it.
   * - Both params come from the library. Forward them to `super` unchanged.
   *   `row` is the entry; `index` is its position in that array, counted from
   *   0, used to mint the id. It is not an identity.
   * - To change only what the row shows, do not override this: give the entry
   *   a `createContentElFn`.
   * - To change the element itself, override it, call
   *   `super.createPopupListLeadingActionRowEl(row, index)`, and edit the
   *   returned element. Keep the `id` and `role`; put no focusable control
   *   inside.
   * - Internals: a `div` with `role="option"`, the id
   *   `<listbox id>-action-row-leading<index>`, `popupListRowClass` plus
   *   `popupListActionRowClass`, the visible content from
   *   {@link createPopupListActionRowContentEl} (else `textContent` from
   *   `textFn`), `aria-label` = `textFn()` when the content is custom, and
   *   either `aria-disabled` plus the disabled class
   *   ({@link isPopupListActionRowDisabled}) or a click handler that focuses
   *   the row, then runs {@link onPopupListActionRowActivated}. No
   *   `aria-selected`: a command has no selected state.
   * @param row - the entry, supplied by the library
   * @param index - the entry's position in `popupListLeadingActionRows`, supplied by the library
   * @group Subclassing: rendering
   */
  protected createPopupListLeadingActionRowEl(row: LLSelectPopupListActionRow, index: number): HTMLElement {
    return this.createPopupListActionRowEl(row, 'leading', index)
  }

  /**
   * Build the whole DOM element for one trailing action row (below the items).
   * - The library calls it, once per entry of `popupListTrailingActionRows`,
   *   on every list render and after every chosen change. You never call it.
   * - Both params come from the library. Forward them to `super` unchanged.
   *   `row` is the entry; `index` is its position in that array, counted from
   *   0, used to mint the id. It is not an identity.
   * - To change only what the row shows, do not override this: give the entry
   *   a `createContentElFn`.
   * - To change the element itself, override it, call
   *   `super.createPopupListTrailingActionRowEl(row, index)`, and edit the
   *   returned element. Keep the `id` and `role`; put no focusable control
   *   inside.
   * - Internals: identical to {@link createPopupListLeadingActionRowEl}
   *   except the id, `<listbox id>-action-row-trailing<index>`.
   * @param row - the entry, supplied by the library
   * @param index - the entry's position in `popupListTrailingActionRows`, supplied by the library
   * @group Subclassing: rendering
   */
  protected createPopupListTrailingActionRowEl(row: LLSelectPopupListActionRow, index: number): HTMLElement {
    return this.createPopupListActionRowEl(row, 'trailing', index)
  }

  /** Shared body of the two action-row builders. */
  private createPopupListActionRowEl(row: LLSelectPopupListActionRow, position: 'leading' | 'trailing', index: number): HTMLElement {
    const el = document.createElement('div')
    el.id = `${this.classIdMap.popupListId}-action-row-${position}${index}`
    el.className = `${this.classIdMap.popupListRowClass} ${this.classIdMap.popupListActionRowClass}`
    el.setAttribute('role', 'option')
    const textFn = row.textFn
    const text = textFn()
    const content = this.createPopupListActionRowContentEl(row)
    if (content === null) {
      el.textContent = text
    } else {
      // Custom content fills the visuals only; the accessible name stays textFn.
      el.setAttribute('aria-label', text)
      el.appendChild(content)
    }
    if (this.isPopupListActionRowDisabled(row)) {
      el.setAttribute('aria-disabled', 'true')
      el.classList.add(this.classIdMap.popupListRowDisabledClass)
    } else {
      el.addEventListener('click', () => {
        // Focus-then-activate, mirroring the item click wiring, guard included.
        const stamp = this.captureStateStamp()
        this.focusActionRow(position, index)
        if (this.stateMovedSince(stamp)) { return }
        this.activatePopupListActionRow(row)
      })
    }
    return el
  }

  /**
   * An action row's visible content element.
   * - The library calls it from the row builders, once per row render. You
   *   never call it. `row` comes from the library.
   * - Default reads the entry's `createContentElFn`; `null` (unset, or
   *   returned) = plain text from `textFn`.
   * - Override only when extending; for one-off content give the entry a
   *   `createContentElFn`.
   * @group Subclassing: rendering
   */
  protected createPopupListActionRowContentEl(row: LLSelectPopupListActionRow): HTMLElement | null {
    const fn = row.createContentElFn
    return fn ? fn() : null
  }

  /**
   * Whether an action row is disabled right now.
   * - The library calls it from the row builders (once per row render) and
   *   again at activation. You never call it. `row` comes from the library.
   * - Default reads the entry's `disabledFn`; `null` / omitted = never disabled.
   * @group Subclassing: semantics
   */
  protected isPopupListActionRowDisabled(row: LLSelectPopupListActionRow): boolean {
    const fn = row.disabledFn
    return fn ? fn() : false
  }

  /**
   * Subclass hook: runs **after** Enter on the active action row, Space on it
   * while the filter is inactive, or a click on it, as the library's response
   * to that input.
   *
   * > No **before** counterpart: there is no `onPopupListActionRowActivating`.
   *
   * - The library calls it on Enter, on Space while the filter is inactive,
   *   and on click, **after** the disabled re-check, as a user change. You never
   *   call it. `row` comes from the library: the activated entry.
   * - Default calls the entry's `onActivate`. The library changes nothing
   *   else: choosing and closing are the entry's job.
   * - Override to react before the entry's `onActivate`: do your work, then
   *   call `super.onPopupListActionRowActivated(row)`. To react after it, call
   *   `super` first, then do your work. Without that call the entry's
   *   `onActivate` never runs.
   * @group Subclassing: reactions
   */
  protected onPopupListActionRowActivated(row: LLSelectPopupListActionRow): void {
    const onActivate = row.onActivate
    onActivate()
  }

  /**
   * Rebuild every rendered action row in place, so `textFn` / `disabledFn`
   * reflect the current state; the row holding the active option keeps it.
   * - The library calls it after every chosen change, right after `onChange`
   *   fired (a row's text may read what the handler wrote). Subclasses may
   *   call it after a state change of their own.
   * - No-op while closed, or when both row arrays are empty - instances
   *   without rows pay nothing.
   * - O(rows) DOM work; the item rows are untouched.
   * @group Subclassing: rendering
   */
  protected replacePopupListActionRowElsInDom(): void {
    if (!this.opened) { return }
    const leading = this.settings.popupListLeadingActionRows
    const trailing = this.settings.popupListTrailingActionRows
    if (leading.length === 0 && trailing.length === 0) { return }
    this.leadingActionRowEls = this.replaceActionRowElsInDom(this.leadingActionRowEls, leading, (row, i) => this.createPopupListLeadingActionRowEl(row, i))
    this.trailingActionRowEls = this.replaceActionRowElsInDom(this.trailingActionRowEls, trailing, (row, i) => this.createPopupListTrailingActionRowEl(row, i))
  }

  private replaceActionRowElsInDom(
    olds: HTMLElement[],
    rows: readonly LLSelectPopupListActionRow[],
    build: (row: LLSelectPopupListActionRow, index: number) => HTMLElement,
  ): HTMLElement[] {
    return olds.map((old, i) => {
      const next = build(rows[i]!, i)
      old.replaceWith(next)
      if (this.focusedEl === old) {
        next.classList.add(this.classIdMap.popupListRowFocusedClass)
        this.comboboxEl.setAttribute('aria-activedescendant', next.id)
        this.focusedEl = next
      }
      return next
    })
  }

  /**
   * Optional non-item `role="option"` row placed first, at the TOP of the listbox:
   * inside the arrow-key ring (ArrowUp from the first item reaches it, Home
   * lands on it, up-actions clamp there) but never inside `itemEls`, so the
   * `itemEls[i] <-> getVisibleItems()[i]` alignment is untouched. Rebuilt on
   * every `renderPopupList`. Base default: `null` = no choose-all row.
   * `LLSelectMultiple` builds its choose-all row here (`chooseAllRow` setting).
   * @group Subclassing: rendering
   */
  protected createPopupListChooseAllRowEl(): HTMLElement | null { return null }

  /**
   * Dispatch the before-change event of one user change and report whether
   * the change may proceed. The variants call it from their gate with a
   * closure that runs `onChosenChanging` and the `onBeforeChange` setting.
   * - `preventDefault()` counts only inside `dispatch`; the event is sealed
   *   afterwards.
   * @internal
   */
  protected dispatchBeforeChange(facts: { reason: 'choose' | 'unchoose'; item: T } | { reason: 'clear' | 'set' }, dispatch: (event: LLSelectBeforeChangeEvent<T>) => void): boolean {
    let prevented = false
    let open = true
    const preventDefault = (): void => { if (open) { prevented = true } }
    const event: LLSelectBeforeChangeEvent<T> = 'item' in facts
      ? { source: 'user', reason: facts.reason, item: facts.item, get defaultPrevented() { return prevented }, preventDefault }
      : { source: 'user', reason: facts.reason, get defaultPrevented() { return prevented }, preventDefault }
    try { dispatch(event) } finally { open = false }
    return !prevented
  }

  /**
   * Run `fn` with chosen-state changes attributed to the user.
   * - The library wraps exactly its pointer / keyboard entry points with it:
   *   option activation, the tag remove button, the clear button, the
   *   choose-all row, and an action row's `onActivate`.
   * - A change outside such a call reports `'api'`.
   * - The attribution is consumed by the first chosen-state change inside
   *   `fn`, before `onChosenChanged` runs.
   * - A second change inside the same `fn` reports `'api'`.
   * @group Subclassing: reactions
   */
  protected withUserChangeSource<R>(fn: () => R): R {
    const previous = this.changeSource
    this.changeSource = 'user'
    try {
      return fn()
    } finally {
      this.changeSource = previous
    }
  }

  /**
   * Subclass hook: runs **after** Enter on the active choose-all row, or Space
   * on it while the filter is inactive, as the library's response to that
   * input. Default no-op. `LLSelectMultiple`, which supplies the row, also
   * wires its click handler to this.
   *
   * > No **before** counterpart: there is no `onChooseAllRowActivating`.
   * @group Subclassing: reactions
   */
  protected onChooseAllRowActivated(): void {}

  /**
   * Decide which item to focus when the popup opens. Default focuses the
   * first item (or no-op if the list is empty). Override to focus the
   * currently chosen item, last-used item, etc. "Focus" here means the
   * active row (`aria-activedescendant`), not DOM focus, which the open
   * moves to the filter input or keeps on the trigger.
   * @group Subclassing: focus
   */
  protected focusInitial(): void {
    const first = this.findNextEnabledIndex(0, 1, this.getVisibleItems())
    if (first >= 0) { this.setFocusedIndex(first) }
  }

  /**
   * Move keyboard focus to the item at `index`. The value is clamped to
   * `[-1, getVisibleItems().length - 1]`; pass `-1` to clear focus. Updates the focused
   * class, `aria-activedescendant`, and scrolls the item into view. No-op
   * if the clamped value equals the current focused index. "Keyboard
   * focus" here means the active row, not DOM focus, which stays on the
   * trigger or the filter input.
   * @group Subclassing: focus
   */
  protected setFocusedIndex(index: number): void {
    const max = this.getVisibleItems().length - 1
    const clamped = Math.max(-1, Math.min(max, index))
    if (clamped === this.focusedIndex && this.focusedRow === null) { return }
    this.focusedRow = null
    this.focusedIndex = clamped
    this.syncFocusedIndexToDom()
  }

  /**
   * Move keyboard focus onto the choose-all row. Returns whether the row is now
   * focused (`false` = none is rendered, nothing changed). The item focus is
   * cleared (`focusedIndex` becomes -1). "Keyboard focus" here means the
   * active row, not DOM focus, which stays on the trigger or the filter input. Protected so a subclass can wire its
   * choose-all row's click to focus-then-activate (mirroring how item clicks
   * call `setFocusedIndex` before `onPopupListItemActivated`) and use it in
   * `focusInitial` (the choose-all row is the listbox's FIRST option).
   * @group Subclassing: focus
   */
  protected focusChooseAllRow(): boolean {
    if (!this.chooseAllRowEl) { return false }
    if (this.focusedRow?.kind === 'choose-all') { return true }
    this.focusedRow = { kind: 'choose-all' }
    this.focusedIndex = -1
    this.syncFocusedIndexToDom()
    return true
  }

  /**
   * Rebuild the choose-all row in place (tri-state / text refresh) without
   * touching the item elements - O(1) DOM work, mirroring
   * `replacePopupListItemElInDom`. Falls back to a full `renderPopupList`
   * when the row becomes inapplicable (builder returns `null`). No-op while
   * closed or when no choose-all row is rendered.
   * @group Subclassing: rendering
   */
  protected replaceChooseAllRowElInDom(): void {
    if (!this.opened || !this.chooseAllRowEl) { return }
    const next = this.createPopupListChooseAllRowEl()
    if (next === null) {
      this.renderPopupList()
      return
    }
    const old = this.chooseAllRowEl
    old.replaceWith(next)
    this.chooseAllRowEl = next
    if (this.focusedEl === old) {
      next.classList.add(this.classIdMap.popupListRowFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', next.id)
      this.focusedEl = next
    }
  }

  /**
   * Make the DOM reflect the active row (`focusedRow`, else `focusedIndex`):
   * move the focused class onto its element, point `aria-activedescendant` at
   * it, and scroll it into view; with no row, clear the class and the
   * attribute. Then report the active item (`reportActiveItem`). Reads the
   * rendered elements, so it only has an effect while the popup is open.
   * Called after every active-row change (`setFocusedIndex`,
   * `focusChooseAllRow`, `focusActionRow`) and after the list is rebuilt
   * (`renderPopupList`, whose clamp assigns `focusedIndex` directly).
   */
  private syncFocusedIndexToDom(): void {
    if (this.focusedEl) {
      this.focusedEl.classList.remove(this.classIdMap.popupListRowFocusedClass)
      this.focusedEl = undefined
    }
    const el = this.resolveActiveRowEl()
    if (el === undefined) {
      this.comboboxEl.removeAttribute('aria-activedescendant')
    } else {
      el.classList.add(this.classIdMap.popupListRowFocusedClass)
      this.comboboxEl.setAttribute('aria-activedescendant', el.id)
      this.focusedEl = el
      this.scrollRingEntryIntoView(el)
    }
    this.reportActiveItem()
  }

  /**
   * The element of the active row, or `undefined` when no rendered row is
   * active. An action row whose element is gone drops `focusedRow` to `null`
   * and falls through to the item at `focusedIndex`.
   */
  private resolveActiveRowEl(): HTMLElement | undefined {
    if (this.focusedRow !== null && this.focusedRow.kind !== 'choose-all') {
      const rowEl = this.focusedActionRowEl()
      if (rowEl !== undefined) { return rowEl }
      this.focusedRow = null
    }
    if (this.focusedRow?.kind === 'choose-all' && this.chooseAllRowEl) { return this.chooseAllRowEl }
    const i = this.focusedIndex
    return i >= 0 && i < this.itemEls.length ? this.itemEls[i] : undefined
  }

  /**
   * Fire `onActiveItemChange` when the active item differs from the last
   * report. The tail of `syncFocusedIndexToDom`, which every active-row move
   * ends in, plus `close()`, which resets the row by assignment. Items are
   * compared with `compareFn`, never by index or element, so an in-place row
   * rebuild stays silent. The report is stored before the listener runs, so a
   * listener that closes or re-renders the widget re-enters with the right
   * baseline.
   */
  private reportActiveItem(): void {
    if (this.activeItemReportSuspendDepth > 0) { return }
    const next = this.resolveActiveItem()
    const last = this.reportedActiveItem
    if (!next.active && !last.active) { return }
    if (next.active && last.active && this.settings.compareFn(next.item, last.item)) { return }
    this.reportedActiveItem = next
    const onActiveItemChange = this.settings.onActiveItemChange
    onActiveItemChange?.(next.active ? next.item : undefined)
  }

  /** The item of the active row; none while closed, on a non-item row, or with no row. */
  private resolveActiveItem(): { active: true; item: T } | { active: false } {
    if (!this.opened || this.focusedRow !== null) { return { active: false } }
    const list = this.getVisibleItems()
    const i = this.focusedIndex
    return i >= 0 && i < list.length ? { active: true, item: list[i]! } : { active: false }
  }

  /**
   * Snapshot the window scroll position and return a function that restores
   * it. Opening the popup must never move the page, but Firefox auto-scrolls
   * the active option of a multiselectable listbox into view at the document
   * level when the popup is shown - even though the popup is `position: fixed`.
   * The returned restore runs synchronously and once more on the next frame,
   * since that accessibility scroll can land after the current layout flush.
   * No-op when nothing actually scrolled, so it never fights real user
   * scrolling (and stays silent under jsdom, which has no `window.scrollTo`).
   * Restores with `behavior: 'instant'`: the two-arg `scrollTo` obeys the
   * page's CSS `scroll-behavior`, so under `scroll-behavior: smooth` the
   * correction would render as a visible glide instead of a revert.
   */
  private captureWindowScroll(): () => void {
    const { scrollX, scrollY } = window
    const restore = (): void => {
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      }
    }
    return (): void => {
      restore()
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(restore)
      }
    }
  }

  /**
   * The element a pointer event actually hit. `ev.target` retargets to the shadow
   * host when llselect is hosted inside an app's shadow root, so an inside click
   * would read as outside and close the popup; `composedPath()[0]` pierces the
   * boundary. With no shadow tree (llselect uses none itself) this equals `ev.target`.
   * - Limitation: a CLOSED host shadow root truncates `composedPath()` at the root,
   *   so `[0]` is only the host and an inside click still reads as outside. A
   *   document-level listener cannot see into a closed root; hosting in an OPEN
   *   shadow root avoids it.
   */
  private eventTargetNode(ev: Event): EventTarget | null {
    return ev.composedPath?.()?.[0] ?? ev.target
  }

  private attachOutsideClick(): void {
    const mode = this.settings.outsideClickBehavior
    if (mode === 'pass-through') {
      // mousedown fires before mouseup/click - feels snappier; we do not
      // preventDefault, so the outside click still triggers its own action.
      this.outsideHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          this.closeWithReason('outside')
        }
      }
      document.addEventListener('mousedown', this.outsideHandler)
    } else {
      // 'block' needs TWO listeners because of an event-ordering race with
      // the focusout-close path:
      //   mousedown outside -> browser shifts focus to the clicked target ->
      //   focusout fires on trigger -> focusOutHandler closes the popup ->
      //   detachOutsideClick removes the click capture below -> click then
      //   reaches the target and fires its own handler (regression).
      // The mousedown capture below preventDefaults the focus shift on
      // outside mousedowns, so no focusout fires and the click capture stays
      // attached long enough to swallow the click.
      this.blockMouseDownHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          ev.preventDefault()
        }
      }
      document.addEventListener('mousedown', this.blockMouseDownHandler, true)
      // capture phase so we run before the target's own listeners; swallow
      // the click so the underlying button/link/etc. does not fire.
      this.outsideHandler = (ev: Event) => {
        const t = this.eventTargetNode(ev)
        if (t instanceof Node && !this.rootEl.contains(t)) {
          ev.stopPropagation()
          ev.preventDefault()
          this.closeWithReason('outside')
        }
      }
      document.addEventListener('click', this.outsideHandler, true)
    }
  }

  private detachOutsideClick(): void {
    if (this.outsideHandler) {
      if (this.settings.outsideClickBehavior === 'pass-through') {
        document.removeEventListener('mousedown', this.outsideHandler)
      } else {
        document.removeEventListener('click', this.outsideHandler, true)
      }
      this.outsideHandler = undefined
    }
    if (this.blockMouseDownHandler) {
      document.removeEventListener('mousedown', this.blockMouseDownHandler, true)
      this.blockMouseDownHandler = undefined
    }
  }

  /**
   * The whole-life `focusin` / `focusout` pair on `rootEl`. Both bubble from
   * every descendant, so one listener each sees focus entering or leaving any
   * part of the widget. `relatedTarget` - the element focus comes from or goes
   * to - tells an outside move from an inside one; `null` counts as outside
   * (a click on a non-focusable area, focus from nowhere). The inside test is
   * `rootEl.contains`, not "the trigger", so the filter input and slot
   * controls keep the popup open while they hold focus.
   * - `focusout` is always attached: it closes an open popup when focus leaves
   *   (A11Y.md "Focus"), then fires `onBlur`, in that order.
   * - `focusin` is attached only when `onFocus` is set.
   * - `destroy()` detaches both before its own `close()` and
   *   `replaceChildren()`, so a parting event cannot reach a listener.
   */
  private attachFocusListeners(): void {
    this.focusOutHandler = (ev: FocusEvent): void => {
      if (this.isInsideRoot(ev.relatedTarget)) { return }
      if (this.opened) { this.closeWithReason('blur') }
      const onBlur = this.settings.onBlur
      onBlur?.()
    }
    this.rootEl.addEventListener('focusout', this.focusOutHandler)
    if (this.settings.onFocus === null) { return }
    this.focusInHandler = (ev: FocusEvent): void => {
      if (this.isInsideRoot(ev.relatedTarget)) { return }
      const onFocus = this.settings.onFocus
      onFocus?.()
    }
    this.rootEl.addEventListener('focusin', this.focusInHandler)
  }

  private detachFocusListeners(): void {
    if (this.focusOutHandler) {
      this.rootEl.removeEventListener('focusout', this.focusOutHandler)
      this.focusOutHandler = undefined
    }
    if (this.focusInHandler) {
      this.rootEl.removeEventListener('focusin', this.focusInHandler)
      this.focusInHandler = undefined
    }
  }

  /** Whether `target` is a node inside `rootEl`; `null` counts as outside. */
  private isInsideRoot(target: EventTarget | null): boolean {
    return target instanceof Node && this.rootEl.contains(target)
  }

  /**
   * Esc pressed while DOM focus sits on app content inside a popup slot
   * (`popupHeaderEl` / `popupFooterEl`): close, and `close()` returns focus to
   * the trigger. Escape only; ignores IME composition, an event the app
   * already handled (`defaultPrevented` - a text field that owns Esc), and
   * the filter input's own events (its `handleKeydown` ran first and prevented
   * the default). `preventDefault` so an enclosing modal `<dialog>` does not
   * also close on the same key.
   */
  private handleSlotKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'Escape' || ev.isComposing || this.composing || ev.defaultPrevented) { return }
    const t = this.eventTargetNode(ev)
    if (t instanceof Node && this.filterInputEl.contains(t)) { return }
    ev.preventDefault()
    this.closeWithReason('escape')
  }

  private handleKeydown(ev: KeyboardEvent): void {
    // Leave the keys to the IME while composing.
    if (ev.isComposing || this.composing) { return }
    if (this.disabled) { return }
    const inText = ev.currentTarget === this.filterInputEl
    if (!inText && this.handleTypeaheadKeydown(ev)) { return }
    const action = getActionFromKey(ev, this.opened, inText)
    if (action === undefined) { return }
    ev.preventDefault()
    // Any action key ends the typed prefix (Enter/Space activate, Escape
    // closes, arrows move on).
    this.typeaheadBuffer = ''

    switch (action) {
      case LLSelectKeyboardAction.Open:
        this.openWithReason('keyboard')
        return
      case LLSelectKeyboardAction.Close:
        // Esc two-stage while the filter is active: clear the filter first; only
        // close when the filter is already empty. Alt+ArrowUp maps to Close
        // too but always closes. Closing returns focus to the trigger.
        if (ev.key === 'Escape' && this.filterActive && this.query !== '') {
          this.filterInputEl.value = ''
          this.handleSearchInputEvent()
          return
        }
        this.closeWithReason('escape')
        return
      case LLSelectKeyboardAction.Select: {
        if (this.focusedRow?.kind === 'choose-all') {
          this.withUserChangeSource(() => this.onChooseAllRowActivated())
          return
        }
        if (this.focusedRow !== null) {
          const row = this.focusedActionRow()
          if (row !== undefined) { this.activatePopupListActionRow(row) }
          return
        }
        const list = this.getVisibleItems()
        if (this.focusedIndex >= 0 && this.focusedIndex < list.length) {
          const item = list[this.focusedIndex]!
          // Defensive: nav never lands on a disabled item, but guard anyway.
          if (!this.isItemEffectivelyDisabled(item)) { this.withUserChangeSource(() => this.onPopupListItemActivated(item)) }
        }
        return
      }
      case LLSelectKeyboardAction.Next:
      case LLSelectKeyboardAction.Previous:
      case LLSelectKeyboardAction.GotoFirst:
      case LLSelectKeyboardAction.GotoLast:
      case LLSelectKeyboardAction.PageDown:
      case LLSelectKeyboardAction.PageUp: {
        // One walk over the whole ring: choose-all row, leading action rows,
        // items, trailing action rows. Disabled entries are skipped
        // in the travel direction (Page keys fall back the other way).
        const total = this.ringLength()
        if (total === 0) { return }
        const target = getUpdatedIndex(this.ringPosition(), total - 1, action)
        const found = this.findEnabledRingPositionForKeyboardAction(target, action, total)
        if (found >= 0) { this.focusRingPosition(found) }
        return
      }
    }
  }

  /**
   * Native-`<select>`-style prefix typeahead for a printable-character
   * keydown on the trigger.
   * - Returns `true` when the event was consumed.
   * - Runs only while the filter is inactive. With the popup open the filter
   *   input owns typing; while closed, a would-be-filterable open cycle
   *   leaves the keys alone (the `filterable` predicate is evaluated fresh -
   *   the cached `filterActive` can be stale between opens).
   * - Space never joins the buffer; it stays the activate/open key (A11Y.md).
   * - While closed: opens the popup first, then searches relative to
   *   {@link computeTypeaheadClosedStartIndex} - NOT to the convenience focus
   *   `focusInitial` parked, which would skip the first match.
   * - Typing itself never changes the value and never fires `onChange`;
   *   activation stays Enter / Space / click.
   * - Match rule, cycling, and wrap: {@link findTypeaheadIndex}. No match
   *   leaves the active option and the buffer as they are.
   */
  private handleTypeaheadKeydown(ev: KeyboardEvent): boolean {
    // Printable = exactly one code point ('Dead' / 'Process' fail, astral
    // pairs pass). Meta and Ctrl-only chords are commands.
    if (ev.key === ' ' || [...ev.key].length !== 1 || ev.metaKey || (ev.ctrlKey && !ev.altKey)) { return false }
    // Alt-carrying chords (AltGraph, macOS Option) PRODUCE characters and the
    // produced character arrives as ev.key ("@", "a-ring", ...). A chord
    // still delivering a bare ASCII letter / digit produced nothing - that is
    // a shortcut (Windows Alt menus, accesskey, VoiceOver's Ctrl+Option), so
    // it passes through.
    if (ev.altKey && /^[a-zA-Z0-9]$/.test(ev.key)) { return false }
    if (this.opened ? this.filterActive : this.computeFilterActive()) { return false }
    ev.preventDefault()
    const now = Date.now()
    this.typeaheadBuffer = getUpdatedTypeaheadBuffer(this.typeaheadBuffer, ev.key, now - this.typeaheadLastTime)
    this.typeaheadLastTime = now
    const openedByThisKey = !this.opened
    if (openedByThisKey) {
      this.openWithReason('typeahead')
      // open() can refuse (hidden anchor): nothing to move focus in, and the
      // buffer must not survive into a later successful open.
      if (!this.opened) { this.typeaheadBuffer = ''; return true }
    }
    const list = this.getVisibleItems()
    const current = openedByThisKey
      ? this.computeTypeaheadClosedStartIndex(list)
      : (this.focusedRow !== null ? -1 : this.focusedIndex)
    const found = findTypeaheadIndex(
      this.typeaheadBuffer,
      list.length,
      current,
      (i) => this.isItemEffectivelyDisabled(list[i]!) ? undefined : this.itemToString(list[i]!),
    )
    if (found >= 0) { this.setFocusedIndex(found) }
    return true
  }

  /**
   * The option the closed-state typeahead treats as current, as an index into
   * `list`, when the typed character is the keystroke that opens the popup.
   * - The search starts AFTER this option: the opening keystroke is always a
   *   one-character buffer, because `close()` and a refused `open()` both
   *   empty the buffer.
   * - Default `-1`: no current option, so the first match from the top wins.
   * - The focus `focusInitial` parks on open is a convenience, not a
   *   selection - it must not shift this search.
   * - Single mode overrides this with the chosen item's index, so a typed
   *   initial cycles past the current selection like a native `<select>`.
   * - Search internals: `findTypeaheadIndex` in `keyboard.ts`.
   * @group Subclassing: focus
   */
  protected computeTypeaheadClosedStartIndex(_list: readonly T[]): number {
    return -1
  }

  private createTriggerEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.triggerId
    el.className = this.classIdMap.triggerClass
    // Filter active: trigger is a button that opens a popup containing a
    // combobox+listbox. Inactive: trigger is itself the combobox.
    el.setAttribute('role', this.filterActive ? 'button' : 'combobox')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-haspopup', 'listbox')
    el.setAttribute('data-state', 'closed')
    el.setAttribute('data-disabled', 'false')
    // Child slots: content (text/tags), optional clear button, arrow. Clear and
    // arrow are own slots so they never collide with createTriggerContentElFn.
    const content = document.createElement('span')
    content.id = this.classIdMap.triggerContentId
    content.className = this.classIdMap.triggerContentClass
    el.append(content)
    // The clear button is not built here: the first trigger render builds it
    // (replaceTriggerClearButtonElInDom), so it is built once, not once here
    // and again at that render.
    const arrow = document.createElement('span')
    arrow.className = this.classIdMap.triggerArrowClass
    el.append(arrow)
    return el
  }

  /**
   * Build the clear (x) button for the `clearable` trigger slot.
   * - The library owns the button, its click (stops propagation so it never
   *   toggles the popup, then `clearSelection`; a no-op while the control is
   *   disabled) and its `aria-label` (text from
   *   `uiTranslationPack.triggerClearButtonAriaLabel`).
   * - `createTriggerClearButtonContentElFn` optionally fills the icon; else the
   *   theme's CSS glyph draws it.
   * - The theme hides the button via `data-empty` while nothing is chosen.
   * - It runs on every trigger render (`renderTrigger`).
   * - The first run builds the button.
   * - For `LLSelectSingle` / `LLSelectMultiple` and their subclasses, that
   *   first run is the variant constructor's render, right after `super()`,
   *   so it happens before a FURTHER subclass's field initializers.
   * - A direct `LLSelectBase` subclass gets the button on its first trigger
   *   render (its own `renderTrigger()` call, or `rerender()` /
   *   `setPlaceholder`); until then the trigger is unrendered and there is no
   *   button.
   * - Every later run (a value change, `setPlaceholder`,
   *   `setUiTranslationPack`, `rerender()`) swaps the button in place, unless
   *   this method returns the previous element - then it stays in place.
   * - The base implementation returns a fresh element each run, so, like the
   *   arrow, nothing put on it from outside survives a render; customize it
   *   here.
   * - An override that returns the same element every time owns everything
   *   the rebuild would otherwise refresh on it, including its `aria-label`
   *   after `setUiTranslationPack`.
   * - An override that reads subclass fields calls `rerender()` at the end of
   *   its constructor, like every other trigger method.
   * @group Subclassing: rendering
   */
  protected createTriggerClearButtonEl(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = this.classIdMap.triggerClearButtonClass
    btn.tabIndex = -1
    btn.setAttribute('aria-label', this.settings.uiTranslationPack.triggerClearButtonAriaLabel)
    const icon = this.createTriggerClearButtonContentEl()
    if (icon !== null) { btn.appendChild(icon) }
    // Keep DOM focus where it is, as the chip's remove button does: a
    // mousedown would focus the button, the click rebuilds it with the focus
    // handed over, and the theme then hides it (`data-empty`), dropping focus
    // to <body> and reporting a blur for a click inside the widget.
    btn.addEventListener('mousedown', (ev) => { ev.preventDefault() })
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      // Disabled blocks every USER path to a value change (programmatic
      // setters still work), and the clear button is
      // reachable while closed - open() and keydown are already guarded.
      if (this.isDisabled()) { return }
      this.focusTriggerIfUnfocused()
      // The focus may run onFocus; a listener that disabled or destroyed the
      // control leaves nothing for this click to clear. One that opened the
      // popup or loaded items does not change what a clear means.
      if (this.destroyed || this.isDisabled()) { return }
      this.withUserChangeSource(() => this.clearSelection())
    })
    return btn
  }

  /**
   * The element holding DOM focus if that is `el` or a descendant, else `null`.
   * - Read from `el`'s own root: inside a shadow root `document.activeElement`
   *   is the shadow HOST, so the answer must come from the `ShadowRoot`'s
   *   `activeElement` (the `Document`'s otherwise).
   * - The result can sit inside an open shadow root under `el`, so
   *   `el.contains()` may reject it; use `containsComposed` for that check.
   * - A CLOSED shadow root is opaque, so its host is returned.
   */
  private focusedElementIn(el: Element): Element | null {
    const active = (el.getRootNode() as Partial<DocumentOrShadowRoot>).activeElement ?? null
    if (active === null || !el.contains(active)) { return null }
    // Descend through open shadow roots to the element that really holds
    // focus: `activeElement` stops at a shadow host.
    let deepest = active
    while (deepest.shadowRoot !== null && deepest.shadowRoot.activeElement !== null) { deepest = deepest.shadowRoot.activeElement }
    return deepest
  }

  /** Whether `node` is `el` or inside it, walking up through open shadow hosts. */
  private containsComposed(el: Element, node: Node): boolean {
    let cursor: Node | null = node
    while (cursor !== null) {
      if (el.contains(cursor)) { return true }
      // Only a ShadowRoot (a DocumentFragment, nodeType 11) has a host worth
      // climbing to. A detached element is its own root, and an `<a>` /
      // `<area>` root carries a STRING `host` (its URL host) - never follow
      // that. nodeType, not instanceof, so a foreign-realm root still counts.
      const root = cursor.getRootNode()
      cursor = root.nodeType === 11 ? (root as Partial<ShadowRoot>).host ?? null : null
    }
    return false
  }

  /** Whether DOM focus is on `el` or inside it (see `focusedElementIn`). */
  private isFocused(el: Element): boolean {
    return this.focusedElementIn(el) !== null
  }

  /**
   * Give the trigger DOM focus when no element inside the widget holds it.
   * - For the click of the clear button and of a chip's remove button: their
   *   `mousedown` keeps focus where it is, so a click on an unfocused widget
   *   would otherwise leave it unfocused, with no `onFocus` and no later
   *   `onBlur` for a form's touched state. A native control takes focus on a
   *   click inside it.
   * - While the trigger, the filter input or a slot control holds focus,
   *   nothing moves.
   * @internal
   */
  protected focusTriggerIfUnfocused(): void {
    if (this.isFocused(this.rootEl)) { return }
    this.triggerEl.focus({ preventScroll: true })
  }

  /**
   * Take the stamp a row click compares after its active-row move.
   * - The three row clicks call it: the item row, the choose-all row, the
   *   action row.
   * - They call it right before `setFocusedIndex`, `focusChooseAllRow` or
   *   `focusActionRow`, whose report runs the app's `onActiveItemChange`.
   * - Returns the transition generation and the change revision as they
   *   stand.
   * - {@link stateMovedSince} reads them back.
   * @internal
   */
  protected captureStateStamp(): { generation: number; revision: number } {
    return { generation: this.transitionGeneration, revision: this.changeRevision }
  }

  /**
   * Returns whether a listener moved the widget since `stamp` was taken.
   * - The three row clicks call it after their active-row move.
   * - `stamp` is what {@link captureStateStamp} returned before that move.
   * - True after an open, a close, a `rerender()`, a `destroy()`, a
   *   `setItems()` or a chosen-state change.
   * - The click then activates nothing: the row it meant belongs to a popup
   *   state that is gone.
   * - The other user paths re-check what they need instead:
   *   - the filter keystroke: the popup is open and its query still stands;
   *   - the clear button: the control is enabled and not destroyed;
   *   - the chip remove button checks all of the following:
   *     - the control is enabled and not destroyed;
   *     - the item is still chosen, read from the chosen entry as it stands
   *       now;
   *     - that entry is enabled.
   * @internal
   */
  protected stateMovedSince(stamp: { generation: number; revision: number }): boolean {
    return stamp.generation !== this.transitionGeneration || stamp.revision !== this.changeRevision
  }

  /**
   * Build the clear button on the first trigger render, and swap it for a fresh
   * one on every later render, always through `createTriggerClearButtonEl` (the
   * overridable builder) - so `rerender()` repairs an override that reads
   * subclass fields. Keeps DOM focus on the new button when the old one held it.
   * No-op without `clearable`.
   * The order of the steps is load-bearing:
   * 1. Read which node holds focus, if it is the old button or inside it.
   * 2. If one does, park focus on the old button itself. A content fn that
   *    hands back the same icon element each time reparents that icon into
   *    the new button, and the reparenting must not move the focused node.
   * 3. Build the new button.
   * 4. Insert it.
   * 5. If step 1 found focus, move focus to the new button - or, if that
   *    element cannot take focus, to the trigger.
   * 6. Only then remove the old one.
   * Why this order:
   * - Removing the old button first drops DOM focus to `<body>` in every
   *   engine.
   * - Where the engine also fires `focusout` on that removal, its
   *   `relatedTarget` is `null`. The open popup's focus-out guard reads that
   *   as focus leaving the widget.
   * - Moving focus first makes the new button the `relatedTarget`, inside the
   *   root.
   * A builder override that returns the SAME element every time is allowed:
   * the element is kept in place, and focus goes back to the node step 1
   * found, because nothing was rebuilt - unless the override detached that
   * node or moved it out of the button, in which case focus stays on the
   * button.
   */
  private replaceTriggerClearButtonElInDom(): void {
    if (!this.settings.clearable) { return }
    const old = this.triggerClearButtonEl
    const focused = old === null ? null : this.focusedElementIn(old)
    if (old !== null && focused !== null) { old.focus({ preventScroll: true }) }
    const next = this.createTriggerClearButtonEl()
    this.triggerClearButtonEl = next
    if (old === null) {
      this.triggerArrowEl.before(next)
      return
    }
    if (next === old) {
      // Nothing was rebuilt: hand focus back to the node that held it - but
      // only while it is still inside the button. The override may have
      // detached it or moved it elsewhere; then focus stays on the button.
      const holder = focused as (Element & Partial<HTMLOrSVGElement>) | null
      if (holder !== null && holder !== old && this.containsComposed(old, holder) && typeof holder.focus === 'function') {
        holder.focus({ preventScroll: true })
      }
      return
    }
    old.before(next)
    if (focused !== null) {
      next.focus({ preventScroll: true })
      // An override may return a non-focusable element; then the old button
      // still holds focus and removing it would drop focus to <body>. Keep it
      // in the widget instead.
      if (this.focusedElementIn(next) === null) { this.triggerEl.focus({ preventScroll: true }) }
    }
    old.remove()
  }

  /**
   * Clear button's visible content (its x icon).
   * - Default reads `createTriggerClearButtonContentElFn`; `null` (setting
   *   unset, or returned) = no icon - the theme's CSS glyph draws the x.
   * - Override only when extending; for one-off icons pass the setting.
   * @group Subclassing: rendering
   */
  protected createTriggerClearButtonContentEl(): HTMLElement | SVGElement | null {
    const fn = this.settings.createTriggerClearButtonContentElFn
    return fn ? fn() : null
  }

  /**
   * Empty the selection (invoked by the clear button). Base is a no-op; single
   * clears to `undefined`, multiple to `[]`. Goes through the normal setters, so
   * `onChange` fires with the empty value. The wipe is total - chosen disabled
   * items are cleared too (native `<select>` parity; `unchooseAll` is the
   * enabled-only bulk op).
   * @group Subclassing: semantics
   */
  protected clearSelection(): void {}

  /**
   * The filter input lives inside the popup, above the listbox. Always built
   * (`hidden` when `filterable: false`) so a future runtime toggle is a CSS
   * flip rather than a DOM rebuild. See `docs/llm/DESIGN.md`.
   */
  private createFilterInputEl(): HTMLInputElement {
    const el = document.createElement('input')
    el.type = 'text'
    el.id = this.classIdMap.filterInputId
    el.className = this.classIdMap.filterInputClass
    el.setAttribute('role', 'combobox')
    el.setAttribute('aria-controls', this.classIdMap.popupListId)
    el.setAttribute('aria-expanded', 'false')
    el.setAttribute('aria-autocomplete', 'list')
    el.setAttribute('autocomplete', 'off')
    el.setAttribute('autocapitalize', 'off')
    el.setAttribute('spellcheck', 'false')
    // Accessible name (aria-label / aria-labelledby) is owned by
    // syncFieldNameToDom, which runs right after construction.
    if (this.settings.uiTranslationPack.filterInputPlaceholder !== null) {
      el.placeholder = this.settings.uiTranslationPack.filterInputPlaceholder
    }
    return el
  }

  /**
   * Return the items the popup list renders, in display order.
   *
   * ```text
   * items                (setItems)
   *   |  gather          (only with grouping on; result cached until setItems)
   *   v
   * display base list
   *   |  filter query    (only while a query is active)
   *   v
   * visible items        (this method's return value)
   *   |  render
   *   v
   * DOM rows
   * ```
   *
   * - If no filter query is active (including while closed), it returns the
   *   full list, gathered per `gatherGroups` when grouping is on.
   * - If a filter query is active, it returns the matching subset.
   * - Disabled items are included. They render (grayed); only actions skip
   *   them (keyboard focus, the choose-all row's subset).
   * - Returns the LIVE internal array, typed read-only. Never mutate it
   *   (see `getItems`).
   * - Subclasses use it too (e.g. for selection-by-index), and may override
   *   it to add a step: `LLSelectMultiple` does for `hideChosenRows`.
   * @group Items
   */
  public getVisibleItems(): readonly T[] {
    return this.filteredItems ?? this.getDisplayBaseItems()
  }

  /**
   * The base list in DISPLAY order: `items` gathered per `gatherGroups`
   * (memoized until the next `setItems`), or `items` as-is while grouping is
   * off or `gatherGroups` is false. Filtering and rendering read this, never
   * `items` directly - so the gather runs lazily, at first need after a
   * `setItems`.
   */
  private getDisplayBaseItems(): readonly T[] {
    if (!this.settings.gatherGroups) { return this.items }
    if (this.gatheredItems === undefined) {
      // Keys resolve via the protected overridable method itemToGroupKey, so
      // an override drives the gather exactly like the render. All-null keys
      // (grouping off) detect as contiguous and return `items` itself.
      this.gatheredItems = gatherItemsByGroupKey(this.items, (item) => this.itemToGroupKey(item), this.settings.groupKeyCompareFn)
    }
    return this.gatheredItems
  }

  /**
   * Return the filter input's current query, exactly the string passed to
   * `filterFn`.
   * - It is `''` while the popup is closed, the filter is inactive, or the
   *   input is empty.
   * - It resets on close: each open cycle starts empty.
   * @group Filtering
   */
  public getFilterQuery(): string {
    return this.query
  }

  /**
   * Per-item match predicate for the filter input.
   * - Default reads `filterFn`; else case-insensitive substring on
   *   `itemToString`.
   * - Override only when extending (subclass-wide custom matching); for a
   *   one-off match rule pass the setting.
   * @group Subclassing: semantics
   */
  protected matchesQuery(item: T, query: string): boolean {
    const fn = this.settings.filterFn
    if (fn) { return fn(item, query) }
    return this.itemToString(item).toLowerCase().includes(query.toLowerCase())
  }

  /**
   * Recompute `filteredItems` from the current `items` and `query`. Pure state
   * update: does NOT touch the DOM (the caller re-renders the list separately).
   * No-op when `filterable: false`; an empty query keeps every item. Called from
   * `open()`, from `setItems()`, and on each filter-input event.
   */
  private recomputeFilteredItems(): void {
    if (!this.filterActive) { return }
    const q = this.query
    // Filter over the display base (gathered order): filtering preserves
    // contiguity, so a group's position cannot jump while typing.
    const base = this.getDisplayBaseItems()
    this.filteredItems = q === '' ? base.slice() : base.filter(it => this.matchesQuery(it, q))
  }

  /**
   * Input event on the filter field: re-filter, re-render the list, move the
   * active option to the first match, then fire `onFilterQueryChange` when
   * the text actually changed. IME composition is guarded - we wait for
   * `compositionend` and filter once with the composed text. The Esc-clear
   * path comes through here too, so it fires the event as well.
   */
  private handleSearchInputEvent(): void {
    if (this.composing) { return }
    const next = this.filterInputEl.value
    const changed = next !== this.query
    this.query = next
    this.recomputeFilteredItems()
    // First ENABLED match, not blindly index 0: disabled items are skipped
    // by keyboard navigation (A11Y.md "Disabled"), and the active option a
    // keystroke lands on is keyboard state. Set before the render, so the
    // one sync inside it reports the landing once, with no transient
    // "no item" between the rebuild and the landing.
    this.focusedRow = null
    this.focusedIndex = this.findNextEnabledIndex(0, 1, this.getVisibleItems())
    this.renderPopupList()
    // The render reports the active item; a listener that closed the widget
    // reset the query, so no change of this keystroke is left to report: the
    // popup is closed, or the reset text differs from the typed one. A
    // rebuild or a value change under it keeps the query, which the app must
    // still hear.
    if (!this.opened || this.query !== next) { return }
    if (changed) {
      const onFilterQueryChange = this.settings.onFilterQueryChange
      onFilterQueryChange?.(next)
    }
  }

  /** Outer popup wrapper. No ARIA role; structural only. */
  private createPopupEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupClass
    return el
  }

  /**
   * Build the no-results message element. `role="status"` announces its
   * appearance politely; it lives OUTSIDE the listbox (options-only children)
   * and its text comes from `uiTranslationPack.popupListNoResults`.
   */
  private createPopupListNoResultsEl(): HTMLElement {
    const el = document.createElement('div')
    el.className = this.classIdMap.popupListNoResultsClass
    el.setAttribute('role', 'status')
    el.hidden = true
    return el
  }

  /**
   * The no-results message's visible content (rich empty-state).
   * - Default reads `createPopupListNoResultsContentElFn`; `null` (setting
   *   unset, or returned) = plain text from `uiTranslationPack.popupListNoResults`.
   * - Override only when extending; for one-off content pass the setting.
   * @group Subclassing: rendering
   */
  protected createPopupListNoResultsContentEl(query: string): HTMLElement | null {
    const fn = this.settings.createPopupListNoResultsContentElFn
    return fn ? fn(query) : null
  }

  /**
   * Build the pinned header container between the filter input and the listbox.
   * - The library calls it once, inside the constructor. You never call it.
   * - It takes no params. The default asks {@link createPopupHeaderContentEl}
   *   for content; `null` content = no container, and `popupHeaderEl` stays `null`.
   * - To supply content without subclassing, pass `createPopupHeaderContentElFn`.
   * - To change the container itself, override it: call
   *   `super.createPopupHeaderEl()` and edit the returned element, or return
   *   your own `div`. Returning non-null builds the slot even without the
   *   setting. Keep it role-free: it is not part of the listbox.
   * - Internals: the base builds a `div` with `classIdMap.popupHeaderClass`
   *   and inline `flex: none` (the popup is a flex column and only the listbox
   *   may flex), then appends the content.
   * @group Subclassing: rendering
   */
  protected createPopupHeaderEl(): HTMLElement | null {
    return this.createPopupSlotEl(this.classIdMap.popupHeaderClass, this.createPopupHeaderContentEl())
  }

  /**
   * The pinned header's content element.
   * - The library calls it once, from {@link createPopupHeaderEl}, inside the
   *   constructor. You never call it.
   * - Default calls `createPopupHeaderContentElFn` with a
   *   {@link LLSelectConstructionContext}; `null` (setting unset, or
   *   returned) = no header at all.
   * - Override only when extending; for one-off content pass the setting.
   * @group Subclassing: rendering
   */
  protected createPopupHeaderContentEl(): HTMLElement | null {
    const fn = this.settings.createPopupHeaderContentElFn
    return fn ? fn(this.createConstructionContext()) : null
  }

  /**
   * Build the pinned footer container at the bottom of the popup.
   * - The library calls it once, inside the constructor. You never call it.
   * - It takes no params. The default asks {@link createPopupFooterContentEl}
   *   for content; `null` content = no container, and `popupFooterEl` stays `null`.
   * - To supply content without subclassing, pass `createPopupFooterContentElFn`.
   * - To change the container itself, override it: call
   *   `super.createPopupFooterEl()` and edit the returned element, or return
   *   your own `div`. Returning non-null builds the slot even without the
   *   setting. Keep it role-free: it is not part of the listbox.
   * - Internals: the base builds a `div` with `classIdMap.popupFooterClass`
   *   and inline `flex: none` (only the listbox may flex), then appends the
   *   content.
   * @group Subclassing: rendering
   */
  protected createPopupFooterEl(): HTMLElement | null {
    return this.createPopupSlotEl(this.classIdMap.popupFooterClass, this.createPopupFooterContentEl())
  }

  /**
   * The pinned footer's content element.
   * - The library calls it once, from {@link createPopupFooterEl}, inside the
   *   constructor. You never call it.
   * - Default calls `createPopupFooterContentElFn` with a
   *   {@link LLSelectConstructionContext}; `null` (setting unset, or
   *   returned) = no footer at all.
   * - Override only when extending; for one-off content pass the setting.
   * @group Subclassing: rendering
   */
  protected createPopupFooterContentEl(): HTMLElement | null {
    const fn = this.settings.createPopupFooterContentElFn
    return fn ? fn(this.createConstructionContext()) : null
  }

  /** The read-only view a construction-time settings function receives. */
  private createConstructionContext(): LLSelectConstructionContext {
    return { classIdMap: this.classIdMap, uiTranslationPack: this.settings.uiTranslationPack }
  }

  /**
   * Scroll a ring entry into view. A row inside a pinned wrapper is always in
   * view, so it is left alone. Every other entry, an item inside a group
   * container included, scrolls under the pinned blocks, so their measured
   * heights are handed to the scroll math as insets.
   */
  private scrollRingEntryIntoView(el: HTMLElement): void {
    const leading = this.popupListPinnedLeadingRowsEl
    const trailing = this.popupListPinnedTrailingRowsEl
    if ((leading !== null && leading.contains(el)) || (trailing !== null && trailing.contains(el))) { return }
    ensureVisibleInScroll(el, this.popupListEl, this.pinnedWrapperHeight(leading), this.pinnedWrapperHeight(trailing))
  }

  /** The height a pinned wrapper covers at its listbox edge; 0 when it is not in the listbox. */
  private pinnedWrapperHeight(wrapper: HTMLElement | null): number {
    if (!wrapper || wrapper.parentElement !== this.popupListEl) { return 0 }
    return wrapper.getBoundingClientRect().height
  }

  /**
   * The sticky wrapper of a pinned block: presentational (the accessibility
   * tree sees only the rows inside), stuck to one edge of the listbox by
   * inline style so the setting works without theme support. Themes paint
   * its background and edge line.
   */
  private createPopupListPinnedRowsEl(className: string, edge: 'top' | 'bottom'): HTMLElement {
    const el = document.createElement('div')
    el.className = className
    el.setAttribute('role', 'presentation')
    el.style.position = 'sticky'
    if (edge === 'top') { el.style.top = '0' } else { el.style.bottom = '0' }
    return el
  }

  /** Shared body of the two slot builders: `null` content = no container. */
  private createPopupSlotEl(className: string, content: HTMLElement | null): HTMLElement | null {
    if (content === null) { return null }
    const el = document.createElement('div')
    el.className = className
    // The popup is a flex column; only the listbox may grow or shrink.
    el.style.flex = 'none'
    el.appendChild(content)
    return el
  }

  /**
   * Mirror the visible-list-empty state onto the no-results message element:
   * `hidden` while there is at least one visible item; when shown, fill its
   * content - `createPopupListNoResultsContentEl(query)` first, else the plain
   * text from `uiTranslationPack.popupListNoResults`. Same null-branch shape as
   * `createPopupListItemEl` / `createGroupEl`.
   * - The write is SKIPPED when the resolved text matches what is already shown,
   *   so a still-empty next keystroke does not re-announce (see `lastNoResultsText`).
   */
  private syncPopupListNoResultsToDom(): void {
    const empty = this.getVisibleItems().length === 0
    this.popupListNoResultsEl.hidden = !empty
    if (!empty) {
      this.lastNoResultsText = null
      return
    }
    const content = this.createPopupListNoResultsContentEl(this.query)
    const nextText = content === null
      ? this.settings.uiTranslationPack.popupListNoResults
      : content.textContent ?? ''
    if (nextText === this.lastNoResultsText) { return }
    this.lastNoResultsText = nextText
    if (content === null) {
      this.popupListNoResultsEl.textContent = this.settings.uiTranslationPack.popupListNoResults
    } else {
      this.popupListNoResultsEl.replaceChildren(content)
    }
  }

  /** Inner element with `role="listbox"`. Holds item children. */
  private createPopupListEl(): HTMLElement {
    const el = document.createElement('div')
    el.id = this.classIdMap.popupListId
    el.className = this.classIdMap.popupListClass
    el.setAttribute('role', 'listbox')
    el.setAttribute('tabindex', '-1')
    return el
  }
}
