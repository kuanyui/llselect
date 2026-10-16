import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// itemToLangFn: each item's BCP 47 code as the `lang` attribute where the
// library shows that item's text. Contract: docs/llm/DESIGN.md "Item language".

interface Lang { code: string | null; name: string }
const LANGS: Lang[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: null, name: 'Unknown' },
]
const EN = LANGS[0]!
const DE = LANGS[1]!
const UNKNOWN = LANGS[2]!

function mount(): HTMLElement {
  setupDom('<!doctype html><html lang="en"><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

type AnySel = { popupListEl: HTMLElement; triggerEl: HTMLElement; triggerContentEl: HTMLElement; classIdMap: { triggerValueId: string; tagClass: string; tagTextClass: string; tagRemoveButtonClass: string } }

function rows(sel: AnySel): HTMLElement[] {
  return [...sel.popupListEl.querySelectorAll<HTMLElement>('[role="option"]')]
}

function mirror(sel: AnySel): HTMLElement {
  return document.getElementById(sel.classIdMap.triggerValueId)!
}

test('default: the library writes no lang anywhere', () => {
  const sel = new LLSelectSingle<Lang>(mount(), { itemToStringFn: (l) => l.name })
  sel.setItems(LANGS)
  sel.setChosenItem(DE)
  sel.open()
  assert.ok(rows(sel).every(r => !r.hasAttribute('lang')))
  assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
  assert.equal(mirror(sel).hasAttribute('lang'), false)
})

test('single: rows carry the item lang in both content branches; the chosen item moves it onto the trigger text and the value mirror', () => {
  for (const custom of [false, true]) {
    const sel = new LLSelectSingle<Lang>(mount(), {
      itemToStringFn: (l) => l.name,
      itemToLangFn: (l) => l.code,
      createPopupListItemContentElFn: custom ? (l) => { const s = document.createElement('span'); s.textContent = l.name; return s } : null,
    })
    sel.setItems(LANGS)
    sel.open()
    assert.deepEqual(rows(sel).map(r => r.getAttribute('lang')), ['en', 'de', null], `custom content: ${custom}`)
    sel.setChosenItem(DE)
    assert.equal(sel.triggerContentEl.getAttribute('lang'), 'de')
    assert.equal(mirror(sel).getAttribute('lang'), 'de')
    sel.setChosenItem(UNKNOWN) // a null code: no attribute, the page language applies
    assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
    assert.equal(mirror(sel).hasAttribute('lang'), false)
    sel.setChosenItem(EN)
    sel.setChosenItem(undefined) // the placeholder is interface text
    assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
    assert.equal(mirror(sel).hasAttribute('lang'), false)
  }
})

test('single: with custom trigger content the slot and the mirror carry the lang; the app element is untouched and its own lang wins', () => {
  const sel = new LLSelectSingle<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    createTriggerContentElFn: (ctx) => { const s = document.createElement('span'); s.lang = 'xx'; s.textContent = ctx.chosenItem?.name ?? 'pick'; return s },
  })
  sel.setItems(LANGS)
  sel.setChosenItem(DE)
  assert.equal(sel.triggerContentEl.getAttribute('lang'), 'de', 'the library-owned slot carries the code')
  assert.equal(mirror(sel).getAttribute('lang'), 'de')
  assert.equal(sel.triggerContentEl.querySelector('span')!.getAttribute('lang'), 'xx', 'never touched, and nearer, so it wins')
})

test('an empty string writes lang="", HTML\'s language unknown', () => {
  const sel = new LLSelectSingle<Lang>(mount(), { itemToStringFn: (l) => l.name, itemToLangFn: () => '' })
  sel.setItems(LANGS)
  sel.open()
  assert.equal(rows(sel)[0]!.getAttribute('lang'), '')
})

test('multiple: a chip wraps its text in a span that carries the lang; the remove button and the value mirror do not; custom chip content carries it', () => {
  const sel = new LLSelectMultiple<Lang>(mount(), {
    triggerDisplay: 'tags',
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
  })
  sel.setItems(LANGS)
  sel.setChosenItems([EN, DE, UNKNOWN])
  const chips = [...sel.triggerEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.tagClass}`)]
  assert.equal(chips.length, 3)
  const text = (chip: HTMLElement) => chip.querySelector<HTMLElement>(`.${sel.classIdMap.tagTextClass}`)!
  assert.equal(text(chips[1]!).textContent, 'Deutsch')
  assert.equal(text(chips[1]!).getAttribute('lang'), 'de')
  assert.equal(text(chips[2]!).hasAttribute('lang'), false)
  assert.equal(chips[1]!.hasAttribute('lang'), false, 'the chip itself carries none, so the remove button inherits the page language')
  assert.equal(chips[1]!.querySelector(`.${sel.classIdMap.tagRemoveButtonClass}`)!.hasAttribute('lang'), false)
  assert.equal(mirror(sel).hasAttribute('lang'), false, 'the joined texts are mixed language')
  const custom = new LLSelectMultiple<Lang>(mount(), {
    triggerDisplay: 'tags',
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    createTagContentElFn: (l) => { const b = document.createElement('b'); b.textContent = l.name; return b },
  })
  custom.setItems(LANGS)
  custom.setChosenItems([DE])
  assert.equal(custom.triggerEl.querySelector('b')!.getAttribute('lang'), 'de')
})

test('multiple: the count summary carries no lang', () => {
  const sel = new LLSelectMultiple<Lang>(mount(), { itemToStringFn: (l) => l.name, itemToLangFn: (l) => l.code })
  sel.setItems(LANGS)
  sel.setChosenItems([DE])
  assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
  assert.equal(mirror(sel).hasAttribute('lang'), false)
})

test('default settings never strip a lang the app set on its own chip content', () => {
  const sel = new LLSelectMultiple<Lang>(mount(), {
    triggerDisplay: 'tags',
    itemToStringFn: (l) => l.name,
    createTagContentElFn: (l) => { const b = document.createElement('b'); b.lang = 'xx'; b.textContent = l.name; return b },
  })
  sel.setItems(LANGS)
  sel.setChosenItems([DE])
  assert.equal(sel.triggerEl.querySelector('b')!.getAttribute('lang'), 'xx')
})

test('single: custom trigger content for one state and library text for another: the slot regains and loses the lang', () => {
  const sel = new LLSelectSingle<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    createTriggerContentElFn: (ctx) => {
      if (ctx.chosenItem !== undefined) { return null }
      const s = document.createElement('span')
      s.textContent = 'pick'
      return s
    },
  })
  sel.setItems(LANGS)
  assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
  sel.setChosenItem(DE) // the library's own text: the slot gains the code
  assert.equal(sel.triggerContentEl.getAttribute('lang'), 'de')
  sel.setChosenItem(undefined) // custom content again: the slot loses it
  assert.equal(sel.triggerContentEl.hasAttribute('lang'), false)
})

test('a changed answer for the same item shows after rerender(): no stale lang on rows, the trigger or the chips', () => {
  let active = true
  const single = new LLSelectSingle<Lang>(mount(), { itemToStringFn: (l) => l.name, itemToLangFn: (l) => active ? l.code : null })
  single.setItems(LANGS)
  single.setChosenItem(DE)
  single.open()
  assert.equal(rows(single)[1]!.getAttribute('lang'), 'de')
  active = false
  single.rerender()
  assert.ok(rows(single).every(r => !r.hasAttribute('lang')))
  assert.equal(single.triggerContentEl.hasAttribute('lang'), false)
  assert.equal(mirror(single).hasAttribute('lang'), false)
  active = true
  const multi = new LLSelectMultiple<Lang>(mount(), { triggerDisplay: 'tags', itemToStringFn: (l) => l.name, itemToLangFn: (l) => active ? l.code : null })
  multi.setItems(LANGS)
  multi.setChosenItems([DE])
  const chipText = () => multi.triggerEl.querySelector<HTMLElement>(`.${multi.classIdMap.tagTextClass}`)!
  assert.equal(chipText().getAttribute('lang'), 'de')
  active = false
  multi.rerender()
  assert.equal(chipText().hasAttribute('lang'), false)
})

test('multiple: option rows carry the item lang; the choose-all row, a group label and an action row carry none', () => {
  const sel = new LLSelectMultiple<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    chooseAllRow: true,
    itemToGroupKeyFn: (l) => l.code === null ? 'other' : 'known',
    popupListTrailingActionRows: [{ textFn: () => 'cmd', onActivate: () => {} }],
  })
  sel.setItems(LANGS)
  sel.open()
  const itemRows = [...sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.popupListRowClass}:not(.${sel.classIdMap.chooseAllRowClass}):not(.${sel.classIdMap.popupListActionRowClass})`)]
  assert.deepEqual(itemRows.map(r => r.getAttribute('lang')), ['en', 'de', null])
  assert.equal(sel.popupListEl.querySelector(`.${sel.classIdMap.chooseAllRowClass}`)!.hasAttribute('lang'), false)
  assert.equal(sel.popupListEl.querySelector(`.${sel.classIdMap.groupLabelClass}`)!.hasAttribute('lang'), false)
  assert.equal(sel.popupListEl.querySelector(`.${sel.classIdMap.popupListActionRowClass}`)!.hasAttribute('lang'), false)
})

test('custom chip content: the item code overwrites a lang the app set, and a memoized element keeps the code the library wrote earlier', () => {
  let active = true
  const memo = new Map<Lang, HTMLElement>()
  const sel = new LLSelectMultiple<Lang>(mount(), {
    triggerDisplay: 'tags',
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => active ? l.code : null,
    createTagContentElFn: (l) => {
      let b = memo.get(l)
      if (!b) { b = document.createElement('b'); b.lang = 'xx'; b.textContent = l.name; memo.set(l, b) }
      return b
    },
  })
  sel.setItems(LANGS)
  sel.setChosenItems([DE])
  assert.equal(sel.triggerEl.querySelector('b')!.getAttribute('lang'), 'de', 'the item code overwrites the app value')
  active = false
  sel.rerender()
  assert.equal(sel.triggerEl.querySelector('b')!.getAttribute('lang'), 'de', 'accepted limit: the library never removes from app-owned content')
})

test('multiple tags mode: the value mirror carries the code only while exactly one chip shows', () => {
  const sel = new LLSelectMultiple<Lang>(mount(), { triggerDisplay: 'tags', itemToStringFn: (l) => l.name, itemToLangFn: (l) => l.code })
  sel.setItems(LANGS)
  sel.setChosenItems([DE])
  assert.equal(mirror(sel).getAttribute('lang'), 'de')
  sel.setChosenItems([DE, EN])
  assert.equal(mirror(sel).hasAttribute('lang'), false, 'joined texts are mixed-language')
  sel.setChosenItems([UNKNOWN])
  assert.equal(mirror(sel).hasAttribute('lang'), false, 'a null code writes nothing')
  sel.setChosenItems([])
  assert.equal(mirror(sel).hasAttribute('lang'), false)
  const custom = new LLSelectMultiple<Lang>(mount(), {
    triggerDisplay: 'tags',
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    createTriggerContentElFn: () => { const s = document.createElement('span'); s.textContent = 'custom'; return s },
  })
  custom.setItems(LANGS)
  custom.setChosenItems([DE])
  assert.equal(mirror(custom).hasAttribute('lang'), false, 'custom trigger content: the mirror holds the count summary')
})
