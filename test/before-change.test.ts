import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectBeforeChangeEvent } from '../src/index.js'

// onBeforeChange: the cancelable hook before a user change. Contract in
// docs/llm/DESIGN.md "Vetoing a user change" and docs/llm/A11Y.md.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

type AnySel = { popupListEl: HTMLElement; triggerEl: HTMLElement; classIdMap: { popupListRowClass: string; chooseAllRowClass: string; popupListActionRowClass: string; triggerClearButtonClass: string } }

function itemRow(sel: AnySel, index: number): HTMLElement {
  const rows = sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.popupListRowClass}:not(.${sel.classIdMap.chooseAllRowClass}):not(.${sel.classIdMap.popupListActionRowClass})`)
  return rows[index]!
}

function clearButton(sel: AnySel): HTMLElement {
  return sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!
}

function describe<T>(event: LLSelectBeforeChangeEvent<T>): string {
  return `${event.reason}:${'item' in event ? String(event.item) : '-'}:${event.source}`
}

test('single: a pick and the clear button ask onBeforeChange; a veto keeps the value and a pick still closes', () => {
  const asked: string[] = []
  const changes: string[] = []
  let veto = false
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    onBeforeChange: (next, previous, event) => {
      asked.push(`${describe(event)} ${String(previous)}->${String(next)}`)
      if (veto) { event.preventDefault() }
    },
    onChange: (item) => { changes.push(String(item)) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  itemRow(sel, 0).click() // a: allowed, closes
  assert.equal(sel.isOpened(), false)
  assert.equal(sel.getChosenItem(), 'a')
  veto = true
  sel.open()
  itemRow(sel, 1).click() // b by click: vetoed, still closes
  assert.equal(sel.getChosenItem(), 'a')
  assert.equal(sel.isOpened(), false, 'a vetoed single pick still closes the popup')
  sel.open()
  fireKey(sel.triggerEl, 'ArrowDown') // from the chosen a to b
  fireKey(sel.triggerEl, 'Enter') // b by keyboard: vetoed, still closes
  assert.equal(sel.getChosenItem(), 'a')
  assert.equal(sel.isOpened(), false)
  clearButton(sel).click() // vetoed clear: the value stays
  assert.equal(sel.getChosenItem(), 'a')
  veto = false
  clearButton(sel).click() // allowed clear
  assert.equal(sel.getChosenItem(), undefined)
  assert.deepEqual(changes, ['a', 'undefined'])
  assert.deepEqual(asked, [
    'choose:a:user undefined->a',
    'choose:b:user a->b',
    'choose:b:user a->b',
    'clear:-:user a->undefined',
    'clear:-:user a->undefined',
  ])
})

test('single: a pick of the chosen item and a clear of an empty selection never ask', () => {
  let asked = 0
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    onBeforeChange: () => { asked++ },
  })
  sel.setItems(['a', 'b'])
  clearButton(sel).click() // nothing chosen: no change, no question
  sel.setChosenItem('a')
  sel.open()
  itemRow(sel, 0).click() // a again: no change, no question; the popup still closes
  assert.equal(asked, 0)
  assert.equal(sel.isOpened(), false)
})

test('multiple: every user path asks once with its reason and item; a veto leaves the state, the DOM and the popup as they are', () => {
  const asked: string[] = []
  const changes: string[] = []
  let veto = false
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    chooseAllRow: true,
    triggerDisplay: 'tags',
    onBeforeChange: (next, previous, event) => {
      asked.push(`${describe(event)} [${previous.join(',')}]->[${next.join(',')}]`)
      if (veto) { event.preventDefault() }
    },
    onChange: (items) => { changes.push(items.join(',')) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const chooseAllRow = () => sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!
  const tagRemove = () => sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!
  itemRow(sel, 0).click() // choose a
  veto = true
  itemRow(sel, 1).click() // choose b: vetoed
  assert.deepEqual(sel.getChosenItems(), ['a'])
  assert.equal(itemRow(sel, 1).getAttribute('aria-selected'), 'false', 'the vetoed row keeps its aria-selected')
  assert.equal(sel.isOpened(), true, 'multiple keeps the popup open')
  fireKey(sel.triggerEl, 'Enter') // the active row b by keyboard: vetoed
  assert.deepEqual(sel.getChosenItems(), ['a'])
  tagRemove().click() // unchoose a by the chip: vetoed
  assert.deepEqual(sel.getChosenItems(), ['a'])
  assert.ok(tagRemove(), 'the chip stays')
  chooseAllRow().click() // set [a,b,c]: vetoed
  assert.deepEqual(sel.getChosenItems(), ['a'])
  clearButton(sel).click() // clear: vetoed
  assert.deepEqual(sel.getChosenItems(), ['a'])
  veto = false
  chooseAllRow().click() // set [a,b,c]
  chooseAllRow().click() // all chosen -> clear
  assert.deepEqual(sel.getChosenItems(), [])
  assert.deepEqual(changes, ['a', 'a,b,c', ''])
  assert.deepEqual(asked, [
    'choose:a:user []->[a]',
    'choose:b:user [a]->[a,b]',
    'choose:b:user [a]->[a,b]',
    'unchoose:a:user [a]->[]',
    'set:-:user [a]->[a,b,c]',
    'clear:-:user [a]->[]',
    'set:-:user [a]->[a,b,c]',
    'clear:-:user [a,b,c]->[]',
  ])
})

test('multiple: programmatic setters, the setItems reconciliation and an action row\'s own setter never ask', () => {
  let asked = 0
  let sel: LLSelectMultiple<string>
  sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: () => { asked++ },
    popupListTrailingActionRows: [{ textFn: () => 'all', onActivate: () => { sel.setChosenItems(['a', 'b']) } }],
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a'])
  sel.toggleItem('b')
  sel.chooseAll()
  sel.unchooseAll()
  sel.toggleAllVisible()
  sel.setChosenItems(['c'])
  sel.setItems(['a', 'b']) // drops c
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListActionRowClass}`)!.click() // the app's own command
  assert.deepEqual(sel.getChosenItems(), ['a', 'b'])
  assert.equal(asked, 0)
})

test('multiple: the clear button on an empty selection and the choose-all row with nothing actionable never ask', () => {
  let asked = 0
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    chooseAllRow: true,
    itemDisabledFn: () => true,
    onBeforeChange: () => { asked++ },
  })
  sel.setItems(['a', 'b'])
  clearButton(sel).click()
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)?.click()
  assert.equal(asked, 0)
})

test('the protected hook runs first, the setting second, both always; the setting sees the hook\'s veto', () => {
  const log: string[] = []
  class Guarded extends LLSelectSingle<string> {
    protected override onChosenChanging(next: string | undefined, _previous: string | undefined, event: LLSelectBeforeChangeEvent<string>): void {
      log.push(`hook:${String(next)}`)
      if (next === 'b') { event.preventDefault() }
    }
  }
  const sel = new Guarded(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (next, _previous, event) => { log.push(`setting:${String(next)}:${event.defaultPrevented}`) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  itemRow(sel, 1).click() // b: the hook vetoes, the setting still runs and sees it
  assert.equal(sel.getChosenItem(), undefined)
  sel.open()
  itemRow(sel, 0).click() // a: allowed
  assert.equal(sel.getChosenItem(), 'a')
  assert.deepEqual(log, ['hook:b', 'setting:b:true', 'hook:a', 'setting:a:false'])
})

test('preventDefault() after the handlers returned does nothing; defaultPrevented stays false', () => {
  let kept: LLSelectBeforeChangeEvent<string> | null = null
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (_next, _previous, event) => { kept = event },
  })
  sel.setItems(['a'])
  sel.open()
  itemRow(sel, 0).click()
  assert.equal(sel.getChosenItem(), 'a')
  kept!.preventDefault()
  assert.equal(kept!.defaultPrevented, false)
  assert.equal(sel.getChosenItem(), 'a')
})

test('a setter called inside the handler wins: the pending change is dropped, and that change is the user\'s', () => {
  const changes: string[] = []
  let sel: LLSelectSingle<string>
  sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (next) => { if (next === 'a') { sel.setChosenItem('b') } },
    onChange: (item, _previous, meta) => { changes.push(`${String(item)}:${meta.source}`) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  itemRow(sel, 0).click() // the handler sets b; the pick of a is dropped
  assert.equal(sel.getChosenItem(), 'b')
  assert.deepEqual(changes, ['b:user'], 'the first change of the interaction, whoever wrote it, is the user\'s')
  assert.equal(sel.isOpened(), false)
})

test('disabled paths return before the hook: a disabled item, a disabled control', () => {
  let asked = 0
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    triggerDisplay: 'tags',
    itemDisabledFn: (item) => item === 'b',
    onBeforeChange: () => { asked++ },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['b']) // a disabled chosen item: its chip is inert
  sel.open()
  itemRow(sel, 1).click() // disabled row: no click handler
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click()
  sel.close()
  sel.setDisabled(true)
  clearButton(sel).click()
  assert.deepEqual(sel.getChosenItems(), ['b'])
  assert.equal(asked, 0)
})

test('multiple: a setter called inside the handler wins; a subclass hook runs first and the setting sees its veto', () => {
  const log: string[] = []
  class Guarded extends LLSelectMultiple<string> {
    protected override onChosenChanging(next: readonly string[], _previous: readonly string[], event: LLSelectBeforeChangeEvent<string>): void {
      log.push(`hook:${next.join(',')}`)
      if (next.includes('b')) { event.preventDefault() }
    }
  }
  let sel: Guarded
  sel = new Guarded(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (next, _previous, event) => {
      log.push(`setting:${next.join(',')}:${event.defaultPrevented}`)
      if (next.includes('c')) { sel.setChosenItems(['a']) } // the handler's own setter wins
    },
    onChange: (items, _prev, meta) => { log.push(`change:${items.join(',')}:${meta.source}`) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  itemRow(sel, 1).click() // b: the hook vetoes
  assert.deepEqual(sel.getChosenItems(), [])
  itemRow(sel, 2).click() // c: the setting sets a instead; the toggle of c is dropped
  assert.deepEqual(sel.getChosenItems(), ['a'])
  assert.deepEqual(log, ['hook:b', 'setting:b:true', 'hook:c', 'setting:c:false', 'change:a:user'])
})

test('single: a vetoed clear while the popup is open leaves the value, the popup and focus as they are', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    onBeforeChange: (_next, _previous, event) => { event.preventDefault() },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.triggerEl.focus()
  sel.open()
  clearButton(sel).click()
  assert.equal(sel.getChosenItem(), 'a')
  assert.equal(sel.isOpened(), true, 'a vetoed clear does not close')
  assert.equal(document.activeElement, sel.triggerEl, 'focus stays where it was')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'false')
})

test('single: a NaN value picks and clears normally, and re-picking the chosen NaN is a no-op that still closes', () => {
  let asked = 0
  const sel = new LLSelectSingle<number>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    itemToStringFn: (n) => String(n),
    onBeforeChange: () => { asked++ },
  })
  sel.setItems([NaN, 1])
  sel.setChosenItem(NaN)
  sel.open()
  itemRow(sel, 0).click() // NaN again: no change, no question, the popup still closes
  assert.equal(asked, 0)
  assert.equal(sel.isOpened(), false)
  assert.ok(Number.isNaN(sel.getChosenItem()))
  sel.open()
  itemRow(sel, 1).click() // from NaN to 1
  assert.equal(asked, 1)
  assert.equal(sel.getChosenItem(), 1)
  sel.setChosenItem(NaN)
  clearButton(sel).click()
  assert.equal(asked, 2)
  assert.equal(sel.getChosenItem(), undefined)
})

test('setItems called inside the handler wins too: the pending pick is dropped', () => {
  let sel: LLSelectSingle<string>
  sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: () => { sel.setItems(['b']) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  itemRow(sel, 0).click() // a: the handler replaced the list, so the pick is dropped
  assert.equal(sel.getChosenItem(), undefined)
  assert.deepEqual(sel.getItems(), ['b'])
})

test('multiple: setItems called inside the handler wins: the pending toggle is dropped', () => {
  let sel: LLSelectMultiple<string>
  sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: () => { sel.setItems(['a', 'b']) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  itemRow(sel, 0).click() // a: the handler replaced the list, so the toggle is dropped
  assert.deepEqual(sel.getChosenItems(), [])
  assert.deepEqual(sel.getItems(), ['a', 'b'])
})

test('multiple: the clear button is the one user path whose next drops disabled chosen items; the hook sees both lists', () => {
  const seen: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    itemDisabledFn: (item) => item === 'b',
    onBeforeChange: (next, previous) => { seen.push(`${previous.join(',')}>${next.join(',')}`) },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  sel.open()
  itemRow(sel, 0).click() // a off: the disabled b stays in next
  clearButton(sel).click() // the clear wipes b too
  assert.deepEqual(sel.getChosenItems(), [])
  assert.deepEqual(seen, ['a,b>b', 'b>'])
})

test('a handler that writes and then restores the previous value still drops the pending change', () => {
  const changes: string[] = []
  let sel: LLSelectSingle<string>
  sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (next, previous) => {
      if (next === 'b') { sel.setChosenItem('c'); sel.setChosenItem(previous) }
    },
    onChange: (item, _previous, meta) => { changes.push(`${String(item)}:${meta.source}`) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItem('a')
  changes.length = 0
  sel.open()
  itemRow(sel, 1).click() // b: the handler went to c and back to a; the pick of b is dropped
  assert.equal(sel.getChosenItem(), 'a')
  assert.deepEqual(changes, ['c:user', 'a:api'])
})

test('the choose-all row commits the value it announced, even if a handler changed which items are enabled', () => {
  let bDisabled = false
  let announced: readonly string[] = []
  let sel: LLSelectMultiple<string>
  sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    chooseAllRow: true,
    itemDisabledFn: (item) => item === 'b' && bDisabled,
    onBeforeChange: (next) => { announced = next; bDisabled = true; sel.rerender() },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!.click()
  assert.deepEqual(announced, ['a', 'b', 'c'])
  assert.deepEqual(sel.getChosenItems(), ['a', 'b', 'c'], 'the committed value is the announced one, not a recomputation')
})

test('a throwing handler cannot leave the event cancelable', () => {
  let kept: LLSelectBeforeChangeEvent<string> | null = null
  class Exposed extends LLSelectSingle<string> {
    public clearNow(): void { this.clearSelection() }
  }
  const sel = new Exposed(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (_next, _previous, event) => { kept = event; throw new Error('boom') },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.throws(() => sel.clearNow(), /boom/)
  assert.equal(sel.getChosenItem(), 'a')
  kept!.preventDefault()
  assert.equal(kept!.defaultPrevented, false, 'the event was sealed by the finally')
})

test('multiple: a vetoed row click has already moved the active option to that row', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: (_next, _previous, event) => { event.preventDefault() },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  itemRow(sel, 1).click()
  assert.deepEqual(sel.getChosenItems(), [])
  assert.equal(sel.triggerEl.getAttribute('aria-activedescendant'), itemRow(sel, 1).id)
})

test('multiple: event.item on an unchoose is the stored entry under a key-based compareFn', () => {
  interface User { id: number; name: string }
  const seen: Array<User | undefined> = []
  const listBob: User = { id: 2, name: 'Bob' }
  const sel = new LLSelectMultiple<User>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => u.name,
    onBeforeChange: (_next, _previous, event) => { seen.push(event.item) },
  })
  sel.setItems([{ id: 1, name: 'Alice' }, listBob])
  const fresh: User = { id: 2, name: 'Bob' }
  sel.setChosenItems([fresh])
  sel.open()
  itemRow(sel, 1).click() // Bob's row: the stored `fresh` is what leaves
  assert.equal(seen[0], fresh)
  assert.deepEqual(sel.getChosenItems(), [])
})

test('single: a handler that throws on a pick leaves the value and keeps the popup open', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    onBeforeChange: () => { throw new Error('boom') },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.open()
  // jsdom reports an error thrown inside a listener on the window, not to the dispatcher.
  let caught: unknown = null
  window.addEventListener('error', (ev) => { ev.preventDefault(); caught = ev.error }, { once: true })
  itemRow(sel, 1).click()
  assert.match(String((caught as Error | null)?.message), /boom/)
  assert.equal(sel.getChosenItem(), 'a')
  assert.equal(sel.isOpened(), true, 'the activation stopped at the throw, before close()')
})
