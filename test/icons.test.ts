import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import {
  chevronDownSvg,
  triangleDownSvg,
  checkSvg,
  checkboxSvg,
} from '../src/icons.js'

test('chevronDownSvg returns an SVG element with currentColor + aria-hidden', () => {
  setupDom()
  const svg = chevronDownSvg()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.getAttribute('aria-hidden'), 'true')
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
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
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
})

test('checkSvg returns an SVG element with currentColor + aria-hidden', () => {
  setupDom()
  const svg = checkSvg()
  assert.equal(svg.tagName.toLowerCase(), 'svg')
  assert.equal(svg.getAttribute('aria-hidden'), 'true')
  assert.equal(svg.querySelector('path')?.getAttribute('fill'), 'currentColor')
})

test('checkboxSvg draws different paths per state', () => {
  setupDom()
  const unchecked = checkboxSvg().querySelector('path')?.getAttribute('d')
  const checked = checkboxSvg({ state: 'checked' }).querySelector('path')?.getAttribute('d')
  const indeterminate = checkboxSvg({ state: 'indeterminate' }).querySelector('path')?.getAttribute('d')
  assert.ok(unchecked && checked && indeterminate)
  assert.notEqual(unchecked, checked)
  assert.notEqual(checked, indeterminate)
  assert.notEqual(unchecked, indeterminate)
})

test('checkboxSvg defaults to unchecked and honors size', () => {
  setupDom()
  const def = checkboxSvg().querySelector('path')?.getAttribute('d')
  const explicit = checkboxSvg({ state: 'unchecked' }).querySelector('path')?.getAttribute('d')
  assert.equal(def, explicit)
  assert.equal(checkboxSvg({ size: 20 }).getAttribute('width'), '20')
})
