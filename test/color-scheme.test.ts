import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { COLOR_SCHEME_ATTRIBUTE, resolveColorScheme } from '../src/color-scheme.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

// --- the decision, as a pure function ----------------------------------------

test('resolveColorScheme: a forced setting wins over every page input', () => {
  assert.equal(resolveColorScheme({ setting: 'dark', variable: 'light', declared: 'light', osPrefersDark: false }), 'dark')
  assert.equal(resolveColorScheme({ setting: 'light', variable: 'dark', declared: 'dark', osPrefersDark: true }), 'light')
})

test('resolveColorScheme: the variable decides next; auto follows the OS', () => {
  assert.equal(resolveColorScheme({ setting: 'auto', variable: 'dark', declared: 'light', osPrefersDark: false }), 'dark')
  assert.equal(resolveColorScheme({ setting: 'auto', variable: ' light ', declared: 'dark', osPrefersDark: true }), 'light')
  assert.equal(resolveColorScheme({ setting: 'auto', variable: 'auto', declared: 'normal', osPrefersDark: true }), 'dark')
  assert.equal(resolveColorScheme({ setting: 'auto', variable: 'auto', declared: 'dark', osPrefersDark: false }), 'light')
})

test('resolveColorScheme: the declared color-scheme mirrors a native control', () => {
  const declared = (value: string, osPrefersDark: boolean): string => resolveColorScheme({ setting: 'auto', variable: '', declared: value, osPrefersDark })
  assert.equal(declared('normal', true), 'light')
  assert.equal(declared('', true), 'light')
  assert.equal(declared('light', true), 'light')
  assert.equal(declared('dark', false), 'dark')
  assert.equal(declared('light dark', false), 'light')
  assert.equal(declared('light dark', true), 'dark')
  assert.equal(declared('dark light', true), 'dark')
  assert.equal(declared('only light', true), 'light')
})

test('resolveColorScheme: any other variable text falls through to the declared property', () => {
  assert.equal(resolveColorScheme({ setting: 'auto', variable: 'night', declared: 'dark', osPrefersDark: false }), 'dark')
  assert.equal(resolveColorScheme({ setting: 'auto', variable: 'DARK', declared: 'normal', osPrefersDark: true }), 'light')
})

// --- the widget --------------------------------------------------------------

test("'auto' writes the attribute on the root; with nothing declared the result is light", async () => {
  const sel = new LLSelectSingle<string>(mount())
  await Promise.resolve()
  assert.equal(sel.getColorScheme(), 'light')
  assert.equal(sel.rootEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
})

test('a forced setting writes its value and ignores the page', () => {
  const el = mount()
  el.style.setProperty('--llselect-color-scheme', 'dark')
  const sel = new LLSelectSingle<string>(el, { colorScheme: 'light' })
  assert.equal(sel.getColorScheme(), 'light')
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  const dark = new LLSelectSingle<string>(mount(), { colorScheme: 'dark' })
  assert.equal(dark.getColorScheme(), 'dark')
  assert.equal(dark.rootEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test("the variable on the root drives 'auto'; refreshColorScheme() and open() decide again", () => {
  // jsdom computes a custom property declared on the element itself (not an
  // inherited one), which is enough to exercise the variable path.
  const el = mount()
  el.style.setProperty('--llselect-color-scheme', 'dark')
  const sel = new LLSelectSingle<string>(el)
  sel.setItems(['a', 'b'])
  assert.equal(sel.getColorScheme(), 'dark')
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  el.style.setProperty('--llselect-color-scheme', 'light')
  assert.equal(sel.getColorScheme(), 'dark', 'nothing re-decides on its own in jsdom')
  sel.refreshColorScheme()
  assert.equal(sel.getColorScheme(), 'light')
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  el.style.setProperty('--llselect-color-scheme', 'dark')
  sel.open()
  assert.equal(sel.getColorScheme(), 'dark')
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test("an 'auto' instance decides in a microtask; getColorScheme() decides at once when asked earlier", async () => {
  const el = mount()
  el.style.setProperty('--llselect-color-scheme', 'dark')
  const sel = new LLSelectSingle<string>(el)
  assert.equal(el.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false, 'not yet: the first decision is batched')
  await Promise.resolve()
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  assert.equal(sel.getColorScheme(), 'dark')
  const el2 = mount()
  el2.style.setProperty('--llselect-color-scheme', 'dark')
  const eager = new LLSelectSingle<string>(el2)
  assert.equal(eager.getColorScheme(), 'dark', 'asked before the microtask: decides now')
  assert.equal(el2.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  await Promise.resolve()
  assert.equal(el2.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'the batch does not decide it twice to a different value')
})

test('a forced setting is written at construction, with no microtask', () => {
  const sel = new LLSelectSingle<string>(mount(), { colorScheme: 'dark' })
  assert.equal(sel.rootEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test('destroy() removes the attribute from the root and cancels a pending first decision', async () => {
  const sel = new LLSelectSingle<string>(mount())
  await Promise.resolve()
  assert.equal(sel.rootEl.hasAttribute(COLOR_SCHEME_ATTRIBUTE), true)
  sel.destroy()
  assert.equal(sel.rootEl.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false)
  const early = new LLSelectSingle<string>(mount())
  early.destroy()
  await Promise.resolve()
  assert.equal(early.rootEl.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false, 'destroyed before the batch ran: nothing written')
})
