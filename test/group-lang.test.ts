import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// groupKeyToLangFn: each group's BCP 47 code as the `lang` attribute of the
// group container, the element that carries the group's accessible name.
// Contract: docs/llm/DESIGN.md "Item language".

interface Lang { code: string; name: string; group: string }
const LANGS: Lang[] = [
  { code: 'de', name: 'Deutsch', group: 'de' },
  { code: 'de-AT', name: 'Deutsch (Osterreich)', group: 'de' },
  { code: 'fr', name: 'Francais', group: 'fr' },
  { code: 'xx', name: 'Unknown', group: 'other' },
]
const GROUP_LANG: Record<string, string | null> = { de: 'de', fr: 'fr', other: null }
const groupLang = (key: unknown): string | null => GROUP_LANG[String(key)] ?? null

function mount(): HTMLElement {
  setupDom('<!doctype html><html lang="en"><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

type AnySel = { popupListEl: HTMLElement; classIdMap: { groupLabelClass: string } }

function groups(sel: AnySel): HTMLElement[] {
  return [...sel.popupListEl.querySelectorAll<HTMLElement>('[role="group"]')]
}

function labelOf(sel: AnySel, group: HTMLElement): HTMLElement {
  return group.querySelector<HTMLElement>(`.${sel.classIdMap.groupLabelClass}`)!
}

function rowsOf(group: HTMLElement): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>('[role="option"]')]
}

test('default: the library writes no lang on any group', () => {
  const sel = new LLSelectSingle<Lang>(mount(), { itemToStringFn: (l) => l.name, itemToGroupKeyFn: (l) => l.group })
  sel.setItems(LANGS)
  sel.open()
  assert.equal(groups(sel).length, 3)
  assert.ok(groups(sel).every(g => !g.hasAttribute('lang') && !labelOf(sel, g).hasAttribute('lang')))
})

test('the container carries the group code; the label and the rows inherit it; a null code writes nothing', () => {
  const sel = new LLSelectSingle<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToGroupKeyFn: (l) => l.group,
    groupKeyToLangFn: groupLang,
  })
  sel.setItems(LANGS)
  sel.open()
  const gs = groups(sel)
  assert.deepEqual(gs.map(g => g.getAttribute('aria-label')), ['de', 'fr', 'other'])
  assert.deepEqual(gs.map(g => g.getAttribute('lang')), ['de', 'fr', null])
  assert.ok(gs.every(g => !labelOf(sel, g).hasAttribute('lang')), 'the aria-hidden label inherits, nothing of its own')
  assert.ok(gs.every(g => rowsOf(g).every(r => !r.hasAttribute('lang'))), 'rows inherit while itemToLangFn is unset')
})

test('rows keep their own code from itemToLangFn inside a group that has one', () => {
  const sel = new LLSelectSingle<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToLangFn: (l) => l.code,
    itemToGroupKeyFn: (l) => l.group,
    groupKeyToLangFn: groupLang,
  })
  sel.setItems(LANGS)
  sel.open()
  const de = groups(sel)[0]!
  assert.equal(de.getAttribute('lang'), 'de')
  assert.deepEqual(rowsOf(de).map(r => r.getAttribute('lang')), ['de', 'de-AT'])
})

test('an empty string writes lang="", HTML\'s language unknown', () => {
  const sel = new LLSelectSingle<Lang>(mount(), { itemToStringFn: (l) => l.name, itemToGroupKeyFn: (l) => l.group, groupKeyToLangFn: () => '' })
  sel.setItems(LANGS)
  sel.open()
  assert.equal(groups(sel)[0]!.getAttribute('lang'), '')
})

test('custom label content: the app element is untouched and its own lang wins', () => {
  const sel = new LLSelectSingle<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToGroupKeyFn: (l) => l.group,
    groupKeyToLangFn: groupLang,
    createGroupLabelContentElFn: (k) => { const s = document.createElement('span'); s.lang = 'xx'; s.textContent = String(k); return s },
  })
  sel.setItems(LANGS)
  sel.open()
  const de = groups(sel)[0]!
  assert.equal(de.getAttribute('lang'), 'de')
  assert.equal(labelOf(sel, de).querySelector('span')!.getAttribute('lang'), 'xx')
})

test('a changed answer shows after rerender(): groups are rebuilt per render', () => {
  let active = true
  const sel = new LLSelectMultiple<Lang>(mount(), {
    itemToStringFn: (l) => l.name,
    itemToGroupKeyFn: (l) => l.group,
    groupKeyToLangFn: (k) => active ? groupLang(k) : null,
  })
  sel.setItems(LANGS)
  sel.open()
  assert.equal(groups(sel)[0]!.getAttribute('lang'), 'de')
  active = false
  sel.rerender()
  assert.ok(groups(sel).every(g => !g.hasAttribute('lang')))
})
