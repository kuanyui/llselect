import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import { zhTW } from '../src/i18n.js'

// The screen-reader text: what assistive technology reads as the trigger's
// value, never shown. See docs/llm/A11Y.md "Accessible name".

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><span id="lbl">Field</span><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

function srText(sel: { classIdMap: { triggerScreenReaderTextId: string } }): HTMLElement {
  return document.getElementById(sel.classIdMap.triggerScreenReaderTextId)!
}

const ITEMS = Array.from({ length: 74 }, (_, i) => `item ${i}`)

test('the span sits inside the trigger, carries its class, and is hidden visually only', () => {
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x' })
  const el = srText(sel)
  assert.equal(el.parentElement, sel.triggerEl)
  assert.ok(el.classList.contains(sel.classIdMap.triggerScreenReaderTextClass))
  assert.equal(sel.classIdMap.triggerScreenReaderTextClass, 'llselect-trigger-screen-reader-text')
  assert.equal(el.hidden, false)
  assert.equal(el.getAttribute('aria-hidden'), null)
  assert.equal(el.style.position, 'absolute')
  assert.equal(sel.triggerContentEl.getAttribute('aria-hidden'), 'true')
})

test('single: the chosen item\'s text, else the placeholder; custom trigger content changes nothing', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    placeholder: 'Pick one',
    createTriggerContentElFn: (ctx) => (ctx.chosenItem === undefined ? null : Object.assign(document.createElement('b'), { textContent: `** ${ctx.chosenItem}` })),
  })
  sel.setItems(['Japan', 'Peru'])
  assert.equal(srText(sel).textContent, 'Pick one')
  sel.setChosenItem('Peru')
  assert.equal(sel.triggerContentEl.textContent, '** Peru')
  assert.equal(srText(sel).textContent, 'Peru')
})

test('single: triggerContextToScreenReaderTextFn sets the text; null and a blank string fall back to the default', () => {
  let answer: string | null = null
  const seen: unknown[] = []
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    triggerContextToScreenReaderTextFn: (ctx) => { seen.push(ctx.chosenItem); return answer },
  })
  sel.setItems(['Japan', 'Peru'])
  sel.setChosenItem('Japan')
  assert.equal(srText(sel).textContent, 'Japan', 'null: the default')
  answer = '   '
  sel.rerender()
  assert.equal(srText(sel).textContent, 'Japan', 'blank: the default')
  answer = 'Country: Japan'
  sel.rerender()
  assert.equal(srText(sel).textContent, 'Country: Japan')
  assert.equal(sel.triggerContentEl.textContent, 'Japan', 'the screen keeps its own text')
  assert.equal(seen.at(-1), 'Japan')
})

test('multiple count mode: the screen shows the short count, the screen reader hears words', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', placeholder: 'Pick' })
  sel.setItems(ITEMS)
  assert.equal(srText(sel).textContent, 'Pick')
  sel.setChosenItems(ITEMS.slice(0, 3))
  assert.equal(sel.triggerContentEl.textContent, '3 / 74 selected')
  assert.equal(srText(sel).textContent, '3 of 74 selected')
  sel.chooseAll()
  assert.equal(srText(sel).textContent, 'All 74 selected')
})

test('multiple tags mode: the chosen texts, joined, in the chosen order; custom content keeps the mode default', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', triggerDisplay: 'tags' })
  sel.setItems(['TypeScript', 'Rust', 'Go'])
  sel.setChosenItems(['Rust', 'TypeScript'])
  assert.equal(srText(sel).textContent, 'Rust, TypeScript')
  const custom = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    triggerDisplay: 'tags',
    createTriggerContentElFn: () => Object.assign(document.createElement('i'), { textContent: 'custom' }),
  })
  custom.setItems(['TypeScript', 'Rust'])
  custom.setChosenItems(['TypeScript', 'Rust'])
  assert.equal(srText(custom).textContent, 'TypeScript, Rust')
})

test('multiple: triggerContextToScreenReaderTextFn receives the chosen items and the items', () => {
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    triggerContextToScreenReaderTextFn: (ctx) => `${ctx.chosenItems.join('+')} of ${ctx.items.length}`,
  })
  sel.setItems(['a', 'b', 'c'])
  sel.setChosenItems(['a', 'c'])
  assert.equal(srText(sel).textContent, 'a+c of 3')
})

test('zh-TW: the read-out count uses words and the items join with the ideographic comma', () => {
  const count = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', uiTranslationPack: zhTW })
  count.setItems(ITEMS)
  count.setChosenItems(ITEMS.slice(0, 3))
  assert.equal(count.triggerContentEl.textContent, '已選 3 / 74 項')
  assert.equal(srText(count).textContent, '已選 3 項，共 74 項')
  count.chooseAll()
  assert.equal(srText(count).textContent, '已選全部 74 項')
  const tags = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', triggerDisplay: 'tags', uiTranslationPack: zhTW })
  tags.setItems(['日本', '台灣'])
  tags.setChosenItems(['日本', '台灣'])
  assert.equal(srText(tags).textContent, '日本、台灣')
})

test('a setItems that changes the total refreshes the text, calling the setting once', () => {
  let calls = 0
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x', triggerContextToScreenReaderTextFn: () => { calls++; return null } })
  sel.setItems(ITEMS.slice(0, 10))
  sel.setChosenItems(ITEMS.slice(0, 3))
  assert.equal(srText(sel).textContent, '3 of 10 selected')
  calls = 0
  sel.setItems(ITEMS)
  assert.equal(srText(sel).textContent, '3 of 74 selected')
  assert.equal(calls, 1, 'once for a setItems that keeps the chosen items')
  calls = 0
  sel.setItems(ITEMS.slice(1))
  assert.equal(srText(sel).textContent, '2 of 73 selected')
  assert.equal(calls, 1, 'once for a setItems that drops a chosen item, which renders the whole trigger')
})

test('setUiTranslationPack rewrites the text', () => {
  const sel = new LLSelectMultiple<string>(mount(), { ariaLabel: 'x' })
  sel.setItems(ITEMS)
  sel.setChosenItems(ITEMS.slice(0, 3))
  sel.setUiTranslationPack(zhTW)
  assert.equal(srText(sel).textContent, '已選 3 項，共 74 項')
})

test('a computeTriggerScreenReaderText override wins over the setting and the default', () => {
  class Loud extends LLSelectSingle<string> {
    protected override computeTriggerScreenReaderText(): string {
      return `Value: ${super.computeTriggerScreenReaderText()}`
    }
  }
  const sel = new Loud(mount(), { ariaLabel: 'x', placeholder: 'none' })
  sel.setItems(['a'])
  assert.equal(srText(sel).textContent, 'Value: none')
  sel.setChosenItem('a')
  assert.equal(srText(sel).textContent, 'Value: a')
})

test('while the filter is active, the trigger button\'s name chain ends at the span', () => {
  const sel = new LLSelectMultiple<string>(mount(), { filterable: true, ariaLabelledBy: 'lbl', triggerDisplay: 'tags' })
  sel.setItems(['a', 'b'])
  sel.setChosenItems(['a', 'b'])
  assert.equal(sel.triggerEl.getAttribute('aria-labelledby'), `lbl ${sel.classIdMap.triggerScreenReaderTextId}`)
  assert.equal(srText(sel).textContent, 'a, b')
})

test('single: a setItems that keeps the chosen item calls the setting once', () => {
  let calls = 0
  const sel = new LLSelectSingle<string>(mount(), { ariaLabel: 'x', triggerContextToScreenReaderTextFn: () => { calls++; return null } })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('a')
  calls = 0
  sel.setItems(['a', 'b', 'c'])
  assert.equal(calls, 1)
  calls = 0
  sel.setItems(['b', 'c'])
  assert.equal(srText(sel).textContent, 'Please select', 'the dropped item leaves the placeholder')
  assert.equal(calls, 1, 'once for a setItems that drops the chosen item, which renders the whole trigger')
})

test('an override that skips super never inherits the lang of an earlier default text', () => {
  let own: string | null = null
  class Fixed extends LLSelectSingle<string> {
    protected override computeTriggerScreenReaderText(): string {
      return own ?? super.computeTriggerScreenReaderText()
    }
  }
  const sel = new Fixed(mount(), { ariaLabel: 'x', itemToLangFn: () => 'de' })
  sel.setItems(['Deutsch', 'English'])
  sel.setChosenItem('Deutsch')
  assert.equal(srText(sel).getAttribute('lang'), 'de')
  own = 'Deutsch' // the same text, but not the default's
  sel.setChosenItem('English')
  assert.equal(srText(sel).textContent, 'Deutsch')
  assert.equal(srText(sel).hasAttribute('lang'), false)
})

test('multiple: an override that skips super never inherits the lang of an earlier one-chip text', () => {
  let own: string | null = null
  class Fixed extends LLSelectMultiple<string> {
    protected override computeTriggerScreenReaderText(): string {
      return own ?? super.computeTriggerScreenReaderText()
    }
  }
  const sel = new Fixed(mount(), { ariaLabel: 'x', triggerDisplay: 'tags', itemToLangFn: (item) => (item === 'Deutsch' ? 'de' : 'en') })
  sel.setItems(['Deutsch', 'English'])
  sel.setChosenItems(['Deutsch'])
  assert.equal(srText(sel).getAttribute('lang'), 'de')
  own = 'Deutsch' // the same text, but not the default's
  sel.setChosenItems(['English'])
  assert.equal(srText(sel).textContent, 'Deutsch')
  assert.equal(srText(sel).hasAttribute('lang'), false)
})
