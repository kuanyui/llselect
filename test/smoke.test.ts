import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LLSELECT_VERSION } from '../src/index.js'

test('library exposes a version string', () => {
  assert.equal(typeof LLSELECT_VERSION, 'string')
  assert.ok(LLSELECT_VERSION.length > 0)
})

test('jsdom is reachable from tests', async () => {
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('<!doctype html><html><body><div id="x">hi</div></body></html>')
  const doc = dom.window.document
  assert.equal(doc.getElementById('x')?.textContent, 'hi')
})
