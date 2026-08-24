import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
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
      // During the base constructor this subclass field is still undefined.
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
