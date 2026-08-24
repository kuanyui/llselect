import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Phase 10 optgroup: flat items + itemToGroupKeyFn (contiguous-run) + a generic
// key GK mirroring the item layer. See docs/llm/DESIGN.md "Optgroup (Phase 10)".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function options(sel: { popupListEl: HTMLElement }): HTMLElement[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]'))
}

function groupEls(sel: { popupListEl: HTMLElement }): HTMLElement[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>('[role="group"]'))
}

function fireKey(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function focusedText(sel: { popupListEl: HTMLElement; classIdMap: { itemFocusedClass: string } }): string | null | undefined {
  return sel.popupListEl.querySelector(`.${sel.classIdMap.itemFocusedClass}`)?.textContent
}

// --- structure ---------------------------------------------------------------

test('itemToGroupKeyFn groups contiguous same-key items into role=group containers', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: (s) => s[0]! })
  sel.setItems(['apple', 'avocado', 'banana', 'cherry'])
  sel.open()
  const gs = groupEls(sel)
  assert.equal(gs.length, 3) // a, b, c
  assert.equal(gs[0]!.querySelectorAll('[role="option"]').length, 2) // apple, avocado
  assert.equal(gs[1]!.querySelectorAll('[role="option"]').length, 1)
  assert.equal(gs[0]!.getAttribute('aria-label'), 'a') // default label = String(key)
})

test('grouping off (no itemToGroupKeyFn) renders a flat list with no group containers', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.open()
  assert.equal(groupEls(sel).length, 0)
  assert.equal(options(sel).length, 3)
})

test('group label element is aria-hidden, has the group-label class, and shows the label text', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: () => 'fruits',
    groupKeyToStringFn: (k) => (k === 'fruits' ? 'Fruits' : k),
  })
  sel.setItems(['a', 'b'])
  sel.open()
  const label = sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.groupLabelClass}`)!
  assert.ok(label)
  assert.equal(label.getAttribute('aria-hidden'), 'true')
  assert.equal(label.textContent, 'Fruits')
  assert.equal(groupEls(sel)[0]!.getAttribute('aria-label'), 'Fruits') // aria-label uses the label, not the key
})

test('items with a null key render ungrouped, outside any group container', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => (s === 'loose' ? null : 'g'),
  })
  sel.setItems(['loose', 'x', 'y'])
  sel.open()
  assert.equal(groupEls(sel).length, 1)
  const directOptions = Array.from(sel.popupListEl.children).filter((c) => c.getAttribute('role') === 'option')
  assert.equal(directOptions.length, 1)
  assert.equal(directOptions[0]!.textContent, 'loose')
})

// --- index alignment / keyboard ---------------------------------------------

test('keyboard navigation ignores group headers (itemEls stays aligned to visible items)', () => {
  const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: (s) => s[0]! })
  sel.setItems(['apple', 'banana', 'cherry']) // three one-item groups
  sel.open()
  assert.equal(focusedText(sel), 'apple')
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedText(sel), 'banana') // header skipped
  fireKey(sel.triggerEl, 'ArrowDown')
  assert.equal(focusedText(sel), 'cherry')
})

// --- GK is generic -----------------------------------------------------------

test('group key can be a number (GK generic, default string overridden)', () => {
  const sel = new LLSelectSingle<{ n: string; g: number }, number>(mount(), {
    itemToStringFn: (x) => x.n,
    itemToGroupKeyFn: (x) => x.g,
    groupKeyToStringFn: (g) => `Group ${g}`,
  })
  sel.setItems([{ n: 'a', g: 1 }, { n: 'b', g: 1 }, { n: 'c', g: 2 }])
  sel.open()
  const gs = groupEls(sel)
  assert.equal(gs.length, 2)
  assert.equal(gs[0]!.getAttribute('aria-label'), 'Group 1')
  assert.equal(gs[0]!.querySelectorAll('[role="option"]').length, 2)
})

test('groupKeyCompareFn merges object keys with the same identity into one group', () => {
  type Key = { id: number }
  const sel = new LLSelectSingle<{ n: string; k: Key }, Key>(mount(), {
    itemToStringFn: (x) => x.n,
    itemToGroupKeyFn: (x) => x.k,
    groupKeyCompareFn: (a, b) => a.id === b.id, // without this, two {id:1} objects would be two groups
    groupKeyToStringFn: (k) => `#${k.id}`,
  })
  sel.setItems([
    { n: 'a', k: { id: 1 } },
    { n: 'b', k: { id: 1 } }, // distinct object, same id -> same group
    { n: 'c', k: { id: 2 } },
  ])
  sel.open()
  const gs = groupEls(sel)
  assert.equal(gs.length, 2)
  assert.equal(gs[0]!.querySelectorAll('[role="option"]').length, 2)
  assert.equal(gs[0]!.getAttribute('aria-label'), '#1')
})

// --- disabled layering -------------------------------------------------------

test('groupDisabledFn disables every item in the group and marks the container', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    groupDisabledFn: (k) => k === 'b',
  })
  sel.setItems(['apple', 'banana', 'berry', 'cherry'])
  sel.open()
  const byText = (t: string) => options(sel).find((o) => o.textContent === t)!
  assert.equal(byText('banana').getAttribute('aria-disabled'), 'true')
  assert.equal(byText('berry').getAttribute('aria-disabled'), 'true')
  assert.ok(byText('banana').classList.contains(sel.classIdMap.itemDisabledClass))
  assert.equal(byText('apple').hasAttribute('aria-disabled'), false)
  const bGroup = groupEls(sel).find((g) => g.getAttribute('aria-label') === 'b')!
  assert.equal(bGroup.getAttribute('aria-disabled'), 'true')
  assert.equal(bGroup.getAttribute('data-disabled'), 'true')
})

test('a group-disabled item cannot be selected by click (single)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    groupDisabledFn: (k) => k === 'b',
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  options(sel).find((o) => o.textContent === 'banana')!.click()
  assert.equal(sel.getChosenItem(), undefined)
})

test('keyboard navigation skips group-disabled items', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    groupDisabledFn: (k) => k === 'b',
  })
  sel.setItems(['apple', 'banana', 'cherry']) // group b disabled
  sel.open()
  assert.equal(focusedText(sel), 'apple')
  fireKey(sel.triggerEl, 'ArrowDown') // skip banana -> cherry
  assert.equal(focusedText(sel), 'cherry')
})

test('chooseAll skips group-disabled items (multiple)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    groupDisabledFn: (k) => k === 'b',
  })
  sel.setItems(['apple', 'banana', 'berry', 'cherry'])
  sel.chooseAll()
  assert.deepEqual([...sel.getChosenItems()], ['apple', 'cherry'])
})

test('itemDisabledFn and groupDisabledFn layer (either one disables)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    itemDisabledFn: (s) => s === 'apple', // item-level
    groupDisabledFn: (k) => k === 'b',    // group-level
  })
  sel.setItems(['apple', 'avocado', 'banana'])
  sel.open()
  const byText = (t: string) => options(sel).find((o) => o.textContent === t)!
  assert.equal(byText('apple').getAttribute('aria-disabled'), 'true')  // item-level
  assert.equal(byText('avocado').hasAttribute('aria-disabled'), false) // neither
  assert.equal(byText('banana').getAttribute('aria-disabled'), 'true') // group-level
})

// --- contiguous-run warn (strict mode) ---------------------------------------

test('gatherGroups: false - a non-contiguous key reappearance warns once and renders a duplicate header', () => {
  const warnings: unknown[][] = []
  const orig = console.warn
  console.warn = (...args: unknown[]) => { warnings.push(args) }
  try {
    const sel = new LLSelectSingle<string>(mount(), { itemToGroupKeyFn: (s) => s[0]!, gatherGroups: false, ariaLabel: 'x' }) // named: keep the spy's count to the group warn
    sel.setItems(['apple', 'banana', 'avocado']) // a, b, a -> 'a' reappears after 'b'
    sel.open()
    assert.equal(groupEls(sel).length, 3) // a, b, a - strict mode does not gather
  } finally {
    console.warn = orig
  }
  assert.equal(warnings.length, 1)
})

// --- filtering composes ------------------------------------------------------

test('filtering regroups survivors and drops now-empty groups', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    filterable: true,
    itemToGroupKeyFn: (s) => s[0]!,
  })
  sel.setItems(['apple', 'avocado', 'banana']) // groups a, b
  sel.open()
  assert.equal(groupEls(sel).length, 2)
  const input = sel.popupEl.querySelector('input')!
  input.value = 'a' // keep only items containing 'a' in a way that empties group b? 'banana' has 'a'...
  input.dispatchEvent(new Event('input', { bubbles: true }))
  // 'apple','avocado','banana' all contain 'a'; narrow further to empty group b:
  input.value = 'av'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(options(sel).map((o) => o.textContent), ['avocado'])
  assert.equal(groupEls(sel).length, 1) // only group a survives
  assert.equal(groupEls(sel)[0]!.getAttribute('aria-label'), 'a')
})

// --- rich header content (mirrors createItemContentElFn) ---------------------

test('createGroupLabelContentElFn fills the header; container aria-label stays plain text', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    groupKeyToStringFn: (k) => k.toUpperCase(),
    createGroupLabelContentElFn: (key, items) => {
      const span = document.createElement('span')
      span.className = 'rich'
      span.textContent = `${key.toUpperCase()} (${items.length})` // uses itemsInGroup
      return span
    },
  })
  sel.setItems(['apple', 'avocado', 'banana'])
  sel.open()
  const group = groupEls(sel).find((g) => g.getAttribute('aria-label') === 'A')!
  assert.equal(group.getAttribute('aria-label'), 'A') // plain groupKeyToString, not the rich node
  const label = group.querySelector<HTMLElement>(`.${sel.classIdMap.groupLabelClass}`)!
  assert.equal(label.getAttribute('aria-hidden'), 'true')
  const rich = label.querySelector<HTMLElement>('.rich')!
  assert.ok(rich)
  assert.equal(rich.textContent, 'A (2)') // apple + avocado
})

test('createGroupLabelContentElFn returning null falls back to the plain label', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    itemToGroupKeyFn: (s) => s[0]!,
    createGroupLabelContentElFn: () => null,
  })
  sel.setItems(['apple', 'banana'])
  sel.open()
  const label = sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.groupLabelClass}`)!
  assert.equal(label.textContent, 'a')
  assert.equal(label.children.length, 0)
})

test('createGroupEl can be overridden for full control of the group element', () => {
  class CustomGroup extends LLSelectSingle<string> {
    protected override createGroupEl(key: string, index: number, items: readonly string[], itemEls: HTMLElement[]): HTMLElement {
      const el = super.createGroupEl(key, index, items, itemEls)
      el.setAttribute('data-count', String(items.length))
      return el
    }
  }
  const sel = new CustomGroup(mount(), { itemToGroupKeyFn: (s) => s[0]! })
  sel.setItems(['apple', 'avocado', 'banana'])
  sel.open()
  const group = groupEls(sel).find((g) => g.getAttribute('aria-label') === 'a')!
  assert.equal(group.getAttribute('data-count'), '2')
})

// --- subclass override: itemToGroupKey ----------------------------------

test('an itemToGroupKey override turns grouping on without the setting, gather included', () => {
  class KeyedSelect extends LLSelectSingle<string> {
    protected override itemToGroupKey(item: string): string | null { return item[0]! }
  }
  const sel = new KeyedSelect(mount())
  sel.setItems(['apple', 'banana', 'avocado']) // unsorted on purpose
  sel.open()
  assert.equal(groupEls(sel).length, 2) // a (apple, avocado), b
  assert.deepEqual(options(sel).map(el => el.textContent), ['apple', 'avocado', 'banana'])
})

test('rerender() re-derives grouping when an override reads changed external state', () => {
  class ModalSelect extends LLSelectSingle<string> {
    public grouped = false
    protected override itemToGroupKey(item: string): string | null { return this.grouped ? item[0]! : null }
  }
  const sel = new ModalSelect(mount())
  sel.setItems(['apple', 'banana', 'avocado'])
  sel.open()
  assert.equal(groupEls(sel).length, 0) // all-null keys: flat
  sel.grouped = true
  sel.rerender()
  assert.equal(groupEls(sel).length, 2)
  assert.deepEqual(options(sel).map(el => el.textContent), ['apple', 'avocado', 'banana'])
})
