import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('QUALITY-92: the default compareFn treats a NaN item as one item on every path (multiple)', () => {
  const sel = new LLSelectMultiple<number>(mount(), { ariaLabel: 'x' })
  sel.setItems([NaN, 1])
  sel.toggleItem(NaN)
  assert.equal(sel.getChosenItems().length, 1)
  assert.equal(sel.isChosen(NaN), true)
  sel.toggleItem(NaN)
  assert.deepEqual(sel.getChosenItems(), [], 'the second toggle removes it instead of adding a duplicate')
  assert.equal(sel.isChosen(NaN), false)
})

test('QUALITY-92: single fires onChange once for a repeated NaN choice, and setItems keeps it', () => {
  let fired = 0
  const sel = new LLSelectSingle<number>(mount(), { ariaLabel: 'x', onChange: () => { fired++ } })
  sel.setItems([NaN, 1])
  sel.setChosenItem(NaN)
  sel.setChosenItem(NaN)
  assert.equal(fired, 1)
  sel.setItems([NaN])
  assert.equal(fired, 1, 'reconciliation finds the NaN item in the new list, so nothing is dropped')
  assert.ok(Number.isNaN(sel.getChosenItem()))
})
