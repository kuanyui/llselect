import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

interface User { id: number; name: string }

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

function options(sel: { popupListEl: HTMLElement }): HTMLElement[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]'))
}

// --- templateItemFn ----------------------------------------------------------

test('templateItemFn customizes item label without subclassing', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    templateItemFn: u => `#${u.id} ${u.name}`,
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, '#1 Ann')
  assert.equal(options(sel)[1]!.textContent, '#2 Bob')
})

test('templateItemFn customizes the chosen label in the trigger (single)', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    templateItemFn: u => u.name,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.setChosenItem({ id: 1, name: 'Ann' })
  assert.equal(sel.triggerContentEl.textContent, 'Ann')
})

test('default filter matches against the templateItemFn label', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    searchable: true,
    compareFn: (a, b) => a.id === b.id,
    templateItemFn: u => u.name,
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'bo'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const labels = options(sel).map(o => o.textContent)
  assert.deepEqual(labels, ['Bob'])
})

test('templateItemFn (setting) wins over a subclass templateItem override', () => {
  class Derived extends LLSelectSingle<User> {
    protected override templateItem(u: User): string { return `derived-${u.id}` }
  }
  const sel = new Derived(mount(), {
    compareFn: (a, b) => a.id === b.id,
    templateItemFn: u => `fn-${u.id}`,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, 'fn-1') // setting wins, not 'derived-1'
})

test('without the setting, a subclass templateItem override is used (back-compat)', () => {
  class Derived extends LLSelectSingle<User> {
    protected override templateItem(u: User): string { return `derived-${u.id}` }
  }
  const sel = new Derived(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, 'derived-1')
})

// --- renderTriggerContentFn --------------------------------------------------

test('renderTriggerContentFn (string) sets the trigger content (single)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderTriggerContentFn: ({ chosenItem }) => chosenItem ? `>> ${chosenItem}` : 'pick one',
  })
  sel.setItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, 'pick one')
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, '>> a')
})

test('renderTriggerContentFn can return an element', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderTriggerContentFn: ({ chosenItem }) => {
      const span = document.createElement('span')
      span.className = 'tag'
      span.textContent = chosenItem ?? 'none'
      return span
    },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  const tag = sel.triggerContentEl.querySelector('.tag')
  assert.ok(tag)
  assert.equal(tag!.textContent, 'a')
})

test('renderTriggerContentFn returning null falls back to the default', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    placeholder: 'PH',
    renderTriggerContentFn: () => null,
  })
  sel.setItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, 'PH') // default placeholder
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'a') // default chosen label
})

test('multiple renderTriggerContentFn receives chosenItems', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    renderTriggerContentFn: ({ chosenItems, items }) => `${chosenItems.length}/${items.length} picked`,
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(sel.triggerContentEl.textContent, '2/3 picked')
})

test('data-empty reflects selection even when renderTriggerContentFn is used', () => {
  const sel = new LLSelectSingle<string>(mount(), { renderTriggerContentFn: () => 'X' })
  sel.setItems(['a'])
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true') // nothing chosen
  sel.setChosenItem('a')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'false')
})

test('renderTriggerContentFn (setting) wins over a subclass renderTriggerContent override', () => {
  class Derived extends LLSelectSingle<string> {
    protected override renderTriggerContent(): void {
      this.triggerContentEl.textContent = 'DERIVED'
    }
  }
  const sel = new Derived(mount(), { renderTriggerContentFn: () => 'FROM-FN' })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'FROM-FN') // setting wins
})
