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

// --- itemToStringFn ----------------------------------------------------------

test('itemToStringFn customizes item label without subclassing', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => `#${u.id} ${u.name}`,
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, '#1 Ann')
  assert.equal(options(sel)[1]!.textContent, '#2 Bob')
})

test('itemToStringFn customizes the chosen label in the trigger (single)', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.setChosenItem({ id: 1, name: 'Ann' })
  assert.equal(sel.triggerContentEl.textContent, 'Ann')
})

test('default filter matches against the itemToStringFn label', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    searchable: true,
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'bo'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  const labels = options(sel).map(o => o.textContent)
  assert.deepEqual(labels, ['Bob'])
})

test('a subclass itemToString override replaces the setting (override wins)', () => {
  // Extension surface: overriding the method replaces the default (which reads
  // the setting). The library calls itemToString directly, so the override wins.
  class Derived extends LLSelectSingle<User> {
    protected override itemToString(u: User): string { return `derived-${u.id}` }
  }
  const sel = new Derived(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => `fn-${u.id}`,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, 'derived-1') // override wins, not 'fn-1'
})

test('without the setting, a subclass itemToString override is used (back-compat)', () => {
  class Derived extends LLSelectSingle<User> {
    protected override itemToString(u: User): string { return `derived-${u.id}` }
  }
  const sel = new Derived(mount(), { compareFn: (a, b) => a.id === b.id })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  assert.equal(options(sel)[0]!.textContent, 'derived-1')
})

// --- createTriggerContentElFn --------------------------------------------------

test('createTriggerContentElFn (element) drives the trigger, varying by chosenItem (single)', () => {
  const make = (text: string): HTMLElement => {
    const span = document.createElement('span')
    span.textContent = text
    return span
  }
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerContentElFn: ({ chosenItem }) => make(chosenItem ? `>> ${chosenItem}` : 'pick one'),
  })
  sel.setItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, 'pick one')
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, '>> a')
})

test('createTriggerContentElFn can return an element', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerContentElFn: ({ chosenItem }) => {
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

test('createTriggerContentElFn returning null falls back to the default', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    placeholder: 'PH',
    createTriggerContentElFn: () => null,
  })
  sel.setItems(['a'])
  assert.equal(sel.triggerContentEl.textContent, 'PH') // default placeholder
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'a') // default chosen label
})

test('multiple createTriggerContentElFn receives chosenItems', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    createTriggerContentElFn: ({ chosenItems, items }) => {
      const span = document.createElement('span')
      span.textContent = `${chosenItems.length}/${items.length} picked`
      return span
    },
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(sel.triggerContentEl.textContent, '2/3 picked')
})

test('data-empty reflects selection even when createTriggerContentElFn is used', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    createTriggerContentElFn: () => {
      const s = document.createElement('span')
      s.textContent = 'X'
      return s
    },
  })
  sel.setItems(['a'])
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'true') // nothing chosen
  sel.setChosenItem('a')
  assert.equal(sel.triggerEl.getAttribute('data-empty'), 'false')
})

test('a subclass renderTriggerContent override replaces the setting (override wins)', () => {
  // Override replaces the default that reads createTriggerContentElFn, so it wins.
  class Derived extends LLSelectSingle<string> {
    protected override renderTriggerContent(): void {
      this.triggerContentEl.textContent = 'DERIVED'
    }
  }
  const sel = new Derived(mount(), {
    createTriggerContentElFn: () => {
      const s = document.createElement('span')
      s.textContent = 'FROM-FN'
      return s
    },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'DERIVED') // override wins
})

// --- createItemContentElFn -----------------------------------------------------

test('createItemContentElFn (element) fills the option; aria-label comes from itemToString', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
    createItemContentElFn: u => {
      const span = document.createElement('span')
      span.className = 'rich'
      span.textContent = `[${u.name}]`
      return span
    },
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  const opt = options(sel)[0]!
  assert.equal(opt.querySelector('.rich')!.textContent, '[Ann]') // visible content
  assert.equal(opt.getAttribute('aria-label'), 'Ann') // accessible name pinned to itemToString
})

test('createItemContentElFn returning null falls back to plain text, no aria-label', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
    createItemContentElFn: () => null,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  const opt = options(sel)[0]!
  assert.equal(opt.textContent, 'Ann')
  assert.equal(opt.getAttribute('aria-label'), null) // plain text is its own accessible name
})

test('without createItemContentElFn, options are plain text with no aria-label (back-compat)', () => {
  const sel = new LLSelectSingle<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
  })
  sel.setItems([{ id: 1, name: 'Ann' }])
  sel.open()
  const opt = options(sel)[0]!
  assert.equal(opt.textContent, 'Ann')
  assert.equal(opt.getAttribute('aria-label'), null)
})

test('multiple: option shell keeps aria-selected alongside the custom content + aria-label', () => {
  const sel = new LLSelectMultiple<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
    createItemContentElFn: u => {
      const span = document.createElement('span')
      span.className = 'rich'
      span.textContent = u.name
      return span
    },
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.setChosenItems([{ id: 1, name: 'Ann' }])
  sel.open()
  const opt = options(sel)[0]!
  assert.ok(opt.querySelector('.rich')) // custom content present
  assert.equal(opt.getAttribute('aria-label'), 'Ann') // base shell
  assert.equal(opt.getAttribute('aria-selected'), 'true') // multiple shell, on top
})

test('replacePopupListItemElInDom re-runs createItemContentElFn (single-item update keeps rich content)', () => {
  const sel = new LLSelectMultiple<User>(mount(), {
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: u => u.name,
    createItemContentElFn: u => {
      const span = document.createElement('span')
      span.className = 'rich'
      span.textContent = u.name
      return span
    },
  })
  sel.setItems([{ id: 1, name: 'Ann' }, { id: 2, name: 'Bob' }])
  sel.open()
  sel.toggleItem({ id: 1, name: 'Ann' }) // toggles -> O(1) rerender of that row
  const opt = options(sel)[0]!
  assert.ok(opt.querySelector('.rich')) // rich content survives single-item rerender
  assert.equal(opt.getAttribute('aria-selected'), 'true')
  assert.equal(opt.getAttribute('aria-label'), 'Ann')
})
