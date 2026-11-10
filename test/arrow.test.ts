import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { createChevronDownSvgEl, createChevronUpDownSvgEl, createTriangleDownSvgEl, createTriangleUpDownSvgEl } from '../src/icons.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('trigger starts with data-state="closed"', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.triggerWrapperEl.getAttribute('data-state'), 'closed')
})

test('trigger data-state toggles open/closed', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a'])
  sel.open()
  assert.equal(sel.triggerWrapperEl.getAttribute('data-state'), 'open')
  sel.close()
  assert.equal(sel.triggerWrapperEl.getAttribute('data-state'), 'closed')
})

test('trigger has content + arrow slots', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.ok(sel.triggerContentEl)
  assert.ok(sel.triggerContentEl.classList.contains('llselect-trigger-content'))
  const arrow = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
})

test('createTriggerArrowContentElFn default null: arrow slot is empty', () => {
  const sel = new LLSelectSingle<string>(mount())
  const arrow = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
  assert.equal(arrow.children.length, 0)
})

test('createTriggerArrowContentElFn returning an element appends it to the arrow slot', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerArrowContentElFn: () => {
      const el = document.createElement('span')
      el.id = 'my-arrow'
      el.textContent = '▼'  // black down-pointing triangle
      return el
    },
  })
  const arrow = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
  assert.equal(arrow.children.length, 1)
  assert.equal(arrow.querySelector('#my-arrow')?.textContent, '▼')
})

test('createTriggerArrowContentElFn is invoked with isOpened state on open/close', () => {
  const calls: Array<boolean> = []
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerArrowContentElFn: ({ isOpened }) => {
      calls.push(isOpened)
      return null
    },
  })
  sel.setItems(['a', 'b'])
  // calls so far: [false] from constructor renderTriggerArrow
  sel.open()
  // open calls renderTriggerArrow -> createTriggerArrowContentElFn with isOpened=true
  sel.close()
  // close calls renderTriggerArrow -> createTriggerArrowContentElFn with isOpened=false
  assert.deepEqual(calls, [false, true, false])
})

test('createTriggerArrowContentElFn returning null leaves the slot empty', () => {
  let returnNull = true
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerArrowContentElFn: () => {
      return returnNull ? null : document.createElement('span')
    },
  })
  const arrow = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')!
  assert.equal(arrow.children.length, 0)
  returnNull = false
  sel.setItems(['a'])
  sel.open()
  assert.equal(arrow.children.length, 1)
})

test('a subclass createTriggerArrowContentEl override replaces the setting (override wins)', () => {
  class Derived extends LLSelectSingle<string> {
    protected override createTriggerArrowContentEl(): HTMLElement | null {
      const el = document.createElement('span')
      el.className = 'derived-arrow'
      return el
    }
  }
  const sel = new Derived(mount(), {
    createTriggerArrowContentElFn: () => {
      const el = document.createElement('span')
      el.className = 'fn-arrow'
      return el
    },
  })
  const arrow = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')!
  assert.ok(arrow.querySelector('.derived-arrow')) // override wins
  assert.equal(arrow.querySelector('.fn-arrow'), null)
})

test('triggerContentEl receives placeholder/chosen text (arrow slot preserved)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerArrowContentElFn: () => {
      const el = document.createElement('span')
      el.className = 'survive'
      el.textContent = 'x'
      return el
    },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'a')
  // Arrow slot must still be present after the content change.
  assert.ok(sel.triggerWrapperEl.querySelector('.survive'))
})

const THEMES = ['vanilla', 'bootstrap-3', 'bootstrap-4', 'bootstrap-5', 'tailwind']

// jsdom 25 matches :has() in getComputedStyle, but orders rules by source
// position only, not by specificity; the real-browser pass checks specificity.
function mountWithTheme(theme: string): void {
  mount()
  const style = document.createElement('style')
  style.textContent = readFileSync(join(process.cwd(), 'src', 'themes', `${theme}.css`), 'utf8')
  document.head.appendChild(style)
}

function mountSelect(createArrow: (state: { isOpened: boolean }) => HTMLElement | SVGElement): [LLSelectSingle<string>, Element] {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const sel = new LLSelectSingle<string>(el, { createTriggerArrowContentElFn: createArrow })
  sel.setItems(['a', 'b'])
  const slot = sel.triggerWrapperEl.querySelector('.llselect-trigger-arrow')
  assert.ok(slot)
  return [sel, slot]
}

test('every shipped theme turns a down arrow while the popup is open, and keeps an arrow marked data-llselect-no-rotate still', () => {
  const custom = (): HTMLElement => {
    const el = document.createElement('i')
    el.setAttribute('data-llselect-no-rotate', '')
    return el
  }
  const arrows: Array<[string, () => HTMLElement | SVGElement, boolean]> = [
    ['createChevronDownSvgEl', () => createChevronDownSvgEl(), true],
    ['createTriangleDownSvgEl', () => createTriangleDownSvgEl(), true],
    ['createChevronUpDownSvgEl', () => createChevronUpDownSvgEl(), false],
    ['createTriangleUpDownSvgEl', () => createTriangleUpDownSvgEl(), false],
    ['an app icon with the attribute', custom, false],
  ]
  for (const theme of THEMES) {
    mountWithTheme(theme)
    for (const [name, createArrow, turns] of arrows) {
      const [sel, slot] = mountSelect(() => createArrow())
      // A turning arrow keeps the slot's transform transition; a still one has none.
      const assertTransition = (moment: string): void => {
        const transition = window.getComputedStyle(slot).transition
        if (turns) {
          assert.match(transition, /transform/, `${theme}, ${name}: transition ${moment}`)
        } else {
          assert.equal(transition, 'none', `${theme}, ${name}: transition ${moment}`)
        }
      }
      assert.notEqual(window.getComputedStyle(slot).transform, 'rotate(180deg)', `${theme}, ${name}: closed`)
      assertTransition('while closed')
      sel.open()
      assert.equal(sel.isOpened(), true)
      assert.equal(window.getComputedStyle(slot).transform, turns ? 'rotate(180deg)' : 'none', `${theme}, ${name}: open`)
      assertTransition('while open')
      sel.close()
      assert.notEqual(window.getComputedStyle(slot).transform, 'rotate(180deg)', `${theme}, ${name}: closed again`)
      assertTransition('once closed again')
    }
  }
})

test('every shipped theme drops the slot transition when a marked arrow replaces a turned down arrow, on rerender() and on close', () => {
  for (const theme of THEMES) {
    mountWithTheme(theme)
    // A rerender() while the popup is open puts an up-down arrow in place of the turned down arrow.
    let upDown = false
    const [swapped, swappedSlot] = mountSelect(() => (upDown ? createChevronUpDownSvgEl() : createChevronDownSvgEl()))
    swapped.open()
    assert.equal(window.getComputedStyle(swappedSlot).transform, 'rotate(180deg)', `${theme}: turned before the rerender()`)
    upDown = true
    swapped.rerender()
    assert.equal(swappedSlot.firstElementChild?.hasAttribute('data-llselect-no-rotate'), true, `${theme}: the rerender() put the up-down arrow in`)
    assert.equal(window.getComputedStyle(swappedSlot).transform, 'none', `${theme}: transform after the rerender()`)
    assert.equal(window.getComputedStyle(swappedSlot).transition, 'none', `${theme}: transition after the rerender()`)
    // The close puts an up-down arrow in place of the open state's turned down arrow.
    const [closing, closingSlot] = mountSelect(({ isOpened }) => (isOpened ? createChevronDownSvgEl() : createChevronUpDownSvgEl()))
    closing.open()
    assert.equal(window.getComputedStyle(closingSlot).transform, 'rotate(180deg)', `${theme}: turned before the close`)
    closing.close()
    assert.equal(closingSlot.firstElementChild?.hasAttribute('data-llselect-no-rotate'), true, `${theme}: the close put the up-down arrow in`)
    assert.notEqual(window.getComputedStyle(closingSlot).transform, 'rotate(180deg)', `${theme}: transform after the close`)
    assert.equal(window.getComputedStyle(closingSlot).transition, 'none', `${theme}: transition after the close`)
  }
})
