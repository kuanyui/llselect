import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { gatherItemsByGroupKey } from '../src/grouping.js'
import { LLSelectSingle } from '../src/single.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function optionTexts(sel: { popupListEl: HTMLElement }): (string | null)[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')).map(el => el.textContent)
}

function groupEls(sel: { popupListEl: HTMLElement }): HTMLElement[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="group"]'))
}

const firstChar = (s: string): string => s[0]!

// --- gatherItemsByGroupKey (pure function) -----------------------------------

test('already-contiguous input is returned as the SAME array (no copy)', () => {
  const items = ['a1', 'a2', 'b1']
  assert.equal(gatherItemsByGroupKey(items, firstChar), items)
})

test('non-contiguous same-key items gather at the key first appearance, relative order kept', () => {
  const out = gatherItemsByGroupKey(['a1', 'b1', 'a2', 'c1', 'b2'], firstChar)
  assert.deepEqual(out, ['a1', 'a2', 'b1', 'b2', 'c1'])
})

test('null-key items stay their own segment at their walk position', () => {
  const keyOf = (s: string): string | null => (s.startsWith('n') ? null : firstChar(s))
  const out = gatherItemsByGroupKey(['a1', 'n1', 'a2', 'b1'], keyOf)
  assert.deepEqual(out, ['a1', 'a2', 'n1', 'b1'])
})

test('all-null keys count as contiguous (same array back)', () => {
  const items = ['x', 'y']
  assert.equal(gatherItemsByGroupKey(items, () => null), items)
})

test('empty input is returned as-is', () => {
  const items: string[] = []
  assert.equal(gatherItemsByGroupKey(items, firstChar), items)
})

test('a custom groupKeyCompareFn drives both detection and bucketing', () => {
  type K = { id: string }
  const keyOf = (s: string): K => ({ id: firstChar(s) })
  // Every key object is fresh, so === would never merge; the predicate must.
  const out = gatherItemsByGroupKey(['a1', 'b1', 'a2'], keyOf, (x, y) => x.id === y.id)
  assert.deepEqual(out, ['a1', 'a2', 'b1'])
  const sorted = ['a1', 'a2', 'b1']
  assert.equal(gatherItemsByGroupKey(sorted, keyOf, (x, y) => x.id === y.id), sorted)
})

// --- gatherGroups on the instance (default true) ------------------------------

test('unsorted data renders ONE header per group, in first-appearance order', () => {
  const warnings: unknown[][] = []
  const orig = console.warn
  console.warn = (...args: unknown[]) => { warnings.push(args) }
  try {
    const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: firstChar })
    sel.setItems(['apple', 'banana', 'avocado'])
    sel.open()
    assert.equal(groupEls(sel).length, 2) // a, b - no duplicate 'a' header
    assert.deepEqual(optionTexts(sel), ['apple', 'avocado', 'banana'])
  } finally {
    console.warn = orig
  }
  assert.equal(warnings.length, 0) // gathered output is well-defined; nothing to warn
})

test('the items data keeps the caller order; only the display is gathered', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: firstChar })
  sel.setItems(['apple', 'banana', 'avocado'])
  sel.open()
  assert.deepEqual([...sel.getItems()], ['apple', 'banana', 'avocado'])
})

test('the gather is lazy: no key lookups on setItems while closed, memoized across renders', () => {
  let calls = 0
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s: string) => { calls++; return firstChar(s) },
  })
  sel.setItems(['apple', 'banana', 'avocado'])
  assert.equal(calls, 0)
  sel.open()
  assert.ok(calls > 0)
})

test('filtering runs over the gathered base: a group keeps its position while typing', () => {
  const sel = new LLSelectSingle<string>(mount(), { filterable: true, itemToGroupKeyFn: firstChar })
  sel.setItems(['apple', 'banana', 'avocado']) // gathered display: apple, avocado, banana
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'a' // apple, avocado, banana all contain 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(optionTexts(sel), ['apple', 'avocado', 'banana'])
  input.value = 'av' // drops apple + banana; group a (avocado) stays before b
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(optionTexts(sel), ['avocado'])
  assert.equal(groupEls(sel).length, 1)
})
