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
  return sel.popupListEl.querySelectorAll('[role="option"]').length
}

test('popup has no option children when closed initially', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  assert.equal(optionCount(sel), 0)
})

test('popup is populated on open', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(optionCount(sel), 3)
})

test('popup is cleared on close', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(optionCount(sel), 3)
  sel.close()
  assert.equal(optionCount(sel), 0)
})

test('popup repopulates on reopen', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  sel.close()
  sel.open()
  assert.equal(optionCount(sel), 2)
})

test('setItems while closed does not populate popup', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.setItems(['x', 'y', 'z', 'w'])
  assert.equal(optionCount(sel), 0)
})

test('setItems while open updates popup immediately', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(optionCount(sel), 2)
  sel.setItems(['x', 'y', 'z'])
  assert.equal(optionCount(sel), 3)
  const opts = sel.popupListEl.querySelectorAll('[role="option"]')
  assert.equal(opts[0]?.textContent, 'x')
  assert.equal(opts[2]?.textContent, 'z')
})

test('repeated open is a no-op (no double rendering)', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  sel.open()
  assert.equal(optionCount(sel), 2)
})
