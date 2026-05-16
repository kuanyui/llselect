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
  assert.equal(target.textContent, '')
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

test('popup list is the only child of popup wrapper initially', () => {
  const inst = new TestSelect<string>(mount())
  const popupChildren = Array.from(inst.popupEl.children)
  assert.equal(popupChildren.length, 1)
  assert.equal(popupChildren[0], inst.popupListEl)
})

test('trigger and popup are children of rootEl in order', () => {
  const inst = new TestSelect<string>(mount())
  const children = Array.from(inst.rootEl.children)
  assert.equal(children.length, 2)
  assert.equal(children[0], inst.triggerEl)
  assert.equal(children[1], inst.popupEl)
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
