import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectMultiple } from '../src/multiple.js'

// triggerDisplay: 'tags' - removable tag chips in the multi-select trigger.
// See docs/llm/DESIGN.md "Tags (triggerDisplay)" and docs/llm/A11Y.md "Tags".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function tags(sel: { triggerEl: HTMLElement; classIdMap: { tagClass: string } }): HTMLElement[] {
  return Array.from(sel.triggerEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagClass}`))
}

function removeBtn(sel: { triggerEl: HTMLElement; classIdMap: { tagRemoveButtonClass: string } }): HTMLButtonElement {
  return sel.triggerEl.querySelector<HTMLButtonElement>(`.${sel.classIdMap.tagRemoveButtonClass}`)!
}

test('triggerDisplay tags renders one chip per chosen item', () => {
  const sel = new LLSelectMultiple<string>(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  const chips = tags(sel)
  assert.equal(chips.length, 2)
  assert.ok(chips[0]!.textContent!.includes('a'))
  assert.ok(chips[1]!.textContent!.includes('c'))
})

test('each chip has a remove button: <button>, tabindex=-1, aria-label from itemToString', () => {
  const sel = new LLSelectMultiple<string>(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  const btn = removeBtn(sel)
  assert.equal(btn.tagName, 'BUTTON')
  assert.equal(btn.getAttribute('type'), 'button')
  assert.equal(btn.getAttribute('tabindex'), '-1')
  assert.equal(btn.getAttribute('aria-label'), 'Remove a')
})

test('clicking a remove button unchooses that item and rerenders the trigger', () => {
  const sel = new LLSelectMultiple<string>(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(tags(sel).length, 2)
  removeBtn(sel).click() // removes 'a' (first chip)
  assert.deepEqual([...sel.getChosenItems()], ['b'])
  assert.equal(tags(sel).length, 1)
})

test('clicking a remove button does not open the popup (stopPropagation)', () => {
  const sel = new LLSelectMultiple<string>(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(sel.popupEl.hidden, true)
  removeBtn(sel).click()
  assert.equal(sel.popupEl.hidden, true) // still closed - the x did not toggle the popup
})

test('createTagContentElFn fills chip content; remove aria-label stays itemToString', () => {
  const sel = new LLSelectMultiple<{ id: number; name: string }, string>(mount(), {
    triggerDisplay: 'tags',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => u.name,
    createTagContentElFn: (u) => {
      const b = document.createElement('b')
      b.textContent = u.name.toUpperCase()
      return b
    },
  })
  sel.setItems([{ id: 1, name: 'alice' }, { id: 2, name: 'bob' }])
  sel.setChosenItems([{ id: 1, name: 'alice' }])
  const chip = tags(sel)[0]!
  assert.equal(chip.querySelector('b')!.textContent, 'ALICE')
  assert.equal(removeBtn(sel).getAttribute('aria-label'), 'Remove alice') // name, not the custom content
})

test('createTagContentElFn returning null falls back to plain itemToString text', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    triggerDisplay: 'tags',
    createTagContentElFn: () => null,
  })
  sel.setItems(['apple', 'banana'])
  sel.setChosenItems(['apple'])
  assert.ok(tags(sel)[0]!.textContent!.includes('apple'))
  assert.equal(tags(sel)[0]!.querySelector('b'), null)
})

test('createTagRemoveButtonContentElFn fills the remove-button icon; library still owns click + aria', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    triggerDisplay: 'tags',
    createTagRemoveButtonContentElFn: (item) => {
      const i = document.createElement('i')
      i.className = `x-${item}`
      return i
    },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  const btn = removeBtn(sel) // first chip ('a')
  assert.ok(btn.querySelector('.x-a')) // icon filled, receives the item
  assert.equal(btn.getAttribute('aria-label'), 'Remove a') // aria still library-owned
  assert.equal(btn.getAttribute('tabindex'), '-1')
  btn.click() // still removes via toggleItem
  assert.deepEqual([...sel.getChosenItems()], ['b'])
})

test('createTagRemoveButtonContentElFn returning null leaves the button empty (theme CSS glyph draws the x)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    triggerDisplay: 'tags',
    createTagRemoveButtonContentElFn: () => null,
  })
  sel.setItems(['a'])
  sel.setChosenItems(['a'])
  assert.equal(removeBtn(sel).children.length, 0)
})

test('createTagRemoveButtonEl can be overridden for full control of the remove button', () => {
  class CustomRemove extends LLSelectMultiple<string> {
    protected override createTagRemoveButtonEl(item: string): HTMLElement {
      const el = super.createTagRemoveButtonEl(item)
      el.setAttribute('data-remove', item)
      return el
    }
  }
  const sel = new CustomRemove(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(removeBtn(sel).getAttribute('data-remove'), 'a')
})

test('uiTranslationPack.tagRemoveButtonAriaLabel customizes the remove button accessible name', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    triggerDisplay: 'tags',
    uiTranslationPack: { tagRemoveButtonAriaLabel: (itemLabel) => `Drop ${itemLabel}` },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(removeBtn(sel).getAttribute('aria-label'), 'Drop a')
})

test('a subclass itemToTagRemoveButtonAriaLabel override replaces the pack default (override wins)', () => {
  class Derived extends LLSelectMultiple<string> {
    protected override itemToTagRemoveButtonAriaLabel(item: string): string {
      return `Discard ${item}`
    }
  }
  const sel = new Derived(mount(), {
    triggerDisplay: 'tags',
    uiTranslationPack: { tagRemoveButtonAriaLabel: (itemLabel) => `Drop ${itemLabel}` },
  })
  sel.setItems(['a'])
  sel.setChosenItems(['a'])
  assert.equal(removeBtn(sel).getAttribute('aria-label'), 'Discard a') // override wins
})

test('tags mode with an empty selection shows the placeholder, not chips', () => {
  const sel = new LLSelectMultiple<string>(mount(), { triggerDisplay: 'tags', placeholder: 'Pick' })
  sel.setItems(['a', 'b'])
  assert.equal(tags(sel).length, 0)
  assert.ok(sel.triggerEl.textContent!.includes('Pick'))
})

test('default triggerDisplay is count (no chips)', () => {
  const sel = new LLSelectMultiple<string>(mount())
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(tags(sel).length, 0)
  assert.ok(sel.triggerEl.textContent!.includes('2 / 3 selected'))
})

test('createTriggerContentElFn wins over tags mode (full control)', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    triggerDisplay: 'tags',
    createTriggerContentElFn: () => {
      const span = document.createElement('span')
      span.className = 'custom-trigger'
      span.textContent = 'CUSTOM'
      return span
    },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a'])
  assert.equal(tags(sel).length, 0)
  assert.ok(sel.triggerEl.querySelector('.custom-trigger'))
})

test('a subclass createTagRemoveButtonContentEl override replaces the setting (override wins)', () => {
  class Derived extends LLSelectMultiple<string> {
    protected override createTagRemoveButtonContentEl(): HTMLElement | null {
      const i = document.createElement('i')
      i.className = 'derived-x'
      return i
    }
  }
  const sel = new Derived(mount(), {
    triggerDisplay: 'tags',
    createTagRemoveButtonContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'fn-x'
      return i
    },
  })
  sel.setItems(['a'])
  sel.setChosenItems(['a'])
  const btn = removeBtn(sel)
  assert.ok(btn.querySelector('.derived-x')) // override wins
  assert.equal(btn.querySelector('.fn-x'), null)
})

test('createTagEl can be overridden for full control of a chip', () => {
  class TaggedMulti extends LLSelectMultiple<string> {
    protected override createTagEl(item: string): HTMLElement {
      const el = super.createTagEl(item)
      el.setAttribute('data-tag', item)
      return el
    }
  }
  const sel = new TaggedMulti(mount(), { triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(tags(sel)[0]!.getAttribute('data-tag'), 'a')
  assert.equal(tags(sel)[1]!.getAttribute('data-tag'), 'b')
})
