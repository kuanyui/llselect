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
  sel.setOptions(['a', 'b'])
  withMockedRect(sel.comboboxEl, { top: 0, left: 0, right: 200, bottom: 30, width: 200, height: 30 })

  sel.open()
  assert.equal(sel.listboxEl.hidden, false)
  assert.equal(sel.listboxEl.style.position, 'fixed')
  assert.ok(sel.listboxEl.getAttribute('data-placement'))

  sel.close()
  assert.equal(sel.listboxEl.hidden, true)
  assert.equal(sel.listboxEl.style.position, '')
  assert.equal(sel.listboxEl.getAttribute('data-placement'), null)
})

test('listbox is hidden by default after construction', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  assert.equal(sel.listboxEl.hidden, true)
})
