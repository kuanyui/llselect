import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('initial state shows placeholder in trigger', () => {
  const sel = new LLSelectSingle<string>(mount(), { placeholder: 'Pick one' })
  assert.equal(sel.triggerEl.textContent, 'Pick one')
  assert.equal(sel.getChosenItem(), undefined)
})

test('setChosenItem updates state, trigger label, and fires onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItem('b')
  assert.equal(sel.getChosenItem(), 'b')
  assert.equal(sel.triggerEl.textContent, 'b')
  assert.deepEqual(fired, ['b'])
})

test('data-empty attribute toggles between placeholder and chosen state (single)', () => {
  const sel = new LLSelectSingle<string>(mount())
  // Nothing chosen on construction -> placeholder shown -> data-empty='true'.
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true')
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'false')
  sel.setChosenItem(undefined)
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true')
})

test('setChosenItem with same value does not fire onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.setChosenItem('a')
  assert.deepEqual(fired, ['a'])
})

test('open renders one option element per option', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['x', 'y', 'z'])
  sel.open()
  const opts = sel.popupListEl.querySelectorAll('[role="option"]')
  assert.equal(opts.length, 3)
  assert.equal(opts[0]?.textContent, 'x')
  assert.equal(opts[2]?.textContent, 'z')
})

test('clicking trigger toggles open state', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  sel.triggerEl.click()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  assert.ok(sel.rootEl.classList.contains('llselect-open'))
  sel.triggerEl.click()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.ok(!sel.rootEl.classList.contains('llselect-open'))
})

test('clicking option selects it, closes popup, fires onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const second = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')[1]
  assert.ok(second)
  second.click()
  assert.equal(sel.getChosenItem(), 'b')
  assert.equal(sel.triggerEl.textContent, 'b')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(fired, ['b'])
})

test('setItems drops chosen if no longer present, fires onChange(undefined)', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.setItems(['b', 'c'])
  assert.equal(sel.getChosenItem(), undefined)
  assert.equal(sel.triggerEl.textContent, 'Please select')
  assert.deepEqual(fired, ['a', undefined])
})

test('setItems keeps chosen if still present', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.setItems(['a', 'c'])
  assert.equal(sel.getChosenItem(), 'a')
  assert.deepEqual(fired, ['a'])
})

test('compareFn enables object-typed options', () => {
  interface Item { id: number; label: string }
  const items: Item[] = [
    { id: 1, label: 'one' },
    { id: 2, label: 'two' },
  ]
  const sel = new LLSelectSingle<Item>(mount(), {
    compareFn: (a, b) => a.id === b.id,
  })
  sel.setItems(items)
  // Pass a fresh object with the same id; compareFn should consider it equal.
  sel.setChosenItem({ id: 2, label: 'two' })
  assert.equal(sel.getChosenItem()?.id, 2)
})

test('options array is defensively copied', () => {
  const sel = new LLSelectSingle<string>(mount())
  const arr = ['a', 'b']
  sel.setItems(arr)
  arr.push('c')
  assert.equal(sel.getItems().length, 2)
})

test('setChosenItem with undefined clears selection', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  sel.setChosenItem(undefined)
  assert.equal(sel.getChosenItem(), undefined)
  assert.equal(sel.triggerEl.textContent, 'Please select')
  assert.deepEqual(fired, ['a', undefined])
})
