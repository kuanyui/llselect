import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLTreeMultipleSelect, type LLTreeNode } from '../demo/subclass/tree-select.js'

// Pins the tree-select SUBCLASS example (demo/subclass/tree-select.ts): the
// worked proof of the typed subclassSettings channel and of the cached
// getVisibleItems override pattern.

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  return document.getElementById('mount')!
}

/** Small fixture. Branches: Fruits (Citrus(Orange, Lemon), Strawberry); Veg (Carrot). */
function fixture() {
  const orange: LLTreeNode = { text: 'Orange' }
  const lemon: LLTreeNode = { text: 'Lemon' }
  const citrus: LLTreeNode = { text: 'Citrus', children: [orange, lemon] }
  const strawberry: LLTreeNode = { text: 'Strawberry' }
  const fruits: LLTreeNode = { text: 'Fruits', children: [citrus, strawberry] }
  const carrot: LLTreeNode = { text: 'Carrot' }
  const veg: LLTreeNode = { text: 'Vegetables', children: [carrot] }
  return { roots: [fruits, veg], fruits, citrus, orange, lemon, strawberry, veg, carrot }
}

/** Rendered row texts (the caret / folder are font icons, no text). */
function rowTexts(sel: LLTreeMultipleSelect): string[] {
  return Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .map(el => el.textContent ?? '')
}

test('defaultExpandDepth 1 (default): roots expanded, grandchildren hidden', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  sel.open()
  assert.deepEqual(rowTexts(sel), ['Fruits', 'Citrus', 'Strawberry', 'Vegetables', 'Carrot'])
})

test('defaultExpandDepth 0: only the roots list (the typed subclass setting)', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount(), { defaultExpandDepth: 0 })
  sel.setTreeItems(f.roots)
  sel.open()
  assert.deepEqual(rowTexts(sel), ['Fruits', 'Vegetables'])
})

test('caret click expands and collapses without touching the chosen set', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  sel.open()
  const citrusRow = Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .find(el => el.textContent?.includes('Citrus'))!
  citrusRow.querySelector<HTMLElement>('.tree-caret')!.click()
  assert.deepEqual(rowTexts(sel), ['Fruits', 'Citrus', 'Orange', 'Lemon', 'Strawberry', 'Vegetables', 'Carrot'])
  assert.deepEqual(sel.getChosenItems(), [])
  Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .find(el => el.textContent?.includes('Citrus'))!
    .querySelector<HTMLElement>('.tree-caret')!.click()
  assert.deepEqual(rowTexts(sel), ['Fruits', 'Citrus', 'Strawberry', 'Vegetables', 'Carrot'])
})

test('branch activation toggles its leaf subtree; the model holds leaves only', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  sel.open()
  const fruitsRow = () => Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .find(el => el.textContent?.includes('Fruits'))!
  fruitsRow().click()
  assert.deepEqual(sel.getChosenItems().map(n => n.text).sort(), ['Lemon', 'Orange', 'Strawberry'])
  assert.equal(fruitsRow().getAttribute('data-tree-chosen'), 'checked')
  fruitsRow().click()
  assert.deepEqual(sel.getChosenItems(), [])
  assert.equal(fruitsRow().getAttribute('data-tree-chosen'), 'unchecked')
})

test('a leaf toggle refreshes the ancestor tri-state to indeterminate', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  sel.open()
  Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .find(el => el.textContent?.includes('Strawberry'))!.click()
  const fruitsRow = Array.from(sel.popupListEl.querySelectorAll<HTMLElement>(`.${sel.classIdMap.itemClass}`))
    .find(el => el.textContent?.includes('Fruits'))!
  assert.equal(fruitsRow.getAttribute('data-tree-chosen'), 'indeterminate')
})

test('the flatten is cached: same reference between calls, a new one after expand', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  const first = sel.getVisibleItems()
  assert.equal(sel.getVisibleItems(), first)
  sel.toggleExpanded(f.citrus)
  assert.notEqual(sel.getVisibleItems(), first)
})

test('a filter query renders the flat matching subset', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount(), { filterable: true })
  sel.setTreeItems(f.roots)
  sel.open()
  const input = sel.popupEl.querySelector<HTMLInputElement>(`.${sel.classIdMap.filterInputClass}`)!
  input.value = 'straw'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  assert.deepEqual(rowTexts(sel), ['Strawberry'])
})

test('inherited bulk APIs keep the model leaves-only', () => {
  const f = fixture()
  const sel = new LLTreeMultipleSelect(mount())
  sel.setTreeItems(f.roots)
  sel.chooseAll()
  assert.deepEqual(sel.getChosenItems().map(n => n.text).sort(), ['Carrot', 'Lemon', 'Orange', 'Strawberry'])
  sel.setChosenItems([f.fruits, f.orange])
  assert.deepEqual(sel.getChosenItems().map(n => n.text), ['Orange'], 'a branch handed to setChosenItems must be dropped')
  sel.unchooseAll()
  sel.toggleItem(f.citrus)
  assert.deepEqual(sel.getChosenItems().map(n => n.text).sort(), ['Lemon', 'Orange'], 'toggleItem(branch) must toggle the subtree')
})
