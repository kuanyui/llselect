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

test('onOpen / onClose settings fire on open / close', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    onOpen: () => log.push('open'),
    onClose: () => log.push('close'),
  })
  sel.setItems(['a'])
  sel.open()
  sel.close()
  assert.deepEqual(log, ['open', 'close'])
})

test('onOpen does not fire on a no-op open; onClose not on a no-op close', () => {
  let opens = 0
  let closes = 0
  const sel = new LLSelectSingle<string>(mount(), {
    onOpen: () => { opens++ },
    onClose: () => { closes++ },
  })
  sel.setItems(['a'])
  sel.open()
  sel.open() // already open -> no-op
  assert.equal(opens, 1)
  sel.close()
  sel.close() // already closed -> no-op
  assert.equal(closes, 1)
})

test('onOpen setting fires alongside (not instead of) a subclass onOpened hook', () => {
  const log: string[] = []
  class Derived extends LLSelectSingle<string> {
    protected override onOpened(): void { log.push('hook') }
  }
  const sel = new Derived(mount(), { onOpen: () => log.push('setting') })
  sel.setItems(['a'])
  sel.open()
  assert.deepEqual(log, ['hook', 'setting']) // both run, hook first
})

test('onChosenChanged hook fires before the onChange setting; both run', () => {
  const log: string[] = []
  class Derived extends LLSelectSingle<string> {
    protected override onChosenChanged(): void { log.push('hook') }
  }
  const sel = new Derived(mount(), { onChange: () => log.push('setting') })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  assert.deepEqual(log, ['hook', 'setting']) // both run, hook first
  sel.setChosenItem('a') // equivalent value -> no actual change -> neither fires
  assert.deepEqual(log, ['hook', 'setting'])
})

test('onChange receives the previous value as the second parameter (single)', () => {
  const pairs: Array<[string | undefined, string | undefined]> = []
  const sel = new LLSelectSingle<string>(mount(), {
    onChange: (chosen, previous) => pairs.push([chosen, previous]),
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.setChosenItem('b')
  sel.setItems(['x']) // 'b' dropped by reconciliation
  assert.deepEqual(pairs, [
    ['a', undefined],
    ['b', 'a'],
    [undefined, 'b'],
  ])
})

test('onChange previous enables an added/removed diff (multiple)', () => {
  const diffs: Array<{ added: string[]; removed: string[] }> = []
  const sel = new LLSelectMultiple<string>(mount(), {
    onChange: (chosen, previous) => {
      diffs.push({
        added: chosen.filter(c => !previous.includes(c)),
        removed: previous.filter(p => !chosen.includes(p)),
      })
    },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.toggleItem('a')
  sel.setChosenItems(['b', 'c'])
  assert.deepEqual(diffs, [
    { added: ['a'], removed: [] },
    { added: ['b', 'c'], removed: ['a'] },
  ])
})

test('a disabled control does not fire onOpen', () => {
  let opens = 0
  const sel = new LLSelectSingle<string>(mount(), { onOpen: () => { opens++ } })
  sel.setItems(['a'])
  sel.setDisabled(true)
  sel.open() // blocked
  assert.equal(opens, 0)
})

test('onChange meta.source (single): a click reports user, setChosenItem reports api', () => {
  const sources: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'Fruit',
    onChange: (_item, _prev, meta) => { sources.push(meta.source) },
  })
  sel.setItems(['a', 'b'])
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!.click()
  sel.setChosenItem('b')
  assert.deepEqual(sources, ['user', 'api'])
})

test('onChange meta.source (multiple): every built-in interaction reports user, every method reports api', () => {
  const sources: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'Fruits',
    clearable: true,
    chooseAllRow: true,
    triggerDisplay: 'tags',
    onChange: (_items, _prev, meta) => { sources.push(meta.source) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const itemRow = () => sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListRowClass}:not(.${sel.classIdMap.chooseAllRowClass})`)!
  itemRow().click() // toggle 'a' on
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click() // tag x removes 'a'
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!.click() // choose-all
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click() // clear button
  sel.toggleItem('a')
  sel.setChosenItems(['b'])
  sel.chooseAll()
  assert.deepEqual(sources, ['user', 'user', 'user', 'user', 'api', 'api', 'api'])
})

test('meta.source: a programmatic setter inside the onChange callback reports api', () => {
  const sources: string[] = []
  let reentered = false
  const sel: LLSelectMultiple<string> = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    onChange: (items, _prev, meta) => {
      sources.push(meta.source)
      if (!reentered) {
        reentered = true
        sel.setChosenItems([...items, 'b'])
      }
    },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  sel.popupListEl.querySelector<HTMLElement>('[role="option"]')!.click()
  assert.deepEqual(sources, ['user', 'api'])
})

test('onChange meta.reason and meta.item (single): choose with the item, clear, items', () => {
  const log: string[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'Fruit',
    clearable: true,
    onChange: (_item, _prev, meta) => { log.push(`${meta.reason}:${'item' in meta ? String(meta.item) : '-'}:${meta.source}`) },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  sel.open()
  sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')[1]!.click() // picks 'b', closes
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  sel.setChosenItem('b')
  sel.setChosenItem(undefined)
  sel.setChosenItem('a')
  sel.setItems(['b']) // 'a' dropped by reconciliation
  assert.deepEqual(log, [
    'choose:a:api',
    'choose:b:user',
    'clear:-:user',
    'choose:b:api',
    'clear:-:api',
    'choose:a:api',
    'items:-:api',
  ])
})

test('onChange meta.reason and meta.item (multiple): one toggled item names itself, bulk writes say set or clear', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'Fruits',
    clearable: true,
    chooseAllRow: true,
    triggerDisplay: 'tags',
    onChange: (_items, _prev, meta) => { log.push(`${meta.reason}:${'item' in meta ? String(meta.item) : '-'}:${meta.source}`) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  const itemRow = () => sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListRowClass}:not(.${sel.classIdMap.chooseAllRowClass})`)!
  const chooseAllRow = () => sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!
  itemRow().click() // 'a' on
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click() // chip x removes 'a'
  chooseAllRow().click() // nothing chosen -> all three
  chooseAllRow().click() // all chosen -> none left: an empty write is a clear
  sel.toggleItem('a')
  sel.toggleItem('a')
  sel.setChosenItems(['b', 'c'])
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click()
  sel.chooseAll()
  sel.unchooseAll()
  sel.setChosenItems(['a'])
  sel.setItems(['b']) // 'a' dropped by reconciliation
  assert.deepEqual(log, [
    'choose:a:user',
    'unchoose:a:user',
    'set:-:user',
    'clear:-:user',
    'choose:a:api',
    'unchoose:a:api',
    'set:-:api',
    'clear:-:user',
    'set:-:api',
    'clear:-:api',
    'set:-:api',
    'items:-:api',
  ])
})

test('meta.reason: a single-item operation keeps its reason; a whole-value write reads its result', () => {
  const log: string[] = []
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    itemDisabledFn: (i) => i === 'c',
    chosenItemsOrder: 'as-listed',
    onChange: (_items, _prev, meta) => { log.push(`${meta.reason}:${'item' in meta ? String(meta.item) : '-'}`) },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  sel.unchooseAll() // the disabled 'c' stays chosen: a bulk op with a non-empty result is set, not clear
  sel.toggleItem('c') // removing the last item through a toggle is unchoose, not clear
  sel.setChosenItems(['a', 'b'])
  sel.setItems(['b', 'a', 'c']) // as-listed: the chosen order flips, which the reconciliation reports as items
  assert.deepEqual(log, ['set:-', 'set:-', 'unchoose:c', 'set:-', 'items:-'])
})

test('meta.item is present for choose and unchoose even when the item is undefined', () => {
  const seen: Array<[string, boolean, unknown]> = []
  const sel = new LLSelectMultiple<undefined>(mount(), {
    ariaLabel: 'x',
    itemToStringFn: () => 'nothing',
    onChange: (_items, _prev, meta) => { seen.push([meta.reason, 'item' in meta, meta.item]) },
  })
  sel.setItems([undefined])
  sel.toggleItem(undefined)
  sel.toggleItem(undefined)
  assert.deepEqual(seen, [['choose', true, undefined], ['unchoose', true, undefined]])
})

test('meta.item on unchoose is the stored entry, not the caller\'s equal object', () => {
  interface User { id: number; name: string }
  const seen: Array<User | undefined> = []
  const listBob: User = { id: 2, name: 'Bob' }
  const sel = new LLSelectMultiple<User>(mount(), {
    ariaLabel: 'x',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => u.name,
    onChange: (_items, _prev, meta) => { seen.push(meta.item) },
  })
  sel.setItems([{ id: 1, name: 'Alice' }, listBob])
  const fresh: User = { id: 2, name: 'Bob' }
  sel.setChosenItems([fresh])
  sel.toggleItem(listBob) // equal under compareFn: the stored `fresh` leaves the selection
  assert.equal(seen[1], fresh)
})
