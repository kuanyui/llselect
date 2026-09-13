import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { LLSelectSingle } from '../src/single.js'
import type { LLSelectPopupListActionRow, LLSelectChangeMeta } from '../src/base.js'

// Action rows: app commands rendered by the library as role="option" rows before
// / after the items, inside the arrow-key ring. Contract: A11Y.md "Action rows";
// design: DESIGN.md "Action rows".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function fireKey(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

type AnySel = LLSelectMultiple<string> | LLSelectSingle<string>

function activeText(sel: AnySel, host: HTMLElement = sel.triggerEl): string | null {
  const id = host.getAttribute('aria-activedescendant')
  return id === null ? null : document.getElementById(id)!.textContent
}

function optionTexts(sel: AnySel): string[] {
  return [...sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')].map(el => el.textContent ?? '')
}

function row(text: string, extra: Partial<LLSelectPopupListActionRow> = {}): LLSelectPopupListActionRow & { calls: number } {
  const r = { calls: 0, textFn: () => text, onActivate: () => { r.calls += 1 }, ...extra }
  return r
}

test('rows render before / after the items in array order, as plain option rows', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    chooseAllRow: true,
    popupListActionRowsBeforeItems: [row('B0'), row('B1')],
    popupListActionRowsAfterItems: [row('A0')],
  })
  sel.setItems(['a', 'b'])
  sel.open()
  assert.deepEqual(optionTexts(sel), ['Select all (0 of 2)', 'B0', 'B1', 'a', 'b', 'A0'])
  const m = sel.classIdMap
  const b0 = sel.popupListEl.querySelector(`#${m.popupListId}-action-row-before-items0`) as HTMLElement
  const a0 = sel.popupListEl.querySelector(`#${m.popupListId}-action-row-after-items0`) as HTMLElement
  assert.ok(b0 && a0)
  for (const el of [b0, a0]) {
    assert.equal(el.getAttribute('role'), 'option')
    assert.ok(el.classList.contains(m.itemClass))
    assert.ok(el.classList.contains(m.popupListActionRowClass))
    assert.equal(el.getAttribute('aria-selected'), null) // a command has no selected state
    assert.equal(el.getAttribute('aria-label'), null) // plain text: no aria-label needed
    assert.equal(el.getAttribute('tabindex'), null)
  }
  assert.equal(m.popupListActionRowClass, 'llselect-popup-list-action-row')
})

test('the arrays are copied at construction; later edits to the caller array do nothing', () => {
  const before = [row('B0')]
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsBeforeItems: before })
  before.push(row('B1'))
  sel.setItems(['a'])
  sel.open()
  assert.deepEqual(optionTexts(sel), ['B0', 'a'])
})

test('custom content fills the visuals; the accessible name stays textFn', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    popupListActionRowsAfterItems: [row('Restore defaults', {
      createContentElFn: () => { const el = document.createElement('b'); el.textContent = 'RESET'; return el },
    })],
  })
  sel.setItems(['a'])
  sel.open()
  const el = sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`) as HTMLElement
  assert.equal(el.getAttribute('aria-label'), 'Restore defaults')
  assert.equal(el.querySelector('b')?.textContent, 'RESET')
})

test('the ring: choose-all, rows before items, items, rows after items; Home / End / Page keys clamp across it', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    chooseAllRow: true,
    popupListActionRowsBeforeItems: [row('B0')],
    popupListActionRowsAfterItems: [row('A0'), row('A1')],
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(activeText(sel), 'Select all (0 of 3)') // opens on the choose-all row, never on an action row
  fireKey(sel.triggerEl, 'ArrowDown'); assert.equal(activeText(sel), 'B0')
  fireKey(sel.triggerEl, 'ArrowDown'); assert.equal(activeText(sel), 'a')
  fireKey(sel.triggerEl, 'End'); assert.equal(activeText(sel), 'A1')
  fireKey(sel.triggerEl, 'ArrowDown'); assert.equal(activeText(sel), 'A1') // clamps
  fireKey(sel.triggerEl, 'ArrowUp'); assert.equal(activeText(sel), 'A0')
  fireKey(sel.triggerEl, 'ArrowUp'); assert.equal(activeText(sel), 'c')
  fireKey(sel.triggerEl, 'Home'); assert.equal(activeText(sel), 'Select all (0 of 3)')
  fireKey(sel.triggerEl, 'PageDown'); assert.equal(activeText(sel), 'A1') // 10 down from position 0 clamps at the last entry
  fireKey(sel.triggerEl, 'PageUp'); assert.equal(activeText(sel), 'Select all (0 of 3)')
})

test('a disabled row is skipped by the arrow keys, is not clickable, and is re-checked at activation', () => {
  let a0Disabled = true
  const a0 = row('A0', { disabledFn: () => a0Disabled })
  const a1 = row('A1')
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsAfterItems: [a0, a1] })
  sel.setItems(['a'])
  sel.open()
  fireKey(sel.triggerEl, 'End'); assert.equal(activeText(sel), 'A1')
  fireKey(sel.triggerEl, 'ArrowUp'); assert.equal(activeText(sel), 'a') // A0 skipped
  const a0El = sel.popupListEl.querySelector(`#${sel.classIdMap.popupListId}-action-row-after-items0`) as HTMLElement
  assert.equal(a0El.getAttribute('aria-disabled'), 'true')
  assert.ok(a0El.classList.contains(sel.classIdMap.itemDisabledClass))
  a0El.click()
  assert.equal(a0.calls, 0)
  // Enabled at render, disabled by the time Enter arrives: the re-check wins.
  a0Disabled = false
  sel.rerender()
  fireKey(sel.triggerEl, 'End'); fireKey(sel.triggerEl, 'ArrowUp'); assert.equal(activeText(sel), 'A0')
  a0Disabled = true
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(a0.calls, 0)
})

test('Enter, Space (filter inactive) and click run onActivate as a user change; the library changes nothing else', () => {
  const metas: LLSelectChangeMeta[] = []
  let sel: LLSelectMultiple<string>
  const clear = row('Clear all', { onActivate: () => { sel.setChosenItems([]) } })
  sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    popupListActionRowsAfterItems: [clear],
    onChange: (_c, _p, m) => { metas.push(m) },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  metas.length = 0
  sel.open()
  fireKey(sel.triggerEl, 'End')
  fireKey(sel.triggerEl, 'Enter')
  assert.deepEqual([...sel.getChosenItems()], [])
  assert.equal(metas.at(-1)?.source, 'user')
  assert.equal(sel.isOpened(), true) // a row never closes the popup by itself
  assert.equal(activeText(sel), 'Clear all') // the rebuilt row keeps the active option
  const plain = row('noop')
  const s2 = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsBeforeItems: [plain] })
  s2.setItems(['a'])
  s2.open()
  fireKey(s2.triggerEl, 'ArrowUp') // from a onto the row
  fireKey(s2.triggerEl, ' ')
  assert.equal(plain.calls, 1)
  const rowEl = s2.popupListEl.querySelector(`.${s2.classIdMap.popupListActionRowClass}`) as HTMLElement
  rowEl.click()
  assert.equal(plain.calls, 2)
  assert.equal(activeText(s2), 'noop') // click = focus-then-activate
})

test('single: a row activates without closing; Enter on an item still picks and closes', () => {
  const add = row('Add new...')
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', popupListActionRowsBeforeItems: [add] })
  sel.setItems(['a'])
  sel.open()
  assert.equal(activeText(sel), 'a') // never opens on a row
  fireKey(sel.triggerEl, 'ArrowUp')
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(add.calls, 1)
  assert.equal(sel.isOpened(), true)
  assert.equal(sel.getChosenItem(), undefined)
  fireKey(sel.triggerEl, 'ArrowDown')
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(sel.getChosenItem(), 'a')
  assert.equal(sel.isOpened(), false)
})

test('textFn / disabledFn are live: rebuilt after every chosen change in both variants, once per row render', () => {
  let textCalls = 0
  let selM: LLSelectMultiple<string>
  selM = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    popupListActionRowsAfterItems: [{
      textFn: () => { textCalls += 1; return `${selM.getChosenItems().length} chosen` },
      disabledFn: () => selM.getChosenItems().length === 0,
      onActivate: () => {},
    }],
  })
  selM.setItems(['a', 'b'])
  selM.open()
  const rowText = (): string => selM.popupListEl.querySelector(`.${selM.classIdMap.popupListActionRowClass}`)!.textContent ?? ''
  const rowDisabled = (): boolean => selM.popupListEl.querySelector(`.${selM.classIdMap.popupListActionRowClass}`)!.getAttribute('aria-disabled') === 'true'
  assert.equal(rowText(), '0 chosen')
  assert.equal(rowDisabled(), true)
  assert.equal(textCalls, 1)
  selM.toggleItem('a') // the O(1) item path: the row is still refreshed
  assert.equal(rowText(), '1 chosen')
  assert.equal(rowDisabled(), false)
  assert.equal(textCalls, 2)
  selM.setChosenItems(['a', 'b'])
  assert.equal(rowText(), '2 chosen')
  selM.setItems(['a']) // the drop path: b leaves the chosen set, onChange fires, rows refresh
  assert.equal(rowText(), '1 chosen')
  let selS: LLSelectSingle<string>
  selS = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    popupListActionRowsBeforeItems: [{ textFn: () => `chosen: ${selS.getChosenItem() ?? 'none'}`, onActivate: () => {} }],
  })
  selS.setItems(['a', 'b'])
  selS.open()
  selS.setChosenItem('b')
  assert.equal(selS.popupListEl.querySelector(`.${selS.classIdMap.popupListActionRowClass}`)!.textContent, 'chosen: b')
})

test('a focused row rebuilt in place keeps the active option on the new element', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsAfterItems: [row('A0')] })
  sel.setItems(['a'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  const before = sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`)!
  sel.toggleItem('a')
  const after = sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`)!
  assert.notEqual(after, before)
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), after.id)
  assert.ok(after.classList.contains(sel.classIdMap.itemFocusedClass))
})

test('a focused row that disables itself keeps the active option; Enter then does nothing', () => {
  let done = false
  let activations = 0
  let sel: LLSelectMultiple<string>
  const restore = row('Restore', { disabledFn: () => done, onActivate: () => { activations += 1; done = true; sel.setChosenItems(['a']) } })
  sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsAfterItems: [restore] })
  sel.setItems(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(activations, 1)
  assert.equal(activeText(sel), 'Restore')
  const el = sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`)!
  assert.equal(el.getAttribute('aria-disabled'), 'true')
  fireKey(sel.triggerEl, 'Enter')
  assert.equal(activations, 1)
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(activeText(sel), 'b') // leaving the disabled row works
})

test('the vanish clamp never lands on an action row (hideChosenRows)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', hideChosenRows: true, popupListActionRowsAfterItems: [row('A0')] })
  sel.setItems(['a', 'b'])
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown') // b
  assert.equal(activeText(sel), 'b')
  fireKey(sel.triggerEl, 'Enter') // b leaves; index 1 is gone
  assert.equal(activeText(sel), 'a')
  fireKey(sel.triggerEl, 'Enter') // a leaves; no item is left
  assert.deepEqual(optionTexts(sel), ['A0'])
  assert.equal(activeText(sel), null)
  fireKey(sel.triggerEl, 'ArrowDown') // the row stays reachable
  assert.equal(activeText(sel), 'A0')
})

test('rows stay rendered and reachable while a filter query matches nothing; a keystroke never lands on a row', () => {
  const clear = row('Clear all')
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', filterable: true, popupListActionRowsBeforeItems: [clear] })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  assert.equal(activeText(sel, input), 'apple')
  input.value = 'zzz'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(optionTexts(sel), ['Clear all'])
  assert.equal(activeText(sel, input), null)
  const noResults = sel.popupEl.querySelector(`.${sel.classIdMap.popupListNoResultsClass}`) as HTMLElement
  assert.equal(noResults.hidden, false) // the item-only status shows beside the row
  fireKey(input, 'ArrowDown')
  assert.equal(activeText(sel, input), 'Clear all')
  fireKey(input, 'Enter')
  assert.equal(clear.calls, 1)
  input.value = 'an'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(activeText(sel, input), 'banana') // the first match, not the row
})

test('typeahead never matches an action row', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsBeforeItems: [row('salt')] })
  sel.setItems(['apple', 'salmon'])
  sel.open()
  fireKey(sel.triggerEl, 's')
  assert.equal(activeText(sel), 'salmon')
})

test('rows sit outside the groups; End reaches the row after the last group', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    itemToGroupKeyFn: i => i[0]!,
    popupListActionRowsBeforeItems: [row('B0')],
    popupListActionRowsAfterItems: [row('A0')],
  })
  sel.setItems(['a1', 'a2', 'b1'])
  sel.open()
  const children = [...sel.popupListEl.children]
  assert.equal(children[0]!.textContent, 'B0')
  assert.equal(children[1]!.getAttribute('role'), 'group')
  assert.equal(children[children.length - 1]!.textContent, 'A0')
  fireKey(sel.triggerEl, 'End')
  assert.equal(activeText(sel), 'A0')
  fireKey(sel.triggerEl, 'ArrowUp')
  assert.equal(activeText(sel), 'b1')
})

test('without rows nothing changes: toggleItem keeps the O(1) item swap and no row refresh runs', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  sel.setItems(['a', 'b'])
  sel.open()
  const b = sel.popupListEl.querySelectorAll('[role="option"]')[1]
  sel.toggleItem('a')
  assert.equal(sel.popupListEl.querySelectorAll('[role="option"]')[1], b)
  assert.equal(sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`), null)
})

test('a subclass can replace the row element or its content through the protected methods', () => {
  class Custom extends LLSelectMultiple<string> {
    protected override createPopupListActionRowAfterItemsEl(r: LLSelectPopupListActionRow, index: number): HTMLElement {
      const el = super.createPopupListActionRowAfterItemsEl(r, index)
      el.dataset['custom'] = 'yes'
      return el
    }
    protected override createPopupListActionRowContentEl(r: LLSelectPopupListActionRow): HTMLElement | null {
      const el = document.createElement('i')
      el.textContent = `[${r.textFn()}]`
      return el
    }
  }
  const sel = new Custom(mount(), { ariaLabel: 'x', popupListActionRowsAfterItems: [row('A0')] })
  sel.setItems(['a'])
  sel.open()
  const el = sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`) as HTMLElement
  assert.equal(el.dataset['custom'], 'yes')
  assert.equal(el.querySelector('i')?.textContent, '[A0]')
  assert.equal(el.getAttribute('aria-label'), 'A0')
})

test('close() drops the rows and the active option; reopening rebuilds them', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', popupListActionRowsAfterItems: [row('A0')] })
  sel.setItems(['a'])
  sel.open()
  fireKey(sel.triggerEl, 'End')
  sel.close()
  assert.equal(sel.popupListEl.children.length, 0)
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), null)
  sel.open()
  assert.deepEqual(optionTexts(sel), ['a', 'A0'])
  assert.equal(activeText(sel), 'a')
})

test('rows are rebuilt AFTER onChange ran, so textFn sees what the handler wrote', () => {
  let note = 'initial'
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    popupListActionRowsAfterItems: [{ textFn: () => `note: ${note}`, onActivate: () => {} }],
    onChange: (chosen) => { note = `${chosen.length} chosen` },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  const text = (): string => sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`)!.textContent ?? ''
  assert.equal(text(), 'note: initial')
  sel.toggleItem('a')
  assert.equal(text(), 'note: 1 chosen')
  sel.setChosenItems(['a', 'b'])
  assert.equal(text(), 'note: 2 chosen')
})

test('setItems that swaps a chosen object for a compare-equal reload refreshes the rows (no change fires)', () => {
  type Item = { id: number; name: string }
  let selM: LLSelectMultiple<Item>
  let changes = 0
  selM = new LLSelectMultiple<Item>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    popupListActionRowsAfterItems: [{ textFn: () => selM.getChosenItems().map(i => i.name).join(',') || 'none', onActivate: () => {} }],
    onChange: () => { changes += 1 },
  })
  const v1 = [{ id: 1, name: 'one' }, { id: 2, name: 'two' }]
  selM.setItems(v1)
  selM.setChosenItems([v1[0]!])
  selM.open()
  const textM = (): string => selM.popupListEl.querySelector(`.${selM.classIdMap.popupListActionRowClass}`)!.textContent ?? ''
  assert.equal(textM(), 'one')
  changes = 0
  selM.setItems([{ id: 1, name: 'ONE' }, { id: 2, name: 'TWO' }]) // same ids, new objects
  assert.equal(changes, 0) // a reference swap is not a logical change
  assert.equal(textM(), 'ONE') // but the row read the swapped object
  let selS: LLSelectSingle<Item>
  selS = new LLSelectSingle<Item>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    popupListActionRowsBeforeItems: [{ textFn: () => selS.getChosenItem()?.name ?? 'none', onActivate: () => {} }],
  })
  selS.setItems(v1)
  selS.setChosenItem(v1[1]!)
  selS.open()
  selS.setItems([{ id: 1, name: 'ONE' }, { id: 2, name: 'TWO' }])
  assert.equal(selS.popupListEl.querySelector(`.${selS.classIdMap.popupListActionRowClass}`)!.textContent, 'TWO')
})
