import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

interface Item { id: number; name: string }

class ItemSelect extends LLSelectSingle<Item> {
  override templateItem(item: Item): string { return item.name }
}

class ItemMultiSelect extends LLSelectMultiple<Item> {
  override templateItem(item: Item): string { return item.name }
}

test('rerender picks up trigger text after mutating chosen item (single)', () => {
  const user = { id: 1, name: 'Alice' }
  const sel = new ItemSelect(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems([user])
  sel.setChosen(user)
  assert.equal(sel.triggerContentEl.textContent, 'Alice')

  user.name = 'Alicia'
  // Without rerender, the DOM is stale.
  assert.equal(sel.triggerContentEl.textContent, 'Alice')

  sel.rerender()
  assert.equal(sel.triggerContentEl.textContent, 'Alicia')
})

test('rerender picks up popup item text after mutation (single, open)', () => {
  const items = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
  const sel = new ItemSelect(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems(items)
  sel.open()

  items[0]!.name = 'Alicia'
  let opts = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(opts[0]?.textContent, 'Alice')  // stale

  sel.rerender()
  opts = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(opts[0]?.textContent, 'Alicia')
})

test('rerender does not fire onChange', () => {
  const fired: number[] = []
  const sel = new ItemSelect(mount(), {
    compareFn: (a, b) => a.id === b.id,
    onChange: () => { fired.push(1) },
  })
  const user = { id: 1, name: 'Alice' }
  sel.setItems([user])
  sel.setChosen(user)
  fired.length = 0  // reset after setChosen
  user.name = 'Alicia'
  sel.rerender()
  assert.deepEqual(fired, [])
})

test('rerender works in multi mode', () => {
  const items = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
  const sel = new ItemMultiSelect(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems(items)
  sel.open()
  items[1]!.name = 'Bobby'
  sel.rerender()
  const opts = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(opts[1]?.textContent, 'Bobby')
})

test('rerender on closed popup updates trigger only (no DOM error)', () => {
  const user = { id: 1, name: 'X' }
  const sel = new ItemSelect(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems([user])
  sel.setChosen(user)
  // popup is closed
  user.name = 'Y'
  sel.rerender()
  assert.equal(sel.triggerContentEl.textContent, 'Y')
})
