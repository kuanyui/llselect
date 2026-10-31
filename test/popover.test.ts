import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// jsdom has no Popover API, so the fallback path and the detection guard are
// exercised natively here, and the top-layer path via mocked
// HTMLElement.prototype.showPopover / hidePopover. The actual top-layer
// rendering needs the real-browser pass (docs/llm/TODO.md, manual
// verification).

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

interface PopoverMockLog { shown: number; hidden: number }

// setupDom builds a fresh window per test, so the patch dies with it.
function mockPopoverSupport(opts?: { hideThrows?: boolean }): PopoverMockLog {
  const log: PopoverMockLog = { shown: 0, hidden: 0 }
  const proto = window.HTMLElement.prototype as unknown as {
    showPopover?: () => void
    hidePopover?: () => void
  }
  proto.showPopover = function () { log.shown++ }
  proto.hidePopover = function () {
    if (opts?.hideThrows) { throw new DOMException('not showing', 'InvalidStateError') }
    log.hidden++
  }
  return log
}

test('without Popover API: no popover attribute, no extra inline styles (fallback unchanged)', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  assert.equal(sel.popupEl.hasAttribute('popover'), false)
  sel.open()
  assert.equal(sel.popupEl.style.right, '')
  assert.equal(sel.popupEl.style.bottom, '')
  assert.equal(sel.popupEl.style.height, '')
  sel.close()
})

test('with Popover API: popover="manual" is set at construction (light dismiss stays ours)', () => {
  const root = mount()
  mockPopoverSupport()
  const sel = new LLSelectSingle<string>(root)
  assert.equal(sel.popupEl.getAttribute('popover'), 'manual')
})

test('open enters the top layer and neutralizes the UA inset and height; close leaves and clears', () => {
  const root = mount()
  const log = mockPopoverSupport()
  const sel = new LLSelectSingle<string>(root)
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(log.shown, 1)
  // UA [popover] { inset: 0 } would over-constrain the box (and beat `left`
  // in an RTL containing block) - open() must pin right/bottom to auto.
  assert.equal(sel.popupEl.style.right, 'auto')
  assert.equal(sel.popupEl.style.bottom, 'auto')
  // UA [popover] { height: fit-content } collapsed this column flex box to
  // its borders in WebKit 18 (HIGH-705) - open() pins height to auto too.
  assert.equal(sel.popupEl.style.height, 'auto')
  sel.close()
  assert.equal(log.hidden, 1)
  assert.equal(sel.popupEl.style.right, '')
  assert.equal(sel.popupEl.style.bottom, '')
  assert.equal(sel.popupEl.style.height, '')
})

test('close survives a force-hidden popover (dialog.showModal hides all popovers)', () => {
  const root = mount()
  mockPopoverSupport({ hideThrows: true })
  const sel = new LLSelectSingle<string>(root)
  sel.setItems(['a'])
  sel.open()
  sel.close() // hidePopover throws InvalidStateError inside; must not propagate
  assert.equal(sel.popupEl.hidden, true)
})

test('detached mount: open() skips showPopover instead of throwing', () => {
  setupDom('<!doctype html><html><body></body></html>')
  const log = mockPopoverSupport()
  const detached = document.createElement('div')
  const sel = new LLSelectSingle<string>(detached)
  sel.setItems(['a'])
  sel.open()
  assert.equal(log.shown, 0)
  sel.close()
})

// The popover focusing steps: showPopover() focuses an `autofocus` descendant.
// Like Chromium, Firefox and WebKit 26.5, it throws on a second show during a show.
function mockAutofocusPopover(): void {
  const proto = window.HTMLElement.prototype as unknown as {
    showPopover?: () => void
    hidePopover?: () => void
  }
  let showing = false
  proto.showPopover = function (this: HTMLElement) {
    if (showing) { throw new DOMException('a show during a show', 'InvalidStateError') }
    showing = true
    try {
      this.querySelector<HTMLElement>('[autofocus]')?.focus()
    } finally {
      showing = false
    }
  }
  proto.hidePopover = function () {}
}

function autofocusButton(): HTMLElement {
  const b = document.createElement('button')
  b.setAttribute('autofocus', '')
  return b
}

function focusPageButton(): void {
  const page = document.createElement('button')
  document.body.appendChild(page)
  page.focus()
}

test('a focus listener that closes the popup inside showPopover() stops the open there', () => {
  const root = mount()
  mockAutofocusPopover()
  const events: string[] = []
  const sel: LLSelectSingle<string> = new LLSelectSingle<string>(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => { events.push('focus'); sel.close() },
    onOpen: () => { events.push('open') },
    onClose: () => { events.push('close') },
  })
  sel.setItems(['a', 'b'])
  focusPageButton()
  sel.open()
  assert.deepEqual(events, ['focus', 'close'])
  assert.equal(sel.isOpened(), false)
  assert.equal(sel.popupListEl.children.length, 0)
})

test('a focus listener that closes and reopens the popup inside showPopover() has its reopen ignored', () => {
  const root = mount()
  mockAutofocusPopover()
  const events: string[] = []
  const sel: LLSelectSingle<string> = new LLSelectSingle<string>(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => { events.push('focus'); sel.close(); sel.open() },
    onOpen: () => { events.push('open') },
    onClose: () => { events.push('close') },
  })
  sel.setItems(['a', 'b'])
  focusPageButton()
  sel.open()
  assert.deepEqual(events, ['focus', 'close'])
  assert.equal(sel.isOpened(), false)
  // Nothing was left half done: a later open completes.
  sel.open()
  assert.deepEqual(events, ['focus', 'close', 'open'])
  assert.equal(sel.isOpened(), true)
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
})

test('a focus listener that re-renders inside showPopover() does not stop the open', () => {
  const root = mount()
  mockAutofocusPopover()
  const events: string[] = []
  const sel: LLSelectSingle<string> = new LLSelectSingle<string>(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => { events.push('focus'); sel.rerender() },
    onOpen: () => { events.push('open') },
  })
  sel.setItems(['a', 'b'])
  focusPageButton()
  sel.open()
  assert.deepEqual(events, ['focus', 'open'])
  assert.equal(sel.isOpened(), true)
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
})

class ActiveRowProbe extends LLSelectSingle<string> {
  public setIndex(index: number): void { this.setFocusedIndex(index) }
}

test('a re-render inside showPopover() reports no stale active row before onOpen', () => {
  const root = mount()
  mockAutofocusPopover()
  const events: string[] = []
  const sel: ActiveRowProbe = new ActiveRowProbe(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => { events.push('focus'); sel.rerender() },
    onOpen: () => { events.push('open') },
    onActiveItemChange: (item) => { events.push(`active ${item}`) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setIndex(2)
  focusPageButton()
  sel.open()
  assert.deepEqual(events, ['focus', 'open', 'active a'])
})
