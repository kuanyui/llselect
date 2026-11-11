import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import type { LLSelectSingleSettings } from '../src/single.js'

// An open() call runs app and subclass code: content functions, predicates,
// hooks. A function that builds or decides must not change the select
// component (DESIGN.md "Functions that build or decide"). If one closes or
// destroys it all the same, or opens it again, the rest of that open() call
// belongs to a cycle that is over: it attaches nothing more, fires no open
// notification, and leaves a closed select component in its closed state
// (FIXME MEDIUM-969). These tests cover that guard and nothing else: what the
// rows show after such a call is not supported, and not tested. The last
// tests cover the other half of the guard: `destroy()` finishes its teardown
// whatever its `close()` call does.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

// A root element that is a custom element. `react` runs inside every write
// of the observed attribute, as a browser runs an attribute reaction: before
// the write returns to the library.
function mountObserving(attribute: string, react: () => void): HTMLElement {
  setupDom('<!doctype html><html><body></body></html>')
  window.customElements.define('x-observing-root', class extends window.HTMLElement {
    static observedAttributes = [attribute]
    attributeChangedCallback(): void { react() }
  })
  const el = document.createElement('x-observing-root')
  document.body.appendChild(el)
  return el
}

// jsdom's selector engine adds these two document listeners for itself, at the
// first selector it runs. The library listens for neither.
const JSDOM_OWN_EVENTS = new Set(['mouseover', 'mouseout'])

// Counts the listeners of a target: every add, and every add minus every
// remove, which is what stays on the target.
function trackListeners(target: EventTarget): { adds: () => number; balance: () => number } {
  let adds = 0
  let balance = 0
  const add = target.addEventListener.bind(target)
  const remove = target.removeEventListener.bind(target)
  target.addEventListener = (...args: Parameters<EventTarget['addEventListener']>): void => {
    if (!JSDOM_OWN_EVENTS.has(args[0])) { adds++; balance++ }
    add(...args)
  }
  target.removeEventListener = (...args: Parameters<EventTarget['removeEventListener']>): void => {
    if (!JSDOM_OWN_EVENTS.has(args[0])) { balance-- }
    remove(...args)
  }
  return { adds: () => adds, balance: () => balance }
}

// Counts how often the popup was shown: every write of `hidden = false`. A
// stopped open() that shows the popup and hides it again leaves no other
// trace.
function trackShows(el: HTMLElement): () => number {
  const accessor = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, 'hidden')
  assert.ok(accessor?.get && accessor.set)
  const { get, set } = accessor
  let shows = 0
  Object.defineProperty(el, 'hidden', {
    configurable: true,
    get(): boolean { return get.call(el) as boolean },
    set(value: boolean): void {
      if (!value) { shows++ }
      set.call(el, value)
    },
  })
  return () => shows
}

interface Probe {
  sel: LLSelectSingle<string>
  events: string[]
  /** Listeners on the document and on the window since the select component was built. */
  leftover: () => number
  /** Every listener added on the document and on the window so far, removed or not. */
  added: () => number
  /** Runs `fn` once, inside the next call of the function under test. */
  arm: (fn: () => void) => void
  /** For the function under test: runs the armed function, if any. */
  fire: () => void
}

function build(settings: (fire: () => void) => Partial<LLSelectSingleSettings<string>>, Class: typeof LLSelectSingle<string> = LLSelectSingle<string>, el: HTMLElement = mount()): Probe {
  const onDocument = trackListeners(document)
  const onWindow = trackListeners(window)
  const events: string[] = []
  let armed: (() => void) | null = null
  const fire = (): void => {
    const fn = armed
    armed = null
    fn?.()
  }
  const sel = new Class(el, {
    ariaLabel: 'x',
    onOpen: (meta) => { events.push('open:' + meta.reason) },
    onClose: (meta) => { events.push('close:' + meta.reason) },
    ...settings(fire),
  })
  sel.setItems(['a', 'b'])
  const base = onDocument.balance() + onWindow.balance()
  return {
    sel,
    events,
    leftover: () => onDocument.balance() + onWindow.balance() - base,
    added: () => onDocument.adds() + onWindow.adds(),
    arm: (fn) => { armed = fn },
    fire,
  }
}

// What a stopped open() must leave behind while the select component is closed.
function assertClosedCleanly(p: Probe): void {
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0, 'no listener stays on the document or the window')
  assert.equal(p.sel.popupEl.hidden, true)
  assert.equal(p.sel.popupEl.hasAttribute('data-placement'), false, 'no positioner placed the closed popup')
  assert.equal(p.sel.popupListEl.children.length, 0, 'a closed popup holds no rows')
  assert.equal(p.sel.triggerEl.getAttribute('aria-expanded'), 'false')
  assert.equal(p.sel.triggerWrapperEl.getAttribute('data-state'), 'closed')
  assert.equal(p.sel.rootEl.classList.contains(p.sel.classIdMap.openClass), false)
  assert.equal(p.sel.triggerEl.hasAttribute('aria-activedescendant'), false)
}

// The next open and close work as on a fresh select component.
function assertStillUsable(p: Probe): void {
  const before = p.events.length
  p.sel.open()
  assert.equal(p.sel.isOpened(), true)
  assert.deepEqual(p.events.slice(before), ['open:api'])
  assert.equal(p.sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
  p.sel.close()
  assert.equal(p.leftover(), 0)
}

test('a content function of the list that closes the select component stops the open (MEDIUM-969)', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  let addedAtClose = -1
  p.arm(() => { p.sel.close(); addedAtClose = p.added() })
  p.sel.open()
  assert.deepEqual(p.events, ['close:api'], 'no onOpen for an open that did not complete')
  assert.equal(p.added(), addedAtClose, 'the stopped call created no positioner: it added no listener, not even one that it removed again')
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a content function of the list that destroys the select component stops the open', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  p.arm(() => { p.sel.destroy() })
  p.sel.open()
  assert.deepEqual(p.events, ['close:destroy'])
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0, 'no listener stays on the document or the window')
  assert.equal(p.sel.rootEl.children.length, 0)
})

test('a content function that closes and reopens leaves one open cycle: the outer open() attaches nothing of its own', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  let addedByNewerOpen = -1
  p.arm(() => { p.sel.close(); p.sel.open(); addedByNewerOpen = p.added() })
  p.sel.open()
  assert.deepEqual(p.events, ['close:api', 'open:api'], 'onOpen fired once, for the open that completed')
  assert.equal(p.sel.isOpened(), true)
  assert.equal(p.sel.popupListEl.querySelectorAll('[role="option"]').length, 2, 'the rows are not doubled')
  assert.equal(p.sel.popupEl.hasAttribute('data-placement'), true)
  assert.equal(p.added(), addedByNewerOpen, 'the outer call added no listener after the newer open, not even one that it removed again')
  p.sel.close()
  assert.equal(p.leftover(), 0)
  assertStillUsable(p)
})

test('a content function that closes and reopens: the stopped open() reports the active row of the newer open', () => {
  // The newer open ends while the outer call still holds the report back, so
  // the outer call reports once it has stopped.
  const reports: (string | undefined)[] = []
  const p = build((fire) => ({
    createPopupListItemContentElFn: () => { fire(); return null },
    onActiveItemChange: (item) => { reports.push(item) },
  }))
  p.arm(() => { p.sel.close(); p.sel.open() })
  p.sel.open()
  assert.deepEqual(reports, ['a'], 'one report, for the initial active row of the newer open')
  p.sel.close()
  assert.deepEqual(reports, ['a', undefined])
  assert.equal(p.leftover(), 0)
})

test('a filterable predicate that closes the select component stops the open before the popup shows', () => {
  // The predicate turns the filter on at this open only, so a call that went
  // on after it would switch the closed trigger to the filter mode.
  let filterOn = false
  const p = build((fire) => ({ filterable: () => { fire(); return filterOn } }))
  assert.equal(p.sel.triggerEl.getAttribute('role'), 'combobox')
  const shows = trackShows(p.sel.popupEl)
  filterOn = true
  p.arm(() => { p.sel.close() })
  p.sel.open()
  assert.equal(shows(), 0, 'the stopped call never showed the popup')
  assert.deepEqual(p.events, ['close:api'])
  assert.equal(p.sel.triggerEl.getAttribute('role'), 'combobox', 'the stopped call did not switch the trigger to the filter mode')
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a group key function that closes the select component during the gather stops the open before the popup shows', () => {
  let hiddenAtClose: boolean | undefined
  // The filter turns on at this open only. While it is off, `setItems` does
  // not gather, so the open gathers for the first time, while it computes
  // the filtered items and before it shows the popup.
  let filterOn = false
  const p = build((fire) => ({ filterable: () => filterOn, itemToGroupKeyFn: () => { fire(); return null } }))
  filterOn = true
  const shows = trackShows(p.sel.popupEl)
  p.arm(() => { hiddenAtClose = p.sel.popupEl.hidden; p.sel.close() })
  p.sel.open()
  assert.equal(hiddenAtClose, true, 'the function ran before the popup was shown')
  assert.equal(shows(), 0, 'the stopped call never showed the popup afterwards')
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assert.equal(p.sel.getFilterQuery(), '')
  assertStillUsable(p)
})

test('an arrow content function that closes the select component stops the open, and the arrow shows the closed state', () => {
  let rowsBuilt = 0
  const p = build((fire) => ({
    createTriggerArrowContentElFn: (state) => {
      if (state.isOpened) { fire() }
      const el = document.createElement('span')
      el.textContent = state.isOpened ? 'up' : 'down'
      return el
    },
    createPopupListItemContentElFn: () => { rowsBuilt++; return null },
  }))
  p.arm(() => { p.sel.close() })
  p.sel.open()
  assert.equal(rowsBuilt, 0, 'the stopped call did not go on to render the list')
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assert.equal(p.sel.triggerWrapperEl.textContent?.includes('up'), false, 'no arrow of the open state stays on the closed trigger')
  assert.equal(p.sel.triggerWrapperEl.textContent?.includes('down'), true, 'the arrow of the closed state is back')
  assertStillUsable(p)
})

test('a trigger that becomes hidden during the render: the first placement closes the popup, and its positioner is detached', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  const rect = { top: 10, bottom: 30, left: 10, right: 110, width: 100, height: 20, x: 10, y: 10, toJSON: (): string => '' }
  p.sel.triggerWrapperEl.getBoundingClientRect = (): DOMRect => rect
  // Scrolled far above the viewport by the time the positioner places the popup.
  p.arm(() => { rect.top = -500; rect.bottom = -480; rect.y = -500 })
  p.sel.open()
  assert.deepEqual(p.events, ['close:hidden'])
  assertClosedCleanly(p)
  rect.top = 10; rect.bottom = 30; rect.y = 10
  assertStillUsable(p)
})

test('a listener that reopens after the first placement closed the popup keeps the newer positioner in place', () => {
  const rect = { top: 10, bottom: 30, left: 10, right: 110, width: 100, height: 20, x: 10, y: 10, toJSON: (): string => '' }
  const show = (): void => { rect.top = 10; rect.bottom = 30; rect.y = 10 }
  const hide = (): void => { rect.top = -500; rect.bottom = -480; rect.y = -500 }
  let reopen = false
  const p = build((fire) => ({
    createPopupListItemContentElFn: () => { fire(); return null },
    onClose: (meta) => {
      p.events.push('close:' + meta.reason)
      // The trigger is back in view, and the listener opens the popup again.
      if (reopen && meta.reason === 'hidden') { reopen = false; show(); p.sel.open() }
    },
  }))
  p.sel.triggerWrapperEl.getBoundingClientRect = (): DOMRect => rect
  reopen = true
  p.arm(hide)
  p.sel.open()
  assert.deepEqual(p.events, ['close:hidden', 'open:api'])
  assert.equal(p.sel.isOpened(), true)
  assert.equal(p.sel.popupEl.hasAttribute('data-placement'), true, 'the newer positioner placed the popup again')
  assert.equal(p.sel.popupEl.style.position, 'fixed')
  p.sel.close()
  assert.equal(p.leftover(), 0, 'one close removes every listener: the outer positioner was detached')
})

test('a gesture predicate that closes the select component stops the open before the gesture listeners attach', () => {
  let armed: (() => void) | null = null
  class Guarded extends LLSelectSingle<string> {
    protected override shouldListenForScrollGesturesOutside(): boolean {
      const fn = armed
      armed = null
      fn?.()
      return true
    }
  }
  const p = build(() => ({}), Guarded)
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a focusInitial override that closes the select component stops the open: no onOpened, no onOpen', () => {
  let armed: (() => void) | null = null
  const hooks: string[] = []
  class Guarded extends LLSelectSingle<string> {
    protected override focusInitial(): void {
      const fn = armed
      armed = null
      fn?.()
      super.focusInitial()
    }
    protected override onOpened(): void { hooks.push('opened') }
    protected override onClosed(): void { hooks.push('closed') }
  }
  const p = build(() => ({}), Guarded)
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.deepEqual(p.events, ['close:api'])
  assert.deepEqual(hooks, ['closed'])
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('an onOpened override that closes the select component: onOpen does not fire for the closed popup', () => {
  let armed: (() => void) | null = null
  class Guarded extends LLSelectSingle<string> {
    protected override onOpened(): void {
      const fn = armed
      armed = null
      fn?.()
    }
  }
  const p = build(() => ({}), Guarded)
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.deepEqual(p.events, ['close:api'], 'no onOpen after the close')
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('an isEmpty override that closes the select component stops the open before the trigger shows the open state', () => {
  let armed: (() => void) | null = null
  class Guarded extends LLSelectSingle<string> {
    protected override isEmpty(): boolean {
      const fn = armed
      armed = null
      fn?.()
      return super.isEmpty()
    }
  }
  const p = build(() => ({ clearable: true }), Guarded)
  p.sel.setChosenItem('a')
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('the zoom predicate is not asked once the scroll predicate closed the select component', () => {
  let armed: (() => void) | null = null
  let zoomAsked = 0
  class Guarded extends LLSelectSingle<string> {
    protected override shouldListenForScrollGesturesOutside(): boolean {
      const fn = armed
      armed = null
      fn?.()
      return true
    }
    protected override shouldListenForZoomGesturesOutside(): boolean {
      zoomAsked++
      return true
    }
  }
  const p = build(() => ({}), Guarded)
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.equal(zoomAsked, 0)
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('an onOpen listener that closes and reopens: the outer open() does not focus the filter input a second time', () => {
  let reopen = false
  const p = build(() => ({
    filterable: true,
    onOpen: (meta) => {
      p.events.push('open:' + meta.reason)
      if (reopen) { reopen = false; p.sel.close(); p.sel.open() }
    },
  }))
  const input = p.sel.popupEl.querySelector('input')
  assert.ok(input)
  let focusCalls = 0
  const focus = input.focus.bind(input)
  input.focus = (options?: FocusOptions): void => { focusCalls++; focus(options) }
  reopen = true
  p.sel.open()
  assert.deepEqual(p.events, ['open:api', 'close:api', 'open:api'])
  assert.equal(p.sel.isOpened(), true)
  assert.equal(focusCalls, 1, 'only the open that completed moved focus into the filter input')
  p.sel.close()
  assert.equal(p.leftover(), 0)
})

test('the gesture listeners do not attach once the zoom predicate closed the select component', () => {
  let armed: (() => void) | null = null
  let focusInitialRan = false
  class Guarded extends LLSelectSingle<string> {
    protected override shouldListenForZoomGesturesOutside(): boolean {
      const fn = armed
      armed = null
      fn?.()
      return true
    }
    protected override focusInitial(): void {
      focusInitialRan = true
      super.focusInitial()
    }
  }
  const p = build(() => ({}), Guarded)
  armed = (): void => { focusInitialRan = false; p.sel.close() }
  p.sel.open()
  assert.equal(focusInitialRan, false, 'the open stopped before the initial active row')
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a destroy() that an overridden close() does not carry out still stops the open, and tears down what the open had attached', () => {
  let swallowClose = false
  let armed: (() => void) | null = null
  class Stubborn extends LLSelectSingle<string> {
    public override close(): void {
      if (swallowClose) { return }
      super.close()
    }
    // Runs after the positioner and the outside-click handler are attached.
    protected override focusInitial(): void {
      const fn = armed
      armed = null
      fn?.()
      super.focusInitial()
    }
  }
  const p = build(() => ({}), Stubborn)
  armed = (): void => { swallowClose = true; p.sel.destroy() }
  p.sel.open()
  assert.deepEqual(p.events, [], 'no onOpen for a destroyed select component, and no onClose from a close() that was not carried out')
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0, 'destroy() detached the positioner and the outside-click handler')
  assert.equal(p.sel.rootEl.children.length, 0)
})

// What the page scroll does while the open() call runs, and what a stopped
// call does about it. open() notes the scroll position at its start and puts
// it back at its end, since showing the popup can make the browser scroll.
function trackWindowScroll(): { scrollTo: (top: number) => void; restores: () => number[] } {
  const restores: number[] = []
  let top = 0
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => top })
  window.scrollTo = ((options?: ScrollToOptions | number): void => {
    const to = typeof options === 'object' ? options.top ?? 0 : 0
    restores.push(to)
    top = to
  }) as typeof window.scrollTo
  return { scrollTo: (to) => { top = to }, restores: () => restores }
}

test('a content function that closes the select component: the stopped open() puts the window scroll back', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  const page = trackWindowScroll()
  p.arm(() => { page.scrollTo(300); p.sel.close() })
  p.sel.open()
  assert.deepEqual(page.restores(), [0])
  assertClosedCleanly(p)
})

test('a content function that destroys the select component: the stopped open() leaves the window scroll alone', () => {
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }))
  const page = trackWindowScroll()
  // The code that destroys the select component has moved the page.
  p.arm(() => { p.sel.destroy(); page.scrollTo(300) })
  p.sel.open()
  assert.deepEqual(page.restores(), [], 'whoever destroyed the select component owns the page scroll')
  assert.equal(p.leftover(), 0)
})

test('open() on an open select component does nothing: no second onOpen, and no listener added', () => {
  const p = build(() => ({}))
  p.sel.open()
  const added = p.added()
  p.sel.open()
  assert.deepEqual(p.events, ['open:api'])
  assert.equal(p.added(), added)
  assert.equal(p.sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
  p.sel.close()
  assert.equal(p.leftover(), 0)
})

// A root that is a custom element can run app code inside two writes of
// open() and close(): the color-scheme attribute and the open class.
test('a root that destroys the select component from its reaction to the color-scheme write of open(): open() attaches nothing', () => {
  let react: (() => void) | null = null
  const el = mountObserving('data-llselect-color-scheme', () => { const fn = react; react = null; fn?.() })
  const p = build(() => ({}), LLSelectSingle<string>, el)
  const addedBefore = p.added()
  // The page turns dark, so this open() decides again and writes the attribute.
  el.style.setProperty('--llselect-color-scheme', 'dark')
  react = (): void => { p.sel.destroy() }
  p.sel.open()
  assert.equal(p.sel.isOpened(), false)
  assert.deepEqual(p.events, [], 'no onOpen for a destroyed select component')
  assert.equal(p.added(), addedBefore, 'the call added no listener')
  assert.equal(el.children.length, 0)
})

test('a root that opens the select component from its reaction to the color-scheme write of open(): the outer open() adds nothing to that open', () => {
  let react: (() => void) | null = null
  const el = mountObserving('data-llselect-color-scheme', () => { const fn = react; react = null; fn?.() })
  const p = build(() => ({}), LLSelectSingle<string>, el)
  el.style.setProperty('--llselect-color-scheme', 'dark')
  let addedByNestedOpen = -1
  react = (): void => { p.sel.open(); addedByNestedOpen = p.added() }
  p.sel.open()
  assert.deepEqual(p.events, ['open:api'], 'one onOpen, for the open that the reaction made')
  assert.equal(p.sel.isOpened(), true)
  assert.equal(p.added(), addedByNestedOpen, 'the outer call added no listener')
  assert.equal(p.sel.popupListEl.querySelectorAll('[role="option"]').length, 2)
  p.sel.close()
  assert.equal(p.leftover(), 0)
})

test('a root that opens and closes the select component from its reaction to the color-scheme write of open(): the outer open() does nothing more', () => {
  let react: (() => void) | null = null
  const el = mountObserving('data-llselect-color-scheme', () => { const fn = react; react = null; fn?.() })
  const p = build(() => ({}), LLSelectSingle<string>, el)
  el.style.setProperty('--llselect-color-scheme', 'dark')
  let addedByReaction = -1
  react = (): void => { p.sel.open(); p.sel.close(); addedByReaction = p.added() }
  p.sel.open()
  assert.deepEqual(p.events, ['open:api', 'close:api'], 'the reaction had the last word: no second onOpen')
  assert.equal(p.added(), addedByReaction, 'the outer call added no listener')
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a stopped open() writes nothing more to the root element of a destroyed select component', () => {
  let reactions = 0
  const el = mountObserving('class', () => { reactions++ })
  const p = build((fire) => ({ createPopupListItemContentElFn: () => { fire(); return null } }), LLSelectSingle<string>, el)
  let reactionsAtDestroy = -1
  p.arm(() => { p.sel.destroy(); reactionsAtDestroy = reactions })
  p.sel.open()
  assert.equal(reactions, reactionsAtDestroy, 'no class write on the root after destroy() returned')
  assert.equal(p.leftover(), 0)
})

test('a root that closes the select component from its reaction to the open class: the stopped open() never shows the popup', () => {
  let react: (() => void) | null = null
  const el = mountObserving('class', () => { react?.() })
  const p = build(() => ({}), LLSelectSingle<string>, el)
  const shows = trackShows(p.sel.popupEl)
  react = (): void => {
    if (!el.classList.contains(p.sel.classIdMap.openClass)) { return }
    react = null
    p.sel.close()
  }
  p.sel.open()
  assert.equal(shows(), 0, 'the stopped call never showed the popup')
  assert.deepEqual(p.events, ['close:api'])
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a root that opens the select component from its reaction to the removal of the open class: open() is refused until the closed state is whole', () => {
  let react: (() => void) | null = null
  const el = mountObserving('class', () => { react?.() })
  const p = build(() => ({}), LLSelectSingle<string>, el)
  p.sel.open()
  react = (): void => {
    if (el.classList.contains(p.sel.classIdMap.openClass)) { return }
    react = null
    p.sel.open()
  }
  p.sel.close()
  assert.deepEqual(p.events, ['open:api', 'close:api'], 'the open() of the reaction did nothing')
  assertClosedCleanly(p)
  assertStillUsable(p)
})

test('a focus listener that destroys the select component at the last focus move of open(): the window scroll is left alone', () => {
  const p = build(() => ({ filterable: true }))
  const page = trackWindowScroll()
  const input = p.sel.popupEl.querySelector('input')
  assert.ok(input)
  // The code that destroys the select component has moved the page.
  input.addEventListener('focus', () => { p.sel.destroy(); page.scrollTo(300) }, { once: true })
  p.sel.open()
  assert.equal(p.sel.isOpened(), false)
  assert.deepEqual(page.restores(), [], 'whoever destroyed the select component owns the page scroll')
  assert.equal(p.leftover(), 0)
})

test('the scroll restore that open() leaves for the next animation frame does nothing once the select component is destroyed', () => {
  const g = globalThis as { requestAnimationFrame?: unknown }
  const had = 'requestAnimationFrame' in g
  const saved = g.requestAnimationFrame
  const frames: Array<() => void> = []
  g.requestAnimationFrame = (callback: () => void): number => { frames.push(callback); return frames.length }
  try {
    const p = build(() => ({}))
    const page = trackWindowScroll()
    p.sel.open()
    assert.equal(frames.length, 1, 'open() left one restore for the next frame')
    // Before that frame, the app destroys the select component and moves the page.
    p.sel.destroy()
    page.scrollTo(300)
    for (const frame of frames) { frame() }
    assert.deepEqual(page.restores(), [], 'whoever destroyed the select component owns the page scroll')
  } finally {
    if (had) { g.requestAnimationFrame = saved } else { delete g.requestAnimationFrame }
  }
})

test('the scroll restore that open() leaves for the next animation frame still runs for a select component that is not destroyed', () => {
  const g = globalThis as { requestAnimationFrame?: unknown }
  const had = 'requestAnimationFrame' in g
  const saved = g.requestAnimationFrame
  const frames: Array<() => void> = []
  g.requestAnimationFrame = (callback: () => void): number => { frames.push(callback); return frames.length }
  try {
    const p = build(() => ({}))
    const page = trackWindowScroll()
    p.sel.open()
    // The browser scrolled the page after the open, as Firefox does for the active option.
    page.scrollTo(300)
    for (const frame of frames) { frame() }
    assert.deepEqual(page.restores(), [0])
    p.sel.close()
  } finally {
    if (had) { g.requestAnimationFrame = saved } else { delete g.requestAnimationFrame }
  }
})

// A notification may close the select component. The stopped call then
// repeats the cleanup, which calls no function of the settings, so the
// arrow's content function runs once for the close, not twice.
function arrowStatesOf(Class: typeof LLSelectSingle<string>, settings: (p: () => Probe) => Partial<LLSelectSingleSettings<string>>): { p: Probe; states: boolean[] } {
  const states: boolean[] = []
  const p: Probe = build(() => ({
    createTriggerArrowContentElFn: (state) => {
      states.push(state.isOpened)
      return null
    },
    ...settings(() => p),
  }), Class)
  // The construction rendered the arrow of the closed state already.
  states.length = 0
  return { p, states }
}

test('an onOpen listener that closes the select component: the arrow content function runs once for the open and once for the close', () => {
  let closeOnOpen = false
  const { p, states } = arrowStatesOf(LLSelectSingle<string>, (probe) => ({
    onOpen: () => { if (closeOnOpen) { closeOnOpen = false; probe().sel.close() } },
  }))
  closeOnOpen = true
  p.sel.open()
  assert.deepEqual(states, [true, false])
  assertClosedCleanly(p)
})

test('an onOpened override that closes the select component: the arrow content function runs once for the open and once for the close', () => {
  let armed: (() => void) | null = null
  class Guarded extends LLSelectSingle<string> {
    protected override onOpened(): void {
      const fn = armed
      armed = null
      fn?.()
    }
  }
  const { p, states } = arrowStatesOf(Guarded, () => ({}))
  armed = (): void => { p.sel.close() }
  p.sel.open()
  assert.deepEqual(states, [true, false])
  assertClosedCleanly(p)
})

test('a close() override that throws before it closes: destroy() still tears down what the open had attached, and passes the error on', () => {
  let throwInClose = false
  class Throwing extends LLSelectSingle<string> {
    public override close(): void {
      if (throwInClose) { throw new Error('close failed') }
      super.close()
    }
  }
  const p = build(() => ({}), Throwing)
  p.sel.open()
  assert.equal(p.sel.isOpened(), true)
  assert.ok(p.leftover() > 0, 'the open popup has listeners on the document and on the window')
  throwInClose = true
  assert.throws(() => { p.sel.destroy() }, /close failed/)
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0, 'destroy() detached the positioner and the listeners of the open popup')
  assert.equal(p.sel.popupEl.hasAttribute('data-placement'), false)
  assert.equal(p.sel.rootEl.children.length, 0)
  assert.equal(p.sel.rootEl.classList.contains(p.sel.classIdMap.rootClass), false, 'the steps after the close ran as well')
  assert.deepEqual(p.events, ['open:api'], 'no onClose from a close() that was not carried out')
})

test('an onClose listener that throws during destroy(): destroy() still finishes its teardown, and passes the error on', () => {
  let throwOnClose = false
  const p = build(() => ({
    onClose: () => { if (throwOnClose) { throw new Error('listener failed') } },
  }))
  p.sel.open()
  throwOnClose = true
  assert.throws(() => { p.sel.destroy() }, /listener failed/)
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0)
  assert.equal(p.sel.rootEl.children.length, 0, 'the root element is emptied')
  assert.equal(p.sel.rootEl.classList.contains(p.sel.classIdMap.rootClass), false, 'the steps after the close ran as well')
})

test('an isEmpty override that throws inside the close of destroy(), after that close marked the popup closed: destroy() still detaches what the open had attached', () => {
  let throwInIsEmpty = false
  class Throwing extends LLSelectSingle<string> {
    protected override isEmpty(): boolean {
      if (throwInIsEmpty) { throw new Error('isEmpty failed') }
      return super.isEmpty()
    }
  }
  const p = build(() => ({ clearable: true }), Throwing)
  p.sel.setChosenItem('a')
  p.sel.open()
  assert.ok(p.leftover() > 0, 'the open popup has listeners on the document and on the window')
  throwInIsEmpty = true
  assert.throws(() => { p.sel.destroy() }, /isEmpty failed/)
  assert.equal(p.sel.isOpened(), false)
  assert.equal(p.leftover(), 0, 'destroy() detached the positioner and the listeners of the open popup')
  assert.equal(p.sel.popupEl.hasAttribute('data-placement'), false)
  assert.equal(p.sel.rootEl.children.length, 0)
})

// A subclass that can render the list and set the active row from outside.
class RenderingWhileClosed extends LLSelectSingle<string> {
  public renderList(): void { this.renderPopupList() }
  public activateRow(index: number): void { this.setFocusedIndex(index) }
}

test('a subclass that renders the list while the popup never opened: destroy() still empties the list and clears the active row', () => {
  const sel = new RenderingWhileClosed(mount(), {})
  sel.setItems(['a', 'b'])
  sel.renderList()
  sel.activateRow(0)
  assert.equal(sel.popupListEl.children.length > 0, true, 'the rows were rendered while closed')
  assert.equal(sel.triggerEl.hasAttribute('aria-activedescendant'), true)
  sel.destroy()
  assert.equal(sel.popupListEl.children.length, 0)
  assert.equal(sel.triggerEl.hasAttribute('aria-activedescendant'), false)
})

test('an onClosed override that renders the list after a close that completed: destroy() still empties the list', () => {
  class RenderingOnClosed extends LLSelectSingle<string> {
    protected override onClosed(): void { this.renderPopupList() }
  }
  const p = build(() => ({}), RenderingOnClosed)
  p.sel.open()
  p.sel.close()
  assert.equal(p.sel.popupListEl.children.length > 0, true, 'onClosed rendered the rows again')
  p.sel.destroy()
  assert.equal(p.sel.popupListEl.children.length, 0)
})

test('a write of the put-back that throws inside close(): destroy() runs the put-back again and completes it', () => {
  const p = build(() => ({}))
  p.sel.open()
  const list = p.sel.popupListEl
  let throwOnce = true
  list.replaceChildren = function (this: HTMLElement, ...nodes: (Node | string)[]): void {
    if (throwOnce) {
      throwOnce = false
      throw new Error('replace failed')
    }
    window.Element.prototype.replaceChildren.apply(this, nodes)
  }
  assert.throws(() => { p.sel.close() }, /replace failed/)
  assert.equal(p.sel.popupEl.hidden, false, 'the put-back stopped before it hid the popup')
  assert.equal(list.children.length > 0, true)
  p.sel.destroy()
  assert.equal(p.sel.popupEl.hidden, true)
  assert.equal(p.sel.popupEl.style.position, '')
  assert.equal(list.children.length, 0)
  assert.equal(p.leftover(), 0)
})
