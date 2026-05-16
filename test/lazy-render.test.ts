import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

function optionCount(sel: LLSelectSingle<string>): number {
  return sel.listboxEl.querySelectorAll('[role="option"]').length
}

test('listbox has no option children when closed initially', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b', 'c'])
  assert.equal(optionCount(sel), 0)
})

test('listbox is populated on open', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b', 'c'])
  sel.open()
  assert.equal(optionCount(sel), 3)
})

test('listbox is cleared on close', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b', 'c'])
  sel.open()
  assert.equal(optionCount(sel), 3)
  sel.close()
  assert.equal(optionCount(sel), 0)
})

test('listbox repopulates on reopen', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b'])
  sel.open()
  sel.close()
  sel.open()
  assert.equal(optionCount(sel), 2)
})

test('setOptions while closed does not populate listbox', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b', 'c'])
  sel.setOptions(['x', 'y', 'z', 'w'])
  assert.equal(optionCount(sel), 0)
})

test('setOptions while open updates listbox immediately', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b'])
  sel.open()
  assert.equal(optionCount(sel), 2)
  sel.setOptions(['x', 'y', 'z'])
  assert.equal(optionCount(sel), 3)
  const opts = sel.listboxEl.querySelectorAll('[role="option"]')
  assert.equal(opts[0]?.textContent, 'x')
  assert.equal(opts[2]?.textContent, 'z')
})

test('repeated open is a no-op (no double rendering)', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a', 'b'])
  sel.open()
  sel.open()
  assert.equal(optionCount(sel), 2)
})
