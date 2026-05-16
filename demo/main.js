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
//#endregion

//#region 1.3
const outStress = document.getElementById('out-stress')
const selStress = new LLSelectSingle(
  document.getElementById('mount-stress'),
  {
    placeholder: 'Pick an item (200 entries)',
    onChange: (v) => { outStress.textContent = 'chosen: ' + JSON.stringify(v) },
  }
)
selStress.setItems(STRESS_ITEMS)
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
//#endregion

//#region 4.3
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
//#endregion

//#region 4.4
// Lib does nothing in the arrow slot; the demo styles a ::after pseudo-element.
new LLSelectSingle(
  document.getElementById('mount-ind-css'),
  { placeholder: 'CSS triangle (no JS)' },
).setItems(COUNTRIES)
//#endregion

//#region 5
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
