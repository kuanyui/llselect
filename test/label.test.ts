import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// The labelEl setting - native <label for> emulation for a div widget:
// clicking the label focuses the trigger (never opens), and the label feeds
// the accessible name as the BOTTOM rung of the ladder
// ariaLabelledBy > ariaLabel > labelEl. Contract: A11Y.md "Field name".

function mountWithLabel(labelId?: string): { mount: HTMLElement; label: HTMLLabelElement } {
  setupDom('<!doctype html><html><body><label>Country</label><div id="mount"></div></body></html>')
  const label = document.querySelector('label')!
  if (labelId !== undefined) { label.id = labelId }
  return { mount: document.getElementById('mount')!, label }
}

test('label click focuses the trigger and does not open', () => {
  const { mount, label } = mountWithLabel()
  const sel = new LLSelectSingle<string>(mount, { labelEl: label })
  sel.setItems(['a', 'b'])
  label.click()
  assert.equal(document.activeElement, sel.triggerEl)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
})

test('labelEl is the bottom name rung: no aria settings -> aria-labelledby references the label', () => {
  const { mount, label } = mountWithLabel('my-label')
  const sel = new LLSelectSingle<string>(mount, { labelEl: label })
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), 'my-label')
})

test('a label without id gets classIdMap.labelId minted', () => {
  const { mount, label } = mountWithLabel()
  const sel = new LLSelectSingle<string>(mount, { labelEl: label })
  assert.equal(label.id, sel.classIdMap.labelId)
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), sel.classIdMap.labelId)
})

test('explicit ariaLabelledBy and ariaLabel win over labelEl for the name; the click stays wired', () => {
  const { mount, label } = mountWithLabel('lbl')
  const other = document.createElement('span')
  other.id = 'other-name'
  document.body.append(other)
  const sel = new LLSelectSingle<string>(mount, { labelEl: label, ariaLabelledBy: 'other-name' })
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), 'other-name')
  label.click()
  assert.equal(document.activeElement, sel.triggerEl)
  sel.destroy()

  const { mount: mount2, label: label2 } = mountWithLabel('lbl2')
  const sel2 = new LLSelectSingle<string>(mount2, { labelEl: label2, ariaLabel: 'Plain name' })
  assert.equal(sel2.triggerEl.getAttribute('aria-label'), 'Plain name')
  assert.equal(sel2.triggerEl.getAttribute('aria-labelledby'), null)
  label2.click()
  assert.equal(document.activeElement, sel2.triggerEl)
})

test('searchable mode: the search input carries the label reference', () => {
  const { mount, label } = mountWithLabel('search-lbl')
  const sel = new LLSelectSingle<string>(mount, { labelEl: label, searchable: true })
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-labelledby'), 'search-lbl')
})

test('destroy removes the click listener and only a MINTED id', () => {
  const { mount, label } = mountWithLabel()
  const sel = new LLSelectSingle<string>(mount, { labelEl: label })
  sel.destroy()
  assert.equal(label.id, '')
  label.click()
  assert.notEqual(document.activeElement, sel.triggerEl)

  const { mount: mount2, label: label2 } = mountWithLabel('keep-me')
  const sel2 = new LLSelectSingle<string>(mount2, { labelEl: label2 })
  sel2.destroy()
  assert.equal(label2.id, 'keep-me')
})
