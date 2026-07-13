// Competitor comparison benchmark. REAL BROWSER ONLY (needs layout + the CDN
// libraries loaded by benchmark.html). Measures wall-clock for four tasks on an
// identical dataset, median of several runs after warm-up, with a forced reflow
// inside every timed region so deferred-layout costs are not hidden.
//
// Each library is a small adapter with the same shape. Every timed op is
// wrapped: if the loaded CDN version does not support an op the way the adapter
// expects, that cell reports "-" instead of crashing the whole run. Lower is
// better throughout; the numbers are machine- and browser-specific.

// Pinned CDN versions (must match the <script>/<link> URLs in benchmark.html).
const VERSIONS = {
  llselect: (window.llselect && window.llselect.LLSELECT_VERSION) || '(local build)',
  choices: '11.1.0',
  select2: '4.1.0-rc.0',
  'tom-select': '2.4.3',
  'slim-select': '2.10.0',
}

// URLs whose transfer size we report (minified, UNCOMPRESSED bytes - the same
// method for every library, so the ratio is fair even though gzip would shrink
// them all by roughly 3x). select2 also needs jQuery; reported separately.
const SIZE_URLS = {
  llselect: '../dist/index.umd.js',
  choices: 'https://cdn.jsdelivr.net/npm/choices.js@11.1.0/public/assets/scripts/choices.min.js',
  select2: 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
  'tom-select': 'https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js',
  'slim-select': 'https://cdn.jsdelivr.net/npm/slim-select@2.10.0/dist/slimselect.umd.js',
  jquery: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
}

const stage = document.getElementById('stage')

// A fresh, on-screen, laid-out mount. On-screen matters: llselect refuses to
// open against a trigger scrolled out of the viewport, and off-screen mounts
// would also skip real layout for every library.
function freshMount() {
  const el = document.createElement('div')
  el.style.width = '280px'
  el.style.margin = '2px 0'
  stage.appendChild(el)
  return el
}

// Force synchronous layout so a library that defers rendering cannot look fast
// by pushing its cost past our timer.
function reflow(el) { return el.offsetHeight }

function median(xs) {
  const s = xs.slice().sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// --- adapters -------------------------------------------------------------
// mode: 'single' | 'multi'. setup() returns an opaque handle passed back to the
// other ops. Every op may throw; the harness catches it.

function makeSelect(mount, mode) {
  const sel = document.createElement('select')
  if (mode === 'multi') { sel.multiple = true }
  mount.appendChild(sel)
  return sel
}

const ADAPTERS = [
  {
    key: 'llselect',
    setup(mount, items, mode) {
      const Ctor = mode === 'multi' ? window.llselect.LLSelectMultiple : window.llselect.LLSelectSingle
      const inst = new Ctor(mount, { searchable: true })
      inst.setItems(items)
      return { inst, mount }
    },
    open(h) { h.inst.open() },
    filter(h, q) {
      const input = h.mount.querySelector('input')
      input.value = q
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selectOne(h, item) { h.inst.toggleItem(item) },
    teardown(h) { h.inst.destroy() },
  },
  {
    key: 'choices',
    setup(mount, items, mode) {
      const sel = makeSelect(mount, mode)
      const inst = new window.Choices(sel, { searchEnabled: true, allowHTML: false, silent: true })
      inst.setChoices(items.map(v => ({ value: v, label: v })), 'value', 'label', true)
      return { inst, mount, sel }
    },
    open(h) { h.inst.showDropdown() },
    filter(h, q) {
      const input = h.mount.querySelector('input.choices__input')
      input.value = q
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selectOne(h, item) { h.inst.setChoiceByValue(item) },
    teardown(h) { h.inst.destroy() },
  },
  {
    key: 'select2',
    setup(mount, items, mode) {
      const sel = makeSelect(mount, mode)
      const $sel = window.jQuery(sel)
      $sel.select2({ data: items.map(v => ({ id: v, text: v })), width: '280px' })
      return { $sel, mount }
    },
    open(h) { h.$sel.select2('open') },
    filter(h, q) {
      const input = document.querySelector('.select2-container--open .select2-search__field')
      input.value = q
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selectOne(h, item) { h.$sel.val(item).trigger('change') },
    teardown(h) { h.$sel.select2('destroy') },
  },
  {
    key: 'tom-select',
    setup(mount, items, mode) {
      const sel = makeSelect(mount, mode)
      // Keep Tom Select's default rendered-option cap: capping is its perf
      // strategy (see caveats), the counterpart to llselect's lazy render.
      const inst = new window.TomSelect(sel, {
        options: items.map(v => ({ value: v, text: v })),
        maxItems: mode === 'multi' ? null : 1,
      })
      return { inst, mount }
    },
    open(h) { h.inst.open() },
    filter(h, q) { h.inst.setTextboxValue(q); h.inst.refreshOptions(true) },
    selectOne(h, item) { h.inst.addItem(item, true) },
    teardown(h) { h.inst.destroy() },
  },
  {
    key: 'slim-select',
    setup(mount, items, mode) {
      const sel = makeSelect(mount, mode)
      const inst = new window.SlimSelect({
        select: sel,
        data: items.map(v => ({ text: v, value: v })),
        settings: { showSearch: true },
      })
      return { inst, mount }
    },
    open(h) { h.inst.open() },
    filter(h, q) {
      const input = document.querySelector('.ss-content .ss-search input')
      input.value = q
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selectOne(h, item) { h.inst.setSelected(item) },
    teardown(h) { h.inst.destroy() },
  },
]

// --- scenarios ------------------------------------------------------------
// Each returns median ms for one library, or null if any run threw.

function timeMedian(runInto, { warmup, runs }) {
  const samples = []
  for (let i = 0; i < warmup + runs; i++) {
    const dt = runInto()
    if (i >= warmup) { samples.push(dt) }
  }
  return median(samples)
}

function safe(fn) { try { return fn() } catch (e) { console.warn(e); return null } }

// init + first render: empty mount -> interactive with N options, layout forced.
function benchInit(a, items, mode, opts) {
  return safe(() => timeMedian(() => {
    const mount = freshMount()
    const t0 = performance.now()
    const h = a.setup(mount, items, mode)
    reflow(mount)
    const dt = performance.now() - t0
    a.teardown(h); mount.remove()
    return dt
  }, opts))
}

// open latency: setup untimed, then time open() + layout.
function benchOpen(a, items, mode, opts) {
  return safe(() => timeMedian(() => {
    const mount = freshMount()
    const h = a.setup(mount, items, mode)
    const t0 = performance.now()
    a.open(h)
    reflow(mount)
    const dt = performance.now() - t0
    a.teardown(h); mount.remove()
    return dt
  }, opts))
}

// filter latency: setup + open untimed, then time one query -> matches rendered.
function benchFilter(a, items, mode, opts, query) {
  return safe(() => timeMedian(() => {
    const mount = freshMount()
    const h = a.setup(mount, items, mode)
    a.open(h)
    const t0 = performance.now()
    a.filter(h, query)
    reflow(mount)
    const dt = performance.now() - t0
    a.teardown(h); mount.remove()
    return dt
  }, opts))
}

// single-item selection update: setup (multi) untimed, then time one toggle.
function benchSelect(a, items, opts) {
  const item = items[Math.floor(items.length / 2)]
  return safe(() => timeMedian(() => {
    const mount = freshMount()
    const h = a.setup(mount, items, 'multi')
    a.open(h)
    const t0 = performance.now()
    a.selectOne(h, item)
    reflow(mount)
    const dt = performance.now() - t0
    a.teardown(h); mount.remove()
    return dt
  }, opts))
}

const SCENARIOS = [
  { key: 'init', label: 'Init + render', run: (a, items, o) => benchInit(a, items, 'single', o) },
  { key: 'open', label: 'Open popup', run: (a, items, o) => benchOpen(a, items, 'single', o) },
  { key: 'filter', label: 'Filter', run: (a, items, o) => benchFilter(a, items, 'single', o, '777') },
  { key: 'select', label: 'Select 1 (multi)', run: (a, items, o) => benchSelect(a, items, o) },
]

// --- run + render ---------------------------------------------------------

function buildItems(n) {
  return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0'))
}

function available(a) {
  const globals = {
    llselect: () => window.llselect,
    choices: () => window.Choices,
    select2: () => window.jQuery && window.jQuery.fn && window.jQuery.fn.select2,
    'tom-select': () => window.TomSelect,
    'slim-select': () => window.SlimSelect,
  }
  return !!globals[a.key]()
}

function fmt(ms) { return ms == null ? '-' : (ms < 10 ? ms.toFixed(2) : ms.toFixed(1)) }

async function run() {
  const n = Number(document.getElementById('size').value)
  const runs = n >= 5000 ? 3 : 5
  const opts = { warmup: 2, runs }
  const items = buildItems(n)
  const status = document.getElementById('status')
  const tbody = document.querySelector('#results tbody')
  tbody.replaceChildren()

  const rows = {}
  for (const a of ADAPTERS) {
    const tr = document.createElement('tr')
    const name = document.createElement('td')
    name.textContent = a.key
    tr.appendChild(name)
    for (const s of SCENARIOS) {
      const td = document.createElement('td')
      td.dataset.scenario = s.key
      td.textContent = available(a) ? '...' : 'not loaded'
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
    rows[a.key] = tr
  }

  // Run library-by-library, yielding to the browser between each so the status
  // and partial results paint.
  const results = {}
  for (const a of ADAPTERS) {
    if (!available(a)) { continue }
    results[a.key] = {}
    for (const s of SCENARIOS) {
      status.textContent = `${a.key}: ${s.label} (n=${n}) ...`
      await new Promise(r => setTimeout(r, 0))
      const ms = s.run(a, items, opts)
      results[a.key][s.key] = ms
      const cell = rows[a.key].querySelector(`td[data-scenario="${s.key}"]`)
      cell.textContent = fmt(ms)
    }
  }

  // Highlight the fastest (lowest) library per scenario.
  for (const s of SCENARIOS) {
    let best = Infinity
    let bestKey = null
    for (const a of ADAPTERS) {
      const ms = results[a.key] && results[a.key][s.key]
      if (ms != null && ms < best) { best = ms; bestKey = a.key }
    }
    if (bestKey) {
      rows[bestKey].querySelector(`td[data-scenario="${s.key}"]`).classList.add('best')
    }
  }

  status.textContent = `Done (n=${n}, median of ${runs} runs after 2 warm-ups). Lower is better.`
}

// --- bundle sizes (minified transfer bytes, uncompressed) -----------------

async function measureSizes() {
  const tbody = document.querySelector('#sizes tbody')
  tbody.replaceChildren()
  for (const [key, url] of Object.entries(SIZE_URLS)) {
    const tr = document.createElement('tr')
    const name = document.createElement('td'); name.textContent = key
    const ver = document.createElement('td'); ver.textContent = VERSIONS[key] || (key === 'jquery' ? '3.7.1' : '')
    const size = document.createElement('td'); size.textContent = '...'
    tr.append(name, ver, size)
    tbody.appendChild(tr)
    try {
      const buf = await (await fetch(url)).arrayBuffer()
      size.textContent = (buf.byteLength / 1024).toFixed(1) + ' KB'
    } catch (e) {
      size.textContent = '-'
    }
  }
}

document.getElementById('run').addEventListener('click', () => { run() })
document.getElementById('versions').textContent =
  ADAPTERS.map(a => `${a.key} ${VERSIONS[a.key]}`).join('  |  ') + '  |  jquery 3.7.1 (for select2)'
measureSizes()
