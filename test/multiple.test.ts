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
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(sel.triggerContentEl.textContent, 'Pick')
})

test('PERFORMANCE-72: isChosen is correct and its default-compareFn Set invalidates on a chosen change', () => {
  const a = { id: 1 }, b = { id: 2 }, c = { id: 3 }
  const sel = new LLSelectMultiple<{ id: number }>(mount(), { ariaLabel: 'x' })
  sel.setItems([a, b, c])
  sel.setChosenItems([a])
  assert.equal(sel.isChosen(a), true)
  assert.equal(sel.isChosen(b), false)
  sel.setChosenItems([a, b]) // chosen array replaced -> the memoized Set must rebuild
  assert.equal(sel.isChosen(b), true, 'a chosen change must invalidate the cache')
  assert.equal(sel.isChosen(c), false)
  sel.toggleItem(a) // replaces the array again
  assert.equal(sel.isChosen(a), false, 'toggleItem invalidates the cache')
})

test('PERFORMANCE-72: a custom compareFn still resolves isChosen by value (linear path)', () => {
  const sel = new LLSelectMultiple<{ id: number }>(mount(), { ariaLabel: 'x', compareFn: (x, y) => x.id === y.id })
  sel.setItems([{ id: 1 }, { id: 2 }])
  sel.setChosenItems([{ id: 1 }])
  assert.equal(sel.isChosen({ id: 1 }), true, 'a custom compareFn matches a fresh equal object')
  assert.equal(sel.isChosen({ id: 2 }), false)
})

test('data-empty attribute toggles between placeholder and chosen state (multi)', () => {
  const sel = new LLSelectMultiple<string>(mount())
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true')
  sel.setItems(['a', 'b'])
  sel.toggleItem('a')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'false')
  sel.toggleItem('a')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true')
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
  assert.deepEqual([...sel.getChosenItems()], ['b'])
  sel.toggleItem('a')
  assert.deepEqual([...sel.getChosenItems()], ['b', 'a'])
  sel.toggleItem('b')
  assert.deepEqual([...sel.getChosenItems()], ['a'])
  assert.equal(fired.length, 3)
})

test('isChosen reflects state', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.toggleItem('a')
  assert.equal(sel.isChosen('a'), true)
  assert.equal(sel.isChosen('b'), false)
})

test('setChosenItems replaces; onChange fires only when actually different', () => {
  const fired: Array<readonly string[]> = []
  const sel = new LLSelectMultiple<string>(mount(), { onChange: v => fired.push([...v]) })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  sel.setChosenItems(['a', 'c'])  // same: no fire
  assert.deepEqual([...sel.getChosenItems()], ['a', 'c'])
  assert.equal(fired.length, 1)
})

test('chooseAll / unchooseAll / toggleAll', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.chooseAll()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
  sel.unchooseAll()
  assert.deepEqual([...sel.getChosenItems()], [])
  sel.toggleAll()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
  sel.toggleAll()
  assert.deepEqual([...sel.getChosenItems()], [])
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

test('uiTranslationPack.triggerCountSummary customizes the count summary text', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    placeholder: 'Pick',
    uiTranslationPack: { triggerCountSummary: (chosenCount, totalCount) => `${chosenCount} of ${totalCount}` },
  })
  sel.setItems(['a', 'b', 'c'])
  assert.equal(sel.triggerContentEl.textContent, 'Pick') // 0 chosen -> placeholder, not the summary
  sel.toggleItem('a')
  assert.equal(sel.triggerContentEl.textContent, '1 of 3')
})

test('clicking item toggles and keeps popup open', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  const first = sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!
  first.click()
  assert.deepEqual([...sel.getChosenItems()], ['a'])
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
  sel.setChosenItems(['a', 'b'])
  sel.setItems(['b', 'c'])  // 'a' drops
  assert.deepEqual([...sel.getChosenItems()], ['b'])
  // fired: setChosenItems + onItemsChanged
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

test('toggleItem re-renders only the toggled item element, not the whole list', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const before = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  const elA = before[0]!
  const elB = before[1]!
  const elC = before[2]!

  sel.toggleItem('b')  // only 'b' changes

  const after = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  // a and c elements are the SAME nodes (not recreated)
  assert.equal(after[0], elA)
  assert.equal(after[2], elC)
  // b element was replaced
  assert.notEqual(after[1], elB)
  // and the new b reflects selection
  assert.equal(after[1]?.getAttribute('aria-selected'), 'true')
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

test('setChosenItems dedups: duplicates collapse to the first occurrence', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b', 'a', 'a'])
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'])
  sel.toggleItem('a')
  assert.deepEqual([...sel.getChosenItems()], ['b'], 'one toggle must fully unchoose a')
})

test('setItems swaps chosen references to compareFn-equal new objects; tags refresh, no onChange', () => {
  interface Item { id: number; name: string }
  const fired: Item[][] = []
  const sel = new LLSelectMultiple<Item>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (i) => i.name,
    triggerDisplay: 'tags',
    onChange: v => fired.push(v.slice()),
  })
  sel.setItems([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
  sel.setChosenItems([{ id: 1, name: 'Alice' }])
  fired.length = 0
  const alicia = { id: 1, name: 'Alicia' }
  sel.setItems([alicia, { id: 2, name: 'Bob' }])
  assert.equal(sel.getChosenItems()[0], alicia, 'the chosen reference must be the new list object')
  assert.equal(sel.triggerEl.textContent?.includes('Alicia'), true, 'the tag must show the fresh fields')
  assert.deepEqual(fired, [], 'a reference swap must not fire onChange')
})

test('setChosenItems dedups via a custom compareFn, not identity', () => {
  const sel = new LLSelectMultiple<{ id: number }>(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems([{ id: 1 }, { id: 2 }])
  sel.setChosenItems([{ id: 1 }, { id: 1 }, { id: 2 }])
  assert.deepEqual(sel.getChosenItems().map(i => i.id), [1, 2])
})

test('MEDIUM-93: setItems refreshes the trigger - the count total, and custom content that reads items', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerEl.textContent, '1 / 2 selected')
  sel.setItems(['a', 'b', 'c'])
  assert.equal(sel.triggerEl.textContent, '1 / 3 selected', 'the total follows the new list')

  let contentRenders = 0
  let arrowRenders = 0
  const custom = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    createTriggerContentElFn: (ctx) => {
      contentRenders++
      const el = document.createElement('span')
      el.textContent = `${ctx.chosenItems.length} of ${ctx.items.length}`
      return el
    },
    createTriggerArrowContentElFn: () => { arrowRenders++; return null },
  })
  const contentBefore = contentRenders
  const arrowBefore = arrowRenders
  custom.setItems(['a', 'b'])
  assert.equal(custom.triggerEl.textContent, '0 of 2')
  custom.setItems(['a', 'b', 'c'])
  assert.equal(custom.triggerEl.textContent, '0 of 3', 'custom content sees the new list even with nothing chosen')
  assert.equal(contentRenders, contentBefore + 2, 'exactly one content render per setItems')
  assert.equal(arrowRenders, arrowBefore, 'setItems does not re-render the arrow')
})

test('MEDIUM-93: render counts per setItems branch - swap: content only; drop: the whole trigger', () => {
  let content = 0
  let arrow = 0
  const sel = new LLSelectMultiple<{ id: number }>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    createTriggerContentElFn: () => { content++; return null },
    createTriggerArrowContentElFn: () => { arrow++; return null },
  })
  sel.setItems([{ id: 1 }, { id: 2 }])
  sel.setChosenItems([{ id: 1 }])
  const c0 = content
  const a0 = arrow
  sel.setItems([{ id: 1 }, { id: 2 }]) // fresh equal objects: a reference swap
  assert.equal(content, c0 + 1, 'swap: exactly one content render')
  assert.equal(arrow, a0, 'swap: no arrow render')
  sel.setItems([{ id: 2 }]) // drops the chosen item: a value change, so the whole trigger
  assert.equal(content, c0 + 2, 'drop: exactly one content render')
  assert.equal(arrow, a0 + 1, 'drop: the arrow renders with the whole trigger')
  assert.deepEqual(sel.getChosenItems(), [])
})
