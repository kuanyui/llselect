import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import {
  createChevronDownSvgEl,
  createTriangleDownSvgEl,
  createCheckSvgEl,
  createOutlinedCheckboxSvgEl,
  createFilledCheckboxSvgEl,
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

test('createOutlinedCheckboxSvgEl draws different paths per state', () => {
  setupDom()
  const unchecked = createOutlinedCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const checked = createOutlinedCheckboxSvgEl({ state: 'checked' }).querySelector('path')?.getAttribute('d')
  const indeterminate = createOutlinedCheckboxSvgEl({ state: 'indeterminate' }).querySelector('path')?.getAttribute('d')
  assert.ok(unchecked && checked && indeterminate)
  assert.notEqual(unchecked, checked)
  assert.notEqual(checked, indeterminate)
  assert.notEqual(unchecked, indeterminate)
})

test('createOutlinedCheckboxSvgEl accepts the chosen-state vocabulary (none/some/all)', () => {
  setupDom()
  const pathOf = (state: 'none' | 'some' | 'all' | 'unchecked' | 'checked' | 'indeterminate') =>
    createOutlinedCheckboxSvgEl({ state }).querySelector('path')?.getAttribute('d')
  assert.equal(pathOf('none'), pathOf('unchecked'))
  assert.equal(pathOf('some'), pathOf('indeterminate'))
  assert.equal(pathOf('all'), pathOf('checked'))
})

test('createOutlinedCheckboxSvgEl defaults to unchecked and honors size', () => {
  setupDom()
  const def = createOutlinedCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const explicit = createOutlinedCheckboxSvgEl({ state: 'unchecked' }).querySelector('path')?.getAttribute('d')
  assert.equal(def, explicit)
  assert.equal(createOutlinedCheckboxSvgEl({ size: 20 }).getAttribute('width'), '20')
})

test('createFilledCheckboxSvgEl draws different paths per state', () => {
  setupDom()
  const unchecked = createFilledCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const checked = createFilledCheckboxSvgEl({ state: 'checked' }).querySelector('path')?.getAttribute('d')
  const indeterminate = createFilledCheckboxSvgEl({ state: 'indeterminate' }).querySelector('path')?.getAttribute('d')
  assert.ok(unchecked && checked && indeterminate)
  assert.notEqual(unchecked, checked)
  assert.notEqual(checked, indeterminate)
  assert.notEqual(unchecked, indeterminate)
})

test('createFilledCheckboxSvgEl accepts the chosen-state vocabulary (none/some/all)', () => {
  setupDom()
  const pathOf = (state: 'none' | 'some' | 'all' | 'unchecked' | 'checked' | 'indeterminate') =>
    createFilledCheckboxSvgEl({ state }).querySelector('path')?.getAttribute('d')
  assert.equal(pathOf('none'), pathOf('unchecked'))
  assert.equal(pathOf('some'), pathOf('indeterminate'))
  assert.equal(pathOf('all'), pathOf('checked'))
})

test('createFilledCheckboxSvgEl shares unchecked with the outline icon, differs elsewhere', () => {
  setupDom()
  const outline = (state: 'unchecked' | 'checked' | 'indeterminate') =>
    createOutlinedCheckboxSvgEl({ state }).querySelector('path')?.getAttribute('d')
  const filled = (state: 'unchecked' | 'checked' | 'indeterminate') =>
    createFilledCheckboxSvgEl({ state }).querySelector('path')?.getAttribute('d')
  assert.equal(filled('unchecked'), outline('unchecked'))
  assert.notEqual(filled('checked'), outline('checked'))
  assert.notEqual(filled('indeterminate'), outline('indeterminate'))
})

test('createFilledCheckboxSvgEl defaults to unchecked and honors size', () => {
  setupDom()
  const def = createFilledCheckboxSvgEl().querySelector('path')?.getAttribute('d')
  const explicit = createFilledCheckboxSvgEl({ state: 'unchecked' }).querySelector('path')?.getAttribute('d')
  assert.equal(def, explicit)
  assert.equal(createFilledCheckboxSvgEl({ size: 20 }).getAttribute('width'), '20')
})
