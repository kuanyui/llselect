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
  const itemRow = () => sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.itemClass}:not(.${sel.classIdMap.chooseAllRowClass})`)!
  itemRow().click() // toggle 'a' on
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!.click() // tag x removes 'a'
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.chooseAllRowClass}`)!.click() // choose-all
  sel.triggerEl.querySelector<HTMLElement>(`.${sel.classIdMap.triggerClearButtonClass}`)!.click() // clear button
  sel.toggleItem('a')
  sel.setChosenItems(['b'])
  sel.chooseAll()
  assert.deepEqual(sources, ['user', 'user', 'user', 'user', 'api', 'api', 'api'])
})
