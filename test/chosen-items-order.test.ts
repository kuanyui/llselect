import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'

// chosenItemsOrder: 'as-chosen' (default) keeps the choice order; 'as-listed'
// follows the item list. Ruling: docs/llm/DESIGN.md "chosenItemsOrder".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function tagTexts(sel: LLSelectMultiple<string>): string[] {
  return Array.from(sel.triggerEl.querySelectorAll(`.${sel.classIdMap.tagClass}`)).map((el) => (el.textContent ?? '').trim())
}

test('as-chosen (default): toggles append; setChosenItems keeps the caller order', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('c')
  sel.toggleItem('a')
  assert.deepEqual(sel.getChosenItems(), ['c', 'a'])
  sel.setChosenItems(['b', 'a'])
  assert.deepEqual(sel.getChosenItems(), ['b', 'a'])
})

test('as-listed: toggles land in list order; tags render in that order', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed', triggerDisplay: 'tags' })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('c')
  sel.toggleItem('a')
  assert.deepEqual(sel.getChosenItems(), ['a', 'c'])
  assert.deepEqual(tagTexts(sel), ['a', 'c'])
  sel.toggleItem('c')
  assert.deepEqual(sel.getChosenItems(), ['a'])
})

test('as-listed: setChosenItems stores list order; onChange sees it; a same-set write in another order is a no-op', () => {
  const seen: (readonly string[])[] = []
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed', onChange: (chosen) => { seen.push(chosen) } })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['c', 'a', 'b'])
  assert.deepEqual(sel.getChosenItems(), ['a', 'b', 'c'])
  assert.deepEqual(seen, [['a', 'b', 'c']])
  sel.setChosenItems(['b', 'c', 'a'])
  assert.equal(seen.length, 1)
})

test('as-listed: an unlisted chosen item goes last, in chosen order', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['z', 'c', 'y', 'a'])
  assert.deepEqual(sel.getChosenItems(), ['a', 'c', 'z', 'y'])
})

test('as-listed: setItems in a new order reorders the chosen items and fires onChange once; the same order is silent', () => {
  const seen: (readonly string[])[] = []
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed', onChange: (chosen) => { seen.push(chosen) } })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  assert.equal(seen.length, 1)
  sel.setItems(['c', 'b', 'a'])
  assert.deepEqual(sel.getChosenItems(), ['c', 'a'])
  assert.equal(seen.length, 2)
  sel.setItems(['c', 'b', 'a', 'd'])
  assert.equal(seen.length, 2)
})

test('as-listed: chooseAll yields list order; a custom compareFn sorts by identity match', () => {
  type Row = { id: number }
  const items: Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }]
  const sel = new LLSelectMultiple<Row>(mount(), { chosenItemsOrder: 'as-listed', compareFn: (a, b) => a.id === b.id })
  sel.setItems(items)
  sel.setChosenItems([{ id: 3 }, { id: 1 }])
  assert.deepEqual(sel.getChosenItems().map((r) => r.id), [1, 3])
  sel.chooseAll()
  assert.deepEqual(sel.getChosenItems().map((r) => r.id), [1, 2, 3])
})

test('as-chosen (default): a setItems reorder keeps the chosen order and stays silent', () => {
  const seen: (readonly string[])[] = []
  const sel = new LLSelectMultiple<string>(mount(), { onChange: (chosen) => { seen.push(chosen) } })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['c', 'a'])
  sel.setItems(['b', 'a', 'c'])
  assert.deepEqual(sel.getChosenItems(), ['c', 'a'])
  assert.equal(seen.length, 1)
})

test('as-listed: a reorder-triggered onChange reports source api; the next setItems drops the unlisted item', () => {
  const sources: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed', onChange: (_chosen, _previous, meta) => { sources.push(meta.source) } })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['z', 'c', 'a'])
  assert.deepEqual(sel.getChosenItems(), ['a', 'c', 'z'])
  sel.setItems(['c', 'b', 'a'])
  assert.deepEqual(sel.getChosenItems(), ['c', 'a'])
  assert.deepEqual(sources, ['api', 'api'])
})

test('as-listed with hideChosenRows: rows hide by membership; the chosen order follows the list', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chosenItemsOrder: 'as-listed', hideChosenRows: true })
  sel.setItems(['a', 'b', 'c', 'd'])
  sel.toggleItem('d')
  sel.toggleItem('b')
  assert.deepEqual(sel.getChosenItems(), ['b', 'd'])
  sel.open()
  const rows = Array.from(sel.popupListEl.querySelectorAll(`.${sel.classIdMap.popupListRowClass}`)).map((el) => el.textContent)
  assert.deepEqual(rows, ['a', 'c'])
})

test('as-listed with a custom compareFn: a setItems reorder re-sorts the chosen items', () => {
  type Row = { id: number }
  const sel = new LLSelectMultiple<Row>(mount(), { chosenItemsOrder: 'as-listed', compareFn: (a, b) => a.id === b.id })
  sel.setItems([{ id: 1 }, { id: 2 }, { id: 3 }])
  sel.setChosenItems([{ id: 3 }, { id: 1 }])
  sel.setItems([{ id: 3 }, { id: 2 }, { id: 1 }])
  assert.deepEqual(sel.getChosenItems().map((r) => r.id), [3, 1])
})

test('as-listed: the rows of an open popup re-render after a setItems reorder, so content that reads the chosen order is fresh', () => {
  const sel: LLSelectMultiple<string> = new LLSelectMultiple<string>(mount(), {
    chosenItemsOrder: 'as-listed',
    createPopupListItemContentElFn: (item) => {
      const el = document.createElement('span')
      el.textContent = `${item}:${sel.getChosenItems().indexOf(item)}`
      return el
    },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  sel.open()
  sel.setItems(['b', 'a'])
  const texts = Array.from(sel.popupListEl.querySelectorAll(`.${sel.classIdMap.popupListRowClass}`)).map((el) => el.textContent)
  assert.deepEqual(texts, ['b:0', 'a:1'])
})
