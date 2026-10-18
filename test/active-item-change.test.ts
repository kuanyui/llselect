import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// onActiveItemChange: the active row (the aria-activedescendant row) moved to
// another item, or to no item. Contract: docs/llm/DESIGN.md "Active item
// change", A11Y.md "Focus".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
}

const show = (item: string | undefined): string => `active:${item === undefined ? '-' : item}`

test('open reports the initial item after onOpen; close reports no item after onClose', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onActiveItemChange: (item) => { log.push(show(item)) },
    onOpen: () => { log.push('open') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItem('b')
  sel.open() // the initial row is the chosen item
  sel.close()
  assert.deepEqual(log, ['open', 'active:b', 'close', 'active:-'])
})

test('a listener that closes the widget during open, or reopens it during close, runs after the outer transition completed', () => {
  const log: string[] = []
  let closeOnReport = true
  let reopenOnReport = false
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onActiveItemChange: (item) => {
      log.push(show(item))
      if (item !== undefined && closeOnReport) { closeOnReport = false; sel.close() }
      if (item === undefined && reopenOnReport) { reopenOnReport = false; sel.open() }
    },
    onOpen: () => { log.push('open') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.deepEqual(log, ['open', 'active:a', 'close', 'active:-'])
  assert.equal(sel.isOpened(), false)
  log.length = 0
  sel.open()
  reopenOnReport = true
  sel.close()
  assert.deepEqual(log, ['open', 'active:a', 'close', 'active:-', 'open', 'active:a'])
  assert.equal(sel.isOpened(), true)
})

test('an onOpen hook that closes the popup: no focus moves into the hidden popup and no report follows', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    onActiveItemChange: (item) => { log.push(show(item)) },
    onOpen: () => { log.push('open'); sel.close() },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b'])
  sel.triggerEl.focus()
  sel.open()
  assert.deepEqual(log, ['open', 'close'])
  assert.equal(document.activeElement, sel.triggerEl)
})

test('choose-all and action-row clicks activate nothing when a listener closed the popup', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    chooseAllRow: true,
    popupListTrailingActionRows: [{ textFn: () => 'Clear all', onActivate: () => { log.push('activate') } }],
    onActiveItemChange: (item) => { log.push(show(item)); if (item === undefined) { sel.close() } },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  key(sel.triggerEl, 'ArrowDown') // a
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!.click()
  assert.deepEqual(log, ['active:a', 'active:-'])
  assert.deepEqual(sel.getChosenItems(), [], 'the choose-all row did not toggle')
  log.length = 0
  sel.open()
  key(sel.triggerEl, 'ArrowDown') // a
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListActionRowClass}`)!.click()
  assert.deepEqual(log, ['active:a', 'active:-'], 'the action row did not run')
})

test('a click whose listener re-rendered the widget or changed the value activates nothing', () => {
  const log: string[] = []
  let reaction: 'rerender' | 'change' = 'rerender'
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onActiveItemChange: (item) => {
      log.push(show(item))
      if (item !== 'b') { return }
      if (reaction === 'rerender') { sel.rerender() } else { sel.setChosenItem('a') }
    },
    onChange: (item) => { log.push(`change:${item}`) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  const rowB = (): HTMLElement => sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')[1]!
  rowB().click()
  assert.deepEqual(log, ['active:a', 'active:b'])
  assert.equal(sel.getChosenItem(), undefined, 'the rebuilt widget got no pick')
  reaction = 'change'
  key(sel.triggerEl, 'ArrowUp') // a, so the next click moves the row again
  rowB().click()
  assert.deepEqual(log, ['active:a', 'active:b', 'active:a', 'active:b', 'change:a'])
  assert.equal(sel.getChosenItem(), 'a', 'the listener\'s value stands; the click did not override it')
})

test('a filter keystroke whose listener re-rendered the widget still reports the query change, since the query stands', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    onActiveItemChange: (item) => { log.push(show(item)); if (item === 'banana') { sel.rerender() } },
    onFilterQueryChange: (query) => { log.push(`query:${query}`) },
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'b'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(log, ['active:apple', 'active:banana', 'query:b'])
  assert.equal(sel.getFilterQuery(), 'b')
})

test('an Esc-clear of the filter whose listener closed the popup reports no query change', () => {
  const log: string[] = []
  let armed = false
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    onActiveItemChange: (item) => { log.push(show(item)); if (armed && item === 'apple') { armed = false; sel.close() } },
    onFilterQueryChange: (query) => { log.push(`query:${query}`) },
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'b'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  armed = true
  key(input, 'Escape') // clears the query: the list shows every item, the row lands on apple, the listener closes
  assert.deepEqual(log, ['active:apple', 'active:banana', 'query:b', 'active:apple', 'active:-'])
  assert.equal(sel.isOpened(), false)
})

test('a click whose listener closed the popup activates nothing; a filter keystroke whose listener closed it reports no query change', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    onActiveItemChange: (item) => { log.push(show(item)); if (item === 'banana') { sel.close() } },
    onChange: (item) => { log.push(`change:${item}`) },
    onFilterQueryChange: (query) => { log.push(`query:${query}`) },
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')[1]!.click()
  assert.deepEqual(log, ['active:apple', 'active:banana', 'active:-'])
  assert.equal(sel.getChosenItem(), undefined)
  log.length = 0
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'b'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(log, ['active:apple', 'active:banana', 'active:-'])
  assert.equal(sel.getFilterQuery(), '')
})

test('arrow, Home / End and page moves report each landing once; a move that stays put reports nothing', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  key(sel.triggerEl, 'ArrowDown')
  key(sel.triggerEl, 'ArrowDown')
  key(sel.triggerEl, 'ArrowDown') // clamped at the end: no move
  key(sel.triggerEl, 'Home')
  key(sel.triggerEl, 'End')
  key(sel.triggerEl, 'PageUp')
  assert.deepEqual(log, ['active:a', 'active:b', 'active:c', 'active:a', 'active:c', 'active:a'])
})

test('the choose-all row and an action row report no item; moving back onto an item reports it', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    chooseAllRow: true,
    popupListTrailingActionRows: [{ textFn: () => 'Clear all', onActivate: () => {} }],
    onActiveItemChange: (item) => { log.push(show(item)) },
  })
  sel.setItems(['a', 'b'])
  sel.open() // nothing chosen: the initial row is the choose-all row
  assert.deepEqual(log, [])
  key(sel.triggerEl, 'ArrowDown') // a
  key(sel.triggerEl, 'ArrowDown') // b
  key(sel.triggerEl, 'ArrowDown') // the action row
  key(sel.triggerEl, 'ArrowUp') // b
  key(sel.triggerEl, 'Home') // the choose-all row
  assert.deepEqual(log, ['active:a', 'active:b', 'active:-', 'active:b', 'active:-'])
})

test('a filter keystroke reports the first match once, with no transient "no item"; no match reports no item once', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', filterable: true, onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['apple', 'banana', 'cherry'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  const type = (q: string): void => { input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })) }
  type('b')
  type('ba') // still banana: nothing
  type('zzz')
  type('zzzz') // still nothing: nothing
  type('')
  assert.deepEqual(log, ['active:apple', 'active:banana', 'active:-', 'active:apple'])
})

test('an in-place row rebuild for the same item is silent: a toggle in multiple mode, rerender(), setItems with the same item', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  key(sel.triggerEl, 'Enter') // toggles a: its row is rebuilt in place
  sel.rerender()
  sel.setItems(['a', 'b']) // a stays at index 0
  assert.deepEqual(log, ['active:a'])
  sel.setItems(['x', 'y']) // index 0 now holds another item
  assert.deepEqual(log, ['active:a', 'active:x'])
})

test('compareFn decides sameness: equal-key objects from a reload do not fire', () => {
  const log: string[] = []
  type Item = { id: number; name: string }
  const sel = new LLSelectSingle<Item>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (i) => i.name,
    onActiveItemChange: (item) => { log.push(show(item?.name)) },
  })
  sel.setItems([{ id: 1, name: 'one' }, { id: 2, name: 'two' }])
  sel.open()
  sel.setItems([{ id: 1, name: 'one!' }, { id: 2, name: 'two!' }])
  assert.deepEqual(log, ['active:one'])
})

test('a click reports the clicked item before the change it requests', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onActiveItemChange: (item) => { log.push(show(item)) },
    onChange: (item) => { log.push(`change:${item}`) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')[1]!.click()
  assert.deepEqual(log, ['active:a', 'active:b', 'change:b', 'active:-'])
})

test('hideChosenRows: choosing the active item removes its row and reports the row the clamp lands on', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', hideChosenRows: true, onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  key(sel.triggerEl, 'ArrowDown') // b
  key(sel.triggerEl, 'Enter') // chooses b: its row leaves, the clamp keeps index 1, now c
  assert.deepEqual(log, ['active:a', 'active:b', 'active:c'])
})

test('destroy() while open reports no item; a listener that closes the widget re-enters with the right baseline', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.destroy()
  assert.deepEqual(log, ['active:a', 'active:-'])

  const log2: string[] = []
  const closing = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onActiveItemChange: (item) => {
      log2.push(show(item))
      if (item === 'b') { closing.close() }
    },
  })
  closing.setItems(['a', 'b'])
  closing.open()
  key(closing.triggerEl, 'ArrowDown')
  assert.deepEqual(log2, ['active:a', 'active:b', 'active:-'])
  assert.equal(closing.isOpened(), false)
})

test('typeahead while closed opens and reports the match; a programmatic setFocusedIndex while closed reports nothing', () => {
  const log: string[] = []
  class Probe extends LLSelectSingle<string> {
    public moveWhileClosed(): void { this.setFocusedIndex(1) }
  }
  const sel = new Probe(mount(), { ariaLabel: 'x', onActiveItemChange: (item) => { log.push(show(item)) } })
  sel.setItems(['apple', 'banana'])
  sel.moveWhileClosed()
  assert.deepEqual(log, [])
  key(sel.triggerEl, 'b') // opens: the initial row is apple, then the typeahead lands on banana
  assert.deepEqual(log, ['active:apple', 'active:banana'])
})
