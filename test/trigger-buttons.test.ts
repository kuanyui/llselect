import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectCloseReason } from '../src/base.js'

// The trigger buttons strip: the clear button and the tag chips sit beside
// the trigger, never inside it. See docs/llm/A11Y.md "Trigger buttons strip".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div><button id="after">after</button></body></html>')
  return document.getElementById('mount')!
}

function fireKey(target: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(ev)
  return ev
}

function buttons(sel: { triggerButtonsEl: HTMLElement | null }): HTMLButtonElement[] {
  return Array.from(sel.triggerButtonsEl!.querySelectorAll('button'))
}

function tabStops(sel: { triggerButtonsEl: HTMLElement | null }): string[] {
  return buttons(sel).filter((b) => b.tabIndex === 0).map((b) => b.getAttribute('aria-label')!)
}

function tagsSelect(chosen: string[], settings: ConstructorParameters<typeof LLSelectMultiple<string>>[1] = {}): LLSelectMultiple<string> {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'Tags', triggerDisplay: 'tags', clearable: true, ...settings })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(chosen)
  return sel
}

test('the strip exists only for clearable or tags mode, between the trigger and the arrow', () => {
  const plain = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  assert.equal(plain.triggerButtonsEl, null)
  const clearable = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', clearable: true })
  const tags = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', triggerDisplay: 'tags' })
  for (const sel of [clearable, tags]) {
    const children = Array.from(sel.triggerWrapperEl.children)
    assert.equal(children.length, 3)
    assert.equal(children[0], sel.triggerEl)
    assert.equal(children[1], sel.triggerButtonsEl)
    assert.ok(children[2]!.classList.contains(sel.classIdMap.triggerArrowClass))
    assert.ok(sel.triggerButtonsEl!.classList.contains(sel.classIdMap.triggerButtonsClass))
  }
})

test('tags mode: the strip is a toolbar named by the pack; a lone clear button gets no role', () => {
  const tags = tagsSelect(['a'])
  assert.equal(tags.triggerButtonsEl!.getAttribute('role'), 'toolbar')
  assert.equal(tags.triggerButtonsEl!.getAttribute('aria-label'), 'Selection actions')
  tags.setUiTranslationPack({ triggerButtonsAriaLabel: 'Actions' })
  assert.equal(tags.triggerButtonsEl!.getAttribute('aria-label'), 'Actions')
  const single = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', clearable: true })
  assert.equal(single.triggerButtonsEl!.getAttribute('role'), null)
  assert.equal(single.triggerButtonsEl!.getAttribute('aria-label'), null)
  const count = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', clearable: true })
  assert.equal(count.triggerButtonsEl!.getAttribute('role'), null)
})

test('the chips and the clear button sit in the strip, never in the trigger; chip content is hidden from assistive technology', () => {
  const sel = tagsSelect(['a', 'b'], { createTagContentElFn: (item) => (item === 'b' ? Object.assign(document.createElement('b'), { textContent: item }) : null) })
  assert.equal(sel.triggerEl.querySelectorAll('button').length, 0)
  assert.deepEqual(buttons(sel).map((b) => b.getAttribute('aria-label')), ['Remove a', 'Remove b', 'Clear selection'])
  const chips = Array.from(sel.triggerButtonsEl!.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagClass}`))
  assert.equal(chips[0]!.querySelector(`.${sel.classIdMap.tagTextClass}`)!.getAttribute('aria-hidden'), 'true')
  assert.equal(chips[1]!.querySelector('b')!.getAttribute('aria-hidden'), 'true', 'custom chip content too')
  assert.equal(sel.triggerContentEl.textContent, '', 'the content slot stays empty while chips show')
})

test('the strip is hidden while nothing is chosen, and none of its buttons is a Tab stop then', () => {
  const sel = tagsSelect([])
  assert.equal(sel.triggerButtonsEl!.hidden, true)
  assert.deepEqual(tabStops(sel), [])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerButtonsEl!.hidden, false)
  assert.deepEqual(tabStops(sel), ['Remove a'])
  sel.setChosenItems([])
  assert.equal(sel.triggerButtonsEl!.hidden, true)
  const single = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', clearable: true })
  single.setItems(['a'])
  assert.equal(single.triggerButtonsEl!.hidden, true)
  single.setChosenItem('a')
  assert.equal(single.triggerButtonsEl!.hidden, false)
})

test('one button is the Tab stop; Left, Right, Home and End move focus and the stop, clamped at both ends', () => {
  const sel = tagsSelect(['a', 'b', 'c'])
  assert.deepEqual(tabStops(sel), ['Remove a'])
  const [ra, rb, , clear] = buttons(sel)
  ra!.focus()
  assert.equal(fireKey(ra!, 'ArrowRight').defaultPrevented, true)
  assert.equal(document.activeElement, rb)
  assert.deepEqual(tabStops(sel), ['Remove b'])
  fireKey(rb!, 'End')
  assert.equal(document.activeElement, clear)
  fireKey(clear!, 'ArrowRight')
  assert.equal(document.activeElement, clear, 'clamps at the end')
  fireKey(clear!, 'Home')
  assert.equal(document.activeElement, ra)
  fireKey(ra!, 'ArrowLeft')
  assert.equal(document.activeElement, ra, 'clamps at the start')
  assert.deepEqual(tabStops(sel), ['Remove a'])
})

test('in right-to-left text, Left and Right swap', () => {
  const sel = tagsSelect(['a', 'b'])
  sel.triggerButtonsEl!.style.direction = 'rtl'
  const [ra, rb] = buttons(sel)
  ra!.focus()
  fireKey(ra!, 'ArrowLeft')
  assert.equal(document.activeElement, rb)
  fireKey(rb!, 'ArrowRight')
  assert.equal(document.activeElement, ra)
})

test('arrow keys with Alt, Ctrl or Meta stay with the browser', () => {
  const sel = tagsSelect(['a', 'b'])
  const [ra] = buttons(sel)
  ra!.focus()
  for (const mod of ['altKey', 'ctrlKey', 'metaKey'] as const) {
    assert.equal(fireKey(ra!, 'ArrowRight', { [mod]: true }).defaultPrevented, false)
    assert.equal(document.activeElement, ra)
  }
})

test('the first button that is not aria-disabled is the initial Tab stop', () => {
  const sel = tagsSelect(['a', 'b'], { itemDisabledFn: (item) => item === 'a' })
  assert.deepEqual(tabStops(sel), ['Remove b'])
})

test('while the select component is disabled, no button of the strip is a Tab stop and the arrow keys do nothing', () => {
  const sel = tagsSelect(['a', 'b'])
  sel.setDisabled(true)
  assert.deepEqual(tabStops(sel), [])
  const [ra] = buttons(sel)
  ra!.focus()
  assert.equal(fireKey(ra!, 'ArrowRight').defaultPrevented, false)
  assert.equal(document.activeElement, ra)
  sel.setDisabled(false)
  assert.deepEqual(tabStops(sel), ['Remove a'], 'the button holding focus is the stop')
})

test('focus entering the strip closes an open popup with the reason blur, and reports no onBlur', () => {
  const closes: LLSelectCloseReason[] = []
  let blurs = 0
  const sel = tagsSelect(['a'], { onClose: (meta) => { closes.push(meta.reason) }, onBlur: () => { blurs++ } })
  sel.triggerEl.focus()
  sel.open()
  buttons(sel)[0]!.focus()
  assert.equal(sel.isOpened(), false)
  assert.deepEqual(closes, ['blur'])
  assert.equal(blurs, 0, 'focus stays inside the select component')
  assert.equal(document.activeElement, buttons(sel)[0], 'the close does not move focus back to the trigger')
})

test('removing a chip by keyboard focuses the next chip\'s button, else the previous one, else the trigger', () => {
  const sel = tagsSelect(['a', 'b', 'c'], { clearable: false })
  buttons(sel)[1]!.focus() // Remove b
  buttons(sel)[1]!.click() // what Enter or Space does
  assert.deepEqual([...sel.getChosenItems()], ['a', 'c'])
  assert.equal(document.activeElement?.getAttribute('aria-label'), 'Remove c', 'the next chip')
  assert.deepEqual(tabStops(sel), ['Remove c'])
  buttons(sel)[1]!.click()
  assert.equal(document.activeElement?.getAttribute('aria-label'), 'Remove a', 'no next chip: the previous one')
  buttons(sel)[0]!.click()
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(document.activeElement, sel.triggerEl, 'no chip left: the trigger')
  assert.equal(sel.triggerButtonsEl!.hidden, true)
})

test('a vetoed removal by keyboard leaves focus on the button', () => {
  const sel = tagsSelect(['a', 'b'], { onBeforeChange: (_next, _previous, event) => { event.preventDefault() } })
  const [ra] = buttons(sel)
  ra!.focus()
  ra!.click()
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b'])
  assert.equal(document.activeElement, ra)
})

test('a removal by pointer leaves focus where it was', () => {
  const sel = tagsSelect(['a', 'b'])
  sel.triggerEl.focus()
  const ra = buttons(sel)[0]!
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  ra.dispatchEvent(down)
  assert.equal(down.defaultPrevented, true)
  ra.click()
  assert.deepEqual([...sel.getChosenItems()], ['b'])
  assert.equal(document.activeElement, sel.triggerEl)
})

test('a clear by keyboard returns focus to the trigger', () => {
  const sel = tagsSelect(['a', 'b'])
  const clear = buttons(sel).at(-1)!
  clear.focus()
  clear.click()
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(document.activeElement, sel.triggerEl)
})

test('a programmatic clear while a strip button holds focus moves focus to the trigger before the strip hides', () => {
  const sel = tagsSelect(['a'])
  const clear = buttons(sel).at(-1)!
  clear.focus()
  sel.setChosenItems([])
  assert.equal(sel.triggerButtonsEl!.hidden, true)
  assert.equal(document.activeElement, sel.triggerEl)
})

test('a press anywhere in the wrapper toggles the popup; a mousedown outside the trigger focuses the trigger', () => {
  const sel = tagsSelect(['a'])
  const chip = sel.triggerButtonsEl!.querySelector<HTMLElement>(`.${sel.classIdMap.tagTextClass}`)!
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  chip.dispatchEvent(down)
  assert.equal(down.defaultPrevented, true, 'the box itself takes no focus, so the press would drop focus to <body>')
  assert.equal(document.activeElement, sel.triggerEl)
  chip.click()
  assert.equal(sel.isOpened(), true)
  sel.triggerWrapperEl.click()
  assert.equal(sel.isOpened(), false)
  const onTrigger = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  sel.triggerEl.dispatchEvent(onTrigger)
  assert.equal(onTrigger.defaultPrevented, false, 'a press on the trigger takes focus natively')
})

test('the trigger keydown handler never sees keys from the strip', () => {
  const sel = tagsSelect(['a'])
  const ra = buttons(sel)[0]!
  ra.focus()
  assert.equal(fireKey(ra, 'ArrowDown').defaultPrevented, false)
  assert.equal(sel.isOpened(), false)
})

test('while the popup is open, no strip button is a Tab stop, so Tab from the open popup reaches its slot controls; the stop comes back on close', () => {
  for (const filterable of [false, true]) {
    const footerButton = document.createElement('button')
    const sel = new LLSelectMultiple<string>(mount(), {
      ariaLabel: 'x', clearable: true, triggerDisplay: 'tags', filterable,
      createPopupFooterContentElFn: () => { footerButton.textContent = 'Footer'; return footerButton },
    })
    sel.setItems(['a', 'b'])
    sel.setChosenItems(['a'])
    buttons(sel)[1]!.focus() // the clear button becomes the remembered stop
    sel.triggerEl.focus()
    sel.open()
    assert.deepEqual(tabStops(sel), [], `filterable ${filterable}: no stop while open`)
    sel.close()
    assert.deepEqual(tabStops(sel), ['Clear selection'], `filterable ${filterable}: the remembered stop comes back`)
  }
})

test('filter active: focus entering the strip closes the popup, keeps focus where it went, and gives the trigger its Tab stop back', () => {
  const sel = tagsSelect(['a'], { filterable: true })
  sel.triggerEl.focus()
  sel.open()
  assert.equal(document.activeElement, sel.popupEl.querySelector('input'))
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '-1')
  const ra = buttons(sel)[0]!
  ra.focus() // script focus: the strip is no Tab stop while open
  assert.equal(sel.isOpened(), false)
  assert.equal(document.activeElement, ra)
  assert.equal(sel.triggerEl.getAttribute('tabindex'), '0')
  assert.deepEqual(tabStops(sel), ['Remove a'])
})

test('a setItems that keeps the chosen items leaves exactly one Tab stop in the strip', () => {
  const sel = tagsSelect(['a', 'b', 'c'])
  sel.setItems(['c', 'b', 'a'])
  assert.deepEqual([...sel.getChosenItems()], ['a', 'b', 'c'])
  assert.equal(buttons(sel).filter((b) => b.tabIndex === 0).length, 1)
})

test('focus on a focusable element inside a chip that is not its remove button moves to the trigger when the chips are rebuilt', () => {
  const sel = tagsSelect(['a', 'b'], {
    createTagContentElFn: (item) => Object.assign(document.createElement('span'), { textContent: item, tabIndex: -1 }),
  })
  const chipContent = sel.triggerButtonsEl!.querySelector<HTMLElement>(`.${sel.classIdMap.tagClass} span`)!
  chipContent.focus()
  assert.equal(document.activeElement, chipContent)
  sel.rerender()
  assert.equal(document.activeElement, sel.triggerEl)
})

test('an empty strip is hidden even while items are chosen: tags mode with custom trigger content and no clear button', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    triggerDisplay: 'tags',
    createTriggerContentElFn: () => Object.assign(document.createElement('i'), { textContent: 'custom' }),
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(sel.triggerButtonsEl!.childElementCount, 0)
  assert.equal(sel.triggerButtonsEl!.hidden, true)
})
