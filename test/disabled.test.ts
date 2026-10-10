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

function fireKey(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

function focusedText(sel: { popupListEl: HTMLElement; classIdMap: { popupListRowFocusedClass: string } }): string | null | undefined {
  return sel.popupListEl.querySelector(`.${sel.classIdMap.popupListRowFocusedClass}`)?.textContent
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

test('itemDisabledFn marks the option aria-disabled + popup-list-row-disabled class', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const [a, b, c] = options(sel)
  assert.equal(b!.getAttribute('aria-disabled'), 'true')
  assert.ok(b!.classList.contains(sel.classIdMap.popupListRowDisabledClass))
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
  assert.equal(sel.triggerEl.textContent?.trim(), '1 / 3 selected', 'the count summary counts the disabled chosen item')
  sel.chooseAll() // preserves disabled-chosen 'b', adds enabled a, c
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
})

test('single: an already-chosen item that becomes disabled stays chosen and the trigger keeps showing it', () => {
  let disabled = false
  const sel = new LLSelectSingle<string>(mount(), { itemDisabledFn: i => disabled && i === 'b' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItem('b')
  disabled = true
  sel.rerender()
  assert.equal(sel.getChosenItem(), 'b')
  assert.equal(sel.triggerEl.textContent?.trim(), 'b')
  sel.open()
  const row = options(sel).find((o) => o.textContent === 'b')
  assert.ok(row)
  assert.equal(row.getAttribute('aria-selected'), 'true')
  assert.equal(row.getAttribute('aria-disabled'), 'true')
  row.click()
  assert.equal(sel.getChosenItem(), 'b', "the chosen item is still 'b'")
  assert.equal(sel.popupEl.hidden, false, 'the click was not handled as an activation, which would have closed the popup')
})

test('the clear button drops a disabled chosen item, in both classes', () => {
  let disabled = false
  const single = new LLSelectSingle<string>(mount(), { clearable: true, itemDisabledFn: i => disabled && i === 'b' })
  single.setItems(['a', 'b', 'c'])
  single.setChosenItem('b')
  disabled = true
  single.rerender()
  assert.equal(single.getChosenItem(), 'b', 'the disabled item is chosen before the click')
  single.open()
  assert.equal(options(single).find((o) => o.textContent === 'b')?.getAttribute('aria-disabled'), 'true', 'the chosen item is disabled at click time')
  single.close()
  single.triggerEl.querySelector<HTMLElement>(`.${single.classIdMap.triggerClearButtonClass}`)!.click()
  assert.equal(single.getChosenItem(), undefined)
  const multiple = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', clearable: true, itemDisabledFn: i => disabled && i === 'b' })
  multiple.setItems(['a', 'b', 'c'])
  multiple.setChosenItems(['a', 'b'])
  multiple.rerender()
  assert.deepEqual([...multiple.getChosenItems()], ['a', 'b'], 'the disabled item is chosen before the click')
  multiple.open()
  assert.equal(options(multiple).find((o) => o.textContent === 'b')?.getAttribute('aria-disabled'), 'true', 'the chosen item is disabled at click time')
  multiple.close()
  multiple.triggerEl.querySelector<HTMLElement>(`.${multiple.classIdMap.triggerClearButtonClass}`)!.click()
  assert.deepEqual([...multiple.getChosenItems()], [])
})

test('setItems() drops a disabled chosen item that the new list no longer contains, in both classes', () => {
  let disabled = false
  const changes: string[] = []
  const single = new LLSelectSingle<string>(mount(), { placeholder: 'Pick one', itemDisabledFn: i => disabled && i === 'b', onChange: () => { changes.push('single') } })
  single.setItems(['a', 'b', 'c'])
  single.setChosenItem('b')
  disabled = true
  single.rerender()
  single.open()
  assert.equal(options(single).find((o) => o.textContent === 'b')?.getAttribute('aria-disabled'), 'true', 'the chosen item is disabled before the list changes')
  single.close()
  assert.equal(single.getChosenItem(), 'b')
  assert.deepEqual(changes, ['single'], 'disabling and rerendering fired nothing')
  single.setItems(['a', 'c'])
  assert.equal(single.getChosenItem(), undefined)
  assert.equal(single.triggerEl.textContent?.trim(), 'Pick one', 'the trigger shows the placeholder, where a native single select would pick its first enabled option')
  assert.deepEqual(changes, ['single', 'single'], 'the removal fired onChange once')
  disabled = false
  const multiple = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', itemDisabledFn: i => disabled && i === 'b', onChange: () => { changes.push('multiple') } })
  multiple.setItems(['a', 'b', 'c'])
  multiple.setChosenItems(['a', 'b'])
  disabled = true
  multiple.rerender()
  multiple.open()
  assert.equal(options(multiple).find((o) => o.textContent === 'b')?.getAttribute('aria-disabled'), 'true', 'the chosen item is disabled before the list changes')
  multiple.close()
  assert.deepEqual([...multiple.getChosenItems()], ['a', 'b'])
  assert.deepEqual(changes, ['single', 'single', 'multiple'], 'disabling and rerendering fired nothing')
  multiple.setItems(['a', 'c'])
  assert.deepEqual([...multiple.getChosenItems()], ['a'])
  assert.deepEqual(changes, ['single', 'single', 'multiple', 'multiple'], 'the removal fired onChange once')
})

test('Enter or Space on the focused clear button goes to the trigger: the keydown is cancelled, the popup opens, the selection stays', () => {
  const sel = new LLSelectSingle<string>(mount(), { clearable: true })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItem('b')
  for (const key of ['Enter', ' ']) {
    const button = sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!
    button.focus()
    assert.equal(document.activeElement, button, 'the button holds focus')
    const ev = fireKey(button, key)
    assert.equal(ev.defaultPrevented, true, 'the trigger cancelled the keydown, so a browser synthesizes no click')
    assert.equal(sel.getChosenItem(), 'b', 'the key did not clear')
    assert.equal(sel.isOpened(), true, 'the trigger handled the key as Open')
    sel.close()
  }
  // a disabled control: the trigger ignores the key without cancelling it (a browser then synthesizes the button's click, which the button ignores)
  sel.setDisabled(true)
  const button = sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!
  button.focus()
  assert.equal(document.activeElement, button, 'the button holds focus on the disabled control')
  const ev = fireKey(button, 'Enter')
  assert.equal(ev.defaultPrevented, false, 'a disabled control does not cancel the keydown')
  assert.equal(sel.getChosenItem(), 'b')
  assert.equal(sel.isOpened(), false)
})

test('a chosen item outside the current item list: chooseAll(), and toggleAll() in its choose branch, drop it, disabled or not; unchooseAll(), and toggleAll() in its unchoose branch, keep it when disabled and clear it when enabled', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'z']) // 'z' is not in the list; setChosenItems accepts it
  assert.deepEqual([...sel.getChosenItems()], ['a', 'z'])
  sel.chooseAll()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'], 'rebuilt from the list: z is gone')
  const disabledZ = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', itemDisabledFn: i => i === 'z' })
  disabledZ.setItems(['a', 'b'])
  disabledZ.setChosenItems(['a', 'z']) // 'z' is disabled and outside the list
  assert.deepEqual([...disabledZ.getChosenItems()], ['a', 'z'])
  disabledZ.unchooseAll()
  assert.deepEqual([...disabledZ.getChosenItems()], ['z'], 'unchooseAll() treats the unlisted item as disabled and keeps it, listed or not')
  disabledZ.setChosenItems(['a', 'y', 'z']) // 'y' is enabled and outside the list
  assert.deepEqual([...disabledZ.getChosenItems()], ['a', 'y', 'z'])
  disabledZ.unchooseAll()
  assert.deepEqual([...disabledZ.getChosenItems()], ['z'], 'unchooseAll() clears enabled chosen items, listed or not')
  disabledZ.setChosenItems(['a', 'z'])
  assert.deepEqual([...disabledZ.getChosenItems()], ['a', 'z'], 'the disabled unlisted item is chosen again')
  disabledZ.chooseAll()
  assert.deepEqual([...disabledZ.getChosenItems()], ['a', 'b'], 'a disabled unlisted item is dropped too')
  const noEnabled = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', itemDisabledFn: () => true })
  noEnabled.setItems(['a'])
  noEnabled.setChosenItems(['z'])
  assert.deepEqual([...noEnabled.getChosenItems()], ['z'])
  noEnabled.toggleAll()
  assert.deepEqual([...noEnabled.getChosenItems()], [], 'with no enabled item in the list, toggleAll() calls chooseAll(), which drops z')
  const partly = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  partly.setItems(['a', 'b'])
  partly.setChosenItems(['a', 'y']) // 'y' is enabled and outside the list; 'b' is enabled and unchosen
  assert.deepEqual([...partly.getChosenItems()], ['a', 'y'])
  partly.toggleAll()
  assert.deepEqual([...partly.getChosenItems()], ['a', 'b'], 'with an enabled item unchosen, toggleAll() calls chooseAll(), which drops the enabled unlisted y')
  const allChosen = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', itemDisabledFn: i => i === 'z' })
  allChosen.setItems(['a', 'b'])
  allChosen.setChosenItems(['a', 'b', 'y', 'z']) // every enabled listed item chosen; 'y' enabled and 'z' disabled, both outside the list
  assert.deepEqual([...allChosen.getChosenItems()], ['a', 'b', 'y', 'z'])
  allChosen.toggleAll()
  assert.deepEqual([...allChosen.getChosenItems()], ['z'], 'with every enabled listed item chosen, toggleAll() calls unchooseAll(): the enabled unlisted y is cleared, the disabled unlisted z stays')
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

test('disabled: the clear button and tag remove buttons do nothing', () => {
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
  const focusedText = () => sel.popupListEl.querySelector(`.${sel.classIdMap.popupListRowFocusedClass}`)?.textContent
  assert.equal(focusedText(), 'b', 'precondition: focus sits on b')
  disabled = true
  sel.rerender()
  assert.equal(focusedText(), 'a', 'focus must seek backward off the now-disabled row')
  const activeId = sel.triggerEl.getAttribute('aria-activedescendant')
  assert.equal(activeId && document.getElementById(activeId)?.textContent, 'a', 'aria-activedescendant must follow')
})

// --- item-disabled + tags: the chip x is inert and marked --------------------

function tagRemoveButtons(sel: LLSelectMultiple<string>): HTMLElement[] {
  return Array.from(sel.triggerEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`))
}

test('item-disabled: the tag x does not remove the item, but an enabled chip still does', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags', itemDisabledFn: i => i === 'a',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b']) // 'a' is chosen AND disabled -> its chip must be inert
  const [xa, xb] = tagRemoveButtons(sel)
  xa!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'], 'a disabled item must not be removable via its chip x')
  xb!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a'], 'an enabled chip x still removes')
})

test('group-disabled: the tag x does not remove a chosen item in a disabled group', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags',
    itemToGroupKeyFn: i => (i === 'a' ? 'g' : null),
    groupDisabledFn: k => k === 'g',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  tagRemoveButtons(sel)[0]!.click() // 'a' sits in the disabled group
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'], 'a group-disabled item must not be removable via its chip x')
})

test('item-disabled: the chip and its x carry aria-disabled + the disabled class', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags', itemDisabledFn: i => i === 'a',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  const tags = Array.from(sel.triggerEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagClass}`))
  assert.equal(tags[0]!.getAttribute('aria-disabled'), 'true', 'the disabled chip is marked')
  assert.ok(tags[0]!.classList.contains(sel.classIdMap.tagDisabledClass), 'the disabled chip carries the class')
  assert.equal(tags[1]!.hasAttribute('aria-disabled'), false, 'the enabled chip is not marked')
  assert.equal(tagRemoveButtons(sel)[0]!.getAttribute('aria-disabled'), 'true', 'the disabled chip x is marked')
})

test('item-disabled flips on rerender: a became-disabled chip x turns inert, and back', () => {
  let disabled = false
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags', itemDisabledFn: i => disabled && i === 'a',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  disabled = true
  sel.rerender()
  tagRemoveButtons(sel)[0]!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'], 'the became-disabled chip x is now inert')
  disabled = false
  sel.rerender()
  tagRemoveButtons(sel)[0]!.click()
  assert.deepEqual([...sel.getChosenItems()], ['b'], 'the re-enabled chip x removes again')
})

test('group-disabled: the chip and its x carry aria-disabled + the disabled class', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags',
    itemToGroupKeyFn: i => (i === 'a' ? 'g' : null),
    groupDisabledFn: k => k === 'g',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  const tags = Array.from(sel.triggerEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagClass}`))
  assert.equal(tags[0]!.getAttribute('aria-disabled'), 'true', 'the group-disabled chip is marked')
  assert.ok(tags[0]!.classList.contains(sel.classIdMap.tagDisabledClass), 'the group-disabled chip carries the class')
  assert.equal(tagRemoveButtons(sel)[0]!.getAttribute('aria-disabled'), 'true', 'the group-disabled chip x is marked')
})

test('toggleItem stays disabled-blind: the programmatic channel still removes a disabled chosen item', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags', itemDisabledFn: i => i === 'a',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  sel.toggleItem('a') // programmatic call, not a user gesture - native <select> parity: no disabled restriction
  assert.deepEqual([...sel.getChosenItems()], ['b'], 'toggleItem is disabled-blind; only USER re-toggling is blocked')
})

// jsdom .click() dispatches straight to the button, so this pins the stopPropagation
// contract, NOT the CSS hit-testing (pointer-events must NOT be `none` - a real
// coordinate click needs a browser; tracked in TODO.md "manual verification").
test('item-disabled: clicking the chip x never opens the popup and never removes', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x', triggerDisplay: 'tags', itemDisabledFn: i => i === 'a',
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(sel.isOpened(), false, 'precondition: closed')
  tagRemoveButtons(sel)[0]!.click()
  assert.equal(sel.isOpened(), false, 'a disabled chip x must not open the popup')
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'], 'and must not remove the item')
})
