import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { chevronDownSvg, triangleDownSvg } from '../src/icons.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('combobox starts with data-state="closed"', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.comboboxEl.getAttribute('data-state'), 'closed')
})

test('combobox data-state toggles open/closed', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setOptions(['a'])
  sel.open()
  assert.equal(sel.comboboxEl.getAttribute('data-state'), 'open')
  sel.close()
  assert.equal(sel.comboboxEl.getAttribute('data-state'), 'closed')
})

test('combobox has content + indicator slots', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.ok(sel.contentEl)
  assert.ok(sel.contentEl.classList.contains('llselect-combobox-content'))
  const indicator = sel.comboboxEl.querySelector('.llselect-combobox-indicator')
  assert.ok(indicator)
})

test('renderIndicator default null: indicator slot is empty', () => {
  const sel = new LLSelectSingle<string>(mount())
  const indicator = sel.comboboxEl.querySelector('.llselect-combobox-indicator')
  assert.ok(indicator)
  assert.equal(indicator.children.length, 0)
})

test('renderIndicator returning an element appends it to the indicator slot', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderIndicator: () => {
      const el = document.createElement('span')
      el.id = 'my-arrow'
      el.textContent = '▼'  // black down-pointing triangle
      return el
    },
  })
  const indicator = sel.comboboxEl.querySelector('.llselect-combobox-indicator')
  assert.ok(indicator)
  assert.equal(indicator.children.length, 1)
  assert.equal(indicator.querySelector('#my-arrow')?.textContent, '▼')
})

test('renderIndicator is invoked with isOpen state on open/close', () => {
  const calls: Array<boolean> = []
  const sel = new LLSelectSingle<string>(mount(), {
    renderIndicator: ({ isOpen }) => {
      calls.push(isOpen)
      return null
    },
  })
  sel.setOptions(['a', 'b'])
  // calls so far: [false] from constructor refreshIndicator
  sel.open()
  // open calls refreshIndicator -> renderIndicator with isOpen=true
  sel.close()
  // close calls refreshIndicator -> renderIndicator with isOpen=false
  assert.deepEqual(calls, [false, true, false])
})

test('renderIndicator returning null leaves the slot empty', () => {
  let returnNull = true
  const sel = new LLSelectSingle<string>(mount(), {
    renderIndicator: () => {
      return returnNull ? null : document.createElement('span')
    },
  })
  const indicator = sel.comboboxEl.querySelector('.llselect-combobox-indicator')!
  assert.equal(indicator.children.length, 0)
  returnNull = false
  sel.setOptions(['a'])
  sel.open()
  assert.equal(indicator.children.length, 1)
})

test('contentEl receives placeholder/chosen text (indicator slot preserved)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderIndicator: () => {
      const el = document.createElement('span')
      el.className = 'survive'
      el.textContent = 'x'
      return el
    },
  })
  sel.setOptions(['a'])
  sel.setChosen('a')
  assert.equal(sel.contentEl.textContent, 'a')
  // Indicator slot must still be present after the content change.
  assert.ok(sel.comboboxEl.querySelector('.survive'))
})

// --- icon helpers --------------------------------------------------

test('chevronDownSvg returns an SVG element with currentColor', () => {
  setupDom()
  const svg = chevronDownSvg()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.getAttribute('aria-hidden'), 'true')
  const path = svg.querySelector('path')
  assert.ok(path)
  assert.equal(path.getAttribute('fill'), 'currentColor')
})

test('chevronDownSvg honors size option', () => {
  setupDom()
  const svg = chevronDownSvg({ size: 24 })
  assert.equal(svg.getAttribute('width'), '24')
  assert.equal(svg.getAttribute('height'), '24')
})

test('triangleDownSvg returns an SVG element with currentColor', () => {
  setupDom()
  const svg = triangleDownSvg()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  const path = svg.querySelector('path')
  assert.ok(path)
  assert.equal(path.getAttribute('fill'), 'currentColor')
})
