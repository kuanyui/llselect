import { LLSelectSingle, LLSELECT_VERSION, chevronDownSvg, triangleDownSvg } from '../dist/index.mjs'
import { COUNTRIES, USERS, STRESS_ITEMS } from './data.js'

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
  // Remove previous BS link (if any), then add the matching one.
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
// Apply initial selection (e.g. browser remembered last value).
applyTheme(themeSelect.value)

// 1.1 Strings
const outCountries = document.getElementById('out-countries')
const selCountries = new LLSelectSingle(
  document.getElementById('mount-countries'),
  {
    placeholder: 'Pick a country',
    onChange: (v) => { outCountries.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selCountries.setItems(COUNTRIES)

// 1.2 Objects with custom template + compareFn
const outUsers = document.getElementById('out-users')
class UserSelect extends LLSelectSingle {
  templateItem(user) { return `#${user.id} ${user.name} (${user.role})` }
}
const selUsers = new UserSelect(
  document.getElementById('mount-users'),
  {
    placeholder: 'Pick a user',
    compareFn: (a, b) => a.id === b.id,
    onChange: (v) => { outUsers.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selUsers.setItems(USERS)

// 1.3 Stress test (200 options)
const outStress = document.getElementById('out-stress')
const selStress = new LLSelectSingle(
  document.getElementById('mount-stress'),
  {
    placeholder: 'Pick an item (200 entries)',
    onChange: (v) => { outStress.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selStress.setItems(STRESS_ITEMS)

// 2.1 Scrollable container
const outScroll = document.getElementById('out-scroll')
const selScroll = new LLSelectSingle(
  document.getElementById('mount-scroll'),
  {
    placeholder: 'Pick a country (in scroll container)',
    onChange: (v) => { outScroll.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selScroll.setItems(COUNTRIES)
// Position the select roughly in the middle of the container so scrolling
// up clips the anchor below the container, and scrolling down clips it above.
const scrollContainer = document.querySelector('.scroll-container')
const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
scrollContainer.scrollTop = 10 * rem

// 3.1 Outside-click pass-through
let passCount = 0
const btnPass = document.getElementById('btn-pass')
btnPass.addEventListener('click', () => {
  passCount++
  btnPass.textContent = `Outside button (clicks: ${passCount})`
})
const selPass = new LLSelectSingle(
  document.getElementById('mount-pass'),
  { placeholder: 'pass-through select' }  // default behavior
)
selPass.setItems(COUNTRIES)

// 3.2 Outside-click block
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

// 4.1 No arrow (default - lib does nothing)
new LLSelectSingle(
  document.getElementById('mount-ind-none'),
  { placeholder: 'No arrow' },
).setItems(COUNTRIES)

// 4.2a chevronDownSvg
new LLSelectSingle(
  document.getElementById('mount-ind-chevron'),
  {
    placeholder: 'chevron',
    renderArrow: () => chevronDownSvg(),
  },
).setItems(COUNTRIES)

// 4.2b triangleDownSvg
new LLSelectSingle(
  document.getElementById('mount-ind-triangle'),
  {
    placeholder: 'triangle',
    renderArrow: () => triangleDownSvg(),
  },
).setItems(COUNTRIES)

// 4.3 Material Design Icons
new LLSelectSingle(
  document.getElementById('mount-ind-mdi'),
  {
    placeholder: 'mdi icon',
    renderArrow: () => {
      const i = document.createElement('i')
      i.className = 'mdi mdi-chevron-down'
      return i
    },
  },
).setItems(COUNTRIES)

// 4.4 CSS-only triangle (no renderArrow; CSS handles everything via data-state)
// Lib does nothing in the arrow slot; the demo styles a ::after pseudo-element.
new LLSelectSingle(
  document.getElementById('mount-ind-css'),
  { placeholder: 'CSS triangle (no JS)' },
).setItems(COUNTRIES)

// 5. Near page bottom (flip up)
const outBottom = document.getElementById('out-bottom')
const selBottom = new LLSelectSingle(
  document.getElementById('mount-bottom'),
  {
    placeholder: 'Pick a country (near page bottom)',
    onChange: (v) => { outBottom.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selBottom.setItems(COUNTRIES)
