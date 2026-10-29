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
 * @group Positioning
 */
export type LLSelectPlacement = 'below' | 'above'

/**
 * How the floating element decides its width. See `LLSelectBaseSettings`
 * (`popupWidthPolicy` field) for the user-facing contract.
 * @group Positioning
 */
export type LLSelectWidthPolicy = 'fit-content' | 'match-trigger-wrapper'

/** Input to the pure positioning calculation. */
export interface PositionInput {
  anchorRect: AnchorRect
  viewportWidth: number
  viewportHeight: number
  /**
   * Origin of the VISIBLE viewport in layout-viewport (client) coordinates.
   * `0` except under pinch zoom, where the visual viewport shrinks AND pans
   * (`visualViewport.offsetLeft/offsetTop`); anchor rects stay in client
   * coordinates, so clamping against `[0, viewportWidth]` alone would drag
   * the floating element toward the layout origin. Default `0`.
   */
  viewportLeft?: number
  /** See {@link PositionInput.viewportLeft}. Default `0`. */
  viewportTop?: number
  /** Measured height of the floating element. Pass 0 if unknown. */
  floatingHeight: number
  /** Width policy. Optional; default `'fit-content'`. */
  widthPolicy?: LLSelectWidthPolicy
  /**
   * Floating element's natural (max-content) width in px. Only consulted when
   * `widthPolicy === 'fit-content'`. Default `0`.
   */
  floatingNaturalWidth?: number
  /**
   * Writing direction of the anchor's context. Only consulted when
   * `widthPolicy === 'fit-content'`: `'rtl'` right-aligns the floating element
   * to the anchor and grows LEFTWARD (the mirror of ltr). Default `'ltr'`.
   * `'match-trigger-wrapper'` is position-identical in both directions.
   */
  direction?: 'ltr' | 'rtl'
  /**
   * Placement currently in effect, for stickiness across repositions of one
   * open cycle. When set and the content still fits on that side, it is kept
   * even if the other side would also fit - so a transient content shrink
   * (e.g. a filter query matching nothing) does not flip the popup back and
   * forth. Omit / `undefined` (first placement) to pick fresh.
   */
  currentPlacement?: LLSelectPlacement | undefined
}

/** Result of {@link computePosition}: coordinates and chosen placement. */
export interface PositionResult {
  top: number
  left: number
  width: number
  /** Maximum height the floating element may occupy. */
  maxHeight: number
  placement: LLSelectPlacement
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
 * Horizontal: `widthPolicy === 'fit-content'` (default) returns
 * `width = max(anchor.width, floatingNaturalWidth)`, clamps to
 * `viewport - 2 * VIEWPORT_PADDING`, and keeps the popup inside the viewport
 * margins. Growth direction follows `direction`: ltr aligns left edges and
 * grows rightward; rtl aligns RIGHT edges and grows leftward (the mirror).
 *
 * The "viewport" here is the VISIBLE window in client coordinates:
 * `[viewportLeft, viewportLeft + viewportWidth]` x
 * `[viewportTop, viewportTop + viewportHeight]`. The offsets are 0 except
 * under pinch zoom (see {@link PositionInput.viewportLeft}).
 * `widthPolicy === 'match-trigger-wrapper'` returns `width = anchor.width` and
 * `left = anchor.left` (no collision handling - popup is the same width as
 * trigger; direction-independent).
 */
export function computePosition(input: PositionInput): PositionResult {
  const {
    anchorRect,
    viewportWidth,
    viewportHeight,
    viewportLeft = 0,
    viewportTop = 0,
    floatingHeight,
    widthPolicy = 'fit-content',
    floatingNaturalWidth = 0,
    direction = 'ltr',
    currentPlacement,
  } = input

  const viewportBottom = viewportTop + viewportHeight
  const spaceBelow = viewportBottom - anchorRect.bottom - GAP - VIEWPORT_PADDING
  const spaceAbove = anchorRect.top - viewportTop - GAP - VIEWPORT_PADDING

  const fitsBelow = floatingHeight <= spaceBelow
  const fitsAbove = floatingHeight <= spaceAbove
  const currentStillFits =
    (currentPlacement === 'below' && fitsBelow) ||
    (currentPlacement === 'above' && fitsAbove)

  let placement: LLSelectPlacement
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
    maxHeight = Math.max(0, viewportBottom - top - VIEWPORT_PADDING)
  } else {
    maxHeight = Math.max(0, anchorRect.top - viewportTop - GAP - VIEWPORT_PADDING)
    top = anchorRect.top - GAP - Math.min(floatingHeight, maxHeight)
  }

  let width: number
  let left: number
  if (widthPolicy === 'match-trigger-wrapper') {
    width = anchorRect.width
    left = anchorRect.left
  } else {
    const desiredWidth = Math.max(anchorRect.width, floatingNaturalWidth)
    const maxAvailable = viewportWidth - 2 * VIEWPORT_PADDING
    width = Math.min(desiredWidth, Math.max(0, maxAvailable))
    const leftEdge = viewportLeft + VIEWPORT_PADDING
    const rightEdge = viewportLeft + viewportWidth - VIEWPORT_PADDING
    if (direction === 'rtl') {
      // Mirror of ltr: right edges aligned, growth goes leftward; push back
      // inside the LEFT margin first, then clamp at the right one.
      left = anchorRect.right - width
      if (left < leftEdge) {
        left = leftEdge
      }
      if (left + width > rightEdge) {
        left = rightEdge - width
      }
    } else {
      left = anchorRect.left
      if (left + width > rightEdge) {
        left = rightEdge - width
      }
      if (left < leftEdge) {
        left = leftEdge
      }
    }
  }

  return { top, left, width, maxHeight, placement }
}

// The hidden-trigger check (DESIGN.md "Hidden-trigger check"): is the anchor
// fully outside an ancestor's overflow clip that applies to it? The rect alone
// misses this, since getBoundingClientRect reports viewport coordinates
// whatever the ancestors clip.
const CLIPPING_OVERFLOW = new Set(['hidden', 'auto', 'scroll', 'clip'])

// Which ancestors can hold the containing block of the box the walk follows:
// any ancestor for an in-flow box, a positioned ancestor or a containing-block
// creator for an absolute box, a creator only for a fixed box.
type ContainingBlockScheme = 'flow' | 'absolute' | 'fixed'

function containingBlockScheme(position: string): ContainingBlockScheme {
  if (position === 'fixed') { return 'fixed' }
  if (position === 'absolute') { return 'absolute' }
  return 'flow'
}

// A property the browser does not support reads as ''.
function isSet(value: string): boolean {
  return value !== '' && value !== 'none'
}

// jsdom reads a property that no rule sets as '', where a browser reports the
// initial value.
function orDefault(value: string, initial: string): string {
  return value === '' ? initial : value
}

/**
 * Package-internal (tests): whether the element has containment of any kind,
 * from `contain` or from what `content-visibility` and `container-type` apply.
 */
export function hasContainment(s: CSSStyleDeclaration): boolean {
  const visibility = s.getPropertyValue('content-visibility')
  return isSet(s.getPropertyValue('contain')) || visibility === 'auto' || visibility === 'hidden' ||
    /\b(size|inline-size)\b/.test(s.getPropertyValue('container-type'))
}

/**
 * Package-internal (tests): whether an element with this computed style is
 * the containing block of its fixed-position descendants, and so of its
 * absolute ones as well. The list is the one DESIGN.md "Hidden-trigger check"
 * keeps.
 */
export function createsContainingBlock(s: CSSStyleDeclaration): boolean {
  for (const name of ['transform', 'translate', 'rotate', 'scale', 'perspective', 'filter', 'backdrop-filter']) {
    if (isSet(s.getPropertyValue(name))) { return true }
  }
  const visibility = s.getPropertyValue('content-visibility')
  return /\b(layout|paint|strict|content)\b/.test(s.getPropertyValue('contain')) ||
    visibility === 'auto' || visibility === 'hidden' ||
    /\b(size|inline-size)\b/.test(s.getPropertyValue('container-type')) ||
    /\b(transform|translate|rotate|scale|perspective|filter)\b/.test(s.getPropertyValue('will-change'))
}

// A browser older than the selector throws, which reads as no match.
function matchesSafely(el: Element, selector: string): boolean {
  try { return el.matches(selector) } catch { return false }
}

// The top layer, which no ancestor clips: a modal dialog, a showing popover or
// the fullscreen element. Where the selectors are missing, the fixed rule of
// the walk still covers a modal dialog, which the UA style makes fixed.
function isInTopLayer(el: Element): boolean {
  if (el.ownerDocument.fullscreenElement === el) { return true }
  if (el.localName === 'dialog' && matchesSafely(el, ':modal')) { return true }
  return el.hasAttribute('popover') && matchesSafely(el, ':popover-open')
}

// The body's overflow applies to the viewport, not to the body's own box,
// while the root's overflow is `visible` in both axes and neither element has
// containment (CSS Overflow 3 "Overflow Viewport Propagation"; CSS
// Containment 2, the `contain` property).
function isBodyOverflowPropagated(doc: Document, bodyStyle: CSSStyleDeclaration): boolean {
  const root = window.getComputedStyle(doc.documentElement)
  return orDefault(root.overflowX, 'visible') === 'visible' && orDefault(root.overflowY, 'visible') === 'visible' &&
    !hasContainment(root) && !hasContainment(bodyStyle)
}

// Each axis is tested only where its own overflow clips: `overflow-x: clip`
// leaves `overflow-y: visible`.
function clipsRect(el: Element, s: CSSStyleDeclaration, rect: DOMRect): boolean {
  const clipsX = CLIPPING_OVERFLOW.has(s.overflowX)
  const clipsY = CLIPPING_OVERFLOW.has(s.overflowY)
  if (!clipsX && !clipsY) { return false }
  const box = el.getBoundingClientRect()
  return (clipsY && (rect.bottom < box.top || rect.top > box.bottom)) ||
    (clipsX && (rect.right < box.left || rect.left > box.right))
}

// Walks up the anchor's containing-block chain: an ancestor's overflow clips
// only the descendants whose containing block lies inside it (CSS 2.1
// "overflow").
function isClippedByAncestor(anchor: HTMLElement, anchorRect: DOMRect): boolean {
  const doc = anchor.ownerDocument
  let scheme = containingBlockScheme(window.getComputedStyle(anchor).position)
  for (let el = anchor.parentElement; el !== null; el = el.parentElement) {
    // The root's overflow clips the viewport, which the caller tests, and
    // never the root's own box.
    if (el === doc.documentElement) { return false }
    const s = window.getComputedStyle(el)
    // No box: it neither clips nor holds a containing block.
    if (s.display === 'contents') { continue }
    const holdsContainingBlock = scheme === 'flow' || createsContainingBlock(s) || (scheme === 'absolute' && orDefault(s.position, 'static') !== 'static')
    if (holdsContainingBlock) {
      const overflowGoesToViewport = el === doc.body && isBodyOverflowPropagated(doc, s)
      if (!overflowGoesToViewport && clipsRect(el, s, anchorRect)) { return true }
      scheme = containingBlockScheme(s.position)
    }
    if (isInTopLayer(el)) { return false }
  }
  return false
}

// Anchor fully outside the LAYOUT viewport (window.innerWidth/Height, not the
// visual viewport - see reposition) or clipped away by an ancestor.
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
 * Whether `anchor` is currently hidden: fully outside the layout viewport, or
 * fully outside an ancestor's overflow clip that applies to it (DESIGN.md
 * "Hidden-trigger check"). Exposed so a caller can refuse to open a popup
 * against an off-screen trigger BEFORE building a positioner, rather than
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
   * viewport, or fully clipped away by an ancestor; see `isAnchorHidden`).
   * Typical use: close the floating element so it does not hang in space
   * without a visible trigger.
   */
  onHide?: () => void
  /**
   * Width policy. Default `'fit-content'`, matching the `popupWidthPolicy`
   * setting default.
   */
  widthPolicy?: LLSelectWidthPolicy
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
 * setting `width: max-content`, then restore the prior inline width. Used only
 * in `'fit-content'` mode.
 * - Reads the computed `width`: the fractional border-box width (the popup is
 *   forced to `box-sizing: border-box` at construction), unaffected by
 *   transforms, rounded up so the box is never short of its content.
 * - The guard against `offsetWidth` catches an engine that reports the
 *   content box, a non-numeric value, or a pixel-snap mismatch: each falls
 *   back to the integer plus one, never short either. Not caught: an engine
 *   that reports an integer computed width, or the content box under less
 *   than half a pixel of border and padding (no shipped theme). `offsetWidth`
 *   alone rounds to the nearest pixel (`docs/llm/popup-width-committee.md`).
 */
function measureNaturalWidth(el: HTMLElement): number {
  const prev = el.style.width
  el.style.width = 'max-content'
  const used = parseFloat(window.getComputedStyle(el).width)
  const offset = el.offsetWidth
  const w = Number.isFinite(used) && Math.round(used) === offset ? Math.ceil(used) : offset + 1
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
function getVisibleViewport(): { left: number; top: number; width: number; height: number } {
  const vv = window.visualViewport
  // The offsets matter under pinch zoom: the visual viewport pans inside the
  // layout viewport, while anchor rects and `position: fixed` stay in layout
  // (client) coordinates. Both are 0 without zoom.
  if (vv) { return { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height } }
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
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
  const widthPolicy: LLSelectWidthPolicy = options?.widthPolicy ?? 'fit-content'
  // Snapshot at attach (= once per open cycle): direction changes are rare
  // and the next open re-reads it. Only fit-content consults it.
  const direction: 'ltr' | 'rtl' =
    window.getComputedStyle(anchor).direction === 'rtl' ? 'rtl' : 'ltr'
  // Placement chosen by the previous reposition, fed back for stickiness.
  // Positioner lifetime = one open cycle, so the next open picks fresh.
  let lastPlacement: LLSelectPlacement | undefined

  // `allowHide`: whether this reposition may invoke `onHide` (auto-close).
  // Only scroll-driven repositions (and the initial placement) close the popup
  // when the anchor leaves view; resize-driven ones never do - see onResize.
  function reposition(allowHide: boolean): void {
    if (!attached) { return }
    const rect = anchor.getBoundingClientRect()
    const { left: viewportLeft, top: viewportTop, width: viewportWidth, height: viewportHeight } = getVisibleViewport()
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
      viewportLeft,
      viewportTop,
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
