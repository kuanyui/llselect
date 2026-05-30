import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

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

test('a disabled control does not fire onOpen', () => {
  let opens = 0
  const sel = new LLSelectSingle<string>(mount(), { onOpen: () => { opens++ } })
  sel.setItems(['a'])
  sel.setDisabled(true)
  sel.open() // blocked
  assert.equal(opens, 0)
})
