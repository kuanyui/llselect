// Positioner: places `floating` (popup) relative to `anchor` (trigger).
// Pure math is split into `computePosition` so it can be tested without layout.

/** Minimal rect shape consumed by {@link computePosition}, in layout-viewport coordinates. */
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
   * Origin of the VISIBLE viewport in layout-viewport coordinates, those of
   * `position: fixed`.
   * - `0` unless the visual viewport is panned inside the layout viewport,
   *   under pinch zoom or while the on-screen keyboard shrinks it
   *   (`visualViewport.offsetLeft/offsetTop`).
   * - The anchor rect is in the same coordinates, so clamping against
   *   `[0, viewportWidth]` alone would drag the floating element toward the
   *   layout origin.
   * - Default `0`.
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
 * - The window here is the visible window, in layout-viewport coordinates,
 *   those of `position: fixed`.
 * - The anchor rect and the result use the same coordinates.
 * - Across, it spans `[viewportLeft, viewportLeft + viewportWidth]`.
 * - Down, it spans `[viewportTop, viewportTop + viewportHeight]`.
 * - Both offsets are 0 unless the visual viewport is panned. See
 *   {@link PositionInput.viewportLeft}.
 * - Vertically, the floating element goes below the anchor if it fits there.
 * - Otherwise it goes above the anchor, if it fits there.
 * - If it fits on neither side, it takes the side with more room.
 * - `maxHeight` limits it to the room on its side.
 * - A `currentPlacement` that still fits is kept.
 * - Keeping it means that a list that shrinks and regrows does not make the
 *   popup jump sides.
 * - The floating element keeps a gap of 4 px from the anchor.
 * - Below the anchor, it keeps a margin of 8 px from the bottom of the window.
 * - Above the anchor, it keeps a margin of 8 px from the top of the window.
 * - It also stays inside the window vertically when the anchor is outside it:
 *   - If the anchor's top lies below the window, the bottom of the window
 *     stands in for that top.
 *   - An anchor under the on-screen keyboard is such a case.
 *   - If the anchor's bottom lies above the window, the top of the window
 *     stands in for that bottom.
 *   - The floating element then no longer touches the anchor.
 * - While the anchor's edge next to the floating element is inside the
 *   window, the placement is exactly the one without the rule above.
 * - If the chosen side has no room at all, `maxHeight` is 0.
 * - If, in addition, the anchor's edge next to the floating element lies
 *   outside the window, `top` is kept inside the window.
 * - Horizontally, `widthPolicy === 'fit-content'`, the default, makes `width`
 *   the larger of the anchor's width and `floatingNaturalWidth`.
 * - That width is at most the window's width minus two side margins of 8 px.
 * - In ltr, the floating element starts at the anchor's left edge.
 * - In ltr, it grows rightward.
 * - In rtl, it starts at the anchor's right edge.
 * - In rtl, it grows leftward.
 * - If it then crosses a side margin, it shifts back inside the margins.
 * - `widthPolicy === 'match-trigger-wrapper'` copies the anchor's `width`.
 * - That policy also copies the anchor's `left`.
 * - That policy ignores `direction`.
 * - That policy has no horizontal clamp.
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
  // A visible edge stands in for an anchor edge beyond it: an anchor under the
  // on-screen keyboard still counts as visible, since the hidden check reads
  // the layout viewport.
  const belowStart = Math.max(anchorRect.bottom, viewportTop) + GAP
  const aboveEnd = Math.min(anchorRect.top, viewportBottom) - GAP
  const spaceBelow = viewportBottom - VIEWPORT_PADDING - belowStart
  const spaceAbove = aboveEnd - viewportTop - VIEWPORT_PADDING

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
    top = belowStart
    maxHeight = Math.max(0, spaceBelow)
  } else {
    maxHeight = Math.max(0, spaceAbove)
    top = aboveEnd - Math.min(floatingHeight, maxHeight)
  }
  // Only a side with no room at all can put `top` outside the visible window.
  // The clamp spares an anchor whose edge next to the popup is visible, which
  // keeps exactly the placement it had before the visible edge stood in.
  const anchorEdge = placement === 'below' ? anchorRect.bottom : anchorRect.top
  if (anchorEdge < viewportTop || anchorEdge > viewportBottom) {
    top = Math.min(Math.max(top, viewportTop), viewportBottom)
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

// WebKit 18.4 does not let `filter` hold fixed-position descendants, while
// WebKit 26.5, Chromium 156 and Firefox 153 do (measured). A probe inside the
// anchor answers, the first time the walk meets a filter: a fixed child of a
// filtered box lands on that box only where the filter holds it. A conclusive
// answer is kept for the page.
let filterHoldsFixed: boolean | undefined

function probeFilterHoldsFixed(anchor: HTMLElement): boolean {
  if (filterHoldsFixed !== undefined) { return filterHoldsFixed }
  const doc = anchor.ownerDocument
  // `all: initial !important` first, so no page rule can change the position
  // or size of either element, whether it sets a margin, a translate or
  // `display: none`. `all` spares only `direction`, `unicode-bidi` and custom
  // properties: the probe uses no `var()`, and the other two do not move a
  // box placed by `left` and `top`. Every later declaration needs
  // `!important`, or the reset wins over it.
  const box = doc.createElement('div')
  box.style.cssText = 'all: initial !important; display: block !important; position: absolute !important; left: 17px !important; top: 13px !important; width: 0 !important; height: 0 !important; visibility: hidden !important; filter: blur(0px) !important'
  const child = doc.createElement('div')
  child.style.cssText = 'all: initial !important; display: block !important; position: fixed !important; left: 0 !important; top: 0 !important; width: 0 !important; height: 0 !important; visibility: hidden !important'
  box.appendChild(child)
  anchor.appendChild(box)
  // A user style marked `!important` outranks these. The guard catches one
  // that makes the box a creator through another property, where the filter
  // is not what holds the child. One that changes the position or size of
  // either element, such as moving the child, removing the child's layout box
  // with `display: none`, or putting a border on the box, can still decide
  // the answer (DESIGN.md "Hidden-trigger check", its known limits).
  const heldOtherwise = createsContainingBlock(window.getComputedStyle(box), () => false)
  const outer = box.getBoundingClientRect()
  const inner = child.getBoundingClientRect()
  box.remove()
  // The box at the viewport origin decides nothing: it has no layout box (a
  // `display: none` subtree), or a scroll cancels its offset. Answer "does
  // not hold", which can only miss a clip, and probe again next time.
  if (heldOtherwise || (outer.left === 0 && outer.top === 0)) { return false }
  filterHoldsFixed = inner.left === outer.left && inner.top === outer.top
  return filterHoldsFixed
}

/** Package-internal test hook: forget the measured `filter` behavior. */
export function resetFilterProbe(): void {
  filterHoldsFixed = undefined
}

// The `will-change` names that make a containing block, matched whole:
// `transform-origin` names no transform.
const WILL_CHANGE_CONTAINING_BLOCK = new Set(['transform', 'translate', 'rotate', 'scale', 'perspective', 'filter', 'backdrop-filter', 'contain', 'offset-path'])

/**
 * Package-internal (tests): whether an element with this computed style is
 * the containing block of its fixed-position descendants, and so of its
 * absolute ones as well. The list is the one DESIGN.md "Hidden-trigger check"
 * keeps. `filterHoldsFixedFn` answers for `filter`, the one counted property
 * whose answer differs between engines; it runs only when `filter` is set.
 */
export function createsContainingBlock(s: CSSStyleDeclaration, filterHoldsFixedFn: () => boolean): boolean {
  // A non-replaced inline box takes no transform and no containment; measured,
  // `backdrop-filter` and the probed `filter` hold a fixed child there. This
  // can miss a clip in two cases: an inline `<svg>`, which is replaced and
  // takes a transform, and `will-change: filter` or
  // `will-change: backdrop-filter`, which hold there in Chromium and Firefox
  // only.
  if (orDefault(s.display, 'inline') === 'inline') {
    return isSet(s.getPropertyValue('backdrop-filter')) || (isSet(s.getPropertyValue('filter')) && filterHoldsFixedFn())
  }
  for (const name of ['transform', 'translate', 'rotate', 'scale', 'perspective', 'backdrop-filter']) {
    if (isSet(s.getPropertyValue(name))) { return true }
  }
  const visibility = s.getPropertyValue('content-visibility')
  if (s.getPropertyValue('transform-style') === 'preserve-3d' ||
    /\b(layout|paint|strict|content)\b/.test(s.getPropertyValue('contain')) || visibility === 'auto' || visibility === 'hidden' ||
    s.getPropertyValue('will-change').split(',').some((name) => WILL_CHANGE_CONTAINING_BLOCK.has(name.trim()))) {
    return true
  }
  return isSet(s.getPropertyValue('filter')) && filterHoldsFixedFn()
}

// A browser older than the selector throws, which reads as no match.
function matchesSafely(el: Element, selector: string): boolean {
  try { return el.matches(selector) } catch { return false }
}

// The top layer, which no ancestor clips: a modal dialog, a showing popover or
// a fullscreen element. A fullscreen element is the one
// `document.fullscreenElement` names, or, since that property names the
// shadow host of an element fullscreened inside a shadow tree, one that
// matches `:fullscreen` while the property is set. Where the selectors are
// missing, the fixed rule of the walk still covers a modal dialog, which the
// UA style makes fixed.
function isInTopLayer(el: Element): boolean {
  const fullscreen = el.ownerDocument.fullscreenElement
  if (fullscreen !== null && fullscreen !== undefined && (fullscreen === el || matchesSafely(el, ':fullscreen'))) { return true }
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

// Overflow applies to block, flex and grid containers, never to an inline box
// or a table track (measured: an `overflow: hidden` span or table row clips
// nothing).
const NO_OVERFLOW_DISPLAY = new Set(['inline', 'table-row', 'table-row-group', 'table-header-group', 'table-footer-group', 'table-column', 'table-column-group'])

// Each axis is tested only where its own overflow clips: `overflow-x: clip`
// leaves `overflow-y: visible`.
function clipsRect(el: Element, s: CSSStyleDeclaration, rect: DOMRect): boolean {
  if (NO_OVERFLOW_DISPLAY.has(orDefault(s.display, 'inline'))) { return false }
  const clipsX = CLIPPING_OVERFLOW.has(s.overflowX)
  const clipsY = CLIPPING_OVERFLOW.has(s.overflowY)
  if (!clipsX && !clipsY) { return false }
  const box = el.getBoundingClientRect()
  return (clipsY && (rect.bottom < box.top || rect.top > box.bottom)) ||
    (clipsX && (rect.right < box.left || rect.left > box.right))
}

// By shape, so a shadow root from another realm counts too.
function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === 11 && 'host' in node
}

// The parent in the flat tree, the tree CSS lays out: the slot the element is
// assigned to, else its parent element, else the host of its shadow root. A
// slot inside a closed shadow root is not exposed, so a light-DOM child of
// that host falls back to its light-DOM parent.
function flatTreeParent(el: Element): Element | null {
  if (el.assignedSlot !== null) { return el.assignedSlot }
  if (el.parentElement !== null) { return el.parentElement }
  const parent = el.parentNode
  return parent !== null && isShadowRoot(parent) ? parent.host : null
}

// Walks up the anchor's containing-block chain in the flat tree: an
// ancestor's overflow clips only the descendants whose containing block lies
// inside it (CSS 2.1 "overflow").
function isClippedByAncestor(anchor: HTMLElement, anchorRect: DOMRect): boolean {
  const doc = anchor.ownerDocument
  let scheme = containingBlockScheme(window.getComputedStyle(anchor).position)
  for (let el = flatTreeParent(anchor); el !== null; el = flatTreeParent(el)) {
    // The root's overflow clips the viewport, which the caller tests, and
    // never the root's own box.
    if (el === doc.documentElement) { return false }
    const s = window.getComputedStyle(el)
    // No box: it neither clips nor holds a containing block.
    if (s.display === 'contents') { continue }
    const holdsContainingBlock = scheme === 'flow' || createsContainingBlock(s, () => probeFilterHoldsFixed(anchor)) ||
      (scheme === 'absolute' && orDefault(s.position, 'static') !== 'static')
    if (holdsContainingBlock) {
      const overflowGoesToViewport = el === doc.body && isBodyOverflowPropagated(doc, s)
      if (!overflowGoesToViewport && clipsRect(el, s, anchorRect)) { return true }
      scheme = containingBlockScheme(s.position)
    }
    if (isInTopLayer(el)) { return false }
  }
  return false
}

// The shadow roots that the anchor's flat-tree path passes through. The set is
// read once per open cycle; a slot assignment that changes while the popup is
// open is not followed.
function shadowRootsOnPath(anchor: Element): ShadowRoot[] {
  const roots: ShadowRoot[] = []
  for (let el: Element | null = anchor; el !== null; el = flatTreeParent(el)) {
    const root = el.getRootNode()
    if (isShadowRoot(root) && !roots.includes(root)) { roots.push(root) }
  }
  return roots
}

// The size of the layout viewport: the client box of the element that CSSOM
// View makes report it, `<html>`, or `<body>` in quirks mode. A pinch zoom
// leaves it alone, while WebKit shrinks innerWidth/Height to the visual
// viewport (HIGH-943). An element without layout, as in jsdom, reports 0, so
// the window's inner size stands in.
function getLayoutViewportSize(): { width: number; height: number } {
  const el = document.compatMode === 'BackCompat' && document.body !== null ? document.body : document.documentElement
  return { width: el.clientWidth || window.innerWidth, height: el.clientHeight || window.innerHeight }
}

// Anchor fully outside the LAYOUT viewport (not the visual viewport - see
// reposition) or clipped away by an ancestor. `origin` is the layout
// viewport's corner in client coordinates, from getLayoutViewportClientOrigin;
// the ancestors' clips compare client rects.
// Strict comparisons so an unsized anchor at (0,0,0,0) - common in jsdom or
// before first layout - reads as "in viewport, no rect yet", not "off-screen".
function isAnchorHiddenForRect(anchor: HTMLElement, rect: DOMRect, origin: ClientPoint): boolean {
  const layout = getLayoutViewportSize()
  const outOfViewport =
    rect.bottom - origin.y < 0 ||
    rect.top - origin.y > layout.height ||
    rect.right - origin.x < 0 ||
    rect.left - origin.x > layout.width
  return outOfViewport || isClippedByAncestor(anchor, rect)
}

/**
 * Whether `anchor` is currently hidden: fully outside the layout viewport, or
 * fully outside an ancestor's overflow clip that applies to it (DESIGN.md
 * "Hidden-trigger check").
 * - Exposed so a caller can refuse to open a popup against an off-screen
 *   trigger BEFORE building a positioner, rather than opening and then
 *   hiding re-entrantly.
 * - The layout viewport here is the client box of `<html>`, or of `<body>`
 *   in quirks mode, which leaves out the scrollbars.
 */
export function isAnchorHidden(anchor: HTMLElement): boolean {
  return isAnchorHiddenForRect(anchor, anchor.getBoundingClientRect(), getLayoutViewportClientOrigin())
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
   * Called when the anchor is found hidden: fully outside the layout
   * viewport, or fully clipped away by an ancestor (see `isAnchorHidden`).
   * - The layout viewport here is the client box of `<html>`, or of `<body>`
   *   in quirks mode, which leaves out the scrollbars.
   * - The check runs at the first placement and after every `scroll` event
   *   outside the floating element that the capture listeners see: of the
   *   document, of any element in it, or inside a shadow root on the
   *   anchor's path.
   * - A resize, a pan of the visual viewport and the public `reposition()`
   *   never run it.
   * - Typical use: close the floating element so it does not hang in space
   *   without a visible trigger.
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
 * Return the origin and the size of the currently visible viewport.
 * - The layout viewport is often larger than the visible area while a URL
 *   bar or the on-screen keyboard takes part of the screen, or while the
 *   page is pinch-zoomed.
 * - `visualViewport`, when present, gives the visible area, so the popup's
 *   `maxHeight` clamps to what the user can actually see.
 */
function getVisibleViewport(): { left: number; top: number; width: number; height: number } {
  const vv = window.visualViewport
  // The offsets matter whenever the visual viewport pans inside the layout
  // viewport, under pinch zoom or while the on-screen keyboard shrinks it.
  // The result is in layout-viewport coordinates, those of `position: fixed`;
  // reposition brings the anchor rect into them. Both offsets are 0 otherwise.
  if (vv) { return { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height } }
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
}

/** A point in client coordinates, those of `getBoundingClientRect`. */
interface ClientPoint {
  readonly x: number
  readonly y: number
}

/**
 * Return where the layout viewport's top-left corner sits in client
 * coordinates, the coordinates that `getBoundingClientRect` reports.
 * - `position: fixed` places an element against the layout viewport, so the
 *   positioner subtracts this point from the anchor rect before it places
 *   the popup.
 * - In Chromium and Firefox, client coordinates start at the layout viewport,
 *   so the point is (0, 0).
 * - In WebKit, client coordinates start at the visual viewport, the area the
 *   user sees. While the page is pinch-zoomed, the point is then
 *   (-visualViewport.offsetLeft, -visualViewport.offsetTop) (HIGH-942).
 * - The point is measured, not picked by engine.
 * - The layout viewport's corner in document coordinates is
 *   `pageLeft - offsetLeft` and `pageTop - offsetTop`.
 * - The client origin in document coordinates is `window.scrollX` and
 *   `scrollY`: each engine reports its scroll position from the corner that
 *   its client rects start at (MEDIUM-955).
 * - No element takes part, so a margin, a position or a transform on
 *   `<html>` changes nothing.
 * - WebKit returns `scrollX` and `scrollY` as whole numbers, so the point
 *   can be off by less than one pixel there.
 * - One known exception: WebKit's site-specific quirk
 *   `ShouldUseLayoutViewportForClientRectsQuirk` starts client rects at the
 *   layout viewport while `scrollX` stays at the visual viewport. It applies
 *   on the iOS family only, to `*.chatgpt.com` and `*.discord.com`, where
 *   the point comes out wrong (MEDIUM-959).
 */
function getLayoutViewportClientOrigin(): ClientPoint {
  const vv = window.visualViewport
  // Without an offset, both viewports share their corner in every engine.
  if (!vv || (!vv.offsetLeft && !vv.offsetTop)) { return { x: 0, y: 0 } }
  return {
    x: vv.pageLeft - vv.offsetLeft - window.scrollX,
    y: vv.pageTop - vv.offsetTop - window.scrollY,
  }
}

/**
 * Attach a positioner that keeps `floating` placed relative to `anchor`.
 *
 * - Sets `floating` to `position: fixed`.
 * - Listens for `scroll` in the capture phase, on `window` and on every
 *   shadow root of the anchor's flat-tree path. The shadow roots are read
 *   once, at attach.
 * - Listens for `resize` on `window` and on `visualViewport`, for `scroll`
 *   on `visualViewport`, and watches both elements with a `ResizeObserver`.
 * - Ignores a scroll inside `floating`, which cannot move the anchor.
 * - At the first placement and after every `scroll` event outside
 *   `floating` that the capture listeners see, checks whether the anchor is
 *   hidden (`isAnchorHidden`). If it is and `onHide` is provided, calls
 *   `onHide` and skips the style updates.
 * - Otherwise, and on every resize and every pan of the visual viewport,
 *   applies the coordinates from {@link computePosition} and sets
 *   `data-placement` on `floating` for CSS hooks.
 * - A pan of the visual viewport never runs the hidden check.
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
  // Only repositions driven by a document or element scroll (and the initial
  // placement) close the popup when the anchor leaves view; those driven by a
  // resize or a pan of the visual viewport never do - see onResize.
  function reposition(allowHide: boolean): void {
    if (!attached) { return }
    const clientRect = anchor.getBoundingClientRect()
    // The anchor rect in layout-viewport coordinates, those of `position: fixed`.
    const origin = getLayoutViewportClientOrigin()
    const rect = {
      top: clientRect.top - origin.y,
      left: clientRect.left - origin.x,
      right: clientRect.right - origin.x,
      bottom: clientRect.bottom - origin.y,
      width: clientRect.width,
      height: clientRect.height,
    }
    const { left: viewportLeft, top: viewportTop, width: viewportWidth, height: viewportHeight } = getVisibleViewport()
    // Visibility test uses the LAYOUT viewport (see getLayoutViewportSize), NOT
    // the visual viewport. A virtual keyboard / URL bar shrinks the visual
    // viewport from the bottom without scrolling the anchor away - comparing
    // the anchor with the visual viewport would treat a lower-screen anchor as
    // "scrolled out" and close the popup the instant the keyboard opens. The
    // visual viewport still drives computePosition below (maxHeight clamps to
    // the actually-visible area).
    if (allowHide && isAnchorHiddenForRect(anchor, clientRect, origin) && options?.onHide) {
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
      anchorRect: rect,
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

  // A scroll outside the floating element may move the anchor, so it honors
  // onHide: a popup whose trigger scrolled away is dismissed. A scroll inside
  // the floating element (its list, a scroller in a slot) cannot move the
  // anchor, so it needs neither a reposition nor the hidden check.
  const onScroll = (ev: Event): void => {
    if (ev.target instanceof Node && floating.contains(ev.target)) { return }
    reposition(true)
  }
  // A resize of the window, of the visual viewport or of an element, and a pan
  // of the visual viewport, re-place the popup without the hidden check: none
  // of them means that the user scrolled the trigger away. Closing here would
  // dismiss the popup the instant the on-screen keyboard opens.
  const onResize = (): void => reposition(false)

  // Capture phase catches scrolls inside any ancestor scrollable container. A
  // scroll event never leaves its shadow root, so every shadow root on the
  // anchor's flat-tree path listens too.
  const scrollTargets: EventTarget[] = [window, ...shadowRootsOnPath(anchor)]
  for (const target of scrollTargets) {
    target.addEventListener('scroll', onScroll, { passive: true, capture: true })
  }
  window.addEventListener('resize', onResize)
  // Mobile: the URL bar and the on-screen keyboard resize the visual viewport
  // without a window resize, and a swipe can then pan the visual viewport
  // without a document scroll. Both move the visible edges that clamp
  // maxHeight and pick the side, so both re-place the popup, never closing it.
  // Skipping the pan left the clamp stale while the keyboard was up
  // (MEDIUM-902); listening to it was once seen to bounce the popup during the
  // URL-bar animation on Firefox Android, which the device pass rechecks.
  const vv = window.visualViewport
  vv?.addEventListener('resize', onResize)
  vv?.addEventListener('scroll', onResize)

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
    // mobile with the keyboard open. Only the first placement and document
    // and element scrolls may dismiss.
    reposition: () => reposition(false),
    detach(): void {
      attached = false
      for (const target of scrollTargets) {
        target.removeEventListener('scroll', onScroll, true)
      }
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', onResize)
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
