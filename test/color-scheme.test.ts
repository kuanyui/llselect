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

test('the shared observer: an attribute change on <html> makes every widget decide again', async () => {
  // jsdom has a MutationObserver and no matchMedia; the variable lives on the
  // roots themselves (jsdom computes no inherited custom property).
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b"></div></body></html>')
  const a = document.getElementById('a'), b = document.getElementById('b')
  assert.ok(a); assert.ok(b)
  const selA = new LLSelectSingle<string>(a), selB = new LLSelectSingle<string>(b)
  await Promise.resolve()
  assert.equal(selA.getColorScheme(), 'light')
  assert.equal(selB.getColorScheme(), 'light')
  a.style.setProperty('--llselect-color-scheme', 'dark')
  b.style.setProperty('--llselect-color-scheme', 'dark')
  document.documentElement.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'refreshed through the shared observer')
  assert.equal(b.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test('destroy() ends the subscription: a later <html> change writes nothing back', async () => {
  const el = mount()
  const sel = new LLSelectSingle<string>(el)
  await Promise.resolve()
  sel.destroy()
  // destroy() removed the attribute; put it back so the shared pass finds the
  // element again, which makes the subscription the only thing under test
  el.setAttribute(COLOR_SCHEME_ATTRIBUTE, 'light')
  el.style.setProperty('--llselect-color-scheme', 'dark')
  document.documentElement.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
})

test('a replaced <body> is observed too', async () => {
  const el = mount()
  const sel = new LLSelectSingle<string>(el)
  await Promise.resolve()
  const body = document.createElement('body')
  body.appendChild(el)
  document.body = body
  await new Promise((resolve) => setTimeout(resolve, 0)) // the child-list record of <html> arrives; the new <body> is observed
  el.style.setProperty('--llselect-color-scheme', 'dark')
  body.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(sel.getColorScheme(), 'dark')
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  // a <body> removed without replacement, then a new one: the new one is
  // observed, the removed one no longer (its attribute change starts no pass)
  document.documentElement.removeChild(body)
  await new Promise((resolve) => setTimeout(resolve, 0))
  const body2 = document.createElement('body')
  body2.appendChild(el)
  document.documentElement.appendChild(body2)
  await new Promise((resolve) => setTimeout(resolve, 0))
  el.style.setProperty('--llselect-color-scheme', 'light') // inline: observed by nothing
  body.setAttribute('data-color-scheme', 'light')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(sel.getColorScheme(), 'dark', 'the removed <body> is not observed any longer')
  body2.setAttribute('data-color-scheme', 'light')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(sel.getColorScheme(), 'light', 'the new <body> is observed')
})

test('several widgets built in one task have all decided after one microtask, none before', async () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b" style="--llselect-color-scheme: dark"></div></body></html>')
  const a = document.getElementById('a'), b = document.getElementById('b')
  assert.ok(a); assert.ok(b)
  new LLSelectSingle<string>(a)
  new LLSelectSingle<string>(b)
  assert.equal(a.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false)
  assert.equal(b.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false)
  await Promise.resolve()
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  assert.equal(b.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test('a newer instance built on the same element replaces the older one: the older pending decision and subscription are dropped', async () => {
  const el = mount()
  el.style.setProperty('--llselect-color-scheme', 'dark')
  new LLSelectSingle<string>(el) // 'auto', its first decision pending
  new LLSelectSingle<string>(el, { colorScheme: 'light' })
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  await Promise.resolve()
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', "the older instance's batched decision did not overwrite the forced one")
  document.documentElement.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', "the older instance's subscription is gone")
})

test("getColorScheme() on a replaced older instance does not cancel the newer instance's pending decision", async () => {
  const el = mount()
  const older = new LLSelectSingle<string>(el)
  new LLSelectSingle<string>(el) // 'auto' too: its pending decision replaces the older one's
  older.getColorScheme() // an unsupported call on a replaced instance: it decides the older one now and must leave the newer decision queued
  el.style.setProperty('--llselect-color-scheme', 'dark')
  await Promise.resolve()
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'the newer instance still decided in the batch')
})

test('a widget built on a detached element decides light; refreshColorScheme() after insertion decides again', () => {
  setupDom()
  const el = document.createElement('div')
  const sel = new LLSelectSingle<string>(el)
  assert.equal(sel.getColorScheme(), 'light')
  el.style.setProperty('--llselect-color-scheme', 'dark')
  document.body.appendChild(el)
  sel.refreshColorScheme()
  assert.equal(sel.getColorScheme(), 'dark')
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
