import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupDom } from '../test-utils/dom.js'
import { LLSelectSingle } from '../src/single.js'
import { LLSelectMultiple } from '../src/multiple.js'

// Every settings function and every action-row function is called with `this`
// undefined: the parameters are the only input. Contract: DESIGN.md
// "Function-typed settings"; reasons: popup-rows-and-callbacks.md section 4.10.

function mount(): HTMLElement {
  setupDom()
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

test('multiple: every settings function and action-row function runs with `this` undefined', () => {
  const seen: Record<string, unknown> = {}
  const sel = new LLSelectMultiple<string>(mount(), {
    ariaLabel: 'x',
    clearable: true,
    chooseAllRow: true,
    triggerDisplay: 'tags',
    filterable: function (this: unknown) { seen.filterable = this; return true },
    compareFn: function (this: unknown, a, b) { seen.compareFn = this; return a === b },
    filterFn: function (this: unknown, item, query) { seen.filterFn = this; return item.includes(query) },
    itemToStringFn: function (this: unknown, item) { seen.itemToStringFn = this; return item },
    itemDisabledFn: function (this: unknown) { seen.itemDisabledFn = this; return false },
    createItemContentElFn: function (this: unknown) { seen.createItemContentElFn = this; return null },
    itemToGroupKeyFn: function (this: unknown, item) { seen.itemToGroupKeyFn = this; return item[0] ?? null },
    groupKeyToStringFn: function (this: unknown, key) { seen.groupKeyToStringFn = this; return key },
    groupKeyCompareFn: function (this: unknown, a, b) { seen.groupKeyCompareFn = this; return a === b },
    groupDisabledFn: function (this: unknown) { seen.groupDisabledFn = this; return false },
    createGroupLabelContentElFn: function (this: unknown) { seen.createGroupLabelContentElFn = this; return null },
    createTriggerContentElFn: function (this: unknown) { seen.createTriggerContentElFn = this; return null },
    createTriggerArrowContentElFn: function (this: unknown) { seen.createTriggerArrowContentElFn = this; return null },
    createTriggerClearButtonContentElFn: function (this: unknown) { seen.createTriggerClearButtonContentElFn = this; return null },
    createPopupListNoResultsContentElFn: function (this: unknown) { seen.createPopupListNoResultsContentElFn = this; return null },
    createPopupHeaderContentElFn: function (this: unknown) { seen.createPopupHeaderContentElFn = this; return null },
    createPopupFooterContentElFn: function (this: unknown) { seen.createPopupFooterContentElFn = this; return null },
    createChooseAllRowContentElFn: function (this: unknown) { seen.createChooseAllRowContentElFn = this; return null },
    createTagContentElFn: function (this: unknown) { seen.createTagContentElFn = this; return null },
    createTagRemoveButtonContentElFn: function (this: unknown) { seen.createTagRemoveButtonContentElFn = this; return null },
    onOpen: function (this: unknown) { seen.onOpen = this },
    onClose: function (this: unknown) { seen.onClose = this },
    onChange: function (this: unknown) { seen.onChange = this },
    onFilterQueryChange: function (this: unknown) { seen.onFilterQueryChange = this },
    popupListLeadingActionRows: [{
      textFn: function (this: unknown) { seen.textFn = this; return 'cmd' },
      createContentElFn: function (this: unknown) { seen.createContentElFn = this; return null },
      disabledFn: function (this: unknown) { seen.disabledFn = this; return false },
      onActivate: function (this: unknown) { seen.onActivate = this },
    }],
  })
  sel.setItems(['apple', 'avocado', 'banana'])
  sel.open()
  const input = sel.popupEl.querySelector('input')!
  input.value = 'zzz' // no match: the no-results content fn runs
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.value = 'a'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  sel.popupListEl.querySelector<HTMLElement>(`.${sel.classIdMap.popupListActionRowClass}`)!.click()
  sel.toggleItem('apple') // onChange, compareFn, the tag content fns
  sel.close()
  const expected = [
    'filterable', 'compareFn', 'filterFn', 'itemToStringFn', 'itemDisabledFn', 'createItemContentElFn',
    'itemToGroupKeyFn', 'groupKeyToStringFn', 'groupDisabledFn', 'createGroupLabelContentElFn',
    'createTriggerContentElFn', 'createTriggerArrowContentElFn', 'createTriggerClearButtonContentElFn',
    'createPopupListNoResultsContentElFn', 'createPopupHeaderContentElFn', 'createPopupFooterContentElFn',
    'createChooseAllRowContentElFn', 'createTagContentElFn', 'createTagRemoveButtonContentElFn',
    'onOpen', 'onClose', 'onChange', 'onFilterQueryChange', 'groupKeyCompareFn',
    'textFn', 'createContentElFn', 'disabledFn', 'onActivate',
  ]
  for (const name of expected) {
    assert.ok(name in seen, `${name} was called`)
    assert.equal(seen[name], undefined, `${name}: this must be undefined`)
  }
})

test('single: onChange and the trigger content fn run with `this` undefined', () => {
  const seen: Record<string, unknown> = {}
  const sel = new LLSelectSingle<string>(mount(), {
    ariaLabel: 'x',
    createTriggerContentElFn: function (this: unknown) { seen.createTriggerContentElFn = this; return null },
    onChange: function (this: unknown) { seen.onChange = this },
    compareFn: function (this: unknown, a, b) { seen.compareFn = this; return a === b },
  })
  sel.setItems(['a', 'b'])
  sel.setChosenItem('b')
  sel.open() // the initial focus finds the chosen item through compareFn
  sel.close()
  for (const name of ['createTriggerContentElFn', 'onChange', 'compareFn']) {
    assert.ok(name in seen, `${name} was called`)
    assert.equal(seen[name], undefined, `${name}: this must be undefined`)
  }
})
