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

test('computePosition width matches anchor', () => {
  const r = computePosition({
    anchorRect: { ...ANCHOR_AT_TOP, width: 350 },
    viewportWidth: 1024,
    viewportHeight: 768,
    floatingHeight: 200,
  })
  assert.equal(r.width, 350)
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
