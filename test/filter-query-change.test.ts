import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// onFilterQueryChange: after the re-render, only when the filter text really
// changed. Contract: A11Y.md "Filtering".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function type(sel: LLSelectSingle<string>, text: string): void {
  const input = sel.popupEl.querySelector('input')!
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function escape(sel: LLSelectSingle<string>): void {
  sel.popupEl.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
}

test('fires after the list re-rendered, only when the text changed', () => {
  const seen: string[] = []
  const visibleAtFire: number[] = []
  let sel: LLSelectSingle<string>
  sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    onFilterQueryChange: query => { seen.push(query); visibleAtFire.push(sel.getVisibleItems().length) },
  })
  sel.setItems(['apple', 'apricot', 'kiwi'])
  sel.open()
  assert.deepEqual(seen, [], 'opening with an empty query fires nothing')
  type(sel, 'ap')
  assert.deepEqual(seen, ['ap'])
  assert.deepEqual(visibleAtFire, [2], 'the handler sees the filtered list')
  type(sel, 'ap')
  assert.deepEqual(seen, ['ap'], 'identical text: no event')
  type(sel, 'apr')
  assert.deepEqual(seen, ['ap', 'apr'])
})

test('Esc clearing a non-empty query fires with an empty string; close() and open() reset silently', () => {
  const seen: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, onFilterQueryChange: query => { seen.push(query) } })
  sel.setItems(['apple', 'kiwi'])
  sel.open()
  type(sel, 'k')
  escape(sel)
  assert.deepEqual(seen, ['k', ''])
  assert.ok(sel.isOpened(), 'the first Esc only clears the query')
  type(sel, 'k')
  sel.close()
  assert.deepEqual(seen, ['k', '', 'k'], 'close() clears the query without the event')
  sel.open()
  assert.deepEqual(seen, ['k', '', 'k'], 'open() starts empty without the event')
})

test('setItems() and rerender() while a query is active do not fire', () => {
  const seen: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, onFilterQueryChange: query => { seen.push(query) } })
  sel.setItems(['apple', 'kiwi'])
  sel.open()
  type(sel, 'a')
  sel.setItems(['apple', 'avocado'])
  sel.rerender()
  assert.deepEqual(seen, ['a'])
})

test('IME: nothing while composing, one event at compositionend', () => {
  const seen: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, onFilterQueryChange: query => { seen.push(query) } })
  sel.setItems(['りんご', 'キウイ'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
  input.value = 'り'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(seen, [], 'composing: no filter, no event')
  input.value = 'りん'
  input.dispatchEvent(new Event('compositionend', { bubbles: true }))
  assert.deepEqual(seen, ['りん'])
})

test('null (the default): nothing is called', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true })
  sel.setItems(['apple'])
  sel.open()
  type(sel, 'a') // no handler: filtering still works, nothing throws
  assert.equal(sel.getVisibleItems().length, 1)
})

test('Alt+ArrowUp closes even with a query typed; the reset is silent (only Esc clears first)', () => {
  const seen: string[] = []
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, onFilterQueryChange: query => { seen.push(query) } })
  sel.setItems(['apple', 'kiwi'])
  sel.open()
  type(sel, 'k')
  sel.popupEl.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, cancelable: true }))
  assert.equal(sel.isOpened(), false, 'Alt+ArrowUp closes')
  assert.equal(sel.getFilterQuery(), '')
  assert.deepEqual(seen, ['k'], 'the close reset fires nothing')
})
