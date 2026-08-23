import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

function options(sel: { popupListEl: HTMLElement }): HTMLElement[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]'))
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function focusedText(sel: { popupListEl: HTMLElement; classIdMap: { itemFocusedClass: string } }): string | null | undefined {
  return sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)?.textContent
}

// --- control-level disabled --------------------------------------------------

test('setDisabled toggles aria-disabled / data-disabled / tabindex and isDisabled()', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.isDisabled(), false)
  assert.equal(sel.triggerEl.getAttribute('data-disabled'), 'false')
  sel.setDisabled(true)
  assert.equal(sel.isDisabled(), true)
  assert.equal(sel.triggerEl.getAttribute('aria-disabled'), 'true')
  assert.equal(sel.triggerEl.getAttribute('data-disabled'), 'true')
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  sel.setDisabled(false)
  assert.equal(sel.isDisabled(), false)
  assert.equal(sel.triggerEl.hasAttribute('aria-disabled'), false)
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('disabled control never uses the native disabled attribute', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setDisabled(true)
  assert.equal(sel.triggerEl.hasAttribute('disabled'), false)
})

test('disabled control cannot open (open() / click / keyboard are no-ops)', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.setDisabled(true)
  sel.open()
  assert.equal(sel.popupEl.hidden, true)
  sel.triggerEl.click()
  assert.equal(sel.popupEl.hidden, true)
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(sel.popupEl.hidden, true)
})

test('setDisabled(true) closes an open popup', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.open()
  assert.equal(sel.popupEl.hidden, false)
  sel.setDisabled(true)
  assert.equal(sel.popupEl.hidden, true)
})

test('focusableWhenDisabled keeps the disabled trigger in the tab order', () => {
  const sel = new LLSelectSingle<string>(mount(), { focusableWhenDisabled: true })
  sel.setDisabled(true)
  assert.equal(sel.triggerEl.getAttribute('aria-disabled'), 'true')
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
})

test('re-enabling restores opening', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b'])
  sel.setDisabled(true)
  sel.setDisabled(false)
  sel.open()
  assert.equal(sel.popupEl.hidden, false)
})

// --- item-level disabled -----------------------------------------------------

test('itemDisabledFn marks the option aria-disabled + item-disabled class', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const [a, b, c] = options(sel)
  assert.equal(b!.getAttribute('aria-disabled'), 'true')
  assert.ok(b!.classList.contains(sel.classIdMap.itemDisabledClass))
  assert.equal(a!.hasAttribute('aria-disabled'), false)
  assert.equal(c!.hasAttribute('aria-disabled'), false)
})

test('clicking a disabled item does not select it (single)', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  options(sel)[1]!.click()
  assert.equal(sel.getChosenItem(), undefined)
  assert.equal(sel.popupEl.hidden, false) // no selection -> still open
})

test('clicking a disabled item does not toggle it (multiple)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  options(sel)[1]!.click()
  assert.deepEqual([...sel.getChosenItems()], [])
})

test('keyboard navigation skips disabled items', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(focusedText(sel), 'a') // focusInitial -> first enabled
  fireKey(sel.triggerEl, 'ArrowDown') // skip b -> c
  assert.equal(focusedText(sel), 'c')
  fireKey(sel.triggerEl, 'ArrowUp') // skip b -> a
  assert.equal(focusedText(sel), 'a')
})

test('focusInitial lands on the first enabled item', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'a' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(focusedText(sel), 'b')
})

test('Home / End land on the first / last enabled item', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'a' || i === 'd' })
  sel.setItems(['a', 'b', 'c', 'd'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  assert.equal(focusedText(sel), 'c') // d disabled -> last enabled is c
  fireKey(sel.triggerEl, 'Home')
  assert.equal(focusedText(sel), 'b') // a disabled -> first enabled is b
})

test('Enter does not select a disabled item', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: () => true })
  sel.setItems(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(sel.getChosenItem(), undefined)
})

// --- bulk ops + selection retention (multiple) -------------------------------

test('chooseAll chooses only enabled items', () => {
  const sel = new LLSelectMultiple<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.chooseAll()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'c'])
})

test('toggleAll compares enabled items only', () => {
  const sel = new LLSelectMultiple<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleAll() // none chosen -> choose all enabled
  assert.deepEqual([...sel.getChosenItems()], ['a', 'c'])
  sel.toggleAll() // all enabled chosen -> clear
  assert.deepEqual([...sel.getChosenItems()], [])
})

test('an already-chosen item that becomes disabled stays chosen', () => {
  let disabled = false
  const sel = new LLSelectMultiple<string>(mount(), { itemDisabledFn: i => disabled && i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['b'])
  disabled = true
  sel.rerender()
  assert.deepEqual([...sel.getChosenItems()], ['b']) // retained
  sel.chooseAll() // preserves disabled-chosen 'b', adds enabled a, c
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
})

test('unchooseAll preserves disabled-chosen items', () => {
  let disabled = false
  const sel = new LLSelectMultiple<string>(mount(), { itemDisabledFn: i => disabled && i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b'])
  disabled = true
  sel.rerender()
  sel.unchooseAll()
  assert.deepEqual([...sel.getChosenItems()], ['b']) // 'a' cleared, disabled 'b' kept
})

test('disabled: the clear button and tag remove buttons are inert', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', clearable: true, triggerDisplay: 'tags',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.setDisabled(true)
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a'], 'tag x must not remove while disabled')
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a'], 'clear must not clear while disabled')
  sel.setDisabled(false)
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  assert.deepEqual([...sel.getChosenItems()], [], 're-enabled clear must work')
})

test('a rerender moves focus off a row that BECAME disabled in place', () => {
  let disabled = false
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    itemDisabledFn: i => disabled && i === 'b',
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown') // a -> b? initial focus is 'a'; move to 'b'
  const focusedText = () => sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)?.textContent
  assert.equal(focusedText(), 'b', 'precondition: focus sits on b')
  disabled = true
  sel.rerender()
  assert.equal(focusedText(), 'a', 'focus must seek backward off the now-disabled row')
  const activeId = sel.triggerEl.getAttribute('aria-activedescendant')
  assert.equal(activeId && document.getElementById(activeId)?.textContent, 'a', 'aria-activedescendant must follow')
})
