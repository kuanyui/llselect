import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Phase 13 select-all row: opt-in tri-state leading row acting on the VISIBLE
// enabled subset. Contract: docs/llm/A11Y.md "Select-all"; design: docs/llm/TODO.md.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function row(sel: LLSelectMultiple<string>): HTMLElement | null {
  return sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.selectAllRowClass}`)
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

test('off by default: no select-all row', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(row(sel), null)
})

test('renders as the first option with tri-state attributes and a counting label', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('a')
  sel.open()
  const r = row(sel)!
  assert.equal(sel.popupListEl.firstElementChild, r)
  assert.equal(r.getAttribute('role'), 'option')
  assert.equal(r.getAttribute('data-chosen-state'), 'some')
  assert.equal(r.getAttribute('aria-selected'), 'false') // only 'all' selects it
  assert.equal(r.textContent, 'Select all (1 of 3)')
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 4) // row + 3 items
})

test('click toggles the visible enabled subset; tri-state and label update', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  row(sel)!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
  assert.equal(row(sel)!.getAttribute('data-chosen-state'), 'all')
  assert.equal(row(sel)!.getAttribute('aria-selected'), 'true')
  assert.equal(row(sel)!.textContent, 'Select all (3 of 3)')
  row(sel)!.click() // all chosen -> deselect the subset
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(row(sel)!.getAttribute('data-chosen-state'), 'none')
})

test('filtered scope: acts on visible matches only; hidden choices preserved', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true, filterable: true })
  sel.setItems(['apple', 'banana', 'cherry'])
  sel.setChosenItems(['cherry'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'an' // matches banana only
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(row(sel)!.textContent, 'Select all (0 of 1)')
  row(sel)!.click()
  assert.deepEqual([...sel.getChosenItems()].sort(), ['banana', 'cherry']) // cherry kept
  row(sel)!.click() // all visible chosen -> unchoose the visible only
  assert.deepEqual([...sel.getChosenItems()], ['cherry'])
})

test('disabled items are excluded from the scope and the counts', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    selectAllRow: true,
    itemDisabledFn: (i) => i === 'b',
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(row(sel)!.textContent, 'Select all (0 of 2)')
  row(sel)!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'c'])
})

test('keyboard ring: opens ON the row when nothing is chosen; ArrowDown/Up + Home + Enter', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b'])
  sel.open()
  const r = row(sel)!
  // Nothing chosen -> the select-all row IS the first option -> initial focus.
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), r.id)
  assert.ok(r.classList.contains(sel.classIdMap.itemFocusedClass))
  fireKey(sel.triggerEl, 'ArrowDown') // down to the first item
  assert.notEqual(sel.triggerEl.getAttribute('aria-activedescendant'), r.id)
  fireKey(sel.triggerEl, 'ArrowUp') // back up to the row
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), row(sel)!.id)
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'Home') // Home lands on the row (non-filter mode)
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), row(sel)!.id)
  fireKey(sel.triggerEl, 'Enter')
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'])
  // Focus stays on the (rebuilt) row after activation.
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), row(sel)!.id)
})

test('opens focused on the first chosen item (not the row) when something is chosen', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['b'])
  sel.open()
  const active = sel.triggerEl.getAttribute('aria-activedescendant')!
  assert.equal(document.getElementById(active)!.textContent, 'b')
})

test('toggleItem keeps the row fresh via the O(1) leading-row replace (items untouched)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b'])
  sel.open()
  const before = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  sel.toggleItem('a')
  const after = sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')
  assert.equal(after[2], before[2]) // the untouched item element ('b') is the SAME node
  assert.equal(row(sel)!.getAttribute('data-chosen-state'), 'some')
  assert.equal(row(sel)!.textContent, 'Select all (1 of 2)')
})

test('createSelectAllRowContentElFn fills the row; accessible name stays the counting label', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    selectAllRow: true,
    createSelectAllRowContentElFn: (chosenState, chosenCount, totalCount) => {
      const el = document.createElement('span')
      el.className = 'rich-select-all'
      el.setAttribute('data-got', `${chosenState}:${chosenCount}:${totalCount}`)
      return el
    },
  })
  sel.setItems(['a', 'b'])
  sel.toggleItem('a')
  sel.open()
  const r = row(sel)!
  assert.equal(r.querySelector('.rich-select-all')!.getAttribute('data-got'), 'some:1:2')
  assert.equal(r.getAttribute('aria-label'), 'Select all (1 of 2)') // name pinned to the label
})

test('createSelectAllRowContentElFn returning null falls back to the plain label (no aria-label)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    selectAllRow: true,
    createSelectAllRowContentElFn: () => null,
  })
  sel.setItems(['a'])
  sel.open()
  assert.equal(row(sel)!.textContent, 'Select all (0 of 1)')
  assert.equal(row(sel)!.getAttribute('aria-label'), null)
})

test('default content: just the plain counting label - no indicator element', () => {
  const sel = new LLSelectMultiple<string>(mount(), { selectAllRow: true })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(row(sel)!.textContent, 'Select all (0 of 2)')
  assert.equal(row(sel)!.childElementCount, 0) // pure text: no glyph span, no svg
  sel.toggleItem('a') // O(1) leading-row replace keeps the label fresh
  assert.equal(row(sel)!.textContent, 'Select all (1 of 2)')
  assert.equal(row(sel)!.getAttribute('data-chosen-state'), 'some') // the CSS hook stays
})

test('custom content is the whole row content; the label moves to aria-label', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    selectAllRow: true,
    createSelectAllRowContentElFn: () => {
      const el = document.createElement('span')
      el.textContent = 'custom'
      return el
    },
  })
  sel.setItems(['a'])
  sel.open()
  assert.equal(row(sel)!.textContent, 'custom')
})

test('a subclass createSelectAllRowContentEl override replaces the setting (override wins)', () => {
  class Derived extends LLSelectMultiple<string> {
    protected override createSelectAllRowContentEl(): HTMLElement | null {
      const el = document.createElement('b')
      el.className = 'derived-select-all'
      el.textContent = 'derived'
      return el
    }
  }
  const sel = new Derived(mount(), {
    selectAllRow: true,
    createSelectAllRowContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'fn-select-all'
      return i
    },
  })
  sel.setItems(['a'])
  sel.open()
  assert.ok(row(sel)!.querySelector('.derived-select-all')) // override wins
  assert.equal(row(sel)!.querySelector('.fn-select-all'), null)
})

test('no actionable items -> no row (everything disabled)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    selectAllRow: true,
    itemDisabledFn: () => true,
  })
  sel.setItems(['a'])
  sel.open()
  assert.equal(row(sel), null)
})
