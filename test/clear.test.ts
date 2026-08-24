import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectBase } from '../src/base.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// clearable: an x button in its own trigger slot that empties the selection.
// See docs/llm/DESIGN.md "Clear button (clearable)".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function clearBtn(sel: { triggerEl: HTMLElement; classIdMap: { triggerClearButtonClass: string } }): HTMLButtonElement | null {
  return sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.triggerClearButtonClass}`)
}

test('clearable builds a clear button; default off builds none', () => {
  assert.equal(clearBtn(new LLSelectSingle<string>(mount())), null)
  const on = new LLSelectSingle<string>(mount(), { clearable: true })
  const btn = clearBtn(on)!
  assert.equal(btn.tagName, 'BUTTON')
  assert.equal(btn.getAttribute('type'), 'button')
  assert.equal(btn.getAttribute('tabindex'), '-1')
  assert.equal(btn.getAttribute('aria-label'), 'Clear selection')
})

test('clear button is a direct child of the trigger (own slot, not inside content)', () => {
  const sel = new LLSelectSingle<string>(mount(), { clearable: true })
  assert.equal(clearBtn(sel)!.parentElement, sel.triggerEl)
})

test('clicking clear empties single selection to undefined and fires onChange', () => {
  let last: unknown = 'sentinel'
  const sel = new LLSelectSingle<string>(mount(), { clearable: true, onChange: (v) => { last = v } })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  last = 'sentinel'
  clearBtn(sel)!.click()
  assert.equal(sel.getChosenItem(), undefined)
  assert.equal(last, undefined)
})

test('clicking clear empties multiple selection to [] and fires onChange', () => {
  let last: unknown = 'sentinel'
  const sel = new LLSelectMultiple<string>(mount(), { clearable: true, onChange: (v) => { last = v } })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  last = 'sentinel'
  clearBtn(sel)!.click()
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.deepEqual(last, [])
})

test('clicking clear does not open the popup (stopPropagation)', () => {
  const sel = new LLSelectSingle<string>(mount(), { clearable: true })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  assert.equal(sel.popupEl.hidden, true)
  clearBtn(sel)!.click()
  assert.equal(sel.popupEl.hidden, true)
})

test('createTriggerClearButtonContentElFn fills the icon; library still owns click + aria', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    clearable: true,
    createTriggerClearButtonContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'my-x'
      return i
    },
    onChange: () => {},
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const btn = clearBtn(sel)!
  assert.ok(btn.querySelector('.my-x'))
  assert.equal(btn.getAttribute('aria-label'), 'Clear selection')
  btn.click()
  assert.equal(sel.getChosenItem(), undefined)
})

test('uiTranslationPack.triggerClearButtonAriaLabel customizes the clear button accessible name', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    clearable: true,
    uiTranslationPack: { triggerClearButtonAriaLabel: 'Reset choice' },
  })
  assert.equal(clearBtn(sel)!.getAttribute('aria-label'), 'Reset choice')
})

test('a subclass createTriggerClearButtonContentEl override replaces the setting (override wins)', () => {
  class Derived extends LLSelectSingle<string> {
    protected override createTriggerClearButtonContentEl(): HTMLElement | null {
      const i = document.createElement('i')
      i.className = 'derived-x'
      return i
    }
  }
  const sel = new Derived(mount(), {
    clearable: true,
    createTriggerClearButtonContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'fn-x'
      return i
    },
  })
  const btn = clearBtn(sel)!
  assert.ok(btn.querySelector('.derived-x')) // override wins
  assert.equal(btn.querySelector('.fn-x'), null)
})

test('clear coexists with a custom trigger content (own slot, no collision)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    clearable: true,
    createTriggerContentElFn: (ctx) => {
      const span = document.createElement('span')
      span.className = 'ct'
      span.textContent = ctx.chosenItem ?? 'none'
      return span
    },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  assert.ok(sel.triggerEl.querySelector('.ct'))
  assert.ok(clearBtn(sel))
})

test('QUALITY-89: rerender() rebuilds the clear button through createTriggerClearButtonEl, repairing an override that reads subclass fields', () => {
  class Fancy extends LLSelectSingle<string> {
    private icon = 'X'
    protected override createTriggerClearButtonEl(): HTMLElement {
      const btn = super.createTriggerClearButtonEl()
      // During the LLSelectSingle constructor's first render (right after
      // super()) this subclass field is still undefined.
      btn.setAttribute('data-icon', this.icon ?? 'unset')
      return btn
    }
  }
  const sel = new Fancy(mount(), { clearable: true, ariaLabel: 'x' })
  const first = clearBtn(sel)!
  assert.equal(first.getAttribute('data-icon'), 'unset', 'the first build runs before the subclass field initializer')
  sel.rerender()
  const rebuilt = clearBtn(sel)!
  assert.notEqual(rebuilt, first)
  assert.equal(rebuilt.getAttribute('data-icon'), 'X', 'rerender() re-runs the override with the field present')
  // Still in its own slot, between content and arrow, and still wired.
  const children = [...sel.triggerEl.children]
  assert.equal(children.length, 3)
  assert.equal(children.indexOf(rebuilt), 1)
  sel.setItems(['a'])
  sel.setChosenItem('a')
  clearBtn(sel)!.click()
  assert.equal(sel.getChosenItem(), undefined)
})

test('QUALITY-89: a rerender() while the clear button holds focus keeps focus on the rebuilt button', () => {
  const sel = new LLSelectSingle<string>(mount(), { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const before = clearBtn(sel)!
  before.focus()
  assert.equal(document.activeElement, before)
  sel.rerender()
  const after = clearBtn(sel)!
  assert.notEqual(after, before)
  assert.equal(document.activeElement, after)
})

test('QUALITY-89: without clearable, rerender() adds no clear button', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x' })
  sel.rerender()
  assert.equal(clearBtn(sel), null)
})

test('QUALITY-89: rerender() with the popup open and the clear button focused keeps the popup open', () => {
  // jsdom fires no focusout when a focused element is removed, so this pins
  // the intended state only; the real-browser check is in TODO.md.
  const sel = new LLSelectSingle<string>(mount(), { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.open()
  const before = clearBtn(sel)!
  before.focus()
  sel.rerender()
  assert.equal(sel.isOpened(), true, 'the rebuild must not read as focus leaving the widget')
  assert.equal(document.activeElement, clearBtn(sel))
})

test('QUALITY-89: every trigger render rebuilds the clear button - a single value change and a multiple clear click each yield a fresh, working button', () => {
  const single = new LLSelectSingle<string>(mount(), { clearable: true, ariaLabel: 'x' })
  single.setItems(['a', 'b'])
  const built = clearBtn(single)!
  single.setChosenItem('a')
  const afterChange = clearBtn(single)!
  assert.notEqual(afterChange, built, 'a value change renders the trigger, which rebuilds the button')
  assert.equal(afterChange.getAttribute('aria-label'), 'Clear selection')

  const multi = new LLSelectMultiple<string>(mount(), { clearable: true, ariaLabel: 'x' })
  multi.setItems(['a', 'b'])
  multi.setChosenItems(['a', 'b'])
  const clicked = clearBtn(multi)!
  clicked.click() // clearSelection -> setChosenItems([]) -> rerender: the button replaces itself inside its own handler
  assert.deepEqual(multi.getChosenItems(), [])
  const rebuilt = clearBtn(multi)!
  assert.notEqual(rebuilt, clicked)
  multi.setChosenItems(['b'])
  clearBtn(multi)!.click()
  assert.deepEqual(multi.getChosenItems(), [], 'the rebuilt button still clears')
})

test('QUALITY-89: inside a shadow root, the rebuild still keeps focus on the new clear button', () => {
  // document.activeElement is the shadow HOST there; the focus read must come
  // from the shadow root itself.
  setupDom('<!doctype html><html><body></body></html>')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const mountEl = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.appendChild(mountEl)
  const sel = new LLSelectSingle<string>(mountEl, { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const before = clearBtn(sel)!
  before.focus()
  assert.equal(shadow.activeElement, before, 'precondition: the button holds focus inside the shadow root')
  sel.rerender()
  const after = clearBtn(sel)!
  assert.notEqual(after, before)
  assert.equal(shadow.activeElement, after)
})

test('QUALITY-89: construction builds the clear button exactly once (the first trigger render), then once per render', () => {
  let builds = 0
  const sel = new LLSelectMultiple<string>(mount(), {
    clearable: true,
    ariaLabel: 'x',
    createTriggerClearButtonContentElFn: () => { builds++; return null },
  })
  assert.equal(builds, 1, 'the base constructor no longer pre-builds a throwaway button')
  assert.ok(clearBtn(sel), 'the button exists right after new')
  assert.equal([...sel.triggerEl.children].indexOf(clearBtn(sel)!), 1, 'content | clear | arrow')
  sel.setItems(['a'])
  sel.setChosenItems(['a'])
  assert.equal(builds, 2, 'one rebuild for the value change')
})

test('QUALITY-89: focus inside a custom clear-button icon still counts as the button holding focus', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    clearable: true,
    ariaLabel: 'x',
    createTriggerClearButtonContentElFn: () => {
      const icon = document.createElement('span')
      icon.tabIndex = -1
      return icon
    },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const icon = clearBtn(sel)!.querySelector('span')!
  icon.focus()
  assert.equal(document.activeElement, icon)
  sel.rerender()
  assert.equal(document.activeElement, clearBtn(sel), 'the rebuilt button takes the focus its icon held')
})

test('QUALITY-89: a content fn that reuses one icon element keeps the focus hand-over (focus is read before the rebuild)', () => {
  const target = mount() // before creating the icon: mount() installs the document
  const icon = document.createElement('span')
  icon.tabIndex = -1
  let activeAtBuild: Element | null = null
  const sel = new LLSelectSingle<string>(target, {
    clearable: true,
    ariaLabel: 'x',
    // The same node every time: the rebuild reparents it. The fn also records
    // where focus sits while the new button is being built.
    createTriggerClearButtonContentElFn: () => { activeAtBuild = document.activeElement; return icon },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(clearBtn(sel)!.firstElementChild, icon, 'precondition: the reused icon sits in the button')
  icon.focus()
  assert.equal(document.activeElement, icon)
  const before = clearBtn(sel)!
  sel.rerender()
  assert.equal(activeAtBuild, before, 'focus was parked on the old button before the icon was reparented')
  const rebuilt = clearBtn(sel)!
  assert.equal(rebuilt.firstElementChild, icon, 'the icon moved into the rebuilt button')
  assert.equal(document.activeElement, rebuilt, 'focus follows the rebuilt button even though building it moved the focused icon')
})

test('QUALITY-89: a createTriggerClearButtonEl override that returns the same element every time keeps it in place', () => {
  // The memo lives in a closure: the first build runs inside super() (the
  // LLSelectSingle constructor's first render). An INITIALIZED instance field
  // would be reassigned after super() returns (ES2020 set semantics), wiping
  // the value - the trap the extender docs describe; a closure never is, under
  // Define semantics too.
  let memo: HTMLElement | undefined
  class Memoized extends LLSelectSingle<string> {
    protected override createTriggerClearButtonEl(): HTMLElement {
      if (memo === undefined) { memo = super.createTriggerClearButtonEl() }
      return memo
    }
  }
  const sel = new Memoized(mount(), { clearable: true, ariaLabel: 'x' })
  const first = clearBtn(sel)!
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(clearBtn(sel), first, 'the same element stays in the trigger')
  assert.equal([...sel.triggerEl.children].indexOf(first), 1)
  sel.rerender()
  assert.equal(clearBtn(sel), first)
  first.click()
  assert.equal(sel.getChosenItem(), undefined, 'and it still clears')
})

test('QUALITY-89: a direct LLSelectBase subclass gets its clear button on its first trigger render, like the rest of the trigger', () => {
  class Bare extends LLSelectBase<string> {
    public paint(): void { this.renderTrigger() }
  }
  const sel = new Bare(mount(), { clearable: true, ariaLabel: 'x' })
  assert.equal(clearBtn(sel), null, 'no render yet, no button (the trigger content is unrendered too)')
  sel.paint()
  assert.ok(clearBtn(sel))
  assert.equal([...sel.triggerEl.children].indexOf(clearBtn(sel)!), 1)
})

test('QUALITY-89: with a builder that returns the same element, a render hands focus back to the icon that held it', () => {
  const target = mount()
  const icon = document.createElement('span')
  icon.tabIndex = -1
  let memo: HTMLElement | undefined
  class Memoized extends LLSelectSingle<string> {
    protected override createTriggerClearButtonEl(): HTMLElement {
      if (memo === undefined) {
        memo = super.createTriggerClearButtonEl()
        memo.appendChild(icon)
      }
      return memo
    }
  }
  const sel = new Memoized(target, { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  icon.focus()
  assert.equal(document.activeElement, icon)
  sel.rerender()
  assert.equal(clearBtn(sel), memo)
  assert.equal(document.activeElement, icon, 'nothing was rebuilt, so focus goes back where it was (not parked on the button)')
})

test('QUALITY-89: with a builder that returns the same element but swaps its icon, focus stays on the button (the old icon is detached)', () => {
  const target = mount()
  let memo: HTMLElement | undefined
  let icon = document.createElement('span')
  icon.tabIndex = -1
  class Memoized extends LLSelectSingle<string> {
    protected override createTriggerClearButtonEl(): HTMLElement {
      if (memo === undefined) { memo = super.createTriggerClearButtonEl() }
      memo.replaceChildren(icon) // every run installs whatever `icon` currently is
      return memo
    }
  }
  const sel = new Memoized(target, { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const oldIcon = icon
  oldIcon.focus()
  assert.equal(document.activeElement, oldIcon)
  icon = document.createElement('span') // the next build swaps in a fresh icon, detaching the focused one
  icon.tabIndex = -1
  sel.rerender()
  assert.equal(clearBtn(sel), memo)
  assert.equal(oldIcon.isConnected, false)
  assert.equal(document.activeElement, memo, 'a detached node cannot take focus back, so it stays on the parked button')
})

test('QUALITY-89: with a builder that returns the same element but moves its icon out of the widget, focus stays on the button', () => {
  const target = mount()
  let memo: HTMLElement | undefined
  const icon = document.createElement('span')
  icon.tabIndex = -1
  let builds = 0
  class Memoized extends LLSelectSingle<string> {
    protected override createTriggerClearButtonEl(): HTMLElement {
      builds++
      if (memo === undefined) {
        memo = super.createTriggerClearButtonEl()
        memo.appendChild(icon)
      } else if (builds > 2) {
        document.body.appendChild(icon) // a later run parks the icon outside the widget, still connected
      }
      return memo
    }
  }
  const sel = new Memoized(target, { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a') // build 2: icon still inside
  icon.focus()
  assert.equal(document.activeElement, icon)
  sel.rerender() // build 3: the override moves the icon out
  assert.equal(icon.isConnected, true)
  assert.equal(memo!.contains(icon), false)
  assert.equal(document.activeElement, memo, 'focus must not follow the icon out of the widget (that could close an open popup)')
})

test('QUALITY-89: focus inside a shadow-rooted icon is handed back to the real element after a same-element render', () => {
  const target = mount()
  let memo: HTMLElement | undefined
  const host = document.createElement('span')
  const inner = document.createElement('span')
  inner.tabIndex = -1
  host.attachShadow({ mode: 'open' }).appendChild(inner)
  class Memoized extends LLSelectSingle<string> {
    protected override createTriggerClearButtonEl(): HTMLElement {
      if (memo === undefined) {
        memo = super.createTriggerClearButtonEl()
        memo.appendChild(host)
      }
      return memo
    }
  }
  const sel = new Memoized(target, { clearable: true, ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  inner.focus()
  assert.equal(host.shadowRoot!.activeElement, inner, 'precondition: focus sits inside the icon shadow root')
  sel.rerender()
  assert.equal(host.shadowRoot!.activeElement, inner, 'handed back to the element that really held focus, not to its host')
})
