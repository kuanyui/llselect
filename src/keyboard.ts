// KeyboardEvent -> action mapping for the trigger element.
// Pure logic so it can be tested without a DOM.

/**
 * Logical actions a keyboard interaction can map to. Numeric values are
 * implementation detail; never serialise them.
 */
export enum LLSelectAction {
  /** Open the popup (no item activation). */
  Open,
  /** Close the popup (no item activation). */
  Close,
  /** Activate the currently focused option (select + maybe close). */
  Select,
  /** Move focus to the next option (clamps at last). */
  Next,
  /** Move focus to the previous option (clamps at first). */
  Previous,
  /** Move focus to the first option. */
  GotoFirst,
  /** Move focus to the last option. */
  GotoLast,
  /** Jump focus down by a fixed page size. */
  PageDown,
  /** Jump focus up by a fixed page size. */
  PageUp,
}

const PAGE_SIZE = 10

/**
 * Map a keydown event to a logical {@link LLSelectAction}, given whether the
 * popup is currently open.
 * - Returns `undefined` if the key should be left alone (no preventDefault,
 *   no library reaction).
 * - Maps the action keys of the ARIA APG combobox pattern.
 * - The pattern's printable-character typeahead is not mapped here - it needs
 *   the character, which an action enum cannot carry. The keydown handler
 *   runs {@link findTypeaheadIndex} before this mapping.
 *
 * @param inTextInput - true when focus is in the editable filter input. There,
 *   Space must type a space and Home/End must move the text caret, so those
 *   keys are NOT mapped to selection / first-last navigation. Selection is
 *   Enter only; option navigation is the arrow / page keys.
 */
export function getActionFromKey(
  ev: KeyboardEvent,
  isOpened: boolean,
  inTextInput = false,
): LLSelectAction | undefined {
  const { key, altKey } = ev

  if (!isOpened) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      return LLSelectAction.Open
    }
    return undefined
  }

  if (key === 'Escape') { return LLSelectAction.Close }
  if (key === 'ArrowUp' && altKey) { return LLSelectAction.Close }
  if (key === 'Enter') { return LLSelectAction.Select }
  if (key === ' ' && !inTextInput) { return LLSelectAction.Select }
  if (key === 'ArrowDown') { return LLSelectAction.Next }
  if (key === 'ArrowUp') { return LLSelectAction.Previous }
  if (key === 'Home' && !inTextInput) { return LLSelectAction.GotoFirst }
  if (key === 'End' && !inTextInput) { return LLSelectAction.GotoLast }
  if (key === 'PageDown') { return LLSelectAction.PageDown }
  if (key === 'PageUp') { return LLSelectAction.PageUp }
  return undefined
}

/**
 * Compute a new focused-option index after applying a navigation action.
 * Clamps to `[0, maxIndex]` (no wrap-around). Returns `-1` if there are no
 * options (`maxIndex < 0`). The page size for PageUp/PageDown is a fixed
 * constant.
 *
 * @param currentIndex - current focused index (`-1` for "none")
 * @param maxIndex - largest valid index (`options.length - 1`)
 */
export function getUpdatedIndex(
  currentIndex: number,
  maxIndex: number,
  action: LLSelectAction,
): number {
  if (maxIndex < 0) { return -1 }
  switch (action) {
    case LLSelectAction.GotoFirst: return 0
    case LLSelectAction.GotoLast: return maxIndex
    case LLSelectAction.Next: return Math.min(currentIndex + 1, maxIndex)
    case LLSelectAction.Previous: return Math.max(currentIndex - 1, 0)
    case LLSelectAction.PageDown: return Math.min(currentIndex + PAGE_SIZE, maxIndex)
    case LLSelectAction.PageUp: return Math.max(currentIndex - PAGE_SIZE, 0)
    default: return currentIndex
  }
}

/**
 * Pause (in ms) after which the next typed character starts a new typeahead
 * buffer instead of extending the old one. Native `<select>` implementations
 * use 1 s (Blink / WebKit).
 */
export const TYPEAHEAD_TIMEOUT_MS = 1000

/**
 * Extend the typeahead buffer with a newly typed character.
 * - If `elapsedMs` since the previous character exceeds
 *   {@link TYPEAHEAD_TIMEOUT_MS}, the character starts a fresh buffer.
 */
export function appendTypeaheadChar(buffer: string, char: string, elapsedMs: number): string {
  return elapsedMs > TYPEAHEAD_TIMEOUT_MS ? char : buffer + char
}

/**
 * Resolve where prefix typeahead moves the active option; `-1` = no match.
 * Mirrors native `<select>` typeahead:
 * - An option matches when its text starts with `buffer`, case-insensitive.
 * - A one-character buffer searches from the option AFTER `currentIndex`, so
 *   repeated presses of one initial cycle through the options sharing it.
 * - A buffer of one repeated character (e.g. `"aa"`) behaves exactly like its
 *   single character - it keeps cycling. It is never matched literally (the
 *   W3C APG example tries the literal `"aa"` prefix first; native does not,
 *   and a text really starting `"aa"` is still reached by the cycle).
 * - Any other longer buffer searches from `currentIndex` itself, so extending
 *   the buffer stays on the current option while it still matches.
 * - The search wraps around the whole list - deliberately, unlike the clamped
 *   arrow navigation (see `docs/llm/A11Y.md`): a search means "anywhere", and
 *   cycling needs the wrap.
 * - Indexes where `textAt` returns `undefined` (disabled options) never match.
 * - `currentIndex` `-1` means no option is active; the search starts at 0.
 *
 * The repeated-character test compares CODE POINTS, each lower-cased on its
 * own: a key whose lower-case form expands to two code units (the Turkish
 * dotted capital I) still counts, astral-plane characters compare whole, and
 * a mid-repeat Shift ("aA") still cycles.
 *
 * @param textAt - match text of the option at an index, or `undefined` when
 *   that option must never match.
 */
export function findTypeaheadIndex(
  buffer: string,
  count: number,
  currentIndex: number,
  textAt: (index: number) => string | undefined,
): number {
  if (count <= 0 || buffer === '') { return -1 }
  const chars = [...buffer].map((c) => c.toLowerCase())
  const sameChar = chars.every((c) => c === chars[0])
  const needle = sameChar ? chars[0]! : buffer.toLowerCase()
  const start = sameChar ? currentIndex + 1 : Math.max(currentIndex, 0)
  const from = ((start % count) + count) % count
  for (let i = 0; i < count; i++) {
    const idx = (from + i) % count
    const text = textAt(idx)
    if (text !== undefined && text.toLowerCase().startsWith(needle)) { return idx }
  }
  return -1
}

/**
 * Scroll `scrollParent` just enough so `child` is fully visible. No-op if
 * `child` is already in view. Adjusts `scrollTop` directly rather than using
 * `scrollIntoView`, so the page (window) does not scroll alongside.
 *
 * Uses viewport-rect deltas, NOT `offsetTop`: `offsetTop` is relative to the
 * offset parent, which a theme could change by making a group container
 * `position: relative` (optgroup), silently breaking the math. Rect deltas are
 * correct regardless of nesting / theme CSS. `clientTop` / `clientHeight`
 * exclude the parent's border so a bordered list stays exact. Measured to cost
 * the same as the old `offsetTop` path (see docs/llm/DESIGN.md "Optgroup").
 */
export function ensureVisibleInScroll(child: HTMLElement, scrollParent: HTMLElement): void {
  const c = child.getBoundingClientRect()
  const p = scrollParent.getBoundingClientRect()
  const viewTop = p.top + scrollParent.clientTop
  const viewBottom = viewTop + scrollParent.clientHeight
  if (c.top < viewTop) {
    scrollParent.scrollTop -= viewTop - c.top
  } else if (c.bottom > viewBottom) {
    scrollParent.scrollTop += c.bottom - viewBottom
  }
}
