import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('initial state: empty chosen, placeholder, no aria-selected items', () => {
  const sel = new LLSelectMultiple<string>(mount(), { placeholder: 'Pick' })
  assert.deepEqual([...sel.getChosen()], [])
  assert.equal(sel.triggerContentEl.textContent, 'Pick')
})

test('popup list has aria-multiselectable="true"', () => {
  const sel = new LLSelectMultiple<string>(mount())
  assert.equal(sel.popupListEl.getAttribute('aria-multiselectable'), 'true')
})

test('toggleItem adds and removes', () => {
  const fired: Array<readonly string[]> = []
  const sel = new LLSelectMultiple<string>(mount(), { onChange: v => fired.push([...v]) })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('b')
  assert.deepEqual([...sel.getChosen()], ['b'])
  sel.toggleItem('a')
  assert.deepEqual([...sel.getChosen()], ['b', 'a'])
  sel.toggleItem('b')
  assert.deepEqual([...sel.getChosen()], ['a'])
  assert.equal(fired.length, 3)
})

test('isChosen reflects state', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.toggleItem('a')
  assert.equal(sel.isChosen('a'), true)
  assert.equal(sel.isChosen('b'), false)
})

test('setChosen replaces; onChange fires only when actually different', () => {
  const fired: Array<readonly string[]> = []
  const sel = new LLSelectMultiple<string>(mount(), { onChange: v => fired.push([...v]) })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosen(['a', 'c'])
  sel.setChosen(['a', 'c'])  // same: no fire
  assert.deepEqual([...sel.getChosen()], ['a', 'c'])
  assert.equal(fired.length, 1)
})

test('selectAll / deselectAll / toggleAll', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.selectAll()
  assert.deepEqual([...sel.getChosen()], ['a', 'b', 'c'])
  sel.deselectAll()
  assert.deepEqual([...sel.getChosen()], [])
  sel.toggleAll()
  assert.deepEqual([...sel.getChosen()], ['a', 'b', 'c'])
  sel.toggleAll()
  assert.deepEqual([...sel.getChosen()], [])
})

test('trigger content: 0 → placeholder, partial → "n / m", full → "All n"', () => {
  const sel = new LLSelectMultiple<string>(mount(), { placeholder: 'Pick' })
  sel.setItems(['a', 'b', 'c'])
  assert.equal(sel.triggerContentEl.textContent, 'Pick')
  sel.toggleItem('a')
  assert.equal(sel.triggerContentEl.textContent, '1 / 3 selected')
  sel.toggleItem('b')
  sel.toggleItem('c')
  assert.equal(sel.triggerContentEl.textContent, 'All 3 selected')
})

test('clicking item toggles and keeps popup open', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  const first = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  first.click()
  assert.deepEqual([...sel.getChosen()], ['a'])
  // popup stays open
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('items carry aria-selected reflecting chosen state', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('b')
  sel.open()
  const opts = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(opts[0]?.getAttribute('aria-selected'), 'false')
  assert.equal(opts[1]?.getAttribute('aria-selected'), 'true')
  assert.equal(opts[2]?.getAttribute('aria-selected'), 'false')
})

test('aria-selected updates after toggleItem while open', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  sel.toggleItem('a')
  const opts = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(opts[0]?.getAttribute('aria-selected'), 'true')
})

test('setItems drops chosen entries no longer present, fires onChange', () => {
  const fired: Array<readonly string[]> = []
  const sel = new LLSelectMultiple<string>(mount(), { onChange: v => fired.push([...v]) })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosen(['a', 'b'])
  sel.setItems(['b', 'c'])  // 'a' drops
  assert.deepEqual([...sel.getChosen()], ['b'])
  // fired: setChosen + afterItemsChange
  assert.equal(fired.length, 2)
})

test('focusInitial on open focuses first chosen item if any', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('b')
  sel.open()
  const focused = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  assert.equal(focused?.textContent, 'b')
})

test('focusInitial on open with empty chosen focuses first item', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['x', 'y'])
  sel.open()
  const focused = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  assert.equal(focused?.textContent, 'x')
})

test('object items work via compareFn', () => {
  interface Item { id: number; label: string }
  const sel = new LLSelectMultiple<Item>(mount(), {
    compareFn: (a, b) => a.id === b.id,
  })
  sel.setItems([{ id: 1, label: 'one' }, { id: 2, label: 'two' }])
  sel.toggleItem({ id: 2, label: 'two' })
  assert.equal(sel.isChosen({ id: 2, label: 'different label' }), true)
  assert.equal(sel.isChosen({ id: 1, label: 'one' }), false)
})
