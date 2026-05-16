// KeyboardEvent -> action mapping for the trigger element.
// Pure logic so it can be tested without a DOM.

/**
 * Logical actions a keyboard interaction can map to. Numeric values are
 * implementation detail; never serialise them.
 */
export enum LLSelectAction {
  /** Open the listbox (no item activation). */
  Open,
  /** Close the listbox (no item activation). */
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
 * listbox is currently open. Returns `undefined` if the key should be left
 * alone (no preventDefault, no library reaction). Maps according to the
 * ARIA APG combobox pattern.
 */
export function getActionFromKey(ev: KeyboardEvent, isOpen: boolean): LLSelectAction | undefined {
  const { key, altKey } = ev

  if (!isOpen) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      return LLSelectAction.Open
    }
    return undefined
  }

  if (key === 'Escape') return LLSelectAction.Close
  if (key === 'ArrowUp' && altKey) return LLSelectAction.Close
  if (key === 'Enter' || key === ' ') return LLSelectAction.Select
  if (key === 'ArrowDown') return LLSelectAction.Next
  if (key === 'ArrowUp') return LLSelectAction.Previous
  if (key === 'Home') return LLSelectAction.GotoFirst
  if (key === 'End') return LLSelectAction.GotoLast
  if (key === 'PageDown') return LLSelectAction.PageDown
  if (key === 'PageUp') return LLSelectAction.PageUp
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
  if (maxIndex < 0) return -1
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
 */
export function ensureVisibleInScroll(child: HTMLElement, scrollParent: HTMLElement): void {
  const childTop = child.offsetTop
  const childBottom = childTop + child.offsetHeight
  const parentTop = scrollParent.scrollTop
  const parentBottom = parentTop + scrollParent.clientHeight
  if (childTop < parentTop) {
    scrollParent.scrollTop = childTop
  } else if (childBottom > parentBottom) {
    scrollParent.scrollTop = childBottom - scrollParent.clientHeight
  }
}
