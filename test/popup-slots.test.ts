import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectBaseSettingsInput } from '../src/base.js'
import { ja } from '../src/i18n/ja.js'

// Pinned header / footer slots: built once in the constructor, only when their
// content fn returns an element; never rebuilt or moved by the library.
// Contract: DESIGN.md "Popup header / footer slots".

function mount(): HTMLElement {
  setupDom()
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function childClasses(sel: { popupEl: HTMLElement }): string[] {
  return [...sel.popupEl.children].map(c => c.className)
}

function contentEl(text: string): HTMLElement {
  const el = document.createElement('span')
  el.textContent = text
  return el
}

test('no slot settings: no slot elements, popup child list unchanged', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x' })
  assert.equal(sel.popupHeaderEl, null)
  assert.equal(sel.popupFooterEl, null)
  const m = sel.classIdMap
  assert.deepEqual(childClasses(sel), [m.filterInputClass, m.popupListClass, m.popupListNoResultsClass])
  assert.equal(sel.popupEl.querySelector(`.${m.popupHeaderClass}, .${m.popupFooterClass}`), null)
})

test('a fn returning null builds nothing', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    createPopupHeaderContentElFn: () => null,
    createPopupFooterContentElFn: () => null,
  })
  assert.equal(sel.popupHeaderEl, null)
  assert.equal(sel.popupFooterEl, null)
  assert.equal(sel.popupEl.children.length, 3)
})

test('header sits between the filter input and the listbox; footer after the no-results message', () => {
  const header = contentEl('H')
  const footer = contentEl('F')
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    createPopupHeaderContentElFn: () => header,
    createPopupFooterContentElFn: () => footer,
  })
  const m = sel.classIdMap
  assert.deepEqual(childClasses(sel), [m.filterInputClass, m.popupHeaderClass, m.popupListClass, m.popupListNoResultsClass, m.popupFooterClass])
  assert.ok(sel.popupHeaderEl)
  assert.ok(sel.popupFooterEl)
  assert.equal(sel.popupHeaderEl.firstElementChild, header)
  assert.equal(sel.popupFooterEl.firstElementChild, footer)
  assert.equal(m.popupHeaderClass, 'llselect-popup-header')
  assert.equal(m.popupFooterClass, 'llselect-popup-footer')
  // plain containers: no role, no tabindex, and they never flex (only the listbox does)
  for (const el of [sel.popupHeaderEl, sel.popupFooterEl]) {
    assert.equal(el.getAttribute('role'), null)
    assert.equal(el.getAttribute('tabindex'), null)
    assert.equal(el.style.flexGrow, '0') // `flex: none`; jsdom expands it to `0 0 auto`
    assert.equal(el.style.flexShrink, '0')
  }
})

test('only one slot: order still holds', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', createPopupFooterContentElFn: () => contentEl('F') })
  const m = sel.classIdMap
  assert.equal(sel.popupHeaderEl, null)
  assert.deepEqual(childClasses(sel), [m.filterInputClass, m.popupListClass, m.popupListNoResultsClass, m.popupFooterClass])
})

test('the content fn runs exactly once, and the node survives every render path', () => {
  let calls = 0
  const footer = contentEl('F')
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    createPopupFooterContentElFn: () => { calls += 1; return footer },
  })
  assert.equal(calls, 1)
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  sel.setChosenItems(['a'])
  sel.toggleItem('b')
  sel.rerender()
  sel.setUiTranslationPack(ja)
  sel.setItems(['a', 'b'])
  sel.close()
  sel.open()
  assert.equal(calls, 1)
  assert.ok(sel.popupFooterEl)
  assert.equal(sel.popupFooterEl.firstElementChild, footer)
  assert.equal(sel.popupFooterEl.parentElement, sel.popupEl)
  assert.equal(sel.popupEl.lastElementChild, sel.popupFooterEl)
})

test('the no-results message toggles between the slots without touching them', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    filterable: true,
    createPopupHeaderContentElFn: () => contentEl('H'),
    createPopupFooterContentElFn: () => contentEl('F'),
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const input = sel.popupEl.querySelector('input')
  assert.ok(input)
  const noResults = sel.popupEl.querySelector(`.${sel.classIdMap.popupListNoResultsClass}`) as HTMLElement
  assert.equal(noResults.hidden, true)
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(noResults.hidden, false)
  assert.equal(noResults.nextElementSibling, sel.popupFooterEl)
  assert.equal(sel.popupHeaderEl?.nextElementSibling, sel.popupListEl)
})

test('a subclass builds a slot without the setting, through either method', () => {
  class HeaderByContent extends LLSelectSingle<string> {
    protected override createPopupHeaderContentEl(): HTMLElement | null { return contentEl('H') }
  }
  class FooterByElement extends LLSelectSingle<string> {
    protected override createPopupFooterEl(): HTMLElement | null {
      const el = document.createElement('div')
      el.className = 'my-footer'
      return el
    }
  }
  const a = new HeaderByContent(mount(), { ariaLabel: 'x' })
  assert.ok(a.popupHeaderEl)
  assert.equal(a.popupHeaderEl.className, a.classIdMap.popupHeaderClass)
  assert.equal(a.popupHeaderEl.nextElementSibling, a.popupListEl)
  const b = new FooterByElement(mount(), { ariaLabel: 'x' })
  assert.ok(b.popupFooterEl)
  assert.equal(b.popupFooterEl.className, 'my-footer')
  assert.equal(b.popupEl.lastElementChild, b.popupFooterEl)
})

test('the reorder recipe: a subclass constructor moves the header above the filter input and it sticks', () => {
  class HeaderAboveFilter extends LLSelectSingle<string> {
    constructor(el: HTMLElement, settings: LLSelectBaseSettingsInput<string>) {
      super(el, settings)
      if (this.popupHeaderEl) { this.popupEl.prepend(this.popupHeaderEl) }
    }
  }
  const sel = new HeaderAboveFilter(mount(), { ariaLabel: 'x', filterable: true, createPopupHeaderContentElFn: () => contentEl('H') })
  sel.setItems(['a'])
  sel.open()
  sel.rerender()
  sel.close()
  assert.equal(sel.popupEl.firstElementChild, sel.popupHeaderEl)
})

test('destroy() removes the slot nodes with the rest of the root', () => {
  const el = mount()
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    createPopupHeaderContentElFn: () => contentEl('H'),
    createPopupFooterContentElFn: () => contentEl('F'),
  })
  sel.destroy()
  assert.equal(el.children.length, 0)
  assert.equal(document.querySelector(`.${sel.classIdMap.popupHeaderClass}`), null)
})

// --- keyboard / focus contract for app controls inside a slot (A11Y.md "Slot controls") ---

function mountWithOutside(): { el: HTMLElement; outside: HTMLButtonElement } {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="outside">x</button></body></html>')
  return { el: document.getElementById('mount')!, outside: document.getElementById('outside') as HTMLButtonElement }
}

function footerButton(): HTMLButtonElement {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = 'Restore defaults'
  return b
}

for (const filterable of [false, true]) {
  test(`Esc on a focused slot button closes and returns focus to the trigger (filterable: ${filterable})`, () => {
    const { el } = mountWithOutside()
    const button = footerButton()
    const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', filterable, createPopupFooterContentElFn: () => button })
    sel.setItems(['a', 'b'])
    sel.open()
    button.focus()
    assert.equal(document.activeElement, button)
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    button.dispatchEvent(ev)
    assert.equal(ev.defaultPrevented, true) // an enclosing modal <dialog> must not also close
    assert.equal(sel.isOpened(), false)
    assert.equal(document.activeElement, sel.triggerEl)
  })
}

test('an Esc the app already handled (defaultPrevented) is left alone', () => {
  const { el } = mountWithOutside()
  const field = document.createElement('input')
  field.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault() } })
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', createPopupFooterContentElFn: () => field })
  sel.setItems(['a'])
  sel.open()
  field.focus()
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
  assert.equal(sel.isOpened(), true)
})

test('an Esc during IME composition is ignored', () => {
  const { el } = mountWithOutside()
  const button = footerButton()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', createPopupFooterContentElFn: () => button })
  sel.setItems(['a'])
  sel.open()
  button.focus()
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true, cancelable: true }))
  assert.equal(sel.isOpened(), true)
})

test('other keys on a slot control are not intercepted', () => {
  const { el } = mountWithOutside()
  const button = footerButton()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', createPopupFooterContentElFn: () => button })
  sel.setItems(['a', 'b'])
  sel.open()
  button.focus()
  for (const key of ['ArrowDown', 'Enter', ' ', 'Home']) {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    button.dispatchEvent(ev)
    assert.equal(ev.defaultPrevented, false, key)
  }
  assert.equal(sel.isOpened(), true)
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant') ?? sel.popupEl.querySelector('input')?.getAttribute('aria-activedescendant'), sel.popupListEl.querySelector('[role="option"]')?.id) // the ring did not move
})

test('without a slot, Esc bubbling from inside the popup reaches no popup listener (no-degradation)', () => {
  const { el } = mountWithOutside()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x' })
  sel.setItems(['a'])
  sel.open()
  sel.popupListEl.focus() // tabindex="-1": programmatically focusable
  const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  sel.popupListEl.dispatchEvent(ev)
  assert.equal(ev.defaultPrevented, false)
  assert.equal(sel.isOpened(), true)
})

test('Tab-away from a slot control closes without reclaiming focus', () => {
  const { el, outside } = mountWithOutside()
  const button = footerButton()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', createPopupFooterContentElFn: () => button })
  sel.setItems(['a'])
  sel.open()
  button.focus()
  // A real focus move: focus lands outside FIRST, then focusout reports it.
  outside.focus()
  button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))
  assert.equal(sel.isOpened(), false)
  assert.equal(document.activeElement, outside)
})

test('close() from a slot button click returns focus to the trigger', () => {
  const { el } = mountWithOutside()
  const button = footerButton()
  let sel: LLSelectMultiple<string>
  button.addEventListener('click', () => { sel.close() })
  sel = new LLSelectMultiple<string>(el, { ariaLabel: 'x', createPopupFooterContentElFn: () => button })
  sel.setItems(['a'])
  sel.open()
  button.focus() // reached by Tab; a keyboard Enter then fires click
  button.click()
  assert.equal(sel.isOpened(), false)
  assert.equal(document.activeElement, sel.triggerEl)
})

test('slot content is inside the root, so focus moving onto it keeps the popup open', () => {
  const { el } = mountWithOutside()
  const button = footerButton()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', filterable: true, createPopupFooterContentElFn: () => button })
  sel.setItems(['a'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: button }))
  assert.equal(sel.isOpened(), true)
})
