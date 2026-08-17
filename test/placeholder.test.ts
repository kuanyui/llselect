import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el, 'mount element should exist')
  return el
}

test('setPlaceholder updates the empty trigger immediately', () => {
  const sel = new LLSelectSingle<string>(mount(), { placeholder: 'Pick one' })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerContentEl.textContent, 'Pick one')
  sel.setPlaceholder('Choose a letter')
  assert.equal(sel.triggerContentEl.textContent, 'Choose a letter')
})

test('setPlaceholder(null) reverts to the pack default', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    placeholder: 'Pick one',
    uiTranslationPack: { triggerPlaceholder: 'PACK DEFAULT' },
  })
  sel.setPlaceholder(null)
  assert.equal(sel.triggerContentEl.textContent, 'PACK DEFAULT')
})

test('a chosen trigger shows the item, and the new placeholder appears after clearing', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.setPlaceholder('Later')
  assert.equal(sel.triggerContentEl.textContent, 'a')
  sel.setChosenItem(undefined)
  assert.equal(sel.triggerContentEl.textContent, 'Later')
})

test('an explicit setPlaceholder value keeps winning over a later pack change', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setPlaceholder('Explicit')
  sel.setUiTranslationPack({ triggerPlaceholder: 'PACK' })
  assert.equal(sel.triggerContentEl.textContent, 'Explicit')
})

test('after setPlaceholder(null), a later pack change supplies the placeholder', () => {
  const sel = new LLSelectSingle<string>(mount(), { placeholder: 'Explicit' })
  sel.setPlaceholder(null)
  sel.setUiTranslationPack({ triggerPlaceholder: 'PACK' })
  assert.equal(sel.triggerContentEl.textContent, 'PACK')
})

test('setPlaceholder updates the empty multiple trigger too', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b'])
  sel.setPlaceholder('None chosen yet')
  assert.equal(sel.triggerContentEl.textContent, 'None chosen yet')
  sel.setChosenItems(['a'])
  assert.notEqual(sel.triggerContentEl.textContent, 'None chosen yet')
})
