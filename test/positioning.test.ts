import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { assertEveryListenerRemoved, isRemovalOf } from '../test-utils/listeners.js'
import { computePosition, createPositioner, isAnchorHidden, type AnchorRect } from '../src/positioning.js'
import { LLSelectSingle } from '../src/single.js'

const ANCHOR_AT_TOP: AnchorRect = {
  top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30,
}

test('computePosition places below when there is room', () => {
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP,
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
  })
  assert.equal(r.placement, 'below')
  assert.equal(r.top, 130 + 4)
  assert.equal(r.left, 50)
  assert.equal(r.width, 200)
  assert.ok(r.maxHeight > 0)
})

test('computePosition flips up when no room below but room above', () => {
  const anchor: AnchorRect = {
    top: 600, left: 50, right: 250, bottom: 630, width: 200, height: 30,
  }
  const r = computePosition({
    anchorRect: anchor,
    viewportWidth: 1024,
    viewportHeight: 700,
    floatingHeight: 400,
  })
  assert.equal(r.placement, 'above')
  // top = anchorTop - GAP - min(floatingHeight, maxHeightAbove)
  // maxHeightAbove = 600 - 4 - 8 = 588
  // top = 600 - 4 - 400 = 196
  assert.equal(r.top, 196)
})

test('computePosition picks larger space when neither side fits', () => {
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP,
    viewportWidth: 1024,
    viewportHeight: 200,
    floatingHeight: 500,
  })
  // belowSpace = 200 - 130 - 4 - 8 = 58
  // aboveSpace = 100 - 4 - 8 = 88
  assert.equal(r.placement, 'above')
  assert.equal(r.maxHeight, 88)
})

test('computePosition stays below when above has less space', () => {
  const anchor: AnchorRect = {
    top: 20, left: 50, right: 250, bottom: 50, width: 200, height: 30,
  }
  const r = computePosition({
    anchorRect: anchor,
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 600,
  })
  assert.equal(r.placement, 'below')
})

test('computePosition defaults to fit-content: natural width honored without an explicit policy', () => {
  const r = computePosition({
    anchorRect: { ...ANCHOR_AT_TOP, width: 350 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    floatingNaturalWidth: 500,
  })
  assert.equal(r.width, 500)
})

test('computePosition maxHeight is non-negative even in tiny viewport', () => {
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP,
    viewportWidth: 1024,
    viewportHeight: 50,
    floatingHeight: 200,
  })
  assert.ok(r.maxHeight >= 0)
})

// --- widthPolicy: 'fit-content' ------------------------------------

test('fit-content: width = max(anchor, natural) when it fits within the viewport', () => {
  const r = computePosition({
    anchorRect: { ...ANCHOR_AT_TOP, width: 200, left: 50, right: 250 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 500,
  })
  assert.equal(r.width, 500)
  // popup fits to the right (left=50 + width=500 = 550, well under viewport)
  assert.equal(r.left, 50)
})

test('fit-content: never shrinks below anchor width even if natural width is smaller', () => {
  const r = computePosition({
    anchorRect: { ...ANCHOR_AT_TOP, width: 300, left: 50, right: 350 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 120,
  })
  assert.equal(r.width, 300)
})

test('fit-content: shifts left when popup would overflow the viewport right edge', () => {
  // anchor near right edge: left=800, viewport=1024.
  // natural=300 -> popup wants 800..1100, overflow by 84 (>1024-8).
  // shift so right edge sits at 1024 - 8 = 1016 -> left = 716.
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 800, right: 900, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 300,
  })
  assert.equal(r.width, 300)
  assert.equal(r.left, 1024 - 8 - 300)  // 716
  assert.ok(r.left < 800)  // popup.x is now smaller than anchor.left
})

test('fit-content: clamps width to viewport - 2*padding when natural is larger', () => {
  // viewport=400, max allowed = 400 - 16 = 384. natural=2000 -> clamp 384.
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 50, right: 150, width: 100, height: 30 },
    viewportWidth: 400,
    viewportHeight: 600,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 2000,
  })
  assert.equal(r.width, 384)
  // Width fills viewport (minus margins). Left edge is clamped to left margin (8).
  assert.equal(r.left, 8)
})

test('fit-content + rtl: popup right-aligns to the anchor and grows leftward', () => {
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 700, right: 800, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 300,
    direction: 'rtl',
  })
  assert.equal(r.width, 300)
  assert.equal(r.left, 800 - 300) // right edges aligned -> grows leftward
})

test('fit-content + rtl: shifts right when overflowing the LEFT viewport edge', () => {
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 20, right: 120, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 300,
    direction: 'rtl',
  })
  assert.equal(r.width, 300)
  assert.equal(r.left, 8) // pushed back inside the left margin (mirror of ltr's right-edge shift)
})

test('fit-content: omitted direction defaults to ltr (left edges aligned)', () => {
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 700, right: 800, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'fit-content',
    floatingNaturalWidth: 300,
  })
  assert.equal(r.left, 700)
})

test('match-trigger-wrapper (opt-in): width pinned to anchor, no horizontal shift', () => {
  // Anchor near right edge with `match-trigger-wrapper` should NOT shift left;
  // popup stays the same width as the trigger.
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 900, right: 1000, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'match-trigger-wrapper',
    floatingNaturalWidth: 999,  // ignored for match-trigger-wrapper
  })
  assert.equal(r.width, 100)
  assert.equal(r.left, 900)
})

// jsdom has no ResizeObserver; this one records what the positioner does with it.
class RecordingResizeObserver implements ResizeObserver {
  static last: RecordingResizeObserver | undefined
  readonly observed: Element[] = []
  disconnects = 0
  constructor(readonly callback: ResizeObserverCallback) { RecordingResizeObserver.last = this }
  observe(target: Element): void { this.observed.push(target) }
  unobserve(): void {}
  disconnect(): void { this.disconnects++ }
}

function withMockedRect(el: HTMLElement, rect: Partial<AnchorRect>): void {
  const full: AnchorRect = {
    top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect,
  }
  el.getBoundingClientRect = () => ({
    top: full.top, left: full.left, right: full.right, bottom: full.bottom,
    width: full.width, height: full.height, x: full.left, y: full.top,
    toJSON() { return full },
  })
}

// A visual viewport that the tests pan by its offsets. At scroll 0, `pageLeft`
// and `pageTop` equal the offsets.
function pannableViewport(dom: ReturnType<typeof setupDom>, size: { width: number; height: number }): EventTarget & { width: number; height: number; offsetLeft: number; offsetTop: number; readonly pageLeft: number; readonly pageTop: number } {
  const vv = Object.assign(new dom.window.EventTarget(), { ...size, offsetLeft: 0, offsetTop: 0 })
  Object.defineProperties(vv, {
    pageLeft: { get: () => vv.offsetLeft },
    pageTop: { get: () => vv.offsetTop },
  })
  return vv as typeof vv & { readonly pageLeft: number; readonly pageTop: number }
}

// The scroll position that the window reports: in Chromium and Firefox the
// layout viewport's, in WebKit the visual viewport's, the corner that each
// engine's client rects start at.
function setWindowScroll(dom: ReturnType<typeof setupDom>, x: number, y: number): void {
  Object.defineProperty(dom.window, 'scrollX', { configurable: true, value: x })
  Object.defineProperty(dom.window, 'scrollY', { configurable: true, value: y })
}

test('createPositioner sets fixed positioning styles and data-placement', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })

  const p = createPositioner(anchor, floating)
  assert.equal(floating.style.position, 'fixed')
  assert.equal(floating.style.top, '134px')
  assert.equal(floating.style.left, '50px')
  assert.equal(floating.style.width, '200px')
  assert.equal(floating.getAttribute('data-placement'), 'below')
  p.detach()
})

// --- fit-content: the natural width is measured as a fractional border box ---
// The popup is forced to `box-sizing: border-box`, so the computed `width` is
// the border-box width; `offsetWidth` is that width rounded to the nearest
// pixel. jsdom has no layout: both are mocked.

function withNaturalWidth(floating: HTMLElement, computedWidth: string, offsetWidth: number): () => void {
  const original = window.getComputedStyle
  window.getComputedStyle = ((el: Element, pseudo?: string | null) =>
    el === floating ? ({ width: computedWidth } as unknown as CSSStyleDeclaration) : original.call(window, el, pseudo)) as typeof window.getComputedStyle
  Object.defineProperty(floating, 'offsetWidth', { value: offsetWidth, configurable: true })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  return () => { window.getComputedStyle = original }
}

function fitContentWidth(computedWidth: string, offsetWidth: number): string {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 150, bottom: 130, width: 100, height: 30 })
  const restore = withNaturalWidth(floating, computedWidth, offsetWidth)
  const p = createPositioner(anchor, floating)
  const width = floating.style.width
  p.detach()
  restore()
  return width
}

test('fit-content: a fractional natural width is rounded up, not to the nearest pixel', () => {
  // 249.375px of content got 249px from offsetWidth and wrapped (owner report).
  assert.equal(fitContentWidth('249.375px', 249), '250px')
})

test('fit-content: an integral natural width is applied as it is', () => {
  assert.equal(fitContentWidth('250px', 250), '250px')
})

test('fit-content: a computed width that disagrees with offsetWidth falls back to offsetWidth plus one', () => {
  // An engine reporting the content box (the border-box width minus the 2px border), or a pixel-snap mismatch.
  assert.equal(fitContentWidth('247.375px', 249), '250px')
})

test('fit-content: a non-numeric computed width falls back to offsetWidth plus one', () => {
  assert.equal(fitContentWidth('max-content', 249), '250px')
})

test('fit-content: the measuring inline width is restored before the positioner reads the height', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 150, bottom: 130, width: 100, height: 30 })
  const restore = withNaturalWidth(floating, '249.375px', 249)
  // reposition reads offsetHeight right after the measure: the inline width must be back to its prior value by then.
  let widthAtHeightRead: string | null = null
  Object.defineProperty(floating, 'offsetHeight', { configurable: true, get() { widthAtHeightRead = floating.style.width; return 150 } })
  const p = createPositioner(anchor, floating)
  assert.equal(widthAtHeightRead, '')
  assert.equal(floating.style.width, '250px')
  p.detach()
  restore()
})

test('detach clears all inline styles and data-placement', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })

  const p = createPositioner(anchor, floating)
  p.detach()
  assert.equal(floating.style.position, '')
  assert.equal(floating.style.top, '')
  assert.equal(floating.style.left, '')
  assert.equal(floating.style.width, '')
  assert.equal(floating.style.maxHeight, '')
  assert.equal(floating.getAttribute('data-placement'), null)
})

test('LLSelectSingle.open() applies positioner; close() removes it', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  sel.setItems(['a', 'b'])
  withMockedRect(sel.triggerWrapperEl, { top: 0, left: 0, right: 200, bottom: 30, width: 200, height: 30 })

  sel.open()
  assert.equal(sel.popupEl.hidden, false)
  assert.equal(sel.popupEl.style.position, 'fixed')
  assert.ok(sel.popupEl.getAttribute('data-placement'))

  sel.close()
  assert.equal(sel.popupEl.hidden, true)
  assert.equal(sel.popupEl.style.position, '')
  assert.equal(sel.popupEl.getAttribute('data-placement'), null)
})

test('popup is hidden by default after construction', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  assert.equal(sel.popupEl.hidden, true)
})

test('positioner calls onHide when anchor is fully above viewport', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: -100, left: 50, right: 250, bottom: -50, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 1)
  p.detach()
})

test('positioner calls onHide when anchor is fully below viewport', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // jsdom default viewport height is 768; place anchor at top: 800
  withMockedRect(anchor, { top: 800, left: 50, right: 250, bottom: 830, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 1)
  p.detach()
})

test('positioner does NOT call onHide when anchor is in viewport', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)
  p.detach()
})

test('positioner does NOT call onHide when a virtual keyboard shrinks only the visual viewport', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  // Simulate the on-screen keyboard: visual viewport height drops to 400 while
  // the layout viewport (window.innerHeight, jsdom default 768) is unchanged.
  Object.defineProperty(dom.window, 'visualViewport', {
    configurable: true,
    value: { width: 1024, height: 400, addEventListener() {}, removeEventListener() {} },
  })
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // top 500 is inside the 768 layout viewport but below the 400 visual viewport.
  withMockedRect(anchor, { top: 500, left: 50, right: 250, bottom: 530, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  // Anchor still visible -> no close...
  assert.equal(calls, 0)
  // ...but the visual viewport still drives placement: no room below 400, so
  // the popup flips above (proves maxHeight/placement use the visible area).
  assert.equal(floating.getAttribute('data-placement'), 'above')
  p.detach()
})

test('a pan of the visual viewport re-clamps the popup both ways, and never closes it (on-screen keyboard)', (t) => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  // The keyboard leaves a 400 px visual viewport, which a swipe pans inside
  // the 768 px layout viewport without a document scroll.
  const vv = pannableViewport(dom, { width: 1024, height: 400 })
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  const added = t.mock.method(vv, 'addEventListener')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 300, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  const first = parseFloat(floating.style.maxHeight)
  // A pan that keeps the trigger inside the visible area.
  vv.offsetTop = 20
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(parseFloat(floating.style.maxHeight), first + 20)
  vv.offsetTop = 0
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(parseFloat(floating.style.maxHeight), first)
  // A pan that leaves the trigger above the visible area: the popup starts
  // 4 px below the visible top, then follows the trigger again.
  vv.offsetTop = 200
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(floating.style.top, '204px')
  assert.equal(floating.style.maxHeight, '388px')
  vv.offsetTop = 0
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(floating.style.top, '134px')
  assert.equal(parseFloat(floating.style.maxHeight), first)
  // Even with the trigger out of the layout viewport, a pan runs no hidden check.
  withMockedRect(anchor, { top: 900, left: 50, right: 250, bottom: 930, width: 200, height: 30 })
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(calls, 0)
  const panAdd = added.mock.calls.find((call) => call.arguments[0] === 'scroll')
  assert.ok(panAdd)
  const removed = t.mock.method(vv, 'removeEventListener')
  p.detach()
  assert.ok(removed.mock.calls.some((call) => isRemovalOf(panAdd.arguments, call.arguments)))
})

test('with the on-screen keyboard up, a page scroll that moves the trigger under the keyboard keeps the popup above the keyboard', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const vv = pannableViewport(dom, { width: 1024, height: 400 })
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 200, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(floating.getAttribute('data-placement'), 'below')
  // The page scrolls; the trigger now sits under the keyboard, inside the
  // 768 px layout viewport, so it still counts as visible.
  withMockedRect(anchor, { top: 500, left: 50, right: 250, bottom: 530, width: 200, height: 30 })
  dom.window.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(calls, 0)
  assert.equal(floating.getAttribute('data-placement'), 'above')
  const top = parseFloat(floating.style.top)
  const bottom = top + Math.min(200, parseFloat(floating.style.maxHeight))
  assert.equal(bottom, 400 - 4)
  p.detach()
})

test('a pan of the visual viewport moves a popup above the trigger, not only its height', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const vv = pannableViewport(dom, { width: 1024, height: 400 })
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 350, left: 50, right: 250, bottom: 380, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 300, configurable: true })
  const p = createPositioner(anchor, floating)
  assert.equal(floating.getAttribute('data-placement'), 'above')
  assert.equal(floating.style.top, '46px')
  vv.offsetTop = 100
  vv.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(floating.getAttribute('data-placement'), 'above')
  assert.equal(floating.style.top, '108px')
  assert.equal(floating.style.maxHeight, '238px')
  p.detach()
})

// The same pinch-zoomed scene in both engine models: the visual viewport, 512
// by 384 px, sits at (300, 200) in the layout viewport, and the anchor at
// (350, 250) to (450, 280) in layout-viewport coordinates. Chromium reports
// client rects from the layout viewport, WebKit from the visual viewport.
function zoomedScene(model: 'chromium' | 'webkit'): { floating: HTMLElement; detach: () => void } {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const vv = pannableViewport(dom, { width: 512, height: 384 })
  vv.offsetLeft = 300
  vv.offsetTop = 200
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  const shift = model === 'webkit' ? { x: 300, y: 200 } : { x: 0, y: 0 }
  setWindowScroll(dom, shift.x, shift.y)
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 250 - shift.y, left: 350 - shift.x, right: 450 - shift.x, bottom: 280 - shift.y, width: 100, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
  const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper' })
  return { floating, detach: () => { p.detach() } }
}

test('a pinch-zoomed page places the popup under its trigger, whether client rects start at the layout viewport or at the visual viewport', () => {
  for (const model of ['chromium', 'webkit'] as const) {
    const { floating, detach } = zoomedScene(model)
    assert.equal(floating.getAttribute('data-placement'), 'below', model)
    assert.equal(floating.style.top, '284px', model)
    assert.equal(floating.style.left, '350px', model)
    assert.equal(floating.style.maxHeight, `${200 + 384 - 8 - 284}px`, model)
    detach()
  }
})

test('the layout viewport corner comes from the scroll position, so a scrolled page and a margined, positioned or transformed html element change nothing, in both engine models', () => {
  const cases = [
    { scrollX: 0, scrollY: 0 },
    { scrollX: 0, scrollY: 500 },
    // A right-to-left page scrolled to the left.
    { scrollX: -300, scrollY: 500 },
  ]
  for (const model of ['chromium', 'webkit'] as const) {
    for (const c of cases) {
      const label = `${model} ${JSON.stringify(c)}`
      const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
      const vv = Object.assign(new dom.window.EventTarget(), { width: 512, height: 384, offsetLeft: 300, offsetTop: 200, pageLeft: c.scrollX + 300, pageTop: c.scrollY + 200 })
      Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
      // The client origin in document coordinates: the layout viewport's corner
      // in Chromium, the visual viewport's in WebKit.
      const origin = model === 'webkit' ? { x: vv.pageLeft, y: vv.pageTop } : { x: c.scrollX, y: c.scrollY }
      setWindowScroll(dom, origin.x, origin.y)
      // A margined, positioned and transformed `<html>`, which the corner ignores.
      const html = document.documentElement
      Object.defineProperty(html, 'offsetLeft', { configurable: true, value: 10 })
      Object.defineProperty(html, 'offsetTop', { configurable: true, value: 50 })
      withMockedRect(html, { top: 90 - origin.y, left: 10 - origin.x, right: 1034 - origin.x, bottom: 858 - origin.y, width: 1024, height: 768 })
      // The anchor at (350, 250) to (450, 280) in layout-viewport coordinates.
      const shift = { x: origin.x - c.scrollX, y: origin.y - c.scrollY }
      const anchor = document.getElementById('a')!
      const floating = document.getElementById('b')!
      withMockedRect(anchor, { top: 250 - shift.y, left: 350 - shift.x, right: 450 - shift.x, bottom: 280 - shift.y, width: 100, height: 30 })
      Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
      const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper' })
      assert.equal(floating.style.top, '284px', label)
      assert.equal(floating.style.left, '350px', label)
      p.detach()
    }
  }
})

test('the layout viewport corner keeps a fractional scroll exact, and WebKit\'s whole-number scrollX leaves an error below one pixel', () => {
  // The visual viewport at (300.5, 700.75) in the document, panned 300.5 by
  // 200.25 px inside a layout viewport scrolled 500.5 px down.
  const cases = [
    // A scroll position that matches the client origin exactly, as Chromium's does.
    { label: 'exact', scroll: { x: 0, y: 500.5 }, clientOrigin: { x: 0, y: 500.5 }, top: '284px', left: '350px' },
    // WebKit: client rects from the visual viewport, and `scrollX` / `scrollY` as whole numbers.
    { label: 'webkit', scroll: { x: 300, y: 700 }, clientOrigin: { x: 300.5, y: 700.75 }, top: '283.25px', left: '349.5px' },
  ]
  for (const c of cases) {
    const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
    const vv = Object.assign(new dom.window.EventTarget(), { width: 512, height: 384, offsetLeft: 300.5, offsetTop: 200.25, pageLeft: 300.5, pageTop: 700.75 })
    Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
    setWindowScroll(dom, c.scroll.x, c.scroll.y)
    // The anchor at (350, 250) to (450, 280) in layout-viewport coordinates.
    const shift = { x: c.clientOrigin.x, y: c.clientOrigin.y - 500.5 }
    const anchor = document.getElementById('a')!
    const floating = document.getElementById('b')!
    withMockedRect(anchor, { top: 250 - shift.y, left: 350 - shift.x, right: 450 - shift.x, bottom: 280 - shift.y, width: 100, height: 30 })
    Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
    const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper' })
    assert.equal(floating.style.top, c.top, c.label)
    assert.equal(floating.style.left, c.left, c.label)
    p.detach()
  }
})

test('without visualViewport, a page scrolled on both axes places the popup by the client rect', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  assert.equal(dom.window.visualViewport, undefined)
  setWindowScroll(dom, 300, 500)
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 250, left: 350, right: 450, bottom: 280, width: 100, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
  const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper' })
  assert.equal(floating.style.top, '284px')
  assert.equal(floating.style.left, '350px')
  p.detach()
})

test('the hidden check leaves out the scrollbars, which the client box of the root element does not hold', () => {
  setupDom('<!doctype html><html><body><div id="a"></div></body></html>')
  // A 15 px scrollbar on each axis of a 1024 by 768 px window.
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1009 })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 753 })
  const anchor = document.getElementById('a')!
  withMockedRect(anchor, { top: 760, left: 50, right: 250, bottom: 790, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
  withMockedRect(anchor, { top: 100, left: 1015, right: 1215, bottom: 130, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
  withMockedRect(anchor, { top: 740, left: 1000, right: 1200, bottom: 770, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), false)
})

test('in WebKit, a trigger inside the layout viewport but above the visual viewport does not count as hidden', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const vv = pannableViewport(dom, { width: 512, height: 384 })
  vv.offsetTop = 200
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  // WebKit: client rects start at the visual viewport, 200 px down the layout viewport.
  setWindowScroll(dom, 0, 200)
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // 50 px down the layout viewport, so 150 px above the visible area.
  withMockedRect(anchor, { top: -150, left: 50, right: 250, bottom: -120, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)
  // The visible top edge stands in for the trigger, 4 px below it.
  assert.equal(floating.style.top, '204px')
  p.detach()
})

test('in WebKit at a high zoom, where innerWidth and innerHeight shrink to the visual viewport, a visible trigger still counts as visible', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  // Zoomed 3x: a 341 by 256 px visual viewport at (600, 400) in the 1024 by
  // 768 px layout viewport, whose size only `<html>` still reports.
  const vv = pannableViewport(dom, { width: 341, height: 256 })
  vv.offsetLeft = 600
  vv.offsetTop = 400
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 341 })
  Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: 256 })
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1024 })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 768 })
  setWindowScroll(dom, 600, 400)
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // At (650, 450) in the layout viewport, 50 px inside the visible area.
  withMockedRect(anchor, { top: 50, left: 50, right: 150, bottom: 80, width: 100, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
  assert.equal(isAnchorHidden(anchor), false)
  let calls = 0
  const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper', onHide: () => { calls++ } })
  assert.equal(calls, 0)
  assert.equal(floating.style.top, '484px')
  assert.equal(floating.style.left, '650px')
  assert.equal(floating.style.maxHeight, `${400 + 256 - 8 - 484}px`)
  p.detach()
})

test('in quirks mode, the layout viewport is the client box of the body, not that of the html element', () => {
  // No doctype: quirks mode, where `<html>` reports the document's height.
  setupDom('<html><body><div id="a"></div><div id="b"></div></body></html>')
  assert.equal(document.compatMode, 'BackCompat')
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 5000 })
  Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 1024 })
  Object.defineProperty(document.body, 'clientHeight', { configurable: true, value: 768 })
  const anchor = document.getElementById('a')!
  withMockedRect(anchor, { top: 1000, left: 50, right: 250, bottom: 1030, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
  withMockedRect(anchor, { top: 700, left: 50, right: 250, bottom: 730, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), false)
  // Across too: `<html>` reports the document's width, the body the window's.
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 3000 })
  withMockedRect(anchor, { top: 100, left: 1100, right: 1300, bottom: 130, width: 200, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
})

test('in quirks mode, a panned page places the popup and checks both axes against the client box of the body', () => {
  const dom = setupDom('<html><body><div id="a"></div><div id="b"></div></body></html>')
  assert.equal(document.compatMode, 'BackCompat')
  const vv = pannableViewport(dom, { width: 512, height: 384 })
  vv.offsetLeft = 300
  vv.offsetTop = 200
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  // WebKit: the window's scroll position is the visual viewport's corner.
  setWindowScroll(dom, 300, 200)
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 3000 })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 5000 })
  Object.defineProperty(document.body, 'clientWidth', { configurable: true, value: 1024 })
  Object.defineProperty(document.body, 'clientHeight', { configurable: true, value: 768 })
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // At (350, 250) in the layout viewport.
  withMockedRect(anchor, { top: 50, left: 50, right: 150, bottom: 80, width: 100, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 100, configurable: true })
  const p = createPositioner(anchor, floating, { widthPolicy: 'match-trigger-wrapper' })
  assert.equal(floating.style.top, '284px')
  assert.equal(floating.style.left, '350px')
  p.detach()
  // Past the body's box on either axis, though inside the html element's.
  withMockedRect(anchor, { top: 600, left: 50, right: 150, bottom: 630, width: 100, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
  withMockedRect(anchor, { top: 50, left: 750, right: 850, bottom: 80, width: 100, height: 30 })
  assert.equal(isAnchorHidden(anchor), true)
})

test('positioner auto-closes on scroll but NOT on resize (virtual keyboard)', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  // Start in-viewport so the initial reposition does not close.
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)

  // Trigger now sits below the layout viewport (jsdom innerHeight 768).
  withMockedRect(anchor, { top: 900, left: 50, right: 250, bottom: 930, width: 200, height: 30 })
  // A resize (virtual keyboard / URL bar / rotation) must NOT close: it changes
  // available space, it does not mean the user scrolled the trigger away.
  dom.window.dispatchEvent(new dom.window.Event('resize'))
  assert.equal(calls, 0)
  // A genuine scroll that took the trigger out of view MUST close.
  dom.window.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(calls, 1)
  p.detach()
})

test('a scroll of an element that does not hold the anchor still runs the hidden check', () => {
  const dom = setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div><div id="side"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  const side = document.getElementById('side')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)
  withMockedRect(anchor, { top: 900, left: 50, right: 250, bottom: 930, width: 200, height: 30 })
  side.dispatchEvent(new dom.window.Event('scroll'))
  assert.equal(calls, 1)
  p.detach()
})

test('a size change the ResizeObserver reports re-places the popup without the hidden check, and detach disconnects it', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const original = globalThis.ResizeObserver
  globalThis.ResizeObserver = RecordingResizeObserver
  try {
    const anchor = document.getElementById('a')!
    const floating = document.getElementById('b')!
    withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
    Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
    let calls = 0
    const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
    const ro = RecordingResizeObserver.last
    assert.ok(ro)
    assert.deepEqual(ro.observed, [anchor, floating])
    assert.equal(floating.getAttribute('data-placement'), 'below')
    // Even with the trigger out of the layout viewport, a size change only re-places.
    withMockedRect(anchor, { top: 900, left: 50, right: 250, bottom: 930, width: 200, height: 30 })
    ro.callback([], ro)
    assert.equal(calls, 0)
    assert.equal(floating.getAttribute('data-placement'), 'above')
    p.detach()
    assert.equal(ro.disconnects, 1)
  } finally {
    globalThis.ResizeObserver = original
  }
})

test('detach removes every listener the positioner added, with the same function and capture flag', (t) => {
  const dom = setupDom('<!doctype html><html><body><div id="host"></div><div id="b"></div></body></html>')
  const vv = Object.assign(new dom.window.EventTarget(), { width: 1024, height: 768, offsetLeft: 0, offsetTop: 0 })
  Object.defineProperty(dom.window, 'visualViewport', { configurable: true, value: vv })
  // The anchor sits in a shadow root, which then gets a scroll listener too.
  const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' })
  const anchor = document.createElement('div')
  shadow.appendChild(anchor)
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  const windowAdd = t.mock.method(dom.window, 'addEventListener')
  const vvAdd = t.mock.method(vv, 'addEventListener')
  const shadowAdd = t.mock.method(shadow, 'addEventListener')
  const p = createPositioner(anchor, floating)
  const windowRemove = t.mock.method(dom.window, 'removeEventListener')
  const vvRemove = t.mock.method(vv, 'removeEventListener')
  const shadowRemove = t.mock.method(shadow, 'removeEventListener')
  p.detach()
  const cases = [
    { where: 'window', adds: windowAdd.mock.calls, removes: windowRemove.mock.calls, types: ['resize', 'scroll'] },
    { where: 'visualViewport', adds: vvAdd.mock.calls, removes: vvRemove.mock.calls, types: ['resize', 'scroll'] },
    { where: 'shadow root', adds: shadowAdd.mock.calls, removes: shadowRemove.mock.calls, types: ['scroll'] },
  ]
  for (const { where, adds, removes, types } of cases) {
    assertEveryListenerRemoved(where, adds, removes, types)
  }
})

test('public reposition() never auto-closes, even when the anchor is out of view', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const anchor = document.getElementById('a')!
  const floating = document.getElementById('b')!
  withMockedRect(anchor, { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })
  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)
  // Trigger now out of view (e.g. keyboard pushed it). A list re-render after a
  // filter keystroke calls positioner.reposition() - it must NOT dismiss.
  withMockedRect(anchor, { top: 900, left: 50, right: 250, bottom: 930, width: 200, height: 30 })
  p.reposition()
  assert.equal(calls, 0)
  p.detach()
})

test('positioner calls onHide when anchor is clipped above a scroll container', () => {
  setupDom('<!doctype html><html><body><div id="container" style="overflow-y:auto;height:200px;"><div id="anchor"></div></div><div id="floating"></div></body></html>')
  const container = document.getElementById('container')!
  const anchor = document.getElementById('anchor')!
  const floating = document.getElementById('floating')!
  // Container occupies y=100..300, anchor sits at y=50..80 (above container top).
  withMockedRect(container, { top: 100, left: 0, right: 200, bottom: 300, width: 200, height: 200 })
  withMockedRect(anchor, { top: 50, left: 0, right: 200, bottom: 80, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })

  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 1)
  p.detach()
})

test('positioner calls onHide when anchor is clipped below a scroll container', () => {
  setupDom('<!doctype html><html><body><div id="container" style="overflow-y:auto;height:200px;"><div id="anchor"></div></div><div id="floating"></div></body></html>')
  const container = document.getElementById('container')!
  const anchor = document.getElementById('anchor')!
  const floating = document.getElementById('floating')!
  withMockedRect(container, { top: 100, left: 0, right: 200, bottom: 300, width: 200, height: 200 })
  // Anchor at y=350..380 - below container's bottom (300).
  withMockedRect(anchor, { top: 350, left: 0, right: 200, bottom: 380, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })

  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 1)
  p.detach()
})

test('positioner does NOT call onHide when anchor is inside its scroll container', () => {
  setupDom('<!doctype html><html><body><div id="container" style="overflow-y:auto;height:200px;"><div id="anchor"></div></div><div id="floating"></div></body></html>')
  const container = document.getElementById('container')!
  const anchor = document.getElementById('anchor')!
  const floating = document.getElementById('floating')!
  withMockedRect(container, { top: 100, left: 0, right: 200, bottom: 300, width: 200, height: 200 })
  withMockedRect(anchor, { top: 150, left: 0, right: 200, bottom: 180, width: 200, height: 30 })
  Object.defineProperty(floating, 'offsetHeight', { value: 150, configurable: true })

  let calls = 0
  const p = createPositioner(anchor, floating, { onHide: () => { calls++ } })
  assert.equal(calls, 0)
  p.detach()
})

test('LLSelectSingle auto-closes when trigger is scrolled out of its scroll container', () => {
  setupDom('<!doctype html><html><body><div id="container" style="overflow-y:auto;height:200px;"><div id="mount"></div></div></body></html>')
  const container = document.getElementById('container')!
  const mount = document.getElementById('mount')!
  withMockedRect(container, { top: 100, left: 0, right: 200, bottom: 300, width: 200, height: 200 })

  const sel = new LLSelectSingle<string>(mount)
  sel.setItems(['a', 'b'])
  withMockedRect(sel.triggerWrapperEl, { top: 150, left: 0, right: 200, bottom: 180, width: 200, height: 30 })
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')

  // Combobox is scrolled above the container's visible area.
  withMockedRect(sel.triggerWrapperEl, { top: 50, left: 0, right: 200, bottom: 80, width: 200, height: 30 })
  window.dispatchEvent(new Event('scroll'))

  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('LLSelectSingle auto-closes when trigger scrolls fully out of viewport', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  sel.setItems(['a', 'b'])

  withMockedRect(sel.triggerWrapperEl, { top: 100, left: 0, right: 200, bottom: 130, width: 200, height: 30 })
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')

  // Anchor moves fully above the viewport (e.g. user scrolled it out of view).
  withMockedRect(sel.triggerWrapperEl, { top: -100, left: 0, right: 200, bottom: -70, width: 200, height: 30 })
  window.dispatchEvent(new Event('scroll'))

  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

// --- placement stickiness (currentPlacement) ------------------------------

// Anchor near the viewport bottom: a little room below (58px), lots above.
const ANCHOR_NEAR_BOTTOM: AnchorRect = {
  top: 600, left: 50, right: 250, bottom: 630, width: 200, height: 30,
}
const NEAR_BOTTOM_VIEWPORT = { viewportWidth: 1024, viewportHeight: 700 }

test('sticky: an above placement is kept while content still fits above', () => {
  // Open with a tall list -> above. The filter then matches nothing and the
  // popup shrinks to fit below too; without stickiness it would jump down.
  const first = computePosition({
    anchorRect: ANCHOR_NEAR_BOTTOM, ...NEAR_BOTTOM_VIEWPORT,
    floatingHeight: 500,
  })
  assert.equal(first.placement, 'above')
  const shrunk = computePosition({
    anchorRect: ANCHOR_NEAR_BOTTOM, ...NEAR_BOTTOM_VIEWPORT,
    floatingHeight: 40, currentPlacement: first.placement,
  })
  assert.equal(shrunk.placement, 'above')
  // Esc clears the filter, the list regrows: still above, full room to grow.
  const regrown = computePosition({
    anchorRect: ANCHOR_NEAR_BOTTOM, ...NEAR_BOTTOM_VIEWPORT,
    floatingHeight: 500, currentPlacement: shrunk.placement,
  })
  assert.equal(regrown.placement, 'above')
  assert.equal(regrown.maxHeight, 588) // spaceAbove = 600 - 4 - 8
})

test('sticky: a below placement is kept while content still fits below', () => {
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP, viewportWidth: 1024, viewportHeight: 768,
    floatingHeight: 200, currentPlacement: 'below',
  })
  assert.equal(r.placement, 'below')
})

test('sticky yields: current side no longer fits and the other does -> flip', () => {
  const r = computePosition({
    anchorRect: ANCHOR_NEAR_BOTTOM, ...NEAR_BOTTOM_VIEWPORT,
    floatingHeight: 400, currentPlacement: 'below',
  })
  assert.equal(r.placement, 'above')
})

test('sticky yields: neither side fits -> larger side wins regardless of current', () => {
  const r = computePosition({
    anchorRect: ANCHOR_NEAR_BOTTOM, ...NEAR_BOTTOM_VIEWPORT,
    floatingHeight: 800, currentPlacement: 'below',
  })
  assert.equal(r.placement, 'above')
})

test('pinch-zoom offsets: an anchor inside the panned visible window keeps its x', () => {
  // Visible window [500, 900] in client coords (visualViewport panned right).
  // The old [0, viewportWidth] clamp dragged left toward the layout origin.
  const r = computePosition({
    anchorRect: { top: 100, left: 600, right: 800, bottom: 130, width: 200, height: 30 },
    viewportWidth: 400,
    viewportHeight: 768,
    viewportLeft: 500,
    viewportTop: 0,
    floatingHeight: 200,
  })
  assert.equal(r.placement, 'below')
  assert.equal(r.left, 600)
})

test('pinch-zoom offsets: the right-edge clamp happens at the VISIBLE right edge', () => {
  const r = computePosition({
    anchorRect: { top: 100, left: 850, right: 890, bottom: 130, width: 40, height: 30 },
    viewportWidth: 400,
    viewportHeight: 768,
    viewportLeft: 500,
    viewportTop: 0,
    floatingHeight: 200,
    floatingNaturalWidth: 200,
  })
  // rightEdge = 500 + 400 - 8 = 892; width 200 -> left = 692.
  assert.equal(r.left, 692)
})

test('pinch-zoom offsets: vertical space measures against the visible window', () => {
  // Visible window [300, 1068]; the anchor sits above it, so only "below"
  // has room. The popup starts 4 px below the VISIBLE top, not under the
  // anchor, and maxHeight runs to 8 px above the VISIBLE bottom.
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP,
    viewportWidth: 1024,
    viewportHeight: 768,
    viewportLeft: 0,
    viewportTop: 300,
    floatingHeight: 200,
  })
  assert.equal(r.placement, 'below')
  assert.equal(r.top, 300 + 4)
  assert.equal(r.maxHeight, 300 + 768 - 8 - (300 + 4))
})

test('a trigger below the visible window keeps the popup above it inside the window (on-screen keyboard)', () => {
  // The keyboard leaves a visible window [0, 400]; the anchor at 500 sits
  // under the keyboard but inside the layout viewport, so it counts as
  // visible. The popup ends 4 px above the VISIBLE bottom, not at the
  // anchor's top.
  const anchorRect = { top: 500, left: 50, right: 250, bottom: 530, width: 200, height: 30 }
  const r = computePosition({ anchorRect, viewportWidth: 1024, viewportHeight: 400, floatingHeight: 300 })
  assert.equal(r.placement, 'above')
  assert.equal(r.maxHeight, 400 - 4 - 8)
  assert.equal(r.top, 400 - 4 - 300)
  // A popup taller than the window fills it, and no more.
  const tall = computePosition({ anchorRect, viewportWidth: 1024, viewportHeight: 400, floatingHeight: 600 })
  assert.equal(tall.top, 8)
  assert.equal(tall.maxHeight, 400 - 4 - 8)
})

test('a visible trigger next to an edge of the visible window keeps the popup against it', () => {
  // Short triggers flush with the top and with the bottom of [0, 400].
  const atTop = computePosition({
    anchorRect: { top: 0, left: 50, right: 250, bottom: 1, width: 200, height: 1 },
    viewportWidth: 1024, viewportHeight: 400, floatingHeight: 100,
  })
  assert.equal(atTop.placement, 'below')
  assert.equal(atTop.top, 1 + 4)
  assert.equal(atTop.maxHeight, 400 - 8 - (1 + 4))
  const atBottom = computePosition({
    anchorRect: { top: 398, left: 50, right: 250, bottom: 400, width: 200, height: 2 },
    viewportWidth: 1024, viewportHeight: 400, floatingHeight: 100,
  })
  assert.equal(atBottom.placement, 'above')
  assert.equal(atBottom.top, 398 - 4 - 100)
  assert.equal(atBottom.maxHeight, 398 - 4 - 8)
  // Edges exactly on the window's edges, 0 and 400.
  const onTop = computePosition({
    anchorRect: { top: -10, left: 50, right: 250, bottom: 0, width: 200, height: 10 },
    viewportWidth: 1024, viewportHeight: 400, floatingHeight: 100,
  })
  assert.equal(onTop.placement, 'below')
  assert.equal(onTop.top, 0 + 4)
  assert.equal(onTop.maxHeight, 400 - 8 - 4)
  const onBottom = computePosition({
    anchorRect: { top: 400, left: 50, right: 250, bottom: 410, width: 200, height: 10 },
    viewportWidth: 1024, viewportHeight: 400, floatingHeight: 100,
  })
  assert.equal(onBottom.placement, 'above')
  assert.equal(onBottom.top, 400 - 4 - 100)
  assert.equal(onBottom.maxHeight, 400 - 4 - 8)
})

test('a trigger that crosses one edge of the visible window keeps the popup against its visible edge', () => {
  // Visible window [300, 700]; the trigger crosses its top.
  const top = computePosition({
    anchorRect: { top: 290, left: 50, right: 250, bottom: 320, width: 200, height: 30 },
    viewportWidth: 1024, viewportHeight: 400, viewportTop: 300, floatingHeight: 100,
  })
  assert.equal(top.placement, 'below')
  assert.equal(top.top, 320 + 4)
  // Visible window [0, 400]; the trigger crosses its bottom.
  const bottom = computePosition({
    anchorRect: { top: 390, left: 50, right: 250, bottom: 420, width: 200, height: 30 },
    viewportWidth: 1024, viewportHeight: 400, floatingHeight: 100,
  })
  assert.equal(bottom.placement, 'above')
  assert.equal(bottom.top, 390 - 4 - 100)
  assert.equal(bottom.maxHeight, 390 - 4 - 8)
})

test('a side with no room at all gives maxHeight 0, and keeps top inside the visible window unless the trigger edge next to it is visible', () => {
  // Above: a 2 px window [0, 2] over a trigger below it; top would be -2.
  const above = computePosition({
    anchorRect: { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 },
    viewportWidth: 1024, viewportHeight: 2, floatingHeight: 200,
  })
  assert.equal(above.placement, 'above')
  assert.equal(above.maxHeight, 0)
  assert.equal(above.top, 0)
  // Below: an 8 px window [200, 208] under a trigger above it.
  const below = computePosition({
    anchorRect: { top: 100, left: 50, right: 250, bottom: 130, width: 200, height: 30 },
    viewportWidth: 1024, viewportHeight: 8, viewportTop: 200, floatingHeight: 200,
  })
  assert.equal(below.placement, 'below')
  assert.equal(below.maxHeight, 0)
  assert.equal(below.top, 200 + 4)
  // A trigger that covers the whole window [100, 120]; top would be 134.
  const covered = computePosition({
    anchorRect: { top: 90, left: 50, right: 250, bottom: 130, width: 200, height: 40 },
    viewportWidth: 1024, viewportHeight: 20, viewportTop: 100, floatingHeight: 200,
  })
  assert.equal(covered.maxHeight, 0)
  assert.equal(covered.top, 120)
  // Next to a visible trigger edge, the old placement stays: in the window
  // [0, 20], the trigger's bottom at 18 is visible, and top stays at 22.
  const visibleBottom = computePosition({
    anchorRect: { top: 0, left: 50, right: 250, bottom: 18, width: 200, height: 18 },
    viewportWidth: 1024, viewportHeight: 20, floatingHeight: 200,
  })
  assert.equal(visibleBottom.placement, 'below')
  assert.equal(visibleBottom.maxHeight, 0)
  assert.equal(visibleBottom.top, 22)
  // The mirror: the trigger's top at 2 is visible, and top stays at -2.
  const visibleTop = computePosition({
    anchorRect: { top: 2, left: 50, right: 250, bottom: 20, width: 200, height: 18 },
    viewportWidth: 1024, viewportHeight: 20, floatingHeight: 200,
  })
  assert.equal(visibleTop.placement, 'above')
  assert.equal(visibleTop.maxHeight, 0)
  assert.equal(visibleTop.top, -2)
  // A trigger edge exactly on a window edge counts as visible, and the edge
  // that counts is the one next to the popup.
  for (const [viewportHeight, anchorTop, anchorBottom, placement, top] of [
    [2, -10, 0, 'below', 4],
    [2, 2, 12, 'above', -2],
    [20, -10, 18, 'below', 22],
    [20, 2, 30, 'above', -2],
  ] as const) {
    const r = computePosition({
      anchorRect: { top: anchorTop, left: 50, right: 250, bottom: anchorBottom, width: 200, height: anchorBottom - anchorTop },
      viewportWidth: 1024, viewportHeight, floatingHeight: 200,
    })
    const where = `[${anchorTop}, ${anchorBottom}] in [0, ${viewportHeight}]`
    assert.equal(r.placement, placement, where)
    assert.equal(r.maxHeight, 0, where)
    assert.equal(r.top, top, where)
  }
})

test('zero offsets reproduce the unshifted math exactly', () => {
  const base = computePosition({
    anchorRect: ANCHOR_AT_TOP, viewportWidth: 1024, viewportHeight: 768, floatingHeight: 200,
  })
  const explicit = computePosition({
    anchorRect: ANCHOR_AT_TOP, viewportWidth: 1024, viewportHeight: 768, viewportLeft: 0, viewportTop: 0, floatingHeight: 200,
  })
  assert.deepEqual(explicit, base)
})

test('positioner: natural height comes from the inner scroller, not the clamped box', () => {
  setupDom('<!doctype html><html><body></body></html>')
  const anchor = document.createElement('div')
  const floating = document.createElement('div')
  const inner = document.createElement('div')
  floating.append(inner)
  document.body.append(anchor, floating)
  anchor.getBoundingClientRect = () =>
    ({ top: 370, left: 50, right: 250, bottom: 400, width: 200, height: 30, x: 50, y: 370, toJSON: () => ({}) }) as DOMRect
  // A popup already clamped to 200px whose list hides 800px of overflow.
  Object.defineProperty(floating, 'offsetHeight', { value: 200, configurable: true })
  Object.defineProperty(inner, 'scrollHeight', { value: 900, configurable: true })
  Object.defineProperty(inner, 'clientHeight', { value: 100, configurable: true })
  const p = createPositioner(anchor, floating, { innerScrollEl: inner })
  // jsdom viewport is 1024x768: spaceBelow = 356, spaceAbove = 358. The
  // clamped box (200) would fit below; the true content height
  // (200 + 800 = 1000) fits neither side, so the larger side must win.
  // Reading only offsetHeight (the old feedback bug) would report 'below'.
  assert.equal(floating.getAttribute('data-placement'), 'above')
  p.detach()
})

// --- F1: opening against an off-screen trigger is a no-op, not a leak ------

test('open() on an out-of-view trigger is a no-op and attaches no listeners', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  let opens = 0
  let closes = 0
  const sel = new LLSelectSingle<string>(mount, {
    onOpen: () => { opens++ },
    onClose: () => { closes++ },
  })
  sel.setItems(['a', 'b'])
  // Trigger fully above the viewport (bottom < 0): the positioner's initial
  // placement would have hidden it re-entrantly under the old code.
  sel.triggerWrapperEl.getBoundingClientRect = () =>
    ({ top: -100, left: 50, right: 250, bottom: -70, width: 200, height: 30, x: 50, y: -100, toJSON: () => ({}) }) as DOMRect
  sel.open()
  // Clean no-op: never reported open, fired no callbacks, popup stays hidden.
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(sel.popupEl.hidden, true)
  assert.equal(opens, 0)
  assert.equal(closes, 0)
  // No positioner was attached, so a later resize does not mutate the popup.
  window.dispatchEvent(new Event('resize'))
  assert.equal(sel.popupEl.hidden, true)
  assert.equal(sel.popupEl.hasAttribute('data-placement'), false)
  // destroy() stays clean (nothing stranded to tear down).
  sel.destroy()
})
