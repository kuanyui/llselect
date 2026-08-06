import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// clearable: an x button in its own trigger slot that empties the selection.
// See docs/DESIGN.md "Clear button (clearable)".

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
