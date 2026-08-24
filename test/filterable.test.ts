import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Phase 8 filter box: see docs/llm/DESIGN.md ("Filter box architecture") and
// docs/llm/A11Y.md for the contract these tests pin down.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="outside">x</button></body></html>')
  const el = document.getElementById('mount')!
  return el
}

function filterInput(sel: { popupEl: HTMLElement }): HTMLInputElement {
  return sel.popupEl.querySelector('input')!
}

// --- structure / ARIA ---------------------------------------------------

test('filterable: trigger is role="button" and filter input is visible with combobox ARIA', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerEl.getAttribute('role'), 'button')
  const input = filterInput(sel)
  assert.equal(input.hidden, false)
  assert.equal(input.getAttribute('role'), 'combobox')
  assert.equal(input.getAttribute('aria-controls'), sel.classIdMap.popupListId)
  assert.equal(input.getAttribute('aria-autocomplete'), 'list')
})

test('non-filterable (default): trigger keeps role="combobox" and input is hidden', () => {
  const sel = new LLSelectSingle<string>(mount())
  const input = filterInput(sel)
  assert.equal(sel.triggerEl.getAttribute('role'), 'combobox')
  assert.equal(input.hidden, true)
})

// --- focus / open / close ----------------------------------------------

test('filterable: open moves DOM focus to the filter input, close returns it to trigger', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  const input = filterInput(sel)
  sel.triggerEl.focus()
  sel.open()
  assert.equal(document.activeElement, input)
  assert.equal(input.getAttribute('aria-expanded'), 'true')
  sel.close()
  assert.equal(document.activeElement, sel.triggerEl)
  assert.equal(input.getAttribute('aria-expanded'), 'false')
})

test('aria-activedescendant lives on the filter input when filterable', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  sel.open()
  const input = filterInput(sel)
  const ad = input.getAttribute('aria-activedescendant')
  assert.ok(ad)
  // Trigger must NOT carry activedescendant in filterable mode.
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), null)
})

test('filter input has a default accessible name and the default filter placeholder', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  const input = filterInput(sel)
  assert.equal(input.getAttribute('aria-label'), 'Search')
  assert.equal(input.placeholder, 'Filter (Esc to clear)')
})

test('uiTranslationPack.filterInputPlaceholder null removes the placeholder entirely', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    uiTranslationPack: { filterInputPlaceholder: null },
  })
  assert.equal(filterInput(sel).hasAttribute('placeholder'), false)
})

test('uiTranslationPack.filterInputAriaLabel / filterInputPlaceholder are applied; other keys keep defaults', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    clearable: true,
    uiTranslationPack: {
      filterInputAriaLabel: 'Find a country',
      filterInputPlaceholder: 'Type to filter',
    },
  })
  const input = filterInput(sel)
  assert.equal(input.getAttribute('aria-label'), 'Find a country')
  assert.equal(input.placeholder, 'Type to filter')
  // Partial pack merge: unspecified keys fall back to the English defaults.
  const clearBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)!
  assert.equal(clearBtn.getAttribute('aria-label'), 'Clear selection')
})

// --- filterable predicate (conditional filtering) ---------------------------

test('filterable predicate below the threshold: the open behaves like filterable false', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: (items) => items.length > 3 })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(filterInput(sel).hidden, true)
  assert.equal(sel.triggerEl.getAttribute('role'), 'combobox')
  // aria-activedescendant lives on the trigger, like filterable: false.
  assert.ok(sel.triggerEl.getAttribute('aria-activedescendant'))
})

test('filterable predicate: crossing the threshold mid-open applies on the NEXT open only', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: (items) => items.length > 3 })
  sel.setItems(['a', 'b'])
  sel.triggerEl.focus()
  sel.open()
  assert.equal(filterInput(sel).hidden, true)
  sel.setItems(['a', 'b', 'c', 'd', 'e']) // crosses the threshold while open
  assert.equal(filterInput(sel).hidden, true) // mode must NOT flip mid-open
  assert.equal(sel.triggerEl.getAttribute('role'), 'combobox')
  sel.close()
  sel.open() // re-evaluated: the filter is now active
  const input = filterInput(sel)
  assert.equal(input.hidden, false)
  assert.equal(sel.triggerEl.getAttribute('role'), 'button')
  assert.equal(document.activeElement, input)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 1)
})

// --- filtering ----------------------------------------------------------

test('typing in the filter input filters the visible list', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['Argentina', 'Brazil', 'Canada', 'Chile'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'ar'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['Argentina'])
})

test('MEDIUM-71: a still-no-match keystroke does not rewrite the no-results region', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, ariaLabel: 'x' })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const input = filterInput(sel)
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(msg.hidden, false, 'no-results shows for a no-match query')
  const nodeAfterFirst = msg.firstChild
  assert.ok(nodeAfterFirst, 'no-results is filled on first appearance')
  // A second, still-no-match keystroke keeps the SAME text. A fresh textContent
  // write would replace this text node and re-announce via role="status", so the
  // identical text must not be rewritten - the very same node must survive.
  input.value = 'zzzq'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(msg.firstChild, nodeAfterFirst, 'unchanged no-results text must not be rewritten (same text node)')
})

test('MEDIUM-71: reopening a persistently-empty list re-announces (close resets the cache)', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x' })
  sel.setItems([]) // intrinsically empty: no-results is always the shown state
  sel.open()
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  const nodeFirstOpen = msg.firstChild
  assert.ok(nodeFirstOpen, 'no-results is filled on first open')
  sel.close()
  sel.open() // reopen, still empty -> a genuine new appearance must re-announce
  assert.notEqual(msg.firstChild, nodeFirstOpen, 'reopening an empty list must rewrite the no-results text (re-announce)')
})

test('custom filterFn is used when provided', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    filterFn: (item, q) => item.endsWith(q),
  })
  sel.setItems(['apple', 'banana', 'grape'])
  sel.open()
  const input = filterInput(sel)
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
  const sel = new Derived(mount(), { filterable: true })
  sel.setItems(['banana', 'abanana', 'apple'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const rendered = Array.from(sel.popupListEl.querySelectorAll('[role="option"]')).map(el => el.textContent)
  assert.deepEqual(rendered, ['abanana', 'apple']) // substring would also keep 'banana'
})

test('IME composition: typing while composing does not filter; compositionend fires the filter once', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['台北', '東京', '首爾'])
  sel.open()
  const input = filterInput(sel)
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
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true })
  sel.setItems(['Argentina', 'Brazil', 'Canada'])
  sel.setChosenItems(['Brazil'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'ar'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  // Brazil is filtered out but should still be chosen.
  assert.deepEqual(sel.getChosenItems(), ['Brazil'])
})

test('a filter with zero matches shows the no-results message (role=status, outside the listbox)', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.equal(msg.hidden, true) // results present -> hidden
  const input = filterInput(sel)
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 0)
  assert.equal(msg.hidden, false)
  assert.equal(msg.getAttribute('role'), 'status')
  assert.equal(msg.textContent, 'No results found')
  assert.equal(msg.parentElement, sel.popupEl) // outside the listbox (options-only children)
  input.value = '' // clearing the filter hides it again
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(msg.hidden, true)
})

test('createPopupListNoResultsContentElFn fills the message with rich content (receives the query)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    createPopupListNoResultsContentElFn: (query) => {
      const el = document.createElement('em')
      el.className = 'rich-empty'
      el.textContent = `Nothing matches "${query}"`
      return el
    },
  })
  sel.setItems(['apple'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.equal(msg.hidden, false)
  assert.equal(msg.querySelector('.rich-empty')!.textContent, 'Nothing matches "zzz"')
})

test('createPopupListNoResultsContentElFn returning null falls back to uiTranslationPack.popupListNoResults', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    createPopupListNoResultsContentElFn: () => null,
  })
  sel.setItems(['apple'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.equal(msg.textContent, 'No results found')
})

test('a subclass createPopupListNoResultsContentEl override replaces the setting (override wins)', () => {
  class Derived extends LLSelectSingle<string> {
    protected override createPopupListNoResultsContentEl(): HTMLElement | null {
      const el = document.createElement('b')
      el.className = 'derived-empty'
      el.textContent = 'derived'
      return el
    }
  }
  const sel = new Derived(mount(), {
    filterable: true,
    createPopupListNoResultsContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'fn-empty'
      return i
    },
  })
  sel.setItems(['apple'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const msg = sel.popupEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.ok(msg.querySelector('.derived-empty')) // override wins
  assert.equal(msg.querySelector('.fn-empty'), null)
})

// --- keyboard / Esc two-stage / Tab close ------------------------------

test('Esc clears the filter first; a second Esc closes and returns focus to trigger', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b', 'c'])
  sel.triggerEl.focus()
  sel.open()
  const input = filterInput(sel)
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
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  // 'cherry' has no 'a'; filter 'a' yields [apple, banana, date] -> ArrowDown
  // from apple must go to banana, skipping cherry that sits between them in
  // the full items array.
  sel.setItems(['apple', 'cherry', 'banana', 'date'])
  sel.open()
  const input = filterInput(sel)
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
    filterable: true,
    onChange: v => picks.push(v),
  })
  sel.setItems(['Argentina', 'Brazil', 'Canada'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'br'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  assert.deepEqual(picks, ['Brazil'])
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('setItems while open + filterable: re-filter applies', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  // filter 'a' on this set -> Argentina, Brazil (Chile has no 'a').
  sel.setItems(['Argentina', 'Brazil', 'Chile'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
  // Replace the items: filter is reapplied to the new set (Berry has no 'a').
  sel.setItems(['Apple', 'Berry'])
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 1)
  assert.equal(sel.popupListEl.querySelector('[role="option"]')!.textContent, 'Apple')
})

// --- tab-order: single tab stop while open --------------------------------

test('filterable open: trigger leaves the tab order; close restores it', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
  sel.open()
  // Only the filter input may be tabbable while open: Shift+Tab must leave
  // the widget (and close via focusout), never land on the trigger with the
  // popup still open.
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  sel.close()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('non-filterable open: trigger stays tabbable (it is the focus host)', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
  sel.close()
})

test('predicate filterable: an inactive open cycle keeps the trigger tabbable', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: (items) => items.length > 2 })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
  sel.close()
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  sel.close()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('setDisabled while filterable-open: closes and lands on the disabled tabindex', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  sel.setDisabled(true)
  // close() restored 0 first, then the disabled sync takes it back out.
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  sel.setDisabled(false)
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('focusableWhenDisabled survives the filterable open/close cycle', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, focusableWhenDisabled: true })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.setDisabled(true)
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('getVisibleItems() is public: full list while closed, filtered subset while querying', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true })
  sel.setItems(['alpha', 'beta'])
  assert.deepEqual([...sel.getVisibleItems()], ['alpha', 'beta']) // closed = full list
  sel.open()
  const input = filterInput(sel)
  input.value = 'al'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual([...sel.getVisibleItems()], ['alpha'])
  sel.close()
  assert.deepEqual([...sel.getVisibleItems()], ['alpha', 'beta'])
})

test('getFilterQuery() mirrors the typed query and resets to empty on close', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true })
  sel.setItems(['alpha', 'beta'])
  assert.equal(sel.getFilterQuery(), '') // closed
  sel.open()
  assert.equal(sel.getFilterQuery(), '') // open, nothing typed
  const input = filterInput(sel)
  input.value = 'al'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.getFilterQuery(), 'al')
  sel.close()
  assert.equal(sel.getFilterQuery(), '')
})

test('getFilterQuery() stays empty while the filter is inactive', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['alpha'])
  sel.open()
  assert.equal(sel.getFilterQuery(), '')
})

test('a filter keystroke focuses the first ENABLED match, skipping disabled rows', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    itemDisabledFn: (item) => item === 'apple',
  })
  sel.setItems(['apple', 'apricot', 'banana'])
  sel.open()
  const input = filterInput(sel)
  input.value = 'ap'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const focused = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  assert.equal(focused?.textContent, 'apricot', 'the disabled first match must be skipped')
})

test('the shrink clamp also skips a disabled last row', () => {
  // The filter path resets focusedIndex before rendering, so the clamp is
  // reachable only by shrinking the list under a live focus: setItems while
  // open. Non-filterable, so End moves the focused row (in the filter input
  // End is a caret move).
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    itemDisabledFn: (item) => item === 'apricot',
  })
  sel.setItems(['ant', 'apple', 'apricot', 'banana'])
  sel.open()
  sel.triggerEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
  assert.equal(
    sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)?.textContent,
    'banana', 'precondition: End must land on the last row',
  )
  sel.setItems(['ant', 'apple', 'apricot'])
  const focused = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  assert.equal(focused?.textContent, 'apple', 'the clamp must seek backward past the disabled new-last row')
})
