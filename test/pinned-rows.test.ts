import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { LLSelectSingle } from '../src/single.js'
import { ensureVisibleInScroll } from '../src/keyboard.js'
import type { LLSelectPopupListActionRow } from '../src/base.js'

// Pinned blocks: popupListLeadingRowsPinned / popupListTrailingRowsPinned wrap
// a block in a presentational sticky div, only while the block has rows.
// Contract: A11Y.md "Action rows"; design: DESIGN.md "Action rows",
// popup-rows-and-callbacks.md section 5.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function row(text: string): LLSelectPopupListActionRow {
  return { textFn: () => text, onActivate: () => {} }
}

test('default: no wrappers, the rows sit directly in the listbox', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingActionRows: [row('lead')], popupListTrailingActionRows: [row('trail')] })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.popupListPinnedLeadingRowsEl, null)
  assert.equal(sel.popupListPinnedTrailingRowsEl, null)
  const kids = [...sel.popupListEl.children]
  assert.ok(kids.every(k => k.getAttribute('role') === 'option'), 'only option rows as listbox children')
})

test('leading pinned: one presentational sticky wrapper holds the choose-all row and the leading rows, first in the listbox', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true, popupListLeadingActionRows: [row('lead')] })
  sel.setItems(['a', 'b'])
  sel.open()
  const wrap = sel.popupListPinnedLeadingRowsEl!
  assert.ok(wrap, 'wrapper built')
  assert.equal(sel.popupListEl.firstElementChild, wrap)
  assert.equal(wrap.getAttribute('role'), 'presentation')
  assert.equal(wrap.getAttribute('tabindex'), null)
  assert.equal(wrap.className, sel.classIdMap.popupListPinnedLeadingRowsClass)
  assert.equal(wrap.style.position, 'sticky')
  assert.equal(wrap.style.top, '0px')
  const [first, second] = [...wrap.children] as HTMLElement[]
  assert.ok(first!.classList.contains(sel.classIdMap.chooseAllRowClass), 'the choose-all row comes first')
  assert.ok(second!.classList.contains(sel.classIdMap.popupListActionRowClass), 'then the leading action row')
  assert.equal(wrap.children.length, 2)
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 4, 'choose-all, lead, a, b')
})

test('trailing pinned: the wrapper is the last child with bottom: 0', () => {
  const sel = new LLSelectSingle<string>(mount(), { popupListTrailingRowsPinned: true, popupListTrailingActionRows: [row('trail')] })
  sel.setItems(['a', 'b'])
  sel.open()
  const wrap = sel.popupListPinnedTrailingRowsEl!
  assert.equal(sel.popupListEl.lastElementChild, wrap)
  assert.equal(wrap.style.bottom, '0px')
  assert.equal(wrap.className, sel.classIdMap.popupListPinnedTrailingRowsClass)
  assert.equal(sel.popupListPinnedLeadingRowsEl, null, 'the other flag is off')
})

test('an empty pinned block puts no wrapper in the listbox, and it returns when rows appear', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true, filterable: true })
  sel.setItems(['apple', 'kiwi'])
  sel.open()
  const wrap = sel.popupListPinnedLeadingRowsEl!
  assert.equal(wrap.parentElement, sel.popupListEl, 'choose-all row present: wrapper in')
  const input = sel.popupEl.querySelector('input')!
  input.value = 'zzz' // nothing selectable: the choose-all row hides, the block is empty
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(wrap.parentElement, null, 'empty block: wrapper out of the listbox')
  assert.equal(sel.popupListEl.querySelector('[role="presentation"]'), null)
  input.value = ''
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(wrap.parentElement, sel.popupListEl, 'rows back: the same wrapper returns')
})

test('the ring is unchanged: arrows and Home / End walk through the pinned rows', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true, popupListTrailingRowsPinned: true, popupListLeadingActionRows: [row('lead')], popupListTrailingActionRows: [row('trail')] })
  sel.setItems(['a', 'b'])
  sel.open()
  const active = () => document.getElementById(sel.triggerEl.getAttribute('aria-activedescendant')!)!.textContent
  assert.equal(active(), sel.getUiTranslationPack().chooseAllRowText(0, 2), 'opens on the choose-all row')
  fireKey(sel.triggerEl, 'ArrowDown'); assert.equal(active(), 'lead')
  fireKey(sel.triggerEl, 'ArrowDown'); assert.equal(active(), 'a')
  fireKey(sel.triggerEl, 'End'); assert.equal(active(), 'trail')
  fireKey(sel.triggerEl, 'Home'); assert.equal(active(), sel.getUiTranslationPack().chooseAllRowText(0, 2))
})

test('the choose-all row refreshes in place inside the wrapper after a toggle', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.toggleItem('a')
  const wrap = sel.popupListPinnedLeadingRowsEl!
  assert.equal(wrap.firstElementChild!.textContent, sel.getUiTranslationPack().chooseAllRowText(1, 2))
  assert.equal(wrap.parentElement, sel.popupListEl)
})

test('hideChosenRows: choosing everything empties the leading block and the wrapper leaves', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, hideChosenRows: true, popupListLeadingRowsPinned: true })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.toggleAllVisible()
  assert.equal(sel.popupListPinnedLeadingRowsEl!.parentElement, null)
})

test('the wrapper is yours to style after new', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true })
  sel.popupListPinnedLeadingRowsEl!.classList.add('mine')
  sel.setItems(['a'])
  sel.open()
  assert.ok(sel.popupListEl.firstElementChild!.classList.contains('mine'))
})

// ensureVisibleInScroll with insets, on stubbed geometry
function scroller(top: number, height: number): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'getBoundingClientRect', { value: () => ({ top, bottom: top + height, height }) })
  Object.defineProperty(el, 'clientTop', { value: 0 })
  Object.defineProperty(el, 'clientHeight', { value: height })
  let scrollTop = 0
  Object.defineProperty(el, 'scrollTop', { get: () => scrollTop, set: (v: number) => { scrollTop = v } })
  return el
}
function child(top: number, height: number): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'getBoundingClientRect', { value: () => ({ top, bottom: top + height, height }) })
  return el
}

test('ensureVisibleInScroll: an item under the top inset scrolls up past the inset', () => {
  setupDom()
  const parent = scroller(0, 100)
  ensureVisibleInScroll(child(10, 20), parent, 30, 0) // visible band is 30..100; the item spans 10..30
  assert.equal(parent.scrollTop, -20)
})

test('ensureVisibleInScroll: an item under the bottom inset scrolls down past the inset', () => {
  setupDom()
  const parent = scroller(0, 100)
  ensureVisibleInScroll(child(85, 20), parent, 0, 25) // visible band is 0..75; the item spans 85..105
  assert.equal(parent.scrollTop, 30)
})

test('ensureVisibleInScroll: an item already inside the band does not scroll', () => {
  setupDom()
  const parent = scroller(0, 100)
  ensureVisibleInScroll(child(40, 20), parent, 30, 25)
  assert.equal(parent.scrollTop, 0)
})

test('ensureVisibleInScroll: insets covering the whole scrollport are ignored (best-effort)', () => {
  setupDom()
  const parent = scroller(0, 100)
  ensureVisibleInScroll(child(40, 20), parent, 60, 60) // band would be 60..40: fall back to 0..100, the item is visible
  assert.equal(parent.scrollTop, 0)
  ensureVisibleInScroll(child(110, 20), parent, 60, 60) // below the fallback band: scroll by the overflow only
  assert.equal(parent.scrollTop, 30)
})

// The widget's own scroll path, on stubbed geometry: rows inside a pinned
// wrapper never scroll, everything else does, grouped items included.
function stubRect(el: Element, top: number, height: number): void {
  Object.defineProperty(el, 'getBoundingClientRect', { value: () => ({ top, bottom: top + height, height }), configurable: true })
}
function stubScroller(el: HTMLElement, height: number): () => number {
  stubRect(el, 0, height)
  Object.defineProperty(el, 'clientTop', { value: 0, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true })
  let scrollTop = 0
  Object.defineProperty(el, 'scrollTop', { get: () => scrollTop, set: (v: number) => { scrollTop = v }, configurable: true })
  return () => scrollTop
}
function stubOptions(list: HTMLElement, rowHeight: number, firstTop: number): void {
  let top = firstTop
  for (const el of list.querySelectorAll('[role="option"]')) {
    stubRect(el, top, rowHeight)
    top += rowHeight
  }
}

test('scroll path: End on a flat list scrolls the last item into view', () => {
  const sel = new LLSelectSingle<string>(mount(), {})
  sel.setItems(['a', 'b', 'c', 'd', 'e', 'f'])
  sel.open()
  const scrollTop = stubScroller(sel.popupListEl, 60)
  stubOptions(sel.popupListEl, 20, 0) // items span 0..120 in a 60px scrollport
  fireKey(sel.triggerEl, 'End')
  assert.equal(scrollTop(), 60, 'item f spans 100..120; the scrollport ends at 60')
})

test('scroll path: End on a GROUPED list scrolls the last item into view (items nest in group containers)', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: item => item[0] ?? null })
  sel.setItems(['a1', 'a2', 'a3', 'b1', 'b2', 'b3'])
  sel.open()
  const scrollTop = stubScroller(sel.popupListEl, 60)
  stubOptions(sel.popupListEl, 20, 0)
  assert.equal(sel.popupListEl.querySelector('[role="group"] [role="option"]') !== null, true, 'items sit inside group containers')
  fireKey(sel.triggerEl, 'End')
  assert.equal(scrollTop(), 60)
})

test('scroll path: a pinned row never scrolls; an item under the pinned block scrolls past it (the inset)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true })
  sel.setItems(['a', 'b', 'c', 'd'])
  sel.open()
  const scrollTop = stubScroller(sel.popupListEl, 60)
  const wrap = sel.popupListPinnedLeadingRowsEl!
  stubRect(wrap, 0, 20) // the pinned block covers 0..20
  stubOptions(sel.popupListEl, 20, 0) // choose-all 0..20, a 20..40, b 40..60, c 60..80, d 80..100
  fireKey(sel.triggerEl, 'ArrowDown') // item a: 20..40, inside the band, no scroll
  fireKey(sel.triggerEl, 'Home') // back onto the choose-all row, inside the wrapper: the guard, not an early return
  assert.equal(scrollTop(), 0, 'a pinned row is always in view')
  sel.popupListEl.scrollTop = 30 // scrolled down earlier; item a now sits half under the 20px block
  stubRect(sel.popupListEl.querySelectorAll('[role="option"]')[1]!, 10, 20) // item a on screen: 10..30
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(scrollTop(), 20, 'scrolled up by the 10px hidden under the block; without the inset it would stay at 30')
})

test('trailing block: the wrapper holds its rows as the last child', () => {
  const sel = new LLSelectSingle<string>(mount(), { popupListTrailingRowsPinned: true, popupListTrailingActionRows: [row('trail')] })
  sel.setItems(['a'])
  sel.open()
  const wrap = sel.popupListPinnedTrailingRowsEl!
  assert.equal(wrap.parentElement, sel.popupListEl)
  assert.equal(wrap.children.length, 1)
})

test('a pinned action row rebuilt in place after a change stays inside the wrapper and keeps the active option', () => {
  let n = 0
  const sel = new LLSelectMultiple<string>(mount(), { popupListLeadingRowsPinned: true, popupListLeadingActionRows: [{ textFn: () => `cmd ${n}`, onActivate: () => {} }] })
  sel.setItems(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'Home') // the leading action row (no choose-all row here)
  const wrap = sel.popupListPinnedLeadingRowsEl!
  assert.equal(wrap.firstElementChild!.textContent, 'cmd 0')
  n = 1
  sel.toggleItem('a') // rows are rebuilt after every chosen change
  assert.equal(wrap.firstElementChild!.textContent, 'cmd 1', 'rebuilt in place, still inside the wrapper')
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), wrap.firstElementChild!.id, 'the active option followed the rebuilt row')
})

test('scroll path: a grouped list with a pinned block scrolls the item past the block (the inset applies to grouped items)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { chooseAllRow: true, popupListLeadingRowsPinned: true, itemToGroupKeyFn: item => item[0] ?? null })
  sel.setItems(['a1', 'a2', 'b1', 'b2'])
  sel.open()
  const scrollTop = stubScroller(sel.popupListEl, 60)
  stubRect(sel.popupListPinnedLeadingRowsEl!, 0, 20)
  stubOptions(sel.popupListEl, 20, 0) // choose-all 0..20, then a1, a2, b1, b2 inside their groups
  assert.ok(sel.popupListEl.querySelector('[role="group"] [role="option"]'), 'items sit inside group containers')
  fireKey(sel.triggerEl, 'ArrowDown') // a1: 20..40, inside the band
  fireKey(sel.triggerEl, 'Home') // back onto the pinned choose-all row
  assert.equal(scrollTop(), 0, 'the pinned choose-all row never scrolls')
  sel.popupListEl.scrollTop = 30
  stubRect(sel.popupListEl.querySelectorAll('[role="option"]')[1]!, 10, 20) // a1 half under the block
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(scrollTop(), 20, 'a grouped item scrolls past the 20px block like a flat one')
})

test('data-edge-to-items: true while items are listed, false when the blocks touch', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    chooseAllRow: true, filterable: true,
    popupListLeadingRowsPinned: true, popupListTrailingRowsPinned: true,
    popupListLeadingActionRows: [row('lead')], popupListTrailingActionRows: [row('trail')],
  })
  sel.setItems(['apple', 'kiwi'])
  sel.open()
  const lead = sel.popupListPinnedLeadingRowsEl!
  const trail = sel.popupListPinnedTrailingRowsEl!
  assert.equal(lead.getAttribute('data-edge-to-items'), 'true')
  assert.equal(trail.getAttribute('data-edge-to-items'), 'true')
  const input = sel.popupEl.querySelector('input')!
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(lead.nextElementSibling, trail, 'the two blocks touch')
  assert.equal(lead.getAttribute('data-edge-to-items'), 'false')
  assert.equal(trail.getAttribute('data-edge-to-items'), 'false')
  input.value = ''
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(lead.getAttribute('data-edge-to-items'), 'true')
})
