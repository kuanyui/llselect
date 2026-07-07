import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import {
  createChevronDownSvgEl,
  createTriangleDownSvgEl,
  createCheckSvgEl,
  createCheckboxSvgEl,
} from '../src/icons.js'

test('createChevronDownSvgEl returns an SVG element with currentColor + aria-hidden', () => {
  setupDom()
  const svg = createChevronDownSvgEl()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.getAttribute('aria-hidden'), 'true')
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
})

test('createChevronDownSvgEl honors size option', () => {
  setupDom()
  const svg = createChevronDownSvgEl({ size: 24 })
  assert.equal(svg.getAttribute('width'), '24')
  assert.equal(svg.getAttribute('height'), '24')
})

test('createTriangleDownSvgEl returns an SVG element with currentColor', () => {
  setupDom()
  const svg = createTriangleDownSvgEl()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
})

test('createCheckSvgEl returns an SVG element with currentColor + aria-hidden', () => {
  setupDom()
  const svg = createCheckSvgEl()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.getAttribute('aria-hidden'), 'true')
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
})

test('createCheckboxSvgEl draws different paths per state', () => {
  setupDom()
  const unchecked = createCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const checked = createCheckboxSvgEl({ state: 'checked' }).querySelector('path')?.getAttribute('d')
  const indeterminate = createCheckboxSvgEl({ state: 'indeterminate' }).querySelector('path')?.getAttribute('d')
  assert.ok(unchecked && checked && indeterminate)
  assert.notEqual(unchecked, checked)
  assert.notEqual(checked, indeterminate)
  assert.notEqual(unchecked, indeterminate)
})

test('createCheckboxSvgEl accepts the chosen-state vocabulary (none/some/all)', () => {
  setupDom()
  const pathOf = (state: 'none' | 'some' | 'all' | 'unchecked' | 'checked' | 'indeterminate') =>
    createCheckboxSvgEl({ state }).querySelector('path')?.getAttribute('d')
  assert.equal(pathOf('none'), pathOf('unchecked'))
  assert.equal(pathOf('some'), pathOf('indeterminate'))
  assert.equal(pathOf('all'), pathOf('checked'))
})

test('createCheckboxSvgEl defaults to unchecked and honors size', () => {
  setupDom()
  const def = createCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const explicit = createCheckboxSvgEl({ state: 'unchecked' }).querySelector('path')?.getAttribute('d')
  assert.equal(def, explicit)
  assert.equal(createCheckboxSvgEl({ size: 20 }).getAttribute('width'), '20')
})
