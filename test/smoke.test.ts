import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LLSELECT_VERSION } from '../src/index.js'

test('library exposes a version string', () => {
  assert.equal(typeof LLSELECT_VERSION, 'string')
  assert.ok(LLSELECT_VERSION.length > 0)
})

test('LLSELECT_VERSION matches package.json version (dual-source guard)', () => {
  // npm scripts run from the repo root, so cwd resolves package.json reliably
  // (the compiled test lives in .build/, so a relative path would not).
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version: string }
  assert.equal(LLSELECT_VERSION, pkg.version)
})

test('jsdom is reachable from tests', async () => {
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('<!doctype html><html><body><div id="x">hi</div></body></html>')
  const doc = dom.window.document
  assert.equal(doc.getElementById('x')?.textContent, 'hi')
})
