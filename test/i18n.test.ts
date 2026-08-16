import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { ar, en, he, ja, zhTW, uiTranslationPackByLocale } from '../src/i18n.js'

// Language packs (`@llselect/core/i18n`): pure LLSelectUiTranslationPack data spreadable into
// the `uiTranslationPack` setting. Assertions compare against the pack values themselves,
// so this file needs no CJK literals of its own.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

test('every pack is a complete LLSelectUiTranslationPack (same keys as en)', () => {
  for (const [tag, pack] of Object.entries(uiTranslationPackByLocale)) {
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(en).sort(), `pack ${tag}`)
  }
})

test('uiTranslationPackByLocale maps minimal BCP 47 tags to the packs, aliases share the object', () => {
  assert.equal(uiTranslationPackByLocale['ar'], ar)
  assert.equal(uiTranslationPackByLocale['en'], en)
  assert.equal(uiTranslationPackByLocale['he'], he)
  assert.equal(uiTranslationPackByLocale['ja'], ja)
  assert.equal(uiTranslationPackByLocale['zh-TW'], zhTW)
  // Aliases: macrolanguage / same-written-form tags resolve to the same pack.
  assert.equal(uiTranslationPackByLocale['no'], uiTranslationPackByLocale['nb'])
  assert.equal(uiTranslationPackByLocale['zh-HK'], uiTranslationPackByLocale['zh-TW'])
  // Keys stay sorted (aliases sit at their own alphabetical spot).
  const keys = Object.keys(uiTranslationPackByLocale)
  assert.deepEqual(keys, [...keys].sort())
})

test('every pack: strings non-empty, message functions total over count shapes', () => {
  for (const [tag, pack] of Object.entries(uiTranslationPackByLocale)) {
    assert.ok(pack.triggerPlaceholder.length > 0, `${tag} triggerPlaceholder`)
    assert.ok(pack.filterInputAriaLabel.length > 0, `${tag} filterInputAriaLabel`)
    assert.ok((pack.filterInputPlaceholder ?? '').length > 0, `${tag} filterInputPlaceholder`)
    assert.ok(pack.popupListNoResults.length > 0, `${tag} popupListNoResults`)
    assert.ok(pack.triggerClearButtonAriaLabel.length > 0, `${tag} triggerClearButtonAriaLabel`)
    assert.ok(pack.tagRemoveButtonAriaLabel('XQ').includes('XQ'), `${tag} tagRemoveButtonAriaLabel embeds the label`)
    // Singular / partial / all / degenerate single-item shapes all render.
    for (const [chosen, total] of [[1, 5], [3, 5], [5, 5], [1, 1]] as const) {
      assert.ok(pack.triggerCountSummary(chosen, total).length > 0, `${tag} triggerCountSummary(${chosen}, ${total})`)
      assert.ok(pack.chooseAllRowText(chosen, total).length > 0, `${tag} chooseAllRowText(${chosen}, ${total})`)
    }
    assert.notEqual(pack.triggerCountSummary(3, 5), pack.triggerCountSummary(5, 5), `${tag} partial vs all differ`)
  }
})

test('a whole language pack applies to every chrome string (zhTW)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    filterable: true,
    clearable: true,
    triggerDisplay: 'tags',
    uiTranslationPack: zhTW,
  })
  sel.setItems(['a', 'b', 'c'])
  // No `placeholder` passed -> the pack's localized trigger default shows.
  assert.equal(sel.triggerContentEl.textContent, zhTW.triggerPlaceholder)
  sel.setChosenItems(['a', 'b'])
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-label'), zhTW.filterInputAriaLabel)
  assert.equal(input.placeholder, zhTW.filterInputPlaceholder)
  const clearBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)!
  assert.equal(clearBtn.getAttribute('aria-label'), zhTW.triggerClearButtonAriaLabel)
  const removeBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  assert.equal(removeBtn.getAttribute('aria-label'), zhTW.tagRemoveButtonAriaLabel('a'))
  const noResults = sel.popupEl.querySelector(`.${sel.classIdMap.popupListNoResultsClass}`)!
  // The message fills lazily when the empty state shows (it is query-aware):
  // open and filter to zero matches first.
  sel.open()
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(noResults.textContent, zhTW.popupListNoResults)
})

test('the count summary comes from the pack (ja)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { uiTranslationPack: ja })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, ja.triggerCountSummary(1, 3))
  sel.setChosenItems(['a', 'b', 'c'])
  assert.equal(sel.triggerContentEl.textContent, ja.triggerCountSummary(3, 3))
})

test('an explicit placeholder setting (app copy) wins over the pack default', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    placeholder: 'Pick some',
    uiTranslationPack: zhTW,
  })
  sel.setItems(['a', 'b'])
  assert.equal(sel.triggerContentEl.textContent, 'Pick some')
})

test('getUiTranslationPack exposes the resolved bag (defaults + pack + overrides merged)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    uiTranslationPack: { ...zhTW, filterInputAriaLabel: 'custom' },
  })
  const pack = sel.getUiTranslationPack()
  assert.equal(pack.filterInputAriaLabel, 'custom') // per-key override
  assert.equal(pack.triggerPlaceholder, zhTW.triggerPlaceholder) // from the pack
  // App reuse case: the library's translation drives an app-owned tooltip.
  assert.equal(pack.tagRemoveButtonAriaLabel('x'), zhTW.tagRemoveButtonAriaLabel('x'))

  const sel2 = new LLSelectMultiple<string>(mount())
  assert.equal(sel2.getUiTranslationPack().filterInputAriaLabel, en.filterInputAriaLabel) // en fallback
})

test('a pack composes with per-key overrides (spread order wins)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    filterable: true,
    uiTranslationPack: { ...zhTW, filterInputAriaLabel: 'custom' },
  })
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-label'), 'custom')
})

test('setUiTranslationPack switches every chrome string at runtime (en -> zhTW)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true, clearable: true, triggerDisplay: 'tags' })
  sel.setItems(['a', 'b', 'c'])
  assert.equal(sel.triggerContentEl.textContent, en.triggerPlaceholder)
  sel.setUiTranslationPack(zhTW)
  assert.equal(sel.triggerContentEl.textContent, zhTW.triggerPlaceholder)
  // Elements rerender() does not rebuild get their attributes re-applied:
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.getAttribute('aria-label'), zhTW.filterInputAriaLabel)
  assert.equal(input.placeholder, zhTW.filterInputPlaceholder)
  const clearBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.triggerClearButtonClass}`)!
  assert.equal(clearBtn.getAttribute('aria-label'), zhTW.triggerClearButtonAriaLabel)
  // Chips rebuild through the normal trigger render.
  sel.setChosenItems(['a'])
  const removeBtn = sel.triggerEl.querySelector(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  assert.equal(removeBtn.getAttribute('aria-label'), zhTW.tagRemoveButtonAriaLabel('a'))
})

test('setUiTranslationPack resolves against the built-in English pack, not the previous pack', () => {
  const sel = new LLSelectMultiple<string>(mount(), { uiTranslationPack: zhTW })
  sel.setItems(['a'])
  sel.setUiTranslationPack({})
  assert.equal(sel.triggerContentEl.textContent, en.triggerPlaceholder)
  assert.equal(sel.getUiTranslationPack().popupListNoResults, en.popupListNoResults)
})

test('setUiTranslationPack: an explicit constructor placeholder keeps winning', () => {
  const sel = new LLSelectMultiple<string>(mount(), { placeholder: 'Pick some', uiTranslationPack: zhTW })
  sel.setItems(['a'])
  sel.setUiTranslationPack(ja)
  assert.equal(sel.triggerContentEl.textContent, 'Pick some')
})

test('setUiTranslationPack: filterInputPlaceholder null removes the attribute, a later pack restores it', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true })
  const input = sel.popupEl.querySelector('input')!
  assert.equal(input.placeholder, en.filterInputPlaceholder)
  sel.setUiTranslationPack({ filterInputPlaceholder: null })
  assert.equal(input.hasAttribute('placeholder'), false)
  sel.setUiTranslationPack(zhTW)
  assert.equal(input.placeholder, zhTW.filterInputPlaceholder)
})

test('setUiTranslationPack while open re-renders the popup (no-results + count summary)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, en.triggerCountSummary(1, 2))
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const noResults = sel.popupEl.querySelector(`.${sel.classIdMap.popupListNoResultsClass}`)!
  assert.equal(noResults.textContent, en.popupListNoResults)
  sel.setUiTranslationPack(ja)
  assert.equal(noResults.textContent, ja.popupListNoResults)
  assert.equal(sel.triggerContentEl.textContent, ja.triggerCountSummary(1, 2))
})
