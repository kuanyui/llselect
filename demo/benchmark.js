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
  's-100x100': { widgets: 100, itemsPer: 100, multi: false },
  's-1000x10': { widgets: 1000, itemsPer: 10, multi: false },
  's-10000x10': { widgets: 10000, itemsPer: 10, multi: false },
  's-10x10000': { widgets: 10, itemsPer: 10000, multi: false },
  'm-100x100': { widgets: 100, itemsPer: 100, multi: true },
  'm-1000x10': { widgets: 1000, itemsPer: 10, multi: true },
  'm-10000x10': { widgets: 10000, itemsPer: 10, multi: true },
  'm-10x10000': { widgets: 10, itemsPer: 10000, multi: true },
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

// How many items to pre-select when the toggle is on: one for a single-select,
// 10% for a multiple-select (renders a value / chips at build time).
function preCount(items, opts) {
  if (!opts.preselect) { return 0 }
  return opts.multi ? Math.max(1, Math.ceil(items.length * 0.1)) : 1
}

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
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      const frag = document.createDocumentFragment()
      items.forEach((v, i) => {
        const o = document.createElement('option')
        o.value = v; o.textContent = v
        if (i < k) { o.selected = true }
        frag.appendChild(o)
      })
      sel.appendChild(frag)
      return { sel }
    },
    teardown(h) { h.sel.remove() },
  },
  llselect: {
    setup(mount, items, opts) {
      const Ctor = opts.multi ? window.llselect.LLSelectMultiple : window.llselect.LLSelectSingle
      const o = { searchable: true }
      // Match the competitors: their multi-selects render each chosen item as a
      // chip, so llselect renders tags too (not the lighter count summary),
      // otherwise it would be doing less per-selection work than they do.
      if (opts.multi) { o.triggerDisplay = 'tags' }
      if (opts.custom) {
        o.createItemContentElFn = (it) => iconSpan(it)
        // If list items carry an icon, the chosen display must carry it too:
        // the tag chips in multi, the trigger content in single.
        if (opts.multi) { o.createTagContentElFn = (it) => iconSpan(it) } else { o.createTriggerContentElFn = (ctx) => (ctx.chosenItem == null ? null : iconSpan(ctx.chosenItem)) }
      }
      const inst = new Ctor(mount, o)
      inst.setItems(items)
      const k = preCount(items, opts)
      if (k > 0) { if (opts.multi) { inst.setChosenItems(items.slice(0, k)) } else { inst.setChosenItem(items[0]) } }
      return { inst, mount }
    },
    open(h) { h.inst.open() },
    filter(h, q) { const i = h.mount.querySelector('input'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.inst.close() },
    teardown(h) { h.inst.destroy() },
  },
  choices: {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      const inst = new window.Choices(sel, { searchEnabled: true, allowHTML: !!opts.custom, silent: true, removeItemButton: false })
      inst.setChoices(items.map((v, i) => ({ value: v, label: opts.custom ? iconHtml(v) : v, selected: i < k })), 'value', 'label', true)
      return { inst }
    },
    open(h) { h.inst.showDropdown() },
    filter(h, q) { const i = h.inst.input.element; i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.inst.hideDropdown() },
    teardown(h) { h.inst.destroy() },
  },
  select2: {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      const $sel = window.jQuery(sel)
      const cfg = { data: items.map(v => ({ id: v, text: v })), width: '260px' }
      if (opts.custom) {
        const tmpl = (o) => (o.id ? window.jQuery('<span>' + iconHtml(o.text) + '</span>') : o.text)
        cfg.templateResult = tmpl // dropdown option
        cfg.templateSelection = tmpl // the chosen chip
      }
      $sel.select2(cfg)
      if (k > 0) { $sel.val(opts.multi ? items.slice(0, k) : items[0]).trigger('change') }
      return { $sel }
    },
    open(h) { h.$sel.select2('open') },
    filter(h, q) { const i = document.querySelector('.select2-container--open .select2-search__field'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) },
    close(h) { h.$sel.select2('close') },
    teardown(h) { h.$sel.select2('destroy') },
  },
  'tom-select': {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      // Keep Tom Select's rendered-option cap: capping is its perf strategy,
      // the counterpart to llselect's lazy render (see caveats).
      const cfg = { options: items.map(v => ({ value: v, text: v })), maxItems: opts.multi ? null : 1 }
      if (k > 0) { cfg.items = items.slice(0, k) }
      if (opts.custom) {
        const tmpl = (d, esc) => '<div>' + iconHtml(esc(d.text)) + '</div>'
        cfg.render = { option: tmpl, item: tmpl } // dropdown option + chosen chip
      }
      return { inst: new window.TomSelect(sel, cfg) }
    },
    open(h) { h.inst.open() },
    filter(h, q) { h.inst.setTextboxValue(q); h.inst.refreshOptions(true) },
    close(h) { h.inst.close() },
    teardown(h) { h.inst.destroy() },
  },
  'slim-select': {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      const data = items.map((v, i) => (opts.custom ? { text: v, value: v, html: iconHtml(v), selected: i < k } : { text: v, value: v, selected: i < k }))
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

// Select-one for a single-select widget (replaces the value, not adds).
const PICK_SINGLE = {
  llselect: (h, item) => h.inst.setChosenItem(item),
  choices: (h, item) => h.inst.setChoiceByValue(item),
  select2: (h, item) => h.$sel.val(item).trigger('change'),
  'tom-select': (h, item) => h.inst.setValue(item, true),
  'slim-select': (h, item) => h.inst.setSelected(item),
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
// Interaction items: every other one carries a ' q' token so a single-character
// query 'q' filters the list to exactly half (the interaction filter test).
function ixBuildItems(n) { return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0') + (i % 2 === 0 ? ' q' : '')) }
function countNodes() { return stage.querySelectorAll('*').length }

let live = [] // { key, h } currently rendered, for teardown
let results = {} // key -> latest metrics for the current scenario, for the chart
let stopRequested = false // cooperative cancel for the mass build

function clearStage() {
  for (const { key, h } of live) { try { ADAPTERS[key].teardown(h) } catch (e) { /* ignore */ } }
  live = []
  stage.replaceChildren()
}

// Build all N widgets in chunks, yielding between them. With the budget on, a
// library that overruns is cut off (timedOut). With noTimeout, it builds every
// widget no matter how long. Returns compute time (yields excluded) and how
// many were built.
async function buildAll(key, scen, runOpts) {
  const a = ADAPTERS[key]
  const status = document.getElementById('status')
  const items = buildItems(scen.itemsPer)
  const opts = { multi: scen.multi, custom: runOpts.custom, preselect: runOpts.preselect }
  const CHUNK = scen.widgets >= 1000 ? 25 : 1
  let built = 0
  let compute = 0
  let timedOut = false
  let errored = false
  let stopped = false
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
    if (stopRequested) { stopped = true; break }
    if (!runOpts.noTimeout && performance.now() - wall0 > BUDGET_MS) { timedOut = true; break }
    if (++chunk % 8 === 0) { status.textContent = `${DISPLAY[key].name}: built ${built} / ${scen.widgets} ...` }
    await raf()
  }
  reflow(stage)
  return { built, compute, timedOut, errored, stopped }
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

function runOptsFromDom() {
  return {
    custom: document.getElementById('custom').checked,
    preselect: document.getElementById('preselect').checked,
    noTimeout: document.getElementById('no-timeout').checked,
  }
}

async function runLib(key, renderAfter = true) {
  const status = document.getElementById('status')
  const scen = SCENARIOS[document.getElementById('scenario').value]
  if (!available(key)) { setCell(key, 'built', 'not loaded'); return }
  clearStage()
  await raf()
  status.textContent = `${DISPLAY[key].name}: building ${scen.widgets} widget(s) x ${scen.itemsPer} items ...`
  await raf()
  const before = countNodes()
  const res = await buildAll(key, scen, runOptsFromDom())
  const nodes = countNodes() - before
  const filterMs = sampleFilter(key, scen)

  const builtCell = rowFor(key).querySelector('td[data-col="built"]')
  builtCell.textContent = `${res.built} / ${scen.widgets}` + (res.errored ? ' (error)' : res.stopped ? ' (stopped)' : res.timedOut ? ' (timeout)' : '')

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
  // Chart.js create + animate competes with the main thread, so drawing it
  // between libraries would pollute the next library's timing. Skip it during a
  // Run all (rendered once at the end); a single-library button still draws.
  if (renderAfter) { renderChart() }
  status.textContent = `${DISPLAY[key].name} done. Lower is better.`
}

async function runAll() {
  setRunning(true)
  stopRequested = false
  reset('Running all libraries ...') // start from a clean table + chart
  for (const key of ORDER) {
    await runLib(key, false) // no chart mid-run - it would skew later timings
    if (stopRequested) { break }
  }
  renderChart() // draw once, after every measurement is done
  setRunning(false)
  document.getElementById('status').textContent = stopRequested ? 'Stopped.' : 'All done. Lower is better.'
}

// Toggle the mass-section controls while a run is in flight; enable Stop.
function setRunning(on) {
  for (const id of ['run-all', 'clear', 'scenario', 'custom', 'preselect', 'no-timeout']) { document.getElementById(id).disabled = on }
  document.querySelectorAll('.bench-libbuttons button').forEach(b => { b.disabled = on })
  document.getElementById('stop').disabled = !on
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
// Interactive horizontal bar chart via Chart.js (loaded from the CDN, like the
// competitor libraries - demo tooling, never part of what is measured). Default
// metric is throughput (built / time), which stays comparable even when a
// library timed out, because it is a per-widget rate rather than a total.

// One dataset per metric; the legend (Chart.js's own interactivity) toggles
// each on/off. Metrics have very different scales, so each bar is normalized to
// "percent of that metric's best performer" (100% = winner, longer is better)
// to share one axis; the tooltip shows the real value.
const METRICS = [
  { key: 'throughput', label: 'Throughput (widgets/sec)', color: '#2456a6', higherBetter: true, value: r => (r.compute > 0 ? r.built / r.compute * 1000 : null), fmt: v => Math.round(v).toLocaleString() + ' /s' },
  { key: 'compute', label: 'Build total (ms)', color: '#c9821a', higherBetter: false, value: r => r.compute, fmt: v => (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString()) + ' ms' },
  { key: 'nodes', label: 'DOM nodes', color: '#7a3ea6', higherBetter: false, value: r => r.nodes, fmt: v => Math.round(v).toLocaleString() },
  { key: 'filter', label: 'Filter candidates (ms)', color: '#1a7f37', higherBetter: false, value: r => r.filter, fmt: v => (v == null ? '-' : (v < 10 ? v.toFixed(2) : v.toFixed(0)) + ' ms') },
]

let chartInstance = null

function renderChart() {
  const canvas = document.getElementById('chart')
  const empty = document.getElementById('chart-empty')
  const libs = ORDER.filter(k => results[k])

  if (!window.Chart) { empty.textContent = 'Chart.js failed to load.'; empty.style.display = ''; return }
  if (!libs.length) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    empty.style.display = ''
    return
  }
  empty.style.display = 'none'

  const labels = libs.map(k => DISPLAY[k].name)
  const datasets = METRICS.map((m, mi) => {
    const raw = libs.map(k => { const v = m.value(results[k]); return (v == null || isNaN(v)) ? null : v })
    const valid = raw.filter(v => v != null)
    const best = valid.length ? (m.higherBetter ? Math.max(...valid) : Math.min(...valid)) : null
    const data = raw.map(v => {
      if (v == null || best == null) { return null }
      if (m.higherBetter) { return best > 0 ? v / best * 100 : (v === best ? 100 : 0) }
      return v > 0 ? best / v * 100 : (v === best ? 100 : 0)
    })
    return { label: m.label, data, backgroundColor: m.color, borderWidth: 0, hidden: mi !== 0, rawValues: raw, fmt: m.fmt }
  })

  const cfg = {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { position: 'top' }, // click to show / hide a metric (Chart.js native)
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.dataset.rawValues[ctx.dataIndex]
              const r = results[libs[ctx.dataIndex]]
              const base = `${ctx.dataset.label}: ${raw == null ? '-' : ctx.dataset.fmt(raw)}`
              return (r && (r.timedOut || r.errored)) ? `${base}  (built ${r.built}/${r.target})` : base
            },
          },
        },
      },
      scales: { x: { beginAtZero: true, title: { display: true, text: '% of the best (100% = winner, longer is better)' } } },
    },
  }
  if (chartInstance) { chartInstance.destroy() }
  chartInstance = new window.Chart(canvas, cfg)
}

// --- interaction latency --------------------------------------------------
// One dedicated widget per library, timing an open -> filter -> select -> close
// cycle, run for both single- and multiple-select (two tables + two charts).
// Each phase is guarded, so a version drift on one op leaves the others intact.

const IX_PHASES = [
  { key: 'open', label: 'Open', color: '#2456a6' },
  { key: 'filter', label: 'Filter', color: '#7a3ea6' },
  { key: 'select', label: 'Select', color: '#1a7f37' },
  { key: 'close', label: 'Close', color: '#c9821a' },
]

// Each mode owns its table / chart / stage element ids, its select-one op, and
// its own live handles + results.
const IX_MODES = [
  { key: 'single', label: 'Single-select', multi: false, pick: PICK_SINGLE, live: {}, results: {}, chart: null },
  { key: 'multi', label: 'Multiple-select', multi: true, pick: PICK, live: {}, results: {}, chart: null },
]

function ixStageEl(mode) { return document.getElementById(`ix-${mode.key}-stage`) }

function measureInteraction(mode, key, items, stageEl) {
  const a = ADAPTERS[key]
  const pick = mode.pick[key]
  const h = mode.live[key]
  if (!a.open || !a.filter || !pick || !h) { return null }
  const CYCLES = 6
  const open = [], filt = [], sel = [], close = []
  const picks = items.filter((_, i) => i % 2 === 0) // the ' q' half stays visible after filtering
  for (let i = 0; i < CYCLES; i++) {
    try { const t = performance.now(); a.open(h); reflow(stageEl); open.push(performance.now() - t) } catch (e) { console.warn(key, 'open', e) }
    try { const t = performance.now(); a.filter(h, 'q'); reflow(stageEl); filt.push(performance.now() - t) } catch (e) { console.warn(key, 'filter', e) }
    try { const t = performance.now(); pick(h, picks[i % picks.length]); reflow(stageEl); sel.push(performance.now() - t) } catch (e) { console.warn(key, 'pick', e) }
    try { const t = performance.now(); a.close(h); reflow(stageEl); close.push(performance.now() - t) } catch (e) { console.warn(key, 'close', e) }
  }
  const med = arr => (arr.length > 1 ? median(arr.slice(1)) : (arr.length ? arr[0] : null)) // drop first as warm-up
  return { open: med(open), filter: med(filt), select: med(sel), close: med(close) }
}

function ixRow(mode, key) { return document.querySelector(`#ix-${mode.key}-results tbody tr[data-lib="${key}"]`) }

function ixInitTable(mode) {
  const tbody = document.querySelector(`#ix-${mode.key}-results tbody`)
  tbody.replaceChildren()
  for (const key of ORDER) {
    const tr = document.createElement('tr'); tr.dataset.lib = key
    const nameTd = document.createElement('td')
    const a = document.createElement('a'); a.href = DISPLAY[key].url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = DISPLAY[key].name
    nameTd.appendChild(a); tr.appendChild(nameTd)
    for (const col of IX_PHASES.map(p => p.key)) { const td = document.createElement('td'); td.dataset.col = col; tr.appendChild(td) }
    tbody.appendChild(tr)
  }
}

function ixSetRow(mode, key, m) {
  const cols = IX_PHASES.map(p => p.key)
  const cell = col => ixRow(mode, key).querySelector(`td[data-col="${col}"]`)
  if (m && (m.na || m.err)) {
    cols.forEach((c, idx) => { cell(c).textContent = idx === 0 ? (m.na || 'error') : ''; delete cell(c).dataset.value })
    return
  }
  for (const col of cols) {
    const v = m ? m[col] : null
    cell(col).textContent = m == null ? 'n/a' : fmt(v)
    if (v != null && !isNaN(v)) { cell(col).dataset.value = v } else { delete cell(col).dataset.value }
  }
}

function ixHighlightBest(mode) {
  for (const col of IX_PHASES.map(p => p.key)) {
    let best = Infinity, bestKey = null
    for (const key of ORDER) {
      const c = ixRow(mode, key).querySelector(`td[data-col="${col}"]`); c.classList.remove('best')
      const v = parseFloat(c.dataset.value); if (!isNaN(v) && v < best) { best = v; bestKey = key }
    }
    if (bestKey) { ixRow(mode, bestKey).querySelector(`td[data-col="${col}"]`).classList.add('best') }
  }
}

function ixClearMode(mode) {
  for (const key of Object.keys(mode.live)) { try { ADAPTERS[key].teardown(mode.live[key]) } catch (e) { /* ignore */ } }
  mode.live = {}
  mode.results = {}
  ixStageEl(mode).replaceChildren()
  renderIxChart(mode)
}

function ixClearAll() { for (const mode of IX_MODES) { ixClearMode(mode) } }

// Stacked bar per mode: the whole bar is the full open + filter + select + close
// cost (all ms, so no normalization). Legend toggles phases.
function renderIxChart(mode) {
  const canvas = document.getElementById(`ix-${mode.key}-chart`)
  const empty = document.getElementById(`ix-${mode.key}-empty`)
  if (!window.Chart) { empty.textContent = 'Chart.js failed to load.'; empty.style.display = ''; return }
  const libs = ORDER.filter(k => mode.results[k] && mode.results[k].open != null)
  if (!libs.length) {
    if (mode.chart) { mode.chart.destroy(); mode.chart = null }
    empty.style.display = ''
    return
  }
  empty.style.display = 'none'
  const labels = libs.map(k => DISPLAY[k].name)
  const datasets = IX_PHASES.map(p => ({ label: p.label, data: libs.map(k => mode.results[k][p.key]), backgroundColor: p.color, borderWidth: 0, stack: 'ix' }))
  const cfg = {
    type: 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.x)} ms` } },
      },
      scales: {
        x: { beginAtZero: true, stacked: true, title: { display: true, text: 'ms (whole bar = full cycle; shorter is better)' } },
        y: { stacked: true },
      },
    },
  }
  if (mode.chart) { mode.chart.destroy() }
  mode.chart = new window.Chart(canvas, cfg)
}

async function ixBuildAndMeasure() {
  const runBtn = document.getElementById('ix-run')
  const status = document.getElementById('ix-status')
  runBtn.disabled = true
  ixClearAll()
  for (const mode of IX_MODES) { ixInitTable(mode) }
  const n = Number(document.getElementById('ix-size').value)
  const custom = document.getElementById('ix-custom').checked
  const items = ixBuildItems(n)
  for (const mode of IX_MODES) {
    const stageEl = ixStageEl(mode)
    for (const key of ORDER) {
      if (!available(key)) { ixSetRow(mode, key, { na: 'not loaded' }); continue }
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: building 1 x ${n} ...`
      await raf()
      const cell = document.createElement('div'); cell.className = 'ix-cell'
      const lab = document.createElement('div'); lab.className = 'ix-lab'; lab.textContent = DISPLAY[key].name
      const mount = document.createElement('div'); mount.className = 'ix-mount'
      cell.append(lab, mount); stageEl.appendChild(cell)
      try { mode.live[key] = ADAPTERS[key].setup(mount, items, { multi: mode.multi, custom, preselect: false }) } catch (e) { console.warn(key, e); ixSetRow(mode, key, { err: true }); continue }
      await raf()
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: measuring ...`
      await raf()
      const m = ADAPTERS[key].noFilter ? null : measureInteraction(mode, key, items, stageEl)
      ixSetRow(mode, key, m)
      if (m && m.open != null) { mode.results[key] = m }
      ixHighlightBest(mode)
      await raf()
    }
  }
  // Draw both charts only after every measurement is done - a chart animating
  // mid-run would skew the timings that follow.
  for (const mode of IX_MODES) { renderIxChart(mode) }
  runBtn.disabled = false
  status.textContent = 'Done. Lower is better. Widgets are live - open them yourself.'
}

// --- wire up --------------------------------------------------------------

function reset(msg) {
  clearStage()
  results = {}
  initTable()
  renderChart()
  document.getElementById('status').textContent = msg
}

initTable()
IX_MODES.forEach(ixInitTable)
document.getElementById('run-all').addEventListener('click', () => { runAll() })
document.getElementById('stop').addEventListener('click', () => { stopRequested = true; document.getElementById('status').textContent = 'Stopping ...' })
document.getElementById('clear').addEventListener('click', () => { reset('Cleared.') })
// A scenario change invalidates the accumulated results (they are per-scenario).
document.getElementById('scenario').addEventListener('change', () => { reset('Scenario changed - results reset.') })
document.querySelectorAll('.bench-libbuttons button').forEach(btn => {
  btn.addEventListener('click', async () => {
    stopRequested = false
    setRunning(true)
    try { await runLib(btn.dataset.lib) } finally { setRunning(false) }
  })
})
document.getElementById('ix-run').addEventListener('click', () => { ixBuildAndMeasure() })
document.getElementById('ix-size').addEventListener('change', () => { ixClearAll(); IX_MODES.forEach(ixInitTable); document.getElementById('ix-status').textContent = 'Size changed - press Build + measure.' })
document.getElementById('versions').textContent =
  ORDER.map(k => `${DISPLAY[k].name} ${DISPLAY[k].version}`).join('  |  ') + '  |  jQuery 3.7.1 (for Select2)'
measureSizes()
