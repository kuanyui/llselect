import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Accessible-name contract (ariaLabel / ariaLabelledBy settings): see
// docs/A11Y.md "Accessible name" for the per-mode wiring these tests pin down.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><span id="field-label">Country</span><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function searchInput(sel: { popupEl: HTMLElement }): HTMLInputElement {
  return sel.popupEl.querySelector('input')!
}

function listbox(sel: { popupEl: HTMLElement }): HTMLElement {
  return sel.popupEl.querySelector('[role="listbox"]') as HTMLElement
}

// --- non-searchable (trigger is the combobox) ----------------------------

test('ariaLabel: named on the trigger combobox and the listbox', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'Country' })
  assert.equal(sel.triggerEl.getAttribute('aria-label'), 'Country')
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), null)
  assert.equal(listbox(sel).getAttribute('aria-label'), 'Country')
  assert.equal(listbox(sel).getAttribute('aria-labelledby'), null)
})

test('ariaLabelledBy: forwarded to the trigger combobox and the listbox', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabelledBy: 'field-label' })
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), 'field-label')
  assert.equal(sel.triggerEl.getAttribute('aria-label'), null)
  assert.equal(listbox(sel).getAttribute('aria-labelledby'), 'field-label')
})

test('both set: ariaLabelledBy wins, aria-label is not emitted', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'Country', ariaLabelledBy: 'field-label' })
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), 'field-label')
  assert.equal(sel.triggerEl.getAttribute('aria-label'), null)
})

test('neither set: no name on trigger/listbox; search input keeps the texts fallback', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.triggerEl.getAttribute('aria-label'), null)
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), null)
  assert.equal(listbox(sel).getAttribute('aria-label'), null)
  assert.equal(searchInput(sel).getAttribute('aria-label'), 'Search')
})

// --- searchable (trigger is a button; input is the combobox) -------------

test('searchable + ariaLabelledBy: trigger button name chains label ids + hidden value span', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true, ariaLabelledBy: 'field-label' })
  sel.setItems(['a', 'b'])
  const valueId = sel.classIdMap.triggerValueId
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), `field-label ${valueId}`)
  // The value span the chain points at exists (root level, outside the
  // trigger so triggerEl.textContent stays clean), is hidden, and mirrors
  // the value.
  const valueEl = document.getElementById(valueId)!
  assert.ok(!sel.triggerEl.contains(valueEl))
  assert.ok(valueEl.hidden)
  sel.setChosenItem('b')
  assert.equal(valueEl.textContent, 'b')
  assert.equal(searchInput(sel).getAttribute('aria-labelledby'), 'field-label')
  assert.equal(searchInput(sel).getAttribute('aria-label'), null)
  assert.equal(listbox(sel).getAttribute('aria-labelledby'), 'field-label')
})

test('searchable + ariaLabel: trigger keeps aria-label and self-references it in the chain', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true, ariaLabel: 'Country' })
  sel.setItems(['a', 'b'])
  const { triggerId, triggerValueId } = sel.classIdMap
  assert.equal(sel.triggerEl.getAttribute('aria-label'), 'Country')
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), `${triggerId} ${triggerValueId}`)
  // Field name replaces the generic "Search" fallback on the input.
  assert.equal(searchInput(sel).getAttribute('aria-label'), 'Country')
  assert.equal(listbox(sel).getAttribute('aria-label'), 'Country')
})

test('predicate searchable: name wiring re-syncs per open cycle', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    searchable: (items) => items.length > 2,
    ariaLabelledBy: 'field-label',
  })
  sel.setItems(['a', 'b'])
  sel.open()
  // Inactive cycle: plain combobox wiring, no content-span chain.
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), 'field-label')
  sel.close()
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  // Active cycle: button wiring, chain includes the hidden value span.
  assert.equal(
    sel.triggerEl.getAttribute('aria-labelledby'),
    `field-label ${sel.classIdMap.triggerValueId}`,
  )
  sel.close()
})

// --- multiple ------------------------------------------------------------

test('LLSelectMultiple: same wiring, multiselectable listbox is named', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'Tags' })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('aria-label'), 'Tags')
  const lb = listbox(sel)
  assert.equal(lb.getAttribute('aria-label'), 'Tags')
  assert.equal(lb.getAttribute('aria-multiselectable'), 'true')
  sel.close()
})

test('tags mode: hidden value span carries plain labels, not remove-button names', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    searchable: true, triggerDisplay: 'tags', ariaLabelledBy: 'field-label',
  })
  sel.setItems(['Apple', 'Banana', 'Cherry'])
  sel.setChosenItems(['Apple', 'Banana'])
  const valueEl = document.getElementById(sel.classIdMap.triggerValueId)!
  // Plain labels only - the chips' "Remove <label>" button names must not
  // reach the accessible-name chain (they live in the content span, which the
  // chain no longer references).
  assert.equal(valueEl.textContent, 'Apple, Banana')
  assert.equal(
    sel.triggerEl.getAttribute('aria-labelledby'),
    `field-label ${sel.classIdMap.triggerValueId}`,
  )
  // The visible chips are still there, remove buttons intact.
  assert.equal(sel.triggerContentEl.querySelectorAll('button').length, 2)
})
