import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import {
  LLSelectAction,
  getActionFromKey,
  getUpdatedIndex,
} from '../src/keyboard.js'
import { LLSelectSingle } from '../src/single.js'

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

// --- Integration: LLSelectSingle + jsdom ---------------------------

function mountSelect(options: string[]): LLSelectSingle<string> {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const mount = document.getElementById('mount')!
  const sel = new LLSelectSingle<string>(mount)
  sel.setOptions(options)
  return sel
}

function fireKey(target: HTMLElement, key: string, altKey = false): void {
  const ev = new KeyboardEvent('keydown', { key, altKey, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
}

function focusedLabel(sel: LLSelectSingle<string>): string | null {
  const el = sel.listboxEl.querySelector(`.${sel.classIdMap.optionFocusedClass}`)
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
  assert.equal(sel.getChosen(), 'b')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('Space selects focused option (same as Enter)', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, ' ')
  assert.equal(sel.getChosen(), 'b')
})

test('Escape closes without selecting', () => {
  const sel = mountSelect(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'Escape')
  assert.equal(sel.getChosen(), undefined)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('Alt+ArrowUp closes the listbox', () => {
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
  sel.setChosen('c')
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
  assert.equal(sel.getChosen(), undefined)
})

test('typing letters when closed does NOT open (phase 5: type-to-search comes later)', () => {
  const sel = mountSelect(['apple', 'banana'])
  fireKey(sel.triggerEl, 'a')
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})
