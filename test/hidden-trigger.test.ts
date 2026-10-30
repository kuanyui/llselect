import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { createPositioner, createsContainingBlock, hasContainment, isAnchorHidden, resetFilterProbe, type AnchorRect } from '../src/positioning.js'
import { LLSelectSingle } from '../src/single.js'
import { resetHiddenTriggerWarning } from '../src/base.js'

// The hidden-trigger check: DESIGN.md "Hidden-trigger check". jsdom does no
// layout, so every rect is mocked. jsdom does not expand the `overflow`
// shorthand, so the fixtures set both longhands.

function withMockedRect(el: Element, rect: Partial<AnchorRect>): void {
  const full: AnchorRect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect }
  el.getBoundingClientRect = () => ({
    top: full.top, left: full.left, right: full.right, bottom: full.bottom,
    width: full.width, height: full.height, x: full.left, y: full.top,
    toJSON() { return full },
  })
}

// On screen, in the lower half of jsdom's 1024 x 768 viewport.
const ON_SCREEN: Partial<AnchorRect> = { top: 500, bottom: 530, left: 10, right: 210, width: 200, height: 30 }
// A box as short as a one-line page.
const SHORT_BOX: Partial<AnchorRect> = { top: 0, bottom: 60, left: 0, right: 1024, width: 1024, height: 60 }
// A 40 px card at the top of the page.
const CARD: Partial<AnchorRect> = { top: 0, bottom: 40, left: 0, right: 300, width: 300, height: 40 }

function el(id: string): HTMLElement {
  return document.getElementById(id)!
}

test('the root element never clips: html { overflow: hidden } on a short page', () => {
  setupDom('<!doctype html><html style="overflow-x:hidden; overflow-y:hidden"><body><div id="a"></div></body></html>')
  withMockedRect(document.documentElement, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('a propagated body never clips: body { overflow: hidden } while html stays visible', () => {
  setupDom('<!doctype html><html><body style="overflow-x:hidden; overflow-y:hidden"><div id="a"></div></body></html>')
  withMockedRect(document.body, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('the body clips its own box when the root overflow is not visible', () => {
  setupDom('<!doctype html><html style="overflow-x:hidden; overflow-y:hidden"><body style="overflow-x:hidden; overflow-y:hidden"><div id="a"></div></body></html>')
  withMockedRect(document.body, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('containment on the body stops its propagation, so the body clips its own box', () => {
  setupDom('<!doctype html><html><body style="overflow-x:hidden; overflow-y:hidden; contain:layout"><div id="a"></div></body></html>')
  withMockedRect(document.body, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('a fixed element escapes an overflow:hidden ancestor that creates no containing block', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden"><div id="drawer" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('a transformed overflow:hidden ancestor holds a fixed element, and clips it', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden; transform:translateZ(0)"><div id="drawer" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('an absolute element escapes a static clipping wrapper, but not its positioned containing block', () => {
  setupDom('<!doctype html><html><body><div id="card" style="position:relative; overflow-x:hidden; overflow-y:hidden"><div id="wrap" style="overflow-x:hidden; overflow-y:hidden"><div id="abs" style="position:absolute"><div id="a"></div></div></div></div></body></html>')
  withMockedRect(el('card'), { top: 0, bottom: 300, left: 0, right: 300, width: 300, height: 300 })
  withMockedRect(el('wrap'), CARD)
  withMockedRect(el('abs'), { top: 100, bottom: 130, left: 10, right: 210, width: 200, height: 30 })
  withMockedRect(el('a'), { top: 100, bottom: 130, left: 10, right: 210, width: 200, height: 30 })
  assert.equal(isAnchorHidden(el('a')), false, 'outside the static wrapper only')
  withMockedRect(el('abs'), { top: 400, bottom: 430, left: 10, right: 210, width: 200, height: 30 })
  withMockedRect(el('a'), { top: 400, bottom: 430, left: 10, right: 210, width: 200, height: 30 })
  assert.equal(isAnchorHidden(el('a')), true, 'outside the positioned card')
})

test('each axis is tested only where its own overflow clips', () => {
  setupDom('<!doctype html><html><body><div id="strip" style="overflow-x:clip; overflow-y:visible"><div id="a"></div></div></body></html>')
  withMockedRect(el('strip'), CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false, 'below a box that clips horizontally only')
  withMockedRect(el('a'), { top: 10, bottom: 30, left: 400, right: 600, width: 200, height: 20 })
  assert.equal(isAnchorHidden(el('a')), true, 'to the right of that box')
})

test('a display:contents ancestor has no box, so it never clips', () => {
  setupDom('<!doctype html><html><body><div id="c" style="display:contents; overflow-x:hidden; overflow-y:hidden"><div id="a"></div></div></body></html>')
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('nothing above a top-layer element clips it, even a transformed ancestor', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden; transform:translateZ(0)"><dialog id="d" style="position:fixed"><div id="a"></div></dialog></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('d'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  // jsdom throws on :modal, like the browsers below the selector's support:
  // the fixed rule then applies, and the transformed card holds the dialog.
  assert.equal(isAnchorHidden(el('a')), true, 'without :modal support')
  Object.defineProperty(el('d'), 'matches', { value: (selector: string) => selector === ':modal' })
  assert.equal(isAnchorHidden(el('a')), false, 'a modal dialog')
})

test('the clip of a top-layer element itself still applies', () => {
  setupDom('<!doctype html><html><body><dialog id="d" style="position:fixed; overflow-x:auto; overflow-y:auto"><div id="a"></div></dialog></body></html>')
  Object.defineProperty(el('d'), 'matches', { value: (selector: string) => selector === ':modal' })
  withMockedRect(el('d'), CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('a scroll container still clips its in-flow content', () => {
  setupDom('<!doctype html><html style="overflow-x:hidden; overflow-y:hidden"><body style="overflow-x:hidden; overflow-y:hidden"><div id="box" style="overflow-x:auto; overflow-y:auto"><div id="a"></div></div></body></html>')
  withMockedRect(document.body, { top: 0, bottom: 768, left: 0, right: 1024, width: 1024, height: 768 })
  withMockedRect(el('box'), CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('createsContainingBlock: the properties that hold fixed-position descendants', () => {
  const style = (props: Record<string, string>): CSSStyleDeclaration => ({ getPropertyValue: (name: string) => props[name] ?? '' }) as unknown as CSSStyleDeclaration
  const held = (): boolean => true
  assert.equal(createsContainingBlock(style({}), held), false, 'nothing set')
  assert.equal(createsContainingBlock(style({ transform: 'none', filter: 'none', perspective: 'none', contain: 'none', 'will-change': 'auto' }), held), false, 'defaults')
  const set: Array<[string, string]> = [['transform', 'matrix(1, 0, 0, 1, 0, 0)'], ['translate', '1px'], ['rotate', '1deg'], ['scale', '2'], ['perspective', '10px'], ['backdrop-filter', 'blur(1px)'], ['transform-style', 'preserve-3d'], ['contain', 'paint'], ['contain', 'layout'], ['contain', 'strict'], ['contain', 'content'], ['content-visibility', 'auto'], ['will-change', 'transform'], ['will-change', 'opacity, filter'], ['will-change', 'contain'], ['will-change', 'offset-path'], ['will-change', 'translate']]
  for (const [name, value] of set) {
    assert.equal(createsContainingBlock(style({ [name]: value }), () => false), true, `${name}: ${value}`)
  }
  // None of these makes a containing block. Measured in four engines
  // (DESIGN.md): `container-type` `size` and `inline-size`, and the
  // `will-change` names `transform-origin`, `perspective-origin` and
  // `content-visibility`. The rest are initial values or spec rules.
  const unset: Array<[string, string]> = [['contain', 'style'], ['contain', 'size'], ['content-visibility', 'visible'], ['container-type', 'inline-size'], ['container-type', 'size'], ['container-type', 'normal'], ['transform-style', 'flat'], ['will-change', 'opacity'], ['will-change', 'transform-origin'], ['will-change', 'perspective-origin'], ['will-change', 'content-visibility']]
  for (const [name, value] of unset) {
    assert.equal(createsContainingBlock(style({ [name]: value }), held), false, `${name}: ${value}`)
  }
  assert.equal(createsContainingBlock(style({ filter: 'blur(1px)' }), held), true, 'filter, where the engine holds')
  assert.equal(createsContainingBlock(style({ filter: 'blur(1px)' }), () => false), false, 'filter, where it does not')
})

test('filter holds a fixed element only where the probe measures it so; an inconclusive probe is not kept', () => {
  setupDom('<!doctype html><html><body><div id="box" style="overflow-x:hidden; overflow-y:hidden; filter:blur(0px)"><div id="drawer" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('box'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  resetFilterProbe()
  // jsdom lays nothing out, so the probe's box sits at the origin: inconclusive.
  // The walk answers "does not hold", and keeps no answer.
  assert.equal(isAnchorHidden(el('a')), false, 'inconclusive')
  assert.equal(el('a').children.length, 0, 'the probe leaves nothing behind')
  // The probe's own boxes: the filtered box at (17, 13); the fixed child on it
  // where the filter holds it, at the origin where it does not.
  const original = window.HTMLElement.prototype.getBoundingClientRect
  const probeRects = (held: boolean): void => {
    window.HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
      const onBox = this.style.position !== 'fixed' || held
      const left = onBox ? 17 : 0
      const top = onBox ? 13 : 0
      return { top, left, right: left, bottom: top, width: 0, height: 0, x: left, y: top, toJSON() { return {} } } as DOMRect
    }
  }
  try {
    probeRects(true)
    assert.equal(isAnchorHidden(el('a')), true, 'an engine where the filter holds the drawer')
    probeRects(false)
    assert.equal(isAnchorHidden(el('a')), true, 'a conclusive answer is kept for the page')
    resetFilterProbe()
    assert.equal(isAnchorHidden(el('a')), false, 'an engine where the filter does not hold it')
  } finally {
    window.HTMLElement.prototype.getBoundingClientRect = original
    resetFilterProbe()
  }
})

test('containment on the root also stops the body overflow propagation', () => {
  setupDom('<!doctype html><html style="contain:layout"><body style="overflow-x:hidden; overflow-y:hidden"><div id="a"></div></body></html>')
  withMockedRect(document.body, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('a showing popover and a fullscreen element end the walk like a modal dialog', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden; transform:translateZ(0)"><div id="pop" popover="manual" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('pop'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true, 'without :popover-open support')
  Object.defineProperty(el('pop'), 'matches', { value: (selector: string) => selector === ':popover-open', configurable: true })
  assert.equal(isAnchorHidden(el('a')), false, 'a showing popover')
  el('pop').removeAttribute('popover')
  assert.equal(isAnchorHidden(el('a')), true, 'no popover attribute, so not asked')
  // document.fullscreenElement names another element here, the card, as it
  // names the host of an element fullscreened inside a shadow tree, so the
  // walk asks :fullscreen of the element itself.
  Object.defineProperty(document, 'fullscreenElement', { value: el('card'), configurable: true })
  Object.defineProperty(el('pop'), 'matches', { value: (selector: string) => selector === ':fullscreen', configurable: true })
  assert.equal(isAnchorHidden(el('a')), false, 'a fullscreen element')
})

test('a transformed static ancestor holds an absolute element, and clips it', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden; transform:translateZ(0)"><div id="abs" style="position:absolute"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('abs'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('overflow does not apply to an inline box', () => {
  setupDom('<!doctype html><html><body><span id="s" style="display:inline; overflow-x:hidden; overflow-y:hidden"><div id="a"></div></span></body></html>')
  withMockedRect(el('s'), CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('hasContainment: any containment stops the body overflow propagation', () => {
  const style = (props: Record<string, string>): CSSStyleDeclaration => ({ getPropertyValue: (name: string) => props[name] ?? '' }) as unknown as CSSStyleDeclaration
  assert.equal(hasContainment(style({})), false)
  assert.equal(hasContainment(style({ contain: 'none', 'content-visibility': 'visible', 'container-type': 'normal' })), false)
  assert.equal(hasContainment(style({ contain: 'style' })), true)
  assert.equal(hasContainment(style({ 'content-visibility': 'auto' })), true)
  assert.equal(hasContainment(style({ 'container-type': 'size' })), true)
})

test('the report: a select component under a scroll lock opens, and a scroll does not close it', () => {
  setupDom('<!doctype html><html style="overflow-x:hidden; overflow-y:hidden"><body><div id="mount"></div></body></html>')
  withMockedRect(document.documentElement, SHORT_BOX)
  const sel = new LLSelectSingle<string>(el('mount'), { ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  withMockedRect(sel.triggerWrapperEl, ON_SCREEN)
  sel.open()
  assert.equal(sel.isOpened(), true)
  window.dispatchEvent(new Event('scroll'))
  assert.equal(sel.isOpened(), true)
})

test('the positioner keeps an anchor under a scroll lock open on scroll', () => {
  setupDom('<!doctype html><html style="overflow-x:hidden; overflow-y:hidden"><body><div id="a"></div><div id="f"></div></body></html>')
  withMockedRect(document.documentElement, SHORT_BOX)
  withMockedRect(el('a'), ON_SCREEN)
  Object.defineProperty(el('f'), 'offsetHeight', { value: 100, configurable: true })
  let hides = 0
  const p = createPositioner(el('a'), el('f'), { onHide: () => { hides++ } })
  window.dispatchEvent(new Event('scroll'))
  assert.equal(hides, 0)
  p.detach()
})

test('the walk leaves a shadow root through its host', () => {
  setupDom('<!doctype html><html><body><div id="box" style="overflow-x:auto; overflow-y:auto"><div id="host"></div></div></body></html>')
  const root = el('host').attachShadow({ mode: 'open' })
  root.innerHTML = '<div id="a"></div>'
  const a = root.getElementById('a')!
  withMockedRect(el('box'), CARD)
  withMockedRect(a, ON_SCREEN)
  assert.equal(isAnchorHidden(a), true, 'outside the box around the host')
  withMockedRect(a, { top: 10, bottom: 30, left: 10, right: 210, width: 200, height: 20 })
  assert.equal(isAnchorHidden(a), false, 'inside that box')
})

test('a slotted element is clipped by the scroll wrapper around its slot', () => {
  setupDom('<!doctype html><html><body><div id="host"><div id="a"></div></div></body></html>')
  const root = el('host').attachShadow({ mode: 'open' })
  root.innerHTML = '<div id="wrap" style="overflow-x:auto; overflow-y:auto"><slot></slot></div>'
  withMockedRect(root.getElementById('wrap')!, CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})

test('a slotted element inside a fixed panel of the shadow tree escapes a clipping card around the host', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden"><div id="host"><div id="a"></div></div></div></body></html>')
  const root = el('host').attachShadow({ mode: 'open' })
  root.innerHTML = '<div id="panel" style="position:fixed"><slot></slot></div>'
  withMockedRect(el('card'), CARD)
  withMockedRect(root.getElementById('panel')!, ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('a slot inside a closed shadow root is not exposed, so the walk falls back to the light-DOM parent', () => {
  setupDom('<!doctype html><html><body><div id="host"><div id="a"></div></div></body></html>')
  const root = el('host').attachShadow({ mode: 'closed' })
  root.innerHTML = '<div id="wrap" style="overflow-x:auto; overflow-y:auto"><slot></slot></div>'
  withMockedRect(root.getElementById('wrap')!, CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(el('a').assignedSlot, null)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('the positioner hears a scroll inside a shadow root on the anchor\'s path, and stops after detach', () => {
  setupDom('<!doctype html><html><body><div id="host"></div><div id="f"></div></body></html>')
  const root = el('host').attachShadow({ mode: 'open' })
  root.innerHTML = '<div id="box" style="overflow-x:auto; overflow-y:auto"><div id="a"></div></div>'
  const box = root.getElementById('box')!
  const a = root.getElementById('a')!
  withMockedRect(box, CARD)
  withMockedRect(a, { top: 10, bottom: 30, left: 10, right: 210, width: 200, height: 20 })
  Object.defineProperty(el('f'), 'offsetHeight', { value: 100, configurable: true })
  let hides = 0
  const p = createPositioner(a, el('f'), { onHide: () => { hides++ } })
  assert.equal(hides, 0)
  // The anchor scrolled out of the box. The event is not composed, so it never
  // reaches window.
  withMockedRect(a, ON_SCREEN)
  box.dispatchEvent(new Event('scroll'))
  assert.equal(hides, 1)
  p.detach()
  box.dispatchEvent(new Event('scroll'))
  assert.equal(hides, 1, 'no listener left after detach')
})

test('a scroll inside the floating element runs no reposition and no hidden check', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="f"><div id="list"></div></div></body></html>')
  withMockedRect(el('a'), { top: 10, bottom: 30, left: 10, right: 210, width: 200, height: 20 })
  Object.defineProperty(el('f'), 'offsetHeight', { value: 100, configurable: true })
  let hides = 0
  const p = createPositioner(el('a'), el('f'), { onHide: () => { hides++ } })
  const top = el('f').style.top
  // Even with the anchor gone from view, the list's own scroll changes nothing.
  withMockedRect(el('a'), { top: -100, bottom: -70, left: 10, right: 210, width: 200, height: 30 })
  el('list').dispatchEvent(new Event('scroll'))
  assert.equal(hides, 0)
  assert.equal(el('f').style.top, top)
  window.dispatchEvent(new Event('scroll'))
  assert.equal(hides, 1, 'a scroll outside still runs the check')
  p.detach()
})

test('open() on a hidden trigger warns once per page, naming the trigger wrapper', () => {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  resetHiddenTriggerWarning()
  const warnings: unknown[][] = []
  const forward = console.warn
  console.warn = (...args: unknown[]): void => { warnings.push(args) }
  try {
    const sel = new LLSelectSingle<string>(el('mount'), { ariaLabel: 'x' })
    sel.setItems(['a'])
    withMockedRect(sel.triggerWrapperEl, { top: -100, bottom: -70, left: 10, right: 210, width: 200, height: 30 })
    sel.open()
    sel.open()
    assert.equal(sel.isOpened(), false)
    const hidden = warnings.filter((w) => typeof w[0] === 'string' && w[0].startsWith('llselect: open() did nothing'))
    assert.equal(hidden.length, 1, 'once per page')
    assert.equal(hidden[0]![1], sel.triggerWrapperEl)
    withMockedRect(sel.triggerWrapperEl, ON_SCREEN)
    sel.open()
    assert.equal(sel.isOpened(), true)
    resetHiddenTriggerWarning()
  } finally {
    console.warn = forward
  }
})

test('an inline box takes no transform or containment, so it holds no fixed element', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden"><span id="s" style="display:inline; transform:translateZ(0); contain:paint"><div id="drawer" style="position:fixed"><div id="a"></div></div></span></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('createsContainingBlock: on an inline box only a backdrop filter or a holding filter counts', () => {
  const style = (props: Record<string, string>): CSSStyleDeclaration => ({ getPropertyValue: (name: string) => props[name] ?? '', display: props.display ?? '' }) as unknown as CSSStyleDeclaration
  const held = (): boolean => true
  assert.equal(createsContainingBlock(style({ display: 'inline', 'backdrop-filter': 'blur(1px)' }), () => false), true, 'backdrop-filter')
  assert.equal(createsContainingBlock(style({ display: 'inline', filter: 'blur(1px)' }), held), true, 'filter, where the engine holds')
  assert.equal(createsContainingBlock(style({ display: 'inline', filter: 'blur(1px)' }), () => false), false, 'filter, where it does not')
  for (const [name, value] of [['transform', 'matrix(1, 0, 0, 1, 0, 0)'], ['perspective', '10px'], ['contain', 'paint'], ['content-visibility', 'auto'], ['transform-style', 'preserve-3d'], ['will-change', 'transform'], ['will-change', 'filter']] as Array<[string, string]>) {
    assert.equal(createsContainingBlock(style({ display: 'inline', [name]: value }), held), false, `${name}: ${value}`)
  }
  assert.equal(createsContainingBlock(style({ display: 'inline-block', transform: 'matrix(1, 0, 0, 1, 0, 0)' }), held), true, 'an inline-block takes a transform')
})

test('overflow does not apply to a table row', () => {
  setupDom('<!doctype html><html><body><table><tr id="row" style="display:table-row; overflow-x:hidden; overflow-y:hidden"><td><div id="a"></div></td></tr></table></body></html>')
  withMockedRect(el('row'), CARD)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), false)
})

test('a style that outranks the probe and makes its box a creator leaves the probe inconclusive', () => {
  // jsdom does not expand `all: initial`, so this page rule reaches the probe
  // box. In a browser, only a user style marked `!important` can.
  setupDom('<!doctype html><html><head><style id="rule">#a > div { will-change: transform }</style></head><body><div id="box" style="overflow-x:hidden; overflow-y:hidden; filter:blur(0px)"><div id="drawer" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('box'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  resetFilterProbe()
  // Decisive rects that read "held": the probe's fixed child lands on its box.
  const original = window.HTMLElement.prototype.getBoundingClientRect
  window.HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    return { top: 13, left: 17, right: 17, bottom: 13, width: 0, height: 0, x: 17, y: 13, toJSON() { return {} } } as DOMRect
  }
  try {
    assert.equal(isAnchorHidden(el('a')), false, 'the rule, not the filter, holds the child: inconclusive')
    el('rule').remove()
    assert.equal(isAnchorHidden(el('a')), true, 'without the rule the probe decides, so nothing was kept before')
  } finally {
    window.HTMLElement.prototype.getBoundingClientRect = original
    resetFilterProbe()
  }
})

test('both probe elements start with all: initial !important and mark every declaration !important', () => {
  // jsdom does not expand `all`, so only the declarations are checked here;
  // the browser pass measured page rules on both probe elements.
  setupDom('<!doctype html><html><body><div id="box" style="overflow-x:hidden; overflow-y:hidden; filter:blur(0px)"><div id="drawer" style="position:fixed"><div id="a"></div></div></div></body></html>')
  withMockedRect(el('box'), CARD)
  withMockedRect(el('drawer'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  resetFilterProbe()
  const probed: HTMLElement[] = []
  const original = window.HTMLElement.prototype.getBoundingClientRect
  window.HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    if (el('a').contains(this) && this !== el('a')) { probed.push(this) }
    return original.call(this)
  }
  try {
    isAnchorHidden(el('a'))
  } finally {
    window.HTMLElement.prototype.getBoundingClientRect = original
    resetFilterProbe()
  }
  assert.equal(probed.length, 2, 'the box and its child')
  for (const probe of probed) {
    assert.equal(probe.style.item(0), 'all')
    assert.equal(probe.style.getPropertyValue('all'), 'initial')
    // Without `!important`, a later declaration loses to the reset.
    for (let i = 0; i < probe.style.length; i++) {
      assert.equal(probe.style.getPropertyPriority(probe.style.item(i)), 'important', probe.style.item(i))
    }
  }
})

test('a positioned inline box still holds an absolute element', () => {
  setupDom('<!doctype html><html><body><div id="card" style="overflow-x:hidden; overflow-y:hidden"><span id="s" style="display:inline; position:relative"><div id="abs" style="position:absolute"><div id="a"></div></div></span></div></body></html>')
  withMockedRect(el('card'), CARD)
  withMockedRect(el('abs'), ON_SCREEN)
  withMockedRect(el('a'), ON_SCREEN)
  assert.equal(isAnchorHidden(el('a')), true)
})
