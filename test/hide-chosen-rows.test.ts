import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'

// hideChosenRows: chosen items leave the popup list; unchoosing puts them
// back. Ruling and rationale: docs/llm/DESIGN.md "hideChosenRows".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function itemTexts(sel: LLSelectMultiple<never> | LLSelectMultiple<string> | LLSelectMultiple<{ id: number }>): (string | null)[] {
  // The choose-all row carries itemClass too; exclude it - these tests count item rows.
  return Array.from(sel.popupListEl.querySelectorAll(`.${sel.classIdMap.itemClass}:not(.${sel.classIdMap.chooseAllRowClass})`)).map(el => el.textContent)
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

test('off by default: chosen rows stay listed', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('a')
  sel.open()
  assert.deepEqual(itemTexts(sel), ['a', 'b', 'c'])
})

test('chosen before open: only unchosen rows render, in items order', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('b')
  sel.open()
  assert.deepEqual(itemTexts(sel), ['a', 'c'])
})

test('clicking a row removes it at once; unchoosing puts it back in display order', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.itemClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), ['a'])
  assert.deepEqual(itemTexts(sel), ['b', 'c'])
  sel.toggleItem('a') // unchoose through the API (the row is gone; tags would do this)
  assert.deepEqual(itemTexts(sel), ['a', 'b', 'c'])
})

test('every item chosen: empty listbox and the no-results element shows', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.setChosenItems(['a', 'b'])
  assert.deepEqual(itemTexts(sel), [])
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.equal(msg.hidden, false)
})

test('composes with the filter: the query subset minus the chosen', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true, filterable: true })
  sel.setItems(['apple', 'apricot', 'banana'])
  sel.toggleItem('apple')
  sel.open()
  const input = sel.popupEl.querySelector<HTMLInputElement>(`.${sel.classIdMap.filterInputClass}`)!
  input.value = 'ap'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(itemTexts(sel), ['apricot'])
})

test('choose-all row acts on the listed rows and empties the list, then leaves with them', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true, chooseAllRow: true })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('a')
  sel.open()
  const row = sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!
  assert.equal(row.textContent, 'Select all (0 of 2)') // counts the visible subset, always fully unchosen
  row.click()
  assert.deepEqual([...sel.getChosenItems()].sort(), ['a', 'b', 'c'])
  assert.deepEqual(itemTexts(sel), [])
  // Nothing actionable is listed anymore, so the choose-all row itself is
  // gone (the standing rule: no actionable rows -> no leading row).
  assert.equal(sel.popupListEl.querySelector(`.${sel.classIdMap.chooseAllRowClass}`), null)
})

test('a fully chosen group leaves with its header', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    hideChosenRows: true,
    itemToGroupKeyFn: (item) => item[0] ?? null,
    groupKeyToStringFn: (key) => `group ${key}`,
  })
  sel.setItems(['ax', 'ay', 'bz'])
  sel.open()
  sel.setChosenItems(['ax', 'ay'])
  assert.deepEqual(itemTexts(sel), ['bz'])
  const headers = Array.from(sel.popupListEl.querySelectorAll(`.${sel.classIdMap.groupLabelClass}`)).map(el => el.textContent)
  assert.deepEqual(headers, ['group b'])
})

test('custom compareFn: an equal (not identical) chosen object hides the row', () => {
  const sel = new LLSelectMultiple<{ id: number }>(mount(), {
    hideChosenRows: true,
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (item) => `#${item.id}`,
  })
  sel.setItems([{ id: 1 }, { id: 2 }])
  sel.open()
  sel.setChosenItems([{ id: 2 }])
  assert.deepEqual(itemTexts(sel), ['#1'])
})

test('the subtracted list is cached: same reference between changes, a new one after a change', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('a')
  const first = sel.getVisibleItems()
  assert.equal(sel.getVisibleItems(), first)
  sel.toggleItem('b')
  const second = sel.getVisibleItems()
  assert.notEqual(second, first)
  assert.deepEqual([...second], ['c'])
})

test('choosing the focused last row clamps focus to the new last row', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  fireKey(sel.triggerEl, 'Enter') // chooses 'c'; its row leaves the list
  assert.deepEqual(itemTexts(sel), ['a', 'b'])
  const focused = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  assert.equal(focused?.textContent, 'b')
})
