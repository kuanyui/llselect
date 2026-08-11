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
  sel.close()
})

test('with Popover API: popover="manual" is set at construction (light dismiss stays ours)', () => {
  const root = mount()
  mockPopoverSupport()
  const sel = new LLSelectSingle<string>(root)
  assert.equal(sel.popupEl.getAttribute('popover'), 'manual')
})

test('open enters the top layer and neutralizes the UA inset; close leaves and clears', () => {
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
  sel.close()
  assert.equal(log.hidden, 1)
  assert.equal(sel.popupEl.style.right, '')
  assert.equal(sel.popupEl.style.bottom, '')
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
