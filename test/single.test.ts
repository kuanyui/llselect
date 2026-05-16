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

test('initial state shows placeholder in combobox', () => {
  const sel = new LLSelectSingle<string>(mount(), { placeholder: 'Pick one' })
  assert.equal(sel.comboboxEl.textContent, 'Pick one')
  assert.equal(sel.getChosen(), undefined)
})

test('setChosen updates state, combobox label, and fires onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a', 'b', 'c'])
  sel.setChosen('b')
  assert.equal(sel.getChosen(), 'b')
  assert.equal(sel.comboboxEl.textContent, 'b')
  assert.deepEqual(fired, ['b'])
})

test('setChosen with same value does not fire onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a', 'b'])
  sel.setChosen('a')
  sel.setChosen('a')
  assert.deepEqual(fired, ['a'])
})

test('setOptions renders one option element per option', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['x', 'y', 'z'])
  const opts = sel.listboxEl.querySelectorAll('[role="option"]')
  assert.equal(opts.length, 3)
  assert.equal(opts[0]?.textContent, 'x')
  assert.equal(opts[2]?.textContent, 'z')
})

test('clicking combobox toggles open state', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  sel.comboboxEl.click()
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'true')
  assert.ok(sel.rootEl.classList.contains('llselect-open'))
  sel.comboboxEl.click()
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  assert.ok(!sel.rootEl.classList.contains('llselect-open'))
})

test('clicking option selects it, closes listbox, fires onChange', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a', 'b', 'c'])
  sel.open()
  const second = sel.listboxEl.querySelectorAll<HTMLElement>('[role="option"]')[1]
  assert.ok(second)
  second.click()
  assert.equal(sel.getChosen(), 'b')
  assert.equal(sel.comboboxEl.textContent, 'b')
  assert.equal(sel.comboboxEl.getAttribute('aria-expanded'), 'false')
  assert.deepEqual(fired, ['b'])
})

test('setOptions drops chosen if no longer present, fires onChange(undefined)', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a', 'b'])
  sel.setChosen('a')
  sel.setOptions(['b', 'c'])
  assert.equal(sel.getChosen(), undefined)
  assert.equal(sel.comboboxEl.textContent, 'Please select')
  assert.deepEqual(fired, ['a', undefined])
})

test('setOptions keeps chosen if still present', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a', 'b'])
  sel.setChosen('a')
  sel.setOptions(['a', 'c'])
  assert.equal(sel.getChosen(), 'a')
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
  sel.setOptions(items)
  // Pass a fresh object with the same id; compareFn should consider it equal.
  sel.setChosen({ id: 2, label: 'two' })
  assert.equal(sel.getChosen()?.id, 2)
})

test('options array is defensively copied', () => {
  const sel = new LLSelectSingle<string>(mount())
  const arr = ['a', 'b']
  sel.setOptions(arr)
  arr.push('c')
  assert.equal(sel.getOptions().length, 2)
})

test('setChosen with undefined clears selection', () => {
  const fired: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), { onChange: v => fired.push(v) })
  sel.setOptions(['a'])
  sel.setChosen('a')
  sel.setChosen(undefined)
  assert.equal(sel.getChosen(), undefined)
  assert.equal(sel.comboboxEl.textContent, 'Please select')
  assert.deepEqual(fired, ['a', undefined])
})
