import { LLSelectSingle, LLSelectMultiple, LLSELECT_VERSION, createChevronDownSvgEl, createTriangleDownSvgEl, createCheckboxSvgEl } from '../dist/index.mjs'
import { ar, en, he, ja, zhTW } from '../dist/i18n.mjs'
import { COUNTRIES, USERS, HUGE_ITEMS, LONG_NAMES, PROGRAMMING_LANGUAGES, GROUPED_FOODS, MIXED_DIRECTION_COUNTRIES } from './data.js'
import { highlightJs } from './highlight.js'

console.log('llselect v' + LLSELECT_VERSION)

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
    document.head.appendChild(bsLink)
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
// label), no subclass. The library owns the option shell + aria: it pins each
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
const outMultiCheckbox = document.getElementById('out-multi-checkbox')
class CheckboxMultiSelect extends LLSelectMultiple {
  createItemEl(item, index) {
    const el = super.createItemEl(item, index)  // sets text + role + aria-selected
    const box = createCheckboxSvgEl({ state: this.isChosen(item) ? 'checked' : 'unchecked' })
    el.prepend(box)
    return el
  }
}
const selMultiCheckbox = new CheckboxMultiSelect(
  document.getElementById('mount-multi-checkbox'),
  {
    placeholder: 'Pick countries (checkboxes)',
    onChange: (chosen) => {
      outMultiCheckbox.textContent = 'chosen: ' + JSON.stringify(chosen)
    },
  }
)
selMultiCheckbox.setItems(COUNTRIES)
//#endregion

//#region 11.2
// Same createItemContentElFn, now on a multiple. The library adds aria-selected
// to each option shell on top of the auto aria-label, so AT announces e.g.
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

//#region 6.2
const outLongWrap = document.getElementById('out-long-wrap')
const selLongWrap = new LLSelectSingle(
  document.getElementById('mount-long-wrap'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outLongWrap.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongWrap.setItems(LONG_NAMES)
selLongWrap.setChosenItem(LONG_NAMES[0])  // preselect the longest entry so trigger ellipsis is visible on load
//#endregion

//#region 6.3
// Builds on 6.2 (constrained trigger), plus:
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
    onChange: (v) => { outLongEllipsis.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selLongEllipsis.setItems(LONG_NAMES)
selLongEllipsis.setChosenItem(LONG_NAMES[0])
//#endregion

//#region 6.1
// No demo CSS, no subclass. Library does not constrain widths, so picking
// the long label below expands the trigger past the demo pane (and possibly
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

//#region 6.4
// Trigger constrained the same way as 6.1, but popup uses `fit-content` so
// it grows to fit the widest label and can be wider than the trigger.
const outLongFitContent = document.getElementById('out-long-fitcontent')
const selLongFitContent = new LLSelectSingle(
  document.getElementById('mount-long-fitcontent'),
  {
    placeholder: 'Pick a country',
    popupWidthPolicy: 'fit-content',
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
    searchable: true,
    onChange: (v) => { outSearchSingle.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selSearchSingle.setItems(COUNTRIES)
//#endregion

//#region 7.2
const outSearchMulti = document.getElementById('out-search-multi')
class SearchCheckboxMulti extends LLSelectMultiple {
  createItemEl(item, index) {
    const el = super.createItemEl(item, index)
    el.prepend(createCheckboxSvgEl({ state: this.isChosen(item) ? 'checked' : 'unchecked' }))
    return el
  }
}
const selSearchMulti = new SearchCheckboxMulti(
  document.getElementById('mount-search-multi'),
  {
    placeholder: 'Pick countries',
    searchable: true,
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
    searchable: true,
    compareFn: (a, b) => a.id === b.id,
    itemToStringFn: (u) => `#${u.id} ${u.name} (${u.role})`,
    // Default matches the visible label only. This custom fn lets the user
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
document.getElementById('btn-select-all')
  .addEventListener('click', () => selMultiAll.chooseAll())
document.getElementById('btn-deselect-all')
  .addEventListener('click', () => selMultiAll.unchooseAll())
document.getElementById('btn-toggle-all')
  .addEventListener('click', () => selMultiAll.toggleAll())
//#endregion

//#region 5.3
// triggerDisplay: 'tags' shows each chosen item as a removable chip. The x
// button removes it (toggleItem); the library owns the chip + x + aria +
// tabindex. Composes with searchable. createTagContentElFn (unused here) would
// fill each chip's content, mirroring createItemContentElFn; createTagRemoveButtonContentElFn
// likewise swaps the remove-button icon, mirroring createTriggerClearButtonContentElFn.
const outTags = document.getElementById('out-tags')
const selTags = new LLSelectMultiple(
  document.getElementById('mount-tags'),
  {
    placeholder: 'Pick countries',
    triggerDisplay: 'tags',
    searchable: true,
    onChange: (chosen) => { outTags.textContent = 'chosen: ' + chosen.join(', ') },
  }
)
selTags.setItems(COUNTRIES)
selTags.setChosenItems(['Japan', 'Brazil', 'Canada'])
//#endregion

//#region 5.5
// Select-all row: opt-in, tri-state, acting on the VISIBLE enabled subset -
// filter first, then activate the row: only the matches toggle, hidden
// choices are preserved. The public chooseAll/unchooseAll/toggleAll keep
// their whole-list semantics. createSelectAllRowContentElFn fills the row
// with a tri-state SVG checkbox (createCheckboxSvgEl) + the library's own
// counting label (en pack); without the hook, themes draw a text glyph from
// data-chosen-state. The accessible name stays texts.selectAllRowLabel.
// The ITEMS get the same visual language - a subclass prepends a checkbox
// reflecting isChosen (same pattern as 5.4) - so the row and the items read
// as one consistent list.
class SelectAllCheckboxMulti extends LLSelectMultiple {
  createItemEl(item, index) {
    const el = super.createItemEl(item, index)
    el.prepend(createCheckboxSvgEl({ state: this.isChosen(item) ? 'checked' : 'unchecked' }))
    return el
  }
}
const outSelectAll = document.getElementById('out-select-all')
const selSelectAll = new SelectAllCheckboxMulti(
  document.getElementById('mount-select-all'),
  {
    placeholder: 'Pick countries',
    searchable: true,
    selectAllRow: true,
    createSelectAllRowContentElFn: (chosenState, chosenCount, totalCount) => {
      const row = document.createElement('span')
      row.className = 'lang-row' // inline-flex + gap (demo CSS)
      row.append(
        // The icon helper accepts the chosen-state vocabulary directly.
        createCheckboxSvgEl({ state: chosenState }),
        en.selectAllRowLabel(chosenCount, totalCount), // reuse the library's translation
      )
      return row
    },
    onChange: (chosen) => { outSelectAll.textContent = 'chosen: ' + chosen.length + ' items' },
  }
)
selSelectAll.setItems(COUNTRIES)
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
// contiguous same-key items form one group. The key is the identity; the label
// is a separate projection (here key === label, so groupKeyToLabelFn is omitted).
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
// Group-level disabled + searchable. groupDisabledFn disables a whole group
// (layers on item-level disabled): its items are not selectable, skipped by
// keyboard, aria-disabled. Filtering regroups survivors; empty groups vanish.
const outGroupDisabled = document.getElementById('out-group-disabled')
const selGroupDisabled = new LLSelectMultiple(
  document.getElementById('mount-group-disabled'),
  {
    placeholder: 'Pick foods (Dairy group disabled)',
    searchable: true,
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
// plain groupKeyToLabel; the icon is aria-hidden.
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
// shell + remove button + aria (the remove aria-label stays itemToString-
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

//#region 12.1
// Language packs (imported at the top: `import { en, ja, zhTW } from
// '@llselect/core/i18n'`) fill the `texts` setting whole; per-key overrides spread
// on top (`texts: { ...zhTW, searchInputPlaceholder: '...' }`). Settings are
// constructor-frozen, so switching locale recreates the instances - the usual
// app pattern. Deliberately NO `placeholder` (so the pack's localized
// `triggerPlaceholder` default shows; an explicit `placeholder` is app copy
// and would win) and NO preselection, so every change on switch comes from
// the pack alone. Three instances: a single (localized placeholder + chosen
// label in the trigger), and two multis because their displays are exclusive -
// 'tags' shows the translated remove buttons (chips replace the count
// summary), default 'count' shows the translated count summary.
const I18N_PACKS = { en, ja, zhTW, ar, he }
const RTL_PACKS = new Set(['ar', 'he'])
const outI18n = document.getElementById('out-i18n')
const i18nPackSelect = document.getElementById('i18n-pack-select')
function createI18nSelects(packName) {
  // The constructor wipes each mount's children, so re-mounting is just `new`.
  const texts = I18N_PACKS[packName]
  // RTL packs set `dir` on the mounts: the component inherits the
  // environment's direction like a native element (there is NO rtl setting).
  // Flex mirrors the trigger slots (arrow lands LEFT, like native <select>),
  // logical padding mirrors the chips, fit-content popups would grow leftward.
  const dir = RTL_PACKS.has(packName) ? 'rtl' : 'ltr'
  const singleMount = document.getElementById('mount-i18n-single')
  const tagsMount = document.getElementById('mount-i18n-tags')
  const countMount = document.getElementById('mount-i18n-count')
  singleMount.dir = dir
  tagsMount.dir = dir
  countMount.dir = dir
  // Single: localized placeholder, and the chosen (possibly RTL) label
  // rendered in the trigger.
  const singleSel = new LLSelectSingle(singleMount, {
    searchable: true,
    clearable: true,
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    texts,
  })
  singleSel.setItems(MIXED_DIRECTION_COUNTRIES)
  const tagsSel = new LLSelectMultiple(tagsMount, {
    searchable: true,
    clearable: true,
    triggerDisplay: 'tags',
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    texts,
    onChange: (chosen) => { outI18n.textContent = 'chosen: ' + chosen.join(', ') },
  })
  // Mixed-direction labels: bidi reorders runs inside each item on its own;
  // the weak-character entries (parens / digits) show the base-direction
  // caveat that per-item dir="auto" / <bdi> would solve (DESIGN.md "RTL").
  tagsSel.setItems(MIXED_DIRECTION_COUNTRIES)
  const countSel = new LLSelectMultiple(countMount, {
    searchable: true,
    clearable: true,
    createTriggerArrowContentElFn: () => createChevronDownSvgEl(),
    texts,
  })
  countSel.setItems(MIXED_DIRECTION_COUNTRIES)
}
i18nPackSelect.addEventListener('change', () => createI18nSelects(i18nPackSelect.value))
createI18nSelects(i18nPackSelect.value)
//#endregion

// --- Inject demo snippets into <pre data-demo="X"><code></code></pre> -----
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

// Inject data.js content into the collapsible <details> at the top.
{
  const dataSrc = await (await fetch('./data.js')).text()
  const target = document.getElementById('data-source')
  if (target) target.innerHTML = highlightJs(dataSrc)
}

// Auto table of contents: id every section from its <h2>, then fill the sticky
// #toc nav (top-level sections only). Stays in sync as demos are added/removed.
{
  const toc = document.getElementById('toc')
  const panel = document.getElementById('toc-panel')
  const slugify = (t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  document.querySelectorAll('section').forEach((sec) => {
    const h2 = sec.querySelector('h2')
    if (!h2) { return }
    sec.id = slugify(h2.textContent)
    const a = document.createElement('a')
    a.href = `#${sec.id}`
    a.textContent = h2.textContent
    a.addEventListener('click', () => { panel.open = false })
    toc.appendChild(a)
  })
}

