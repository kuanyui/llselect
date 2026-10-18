import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectCloseReason, LLSelectOpenReason } from '../src/base.js'

// meta.reason on onOpen / onClose: one value per open or close path.
// Contract: docs/llm/DESIGN.md "Open and close reasons".

function mount(): { el: HTMLElement; outside: HTMLButtonElement } {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="outside">x</button></body></html>')
  return { el: document.getElementById('mount')!, outside: document.getElementById('outside') as HTMLButtonElement }
}

function key(el: HTMLElement, k: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }))
}

function logged(el: HTMLElement, extra: { filterable?: boolean; outsideClickBehavior?: 'pass-through' | 'block' } = {}): { sel: LLSelectSingle<string>; opens: LLSelectOpenReason[]; closes: LLSelectCloseReason[] } {
  const opens: LLSelectOpenReason[] = []
  const closes: LLSelectCloseReason[] = []
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    filterable: extra.filterable ?? false,
    outsideClickBehavior: extra.outsideClickBehavior ?? 'pass-through',
    onOpen: (meta) => { opens.push(meta.reason) },
    onClose: (meta) => { closes.push(meta.reason) },
  })
  sel.setItems(['apple', 'banana'])
  return { sel, opens, closes }
}

test('open reasons: toggle for a trigger click and toggle(), keyboard for the closed-trigger keys, typeahead for a character, api for open()', () => {
  const { el } = mount()
  const { sel, opens } = logged(el)
  sel.triggerEl.click()
  sel.close()
  sel.toggle()
  sel.close()
  for (const k of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
    key(sel.triggerEl, k)
    sel.close()
  }
  key(sel.triggerEl, 'b')
  sel.close()
  sel.open()
  assert.deepEqual(opens, ['toggle', 'toggle', 'keyboard', 'keyboard', 'keyboard', 'keyboard', 'typeahead', 'api'])
})

test('close reasons: choose, escape (Escape, Alt+ArrowUp), outside, blur, toggle, api, disabled, destroy', () => {
  const { el, outside } = mount()
  const { sel, closes } = logged(el, { filterable: true })
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!.click()
  sel.open()
  key(sel.popupEl.querySelector('input')!, 'Escape')
  sel.open()
  key(sel.popupEl.querySelector('input')!, 'ArrowUp', { altKey: true })
  sel.open()
  outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  sel.triggerEl.focus()
  sel.open()
  outside.focus()
  sel.open()
  sel.triggerEl.click()
  sel.open()
  sel.toggle()
  sel.open()
  sel.close()
  sel.open()
  sel.setDisabled(true)
  sel.setDisabled(false)
  sel.open()
  sel.destroy()
  assert.deepEqual(closes, ['choose', 'escape', 'escape', 'outside', 'blur', 'toggle', 'toggle', 'api', 'disabled', 'destroy'])
})

test('close reason: a vetoed single-mode pick still closes with choose', () => {
  const { el } = mount()
  const closes: LLSelectCloseReason[] = []
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    onBeforeChange: (_next, _previous, event) => { event.preventDefault() },
    onClose: (meta) => { closes.push(meta.reason) },
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  key(sel.triggerEl, 'Enter')
  assert.equal(sel.getChosenItem(), undefined)
  assert.deepEqual(closes, ['choose'])
})

test('close reason: escape on a control inside a slot, outside under block, and the positioner hiding the popup', () => {
  const { el, outside } = mount()
  const closes: LLSelectCloseReason[] = []
  const sel = new LLSelectMultiple<string>(el, {
    ariaLabel: 'x',
    outsideClickBehavior: 'block',
    createPopupFooterContentElFn: () => { const b = document.createElement('button'); b.textContent = 'ok'; return b },
    onClose: (meta) => { closes.push(meta.reason) },
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const slotButton = sel.popupFooterEl!.querySelector('button')!
  slotButton.focus()
  key(slotButton, 'Escape')
  sel.open()
  outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  // The positioner closes a popup whose trigger scrolled out of the viewport;
  // jsdom lays nothing out, so the trigger's rect is mocked, as in
  // test/positioning.test.ts.
  mockRect(sel.triggerEl, { top: 100, bottom: 130 })
  sel.open()
  mockRect(sel.triggerEl, { top: -100, bottom: -70 })
  window.dispatchEvent(new Event('scroll'))
  assert.deepEqual(closes, ['escape', 'outside', 'hidden'])
})

function mockRect(el: HTMLElement, rect: { top: number; bottom: number }): void {
  const full = { top: rect.top, left: 0, right: 200, bottom: rect.bottom, width: 200, height: 30 }
  el.getBoundingClientRect = () => ({ ...full, x: 0, y: full.top, toJSON() { return full } })
}

test('the first effective close reports its reason; a close() inside onClose is a no-op, and a stored () => void handler still fits', () => {
  const { el } = mount()
  const closes: LLSelectCloseReason[] = []
  const plain: () => void = () => {}
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    onOpen: plain,
    onClose: (meta) => { closes.push(meta.reason); sel.close() },
  })
  sel.setItems(['apple'])
  sel.open()
  sel.setDisabled(true)
  assert.deepEqual(closes, ['disabled'])
})

test('a refused close leaves no reason behind; a reopen inside onClose reports api; an overriding close() still gets the reason', () => {
  const { el } = mount()
  const closes: LLSelectCloseReason[] = []
  const opens: LLSelectOpenReason[] = []
  class Probe extends LLSelectSingle<string> {
    public override close(): void { super.close() }
  }
  let reopen = false
  const sel = new Probe(el, {
    ariaLabel: 'x',
    onOpen: (meta) => { opens.push(meta.reason) },
    onClose: (meta) => { closes.push(meta.reason); if (reopen) { reopen = false; sel.open() } },
  })
  sel.setItems(['apple'])
  sel.setDisabled(true) // closed: the internal close for 'disabled' is refused
  sel.setDisabled(false)
  sel.open()
  sel.close()
  assert.deepEqual(closes, ['api'], 'the refused close left nothing pending')
  sel.open()
  reopen = true
  key(sel.triggerEl, 'Escape') // the override runs, the reason threads through super.close(); onClose reopens
  assert.deepEqual(closes, ['api', 'escape'])
  assert.deepEqual(opens, ['api', 'api', 'api'])
  assert.equal(sel.isOpened(), true)
})

test('a refused open() leaves no reason behind: the next open() reports api', () => {
  const { el } = mount()
  const { sel, opens } = logged(el)
  sel.setDisabled(true)
  key(sel.triggerEl, 'ArrowDown') // refused: disabled
  sel.setDisabled(false)
  sel.open()
  assert.deepEqual(opens, ['api'])
})
