// Positioner: places `floating` (popup) relative to `anchor` (trigger).
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

/**
 * Whether the floating element sits below or above the anchor.
 * @category Positioning
 */
export type Placement = 'below' | 'above'

/**
 * How the floating element decides its width. See `LLSelectBaseSettings`
 * (`popupWidthPolicy` field) for the user-facing contract.
 * @category Positioning
 */
export type WidthPolicy = 'match-trigger' | 'fit-content'

/** Input to the pure positioning calculation. */
export interface PositionInput {
  anchorRect: AnchorRect
  viewportWidth: number
  viewportHeight: number
  /** Measured height of the floating element. Pass 0 if unknown. */
  floatingHeight: number
  /** Width policy. Optional; default `'match-trigger'`. */
  widthPolicy?: WidthPolicy
  /**
   * Floating element's natural (max-content) width in px. Only consulted when
   * `widthPolicy === 'fit-content'`. Default `0`.
   */
  floatingNaturalWidth?: number
  /**
   * Writing direction of the anchor's context. Only consulted when
   * `widthPolicy === 'fit-content'`: `'rtl'` right-aligns the floating element
   * to the anchor and grows LEFTWARD (the mirror of ltr). Default `'ltr'`.
   * `'match-trigger'` is position-identical in both directions.
   */
  direction?: 'ltr' | 'rtl'
  /**
   * Placement currently in effect, for stickiness across repositions of one
   * open cycle. When set and the content still fits on that side, it is kept
   * even if the other side would also fit - so a transient content shrink
   * (e.g. a filter query matching nothing) does not flip the popup back and
   * forth. Omit / `undefined` (first placement) to pick fresh.
   */
  currentPlacement?: Placement | undefined
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
 * Vertical: prefers placing below; flips above when it does not fit below and
 * either fits above or has more room above. When neither side fits, picks the
 * side with more space and clamps `maxHeight` accordingly. A
 * `currentPlacement` that still fits is kept (stickiness) - re-preferring
 * "below" on every content change would make the popup jump sides whenever
 * the list shrinks and regrows.
 *
 * Horizontal: `widthPolicy === 'match-trigger'` (default) returns
 * `width = anchor.width` and `left = anchor.left` (no collision handling -
 * popup is the same width as trigger; direction-independent).
 * `widthPolicy === 'fit-content'` returns
 * `width = max(anchor.width, floatingNaturalWidth)`, clamps to
 * `viewport - 2 * VIEWPORT_PADDING`, and keeps the popup inside the viewport
 * margins. Growth direction follows `direction`: ltr aligns left edges and
 * grows rightward; rtl aligns RIGHT edges and grows leftward (the mirror).
 */
export function computePosition(input: PositionInput): PositionResult {
  const {
    anchorRect,
    viewportWidth,
    viewportHeight,
    floatingHeight,
    widthPolicy = 'match-trigger',
    floatingNaturalWidth = 0,
    direction = 'ltr',
    currentPlacement,
  } = input

  const spaceBelow = viewportHeight - anchorRect.bottom - GAP - VIEWPORT_PADDING
  const spaceAbove = anchorRect.top - GAP - VIEWPORT_PADDING

  const fitsBelow = floatingHeight <= spaceBelow
  const fitsAbove = floatingHeight <= spaceAbove
  const currentStillFits =
    (currentPlacement === 'below' && fitsBelow) ||
    (currentPlacement === 'above' && fitsAbove)

  let placement: Placement
  if (currentStillFits && currentPlacement !== undefined) {
    placement = currentPlacement
  } else if (fitsBelow) {
    placement = 'below'
  } else if (fitsAbove) {
    placement = 'above'
  } else {
    placement = spaceAbove > spaceBelow ? 'above' : 'below'
  }

  let top: number
  let maxHeight: number
  if (placement === 'below') {
    top = anchorRect.bottom + GAP
    maxHeight = Math.max(0, viewportHeight - top - VIEWPORT_PADDING)
  } else {
    maxHeight = Math.max(0, anchorRect.top - GAP - VIEWPORT_PADDING)
    top = anchorRect.top - GAP - Math.min(floatingHeight, maxHeight)
  }

  let width: number
  let left: number
  if (widthPolicy === 'match-trigger') {
    width = anchorRect.width
    left = anchorRect.left
  } else {
    const desiredWidth = Math.max(anchorRect.width, floatingNaturalWidth)
    const maxAvailable = viewportWidth - 2 * VIEWPORT_PADDING
    width = Math.min(desiredWidth, Math.max(0, maxAvailable))
    const rightEdge = viewportWidth - VIEWPORT_PADDING
    if (direction === 'rtl') {
      // Mirror of ltr: right edges aligned, growth goes leftward; push back
      // inside the LEFT margin first, then clamp at the right one.
      left = anchorRect.right - width
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING
      }
      if (left + width > rightEdge) {
        left = rightEdge - width
      }
    } else {
      left = anchorRect.left
      if (left + width > rightEdge) {
        left = rightEdge - width
      }
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING
      }
    }
  }

  return { top, left, width, maxHeight, placement }
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

// Anchor fully outside the LAYOUT viewport (window.innerWidth/Height, not the
// visual viewport - see reposition) or clipped away by a scroll ancestor.
// Strict comparisons so an unsized anchor at (0,0,0,0) - common in jsdom or
// before first layout - reads as "in viewport, no rect yet", not "off-screen".
function isAnchorHiddenForRect(anchor: HTMLElement, rect: DOMRect): boolean {
  const outOfViewport =
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  return outOfViewport || isClippedByAncestor(anchor, rect)
}

/**
 * Whether `anchor` is currently hidden (scrolled out of the layout viewport or
 * clipped by a scrollable ancestor). Exposed so a caller can refuse to open a
 * popup against an off-screen trigger BEFORE building a positioner, rather than
 * opening and then hiding re-entrantly.
 */
export function isAnchorHidden(anchor: HTMLElement): boolean {
  return isAnchorHiddenForRect(anchor, anchor.getBoundingClientRect())
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
   * Called when the anchor becomes invisible (fully outside the layout
   * viewport, or fully clipped by a scrollable ancestor). Typical use: close the
   * floating element so it does not hang in space without a visible trigger.
   */
  onHide?: () => void
  /**
   * Width policy. Default `'match-trigger'` (preserve the pre-existing
   * behaviour of `width = anchor.width`).
   */
  widthPolicy?: WidthPolicy
  /**
   * The floating element's inner scroll container (the popup list). Under an
   * active `maxHeight` clamp the floating element's overflow is absorbed as
   * this element's internal scrolling, so `offsetHeight` alone under-reports
   * the natural height; its `scrollHeight - clientHeight` restores the
   * difference WITHOUT lifting the clamp to re-measure (a lift-and-restore
   * would clamp this element's scrollTop to 0 mid-frame - losing the
   * scrolled-to-chosen position - and caused a visible window-scroll jolt on
   * Firefox). Omit when the floating element has no inner scroller.
   *
   * INVARIANT: this element must have no author-set height cap of its own -
   * the positioner owns the popup's `maxHeight`. The reconstruction adds back
   * ALL of its overflow, so an independent `max-height` on the inner list
   * (theme or consumer CSS) is read as extra natural height and can pick a
   * side as if the popup were taller than it can render. Shipped themes honor
   * this; consumer themes must clamp the popup, not the inner list.
   */
  innerScrollEl?: HTMLElement
}

/**
 * Measure the floating element's max-content (natural) width by briefly
 * setting `width: max-content` and reading `offsetWidth`. Restores the prior
 * inline width before returning. Used only in `'fit-content'` mode.
 */
function measureNaturalWidth(el: HTMLElement): number {
  const prev = el.style.width
  el.style.width = 'max-content'
  const w = el.offsetWidth
  el.style.width = prev
  return w
}

/**
 * Return the currently visible viewport size. On mobile, `window.innerHeight`
 * reports the layout viewport (often larger than the actually-visible area
 * when a URL bar or virtual keyboard takes part of the screen). Using
 * `visualViewport` when present gives the real visible area, so the popup's
 * `maxHeight` clamps to what the user can actually see.
 */
function getVisibleViewport(): { width: number; height: number } {
  const vv = window.visualViewport
  if (vv) { return { width: vv.width, height: vv.height } }
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Attach a positioner that keeps `floating` placed relative to `anchor`.
 *
 * Behavior: sets `floating` to `position: fixed`, listens to window scroll
 * (capture phase, so any ancestor scroll is caught), window resize, and
 * `ResizeObserver` on both elements. On every reposition: if the anchor is
 * outside the layout viewport or clipped by a scrollable ancestor and `onHide` is
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
  const widthPolicy: WidthPolicy = options?.widthPolicy ?? 'match-trigger'
  // Snapshot at attach (= once per open cycle): direction changes are rare
  // and the next open re-reads it. Only fit-content consults it.
  const direction: 'ltr' | 'rtl' =
    window.getComputedStyle(anchor).direction === 'rtl' ? 'rtl' : 'ltr'
  // Placement chosen by the previous reposition, fed back for stickiness.
  // Positioner lifetime = one open cycle, so the next open picks fresh.
  let lastPlacement: Placement | undefined

  // `allowHide`: whether this reposition may invoke `onHide` (auto-close).
  // Only scroll-driven repositions (and the initial placement) close the popup
  // when the anchor leaves view; resize-driven ones never do - see onResize.
  function reposition(allowHide: boolean): void {
    if (!attached) { return }
    const rect = anchor.getBoundingClientRect()
    const { width: viewportWidth, height: viewportHeight } = getVisibleViewport()
    // Visibility test uses the LAYOUT viewport (window.innerWidth/Height), NOT
    // the visual viewport. A virtual keyboard / URL bar shrinks the visual
    // viewport from the bottom without scrolling the anchor away, while
    // getBoundingClientRect reports layout-viewport coords - comparing the two
    // spaces would treat a lower-screen anchor as "scrolled out" and close the
    // popup the instant the keyboard opens. The visual viewport still drives
    // computePosition below (maxHeight clamps to the actually-visible area).
    if (allowHide && isAnchorHiddenForRect(anchor, rect) && options?.onHide) {
      options.onHide()
      return
    }
    const floatingNaturalWidth = widthPolicy === 'fit-content'
      ? measureNaturalWidth(floating)
      : 0
    // Natural (unclamped) height, measured by reads only. offsetHeight under
    // an active maxHeight clamp feeds the clamp back into the fits test -
    // after a flip to the smaller side the popup could then never measure
    // taller than that side and stayed stuck there even when the list grew
    // back (regrown filter results kept a bottom-flipped popup squeezed at
    // the viewport edge). The clamp swallows exactly the inner scroller's
    // overflow, so adding it back reconstructs the natural height; see
    // `PositionerOptions.innerScrollEl` for why the clamp must not be lifted
    // to re-measure instead.
    const inner = options?.innerScrollEl
    const clampedOverflow = inner ? Math.max(0, inner.scrollHeight - inner.clientHeight) : 0
    const floatingHeight = floating.offsetHeight + clampedOverflow
    const result = computePosition({
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      viewportWidth,
      viewportHeight,
      floatingHeight,
      widthPolicy,
      floatingNaturalWidth,
      direction,
      currentPlacement: lastPlacement,
    })
    lastPlacement = result.placement
    floating.style.position = 'fixed'
    floating.style.top = `${result.top}px`
    floating.style.left = `${result.left}px`
    floating.style.width = `${result.width}px`
    floating.style.maxHeight = `${result.maxHeight}px`
    floating.setAttribute('data-placement', result.placement)
  }

  // Scroll = the anchor moving through the viewport: honor onHide so a popup
  // whose trigger scrolled away is dismissed.
  const onScroll = (): void => reposition(true)
  // Resize-class events (window resize, visualViewport resize from a virtual
  // keyboard / URL bar, element resize) change available space but do NOT mean
  // the user scrolled the trigger away. Reposition / re-clamp only, never close
  // - otherwise opening the on-screen keyboard would instantly dismiss the popup.
  const onResize = (): void => reposition(false)

  // Capture phase catches scrolls inside any ancestor scrollable container.
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('resize', onResize)
  // Mobile: URL bar showing/hiding and virtual keyboard appearing change the
  // visual viewport without firing window resize. Listen to visualViewport
  // RESIZE only so we re-clamp maxHeight to the actually-visible area. We
  // deliberately do NOT listen to `visualViewport.scroll`: that fires during
  // pinch-pan and during the URL-bar collapse animation. The popup is
  // `position: fixed` (layout-viewport-anchored) so the trigger and the popup
  // pan together and no reposition is needed; listening would just cause the
  // popup to bounce during the URL-bar animation (observed on Firefox Android).
  const vv = window.visualViewport
  vv?.addEventListener('resize', onResize)

  let ro: ResizeObserver | undefined
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => reposition(false))
    ro.observe(anchor)
    ro.observe(floating)
  }

  reposition(true)

  return {
    // Public re-place: never auto-closes. Called after list re-renders (incl.
    // every filter keystroke), where dismissing would be wrong - especially on
    // mobile with the keyboard open. Dismissal is a scroll-only decision.
    reposition: () => reposition(false),
    detach(): void {
      attached = false
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
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
