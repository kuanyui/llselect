import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { computePosition, createPositioner, type AnchorRect } from '../src/positioning.js'
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

test('match-trigger (opt-in): width pinned to anchor, no horizontal shift', () => {
  // Anchor near right edge with `match-trigger` should NOT shift left;
  // popup stays the same width as the trigger.
  const r = computePosition({
    anchorRect: { top: 100, bottom: 130, left: 900, right: 1000, width: 100, height: 30 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
    widthPolicy: 'match-trigger',
    floatingNaturalWidth: 999,  // ignored for match-trigger
  })
  assert.equal(r.width, 100)
  assert.equal(r.left, 900)
})

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
  withMockedRect(sel.triggerEl, { top: 0, left: 0, right: 200, bottom: 30, width: 200, height: 30 })

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
  withMockedRect(sel.triggerEl, { top: 150, left: 0, right: 200, bottom: 180, width: 200, height: 30 })
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')

  // Combobox is scrolled above the container's visible area.
  withMockedRect(sel.triggerEl, { top: 50, left: 0, right: 200, bottom: 80, width: 200, height: 30 })
  window.dispatchEvent(new Event('scroll'))

  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('LLSelectSingle auto-closes when trigger scrolls fully out of viewport', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  sel.setItems(['a', 'b'])

  withMockedRect(sel.triggerEl, { top: 100, left: 0, right: 200, bottom: 130, width: 200, height: 30 })
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')

  // Anchor moves fully above the viewport (e.g. user scrolled it out of view).
  withMockedRect(sel.triggerEl, { top: -100, left: 0, right: 200, bottom: -70, width: 200, height: 30 })
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
  // has room, and maxHeight runs to the VISIBLE bottom.
  const r = computePosition({
    anchorRect: ANCHOR_AT_TOP,
    viewportWidth: 1024,
    viewportHeight: 768,
    viewportLeft: 0,
    viewportTop: 300,
    floatingHeight: 200,
  })
  assert.equal(r.placement, 'below')
  assert.equal(r.top, 134)
  assert.equal(r.maxHeight, 300 + 768 - 134 - 8)
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
  sel.triggerEl.getBoundingClientRect = () =>
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
