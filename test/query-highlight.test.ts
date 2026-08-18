import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { createHighlightedTextEl } from '../src/query-highlight.js'
import { LLSelectSingle } from '../src/single.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function markTexts(el: HTMLElement): (string | null)[] {
  return Array.from(el.querySelectorAll('mark')).map(m => m.textContent)
}

// --- createHighlightedTextEl (pure helper) -----------------------------------

test('wraps every case-insensitive occurrence, original casing kept', () => {
  mount()
  const el = createHighlightedTextEl('Pineapple and APPLE', 'apple')
  assert.equal(el.textContent, 'Pineapple and APPLE')
  assert.deepEqual(markTexts(el), ['apple', 'APPLE'])
})

test('empty query: plain text, no marks', () => {
  mount()
  const el = createHighlightedTextEl('Apple', '')
  assert.equal(el.textContent, 'Apple')
  assert.deepEqual(markTexts(el), [])
})

test('no occurrence: plain text, no marks', () => {
  mount()
  const el = createHighlightedTextEl('Banana', 'xyz')
  assert.equal(el.textContent, 'Banana')
  assert.deepEqual(markTexts(el), [])
})

test('occurrences do not overlap: left-to-right scan', () => {
  mount()
  const el = createHighlightedTextEl('aaa', 'aa')
  assert.equal(el.textContent, 'aaa')
  assert.deepEqual(markTexts(el), ['aa'])
})

test('CJK matches (no case mapping)', () => {
  mount()
  const el = createHighlightedTextEl('台北市 台中市', '台')
  assert.deepEqual(markTexts(el), ['台', '台'])
})

test('createMatchElFn replaces the default mark; inserted as-is', () => {
  mount()
  const el = createHighlightedTextEl('one two one', 'one', (matchedText) => {
    const strong = document.createElement('strong')
    strong.textContent = matchedText.toUpperCase()
    return strong
  })
  assert.deepEqual(markTexts(el), [])
  assert.deepEqual(Array.from(el.querySelectorAll('strong')).map(s => s.textContent), ['ONE', 'ONE'])
  assert.equal(el.textContent, 'ONE two ONE')
})

test('length-changing lower-case mapping (U+0130) degrades to unmarked text', () => {
  mount()
  const el = createHighlightedTextEl('İstanbul', 'i')
  assert.equal(el.textContent, 'İstanbul')
  assert.deepEqual(markTexts(el), [])
})

// --- inside createItemContentElFn (the intended seam) ------------------------

test('marks follow each filter keystroke; clearing the query clears them', () => {
  let sel!: LLSelectSingle<string>
  sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    createItemContentElFn: (item) => createHighlightedTextEl(item, sel.getFilterQuery()),
  })
  sel.setItems(['Apple', 'Banana', 'Pineapple'])
  sel.triggerEl.focus()
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'apple'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const options = Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]'))
  assert.equal(options.length, 2)
  assert.deepEqual(options.map(markTexts), [['Apple'], ['apple']])
  // Accessible name stays the plain string, marks never leak into it.
  assert.equal(options[0]!.getAttribute('aria-label'), 'Apple')
  input.value = ''
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(sel.popupListEl.querySelectorAll('mark').length, 0)
})
