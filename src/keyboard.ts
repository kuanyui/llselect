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
 * popup is currently open. Returns `undefined` if the key should be left
 * alone (no preventDefault, no library reaction). Maps according to the
 * ARIA APG combobox pattern.
 *
 * @param inTextInput - true when focus is in the editable search input. There,
 *   Space must type a space and Home/End must move the text caret, so those
 *   keys are NOT mapped to selection / first-last navigation. Selection is
 *   Enter only; option navigation is the arrow / page keys.
 */
export function getActionFromKey(
  ev: KeyboardEvent,
  isOpen: boolean,
  inTextInput = false,
): LLSelectAction | undefined {
  const { key, altKey } = ev

  if (!isOpen) {
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
 * Scroll `scrollParent` just enough so `child` is fully visible. No-op if
 * `child` is already in view. Adjusts `scrollTop` directly rather than using
 * `scrollIntoView`, so the page (window) does not scroll alongside.
 *
 * Uses viewport-rect deltas, NOT `offsetTop`: `offsetTop` is relative to the
 * offset parent, which a theme could change by making a group container
 * `position: relative` (optgroup), silently breaking the math. Rect deltas are
 * correct regardless of nesting / theme CSS. `clientTop` / `clientHeight`
 * exclude the parent's border so a bordered list stays exact. Measured to cost
 * the same as the old `offsetTop` path (see docs/DESIGN.md "Optgroup").
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
