import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { LLSelectSingle } from '../src/single.js'

// Characterization tests for the arrow-key ring around the choose-all row,
// pinned BEFORE the ring bookkeeping was refactored for action rows (TODO.md
// P2-0 / P2-a). One expectation changed with the unified ring (P2-b): Page
// keys now clamp onto the choose-all row directly instead of stopping on the
// first item first.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function activeText(sel: LLSelectMultiple<string> | LLSelectSingle<string>, host: HTMLElement = sel.triggerEl): string | null {
  const id = host.getAttribute('aria-activedescendant')
  return id === null ? null : document.getElementById(id)!.textContent
}

function row(sel: LLSelectMultiple<string>): HTMLElement | null {
  return sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)
}

const TWENTY = Array.from({ length: 20 }, (_, i) => `item${String(i).padStart(2, '0')}`)

test('PageDown from the choose-all row steps ten items down; PageUp past the top lands on the row; End / Home reach the ends', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true })
  sel.setItems(TWENTY)
  sel.open()
  assert.equal(activeText(sel), 'Select all (0 of 20)')
  fireKey(sel.triggerEl, 'PageDown') // the row counts as position -1: lands on item09
  assert.equal(activeText(sel), 'item09')
  fireKey(sel.triggerEl, 'PageUp') // ten up from item09 reaches past item00: the row is the ring's first entry (A11Y.md "Action rows": Page keys clamp across the ring)
  assert.equal(activeText(sel), 'Select all (0 of 20)')
  fireKey(sel.triggerEl, 'End')
  assert.equal(activeText(sel), 'item19')
  fireKey(sel.triggerEl, 'PageDown') // clamps at the last item
  assert.equal(activeText(sel), 'item19')
  fireKey(sel.triggerEl, 'Home')
  assert.equal(activeText(sel), 'Select all (0 of 20)')
  fireKey(sel.triggerEl, 'ArrowUp') // clamps on the row
  assert.equal(activeText(sel), 'Select all (0 of 20)')
})

test('ArrowUp over disabled items at the top continues onto the choose-all row; ArrowDown skips them', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, itemDisabledFn: i => i === 'a' || i === 'b' })
  sel.setItems(['a', 'b', 'c', 'd'])
  sel.open()
  assert.equal(activeText(sel), 'Select all (0 of 2)') // disabled items are outside the actionable count
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(activeText(sel), 'c')
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(activeText(sel), 'Select all (0 of 2)')
  fireKey(sel.triggerEl, 'End')
  assert.equal(activeText(sel), 'd')
})

test('filter-active ring: the row is the first entry; Home / End stay caret keys', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, filterable: true })
  sel.setItems(['apple', 'banana', 'cherry'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  assert.equal(activeText(sel, input), 'Select all (0 of 3)')
  fireKey(input, 'ArrowDown')
  assert.equal(activeText(sel, input), 'apple')
  fireKey(input, 'End') // caret move, not a ring move
  assert.equal(activeText(sel, input), 'apple')
  fireKey(input, 'ArrowUp')
  assert.equal(activeText(sel, input), 'Select all (0 of 3)')
  input.value = 'an'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  // a filter keystroke lands on the first MATCH, not on the row
  assert.equal(activeText(sel, input), 'banana')
  fireKey(input, 'ArrowUp')
  assert.equal(activeText(sel, input), 'Select all (0 of 1)')
})

test('the focused row vanishing (hideChosenRows) keeps the index; the last row clamps back', () => {
  const sel = new LLSelectMultiple<string>(mount(), { hideChosenRows: true, chooseAllRow: true })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'ArrowDown') // b
  assert.equal(activeText(sel), 'b')
  fireKey(sel.triggerEl, 'Enter') // b leaves the list; the same index now holds c
  assert.equal(activeText(sel), 'c')
  fireKey(sel.triggerEl, 'Enter') // c leaves; only a remains at index 0
  assert.equal(activeText(sel), 'a')
  fireKey(sel.triggerEl, 'Enter') // everything chosen: the row disappears with the last actionable item
  assert.equal(row(sel), null)
  assert.equal(activeText(sel), null)
})

test('setItems while open clamps the active option into the new list', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true })
  sel.setItems(['a', 'b', 'c', 'd'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  assert.equal(activeText(sel), 'd')
  sel.setItems(['x', 'y'])
  assert.equal(activeText(sel), 'y')
  fireKey(sel.triggerEl, 'ArrowUp')
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(activeText(sel), 'Select all (0 of 2)')
})

test('the protected focus API from a subclass: focusedIndex, setFocusedIndex, focusLeadingRow', () => {
  class Probe extends LLSelectMultiple<string> {
    index(): number { return this.focusedIndex }
    focusItem(i: number): void { this.setFocusedIndex(i) }
    focusRow(): boolean { return this.focusLeadingRow() }
  }
  const sel = new Probe(mount(), { chooseAllRow: true })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(sel.index(), -1) // the row holds the active option, no item index
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(sel.index(), 0)
  sel.focusItem(2)
  assert.equal(sel.index(), 2)
  assert.equal(activeText(sel), 'c')
  assert.equal(sel.focusRow(), true)
  assert.equal(sel.index(), -1)
  assert.equal(activeText(sel), 'Select all (0 of 3)')
  sel.focusItem(0)
  assert.equal(activeText(sel), 'a')
  sel.close()
  assert.equal(sel.index(), -1)
  const plain = new Probe(mount(), {})
  plain.setItems(['a'])
  plain.open()
  assert.equal(plain.focusRow(), false) // no row rendered: nothing changes
  assert.equal(plain.index(), 0)
})

test('typeahead never matches the choose-all row even when its text starts with the typed letter', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true })
  sel.setItems(['apple', 'salmon', 'sardine'])
  sel.open()
  assert.equal(activeText(sel), 'Select all (0 of 3)')
  fireKey(sel.triggerEl, 's')
  assert.equal(activeText(sel), 'salmon')
  fireKey(sel.triggerEl, 's')
  assert.equal(activeText(sel), 'sardine')
})

test('Enter on the row toggles the visible enabled subset and keeps the active option on the (rebuilt) row', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true })
  sel.setItems(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'Enter')
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'])
  assert.equal(activeText(sel), 'Select all (2 of 2)')
  fireKey(sel.triggerEl, 'Enter')
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(activeText(sel), 'Select all (0 of 2)')
})

test('single: no leading row exists; Home / End move between the first and last enabled items', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'a' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(activeText(sel), 'b')
  fireKey(sel.triggerEl, 'End')
  assert.equal(activeText(sel), 'c')
  fireKey(sel.triggerEl, 'Home')
  assert.equal(activeText(sel), 'b')
  fireKey(sel.triggerEl, 'ArrowUp') // no enabled item above: stays
  assert.equal(activeText(sel), 'b')
})
