import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { en, ja, zhTW } from '../src/i18n.js'

// Language packs (`llselect/i18n`): pure LLSelectTexts data spreadable into
// the `texts` setting. Assertions compare against the pack values themselves,
// so this file needs no CJK literals of its own.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

test('every pack is a complete LLSelectTexts (same keys as en)', () => {
  for (const pack of [ja, zhTW]) {
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(en).sort())
  }
})

test('a whole language pack applies to every chrome string (zhTW)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    searchable: true,
    clearable: true,
    triggerDisplay: 'tags',
    texts: zhTW,
  })
  sel.setItems(['a', 'b', 'c'])
  // No `placeholder` passed -> the pack's localized trigger default shows.
  assert.equal(sel.triggerContentEl.textContent, zhTW.triggerPlaceholder)
  sel.setChosenItems(['a', 'b'])
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-label'), zhTW.searchInputAriaLabel)
  assert.equal(input.placeholder, zhTW.searchInputPlaceholder)
  const clearBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)!
  assert.equal(clearBtn.getAttribute('aria-label'), zhTW.triggerClearButtonAriaLabel)
  const removeBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  assert.equal(removeBtn.getAttribute('aria-label'), zhTW.tagRemoveButtonAriaLabel('a'))
})

test('the count summary comes from the pack (ja)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { texts: ja })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, ja.triggerCountSummary(1, 3))
  sel.setChosenItems(['a', 'b', 'c'])
  assert.equal(sel.triggerContentEl.textContent, ja.triggerCountSummary(3, 3))
})

test('an explicit placeholder setting (app copy) wins over the pack default', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    placeholder: 'Pick some',
    texts: zhTW,
  })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerContentEl.textContent, 'Pick some')
})

test('getTexts exposes the resolved bag (defaults + pack + overrides merged)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    texts: { ...zhTW, searchInputAriaLabel: 'custom' },
  })
  const texts = sel.getTexts()
  assert.equal(texts.searchInputAriaLabel, 'custom') // per-key override
  assert.equal(texts.triggerPlaceholder, zhTW.triggerPlaceholder) // from the pack
  // App reuse case: the library's translation drives an app-owned tooltip.
  assert.equal(texts.tagRemoveButtonAriaLabel('x'), zhTW.tagRemoveButtonAriaLabel('x'))

  const sel2 = new LLSelectMultiple<string>(mount())
  assert.equal(sel2.getTexts().searchInputAriaLabel, en.searchInputAriaLabel) // en fallback
})

test('a pack composes with per-key overrides (spread order wins)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    searchable: true,
    texts: { ...zhTW, searchInputAriaLabel: 'custom' },
  })
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-label'), 'custom')
})
