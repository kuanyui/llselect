// Type-level pins for QUALITY-83: the plain constructor form infers T from a
// typed callback. `npm run test:compile` type-checks this file, so a wrong
// inference fails the test step before any test runs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'
import type { LLSelectMultipleSettings, LLSelectSettingsInputOf } from '../src/index.js'

interface User { name: string }

function expectType<T>(_value: T): void {}

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('QUALITY-83: T is inferred from a typed callback, stays unknown without one, explicit T still works', () => {
  const byString = new LLSelectSingle(mount(), { itemToStringFn: (u: User) => u.name })
  expectType<User | undefined>(byString.getChosenItem())
  const byChange = new LLSelectMultiple(mount(), { onChange: (items: readonly User[]) => { void items } })
  expectType<readonly User[]>(byChange.getChosenItems())
  const byCompare = new LLSelectSingle(mount(), { compareFn: (a: User, b: User) => a.name === b.name })
  expectType<User | undefined>(byCompare.getChosenItem())
  const bare = new LLSelectSingle(mount(), { ariaLabel: 'x' })
  // @ts-expect-error - no callback: T stays unknown, which is not a User
  expectType<User | undefined>(bare.getChosenItem())
  const explicit = new LLSelectSingle<string>(mount(), { ariaLabel: 'x' })
  expectType<string | undefined>(explicit.getChosenItem())
  assert.equal(explicit.getChosenItem(), undefined)
})

interface TreeSettings extends LLSelectMultipleSettings<User, string> { depth: number }

class Tree extends LLSelectMultiple<User, string, TreeSettings> {
  constructor(el: HTMLElement, settings?: LLSelectSettingsInputOf<TreeSettings>) {
    super(el, { itemToStringFn: (u) => u.name, ...settings }, { depth: settings?.depth ?? 1 })
  }
  public depth(): number { return this.settings.depth }
}

test('QUALITY-83: the subclass form (the S channel) still compiles and resolves its own settings', () => {
  const tree = new Tree(mount())
  assert.equal(tree.depth(), 1)
})
