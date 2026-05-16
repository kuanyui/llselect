// KeyboardEvent -> action mapping for the combobox.
// Pure logic so it can be tested without a DOM.

export enum LLSelectAction {
  Open,
  Close,
  Select,
  Next,
  Previous,
  GotoFirst,
  GotoLast,
  PageDown,
  PageUp,
}

const PAGE_SIZE = 10

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
