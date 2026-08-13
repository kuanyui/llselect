import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

// The uib-tooltip / select2 breakage class: showing a popup inserts or removes
// elements around the trigger, flipping sibling-dependent CSS in the host
// layout (:nth-child, .btn + .btn, :first/last-child). llselect's contract:
// nothing is EVER inserted outside the caller's root, and the root's child
// list is invariant from construction to destroy - open/close only toggles the
// popup between hidden and out-of-flow (position: fixed). See DESIGN.md
// "In-place popup (no body portal)".

function assertChildrenUnchanged(el: HTMLElement, snapshot: readonly Element[]): void {
  const now = [...el.children]
  assert.equal(now.length, snapshot.length)
  now.forEach((child, i) => { assert.equal(child, snapshot[i]) })
}

test('open/close never mutates DOM structure outside the popup (host sibling-safety)', () => {
  setupDom('<!doctype html><html><body><div id="group"><button>prev</button><div id="mount"></div><button>next</button></div></body></html>')
  const group = document.getElementById('group')
  const mount = document.getElementById('mount')
  assert.ok(group)
  assert.ok(mount)
  const sel = new LLSelectSingle<string>(mount)
  sel.setItems(['a', 'b', 'c'])

  const groupChildren = [...group.children]
  const bodyCount = document.body.childElementCount
  const rootChildren = [...mount.children]
  // all library-built root children exist from construction: trigger + value mirror + popup
  assert.equal(rootChildren.length, 3)

  sel.open()
  assertChildrenUnchanged(group, groupChildren)
  assert.equal(document.body.childElementCount, bodyCount) // nothing portaled out
  assertChildrenUnchanged(mount, rootChildren)
  assert.equal(sel.popupEl.hidden, false)
  assert.equal(sel.popupEl.style.position, 'fixed') // visible popup is out-of-flow

  sel.close()
  assertChildrenUnchanged(group, groupChildren)
  assertChildrenUnchanged(mount, rootChildren)
  assert.equal(sel.popupEl.hidden, true)
})
