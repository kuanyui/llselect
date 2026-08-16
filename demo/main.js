import { LLSelectSingle, LLSelectMultiple, version, createChevronDownSvgEl, createTriangleDownSvgEl, createOutlinedCheckboxSvgEl, createFilledCheckboxSvgEl, createCheckmarkSvgEl } from '../dist/index.mjs'
import { ar, en, he, ja, zhTW, uiTranslationPackByLocale } from '../dist/i18n.mjs'
import { COUNTRIES, USERS, HUGE_ITEMS, LONG_NAMES, PROGRAMMING_LANGUAGES, GROUPED_FOODS, MIXED_DIRECTION_COUNTRIES } from './data.js'
import { highlightJs } from './highlight.js'

console.log('llselect v' + version)

// Theme picker: swap the visual theme and (for BS themes) load the matching
// Bootstrap CSS from CDN. Bootstrap is intentionally NOT preloaded so its
// reboot rules (e.g. its own `.row` flex-grid) do not affect non-BS themes.
const themeLink = document.getElementById('theme-link')
const themeSelect = document.getElementById('theme-select')
const BS_CDN = {
  'bootstrap-3': 'https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css',
  'bootstrap-4': 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css',
  'bootstrap-5': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
}
let bsLink = null

function applyTheme(name) {
  themeLink.href = `../dist/themes/${name}.css`
  if (bsLink) {
    bsLink.remove()
    bsLink = null
  }
  if (BS_CDN[name]) {
    bsLink = document.createElement('link')
    bsLink.rel = 'stylesheet'
    bsLink.href = BS_CDN[name]
    // Base layer FIRST (before style.css and the llselect theme) so the
    // page's own rules keep winning the cascade. Appended at the end,
    // Bootstrap's body{margin:0} overrode the body centering and the whole
    // page went left-aligned.
    document.head.insertBefore(bsLink, document.querySelector('link[rel="stylesheet"]'))
  }
}

themeSelect.addEventListener('change', () => applyTheme(themeSelect.value))
applyTheme(themeSelect.value)

//#region 1.1
const outCountries = document.getElementById('out-countries')
const selCountries = new LLSelectSingle(
  document.getElementById('mount-countries'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outCountries.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selCountries.setItems(COUNTRIES)
//#endregion

//#region 1.2
const outUsers = document.getElementById('out-users')
// No subclass: itemToStringFn maps the User object to its display string.
const selUsers = new LLSelectSingle(
  document.getElementById('mount-users'),
  {
    placeholder: 'Pick a user',
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (user) => `#${user.id} ${user.name} (${user.role})`,
    onChange: (v) => { outUsers.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selUsers.setItems(USERS)
//#endregion

//#region 1.3
// clearable: true adds an x button in the trigger (its own slot, so it composes
// with content / arrow / tags). Clicking it clears to undefined and fires
// onChange(undefined). createTriggerClearButtonContentElFn (unused here) swaps the x icon, like
// createTriggerArrowContentElFn.
const outClearable = document.getElementById('out-clearable')
const selClearable = new LLSelectSingle(
  document.getElementById('mount-clearable'),
  {
    placeholder: 'Pick a country',
    clearable: true,
    onChange: (v) => { outClearable.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selClearable.setItems(COUNTRIES)
selClearable.setChosenItem('Japan')
//#endregion

//#region 11.1
// createItemContentElFn fills each option's VISIBLE content (colored icon +
// label), no subclass. The library owns the option element + aria: it pins each
// option's aria-label to itemToString (the icon never reaches a screen reader),
// so you write zero aria-*. There is no auto-projection - the trigger mirrors
// the chosen row only because we pass the same createLanguageRowEl to
// createTriggerContentElFn below. Named create*El per naming-conventions.md.
function createLanguageRowEl(lang) {
  const row = document.createElement('span')
  row.className = 'lang-row'
  const icon = document.createElement('i')
  icon.className = `mdi mdi-${lang.icon}`
  icon.setAttribute('aria-hidden', 'true')  // decorative; aria-label covers the name
  icon.style.color = lang.color
  row.append(icon, document.createTextNode(lang.name))
  return row
}
const outRichSingle = document.getElementById('out-rich-single')
const selRichSingle = new LLSelectSingle(
  document.getElementById('mount-rich-single'),
  {
    placeholder: 'Pick a language',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (lang) => lang.name,      // accessible name + search text
    createItemContentElFn: createLanguageRowEl,         // visible content in the list
    createTriggerContentElFn: (ctx) => ctx.chosenItem ? createLanguageRowEl(ctx.chosenItem) : null,
    onChange: (v) => { outRichSingle.textContent = 'chosen: ' + (v ? v.name : '(none)') },
  }
)
selRichSingle.setItems(PROGRAMMING_LANGUAGES)
//#endregion

//#region 2.1
const outScroll = document.getElementById('out-scroll')
const selScroll = new LLSelectSingle(
  document.getElementById('mount-scroll'),
  {
    placeholder: 'Pick a country (in scroll container)',
    onChange: (v) => { outScroll.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selScroll.setItems(COUNTRIES)
//#endregion

//#region 2.2
// The mount sits inside a `transform`ed container (.transform-container in
// style.css) - the ancestor that re-scopes position:fixed. With the Popover
// API (feature-detected, no setting) the library shows the popup in the top
// layer, so it still aligns under the trigger and paints above everything;
// without the API, displacement here is the documented accepted limitation.
const outTransform = document.getElementById('out-transform')
const selTransform = new LLSelectSingle(
  document.getElementById('mount-transform'),
  {
    placeholder: 'Open me - popup must align under the trigger',
    onChange: (v) => { outTransform.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selTransform.setItems(COUNTRIES)
//#endregion
// Position the select roughly in the middle of the container so scrolling
// up clips the anchor below the container, and scrolling down clips it above.
const scrollContainer = document.querySelector('.scroll-container')
const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
scrollContainer.scrollTop = 10 * rem

//#region 3.1
let passCount = 0
const btnPass = document.getElementById('btn-pass')
btnPass.addEventListener('click', () => {
  passCount++
  btnPass.textContent = `Outside button (clicks: ${passCount})`
})
const selPass = new LLSelectSingle(
  document.getElementById('mount-pass'),
  { placeholder: 'pass-through select' }  // default outsideClickBehavior
)
selPass.setItems(COUNTRIES)
//#endregion

//#region 3.2
let blockCount = 0
const btnBlock = document.getElementById('btn-block')
btnBlock.addEventListener('click', () => {
  blockCount++
  btnBlock.textContent = `Outside button (clicks: ${blockCount})`
})
const selBlock = new LLSelectSingle(
  document.getElementById('mount-block'),
  {
    placeholder: 'block select',
    outsideClickBehavior: 'block',
  }
)
selBlock.setItems(COUNTRIES)
//#endregion

//#region 4.1
new LLSelectSingle(
  document.getElementById('mount-ind-none'),
  { placeholder: 'No arrow' },
).setItems(COUNTRIES)
//#endregion

//#region 4.2
// 4.2a createChevronDownSvgEl
new LLSelectSingle(
  document.getElementById('mount-ind-chevron'),
  {
    placeholder: 'chevron',
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
  },
).setItems(COUNTRIES)

// 4.2b createTriangleDownSvgEl
new LLSelectSingle(
  document.getElementById('mount-ind-triangle'),
  {
    placeholder: 'triangle',
    createTriggerArrowContentElFn: () => createTriangleDownSvgEl(),
  },
).setItems(COUNTRIES)
//#endregion

//#region 4.3
new LLSelectSingle(
  document.getElementById('mount-ind-mdi'),
  {
    placeholder: 'mdi icon',
    createTriggerArrowContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'mdi mdi-chevron-down'
      return i
    },
  },
).setItems(COUNTRIES)
//#endregion

//#region 4.4
// Lib does nothing in the arrow slot; the demo styles a ::after pseudo-element.
new LLSelectSingle(
  document.getElementById('mount-ind-css'),
  { placeholder: 'CSS triangle (no JS)' },
).setItems(COUNTRIES)
//#endregion

//#region 4.5
// Arrow and clear are separate trigger slots, so they show together: a chevron
// arrow plus a clearable x. Preselect so the x is visible on load.
const selArrowClear = new LLSelectSingle(
  document.getElementById('mount-arrow-clear'),
  {
    placeholder: 'Pick a country',
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    clearable: true,
  },
)
selArrowClear.setItems(COUNTRIES)
selArrowClear.setChosenItem('Japan')
//#endregion

//#region 5.1
const outMulti = document.getElementById('out-multi')
const selMulti = new LLSelectMultiple(
  document.getElementById('mount-multi'),
  {
    placeholder: 'Pick countries',
    onChange: (chosen) => {
      outMulti.textContent = 'chosen: ' + JSON.stringify(chosen)
    },
  }
)
selMulti.setItems(COUNTRIES)
//#endregion

//#region 5.4
// Settings path: createItemContentElFn renders checkbox + item text; the public
// isChosen() supplies the state. The fn only runs on render (after
// construction), so the self-reference is safe. Subclass equivalent: 14.1.
const outMultiCheckbox = document.getElementById('out-multi-checkbox')
let selMultiCheckbox
selMultiCheckbox = new LLSelectMultiple(
  document.getElementById('mount-multi-checkbox'),
  {
    placeholder: 'Pick countries (checkboxes)',
    createItemContentElFn: (item) => {
      const row = document.createElement('span')
      row.className = 'lang-row' // inline-flex + gap (demo CSS)
      row.append(createOutlinedCheckboxSvgEl({ state: selMultiCheckbox.isChosen(item) ? 'checked' : 'unchecked' }), item)
      return row
    },
    onChange: (chosen) => {
      outMultiCheckbox.textContent = 'chosen: ' + JSON.stringify(chosen)
    },
  }
)
selMultiCheckbox.setItems(COUNTRIES)
//#endregion

//#region 11.2
// Same createItemContentElFn, now on a multiple. The library adds aria-selected
// to each option element on top of the auto aria-label, so AT announces e.g.
// "Python, selected" while the row shows the mdi icon. Reuses createLanguageRowEl (11.1).
const outRichMulti = document.getElementById('out-rich-multi')
const selRichMulti = new LLSelectMultiple(
  document.getElementById('mount-rich-multi'),
  {
    placeholder: 'Pick languages',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (lang) => lang.name,
    createItemContentElFn: createLanguageRowEl,
    onChange: (chosen) => {
      outRichMulti.textContent = 'chosen: ' + chosen.map((l) => l.name).join(', ')
    },
  }
)
selRichMulti.setItems(PROGRAMMING_LANGUAGES)
//#endregion

//#region 6.3
// Opt-in 'match-trigger': popup pinned to the trigger's width (the
// select2-style edge-aligned look), so long item text wraps inside it.
const outLongWrap = document.getElementById('out-long-wrap')
const selLongWrap = new LLSelectSingle(
  document.getElementById('mount-long-wrap'),
  {
    placeholder: 'Pick a country',
    popupWidthPolicy: 'match-trigger',
    onChange: (v) => { outLongWrap.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongWrap.setItems(LONG_NAMES)
selLongWrap.setChosenItem(LONG_NAMES[0])  // preselect the longest entry so trigger ellipsis is visible on load
//#endregion

//#region 6.4
// Builds on 6.3 ('match-trigger', constrained trigger - ellipsis needs a
// bounded popup width), plus:
//  - scoped CSS in demo/style.css gives this instance ellipsis on items.
//  - a subclass adds `title` so hover reveals the full text. (The library
//    deliberately does NOT add `title` automatically, so users can plug in
//    Tippy / Floating UI / their own tooltip lib without conflict.)
class EllipsisSingle extends LLSelectSingle {
  createItemEl(item, index) {
    const el = super.createItemEl(item, index)
    el.title = this.itemToString(item)
    return el
  }
}
const outLongEllipsis = document.getElementById('out-long-ellipsis')
const selLongEllipsis = new EllipsisSingle(
  document.getElementById('mount-long-ellipsis'),
  {
    placeholder: 'Pick a country',
    popupWidthPolicy: 'match-trigger',
    onChange: (v) => { outLongEllipsis.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongEllipsis.setItems(LONG_NAMES)
selLongEllipsis.setChosenItem(LONG_NAMES[0])
//#endregion

//#region 6.1
// No demo CSS, no subclass. Library does not constrain widths, so picking
// the long item text below expands the trigger past the demo pane (and possibly
// the page) - that overflow IS the demonstration. We deliberately do NOT
// preselect the long entry: pre-overflowing on page load triggers a
// first-open scroll quirk on Firefox Android (browser does odd layout
// bookkeeping when the page has horizontal overflow from the very first
// paint). User picks the long entry themselves; the lesson is the same.
const outLongNoConstraint = document.getElementById('out-long-noconstraint')
const selLongNoConstraint = new LLSelectSingle(
  document.getElementById('mount-long-noconstraint'),
  {
    placeholder: 'Pick a country - try the long sentence',
    onChange: (v) => { outLongNoConstraint.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongNoConstraint.setItems(LONG_NAMES)
//#endregion

//#region 6.2
// Trigger constrained by demo CSS (max-width: 18rem). No width setting: the
// DEFAULT `popupWidthPolicy: 'fit-content'` grows the popup to the widest
// text, wider than the trigger, like a native <select>.
const outLongFitContent = document.getElementById('out-long-fitcontent')
const selLongFitContent = new LLSelectSingle(
  document.getElementById('mount-long-fitcontent'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outLongFitContent.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongFitContent.setItems(LONG_NAMES)
selLongFitContent.setChosenItem(LONG_NAMES[0])
//#endregion

//#region 7.1
const outSearchSingle = document.getElementById('out-search-single')
const selSearchSingle = new LLSelectSingle(
  document.getElementById('mount-search-single'),
  {
    placeholder: 'Pick a country',
    filterable: true,
    onChange: (v) => { outSearchSingle.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selSearchSingle.setItems(COUNTRIES)
//#endregion

//#region 7.2
// Settings-path checkboxes, same pattern as 5.4.
const outSearchMulti = document.getElementById('out-search-multi')
let selSearchMulti
selSearchMulti = new LLSelectMultiple(
  document.getElementById('mount-search-multi'),
  {
    placeholder: 'Pick countries',
    filterable: true,
    createItemContentElFn: (item) => {
      const row = document.createElement('span')
      row.className = 'lang-row'
      row.append(createOutlinedCheckboxSvgEl({ state: selSearchMulti.isChosen(item) ? 'checked' : 'unchecked' }), item)
      return row
    },
    onChange: (chosen) => {
      outSearchMulti.textContent = 'chosen: ' + JSON.stringify(chosen)
    },
  }
)
selSearchMulti.setItems(COUNTRIES)
//#endregion

//#region 7.3
const outSearchUsers = document.getElementById('out-search-users')
const selSearchUsers = new LLSelectSingle(
  document.getElementById('mount-search-users'),
  {
    placeholder: 'Search users by name OR role',
    filterable: true,
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => `#${u.id} ${u.name} (${u.role})`,
    // Default matches the visible text only. This custom fn lets the user
    // type a role ("admin") and find users by role, not just by name.
    filterFn: (u, q) => {
      const needle = q.toLowerCase()
      return u.name.toLowerCase().includes(needle) || u.role.toLowerCase().includes(needle)
    },
    onChange: (v) => { outSearchUsers.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selSearchUsers.setItems(USERS)
//#endregion

//#region 8.1
const outSingleHuge = document.getElementById('out-single-huge')
const selSingleHuge = new LLSelectSingle(
  document.getElementById('mount-single-huge'),
  {
    placeholder: 'Pick from 10,000 rows',
    onChange: (v) => { outSingleHuge.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selSingleHuge.setItems(HUGE_ITEMS)
//#endregion

//#region 8.2
const outMultiHuge = document.getElementById('out-multi-huge')
const selMultiHuge = new LLSelectMultiple(
  document.getElementById('mount-multi-huge'),
  {
    placeholder: 'Pick from 10,000 rows',
    onChange: (chosen) => {
      outMultiHuge.textContent = 'chosen: ' + chosen.length + ' items'
    },
  }
)
selMultiHuge.setItems(HUGE_ITEMS)
//#endregion

//#region 5.2
const outMultiAll = document.getElementById('out-multi-all')
const selMultiAll = new LLSelectMultiple(
  document.getElementById('mount-multi-all'),
  {
    placeholder: 'Pick countries (with bulk actions)',
    onChange: (chosen) => {
      outMultiAll.textContent = 'chosen: ' + chosen.length + ' items'
    },
  }
)
selMultiAll.setItems(COUNTRIES)
document.getElementById('btn-choose-all')
  .addEventListener('click', () => selMultiAll.chooseAll())
document.getElementById('btn-dechoose-all')
  .addEventListener('click', () => selMultiAll.unchooseAll())
document.getElementById('btn-toggle-all')
  .addEventListener('click', () => selMultiAll.toggleAll())
//#endregion

//#region 5.3
// triggerDisplay: 'tags' shows each chosen item as a removable chip. The x
// button removes it (toggleItem); the library owns the chip + x + aria +
// tabindex. Composes with filterable. createTagContentElFn (unused here) would
// fill each chip's content, mirroring createItemContentElFn; createTagRemoveButtonContentElFn
// likewise swaps the remove-button icon, mirroring createTriggerClearButtonContentElFn.
const outTags = document.getElementById('out-tags')
const selTags = new LLSelectMultiple(
  document.getElementById('mount-tags'),
  {
    placeholder: 'Pick countries',
    triggerDisplay: 'tags',
    filterable: true,
    onChange: (chosen) => { outTags.textContent = 'chosen: ' + chosen.join(', ') },
  }
)
selTags.setItems(COUNTRIES)
selTags.setChosenItems(['Japan', 'Brazil', 'Canada'])
//#endregion

//#region 5.5
// Choose-all row: opt-in, tri-state, acting on the VISIBLE enabled subset -
// filter first, then activate the row: only the matches toggle, hidden
// choices are preserved. The public chooseAll/unchooseAll/toggleAll keep
// their whole-list semantics. createChooseAllRowContentElFn fills the row
// with a tri-state SVG checkbox (createOutlinedCheckboxSvgEl) + the library's own
// counting text (en pack). Without the hook the row is just the counting
// text (5.7). The accessible name stays uiTranslationPack.chooseAllRowText.
// The ITEMS get the same visual language via 5.4's settings-path checkbox,
// so the row and the items read as one consistent list.
const outChooseAll = document.getElementById('out-choose-all')
let selChooseAll
selChooseAll = new LLSelectMultiple(
  document.getElementById('mount-choose-all'),
  {
    placeholder: 'Pick countries',
    filterable: true,
    chooseAllRow: true,
    createItemContentElFn: (item) => {
      const row = document.createElement('span')
      row.className = 'lang-row'
      row.append(createOutlinedCheckboxSvgEl({ state: selChooseAll.isChosen(item) ? 'checked' : 'unchecked' }), item)
      return row
    },
    createChooseAllRowContentElFn: (chosenState, chosenCount, totalCount) => {
      const row = document.createElement('span')
      row.className = 'lang-row' // inline-flex + gap (demo CSS)
      row.append(
        // The icon helper accepts the chosen-state vocabulary directly.
        createOutlinedCheckboxSvgEl({ state: chosenState }),
        en.chooseAllRowText(chosenCount, totalCount), // reuse the library's translation
      )
      return row
    },
    onChange: (chosen) => { outChooseAll.textContent = 'chosen: ' + chosen.length + ' items' },
  }
)
selChooseAll.setItems(COUNTRIES)
//#endregion

//#region 5.6
// 5.5's choose-all pattern drawn with the Material-look icon instead:
// createFilledCheckboxSvgEl - solid rounded box, tick / dash cut out. Same
// options as createOutlinedCheckboxSvgEl (incl. the chosen-state vocabulary);
// unchecked is the same outline box in both.
const outFilledCheckbox = document.getElementById('out-filled-checkbox')
let selFilledCheckbox
selFilledCheckbox = new LLSelectMultiple(
  document.getElementById('mount-filled-checkbox'),
  {
    placeholder: 'Pick countries',
    filterable: true,
    chooseAllRow: true,
    createItemContentElFn: (item) => {
      const row = document.createElement('span')
      row.className = 'lang-row'
      row.append(createFilledCheckboxSvgEl({ state: selFilledCheckbox.isChosen(item) ? 'checked' : 'unchecked' }), item)
      return row
    },
    createChooseAllRowContentElFn: (chosenState, chosenCount, totalCount) => {
      const row = document.createElement('span')
      row.className = 'lang-row' // inline-flex + gap (demo CSS)
      row.append(
        createFilledCheckboxSvgEl({ state: chosenState }),
        en.chooseAllRowText(chosenCount, totalCount),
      )
      return row
    },
    onChange: (chosen) => { outFilledCheckbox.textContent = 'chosen: ' + chosen.length + ' items' },
  }
)
selFilledCheckbox.setItems(COUNTRIES)
//#endregion

//#region 5.7
// The choose-all DEFAULT look: no content fn - just the counting text,
// whose numbers carry the tri-state. No default indicator, like everywhere
// else in the library.
const selChooseAllDefault = new LLSelectMultiple(
  document.getElementById('mount-choose-all-default'),
  { placeholder: 'Pick countries', chooseAllRow: true }
)
selChooseAllDefault.setItems(COUNTRIES)
//#endregion

//#region 9.1
const PRODUCTS = [
  { name: 'Espresso', stock: 8 },
  { name: 'Cappuccino', stock: 0 },
  { name: 'Latte', stock: 3 },
  { name: 'Flat White', stock: 0 },
  { name: 'Mocha', stock: 5 },
]
const outDisItems = document.getElementById('out-disabled-items')
// Text via itemToStringFn (no subclass). The createItemEl subclass is the
// "escape hatch" - full element control - just to attach a why-disabled title.
class ProductSelect extends LLSelectSingle {
  createItemEl(p, i) {
    const el = super.createItemEl(p, i)
    if (this.isItemEffectivelyDisabled(p)) { el.setAttribute('title', `${p.name} is out of stock`) }
    return el
  }
}
const selDisItems = new ProductSelect(
  document.getElementById('mount-disabled-items'),
  {
    placeholder: 'Pick a drink',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (p) => p.stock > 0 ? `${p.name} (${p.stock} left)` : `${p.name} - sold out`,
    itemDisabledFn: (p) => p.stock === 0,
    onChange: (v) => { outDisItems.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selDisItems.setItems(PRODUCTS)
//#endregion

//#region 9.2
const outDisCtrl = document.getElementById('out-disabled-ctrl')
const selDisCtrl = new LLSelectSingle(
  document.getElementById('mount-disabled-ctrl'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outDisCtrl.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selDisCtrl.setItems(COUNTRIES)
const btnToggleDisabled = document.getElementById('btn-toggle-disabled')
btnToggleDisabled.addEventListener('click', () => {
  const next = !selDisCtrl.isDisabled()
  selDisCtrl.setDisabled(next)
  btnToggleDisabled.textContent = next ? 'Enable' : 'Disable'
  // Consumer-owned tooltip on the disabled trigger - native disabled can't.
  if (next) {
    selDisCtrl.triggerEl.setAttribute('title', 'Disabled until you finish step 1')
  } else {
    selDisCtrl.triggerEl.removeAttribute('title')
  }
})

// Constructed disabled, but kept Tab-focusable so AT users can read the tooltip.
const selDisFocusable = new LLSelectSingle(
  document.getElementById('mount-disabled-focusable'),
  { placeholder: 'Disabled (focusable)', focusableWhenDisabled: true }
)
selDisFocusable.setItems(COUNTRIES)
selDisFocusable.setDisabled(true)
selDisFocusable.triggerEl.setAttribute('title', 'Disabled, but Tab can still reach me')
//#endregion

//#region 10.1
// Optgroup: flat items + itemToGroupKeyFn. Items are pre-sorted by category;
// contiguous same-key items form one group. The key is the identity; the display text
// is a separate projection (here key === text, so groupKeyToStringFn is omitted).
const outGroup = document.getElementById('out-group')
const selGroup = new LLSelectSingle(
  document.getElementById('mount-group'),
  {
    placeholder: 'Pick a food',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (f) => f.name,
    itemToGroupKeyFn: (f) => f.category,
    onChange: (v) => { outGroup.textContent = 'chosen: ' + (v ? `${v.name} (${v.category})` : '(none)') },
  }
)
selGroup.setItems(GROUPED_FOODS)
//#endregion

//#region 10.2
// Group-level disabled + filterable. groupDisabledFn disables a whole group
// (layers on item-level disabled): its items are not selectable, skipped by
// keyboard, aria-disabled. Filtering regroups survivors; empty groups vanish.
const outGroupDisabled = document.getElementById('out-group-disabled')
const selGroupDisabled = new LLSelectMultiple(
  document.getElementById('mount-group-disabled'),
  {
    placeholder: 'Pick foods (Dairy group disabled)',
    filterable: true,
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (f) => f.name,
    itemToGroupKeyFn: (f) => f.category,
    groupDisabledFn: (cat) => cat === 'Dairy',
    onChange: (chosen) => { outGroupDisabled.textContent = 'chosen: ' + chosen.map((f) => f.name).join(', ') },
  }
)
selGroupDisabled.setItems(GROUPED_FOODS)
//#endregion

//#region 11.3
// Rich group header via createGroupLabelContentElFn (mirrors createItemContentElFn):
// an icon + a live count badge. itemsInGroup gives the group's items, so the
// count needs no external bookkeeping. The header's accessible name stays the
// plain groupKeyToString; the icon is aria-hidden.
const CATEGORY_ICON = { Fruit: 'food-apple', Vegetable: 'carrot', Dairy: 'cheese', Nuts: 'peanut' }
// Named create*El per naming-conventions.md (returns an element), like createLanguageRowEl.
function createCategoryHeaderEl(category, items) {
  const row = document.createElement('span')
  row.className = 'group-head'
  const icon = document.createElement('i')
  icon.className = `mdi mdi-${CATEGORY_ICON[category] || 'shape'}`
  icon.setAttribute('aria-hidden', 'true')
  const text = document.createElement('span')
  text.textContent = `${category} (${items.length})`
  row.append(icon, text)
  return row
}
const selGroupRich = new LLSelectSingle(
  document.getElementById('mount-group-rich'),
  {
    placeholder: 'Pick a food',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (f) => f.name,
    itemToGroupKeyFn: (f) => f.category,
    createGroupLabelContentElFn: createCategoryHeaderEl,
  }
)
selGroupRich.setItems(GROUPED_FOODS)
//#endregion

//#region 11.4
// Tags with rich chip content: the SAME createLanguageRowEl (11.1) feeds
// createTagContentElFn - the chip is to the trigger what the option content
// is to the row, so one renderer serves both. The library still owns the chip
// element + remove button + aria (the remove aria-label stays itemToString-
// based, never the custom content). createTagRemoveButtonContentElFn swaps
// the remove icon; unset, the theme's CSS glyph (:empty::before) draws the x.
const outTagIcons = document.getElementById('out-tag-icons')
const selTagIcons = new LLSelectMultiple(
  document.getElementById('mount-tag-icons'),
  {
    placeholder: 'Pick languages',
    triggerDisplay: 'tags',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (lang) => lang.name,
    createItemContentElFn: createLanguageRowEl,
    createTagContentElFn: createLanguageRowEl,
    createTagRemoveButtonContentElFn: () => {
      const i = document.createElement('i')
      i.className = 'mdi mdi-close-circle-outline'
      i.setAttribute('aria-hidden', 'true') // decorative; the button carries the aria-label
      return i
    },
    onChange: (chosen) => { outTagIcons.textContent = 'chosen: ' + chosen.map((l) => l.name).join(', ') },
  }
)
selTagIcons.setItems(PROGRAMMING_LANGUAGES)
// Preselect so the chips (and their icons) are visible on load.
selTagIcons.setChosenItems([PROGRAMMING_LANGUAGES[1], PROGRAMMING_LANGUAGES[3]])
//#endregion

//#region 11.5
// Secondary hint text: primary text + a faded hint pushed to the row's
// right edge (.user-row). Visual only - the option's aria-label stays
// itemToString, so AT hears just the name.
function createUserRowEl(user) {
  const row = document.createElement('span')
  row.className = 'user-row'
  const name = document.createElement('span')
  name.textContent = user.name
  const hint = document.createElement('small')
  hint.className = 'hint'
  hint.textContent = user.role
  row.append(name, hint)
  return row
}
const outUserHints = document.getElementById('out-user-hints')
const selUserHints = new LLSelectSingle(
  document.getElementById('mount-user-hints'),
  {
    placeholder: 'Pick a user',
    filterable: true,
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => u.name,
    createItemContentElFn: createUserRowEl,
    onChange: (v) => { outUserHints.textContent = 'chosen: ' + (v ? v.name : '(none)') },
  }
)
selUserHints.setItems(USERS)
//#endregion

//#region 11.6
// Per-item background, like native <option style="background-color"> (a
// Chromium-only nicety): 11.1's row plus a tint of ITS icon color's hue,
// lifted near-white. hsl alpha (not an opaque pastel) keeps the theme's
// hover / keyboard-focus backgrounds visible through the tint. Everything
// lives as inline styles on the row except ONE demo CSS line: the option
// element's own padding must move onto the row (the renderer never gets
// that element), or the tint stops short of the row's edges. The
// chosen row gets the library's own createCheckmarkSvgEl at its right
// edge - reading state here is safe because rows re-render on chosen
// changes, even while the popup is open (setChosenItem replaces the
// affected rows; see createItemContentElFn's docstring). The chosen tint
// covers the WHOLE trigger, like the native control: onChange paints the
// public triggerEl - background from the tint, text + border from the
// darkened same-hue shade. The mirrored trigger row itself stays untinted
// (11.1's renderer) - stacking two alpha tints would show as a darker
// patch.
function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) { return 0 }
  let h
  if (max === r) {
    h = ((g - b) / d) % 6
  } else if (max === g) {
    h = (b - r) / d + 2
  } else {
    h = (r - g) / d + 4
  }
  return Math.round(h * 60 + 360) % 360
}
function languageTint(lang) {
  return `hsl(${hexToHue(lang.color)} 85% 55% / 0.14)`
}
// Darkened same-hue counterpart: row / trigger text and the trigger border.
// Dark enough to stay readable on the near-white tint.
function languageShade(lang) {
  return `hsl(${hexToHue(lang.color)} 75% 32%)`
}
function createTintedLanguageRowEl(lang) {
  const row = createLanguageRowEl(lang)  // 11.1's icon + text row
  // Fill the option element: block-level flex (inline-flex would shrink-wrap
  // to the text, leaving the tint a narrow patch) + the spacing the one-line
  // demo CSS removed from the option element itself.
  row.style.display = 'flex'
  row.style.padding = '0.35rem 0.7rem'
  row.style.background = languageTint(lang)
  row.style.color = languageShade(lang)  // the mdi icon keeps its own brand color
  const chosen = selLangTinted.getChosenItem()
  if (chosen !== undefined && chosen.name === lang.name) {
    const check = createCheckmarkSvgEl()  // currentColor -> the shade above
    check.style.marginInlineStart = 'auto'  // push to the row's far edge
    row.append(check)
  }
  return row
}
const outLangTinted = document.getElementById('out-lang-tinted')
const selLangTinted = new LLSelectSingle(
  document.getElementById('mount-lang-tinted'),
  {
    placeholder: 'Pick a language',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (lang) => lang.name,
    createItemContentElFn: createTintedLanguageRowEl,
    createTriggerContentElFn: (ctx) => ctx.chosenItem ? createLanguageRowEl(ctx.chosenItem) : null,
    onChange: (v) => {
      const t = selLangTinted.triggerEl
      t.style.background = v ? languageTint(v) : ''
      t.style.borderColor = v ? languageShade(v) : ''
      t.style.color = v ? languageShade(v) : ''
      outLangTinted.textContent = 'chosen: ' + (v ? v.name : '(none)')
    },
  }
)
selLangTinted.setItems(PROGRAMMING_LANGUAGES)
//#endregion

//#region 12
// labelEl: native <label for> cannot target these divs, so the setting
// emulates both halves - the label is the bottom name rung (live
// aria-labelledby reference; an id is minted if the label has none) and
// clicking it focuses the trigger (focus only, never open - native <select>
// label parity). destroy() unwires the click and a minted id.
const labelDemoSel = new LLSelectSingle(document.getElementById('mount-label-demo'), {
  labelEl: document.getElementById('fruit-label'),
  filterable: true,
  clearable: true,
  createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
})
labelDemoSel.setItems(['Apple', 'Banana', 'Cherry', 'Durian'])
//#endregion

//#region 13.1
// Language packs (imported at the top: `import { en, ja, zhTW } from
// '@llselect/core/i18n'`) fill the `uiTranslationPack` setting whole; per-key
// overrides spread on top (`uiTranslationPack: { ...zhTW, ... }`). The three
// instances are built ONCE; the switcher calls setUiTranslationPack - the one
// deliberate exception to constructor-frozen settings - so chosen state
// survives the language switch. Deliberately NO `placeholder` (so the pack's
// localized `triggerPlaceholder` default shows; an explicit `placeholder` is
// app copy and would win) and nothing preselected at load, so every visible
// change comes from the pack alone. Three instances: a single (localized
// placeholder + chosen text in the trigger), and two multis because their
// displays are exclusive - 'tags' shows the translated remove buttons,
// default 'count' the translated count summary.
const I18N_PACKS = { en, ja, zhTW, ar, he }
const RTL_PACKS = new Set(['ar', 'he'])
const outI18n = document.getElementById('out-i18n')
const i18nPackSelect = document.getElementById('i18n-pack-select')
const i18nMounts = ['mount-i18n-single', 'mount-i18n-tags', 'mount-i18n-count'].map((id) => document.getElementById(id))
const i18nSelects = [
  new LLSelectSingle(i18nMounts[0], {
    filterable: true,
    clearable: true,
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
  }),
  new LLSelectMultiple(i18nMounts[1], {
    filterable: true,
    clearable: true,
    triggerDisplay: 'tags',
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    onChange: (chosen) => { outI18n.textContent = 'chosen: ' + chosen.join(', ') },
  }),
  new LLSelectMultiple(i18nMounts[2], {
    filterable: true,
    clearable: true,
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
  }),
]
// Mixed-direction item texts: bidi reorders runs inside each item on its own; the
// weak-character entries (parens / digits) show the base-direction caveat
// that per-item dir="auto" / <bdi> would solve (DESIGN.md "RTL").
for (const sel of i18nSelects) { sel.setItems(MIXED_DIRECTION_COUNTRIES) }
function applyI18nPack(packName) {
  // RTL packs set `dir` on the mounts: the component inherits the
  // environment's direction like a native element (there is NO rtl setting).
  // Flex mirrors the trigger slots (arrow lands LEFT, like native <select>),
  // logical padding mirrors the chips, fit-content popups would grow leftward.
  const dir = RTL_PACKS.has(packName) ? 'rtl' : 'ltr'
  for (const mountEl of i18nMounts) { mountEl.dir = dir }
  for (const sel of i18nSelects) { sel.setUiTranslationPack(I18N_PACKS[packName]) }
}
i18nPackSelect.addEventListener('change', () => applyI18nPack(i18nPackSelect.value))
applyI18nPack(i18nPackSelect.value)
//#endregion

//#region 13.3
// Every pack, straight out of `uiTranslationPackByLocale` (BCP 47 keys), so new packs
// appear here without demo edits. One single per pack: closed it shows the
// pack's `triggerPlaceholder`, open it the search placeholder / clear x /
// no-results status. RTL tags put `dir="rtl"` on their mount; the card label
// uses `Intl.DisplayNames` where available (Firefox < 86 gets the bare tag).
const RTL_TAGS = new Set(['ar', 'fa', 'he', 'ur'])
const i18nAllGrid = document.getElementById('i18n-all-grid')
const displayNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'language' }) : null
function languageLabel(tag) {
  if (!displayNames) { return tag }
  try { return `${tag} - ${displayNames.of(tag)}` } catch { return tag }
}
for (const [tag, pack] of Object.entries(uiTranslationPackByLocale)) {
  const card = document.createElement('div')
  const cardLabel = document.createElement('div')
  cardLabel.className = 'out'
  cardLabel.textContent = languageLabel(tag)
  const mount = document.createElement('div')
  if (RTL_TAGS.has(tag)) { mount.dir = 'rtl' }
  card.append(cardLabel, mount)
  i18nAllGrid.append(card)
  const allSel = new LLSelectSingle(mount, {
    filterable: true,
    clearable: true,
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    uiTranslationPack: pack,
  })
  allSel.setItems(MIXED_DIRECTION_COUNTRIES)
}
//#endregion

//#region 13.2
// RTL needs no API: the mount's dir="rtl" is inherited like on a native
// element, and flex rows / logical margins mirror on their own. Same
// checkbox pattern as 5.5, with the ar pack.
const outRtlCheckboxes = document.getElementById('out-rtl-checkboxes')
let selRtlCheckboxes
selRtlCheckboxes = new LLSelectMultiple(
  document.getElementById('mount-rtl-checkboxes'),
  {
    chooseAllRow: true,
    uiTranslationPack: ar,
    createItemContentElFn: (item) => {
      const row = document.createElement('span')
      row.className = 'lang-row'
      row.append(createOutlinedCheckboxSvgEl({ state: selRtlCheckboxes.isChosen(item) ? 'checked' : 'unchecked' }), item)
      return row
    },
    createChooseAllRowContentElFn: (chosenState, chosenCount, totalCount) => {
      const row = document.createElement('span')
      row.className = 'lang-row'
      row.append(createOutlinedCheckboxSvgEl({ state: chosenState }), ar.chooseAllRowText(chosenCount, totalCount))
      return row
    },
    onChange: (chosen) => { outRtlCheckboxes.textContent = 'chosen: ' + chosen.length + ' items' },
  }
)
selRtlCheckboxes.setItems(MIXED_DIRECTION_COUNTRIES)
//#endregion

// --- Inject demo snippets into <pre data-demo="X"><code></code></pre> -----
//#region 14.1
// Subclass equivalent of 5.4: override createItemEl and prepend the checkbox
// to the option element itself. Not required (5.4 reaches the same result
// with a setting) and not faster - subclass when you need the option element
// itself or protected state (see 6.4 / 9.1).
class CheckboxMultiSelect extends LLSelectMultiple {
  createItemEl(item, index) {
    const el = super.createItemEl(item, index)  // sets text + role + aria-selected
    el.prepend(createOutlinedCheckboxSvgEl({ state: this.isChosen(item) ? 'checked' : 'unchecked' }))
    return el
  }
}
const outSubclassCheckbox = document.getElementById('out-subclass-checkbox')
const selSubclassCheckbox = new CheckboxMultiSelect(
  document.getElementById('mount-subclass-checkbox'),
  {
    placeholder: 'Pick countries (checkboxes)',
    onChange: (chosen) => {
      outSubclassCheckbox.textContent = 'chosen: ' + JSON.stringify(chosen)
    },
  }
)
selSubclassCheckbox.setItems(COUNTRIES)
//#endregion

// Self-extraction: fetch this file's source, locate `//#region NAME` ...
// `//#endregion` blocks, and write each into the matching <code>.
{
  const src = await (await fetch(import.meta.url)).text()
  const re = /\/\/#region\s+(\S+)\s*\n([\s\S]*?)\n\s*\/\/#endregion/g
  let m
  while ((m = re.exec(src)) !== null) {
    const target = document.querySelector(`pre[data-demo="${m[1]}"] code`)
    if (target) target.innerHTML = highlightJs(m[2])
  }
}

// Demo CSS: style.css regions marked `/* #region <id> [<id> ...] */` fill the
// matching pre[data-demo-css] blocks (one rule can serve several demos).
{
  const css = await (await fetch('./style.css')).text()
  const re = /\/\*\s*#region\s+([^*]+?)\s*\*\/\n([\s\S]*?)\n\/\*\s*#endregion\s*\*\//g
  const byId = new Map()
  let m
  while ((m = re.exec(css)) !== null) {
    for (const id of m[1].split(/\s+/)) {
      byId.set(id, byId.has(id) ? byId.get(id) + '\n\n' + m[2] : m[2])
    }
  }
  for (const [id, text] of byId) {
    const target = document.querySelector(`pre[data-demo-css="${id}"] code`)
    if (target) { target.textContent = text }
  }
}

// Inject data.js content into the collapsible <details> at the top.
{
  const dataSrc = await (await fetch('./data.js')).text()
  const target = document.getElementById('data-source')
  if (target) target.innerHTML = highlightJs(dataSrc)
}

