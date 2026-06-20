import { LLSelectSingle, LLSelectMultiple, LLSELECT_VERSION, chevronDownSvg, triangleDownSvg, checkboxSvg } from '../dist/index.mjs'
import { COUNTRIES, USERS, HUGE_ITEMS, LONG_NAMES, LANGUAGES } from './data.js'

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

//#region 10.1
// renderItemContentFn fills each option's VISIBLE content (icon + label), no
// subclass. The library still owns the option shell + aria: it pins each
// option's aria-label to itemToString (the icon never reaches a screen reader),
// so you write zero aria-*. The trigger stays plain text here - to give it an
// icon too, write your own renderTriggerContentFn (there is no auto-projection).
function languageRow(lang) {
  const row = document.createElement('span')
  row.className = 'lang-row'
  const icon = document.createElement('i')
  icon.className = `mdi mdi-${lang.icon}`
  icon.setAttribute('aria-hidden', 'true')  // decorative; aria-label covers the name
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
    renderItemContentFn: languageRow,         // visible content only
    onChange: (v) => { outRichSingle.textContent = 'chosen: ' + (v ? v.name : '(none)') },
  }
)
selRichSingle.setItems(LANGUAGES)
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
// 4.2a chevronDownSvg
new LLSelectSingle(
  document.getElementById('mount-ind-chevron'),
  {
    placeholder: 'chevron',
    renderArrowFn: () => chevronDownSvg(),
  },
).setItems(COUNTRIES)

// 4.2b triangleDownSvg
new LLSelectSingle(
  document.getElementById('mount-ind-triangle'),
  {
    placeholder: 'triangle',
    renderArrowFn: () => triangleDownSvg(),
  },
).setItems(COUNTRIES)
//#endregion

//#region 4.3
new LLSelectSingle(
  document.getElementById('mount-ind-mdi'),
  {
    placeholder: 'mdi icon',
    renderArrowFn: () => {
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
    const box = checkboxSvg({ state: this.isChosen(item) ? 'checked' : 'unchecked' })
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

//#region 10.2
// Same renderItemContentFn, now on a multiple. The library adds aria-selected
// to each option shell on top of the auto aria-label, so AT announces e.g.
// "Python, selected" while the row shows the mdi icon. Reuses languageRow (1.3).
const outRichMulti = document.getElementById('out-rich-multi')
const selRichMulti = new LLSelectMultiple(
  document.getElementById('mount-rich-multi'),
  {
    placeholder: 'Pick languages',
    compareFn: (a, b) => a.name === b.name,
    itemToStringFn: (lang) => lang.name,
    renderItemContentFn: languageRow,
    onChange: (chosen) => {
      outRichMulti.textContent = 'chosen: ' + chosen.map((l) => l.name).join(', ')
    },
  }
)
selRichMulti.setItems(LANGUAGES)
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
    el.prepend(checkboxSvg({ state: this.isChosen(item) ? 'checked' : 'unchecked' }))
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
    if (this.isItemDisabled(p)) { el.setAttribute('title', `${p.name} is out of stock`) }
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

//#region 11
const outBottom = document.getElementById('out-bottom')
const selBottom = new LLSelectSingle(
  document.getElementById('mount-bottom'),
  {
    placeholder: 'Pick a country (near page bottom)',
    onChange: (v) => { outBottom.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selBottom.setItems(COUNTRIES)
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

// Auto table of contents: id every section + article from its heading, then
// fill the sticky #toc nav. Keeps the TOC in sync as demos are added/removed.
{
  const toc = document.getElementById('toc')
  const panel = document.getElementById('toc-panel')
  const slugify = (t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const addLink = (text, id, cls) => {
    const a = document.createElement('a')
    a.href = `#${id}`
    a.textContent = text
    a.className = cls
    a.addEventListener('click', () => { panel.open = false })
    toc.appendChild(a)
  }
  document.querySelectorAll('section').forEach((sec) => {
    const h2 = sec.querySelector('h2')
    if (!h2) { return }
    sec.id = slugify(h2.textContent)
    addLink(h2.textContent, sec.id, 'toc-h2')
    sec.querySelectorAll('article > h3').forEach((h3) => {
      const article = h3.closest('article')
      article.id = slugify(h3.textContent)
      addLink(h3.textContent, article.id, 'toc-h3')
    })
  })
}

// Minimal JS syntax highlighter. Tokenises left-to-right with a small set of
// patterns; HTML-escapes everything for safety. Good enough for the curated
// snippets shown here - not a real JS parser. Output uses .hl-* classes
// styled in demo/style.css.
function highlightJs(src) {
  const KEYWORDS = /^\b(const|let|var|function|class|extends|new|return|if|else|for|while|import|export|from|as|async|await|true|false|null|undefined|typeof|instanceof|of|in|do|switch|case|break|continue|default|throw|try|catch|finally|this|super|yield|void|static)\b/
  const patterns = [
    [/^\/\/[^\n]*/, 'comment'],
    [/^\/\*[\s\S]*?\*\//, 'comment'],
    [/^"(?:[^"\\\n]|\\.)*"/, 'string'],
    [/^'(?:[^'\\\n]|\\.)*'/, 'string'],
    [/^`(?:[^`\\]|\\.)*`/, 'string'],
    [KEYWORDS, 'keyword'],
    [/^\b\d+(?:\.\d+)?\b/, 'number'],
    [/^[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()/, 'func'],
  ]
  const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  let out = ''
  let i = 0
  while (i < src.length) {
    const rest = src.slice(i)
    let matched = false
    for (const [re, type] of patterns) {
      const m = rest.match(re)
      if (m) {
        out += `<span class="hl-${type}">${esc(m[0])}</span>`
        i += m[0].length
        matched = true
        break
      }
    }
    if (!matched) {
      out += esc(src[i])
      i++
    }
  }
  return out
}
