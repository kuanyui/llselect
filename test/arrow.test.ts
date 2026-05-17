import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'

function mount(): HTMLElement {
  setupDom('<!doctype html><html><body><div id="mount"></div></body></html>')
  const el = document.getElementById('mount')
  assert.ok(el)
  return el
}

test('trigger starts with data-state="closed"', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.equal(sel.triggerEl.getAttribute('data-state'), 'closed')
})

test('trigger data-state toggles open/closed', () => {
  const sel = new LLSelectSingle<string>(mount())
  sel.setItems(['a'])
  sel.open()
  assert.equal(sel.triggerEl.getAttribute('data-state'), 'open')
  sel.close()
  assert.equal(sel.triggerEl.getAttribute('data-state'), 'closed')
})

test('trigger has content + arrow slots', () => {
  const sel = new LLSelectSingle<string>(mount())
  assert.ok(sel.triggerContentEl)
  assert.ok(sel.triggerContentEl.classList.contains('llselect-trigger-content'))
  const arrow = sel.triggerEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
})

test('renderArrowFn default null: arrow slot is empty', () => {
  const sel = new LLSelectSingle<string>(mount())
  const arrow = sel.triggerEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
  assert.equal(arrow.children.length, 0)
})

test('renderArrowFn returning an element appends it to the arrow slot', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderArrowFn: () => {
      const el = document.createElement('span')
      el.id = 'my-arrow'
      el.textContent = '▼'  // black down-pointing triangle
      return el
    },
  })
  const arrow = sel.triggerEl.querySelector('.llselect-trigger-arrow')
  assert.ok(arrow)
  assert.equal(arrow.children.length, 1)
  assert.equal(arrow.querySelector('#my-arrow')?.textContent, '▼')
})

test('renderArrowFn is invoked with isOpen state on open/close', () => {
  const calls: Array<boolean> = []
  const sel = new LLSelectSingle<string>(mount(), {
    renderArrowFn: ({ isOpen }) => {
      calls.push(isOpen)
      return null
    },
  })
  sel.setItems(['a', 'b'])
  // calls so far: [false] from constructor renderTriggerArrow
  sel.open()
  // open calls renderTriggerArrow -> renderArrowFn with isOpen=true
  sel.close()
  // close calls renderTriggerArrow -> renderArrowFn with isOpen=false
  assert.deepEqual(calls, [false, true, false])
})

test('renderArrowFn returning null leaves the slot empty', () => {
  let returnNull = true
  const sel = new LLSelectSingle<string>(mount(), {
    renderArrowFn: () => {
      return returnNull ? null : document.createElement('span')
    },
  })
  const arrow = sel.triggerEl.querySelector('.llselect-trigger-arrow')!
  assert.equal(arrow.children.length, 0)
  returnNull = false
  sel.setItems(['a'])
  sel.open()
  assert.equal(arrow.children.length, 1)
})

test('triggerContentEl receives placeholder/chosen text (arrow slot preserved)', () => {
  const sel = new LLSelectSingle<string>(mount(), {
    renderArrowFn: () => {
      const el = document.createElement('span')
      el.className = 'survive'
      el.textContent = 'x'
      return el
    },
  })
  sel.setItems(['a'])
  sel.setChosenItem('a')
  assert.equal(sel.triggerContentEl.textContent, 'a')
  // Arrow slot must still be present after the content change.
  assert.ok(sel.triggerEl.querySelector('.survive'))
})
