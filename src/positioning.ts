// Positioner: places `floating` (listbox) relative to `anchor` (combobox).
// Pure math is split into `computePosition` so it can be tested without layout.

export interface AnchorRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export type Placement = 'below' | 'above'

export interface PositionInput {
  anchorRect: AnchorRect
  viewportWidth: number
  viewportHeight: number
  floatingHeight: number
}

export interface PositionResult {
  top: number
  left: number
  width: number
  maxHeight: number
  placement: Placement
}

const GAP = 4
const VIEWPORT_PADDING = 8

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

export interface Positioner {
  reposition(): void
  detach(): void
}

export function createPositioner(anchor: HTMLElement, floating: HTMLElement): Positioner {
  let attached = true

  function reposition(): void {
    if (!attached) return
    const rect = anchor.getBoundingClientRect()
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
