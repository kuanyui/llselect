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
const ixStage = document.getElementById('ix-stage')

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

// Select-one-option op per library (for the interaction test), in multiple
// mode so it adds without closing. Best-effort per version; guarded at call.
const PICK = {
  llselect: (h, item) => h.inst.toggleItem(item),
  choices: (h, item) => h.inst.setChoiceByValue(item),
  select2: (h, item) => { const cur = h.$sel.val() || []; h.$sel.val(cur.concat(item)).trigger('change') },
  'tom-select': (h, item) => h.inst.addItem(item, true),
  'slim-select': (h, item) => h.inst.setSelected(h.inst.getSelected().concat(item)),
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
let results = {} // key -> latest metrics for the current scenario, for the chart
let ixLive = {} // key -> handle of the one dedicated interaction widget

function clearStage() {
  for (const { key, h } of live) { try { ADAPTERS[key].teardown(h) } catch (e) { /* ignore */ } }
  live = []
  stage.replaceChildren()
}

// Build all N widgets in chunks, yielding between them. With the budget on, a
// library that overruns is cut off (timedOut). With noTimeout, it builds every
// widget no matter how long. Returns compute time (yields excluded) and how
// many were built.
async function buildAll(key, scen, custom, noTimeout) {
  const a = ADAPTERS[key]
  const status = document.getElementById('status')
  const items = buildItems(scen.itemsPer)
  const opts = { multi: scen.multi, custom }
  const CHUNK = scen.widgets >= 1000 ? 25 : 1
  let built = 0
  let compute = 0
  let timedOut = false
  let errored = false
  let chunk = 0
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
    if (!noTimeout && performance.now() - wall0 > BUDGET_MS) { timedOut = true; break }
    if (++chunk % 8 === 0) { status.textContent = `${DISPLAY[key].name}: built ${built} / ${scen.widgets} ...` }
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
  const noTimeout = document.getElementById('no-timeout').checked
  clearStage()
  await raf()
  status.textContent = `${DISPLAY[key].name}: building ${scen.widgets} widget(s) x ${scen.itemsPer} items ...`
  await raf()
  const before = countNodes()
  const res = await buildAll(key, scen, custom, noTimeout)
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

  results[key] = {
    built: res.built, target: scen.widgets, compute: res.compute, nodes,
    filter: ADAPTERS[key].noFilter ? null : filterMs, timedOut: res.timedOut, errored: res.errored,
  }
  highlightBest()
  renderChart(document.getElementById('chart-metric').value)
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

// --- chart ----------------------------------------------------------------
// Pure CSS bars (no chart library - keeps the demo dependency-free). Default
// metric is throughput (built / time), which stays comparable even when a
// library timed out, because it is a per-widget rate rather than a total.

const METRICS = {
  throughput: {
    higherBetter: true,
    value: r => (r.compute > 0 ? r.built / r.compute * 1000 : null),
    fmt: v => Math.round(v).toLocaleString() + ' /s',
  },
  compute: {
    higherBetter: false,
    value: r => r.compute,
    fmt: v => (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString()) + ' ms',
  },
  nodes: {
    higherBetter: false,
    value: r => r.nodes,
    fmt: v => Math.round(v).toLocaleString(),
  },
  filter: {
    higherBetter: false,
    value: r => r.filter,
    fmt: v => (v < 10 ? v.toFixed(2) : v.toFixed(0)) + ' ms',
  },
}

function renderChart(metricKey) {
  const chart = document.getElementById('chart')
  const caption = document.getElementById('chart-caption')
  const metric = METRICS[metricKey]
  const rows = ORDER
    .filter(k => results[k])
    .map(k => ({ k, v: metric.value(results[k]), r: results[k] }))
    .filter(x => x.v != null && !isNaN(x.v))
  chart.replaceChildren()
  if (!rows.length) { chart.textContent = 'Run a scenario to see the chart.'; caption.textContent = ''; return }
  caption.textContent = metric.higherBetter ? '(longer is better)' : '(longer is worse; shortest wins)'
  const max = Math.max(...rows.map(x => x.v))
  const best = metric.higherBetter ? max : Math.min(...rows.map(x => x.v))
  for (const { k, v, r } of rows) {
    const row = document.createElement('div'); row.className = 'chart-row'
    const label = document.createElement('div'); label.className = 'chart-label'; label.textContent = DISPLAY[k].name
    const track = document.createElement('div'); track.className = 'chart-track'
    const bar = document.createElement('div'); bar.className = 'chart-bar'
    bar.style.width = (max > 0 ? Math.max(1, v / max * 100) : 0) + '%'
    if (v === best) { bar.classList.add('best') }
    if (r.timedOut || r.errored) { bar.classList.add('partial') }
    const val = document.createElement('span'); val.className = 'chart-value'
    val.textContent = metric.fmt(v) + ((r.timedOut || r.errored) ? ` (built ${r.built}/${r.target})` : '')
    bar.appendChild(val)
    track.appendChild(bar)
    row.append(label, track)
    chart.appendChild(row)
  }
}

// --- interaction latency --------------------------------------------------
// One dedicated widget per library (multiple mode, so select does not close),
// timing open -> select -> close over a few cycles. Each phase is guarded, so a
// version drift on one op leaves the others intact.

function measureInteraction(key, items) {
  const a = ADAPTERS[key]
  const pick = PICK[key]
  const h = ixLive[key]
  if (!a.open || !pick || !h) { return null }
  const CYCLES = 6
  const open = [], sel = [], close = []
  for (let i = 0; i < CYCLES; i++) {
    try { const t = performance.now(); a.open(h); reflow(ixStage); open.push(performance.now() - t) } catch (e) { console.warn(key, 'open', e) }
    try { const t = performance.now(); pick(h, items[i]); reflow(ixStage); sel.push(performance.now() - t) } catch (e) { console.warn(key, 'pick', e) }
    try { const t = performance.now(); a.close(h); reflow(ixStage); close.push(performance.now() - t) } catch (e) { console.warn(key, 'close', e) }
  }
  const med = arr => (arr.length > 1 ? median(arr.slice(1)) : (arr.length ? arr[0] : null)) // drop first as warm-up
  return { open: med(open), select: med(sel), close: med(close) }
}

function ixRow(key) { return document.querySelector(`#ix-results tbody tr[data-lib="${key}"]`) }

function ixInitTable() {
  const tbody = document.querySelector('#ix-results tbody')
  tbody.replaceChildren()
  for (const key of ORDER) {
    const tr = document.createElement('tr'); tr.dataset.lib = key
    const nameTd = document.createElement('td')
    const a = document.createElement('a'); a.href = DISPLAY[key].url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = DISPLAY[key].name
    nameTd.appendChild(a); tr.appendChild(nameTd)
    for (const col of ['open', 'select', 'close']) { const td = document.createElement('td'); td.dataset.col = col; tr.appendChild(td) }
    tbody.appendChild(tr)
  }
}

function ixSetRow(key, m) {
  const cell = col => ixRow(key).querySelector(`td[data-col="${col}"]`)
  if (m && m.na) { cell('open').textContent = m.na; cell('select').textContent = ''; cell('close').textContent = ''; return }
  if (m && m.err) { cell('open').textContent = 'error'; cell('select').textContent = ''; cell('close').textContent = ''; return }
  for (const col of ['open', 'select', 'close']) {
    const v = m ? m[col] : null
    cell(col).textContent = m == null ? 'n/a' : fmt(v)
    if (v != null && !isNaN(v)) { cell(col).dataset.value = v } else { delete cell(col).dataset.value }
  }
}

function ixHighlightBest() {
  for (const col of ['open', 'select', 'close']) {
    let best = Infinity, bestKey = null
    for (const key of ORDER) {
      const c = ixRow(key).querySelector(`td[data-col="${col}"]`); c.classList.remove('best')
      const v = parseFloat(c.dataset.value); if (!isNaN(v) && v < best) { best = v; bestKey = key }
    }
    if (bestKey) { ixRow(bestKey).querySelector(`td[data-col="${col}"]`).classList.add('best') }
  }
}

function ixClear() {
  for (const key of Object.keys(ixLive)) { try { ADAPTERS[key].teardown(ixLive[key]) } catch (e) { /* ignore */ } }
  ixLive = {}
  ixStage.replaceChildren()
}

async function ixBuildAndMeasure() {
  const runBtn = document.getElementById('ix-run')
  const status = document.getElementById('ix-status')
  runBtn.disabled = true
  ixClear(); ixInitTable()
  const n = Number(document.getElementById('ix-size').value)
  const items = buildItems(n)
  for (const key of ORDER) {
    if (!available(key)) { ixSetRow(key, { na: 'not loaded' }); continue }
    status.textContent = `${DISPLAY[key].name}: building 1 widget x ${n} ...`
    await raf()
    const cell = document.createElement('div'); cell.className = 'ix-cell'
    const lab = document.createElement('div'); lab.className = 'ix-lab'; lab.textContent = DISPLAY[key].name
    const mount = document.createElement('div'); mount.className = 'ix-mount'
    cell.append(lab, mount); ixStage.appendChild(cell)
    try { ixLive[key] = ADAPTERS[key].setup(mount, items, { multi: true, custom: false }) } catch (e) { console.warn(key, e); ixSetRow(key, { err: true }); continue }
    await raf()
    status.textContent = `${DISPLAY[key].name}: measuring open / select / close ...`
    await raf()
    ixSetRow(key, ADAPTERS[key].noFilter ? null : measureInteraction(key, items))
    ixHighlightBest()
    await raf()
  }
  runBtn.disabled = false
  status.textContent = 'Done. Lower is better. The widgets are live - open them yourself too.'
}

// --- wire up --------------------------------------------------------------

function reset(msg) {
  clearStage()
  results = {}
  initTable()
  renderChart(document.getElementById('chart-metric').value)
  document.getElementById('status').textContent = msg
}

initTable()
ixInitTable()
document.getElementById('run-all').addEventListener('click', () => { runAll() })
document.getElementById('clear').addEventListener('click', () => { reset('Cleared.') })
// A scenario change invalidates the accumulated results (they are per-scenario).
document.getElementById('scenario').addEventListener('change', () => { reset('Scenario changed - results reset.') })
document.getElementById('chart-metric').addEventListener('change', (e) => { renderChart(e.target.value) })
document.querySelectorAll('.bench-libbuttons button').forEach(btn => {
  btn.addEventListener('click', () => { runLib(btn.dataset.lib) })
})
document.getElementById('ix-run').addEventListener('click', () => { ixBuildAndMeasure() })
document.getElementById('ix-size').addEventListener('change', () => { ixClear(); ixInitTable(); document.getElementById('ix-status').textContent = 'Size changed - press Build + measure.' })
document.getElementById('versions').textContent =
  ORDER.map(k => `${DISPLAY[k].name} ${DISPLAY[k].version}`).join('  |  ') + '  |  jQuery 3.7.1 (for Select2)'
measureSizes()
