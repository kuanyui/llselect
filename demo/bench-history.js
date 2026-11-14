// The benchmark history page: runs the mass-instantiation measurement of
// bench-core.js on every collected llselect version, on the current build and
// on the native <select>, in rounds, one fresh frame
// (bench-history-frame.html) per run, and draws the medians by version. The
// published versions come from bench-history/versions.json, which
// `npm run bench-history:prepare` writes; the current build is ../dist/.
// Above the run, the page draws the results of the latest release from
// bench-history-results.json, which the bump commit stores (CLAUDE.md, the
// order of a release).

const SCENARIOS = [
  { key: 's-100x100', text: '100 select components x 100 items' },
  { key: 's-1000x10', text: '1,000 select components x 10 items' },
]
const METRICS = [
  { key: 'compute', text: 'Build total (ms)' },
  { key: 'prepaint', text: 'Before paint (ms)' },
  { key: 'nodes', text: 'DOM nodes' },
  { key: 'teardown', text: 'Teardown total (ms)' },
]
const NATIVE_NAME = 'Native <select>'
const RUN_TIMEOUT_MS = 120000

const statusEl = document.getElementById('status')
const runBtn = document.getElementById('run')
const stopBtn = document.getElementById('stop')
const roundsInput = document.getElementById('rounds')
const copyJsonBtn = document.getElementById('copy-json')
const copyMdBtn = document.getElementById('copy-md')
const frameHost = document.getElementById('frame-host')
const savedStatusEl = document.getElementById('saved-status')

let entries = [] // { id, name, lib, v }; the native <select> first, the current build last
let results = null // entry id -> scenario key -> { compute: [], prepaint: [], nodes: [], teardown: [], errors: [] }
let roundsDone = 0
let stopRequested = false
let cancelActiveRun = null // ends the run in progress as stopped
let charts = []
let saved = null // the latest release's results: { entries, results, rounds }, shaped as the run's
let savedCharts = []

function median(xs) {
  if (!xs.length) { return null }
  const s = xs.slice().sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function fmt(metric, v) {
  if (v == null) { return '-' }
  if (metric === 'nodes') { return Math.round(v).toLocaleString('en-US') }
  return v < 10 ? v.toFixed(2) : v.toFixed(0)
}

async function loadVersions() {
  let versions
  try {
    const r = await fetch('bench-history/versions.json', { cache: 'no-store' })
    if (!r.ok) { throw new Error(String(r.status)) }
    versions = await r.json()
  } catch (e) {
    statusEl.textContent = 'No published versions are collected. To collect them, run `npm run bench-history:prepare` and `npm run build:site`, then reload this page.'
    return
  }
  entries = [{ id: 'native', name: NATIVE_NAME, lib: 'native' }]
  for (const v of versions) { entries.push({ id: `v:${v}`, name: v, lib: 'llselect', v }) }
  entries.push({ id: 'v:current', name: 'current', lib: 'llselect', v: 'current' })
  statusEl.textContent = `Ready: ${versions.length} published versions of llselect, the current build and the native <select>.`
  runBtn.disabled = false
}

// One run in a fresh frame; resolves with { res }, { error } or { stopped }.
function runOnce(entry, scenario, runId) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    const query = new URLSearchParams({ lib: entry.lib, scenario, id: runId })
    if (entry.v) { query.set('v', entry.v) }
    let timer = 0
    // Only this run's own frame counts: a stopped run's frame may still have a
    // result queued, under the same id as the next run after a restart.
    const onMessage = (ev) => {
      if (ev.source !== frame.contentWindow || ev.origin !== location.origin || !ev.data || ev.data.type !== 'bench-history-result' || ev.data.id !== runId) { return }
      finish(ev.data)
    }
    const finish = (payload) => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      cancelActiveRun = null
      frame.remove()
      resolve(payload)
    }
    cancelActiveRun = () => { finish({ stopped: true }) }
    window.addEventListener('message', onMessage)
    timer = setTimeout(() => { finish({ error: `no result within ${RUN_TIMEOUT_MS / 1000} s` }) }, RUN_TIMEOUT_MS)
    frame.title = `benchmark run: ${entry.name}, ${scenario}`
    frame.src = `bench-history-frame.html?${query.toString()}`
    frameHost.append(frame)
  })
}

// A run that failed goes into the cell's errors and stays out of its medians.
function addRun(cell, out) {
  const res = out.res
  if (out.error || !res) {
    cell.errors.push(out.error || 'no result')
  } else if (res.errored || res.timedOut || res.teardownErrors > 0) {
    cell.errors.push(res.errored ? 'error' : res.timedOut ? 'timeout' : 'teardown error')
  } else {
    for (const m of METRICS) { cell[m.key].push(res[m.key]) }
  }
}

async function runAll() {
  const rounds = Math.min(50, Math.max(1, Math.round(Number(roundsInput.value) || 10)))
  results = {}
  for (const e of entries) {
    results[e.id] = {}
    for (const s of SCENARIOS) { results[e.id][s.key] = { compute: [], prepaint: [], nodes: [], teardown: [], errors: [] } }
  }
  roundsDone = 0
  stopRequested = false
  runBtn.disabled = true
  stopBtn.disabled = false
  copyJsonBtn.disabled = true
  copyMdBtn.disabled = true
  frameHost.hidden = false
  const total = rounds * entries.length * SCENARIOS.length
  let n = 0
  outer: for (let r = 0; r < rounds; r++) {
    const order = r % 2 === 0 ? entries : entries.slice().reverse()
    // The runs of a round join the results only once the round is complete, so
    // every entry keeps the same number of rounds; Stop drops the round.
    const round = []
    for (const e of order) {
      for (const s of SCENARIOS) {
        if (stopRequested) { break outer }
        n++
        statusEl.textContent = `Round ${r + 1} of ${rounds}: ${e.name}, ${s.text} (run ${n} of ${total}) ...`
        const out = await runOnce(e, s.key, `${r}|${e.id}|${s.key}`)
        if (out.stopped) { break outer }
        round.push([results[e.id][s.key], out])
      }
    }
    for (const [cell, out] of round) { addRun(cell, out) }
    roundsDone = r + 1
    renderTables()
  }
  frameHost.hidden = true
  runBtn.disabled = false
  stopBtn.disabled = true
  copyJsonBtn.disabled = false
  copyMdBtn.disabled = false
  renderTables()
  renderCharts()
  statusEl.textContent = stopRequested ? `Stopped. Complete rounds: ${roundsDone}. The stopped round is left out.` : `Done. Complete rounds: ${roundsDone}.`
}

function renderTables() {
  renderTablesInto(document.getElementById('tables'), entries, results, roundsDone)
}

// One table per scenario, into host; `list` and `data` are shaped as
// `entries` and `results`.
function renderTablesInto(host, list, data, rounds) {
  host.replaceChildren()
  for (const s of SCENARIOS) {
    const table = document.createElement('table')
    table.className = 'bh-table'
    const caption = document.createElement('caption')
    caption.textContent = `${s.text}. Each value is the median of the row's successful runs. Complete rounds: ${rounds}.`
    table.append(caption)
    const thead = document.createElement('thead')
    const hr = document.createElement('tr')
    for (const text of ['Version', 'Runs', ...METRICS.map((m) => m.text), 'Failed runs']) {
      const th = document.createElement('th')
      th.textContent = text
      hr.append(th)
    }
    thead.append(hr)
    table.append(thead)
    const tbody = document.createElement('tbody')
    for (const e of list) {
      const cell = data[e.id][s.key]
      const tr = document.createElement('tr')
      const values = [e.name, String(cell.compute.length), ...METRICS.map((m) => fmt(m.key, median(cell[m.key]))), cell.errors.length ? `${cell.errors.length}: ${cell.errors[0]}` : '0']
      for (const text of values) {
        const td = document.createElement('td')
        td.textContent = text
        tr.append(td)
      }
      tbody.append(tr)
    }
    table.append(tbody)
    host.append(table)
  }
}

// Chart colors follow the page's color scheme, as on the benchmark page.
const darkSchemeMq = window.matchMedia('(prefers-color-scheme: dark)')
function isDarkScheme() {
  const attr = document.documentElement.getAttribute('data-color-scheme')
  return attr ? attr === 'dark' : darkSchemeMq.matches
}

function renderCharts() {
  charts = renderChartsInto(document.getElementById('charts'), entries, results, charts)
}

function renderSavedCharts() {
  savedCharts = renderChartsInto(document.getElementById('saved-charts'), saved.entries, saved.results, savedCharts)
}

// The line charts of one set of results, into host; destroys the charts
// that host held (`old`) and returns the new ones.
function renderChartsInto(host, list, data, old) {
  for (const c of old) { c.destroy() }
  const drawn = []
  host.replaceChildren()
  if (!data) { return drawn }
  if (!window.Chart) {
    const p = document.createElement('p')
    p.className = 'bench-warn'
    p.textContent = 'Chart.js did not load, so the page draws no chart. The tables and the copy buttons still work.'
    host.append(p)
    return drawn
  }
  const dark = isDarkScheme()
  window.Chart.defaults.color = dark ? '#c4c4c4' : '#666'
  window.Chart.defaults.borderColor = dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'
  const versions = list.filter((e) => e.lib === 'llselect')
  const native = list.find((e) => e.lib === 'native')
  for (const s of SCENARIOS) {
    for (const m of METRICS) {
      const box = document.createElement('div')
      box.className = 'bh-chart'
      const canvas = document.createElement('canvas')
      box.append(canvas)
      host.append(box)
      const nativeMedian = median(data[native.id][s.key][m.key])
      // `label` is Chart.js's own name for a dataset's legend text.
      drawn.push(new window.Chart(canvas, {
        type: 'line',
        data: {
          labels: versions.map((e) => e.name),
          datasets: [
            {
              label: 'llselect',
              data: versions.map((e) => median(data[e.id][s.key][m.key])),
              borderColor: dark ? '#7fb1f5' : '#2456a6',
              backgroundColor: dark ? '#7fb1f5' : '#2456a6',
              pointRadius: 4,
            },
            {
              label: NATIVE_NAME,
              data: versions.map(() => nativeMedian),
              borderColor: dark ? '#e3b341' : '#c9821a',
              borderDash: [6, 4],
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { title: { display: true, text: `${s.text}: ${m.text}` } },
          scales: { y: { beginAtZero: true } },
        },
      }))
    }
  }
  return drawn
}

// Rebuild the charts when the color scheme changes: an override writes
// data-color-scheme on <html>, the OS case comes from matchMedia.
function rerenderChartsForScheme() {
  if (charts.length) { renderCharts() }
  if (savedCharts.length) { renderSavedCharts() }
}
darkSchemeMq.addEventListener('change', rerenderChartsForScheme)
new MutationObserver(rerenderChartsForScheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] })

// The results of the latest release: the page's own JSON, as the copy
// button gives it, with the released build named by its version number
// instead of "current", and a `machine` line that the bump commit adds.
async function loadSaved() {
  let json
  try {
    const r = await fetch('bench-history-results.json', { cache: 'no-store' })
    if (!r.ok) { throw new Error(String(r.status)) }
    json = await r.json()
  } catch (e) {
    savedStatusEl.textContent = 'No results of a release are saved yet.'
    return
  }
  const list = []
  const data = {}
  for (const e of json.entries) {
    const id = `${e.lib}:${e.name}`
    list.push({ id, name: e.name, lib: e.lib })
    data[id] = {}
    for (const s of SCENARIOS) {
      const runs = e.results[s.key] && e.results[s.key].runs
      data[id][s.key] = runs || { compute: [], prepaint: [], nodes: [], teardown: [], errors: [] }
    }
  }
  saved = { entries: list, results: data, rounds: json.rounds }
  savedStatusEl.textContent = `Measured on ${json.machine || 'an unnamed machine'}, in ${json.userAgent}.`
  renderTablesInto(document.getElementById('saved-tables'), list, data, json.rounds)
  renderSavedCharts()
}

function resultsJson() {
  const out = { userAgent: navigator.userAgent, rounds: roundsDone, scenarios: SCENARIOS.map((s) => s.key), entries: [] }
  for (const e of entries) {
    const byScenario = {}
    for (const s of SCENARIOS) {
      const cell = results[e.id][s.key]
      const medians = {}
      for (const m of METRICS) { medians[m.key] = median(cell[m.key]) }
      byScenario[s.key] = { medians, runs: cell }
    }
    out.entries.push({ name: e.name, lib: e.lib, results: byScenario })
  }
  return JSON.stringify(out, null, 2)
}

function resultsMarkdown() {
  const lines = []
  for (const s of SCENARIOS) {
    lines.push(`### ${s.text}`, '')
    lines.push(`| Version | Runs | ${METRICS.map((m) => m.text).join(' | ')} | Failed runs |`)
    lines.push(`|---|---|${METRICS.map(() => '---').join('|')}|---|`)
    for (const e of entries) {
      const cell = results[e.id][s.key]
      const name = e.lib === 'native' ? 'Native `<select>`' : e.name
      lines.push(`| ${name} | ${cell.compute.length} | ${METRICS.map((m) => fmt(m.key, median(cell[m.key]))).join(' | ')} | ${cell.errors.length} |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// The older execCommand copy goes first: it needs only the click and works
// on any address, while navigator.clipboard exists only in a secure context,
// such as https or http://localhost, and `make server` also prints a plain
// http LAN address. Both copies start inside the click, before any await, so
// neither loses the click's user activation.
function copyWithExecCommand(text) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  document.body.append(area)
  area.focus()
  area.select()
  let copied = false
  try { copied = document.execCommand('copy') } catch (e) { copied = false }
  area.remove()
  return copied
}

async function copy(text, button) {
  const copied = copyWithExecCommand(text)
  button.focus()
  if (copied) {
    statusEl.textContent = `${button.textContent}: copied.`
    return
  }
  if (!navigator.clipboard) {
    statusEl.textContent = `${button.textContent}: the browser refused to copy, and the page is not a secure context, so the browser offers no navigator.clipboard. Select the tables and copy them instead.`
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    statusEl.textContent = `${button.textContent}: copied.`
  } catch (e) {
    statusEl.textContent = `${button.textContent}: the browser refused to copy (${String((e && e.message) || e)}). Select the tables and copy them instead.`
  }
}

runBtn.addEventListener('click', () => { runAll() })
stopBtn.addEventListener('click', () => {
  stopRequested = true
  stopBtn.disabled = true
  if (cancelActiveRun) { cancelActiveRun() }
})
copyJsonBtn.addEventListener('click', () => { copy(resultsJson(), copyJsonBtn) })
copyMdBtn.addEventListener('click', () => { copy(resultsMarkdown(), copyMdBtn) })

loadSaved()
loadVersions()
