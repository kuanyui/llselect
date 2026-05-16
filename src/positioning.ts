// Positioner: places `floating` (listbox) relative to `anchor` (trigger).
// Pure math is split into `computePosition` so it can be tested without layout.

/** Minimal rect shape consumed by {@link computePosition}. */
export interface AnchorRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Whether the floating element sits below or above the anchor. */
export type Placement = 'below' | 'above'

/** Input to the pure positioning calculation. */
export interface PositionInput {
  anchorRect: AnchorRect
  viewportWidth: number
  viewportHeight: number
  /** Measured height of the floating element. Pass 0 if unknown. */
  floatingHeight: number
}

/** Result of {@link computePosition}: coordinates and chosen placement. */
export interface PositionResult {
  top: number
  left: number
  width: number
  /** Maximum height the floating element may occupy. */
  maxHeight: number
  placement: Placement
}

const GAP = 4
const VIEWPORT_PADDING = 8

/**
 * Compute where to place the floating element relative to the anchor.
 *
 * Prefers placing below; flips above when the floating element does not fit
 * below and either fits above or has more room above. When neither side
 * fits, picks the side with more space and clamps `maxHeight` accordingly.
 * Width always equals the anchor's width.
 */
export function computePosition(input: PositionInput): PositionResult {
  const { anchorRect, viewportHeight, floatingHeight } = input

  const spaceBelow = viewportHeight - anchorRect.bottom - GAP - VIEWPORT_PADDING
  const spaceAbove = anchorRect.top - GAP - VIEWPORT_PADDING

  const fitsBelow = floatingHeight <= spaceBelow
  const fitsAbove = floatingHeight <= spaceAbove

  let placement: Placement
  if (fitsBelow) placement = 'below'
  else if (fitsAbove) placement = 'above'
  else placement = spaceAbove > spaceBelow ? 'above' : 'below'

  let top: number
  let maxHeight: number
  if (placement === 'below') {
    top = anchorRect.bottom + GAP
    maxHeight = Math.max(0, viewportHeight - top - VIEWPORT_PADDING)
  } else {
    maxHeight = Math.max(0, anchorRect.top - GAP - VIEWPORT_PADDING)
    top = anchorRect.top - GAP - Math.min(floatingHeight, maxHeight)
  }

  return {
    top,
    left: anchorRect.left,
    width: anchorRect.width,
    maxHeight,
    placement,
  }
}

// Walk ancestors and check whether any clipping ancestor (overflow != visible)
// hides the anchor. Catches the "anchor scrolled out of a scroll container"
// case that getBoundingClientRect alone misses, since the rect reports
// viewport coords regardless of ancestor clipping.
const CLIPPING_OVERFLOW = new Set(['hidden', 'auto', 'scroll', 'clip'])

function isClippedByAncestor(anchor: HTMLElement, anchorRect: DOMRect): boolean {
  let p: HTMLElement | null = anchor.parentElement
  while (p) {
    const s = window.getComputedStyle(p)
    if (CLIPPING_OVERFLOW.has(s.overflowX) || CLIPPING_OVERFLOW.has(s.overflowY)) {
      const pRect = p.getBoundingClientRect()
      if (
        anchorRect.bottom < pRect.top ||
        anchorRect.top > pRect.bottom ||
        anchorRect.right < pRect.left ||
        anchorRect.left > pRect.right
      ) {
        return true
      }
    }
    p = p.parentElement
  }
  return false
}

/** Controls the lifecycle of an active positioner. */
export interface Positioner {
  /** Force a re-position now. Normally called automatically. */
  reposition(): void
  /**
   * Stop tracking and clear all inline styles + `data-placement` from the
   * floating element. Idempotent. Call once when the floating element is
   * dismissed.
   */
  detach(): void
}

/** Options passed to {@link createPositioner}. */
export interface PositionerOptions {
  /**
   * Called when the anchor becomes invisible (fully outside the viewport,
   * or fully clipped by a scrollable ancestor). Typical use: close the
   * floating element so it does not hang in space without a visible trigger.
   */
  onHide?: () => void
}

/**
 * Attach a positioner that keeps `floating` placed relative to `anchor`.
 *
 * Behavior: sets `floating` to `position: fixed`, listens to window scroll
 * (capture phase, so any ancestor scroll is caught), window resize, and
 * `ResizeObserver` on both elements. On every reposition: if the anchor is
 * outside the viewport or clipped by a scrollable ancestor and `onHide` is
 * provided, calls `onHide` and skips style updates. Otherwise applies the
 * coordinates from {@link computePosition} and sets `data-placement` on
 * `floating` for CSS hooks.
 *
 * Caller is responsible for calling `detach()` when the floating element is
 * dismissed; otherwise listeners leak.
 */
export function createPositioner(
  anchor: HTMLElement,
  floating: HTMLElement,
  options?: PositionerOptions,
): Positioner {
  let attached = true

  function reposition(): void {
    if (!attached) return
    const rect = anchor.getBoundingClientRect()
    // Strict comparisons so an unsized anchor at (0,0,0,0) - common in jsdom
    // or before layout - is treated as "in viewport, no rect yet" rather than
    // "fully above/left of viewport".
    const outOfViewport =
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    if ((outOfViewport || isClippedByAncestor(anchor, rect)) && options?.onHide) {
      options.onHide()
      return
    }
    const result = computePosition({
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      floatingHeight: floating.offsetHeight,
    })
    floating.style.position = 'fixed'
    floating.style.top = `${result.top}px`
    floating.style.left = `${result.left}px`
    floating.style.width = `${result.width}px`
    floating.style.maxHeight = `${result.maxHeight}px`
    floating.setAttribute('data-placement', result.placement)
  }

  const onScroll = (): void => reposition()
  const onResize = (): void => reposition()

  // Capture phase catches scrolls inside any ancestor scrollable container.
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('resize', onResize)

  let ro: ResizeObserver | undefined
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(reposition)
    ro.observe(anchor)
    ro.observe(floating)
  }

  reposition()

  return {
    reposition,
    detach(): void {
      attached = false
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      floating.style.position = ''
      floating.style.top = ''
      floating.style.left = ''
      floating.style.width = ''
      floating.style.maxHeight = ''
      floating.removeAttribute('data-placement')
    },
  }
}
