// Mass-instantiation stress benchmark. REAL BROWSER ONLY (needs layout + the
// CDN libraries loaded by benchmark.html). Builds many INDEPENDENT selects for
// one scenario, renders them in the on-page scratch area, and measures it.
//
// Fairness notes:
// - Every library loads its minified CDN build; llselect loads its minified UMD
//   (../dist/index.umd.js), so bundle size and parse cost are compared like for
//   like. Native <select> is the baseline floor.
// - Widgets are built in small chunks with a yield between them, under a per-
//   library time budget, so a runaway library is cut off instead of freezing
//   the tab. The yields are excluded from the reported compute time.
// - Every op is guarded: an adapter that cannot drive a loaded version reports
//   "-"/error for that cell rather than breaking the page.

const BUDGET_MS = 20000

// Display name + homepage for each library (rendered as a link), plus the
// version actually under test (matches the CDN URLs in benchmark.html).
const DISPLAY = {
  native: { name: 'Native <select>', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select', version: 'browser built-in' },
  llselect: { name: 'llselect', url: 'https://gitlab.com/kuanyui/llselect', version: (window.llselect && window.llselect.LLSELECT_VERSION) || '(local build)' },
  choices: { name: 'Choices.js', url: 'https://github.com/Choices-js/Choices', version: '11.1.0' },
  select2: { name: 'Select2', url: 'https://select2.org/', version: '4.1.0-rc.0' },
  'tom-select': { name: 'Tom Select', url: 'https://tom-select.js.org/', version: '2.4.3' },
  'slim-select': { name: 'Slim Select', url: 'https://slimselectjs.com/', version: '2.10.0' },
}
const ORDER = ['native', 'llselect', 'choices', 'select2', 'tom-select', 'slim-select']

const SCENARIOS = {
  s1: { widgets: 10000, itemsPer: 10, multi: false },
  s2: { widgets: 10000, itemsPer: 10, multi: true },
  s3: { widgets: 10, itemsPer: 10000, multi: false },
  s4: { widgets: 10, itemsPer: 10000, multi: true },
}

// llselect UMD is now minified, so its number is comparable to the competitors'.
const SIZE_URLS = {
  llselect: '../dist/index.umd.js',
  choices: 'https://cdn.jsdelivr.net/npm/choices.js@11.1.0/public/assets/scripts/choices.min.js',
  select2: 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
  'tom-select': 'https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js',
  'slim-select': 'https://cdn.jsdelivr.net/npm/slim-select@2.10.0/dist/slimselect.umd.js',
  jquery: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
}

const stage = document.getElementById('stage')

// --- item content helpers (custom-renderer variant) -----------------------

function iconSpan(text) {
  const s = document.createElement('span')
  const i = document.createElement('i')
  i.className = 'mdi mdi-tag-outline'
  i.setAttribute('aria-hidden', 'true')
  s.append(i, ' ' + text)
  return s
}
function iconHtml(text) { return '<i class="mdi mdi-tag-outline" aria-hidden="true"></i> ' + text }

// --- adapters -------------------------------------------------------------
// setup(mount, items, {multi, custom}) -> handle; open/filter/close/teardown
// operate on that handle. Adapters with noFilter skip the filter sample.

function makeSelect(mount, multi) {
  const sel = document.createElement('select')
  if (multi) { sel.multiple = true }
  mount.appendChild(sel)
  return sel
}

const ADAPTERS = {
  native: {
    noFilter: true, // native <select> has no in-widget filter
    setup(mount, items, { multi }) {
      const sel = makeSelect(mount, multi)
      const frag = document.createDocumentFragment()
      for (const v of items) {
        const o = document.createElement('option')
        o.value = v; o.textContent = v
        frag.appendChild(o)
      }
      sel.appendChild(frag)
      return { sel }
    },
    teardown(h) { h.sel.remove() },
  },
  llselect: {
    setup(mount, items, { multi, custom }) {
      const Ctor = multi ? window.llselect.LLSelectMultiple : window.llselect.LLSelectSingle
      const opts = { searchable: true }
      if (custom) { opts.createItemContentElFn = (it) => iconSpan(it) }
      const inst = new Ctor(mount, opts)
      inst.setItems(items)
      return { inst, mount }
    },
    open(h) { h.inst.open() },
    filter(h, q) { const i = h.mount.querySelector('input'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.inst.close() },
    teardown(h) { h.inst.destroy() },
  },
  choices: {
    setup(mount, items, { multi, custom }) {
      const sel = makeSelect(mount, multi)
      const inst = new window.Choices(sel, { searchEnabled: true, allowHTML: !!custom, silent: true, removeItemButton: false })
      inst.setChoices(items.map(v => ({ value: v, label: custom ? iconHtml(v) : v })), 'value', 'label', true)
      return { inst }
    },
    open(h) { h.inst.showDropdown() },
    filter(h, q) { const i = h.inst.input.element; i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.inst.hideDropdown() },
    teardown(h) { h.inst.destroy() },
  },
  select2: {
    setup(mount, items, { multi, custom }) {
      const sel = makeSelect(mount, multi)
      const $sel = window.jQuery(sel)
      const cfg = { data: items.map(v => ({ id: v, text: v })), width: '260px' }
      if (custom) { cfg.templateResult = (o) => (o.id ? window.jQuery('<span>' + iconHtml(o.text) + '</span>') : o.text) }
      $sel.select2(cfg)
      return { $sel }
    },
    open(h) { h.$sel.select2('open') },
    filter(h, q) { const i = document.querySelector('.select2-container--open .select2-search__field'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.$sel.select2('close') },
    teardown(h) { h.$sel.select2('destroy') },
  },
  'tom-select': {
    setup(mount, items, { multi, custom }) {
      const sel = makeSelect(mount, multi)
      // Keep Tom Select's rendered-option cap: capping is its perf strategy,
      // the counterpart to llselect's lazy render (see caveats).
      const cfg = { options: items.map(v => ({ value: v, text: v })), maxItems: multi ? null : 1 }
      if (custom) { cfg.render = { option: (d, esc) => '<div>' + iconHtml(esc(d.text)) + '</div>' } }
      return { inst: new window.TomSelect(sel, cfg) }
    },
    open(h) { h.inst.open() },
    filter(h, q) { h.inst.setTextboxValue(q); h.inst.refreshOptions(true) },
    close(h) { h.inst.close() },
    teardown(h) { h.inst.destroy() },
  },
  'slim-select': {
    setup(mount, items, { multi, custom }) {
      const sel = makeSelect(mount, multi)
      const data = items.map(v => (custom ? { text: v, value: v, html: iconHtml(v) } : { text: v, value: v }))
      return { inst: new window.SlimSelect({ select: sel, settings: { showSearch: true }, data }) }
    },
    open(h) { h.inst.open() },
    filter(h, q) { const i = document.querySelector('.ss-content .ss-search input'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.inst.close() },
    teardown(h) { h.inst.destroy() },
  },
}

function available(key) {
  switch (key) {
    case 'native': return true
    case 'llselect': return !!window.llselect
    case 'choices': return !!window.Choices
    case 'select2': return !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.select2)
    case 'tom-select': return !!window.TomSelect
    case 'slim-select': return !!window.SlimSelect
    default: return false
  }
}

// --- harness --------------------------------------------------------------

const raf = () => new Promise(r => requestAnimationFrame(r))
function reflow(el) { return el.offsetHeight }
function safe(fn) { try { return fn() } catch (e) { console.warn(e); return null } }
function median(xs) { const s = xs.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
function buildItems(n) { return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0')) }
function countNodes() { return stage.querySelectorAll('*').length }

let live = [] // { key, h } currently rendered, for teardown

function clearStage() {
  for (const { key, h } of live) { try { ADAPTERS[key].teardown(h) } catch (e) { /* ignore */ } }
  live = []
  stage.replaceChildren()
}

// Build all N widgets in chunks, yielding between them, stopping at the budget.
// Returns compute time (yields excluded) plus how many were built.
async function buildAll(key, scen, custom) {
  const a = ADAPTERS[key]
  const items = buildItems(scen.itemsPer)
  const opts = { multi: scen.multi, custom }
  const CHUNK = scen.widgets >= 1000 ? 25 : 1
  let built = 0
  let compute = 0
  let timedOut = false
  let errored = false
  const wall0 = performance.now()
  for (let i = 0; i < scen.widgets; i += CHUNK) {
    const end = Math.min(i + CHUNK, scen.widgets)
    const c0 = performance.now()
    for (let j = i; j < end; j++) {
      const mount = document.createElement('div')
      mount.className = 'bench-widget'
      stage.appendChild(mount)
      try { live.push({ key, h: a.setup(mount, items, opts) }); built++ } catch (e) { console.warn(key, e); errored = true; break }
    }
    compute += performance.now() - c0
    if (errored) { break }
    if (performance.now() - wall0 > BUDGET_MS) { timedOut = true; break }
    await raf()
  }
  reflow(stage)
  return { built, compute, timedOut, errored }
}

function sampleFilter(key, scen) {
  const a = ADAPTERS[key]
  if (a.noFilter || !live.length) { return null }
  const h = live[0].h
  const q = scen.itemsPer > 100 ? '7777' : '5'
  return safe(() => {
    a.open(h)
    const samples = []
    for (let i = 0; i < 4; i++) { const t0 = performance.now(); a.filter(h, q); reflow(stage); if (i > 0) { samples.push(performance.now() - t0) } }
    a.close(h)
    return median(samples)
  })
}

// --- table ----------------------------------------------------------------

function fmt(ms) { return ms == null ? '-' : (ms < 10 ? ms.toFixed(2) : ms.toFixed(0)) }

function rowFor(key) { return document.querySelector(`#results tbody tr[data-lib="${key}"]`) }

function initTable() {
  const tbody = document.querySelector('#results tbody')
  tbody.replaceChildren()
  for (const key of ORDER) {
    const tr = document.createElement('tr')
    tr.dataset.lib = key
    const nameTd = document.createElement('td')
    const a = document.createElement('a')
    a.href = DISPLAY[key].url; a.target = '_blank'; a.rel = 'noopener'
    a.textContent = DISPLAY[key].name
    nameTd.appendChild(a)
    tr.appendChild(nameTd)
    for (const col of ['built', 'compute', 'nodes', 'filter']) {
      const td = document.createElement('td'); td.dataset.col = col; td.textContent = ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
}

function setCell(key, col, text) { rowFor(key).querySelector(`td[data-col="${col}"]`).textContent = text }

function highlightBest() {
  for (const col of ['compute', 'nodes', 'filter']) {
    let best = Infinity, bestKey = null
    for (const key of ORDER) {
      const cell = rowFor(key).querySelector(`td[data-col="${col}"]`)
      cell.classList.remove('best')
      const v = parseFloat(cell.dataset.value)
      if (!isNaN(v) && v < best) { best = v; bestKey = key }
    }
    if (bestKey) { rowFor(bestKey).querySelector(`td[data-col="${col}"]`).classList.add('best') }
  }
}

async function runLib(key) {
  const status = document.getElementById('status')
  const scen = SCENARIOS[document.getElementById('scenario').value]
  const custom = document.getElementById('custom').checked
  if (!available(key)) { setCell(key, 'built', 'not loaded'); return }
  clearStage()
  await raf()
  status.textContent = `${DISPLAY[key].name}: building ${scen.widgets} widget(s) x ${scen.itemsPer} items ...`
  await raf()
  const before = countNodes()
  const res = await buildAll(key, scen, custom)
  const nodes = countNodes() - before
  const filterMs = sampleFilter(key, scen)

  const builtCell = rowFor(key).querySelector('td[data-col="built"]')
  builtCell.textContent = `${res.built} / ${scen.widgets}` + (res.errored ? ' (error)' : res.timedOut ? ' (timeout)' : '')

  const computeCell = rowFor(key).querySelector('td[data-col="compute"]')
  computeCell.textContent = fmt(res.compute); computeCell.dataset.value = res.compute

  const nodesCell = rowFor(key).querySelector('td[data-col="nodes"]')
  nodesCell.textContent = nodes.toLocaleString(); nodesCell.dataset.value = nodes

  const filterCell = rowFor(key).querySelector('td[data-col="filter"]')
  filterCell.textContent = ADAPTERS[key].noFilter ? 'n/a' : fmt(filterMs)
  if (filterMs != null) { filterCell.dataset.value = filterMs } else { delete filterCell.dataset.value }

  highlightBest()
  status.textContent = `${DISPLAY[key].name} done. Lower is better.`
}

async function runAll() {
  document.getElementById('run-all').disabled = true
  for (const key of ORDER) { await runLib(key) }
  document.getElementById('run-all').disabled = false
  document.getElementById('status').textContent = 'All done. Lower is better.'
}

// --- bundle sizes ---------------------------------------------------------

async function measureSizes() {
  const tbody = document.querySelector('#sizes tbody')
  tbody.replaceChildren()
  // native has no script payload
  const nativeTr = document.createElement('tr')
  nativeTr.innerHTML = '<td>Native &lt;select&gt;</td><td>browser built-in</td><td>0 KB</td>'
  tbody.appendChild(nativeTr)
  for (const [key, url] of Object.entries(SIZE_URLS)) {
    const tr = document.createElement('tr')
    const name = document.createElement('td'); name.textContent = key === 'jquery' ? 'jQuery (for Select2)' : DISPLAY[key].name
    const ver = document.createElement('td'); ver.textContent = key === 'jquery' ? '3.7.1' : DISPLAY[key].version
    const size = document.createElement('td'); size.textContent = '...'
    tr.append(name, ver, size); tbody.appendChild(tr)
    try {
      const buf = await (await fetch(url)).arrayBuffer()
      size.textContent = (buf.byteLength / 1024).toFixed(1) + ' KB'
    } catch (e) { size.textContent = '-' }
  }
}

// --- wire up --------------------------------------------------------------

initTable()
document.getElementById('run-all').addEventListener('click', () => { runAll() })
document.getElementById('clear').addEventListener('click', () => { clearStage(); document.getElementById('status').textContent = 'Cleared.' })
document.querySelectorAll('.bench-libbuttons button').forEach(btn => {
  btn.addEventListener('click', () => { runLib(btn.dataset.lib) })
})
document.getElementById('versions').textContent =
  ORDER.map(k => `${DISPLAY[k].name} ${DISPLAY[k].version}`).join('  |  ') + '  |  jQuery 3.7.1 (for Select2)'
measureSizes()
