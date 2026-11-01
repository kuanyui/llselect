import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

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

test('close survives a hidePopover() that throws (dialog.showModal() may hide the popup)', () => {
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
// Like Chromium 156, Firefox 153 and WebKit 26.5, it throws on a show during another show.
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

// Chromium 156, Firefox 153 and WebKit 26.5 refuse a show while another
// popover of the document is in the middle of its show or hide.
function mockRefusingPopover(): { refuse: boolean; lastError: DOMException | null } {
  const state: { refuse: boolean; lastError: DOMException | null } = { refuse: false, lastError: null }
  const proto = window.HTMLElement.prototype as unknown as {
    showPopover?: () => void
    hidePopover?: () => void
  }
  proto.showPopover = function () {
    if (state.refuse) {
      state.lastError = new DOMException('a show during another show', 'InvalidStateError')
      throw state.lastError
    }
  }
  proto.hidePopover = function () {}
  return state
}

test('a show that the browser refuses leaves the select component closed and passes the error on', () => {
  const cases: Array<{ name: string; make: (root: HTMLElement, events: string[]) => LLSelectSingle<string> | LLSelectMultiple<string> }> = [
    { name: 'single', make: (root, events) => {
      const sel = new LLSelectSingle<string>(root, { onOpen: () => { events.push('open') }, onClose: () => { events.push('close') } })
      sel.setItems(['a', 'b'])
      return sel
    } },
    { name: 'single, filterable and clearable', make: (root, events) => {
      const sel = new LLSelectSingle<string>(root, { filterable: true, clearable: true, onOpen: () => { events.push('open') }, onClose: () => { events.push('close') } })
      sel.setItems(['a', 'b'])
      sel.setChosenItem('a')
      return sel
    } },
    { name: 'multiple, tags', make: (root, events) => {
      const sel = new LLSelectMultiple<string>(root, { triggerDisplay: 'tags', onOpen: () => { events.push('open') }, onClose: () => { events.push('close') } })
      sel.setItems(['a', 'b'])
      sel.setChosenItems(['a'])
      return sel
    } },
  ]
  for (const { name, make } of cases) {
    const root = mount()
    const popover = mockRefusingPopover()
    const events: string[] = []
    const sel = make(root, events)
    // The baseline is the closed state after one open: a first open leaves
    // traces that every later close keeps, such as an empty style attribute.
    sel.open()
    sel.close()
    const closedHtml = root.outerHTML
    events.length = 0
    popover.refuse = true
    assert.throws(() => sel.open(), { name: 'InvalidStateError' }, name)
    assert.equal(sel.isOpened(), false, name)
    assert.deepEqual(events, [], name)
    // The undo must leave the DOM that a normal open and close leaves.
    assert.equal(root.outerHTML, closedHtml, name)
    popover.refuse = false
    sel.open()
    assert.equal(sel.isOpened(), true, name)
    assert.equal(sel.popupListEl.querySelectorAll('[role="option"]').length, 2, name)
  }
})

class HookProbe extends LLSelectSingle<string> {
  public log: string[] = []
  public throwAfterClose = false
  protected override onOpened(): void { this.log.push('opened') }
  protected override onClosed(): void { this.log.push('closed') }
  public override close(): void {
    super.close()
    if (this.throwAfterClose) { throw new Error('an error of the undo') }
  }
}

test('the undo of a refused show renders the closed arrow and runs neither onOpened nor onClosed', () => {
  const root = mount()
  const popover = mockRefusingPopover()
  const arrowLog: boolean[] = []
  const sel = new HookProbe(root, { createTriggerArrowContentElFn: (state) => { arrowLog.push(state.isOpened); return null } })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.close()
  arrowLog.length = 0
  sel.log.length = 0
  popover.refuse = true
  assert.throws(() => sel.open(), { name: 'InvalidStateError' })
  assert.deepEqual(arrowLog, [false])
  assert.deepEqual(sel.log, [])
})

// Sets globalThis.requestAnimationFrame for one test, then restores it.
function withAnimationFrame(fn: unknown, body: () => void): void {
  const g = globalThis as { requestAnimationFrame?: unknown }
  const had = 'requestAnimationFrame' in g
  const saved = g.requestAnimationFrame
  g.requestAnimationFrame = fn
  try {
    body()
  } finally {
    if (had) { g.requestAnimationFrame = saved } else { delete g.requestAnimationFrame }
  }
}

test('the browser\'s error wins over an error that the undo raises', () => {
  const root = mount()
  const popover = mockRefusingPopover()
  const sel = new HookProbe(root)
  sel.setItems(['a', 'b'])
  popover.refuse = true
  sel.throwAfterClose = true
  let frames = 0
  // The scroll restore still runs after the throwing close.
  withAnimationFrame(() => { frames++; return 0 }, () => {
    assert.throws(() => sel.open(), (e: unknown) => e === popover.lastError)
  })
  assert.equal(frames, 1)
  assert.equal(sel.isOpened(), false)
})

test('the browser\'s error wins over an error of the scroll restore', () => {
  const root = mount()
  const popover = mockRefusingPopover()
  const sel = new LLSelectSingle<string>(root)
  sel.setItems(['a', 'b'])
  popover.refuse = true
  // A page wrapper of requestAnimationFrame that throws.
  withAnimationFrame(() => { throw new Error('a wrapper of requestAnimationFrame') }, () => {
    assert.throws(() => sel.open(), (e: unknown) => e === popover.lastError)
  })
  assert.equal(sel.isOpened(), false)
})

test('the undo reports no item when a listener inside the refused show reported one', () => {
  const root = mount()
  const proto = window.HTMLElement.prototype as unknown as {
    showPopover?: () => void
    hidePopover?: () => void
  }
  // A listener runs inside the show, then the show fails.
  proto.showPopover = function (this: HTMLElement) {
    this.querySelector<HTMLElement>('[autofocus]')?.focus()
    throw new DOMException('a show during another show', 'InvalidStateError')
  }
  proto.hidePopover = function () {}
  const events: string[] = []
  const sel: ActiveRowProbe = new ActiveRowProbe(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => { sel.setIndex(1) },
    onOpen: () => { events.push('open') },
    onClose: () => { events.push('close') },
    onActiveItemChange: (item) => { events.push(`active ${item}`) },
  })
  sel.setItems(['a', 'b'])
  focusPageButton()
  assert.throws(() => sel.open(), { name: 'InvalidStateError' })
  assert.deepEqual(events, ['active b', 'active undefined'])
  assert.equal(sel.isOpened(), false)
})

test('an open from a focus listener inside another select component\'s show leaves that select component closed', () => {
  const root = mount()
  mockAutofocusPopover()
  const bRoot = document.createElement('div')
  document.body.appendChild(bRoot)
  const events: string[] = []
  const b = new LLSelectSingle<string>(bRoot, {
    onOpen: () => { events.push('b open') },
    onClose: () => { events.push('b close') },
  })
  b.setItems(['x', 'y'])
  b.open()
  b.close()
  const closedHtml = bRoot.outerHTML
  events.length = 0
  const a = new LLSelectSingle<string>(root, {
    createPopupHeaderContentElFn: autofocusButton,
    onFocus: () => {
      try { b.open() } catch (e) { events.push(`b threw ${(e as DOMException).name}`) }
    },
    onOpen: () => { events.push('a open') },
  })
  a.setItems(['1', '2'])
  focusPageButton()
  a.open()
  assert.deepEqual(events, ['b threw InvalidStateError', 'a open'])
  assert.equal(a.isOpened(), true)
  assert.equal(b.isOpened(), false)
  assert.equal(bRoot.outerHTML, closedHtml)
  a.close()
  b.open()
  assert.equal(b.isOpened(), true)
  assert.equal(b.popupListEl.querySelectorAll('[role="option"]').length, 2)
})
