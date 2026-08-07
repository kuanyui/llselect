import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectBase } from '../src/base.js'

// Concrete subclass purely so tests can instantiate the abstract base.
class TestSelect<T> extends LLSelectBase<T> {}

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount">old content</div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el, 'mount element should exist')
  return el
}

test('target element becomes rootEl', () => {
  const target = mount()
  const inst = new TestSelect<string>(target)
  assert.equal(inst.rootEl, target)
})

test('rootEl has default root class', () => {
  const inst = new TestSelect<string>(mount())
  assert.ok(inst.rootEl.classList.contains('llselect-root'))
})

test('existing content in target is wiped', () => {
  const target = mount()
  assert.equal(target.textContent, 'old content')
  new TestSelect<string>(target)
  // The caller's prior content is gone; what remains is only library-built
  // structure (e.g. the hidden no-results message's text).
  assert.equal(target.textContent!.includes('old content'), false)
})

test('trigger has correct ARIA attributes', () => {
  const inst = new TestSelect<string>(mount())
  const cb = inst.triggerEl
  assert.equal(cb.getAttribute('role'), 'combobox')
  assert.equal(cb.getAttribute('tabindex'), '0')
  assert.equal(cb.getAttribute('aria-expanded'), 'false')
  assert.equal(cb.getAttribute('aria-haspopup'), 'listbox')
  assert.equal(cb.getAttribute('aria-controls'), inst.popupListEl.id)
  assert.ok(cb.className.includes('llselect-trigger'))
})

test('popup wrapper has no ARIA role', () => {
  const inst = new TestSelect<string>(mount())
  assert.equal(inst.popupEl.getAttribute('role'), null)
  assert.ok(inst.popupEl.className.includes('llselect-popup'))
})

test('popup list has correct ARIA attributes', () => {
  const inst = new TestSelect<string>(mount())
  const lb = inst.popupListEl
  assert.equal(lb.getAttribute('role'), 'listbox')
  assert.equal(lb.getAttribute('tabindex'), '-1')
  assert.ok(lb.className.includes('llselect-popup-list'))
})

test('popup contains the (hidden) filter input, the popup list, and the no-results message, in order', () => {
  const inst = new TestSelect<string>(mount())
  const popupChildren = Array.from(inst.popupEl.children) as HTMLElement[]
  assert.equal(popupChildren.length, 3)
  // The filter input is always built (see docs/llm/DESIGN.md) but `hidden` when
  // the filter is inactive. The listbox follows it; the no-results message
  // (also always built, `hidden` while items are visible) comes last.
  assert.equal(popupChildren[0]!.tagName, 'INPUT')
  assert.equal(popupChildren[0]!.hidden, true)
  assert.equal(popupChildren[1], inst.popupListEl)
  assert.ok(popupChildren[2]!.classList.contains(inst.classIdMap.popupListNoResultsClass))
  assert.equal(popupChildren[2]!.hidden, true)
})

test('trigger, hidden value span, and popup are children of rootEl in order', () => {
  const inst = new TestSelect<string>(mount())
  const children = Array.from(inst.rootEl.children) as HTMLElement[]
  assert.equal(children.length, 3)
  assert.equal(children[0], inst.triggerEl)
  // The accessible-name value mirror (docs/llm/A11Y.md "Accessible name"): root
  // level so triggerEl.textContent stays the visible content only.
  assert.equal(children[1]!.id, inst.classIdMap.triggerValueId)
  assert.equal(children[1]!.hidden, true)
  assert.equal(children[2], inst.popupEl)
})

test('item elements do NOT carry a `title` attribute by default (avoids fighting third-party tooltip libs)', () => {
  const inst = new TestSelect<string>(mount())
  inst.setItems(['short', 'a very long label that may get truncated in narrow popups'])
  inst.open()
  const items = inst.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(items.length, 2)
  assert.equal(items[0]!.hasAttribute('title'), false)
  assert.equal(items[1]!.hasAttribute('title'), false)
})

test('destroy while OPEN detaches the document listeners and empties the mount', () => {
  const target = mount()
  const closes: number[] = []
  const inst = new TestSelect<string>(target, { onClose: () => closes.push(1) })
  inst.setItems(['a', 'b'])
  inst.open()
  inst.destroy()
  assert.deepEqual(closes, [1]) // destroy closed the popup once
  assert.equal(target.children.length, 0)
  assert.equal(target.classList.contains('llselect-root'), false)
  assert.equal(target.style.overflowAnchor, '')
  // The outside-click listener must be gone: an outside mousedown neither
  // throws nor re-fires onClose.
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  assert.deepEqual(closes, [1])
})

test('destroy is idempotent and safe on a closed instance', () => {
  const target = mount()
  const inst = new TestSelect<string>(target)
  inst.setItems(['a'])
  inst.destroy()
  inst.destroy() // second call: no throw, still clean
  assert.equal(target.children.length, 0)
})

test('IDs are unique across multiple instances', () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const a = document.getElementById('a')
  const b = document.getElementById('b')
  assert.ok(a && b)
  const ia = new TestSelect<string>(a)
  const ib = new TestSelect<string>(b)
  assert.notEqual(ia.triggerEl.id, ib.triggerEl.id)
  assert.notEqual(ia.popupListEl.id, ib.popupListEl.id)
})

test('custom cssClassPrefix is honored', () => {
  const inst = new TestSelect<string>(mount(), { cssClassPrefix: 'myprefix' })
  assert.ok(inst.rootEl.classList.contains('myprefix-root'))
  assert.ok(inst.triggerEl.className.includes('myprefix-trigger'))
  assert.ok(inst.popupEl.className.includes('myprefix-popup'))
  assert.ok(inst.triggerEl.id.startsWith('myprefix'))
})
