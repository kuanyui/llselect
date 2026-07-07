import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Phase 8 search box: see docs/DESIGN.md ("Search box architecture") and
// docs/A11Y.md for the contract these tests pin down.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="outside">x</button></body></html>')
  const el = document.getElementById('mount')!
  return el
}

function searchInput(sel: { popupEl: HTMLElement }): HTMLInputElement {
  return sel.popupEl.querySelector('input')!
}

// --- structure / ARIA ---------------------------------------------------

test('searchable: trigger is role="button" and search input is visible with combobox ARIA', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerEl.getAttribute('role'), 'button')
  const input = searchInput(sel)
  assert.equal(input.hidden, false)
  assert.equal(input.getAttribute('role'), 'combobox')
  assert.equal(input.getAttribute('aria-controls'), sel.classIdMap.popupListId)
  assert.equal(input.getAttribute('aria-autocomplete'), 'list')
})

test('non-searchable (default): trigger keeps role="combobox" and input is hidden', () => {
  const sel = new LLSelectSingle<string>(mount())
  const input = searchInput(sel)
  assert.equal(sel.triggerEl.getAttribute('role'), 'combobox')
  assert.equal(input.hidden, true)
})

// --- focus / open / close ----------------------------------------------

test('searchable: open moves DOM focus to the search input, close returns it to trigger', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['a', 'b'])
  const input = searchInput(sel)
  sel.triggerEl.focus()
  sel.open()
  assert.equal(document.activeElement, input)
  assert.equal(input.getAttribute('aria-expanded'), 'true')
  sel.close()
  assert.equal(document.activeElement, sel.triggerEl)
  assert.equal(input.getAttribute('aria-expanded'), 'false')
})

test('aria-activedescendant lives on the search input when searchable', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['a', 'b'])
  sel.open()
  const input = searchInput(sel)
  const ad = input.getAttribute('aria-activedescendant')
  assert.ok(ad)
  // Trigger must NOT carry activedescendant in searchable mode.
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), null)
})

test('search input has a default accessible name and the default filter placeholder', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  const input = searchInput(sel)
  assert.equal(input.getAttribute('aria-label'), 'Search')
  assert.equal(input.placeholder, 'Filter (Esc to clear)')
})

test('texts.searchInputPlaceholder null removes the placeholder entirely', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    searchable: true,
    texts: { searchInputPlaceholder: null },
  })
  assert.equal(searchInput(sel).hasAttribute('placeholder'), false)
})

test('texts.searchInputAriaLabel / searchInputPlaceholder are applied; other keys keep defaults', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    searchable: true,
    clearable: true,
    texts: {
      searchInputAriaLabel: 'Find a country',
      searchInputPlaceholder: 'Type to filter',
    },
  })
  const input = searchInput(sel)
  assert.equal(input.getAttribute('aria-label'), 'Find a country')
  assert.equal(input.placeholder, 'Type to filter')
  // Partial texts merge: unspecified keys fall back to the English defaults.
  const clearBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)!
  assert.equal(clearBtn.getAttribute('aria-label'), 'Clear selection')
})

// --- filtering ----------------------------------------------------------

test('typing in the search input filters the visible list', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['Argentina', 'Brazil', 'Canada', 'Chile'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'ar'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['Argentina'])
})

test('custom filterFn is used when provided', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    searchable: true,
    filterFn: (item, q) => item.endsWith(q),
  })
  sel.setItems(['apple', 'banana', 'grape'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'e'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['apple', 'grape'])
})

test('a subclass matchesQuery override replaces the default matching (override wins)', () => {
  class Derived extends LLSelectSingle<string> {
    protected override matchesQuery(item: string, query: string): boolean {
      return item.startsWith(query) // prefix-only instead of default substring
    }
  }
  const sel = new Derived(mount(), { searchable: true })
  sel.setItems(['banana', 'abanana', 'apple'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['abanana', 'apple']) // substring would also keep 'banana'
})

test('IME composition: typing while composing does not filter; compositionend fires the filter once', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['台北', '東京', '首爾'])
  sel.open()
  const input = searchInput(sel)
  input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
  // Raw IME keys arrive as input events but must not filter mid-composition.
  input.value = 'tai'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 3)
  // compositionend with the resolved CJK text triggers the filter.
  input.value = '台'
  input.dispatchEvent(new Event('compositionend', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['台北'])
})

test('filtering does not change the chosen set; hidden chosen items stay chosen', () => {
  const sel = new LLSelectMultiple<string>(mount(), { searchable: true })
  sel.setItems(['Argentina', 'Brazil', 'Canada'])
  sel.setChosenItems(['Brazil'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'ar'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  // Brazil is filtered out but should still be chosen.
  assert.deepEqual(sel.getChosenItems(), ['Brazil'])
})

// --- keyboard / Esc two-stage / Tab close ------------------------------

test('Esc clears the filter first; a second Esc closes and returns focus to trigger', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  sel.setItems(['a', 'b', 'c'])
  sel.triggerEl.focus()
  sel.open()
  const input = searchInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 1)

  // First Esc: clears filter, list expands, popup stays open.
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  assert.equal(input.value, '')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 3)

  // Second Esc: closes, focus returns to trigger.
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, sel.triggerEl)
})

test('arrow keys navigate the filtered list (not the full items array)', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  // 'cherry' has no 'a'; filter 'a' yields [apple, banana, date] -> ArrowDown
  // from apple must go to banana, skipping cherry that sits between them in
  // the full items array.
  sel.setItems(['apple', 'cherry', 'banana', 'date'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  let activeId = input.getAttribute('aria-activedescendant')!
  let activeEl = document.getElementById(activeId)!
  assert.equal(activeEl.textContent, 'apple')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
  activeId = input.getAttribute('aria-activedescendant')!
  activeEl = document.getElementById(activeId)!
  assert.equal(activeEl.textContent, 'banana')
})

test('Enter on the filtered active row selects it; single mode closes', () => {
  const picks: Array<string | undefined> = []
  const sel = new LLSelectSingle<string>(mount(), {
    searchable: true,
    onChange: v => picks.push(v),
  })
  sel.setItems(['Argentina', 'Brazil', 'Canada'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'br'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  assert.deepEqual(picks, ['Brazil'])
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('setItems while open + searchable: re-filter applies', () => {
  const sel = new LLSelectSingle<string>(mount(), { searchable: true })
  // filter 'a' on this set -> Argentina, Brazil (Chile has no 'a').
  sel.setItems(['Argentina', 'Brazil', 'Chile'])
  sel.open()
  const input = searchInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
  // Replace the items: filter is reapplied to the new set (Berry has no 'a').
  sel.setItems(['Apple', 'Berry'])
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 1)
  assert.equal(sel.popupListEl.querySelector('[role="option"]')!.textContent, 'Apple')
})
