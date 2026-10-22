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
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'provisional until the batched first decision: this document has decided nothing yet')
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

test('the shared pass reads every widget before it writes any attribute', async () => {
  setupDom('<!doctype html><html><body></body></html>')
  const roots: HTMLElement[] = []
  for (let i = 0; i < 3; i++) { const el = document.createElement('div'); document.body.appendChild(el); roots.push(el) }
  const widgets = roots.map((el) => new LLSelectSingle<string>(el))
  await Promise.resolve()
  const log: string[] = []
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => { log.push('read'); return originalGetComputedStyle.call(window, el, pseudo) }) as typeof window.getComputedStyle
  for (const el of roots) {
    el.style.setProperty('--llselect-color-scheme', 'dark')
    const originalSetAttribute = el.setAttribute.bind(el)
    el.setAttribute = (name: string, value: string) => { if (name === 'data-llselect-color-scheme') { log.push('write') } originalSetAttribute(name, value) }
  }
  document.documentElement.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(log.filter((e) => e === 'read').length, 3)
  assert.equal(log.filter((e) => e === 'write').length, 3)
  assert.ok(log.lastIndexOf('read') < log.indexOf('write'), `every read precedes every write: ${log.join(' ')}`)
  for (const w of widgets) { w.destroy() }
  window.getComputedStyle = originalGetComputedStyle
})

test('a forced setting does not become the provisional value of later auto widgets', async () => {
  setupDom('<!doctype html><html><body><div id="forced"></div><div id="auto"></div></body></html>')
  const forced = document.getElementById('forced'), auto = document.getElementById('auto')
  assert.ok(forced); assert.ok(auto)
  new LLSelectSingle<string>(forced, { colorScheme: 'dark' })
  assert.equal(forced.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  new LLSelectSingle<string>(auto)
  assert.equal(auto.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'the forced dark is not a decision about the page')
  await Promise.resolve()
  assert.equal(auto.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
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

test('a document without <html> throws neither in the observer callback nor at wiring', async () => {
  // the callback: wired with an <html> that is removed later. jsdom reports an
  // exception thrown inside an observer callback as a window "error" event,
  // not as a thrown error, so that event is what the test watches
  const el = mount()
  new LLSelectSingle<string>(el)
  await Promise.resolve()
  const errors: string[] = []
  window.addEventListener('error', (e) => { errors.push(e.message); e.preventDefault() })
  const body = document.body
  el.style.setProperty('--llselect-color-scheme', 'dark')
  body.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(el.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'the <body> is registered, so the callback below does run')
  document.removeChild(document.documentElement)
  body.setAttribute('data-color-scheme', 'dark') // the old <body> is still registered: the callback runs with no <html>
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.deepEqual(errors, [])
  // the wiring: a fresh document whose <html> is gone before its first widget
  setupDom()
  document.removeChild(document.documentElement)
  const sel = new LLSelectSingle<string>(document.createElement('div'))
  assert.equal(sel.getColorScheme(), 'light')
})

test('a document wired before <body> exists observes the <body> that arrives later', async () => {
  setupDom()
  document.documentElement.removeChild(document.body)
  const el = document.createElement('div')
  const sel = new LLSelectSingle<string>(el) // wires the document while only <html> exists
  const body = document.createElement('body')
  body.appendChild(el)
  document.documentElement.appendChild(body)
  await new Promise((resolve) => setTimeout(resolve, 0)) // the child-list record of <html>: the new <body> is registered
  el.style.setProperty('--llselect-color-scheme', 'dark')
  body.setAttribute('data-color-scheme', 'dark')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(sel.getColorScheme(), 'dark', 'the <body> that arrived after the wiring is observed')
})

test('a batch reads every widget before it writes any attribute', async () => {
  setupDom('<!doctype html><html><body></body></html>')
  const log: string[] = []
  const originalGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => { log.push('read'); return originalGetComputedStyle.call(window, el, pseudo) }) as typeof window.getComputedStyle
  const roots: HTMLElement[] = []
  for (let i = 0; i < 3; i++) {
    const el = document.createElement('div')
    el.style.setProperty('--llselect-color-scheme', 'dark') // the batch must write: the provisional value is light
    document.body.appendChild(el)
    const originalSetAttribute = el.setAttribute.bind(el)
    el.setAttribute = (name: string, value: string) => { if (name === 'data-llselect-color-scheme') { log.push('write') } originalSetAttribute(name, value) }
    roots.push(el)
  }
  const widgets = roots.map((el) => new LLSelectSingle<string>(el, { colorScheme: 'auto' }))
  assert.deepEqual(log.splice(0), ['write', 'write', 'write'], 'the constructors write the provisional value and read nothing')
  await Promise.resolve()
  assert.equal(log.filter((e) => e === 'read').length, 3)
  assert.equal(log.filter((e) => e === 'write').length, 3)
  assert.ok(log.lastIndexOf('read') < log.indexOf('write'), `every read precedes every write: ${log.join(' ')}`)
  for (const w of widgets) { w.destroy() }
  window.getComputedStyle = originalGetComputedStyle
})

test("the provisional value is the document's last decision: a widget built after a dark decision starts dark", async () => {
  setupDom('<!doctype html><html><body><div id="a" style="--llselect-color-scheme: dark"></div><div id="b" style="--llselect-color-scheme: dark"></div></body></html>')
  const a = document.getElementById('a'), b = document.getElementById('b')
  assert.ok(a); assert.ok(b)
  new LLSelectSingle<string>(a)
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'nothing decided yet in this document')
  await Promise.resolve()
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  new LLSelectSingle<string>(b)
  assert.equal(b.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'provisional: the document last decided dark')
  await Promise.resolve()
  assert.equal(b.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
})

test('several widgets built in one task carry the provisional value, then have all decided after one microtask', async () => {
  setupDom('<!doctype html><html><body><div id="a"></div><div id="b" style="--llselect-color-scheme: dark"></div></body></html>')
  const a = document.getElementById('a'), b = document.getElementById('b')
  assert.ok(a); assert.ok(b)
  new LLSelectSingle<string>(a)
  new LLSelectSingle<string>(b)
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  assert.equal(b.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
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
  assert.equal(early.rootEl.hasAttribute(COLOR_SCHEME_ATTRIBUTE), false, 'destroyed before the batch ran: the batch writes nothing back')
})

test("a decision on a detached root is not remembered: the next widget's provisional value is the last connected decision", async () => {
  setupDom('<!doctype html><html><body><div id="a" style="--llselect-color-scheme: dark"></div><div id="c"></div></body></html>')
  const a = document.getElementById('a'), c = document.getElementById('c')
  assert.ok(a); assert.ok(c)
  new LLSelectSingle<string>(a)
  await Promise.resolve()
  assert.equal(a.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'the document remembers dark')
  const detached = new LLSelectSingle<string>(document.createElement('div'))
  assert.equal(detached.getColorScheme(), 'light', 'decided at once, on a root outside the document')
  new LLSelectSingle<string>(c)
  assert.equal(c.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'provisional: the detached decision was not remembered')
  await Promise.resolve()
  assert.equal(c.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'the batch corrects the guess')
})

// --- nested roots, and a root replaced inside another root's write -----------

// jsdom computes no inherited color-scheme. This emulates the themes' rule
// that gives the trigger and the popup the scheme of their root's attribute:
// a root inside another widget sees the outer root's attribute, every other
// root sees page.scheme, the scheme the page declares. A root in `declared`
// sees its own declaration instead.
function emulateInheritedColorScheme(page: { scheme: string }, declared = new Map<Element, string>()): () => void {
  const original = window.getComputedStyle
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    const real = original.call(window, el, pseudo)
    const outerRoot = el.parentElement?.closest(`[${COLOR_SCHEME_ATTRIBUTE}]`)
    const scheme = declared.get(el) ?? (outerRoot ? outerRoot.getAttribute(COLOR_SCHEME_ATTRIBUTE) ?? '' : page.scheme)
    return { getPropertyValue: (name: string) => (name === 'color-scheme' ? scheme : real.getPropertyValue(name)) }
  }) as unknown as typeof window.getComputedStyle
  return () => { window.getComputedStyle = original }
}

// An outer widget with an inner widget in its popup header, built in one task.
function buildNestedPair(): { outerEl: HTMLElement, innerEl: HTMLElement, inner: LLSelectSingle<string> } {
  const outerEl = document.createElement('div')
  document.body.appendChild(outerEl)
  const innerEl = document.createElement('div')
  const outer = new LLSelectSingle<string>(outerEl, { createPopupHeaderContentElFn: () => innerEl })
  const inner = new LLSelectSingle<string>(innerEl)
  assert.ok(outer.popupEl.contains(innerEl) && outerEl.contains(innerEl), 'the inner root sits in the outer popup')
  return { outerEl, innerEl, inner }
}

test("the first batch: a root inside another widget's popup reads after the outer root wrote its attribute", async () => {
  setupDom()
  const restore = emulateInheritedColorScheme({ scheme: 'dark' })
  const { outerEl, innerEl } = buildNestedPair()
  await Promise.resolve()
  assert.equal(outerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  assert.equal(innerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', "the inner root inherits the outer root's decision, not its provisional light")
  restore()
})

test("the shared pass: a root inside another widget's popup reads after the outer root wrote its attribute", async () => {
  setupDom()
  const page = { scheme: 'light' }
  const restore = emulateInheritedColorScheme(page)
  const { outerEl, innerEl } = buildNestedPair()
  await Promise.resolve()
  assert.equal(innerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  page.scheme = 'dark'
  document.documentElement.setAttribute('data-x', '1')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(outerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  assert.equal(innerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', "the inner root inherits the outer root's new decision")
  restore()
})

test('the first batch: nested roots built inner first still decide outer first', async () => {
  // A leaf root, then a middle root whose popup header holds the leaf, then
  // an outer root whose popup header holds the middle: the batch comes in
  // that order. The page is light and the middle root declares dark, so the
  // middle root's write is the leaf's only way to dark.
  setupDom()
  const leafEl = document.createElement('div')
  const middleEl = document.createElement('div')
  const restore = emulateInheritedColorScheme({ scheme: 'light' }, new Map<Element, string>([[middleEl, 'dark']]))
  new LLSelectSingle<string>(leafEl)
  new LLSelectSingle<string>(middleEl, { createPopupHeaderContentElFn: () => leafEl })
  const outerEl = document.createElement('div')
  document.body.appendChild(outerEl)
  new LLSelectSingle<string>(outerEl, { createPopupHeaderContentElFn: () => middleEl })
  await Promise.resolve()
  assert.equal(outerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  assert.equal(middleEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark')
  assert.equal(leafEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', "the leaf reads after the middle root wrote, not the middle root's provisional light")
  restore()
})

test("an early getColorScheme() on a root inside another widget's popup is corrected by the first batch", async () => {
  setupDom()
  const restore = emulateInheritedColorScheme({ scheme: 'dark' })
  const { innerEl, inner } = buildNestedPair()
  assert.equal(inner.getColorScheme(), 'light', "decided at once, while the outer root still holds its provisional light")
  await Promise.resolve()
  assert.equal(innerEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'dark', 'the queued decision ran after the outer root wrote')
  assert.equal(inner.getColorScheme(), 'dark')
  restore()
})

// Root a is a custom element that observes the output attribute: its callback
// runs inside the library's setAttribute. When a turns dark, the callback
// destroys widget b and builds a forced-light widget on b's root while the
// batch still has b's decision to write.
function observeAndReplace(): { aEl: HTMLElement, bEl: HTMLElement, state: { b?: LLSelectSingle<string>, replacement?: LLSelectSingle<string> } } {
  const bEl = document.createElement('div')
  const state: { b?: LLSelectSingle<string>, replacement?: LLSelectSingle<string> } = {}
  window.customElements.define('x-observing-root', class extends window.HTMLElement {
    static get observedAttributes(): string[] { return [COLOR_SCHEME_ATTRIBUTE] }
    attributeChangedCallback(_name: string, _old: string | null, value: string | null): void {
      if (value !== 'dark' || state.b === undefined || state.replacement !== undefined) { return }
      state.b.destroy()
      state.replacement = new LLSelectSingle<string>(bEl, { colorScheme: 'light' })
    }
  })
  const aEl = document.createElement('x-observing-root')
  document.body.append(aEl, bEl)
  return { aEl, bEl, state }
}

test("the first batch: a widget replaced inside another root's write keeps the replacement's scheme", async () => {
  setupDom()
  const { aEl, bEl, state } = observeAndReplace()
  aEl.style.setProperty('--llselect-color-scheme', 'dark')
  bEl.style.setProperty('--llselect-color-scheme', 'dark')
  new LLSelectSingle<string>(aEl)
  state.b = new LLSelectSingle<string>(bEl)
  await Promise.resolve()
  assert.ok(state.replacement, "a's write replaced b")
  assert.equal(bEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'the replaced instance writes nothing afterwards')
  assert.equal(state.replacement.getColorScheme(), 'light')
})

test("the shared pass: a widget replaced inside another root's write keeps the replacement's scheme", async () => {
  setupDom()
  const { aEl, bEl, state } = observeAndReplace()
  new LLSelectSingle<string>(aEl)
  state.b = new LLSelectSingle<string>(bEl)
  await Promise.resolve()
  assert.equal(aEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light')
  aEl.style.setProperty('--llselect-color-scheme', 'dark')
  bEl.style.setProperty('--llselect-color-scheme', 'dark')
  document.documentElement.setAttribute('data-x', '1')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.ok(state.replacement, "a's write replaced b")
  assert.equal(bEl.getAttribute(COLOR_SCHEME_ATTRIBUTE), 'light', 'the replaced instance writes nothing afterwards')
  assert.equal(state.replacement.getColorScheme(), 'light')
})
