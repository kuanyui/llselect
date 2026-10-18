import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// onFocus / onBlur: DOM focus entering or leaving the whole widget (rootEl),
// never a move inside it. Contract: docs/llm/A11Y.md "Focus", DESIGN.md
// "Widget focus events". jsdom moves focus and fires focusin / focusout with
// relatedTarget on focus() and blur(); it fires nothing when a focused element
// is removed.

function mount(): { el: HTMLElement; outside: HTMLButtonElement; label: HTMLLabelElement } {
  setupDom('<!doctype html><html><body><label id="lbl">Fruit</label><div id="mount"></div><button id="outside">x</button></body></html>')
  return {
    el: document.getElementById('mount')!,
    outside: document.getElementById('outside') as HTMLButtonElement,
    label: document.getElementById('lbl') as HTMLLabelElement,
  }
}

function logged(el: HTMLElement, extra: { filterable?: boolean; labelEl?: HTMLLabelElement } = {}): { sel: LLSelectSingle<string>; log: string[] } {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    filterable: extra.filterable ?? false,
    labelEl: extra.labelEl ?? null,
    onFocus: () => { log.push('focus') },
    onBlur: () => { log.push(`blur:${sel.isOpened() ? 'open' : 'closed'}`) },
    onOpen: () => { log.push('open') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b'])
  return { sel, log }
}

test('onFocus fires once when focus enters from outside; a move inside the widget fires nothing', () => {
  const { el, outside } = mount()
  const { sel, log } = logged(el, { filterable: true })
  outside.focus()
  sel.triggerEl.focus()
  assert.deepEqual(log, ['focus'])
  sel.open() // moves focus from the trigger to the filter input: an inside move
  assert.equal(document.activeElement, sel.popupEl.querySelector('input'))
  assert.deepEqual(log, ['focus', 'open'])
})

test('onBlur fires once when focus leaves to an outside element, and when it leaves to nowhere', () => {
  const { el, outside } = mount()
  const { sel, log } = logged(el)
  sel.triggerEl.focus()
  outside.focus()
  assert.deepEqual(log, ['focus', 'blur:closed'])
  sel.triggerEl.focus()
  sel.triggerEl.blur() // relatedTarget null: focus went to nothing
  assert.deepEqual(log, ['focus', 'blur:closed', 'focus', 'blur:closed'])
})

test('focus leaving while open: onClose runs before onBlur, and isOpened() is already false inside onBlur', () => {
  const { el, outside } = mount()
  const { sel, log } = logged(el, { filterable: true })
  sel.triggerEl.focus()
  sel.open()
  outside.focus()
  assert.deepEqual(log, ['focus', 'open', 'close', 'blur:closed'])
  assert.equal(document.activeElement, outside, 'focus follows the user; close() does not pull it back')
})

test('a close that returns focus to the trigger fires no blur / focus pair, and returns it before the popup hides', () => {
  const { el } = mount()
  const log: string[] = []
  let activeInsideOnClose: Element | null = null
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    filterable: true,
    onFocus: () => { log.push('focus') },
    onBlur: () => { log.push('blur') },
    onClose: () => { activeInsideOnClose = document.activeElement; log.push('close') },
  })
  sel.setItems(['a', 'b'])
  sel.triggerEl.focus()
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  let hiddenWhenFocusLeftInput: boolean | undefined
  input.addEventListener('focusout', () => { hiddenWhenFocusLeftInput = sel.popupEl.hidden })
  sel.close()
  assert.deepEqual(log, ['focus', 'close'])
  assert.equal(document.activeElement, sel.triggerEl)
  assert.equal(hiddenWhenFocusLeftInput, false, 'focus returned to the trigger while the popup was still shown')
  assert.equal(activeInsideOnClose, sel.triggerEl, 'focus is back on the trigger before onClose runs')
})

test('destroy() while focused fires no onBlur, and a later focusout reaches no listener', () => {
  const { el } = mount()
  const { sel, log } = logged(el, { filterable: true })
  sel.triggerEl.focus()
  sel.open()
  sel.destroy()
  assert.deepEqual(log, ['focus', 'open', 'close'])
  sel.rootEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
  sel.rootEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))
  assert.deepEqual(log, ['focus', 'open', 'close'])
})

test('setDisabled(true) while open and focused closes the popup without onBlur', () => {
  const { el } = mount()
  const { sel, log } = logged(el, { filterable: true })
  sel.triggerEl.focus()
  sel.open()
  sel.setDisabled(true)
  assert.deepEqual(log, ['focus', 'open', 'close'])
  assert.equal(document.activeElement, sel.triggerEl, 'focus returned to the trigger, inside the widget')
})

test('a programmatic triggerEl.focus() and the label click both fire onFocus', () => {
  const { el, label, outside } = mount()
  const { sel, log } = logged(el, { labelEl: label })
  outside.focus()
  label.click()
  assert.equal(document.activeElement, sel.triggerEl)
  assert.deepEqual(log, ['focus'])
  outside.focus()
  sel.triggerEl.focus()
  assert.deepEqual(log, ['focus', 'blur:closed', 'focus'])
})

test('without onFocus no focusin listener is attached; the focusout listener always is, since it closes the popup', () => {
  const types = (settings: { onFocus?: () => void }): string[] => {
    const { el } = mount()
    const seen: string[] = []
    const original = el.addEventListener.bind(el)
    el.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void => {
      seen.push(type)
      original(type, listener, options)
    }) as typeof el.addEventListener
    new LLSelectSingle<string>(el, { ariaLabel: 'x', ...settings })
    return seen
  }
  const bare = types({})
  assert.ok(bare.includes('focusout'))
  assert.ok(!bare.includes('focusin'))
  const withFocus = types({ onFocus: () => {} })
  assert.ok(withFocus.includes('focusin'))
})

test('focus leaving still closes the popup when neither listener is set', () => {
  const { el, outside } = mount()
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', filterable: true })
  sel.setItems(['a'])
  sel.triggerEl.focus()
  sel.open()
  outside.focus()
  assert.equal(sel.isOpened(), false)
})

test('outsideClickBehavior block: an outside press while open closes without onBlur, since the press never moves focus', () => {
  const { el, outside } = mount()
  const log: string[] = []
  const sel = new LLSelectSingle<string>(el, {
    ariaLabel: 'x',
    filterable: true,
    outsideClickBehavior: 'block',
    onFocus: () => { log.push('focus') },
    onBlur: () => { log.push('blur') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a'])
  sel.triggerEl.focus()
  sel.open()
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  outside.dispatchEvent(md)
  assert.equal(md.defaultPrevented, true, 'the outside mousedown is default-prevented: focus stays')
  outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  assert.deepEqual(log, ['focus', 'close'])
  assert.equal(document.activeElement, sel.triggerEl, 'close() returned focus from the filter input to the trigger')
})

test('a mouse clear on an unfocused widget focuses the trigger and reports onFocus; on a focused open widget it keeps focus on the host and reports nothing', () => {
  const { el } = mount()
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(el, {
    ariaLabel: 'x',
    clearable: true,
    filterable: true,
    onFocus: () => { log.push('focus') },
    onBlur: () => { log.push('blur') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  const clearButton = (): HTMLButtonElement => sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  clearButton().dispatchEvent(md)
  assert.equal(md.defaultPrevented, true, 'the mousedown moves no focus')
  clearButton().click()
  assert.deepEqual(sel.getChosenItems(), [], 'the click clears')
  assert.equal(document.activeElement, sel.triggerEl, 'the click focused the trigger, as a click inside a native control does')
  assert.deepEqual(log, ['focus'])
  sel.setChosenItems(['a'])
  sel.open() // focus moves to the filter input
  const input = sel.popupEl.querySelector('input')!
  assert.equal(document.activeElement, input)
  clearButton().click()
  assert.deepEqual(sel.getChosenItems(), [])
  assert.equal(sel.isOpened(), true)
  assert.equal(document.activeElement, input, 'the host keeps focus')
  assert.deepEqual(log, ['focus'])
})

test('tags: a mousedown on a chip remove button is default-prevented; the removal keeps the popup open, the host focused, and reports no blur', () => {
  const { el } = mount()
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(el, {
    ariaLabel: 'x',
    triggerDisplay: 'tags',
    onBlur: () => { log.push('blur') },
    onClose: () => { log.push('close') },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.triggerEl.focus()
  sel.open()
  const btn = sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  btn.dispatchEvent(md)
  assert.equal(md.defaultPrevented, true)
  btn.click()
  assert.deepEqual(sel.getChosenItems(), [], 'the click still removes the item')
  assert.equal(sel.isOpened(), true)
  assert.equal(document.activeElement, sel.triggerEl)
  assert.deepEqual(log, [])
})

test('an onFocus listener that disables the control during a clear click stops the clear', () => {
  const { el } = mount()
  const sel = new LLSelectMultiple<string>(el, { ariaLabel: 'x', clearable: true, onFocus: () => { sel.setDisabled(true) } })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), ['a'], 'the control the listener disabled kept its value')
  assert.equal(document.activeElement, sel.triggerEl)
})

test('an onFocus listener that opens the popup or loads items does not cancel the clear', () => {
  const { el } = mount()
  const sel = new LLSelectMultiple<string>(el, { ariaLabel: 'x', clearable: true, onFocus: () => { sel.open(); sel.setItems(['a', 'b', 'c']) } })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), [], 'the clear still means empty')
  assert.equal(sel.isOpened(), true)
})

test('an onFocus listener that destroys the widget stops the clear and the chip removal', () => {
  const { el } = mount()
  const changes: string[] = []
  const sel = new LLSelectMultiple<string>(el, {
    ariaLabel: 'x',
    clearable: true,
    triggerDisplay: 'tags',
    onFocus: () => { sel.destroy() },
    onChange: () => { changes.push('change') },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a']) // reports one change: the setup
  changes.length = 0
  const clearButton = sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!
  const removeButton = sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  clearButton.click()
  assert.deepEqual(changes, [])
  assert.deepEqual(sel.getChosenItems(), ['a'])
  removeButton.click()
  assert.deepEqual(changes, [])
  assert.deepEqual(sel.getChosenItems(), ['a'])
})

test('tags: an onFocus listener that reloads the chosen item as a disabled object makes the x do nothing', () => {
  const { el } = mount()
  type Item = { id: number; name: string; bad: boolean }
  const sel = new LLSelectMultiple<Item>(el, {
    ariaLabel: 'x',
    triggerDisplay: 'tags',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (i) => i.name,
    itemDisabledFn: (i) => i.bad,
    onFocus: () => { sel.setItems([{ id: 1, name: 'a', bad: true }, { id: 2, name: 'b', bad: false }]) },
  })
  sel.setItems([{ id: 1, name: 'a', bad: false }, { id: 2, name: 'b', bad: false }])
  sel.setChosenItems([{ id: 1, name: 'a', bad: false }])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems().map(i => i.id), [1], 'the reloaded, now disabled, item stays chosen')
})

test('tags: the x of a chip whose item is itself undefined still removes it', () => {
  const { el } = mount()
  const sel = new LLSelectMultiple<string | undefined>(el, { ariaLabel: 'x', triggerDisplay: 'tags', itemToStringFn: (i) => i ?? 'nothing' })
  sel.setItems([undefined, 'b'])
  sel.setChosenItems([undefined])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), [])
})

test('tags: an onFocus listener that removed the item leaves the x with nothing to do; it never adds the item back', () => {
  const { el } = mount()
  const sel = new LLSelectMultiple<string>(el, { ariaLabel: 'x', triggerDisplay: 'tags', onFocus: () => { sel.setChosenItems([]) } })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), [])
})

test('tags: a chip removal on an unfocused widget focuses the trigger and reports onFocus', () => {
  const { el } = mount()
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(el, { ariaLabel: 'x', triggerDisplay: 'tags', onFocus: () => { log.push('focus') } })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  assert.deepEqual(sel.getChosenItems(), [])
  assert.equal(document.activeElement, sel.triggerEl)
  assert.deepEqual(log, ['focus'])
})

test('open() called from a trigger focus handler during close() is refused, and a later open() works', () => {
  const { el } = mount()
  const log: string[] = []
  const sel = new LLSelectSingle<string>(el, { ariaLabel: 'x', filterable: true, onOpen: () => { log.push('open') }, onClose: () => { log.push('close') } })
  sel.setItems(['a'])
  sel.triggerEl.addEventListener('focus', () => { sel.open() }) // an app that opens on focus
  sel.triggerEl.focus()
  assert.deepEqual(log, ['open'])
  sel.close() // the filter input holds focus: close() returns it to the trigger, which runs the handler
  assert.deepEqual(log, ['open', 'close'])
  assert.equal(sel.isOpened(), false)
  assert.equal(sel.popupEl.hidden, true)
  assert.equal(sel.triggerEl.getAttribute('aria-expanded'), 'false')
  sel.open()
  assert.deepEqual(log, ['open', 'close', 'open'])
  assert.equal(sel.isOpened(), true)
})
