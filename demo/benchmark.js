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
      const inst = new window.Choices(sel, { searchEnabled: true, allowHTML: !!opts.custom, silent: true, removeItemButton: !!(opts.multi && opts.closeBtn) })
      inst.setChoices(items.map((v, i) => ({ value: v, label: opts.custom ? iconHtml(v) : v, selected: i < k })), 'value', 'label', true)
      return { inst, mount }
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
      // closeOnSelect: false keeps the popup open on a multi choose (Select2
      // otherwise closes it after each selection, which is unfair).
      const cfg = { data: items.map(v => ({ id: v, text: v })), width: '260px', closeOnSelect: !opts.multi }
      if (opts.custom) {
        const tmpl = (o) => (o.id ? window.jQuery('<span>' + iconHtml(o.text) + '</span>') : o.text)
        cfg.templateResult = tmpl // dropdown option
        cfg.templateSelection = tmpl // the chosen chip
      }
      $sel.select2(cfg)
      if (k > 0) { $sel.val(opts.multi ? items.slice(0, k) : items[0]).trigger('change') }
      return { $sel, mount }
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
      // maxOptions: null renders EVERY option. Tom Select defaults to rendering
      // only 50 at a time, so without this it would build a fraction of the list
      // and look fastest for free - not the same work as the others.
      // closeAfterSelect: false keeps the popup open on a multi choose.
      const cfg = {
        options: items.map(v => ({ value: v, text: v })),
        maxItems: opts.multi ? null : 1,
        maxOptions: null,
        closeAfterSelect: !opts.multi,
      }
      if (opts.multi && opts.closeBtn) { cfg.plugins = ['remove_button'] } // an x on each tag (opt-in)
      if (k > 0) { cfg.items = items.slice(0, k) }
      if (opts.custom) {
        const tmpl = (d, esc) => '<div>' + iconHtml(esc(d.text)) + '</div>'
        cfg.render = { option: tmpl, item: tmpl } // dropdown option + chosen chip
      }
      return { inst: new window.TomSelect(sel, cfg), mount }
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
      // Slim Select v2's multi chip is textContent = option.text with no
      // per-chip HTML hook, so the custom icon reaches the dropdown options
      // (via html) but NOT the chips - a real limitation. A CSS ::before could
      // fake the look, but that is free compositor work and would misrepresent
      // Slim Select as doing per-chip custom rendering it does not, so the chips
      // are left plain (which is also what its measured cost reflects).
      const data = items.map((v, i) => (opts.custom ? { text: v, value: v, html: iconHtml(v), selected: i < k } : { text: v, value: v, selected: i < k }))
      // closeOnSelect: false so a multi choose keeps the popup open for
      // continuous selection (Slim Select otherwise closes it, which is unfair).
      // allowDeselect: true lets a click on an already-chosen option in the OPEN
      // list toggle it off (the Unchoose-in-popup phase). Without it Slim Select
      // ignores such a click (verified in slimselect.umd.js: the option click
      // handler early-returns when `option.selected && !allowDeselect`). Multi only.
      return { inst: new window.SlimSelect({ select: sel, settings: { showSearch: true, closeOnSelect: !opts.multi, allowDeselect: !!opts.multi }, data }), mount }
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

// The first tag's remove (x) button in a multi widget, or null if none. The
// harness CLICKS it, so this measures the real "click the x to drop the tag"
// path, not an API call. Choices / Tom Select need their remove-button option
// enabled (see the adapters); the others show one by default.
const REMOVE = {
  llselect: (h) => h.mount.querySelector('.llselect-tag-remove-button'),
  choices: (h) => h.mount.querySelector('.choices__button'),
  select2: (h) => h.mount.querySelector('.select2-selection__choice__remove'),
  'tom-select': (h) => h.mount.querySelector('.ts-control .remove'),
  'slim-select': (h) => h.mount.querySelector('.ss-value-delete'),
}

// llselect's CSS classes are `${prefix}-...`; the default prefix is `llselect`.
const LL = 'llselect'

// The already-chosen option ELEMENT inside the OPEN popup list, for the
// "Unchoose (in popup)" phase (multi only). The harness CLICKS it to toggle the
// item off, so this is the "click a selected row in the list to deselect it"
// path, not an API call. Only libraries whose open list both SHOWS chosen
// options and deselects them on click appear here (verified against the pinned
// builds under test):
//   - llselect: chosen list items carry aria-selected="true" and toggle off.
//   - Select2: renders chosen options with --selected and, in multiple mode,
//     fires unselect on a click (its dropdown is portaled to document.body).
//   - Slim Select: chosen ss-option elements carry aria-selected="true"; the
//     click toggles off only with allowDeselect:true (set in the adapter).
// Choices and Tom Select are absent on purpose: a click on an already-selected
// option is a no-op there (Choices' choice handler acts only when NOT selected;
// Tom Select's addItem is idempotent), so they offer no in-popup unchoose - only
// the tag x (the Remove-tag phase). Their Unchoose cell reads n/a.
const UNCHOOSE = {
  llselect: (h) => h.mount.querySelector(`.${LL}-item[aria-selected="true"]:not([data-chosen-state])`),
  select2: () => document.querySelector('.select2-container--open .select2-results__option--selected'),
  'slim-select': (h) => h.mount.querySelector('.ss-option[aria-selected="true"]'),
}

// Current chosen-count per library, used to VERIFY an in-popup unchoose click
// really deselected (the count dropped) instead of no-opping; if it did not, the
// phase is reported n/a rather than as a misleading number.
const COUNT = {
  llselect: (h) => h.inst.getChosenItems().length,
  choices: (h) => (h.inst.getValue(true) || []).length,
  select2: (h) => (h.$sel.val() || []).length,
  'tom-select': (h) => h.inst.items.length,
  'slim-select': (h) => h.inst.getSelected().length,
}
function chosenCount(key, h) { try { return COUNT[key](h) } catch (e) { return NaN } }

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
  // closeBtn: true keeps the mass section's existing tag rendering (Choices /
  // Tom Select keep their opt-in remove button); only the interaction section
  // exposes this as a checkbox.
  const opts = { multi: scen.multi, custom: runOpts.custom, preselect: runOpts.preselect, closeBtn: true }
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
    for (const col of ['built', 'compute', 'nodes']) {
      const td = document.createElement('td'); td.dataset.col = col; td.textContent = ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
}

function setCell(key, col, text) { rowFor(key).querySelector(`td[data-col="${col}"]`).textContent = text }

function highlightBest() {
  for (const col of ['compute', 'nodes']) {
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

  const builtCell = rowFor(key).querySelector('td[data-col="built"]')
  builtCell.textContent = `${res.built} / ${scen.widgets}` + (res.errored ? ' (error)' : res.stopped ? ' (stopped)' : res.timedOut ? ' (timeout)' : '')

  const computeCell = rowFor(key).querySelector('td[data-col="compute"]')
  computeCell.textContent = fmt(res.compute); computeCell.dataset.value = res.compute

  const nodesCell = rowFor(key).querySelector('td[data-col="nodes"]')
  nodesCell.textContent = nodes.toLocaleString(); nodesCell.dataset.value = nodes

  results[key] = {
    built: res.built, target: scen.widgets, compute: res.compute, nodes,
    timedOut: res.timedOut, errored: res.errored,
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
  scrollLock(on)
}

// Block manual scrolling during a run: the harness scrolls each widget into
// view to measure it, and a user scroll could move one off-screen mid-measure
// (an off-screen trigger will not open, zeroing its timings). Programmatic
// scrollIntoView still works; only wheel / touch scrolling is prevented.
let scrollBlocker = null
function scrollLock(on) {
  let overlay = document.getElementById('bench-overlay')
  if (on && !overlay) {
    overlay = document.createElement('div')
    overlay.id = 'bench-overlay'
    overlay.innerHTML = '<div class="bench-overlay-box"><strong>Benchmark running</strong>'
      + '<small>The page auto-scrolls to keep each widget on-screen; manual scrolling is blocked. '
      + 'An off-screen trigger will not open, so its timings would read zero.</small>'
      + '<button id="bench-overlay-stop" type="button">Stop</button></div>'
    document.body.appendChild(overlay)
    // The Stop button lives ON the overlay - the overlay blocks clicks to
    // everything behind it, so a Stop in the page would be unreachable mid-run.
    document.getElementById('bench-overlay-stop').addEventListener('click', () => {
      stopRequested = true
      const b = document.getElementById('bench-overlay-stop')
      b.textContent = 'Stopping ...'; b.disabled = true
    })
  }
  if (overlay) {
    overlay.style.display = on ? 'flex' : 'none'
    if (on) { const b = document.getElementById('bench-overlay-stop'); b.textContent = 'Stop'; b.disabled = false }
  }
  // Kill CSS transitions / animations while measuring, so a library's open/close
  // animation (Slim Select) is not counted as work - we measure the render, not
  // the animation.
  let noAnim = document.getElementById('bench-noanim')
  if (on && !noAnim) {
    noAnim = document.createElement('style')
    noAnim.id = 'bench-noanim'
    noAnim.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
    document.head.appendChild(noAnim)
  } else if (!on && noAnim) {
    noAnim.remove()
  }
  if (on === !!scrollBlocker) { return }
  if (on) {
    scrollBlocker = (e) => e.preventDefault()
    window.addEventListener('wheel', scrollBlocker, { passive: false })
    window.addEventListener('touchmove', scrollBlocker, { passive: false })
  } else {
    window.removeEventListener('wheel', scrollBlocker)
    window.removeEventListener('touchmove', scrollBlocker)
    scrollBlocker = null
  }
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

// Phase descriptors. The columns differ per mode: single has no tags and no
// in-popup unchoose, so it is open / filter / choose / close. Multi adds
// Unchoose (in popup), plus a Remove tag (x) column only when the close-button
// checkbox is on (see ixPhases).
const PH = {
  open: { key: 'open', label: 'Open popup', color: '#2456a6' },
  filter: { key: 'filter', label: 'Filter candidates', color: '#7a3ea6' },
  choose: { key: 'choose', label: 'Choose candidate', color: '#1a7f37' },
  unchoose: { key: 'unchoose', label: 'Unchoose (in popup)', color: '#3a9dbf' },
  removeTag: { key: 'removeTag', label: 'Remove tag (x)', color: '#b5651d' },
  close: { key: 'close', label: 'Close popup', color: '#c9821a' },
}
const NA = 'n/a' // a phase a library does not support - rendered literally, no bar
function ixCloseBtnOn() { return document.getElementById('ix-closebtn').checked }
// Table, chart, and measurement all read the columns through here so they always
// agree. The close-button checkbox both forces the opt-in tag x on the libraries
// that need it AND adds the Remove-tag column.
function ixPhases(mode) {
  if (!mode.multi) { return [PH.open, PH.filter, PH.choose, PH.close] }
  const mid = ixCloseBtnOn() ? [PH.unchoose, PH.removeTag] : [PH.unchoose]
  return [PH.open, PH.filter, PH.choose, ...mid, PH.close]
}

// Each mode owns its table / chart / stage element ids, its select-one op, and
// its own live handles + results.
const IX_MODES = [
  { key: 'single', label: 'Single-select', multi: false, pick: PICK_SINGLE, live: {}, results: {}, chart: null },
  { key: 'multi', label: 'Multiple-select', multi: true, pick: PICK, live: {}, results: {}, chart: null },
]

function ixStageEl(mode) { return document.getElementById(`ix-${mode.key}-stage`) }

// Open / close cost is layout + paint of revealing a (possibly display:none)
// list on the frame the browser shows it, and libraries schedule the show with
// requestAnimationFrame (Choices). Time to AFTER that frame's paint: run the op,
// let its rAF fire (frame N), force frame N's layout, then wait one more rAF -
// the second fires after frame N painted, so paint is in the number.
async function timeToPaint(fn, stageEl, key) {
  const t = performance.now()
  try { fn() } catch (e) { console.warn(key, e); return null }
  await raf(); reflow(stageEl); await raf()
  return performance.now() - t
}

// Filter / choose re-render the option DOM, and some libraries DEBOUNCE the
// search (Tom Select, Slim Select) so the render lands a while later - a
// to-paint timer would miss it and read fast. Instead observe the DOM and wait
// until it stops mutating, then report the time to the LAST mutation (so the
// debounce wait and any rAF/settle delay are included, without trailing idle).
async function timeToSettle(fn, stageEl, key) {
  let lastMut = 0
  const obs = new MutationObserver(() => { lastMut = performance.now() })
  obs.observe(document.body, { childList: true, subtree: true, attributes: true })
  const t = performance.now()
  try { fn() } catch (e) { obs.disconnect(); console.warn(key, e); return null }
  let quiet = 0
  for (let i = 0; i < 40; i++) { // ~640ms cap - generous for debounced search
    const before = lastMut
    await raf(); reflow(stageEl)
    if (lastMut === before) { if (++quiet >= 2) { break } } else { quiet = 0 }
  }
  obs.disconnect()
  return (lastMut > t ? lastMut : performance.now()) - t
}

const IX_REPS = 5

// Each phase is measured on its own - never mixed - so one phase's cost never
// leaks into another's.
async function measureInteraction(mode, key, items, stageEl, closeBtn) {
  const a = ADAPTERS[key]
  const pick = mode.pick[key]
  const h = mode.live[key]
  if (!a.open || !a.filter || !pick || !h) { return null }
  const safeOp = (fn) => { try { fn() } catch (e) { /* ignore */ } }
  const med = arr => { const v = arr.filter(x => x != null); return v.length ? median(v) : null }

  // OPEN: close first (untimed), time the open.
  const openS = []
  for (let i = 0; i <= IX_REPS; i++) {
    safeOp(() => a.close(h)); await raf()
    const dt = await timeToPaint(() => a.open(h), stageEl, key)
    if (i > 0) { openS.push(dt) } // drop first as warm-up
  }

  // CLOSE: open first (untimed), time the close.
  const closeS = []
  for (let i = 0; i <= IX_REPS; i++) {
    safeOp(() => a.open(h)); await raf()
    const dt = await timeToPaint(() => a.close(h), stageEl, key)
    if (i > 0) { closeS.push(dt) }
  }

  // FILTER on its own: open once, then 'q' -> '' repeated, each a real change,
  // each timed with the settle timer (catches debounced renders).
  const filterS = []
  safeOp(() => a.open(h)); safeOp(() => a.filter(h, '')); await raf()
  for (let i = 0; i < IX_REPS; i++) {
    filterS.push(await timeToSettle(() => a.filter(h, 'q'), stageEl, key))
    filterS.push(await timeToSettle(() => a.filter(h, ''), stageEl, key))
  }
  safeOp(() => a.close(h)); await raf()

  // CHOOSE on its own, filter cleared (full list, no filter dependency).
  const chooseS = []
  if (mode.multi) {
    // Choose the first 10 items; the popup must stay open the whole time.
    safeOp(() => a.open(h)); safeOp(() => a.filter(h, '')); await raf()
    for (let i = 0; i < 10; i++) {
      safeOp(() => a.open(h)); await raf() // keep it open (no-op if already open)
      const dt = await timeToSettle(() => pick(h, items[i]), stageEl, key)
      if (i > 0) { chooseS.push(dt) } // drop first as warm-up
    }
    safeOp(() => a.close(h)); await raf()
  } else {
    // Single: choose one item (it closes); repeat.
    for (let i = 0; i <= IX_REPS; i++) {
      safeOp(() => a.open(h)); safeOp(() => a.filter(h, '')); await raf()
      const dt = await timeToSettle(() => pick(h, items[i]), stageEl, key)
      if (i > 0) { chooseS.push(dt) }
      safeOp(() => a.close(h)); await raf()
    }
  }

  // UNCHOOSE IN POPUP (multi only): choose a fresh batch (untimed), re-open so
  // the list shows them as selected, then CLICK an already-chosen option IN the
  // list - timed - which toggles it off. Only the libraries in UNCHOOSE reach
  // here; the rest read n/a. Each click is verified to actually drop the chosen
  // count (a click that no-ops must not be timed as if it deselected).
  let unchoose = null
  if (mode.multi) {
    if (!UNCHOOSE[key]) {
      unchoose = NA
    } else {
      safeOp(() => a.open(h)); safeOp(() => a.filter(h, '')); await raf()
      for (let i = 40; i < 50 && i < items.length; i++) { safeOp(() => pick(h, items[i])) }
      // Re-open so an already-open list re-tags the freshly (API-)chosen options
      // as selected (Select2 does not re-mark an open list on a programmatic set).
      safeOp(() => a.close(h)); await raf(); safeOp(() => a.open(h)); await raf()
      const unchooseS = []
      for (let i = 0; i < 10; i++) {
        safeOp(() => a.open(h)); await raf() // re-open if a prior unselect closed the popup
        const el = UNCHOOSE[key](h)
        if (!el) { break }
        const before = chosenCount(key, h)
        const dt = await timeToSettle(() => el.click(), stageEl, key)
        if (!(chosenCount(key, h) < before)) { unchoose = NA; break } // click did not deselect
        if (i > 0 && dt != null) { unchooseS.push(dt) } // drop first as warm-up
      }
      safeOp(() => a.close(h)); await raf()
      if (unchoose !== NA) { unchoose = med(unchooseS) }
    }
  }

  // REMOVE TAG (multi + close-button checkbox): choose a fresh batch (untimed) so
  // tags exist, close the popup, then CLICK each tag's remove (x) button - timed -
  // dropping the item and re-rendering. The "press x to drop a tag" path. Gated
  // on the checkbox because it forces the opt-in x onto Choices / Tom Select.
  let removeTag = null
  if (mode.multi && closeBtn) {
    if (!REMOVE[key]) {
      removeTag = NA
    } else {
      const removeS = []
      safeOp(() => a.open(h))
      for (let i = 20; i < 30 && i < items.length; i++) { safeOp(() => pick(h, items[i])) }
      safeOp(() => a.close(h)); await raf()
      for (let i = 0; i < 10; i++) {
        const btn = REMOVE[key](h)
        if (!btn) { break }
        const dt = await timeToSettle(() => btn.click(), stageEl, key)
        if (i > 0 && dt != null) { removeS.push(dt) } // drop first as warm-up
      }
      removeTag = med(removeS)
    }
  }

  return { open: med(openS), filter: med(filterS), choose: med(chooseS), unchoose, removeTag, close: med(closeS) }
}

function ixRow(mode, key) { return document.querySelector(`#ix-${mode.key}-results tbody tr[data-lib="${key}"]`) }

function ixInitTable(mode) {
  const phases = ixPhases(mode)
  // The header is rebuilt here (not static in the HTML) so single and multi -
  // and multi with / without the Remove-tag column - stay in step with ixPhases.
  const thead = document.querySelector(`#ix-${mode.key}-results thead`)
  const htr = document.createElement('tr')
  const libTh = document.createElement('th'); libTh.textContent = 'Library'; htr.appendChild(libTh)
  for (const p of phases) { const th = document.createElement('th'); th.textContent = `${p.label} (ms)`; htr.appendChild(th) }
  thead.replaceChildren(htr)
  const tbody = document.querySelector(`#ix-${mode.key}-results tbody`)
  tbody.replaceChildren()
  for (const key of ORDER) {
    const tr = document.createElement('tr'); tr.dataset.lib = key
    const nameTd = document.createElement('td')
    const a = document.createElement('a'); a.href = DISPLAY[key].url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = DISPLAY[key].name
    nameTd.appendChild(a); tr.appendChild(nameTd)
    for (const p of phases) { const td = document.createElement('td'); td.dataset.col = p.key; tr.appendChild(td) }
    tbody.appendChild(tr)
  }
}

function ixSetRow(mode, key, m) {
  const cols = ixPhases(mode).map(p => p.key)
  const cell = col => ixRow(mode, key).querySelector(`td[data-col="${col}"]`)
  if (m && (m.na || m.err)) {
    cols.forEach((c, idx) => { cell(c).textContent = idx === 0 ? (m.na || 'error') : ''; delete cell(c).dataset.value })
    return
  }
  for (const col of cols) {
    const v = m ? m[col] : null
    if (typeof v === 'string') { cell(col).textContent = v; delete cell(col).dataset.value; continue } // e.g. n/a
    cell(col).textContent = m == null ? 'n/a' : fmt(v)
    if (v != null && !isNaN(v)) { cell(col).dataset.value = v } else { delete cell(col).dataset.value }
  }
}

function ixHighlightBest(mode) {
  for (const col of ixPhases(mode).map(p => p.key)) {
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
  const datasets = ixPhases(mode).map(p => ({
    label: p.label,
    data: libs.map(k => { const v = mode.results[k][p.key]; return typeof v === 'number' ? v : null }), // n/a -> gap
    backgroundColor: p.color, borderWidth: 0, stack: 'ix',
  }))
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
  document.getElementById('ix-size').disabled = true
  document.getElementById('ix-custom').disabled = true
  document.getElementById('ix-closebtn').disabled = true
  stopRequested = false
  scrollLock(true)
  ixClearAll()
  for (const mode of IX_MODES) { ixInitTable(mode) }
  const n = Number(document.getElementById('ix-size').value)
  const custom = document.getElementById('ix-custom').checked
  const closeBtn = ixCloseBtnOn()
  const items = ixBuildItems(n)
  for (const mode of IX_MODES) {
    const stageEl = ixStageEl(mode)
    for (const key of ORDER) {
      if (stopRequested) { break }
      if (!available(key)) { ixSetRow(mode, key, { na: 'not loaded' }); continue }
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: building 1 x ${n} ...`
      await raf()
      const cell = document.createElement('div'); cell.className = 'ix-cell'
      const lab = document.createElement('div'); lab.className = 'ix-lab'; lab.textContent = DISPLAY[key].name
      const mount = document.createElement('div'); mount.className = 'ix-mount'
      cell.append(lab, mount); stageEl.appendChild(cell)
      try { mode.live[key] = ADAPTERS[key].setup(mount, items, { multi: mode.multi, custom, preselect: false, closeBtn }) } catch (e) { console.warn(key, e); ixSetRow(mode, key, { err: true }); continue }
      await raf()
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: measuring ...`
      // The widget must be on-screen: llselect refuses to open an off-screen
      // trigger (and its popup would position off-screen), which would make
      // open / filter / close all measure ~0 on a widget that never opened.
      cell.scrollIntoView({ block: 'center', behavior: 'instant' })
      await raf()
      const m = ADAPTERS[key].noFilter ? null : await measureInteraction(mode, key, items, stageEl, closeBtn)
      ixSetRow(mode, key, m)
      if (m && m.open != null) { mode.results[key] = m }
      ixHighlightBest(mode)
      await raf()
    }
    if (stopRequested) { break }
  }
  // Draw both charts only after every measurement is done - a chart animating
  // mid-run would skew the timings that follow.
  for (const mode of IX_MODES) { renderIxChart(mode) }
  scrollLock(false)
  runBtn.disabled = false
  document.getElementById('ix-size').disabled = false
  document.getElementById('ix-custom').disabled = false
  document.getElementById('ix-closebtn').disabled = false
  status.textContent = stopRequested ? 'Stopped.' : 'Done. Lower is better. Widgets are live - open them yourself.'
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
// Toggling the close-button option changes the multi table's columns (adds /
// drops Remove tag), so rebuild the tables and drop the stale results.
document.getElementById('ix-closebtn').addEventListener('change', () => { ixClearAll(); IX_MODES.forEach(ixInitTable); document.getElementById('ix-status').textContent = 'Close-button option changed - press Build + measure.' })
document.getElementById('versions').textContent =
  ORDER.map(k => `${DISPLAY[k].name} ${DISPLAY[k].version}`).join('  |  ') + '  |  jQuery 3.7.1 (for Select2)'
measureSizes()
