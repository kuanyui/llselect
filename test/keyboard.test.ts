import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import {
  LLSelectAction,
  TYPEAHEAD_TIMEOUT_MS,
  appendTypeaheadChar,
  findTypeaheadIndex,
  getActionFromKey,
  getUpdatedIndex,
} from '../src/keyboard.js'
import { LLSelectSingle, type LLSelectSingleSettingsInput } from '../src/single.js'
import { LLSelectMultiple, type LLSelectMultipleSettingsInput } from '../src/multiple.js'

function makeEvent(key: string, altKey = false): KeyboardEvent {
  setupDom()
  return new KeyboardEvent('keydown', { key, altKey, bubbles: true, cancelable: true })
}

// --- getActionFromKey (closed) -------------------------------------

test('closed: ArrowDown/Up/Enter/Space map to Open', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
    assert.equal(getActionFromKey(makeEvent(key), false), LLSelectAction.Open)
  }
})

test('closed: other keys return undefined', () => {
  for (const key of ['Escape', 'Home', 'End', 'PageDown', 'a', 'Tab']) {
    assert.equal(getActionFromKey(makeEvent(key), false), undefined)
  }
})

// --- getActionFromKey (open) ---------------------------------------

test('open: Escape -> Close; Alt+ArrowUp -> Close', () => {
  assert.equal(getActionFromKey(makeEvent('Escape'), true), LLSelectAction.Close)
  assert.equal(getActionFromKey(makeEvent('ArrowUp', true), true), LLSelectAction.Close)
})

test('open: Enter/Space -> Select', () => {
  assert.equal(getActionFromKey(makeEvent('Enter'), true), LLSelectAction.Select)
  assert.equal(getActionFromKey(makeEvent(' '), true), LLSelectAction.Select)
})

test('open: arrow keys -> Next/Previous', () => {
  assert.equal(getActionFromKey(makeEvent('ArrowDown'), true), LLSelectAction.Next)
  assert.equal(getActionFromKey(makeEvent('ArrowUp'), true), LLSelectAction.Previous)
})

test('open: Home/End -> GotoFirst/GotoLast', () => {
  assert.equal(getActionFromKey(makeEvent('Home'), true), LLSelectAction.GotoFirst)
  assert.equal(getActionFromKey(makeEvent('End'), true), LLSelectAction.GotoLast)
})

test('open: PageUp/PageDown -> PageUp/PageDown', () => {
  assert.equal(getActionFromKey(makeEvent('PageUp'), true), LLSelectAction.PageUp)
  assert.equal(getActionFromKey(makeEvent('PageDown'), true), LLSelectAction.PageDown)
})

// --- getActionFromKey (open, focus in the filter text input) -------

test('open + inTextInput: Space is left alone (types a space), Enter still selects', () => {
  assert.equal(getActionFromKey(makeEvent(' '), true, true), undefined)
  assert.equal(getActionFromKey(makeEvent('Enter'), true, true), LLSelectAction.Select)
})

test('open + inTextInput: Home/End are left alone (caret), arrows/page still navigate', () => {
  assert.equal(getActionFromKey(makeEvent('Home'), true, true), undefined)
  assert.equal(getActionFromKey(makeEvent('End'), true, true), undefined)
  assert.equal(getActionFromKey(makeEvent('ArrowDown'), true, true), LLSelectAction.Next)
  assert.equal(getActionFromKey(makeEvent('ArrowUp'), true, true), LLSelectAction.Previous)
  assert.equal(getActionFromKey(makeEvent('PageDown'), true, true), LLSelectAction.PageDown)
})

test('open + inTextInput: Escape still closes', () => {
  assert.equal(getActionFromKey(makeEvent('Escape'), true, true), LLSelectAction.Close)
})

// --- getUpdatedIndex -----------------------------------------------

test('getUpdatedIndex Next clamps at maxIndex', () => {
  assert.equal(getUpdatedIndex(0, 4, LLSelectAction.Next), 1)
  assert.equal(getUpdatedIndex(4, 4, LLSelectAction.Next), 4)
  assert.equal(getUpdatedIndex(-1, 4, LLSelectAction.Next), 0)
})

test('getUpdatedIndex Previous clamps at 0', () => {
  assert.equal(getUpdatedIndex(3, 4, LLSelectAction.Previous), 2)
  assert.equal(getUpdatedIndex(0, 4, LLSelectAction.Previous), 0)
  assert.equal(getUpdatedIndex(-1, 4, LLSelectAction.Previous), 0)
})

test('getUpdatedIndex GotoFirst/Last', () => {
  assert.equal(getUpdatedIndex(3, 9, LLSelectAction.GotoFirst), 0)
  assert.equal(getUpdatedIndex(3, 9, LLSelectAction.GotoLast), 9)
})

test('getUpdatedIndex Page steps by 10 and clamps', () => {
  assert.equal(getUpdatedIndex(0, 50, LLSelectAction.PageDown), 10)
  assert.equal(getUpdatedIndex(45, 50, LLSelectAction.PageDown), 50)
  assert.equal(getUpdatedIndex(25, 50, LLSelectAction.PageUp), 15)
  assert.equal(getUpdatedIndex(5, 50, LLSelectAction.PageUp), 0)
})

test('getUpdatedIndex returns -1 when maxIndex is negative (no options)', () => {
  assert.equal(getUpdatedIndex(0, -1, LLSelectAction.Next), -1)
  assert.equal(getUpdatedIndex(0, -1, LLSelectAction.GotoFirst), -1)
})

// --- appendTypeaheadChar -------------------------------------------

test('appendTypeaheadChar extends within the timeout, restarts past it', () => {
  assert.equal(appendTypeaheadChar('ta', 'i', 200), 'tai')
  assert.equal(appendTypeaheadChar('ta', 'i', TYPEAHEAD_TIMEOUT_MS), 'tai')
  assert.equal(appendTypeaheadChar('ta', 'b', TYPEAHEAD_TIMEOUT_MS + 1), 'b')
})

// --- findTypeaheadIndex --------------------------------------------

function textsAt(texts: (string | undefined)[]): (i: number) => string | undefined {
  return (i) => texts[i]
}

test('findTypeaheadIndex: one character searches from after current and wraps', () => {
  const texts = ['alpha', 'beta', 'avocado']
  assert.equal(findTypeaheadIndex('a', 3, 0, textsAt(texts)), 2)
  assert.equal(findTypeaheadIndex('a', 3, 2, textsAt(texts)), 0)
  assert.equal(findTypeaheadIndex('b', 3, 2, textsAt(texts)), 1)
})

test('findTypeaheadIndex: -1 current starts at 0; case-insensitive', () => {
  assert.equal(findTypeaheadIndex('B', 2, -1, textsAt(['Apple', 'Banana'])), 1)
  assert.equal(findTypeaheadIndex('м', 2, -1, textsAt(['Киев', 'Москва'])), 1)
})

test('findTypeaheadIndex: longer buffer stays on the still-matching current option', () => {
  const texts = ['apple', 'banana', 'bandana']
  assert.equal(findTypeaheadIndex('ba', 3, 1, textsAt(texts)), 1)
  assert.equal(findTypeaheadIndex('band', 3, 1, textsAt(texts)), 2)
})

test('findTypeaheadIndex: repeated character always cycles, never a literal match', () => {
  assert.equal(findTypeaheadIndex('aa', 2, 0, textsAt(['aachen', 'alpha'])), 1)
  assert.equal(findTypeaheadIndex('aa', 3, 1, textsAt(['alpha', 'avocado', 'beta'])), 0)
})

test('findTypeaheadIndex: a repeated character whose lower-case form expands still cycles', () => {
  // Turkish dotless-I family: 'İ'.toLowerCase() is two code units.
  assert.equal(findTypeaheadIndex('İİ', 2, 0, textsAt(['İstanbul', 'İzmir'])), 1)
  assert.equal(findTypeaheadIndex('İ', 2, 1, textsAt(['İstanbul', 'İzmir'])), 0)
})

test('findTypeaheadIndex: undefined text (disabled) never matches', () => {
  assert.equal(findTypeaheadIndex('b', 3, 0, textsAt(['apple', undefined, 'berry'])), 2)
})

test('findTypeaheadIndex: no match / empty list return -1 and single-option cycle returns itself', () => {
  assert.equal(findTypeaheadIndex('z', 2, 0, textsAt(['apple', 'banana'])), -1)
  assert.equal(findTypeaheadIndex('a', 0, -1, textsAt([])), -1)
  assert.equal(findTypeaheadIndex('a', 1, 0, textsAt(['apple'])), 0)
})

// --- Integration: LLSelectSingle + jsdom ---------------------------

function mountSelect(options: string[], settings?: LLSelectSingleSettingsInput<string>): LLSelectSingle<string> {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount, settings)
  sel.setItems(options)
  return sel
}

function mountMulti(options: string[], settings?: LLSelectMultipleSettingsInput<string>): LLSelectMultiple<string> {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectMultiple<string>(mount, settings)
  sel.setItems(options)
  return sel
}

function fireKey(target: HTMLElement, key: string, altKey = false): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, altKey, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

function focusedLabel(sel: LLSelectSingle<string> | LLSelectMultiple<string>): string | null {
  const el = sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)
  return el ? el.textContent : null
}

test('ArrowDown on closed select opens and focuses first option', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  assert.equal(focusedLabel(sel), 'a')
})

test('ArrowDown on open advances focus', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedLabel(sel), 'b')
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedLabel(sel), 'c')
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedLabel(sel), 'c')  // clamps at last
})

test('ArrowUp moves focus backward, clamps at 0', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  assert.equal(focusedLabel(sel), 'c')
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(focusedLabel(sel), 'b')
  fireKey(sel.triggerEl, 'ArrowUp')
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(focusedLabel(sel), 'a')
})

test('Home / End jump to first / last', () => {
  const sel = mountSelect(['a', 'b', 'c', 'd', 'e'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  assert.equal(focusedLabel(sel), 'e')
  fireKey(sel.triggerEl, 'Home')
  assert.equal(focusedLabel(sel), 'a')
})

test('Enter selects focused option and closes', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(sel.getChosenItem(), 'b')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('Space selects focused option (same as Enter)', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, ' ')
  assert.equal(sel.getChosenItem(), 'b')
})

test('Escape closes without selecting', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'Escape')
  assert.equal(sel.getChosenItem(), undefined)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('Alt+ArrowUp closes the popup', () => {
  const sel = mountSelect(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowUp', true)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('aria-activedescendant points at focused option element', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  const focusedId = sel.triggerEl.getAttribute('aria-activedescendant')
  assert.ok(focusedId)
  assert.equal(document.getElementById(focusedId)?.textContent, 'b')
})

test('PageDown jumps by 10 with clamp', () => {
  const opts = Array.from({ length: 25 }, (_, i) => `opt-${i}`)
  const sel = mountSelect(opts)
  sel.open()
  fireKey(sel.triggerEl, 'PageDown')
  assert.equal(focusedLabel(sel), 'opt-10')
  fireKey(sel.triggerEl, 'PageDown')
  assert.equal(focusedLabel(sel), 'opt-20')
  fireKey(sel.triggerEl, 'PageDown')
  assert.equal(focusedLabel(sel), 'opt-24')  // clamp at maxIndex
})

test('Single mode: opening highlights chosen option', () => {
  const sel = mountSelect(['a', 'b', 'c', 'd'])
  sel.setChosenItem('c')
  sel.open()
  assert.equal(focusedLabel(sel), 'c')
})

test('Single mode: opening without chosen highlights first option', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  assert.equal(focusedLabel(sel), 'a')
})

test('close() resets focused state and aria-activedescendant', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.ok(sel.triggerEl.getAttribute('aria-activedescendant'))
  sel.close()
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), null)
})

test('Enter on closed select opens (does not select)', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  assert.equal(sel.getChosenItem(), undefined)
})

// --- Prefix typeahead (contract: A11Y.md keyboard tables) ----------

test('typeahead: typing when closed opens and focuses the match; value unchanged', () => {
  const sel = mountSelect(['apple', 'banana'])
  fireKey(sel.triggerEl, 'b')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
  assert.equal(focusedLabel(sel), 'banana')
  assert.equal(sel.getChosenItem(), undefined)
})

test('typeahead: growing buffer stays on the current option while it matches', () => {
  const sel = mountSelect(['apple', 'banana', 'bandana'])
  sel.open()
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'banana')
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'banana')
  fireKey(sel.triggerEl, 'n')
  fireKey(sel.triggerEl, 'd')
  assert.equal(focusedLabel(sel), 'bandana')
})

test('typeahead: repeating one initial cycles its matches, wrapping around', () => {
  const sel = mountSelect(['alpha', 'avocado', 'beta'])
  sel.open()
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'avocado')
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'alpha')
})

test('typeahead: search wraps to a match above the current option', () => {
  const sel = mountSelect(['cherry', 'apple'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedLabel(sel), 'apple')
  fireKey(sel.triggerEl, 'c')
  assert.equal(focusedLabel(sel), 'cherry')
})

test('typeahead: disabled options are skipped', () => {
  const sel = mountSelect(['apple', 'banana', 'berry'], { itemDisabledFn: (s) => s === 'banana' })
  sel.open()
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'berry')
})

test('typeahead: no match leaves the active option in place', () => {
  const sel = mountSelect(['apple', 'banana'])
  sel.open()
  fireKey(sel.triggerEl, 'z')
  assert.equal(focusedLabel(sel), 'apple')
})

test('typeahead: an action key resets the buffer', () => {
  const sel = mountSelect(['apple', 'banana', 'bandana'])
  sel.open()
  fireKey(sel.triggerEl, 'b')
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedLabel(sel), 'bandana')
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'apple')
})

test('typeahead: typing digits fires no onChange; Enter commits once', () => {
  let calls = 0
  const sel = mountSelect(['1980', '1985', '1990'], { onChange: () => { calls++ } })
  fireKey(sel.triggerEl, '1')
  fireKey(sel.triggerEl, '9')
  fireKey(sel.triggerEl, '9')
  assert.equal(focusedLabel(sel), '1990')
  assert.equal(calls, 0)
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(sel.getChosenItem(), '1990')
  assert.equal(calls, 1)
})

test('typeahead: Space right after typing still selects, never joins the buffer', () => {
  const sel = mountSelect(['apple', 'banana'])
  fireKey(sel.triggerEl, 'b')
  fireKey(sel.triggerEl, ' ')
  assert.equal(sel.getChosenItem(), 'banana')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('typeahead: not intercepted while closed when the open would be filterable', () => {
  const sel = mountSelect(['apple', 'banana'], { filterable: true })
  const ev = fireKey(sel.triggerEl, 'a')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(ev.defaultPrevented, false)
})

test('typeahead: a filterable predicate flipping between opens is re-read while closed', () => {
  const sel = mountSelect(['apple', 'banana'], { filterable: (items) => items.length > 2 })
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'banana')
  sel.close()
  sel.setItems(['apple', 'banana', 'cherry', 'dates'])
  const ev = fireKey(sel.triggerEl, 'c')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(ev.defaultPrevented, false)
})

test('typeahead: closed typing lands on the FIRST match, not the second', () => {
  // The focus open() parks on the first item must not shift the search.
  const sel = mountSelect(['apple', 'avocado'])
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'apple')
})

test('typeahead: closed typing cycles past the chosen item, like a native select', () => {
  const sel = mountSelect(['banana', 'blueberry'])
  sel.setChosenItem('banana')
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'blueberry')
})

test('typeahead: closing resets the buffer', () => {
  const sel = mountSelect(['apple', 'banana', 'bandana'])
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'banana')
  fireKey(sel.triggerEl, 'Escape')
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'apple')
})

test('typeahead: a no-match keystroke keeps the buffer', () => {
  const sel = mountSelect(['apple', 'banana'])
  sel.open()
  fireKey(sel.triggerEl, 'b')
  fireKey(sel.triggerEl, 'x')
  assert.equal(focusedLabel(sel), 'banana')
  fireKey(sel.triggerEl, 'a')
  assert.equal(focusedLabel(sel), 'banana')
})

test('typeahead: matches itemToStringFn text and ignores filterFn', () => {
  const sel = mountSelect(['a', 'b'], {
    itemToStringFn: (s) => (s === 'a' ? 'apple' : 'banana'),
    filterFn: () => false,
  })
  sel.open()
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'banana')
})

test('typeahead: Ctrl-only chords pass through; Ctrl+Alt (AltGraph) types', () => {
  const sel = mountSelect(['apple', 'banana'])
  sel.open()
  const ctrlOnly = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true })
  sel.triggerEl.dispatchEvent(ctrlOnly)
  assert.equal(focusedLabel(sel), 'apple')
  assert.equal(ctrlOnly.defaultPrevented, false)
  const altGraph = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, altKey: true, bubbles: true, cancelable: true })
  sel.triggerEl.dispatchEvent(altGraph)
  assert.equal(focusedLabel(sel), 'banana')
})

test('typeahead (multiple): Space right after typing toggles the focused row', () => {
  const sel = mountMulti(['apple', 'banana'])
  fireKey(sel.triggerEl, 'b')
  assert.equal(focusedLabel(sel), 'banana')
  fireKey(sel.triggerEl, ' ')
  assert.deepEqual([...sel.getChosenItems()], ['banana'])
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'true')
})

test('typeahead (multiple): the choose-all row is never a match', () => {
  // Default choose-all text starts with "Select" - typing "s" must land on
  // the item, not the leading row.
  const sel = mountMulti(['salt', 'pepper'], { chooseAllRow: true })
  sel.open()
  fireKey(sel.triggerEl, 's')
  assert.equal(focusedLabel(sel), 'salt')
})
