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
// Interaction tables exclude native <select>: its dropdown is browser / OS-driven,
// so open / filter / close are not observable and choosing measures ~0 - no
// discriminative value, and it would misrepresent the real perceived latency. Its
// widget is still built and left live below so a reader can feel it by hand.
const IX_ORDER = ORDER.filter(k => k !== 'native')

// Short, plain-language note per library AND per interaction phase, of the tuning
// that ONE cell's number involved - shown as a `*` in that cell (hover for the
// text). A cell with no entry had no special handling, so it gets no star. Full
// detail per library in BENCHMARK-LIBS-TUNE-FOR-FAIRNESS.md.
function tuneCellTitle(key, phase, multi) {
  const T = {
    choices: {
      filter: 'Choices searches only when the box is focused (the harness focuses it first), and shows just 4 results by default - raised here to render every match.',
      choose: multi ? 'Chosen options are kept in the list (Choices drops them by default) so it re-renders the same-size list as the others.' : null,
      unchoose: 'n/a - clicking an option in the Choices list only adds it, never removes. In Choices you deselect with the tag x.',
      removeTag: 'Choices grows a tag x only when its remove-button option is on.',
    },
    select2: {
      choose: 'Chosen by a real click on the option - Select2 does not re-render the open list from its set-value API.',
      unchoose: 'Select2 selects on mouse-up, so a full mouse press is sent, not a bare click.',
      removeTag: 'Clicking a Select2 tag x also opens the dropdown; that open is suppressed so only the removal is timed.',
    },
    'tom-select': {
      filter: 'A real keystroke goes through the ~300 ms search delay (an earlier adapter skipped it); Tom Select also shows only 50 options by default - raised to all.',
      unchoose: 'n/a - clicking an option in the Tom Select list does nothing. In Tom Select you deselect with Backspace or the tag x.',
      removeTag: 'Tom Select grows a tag x only when its remove-button plugin is on.',
    },
    'slim-select': {
      open: 'Timed once - the first open, which builds the list. Slim Select keeps the list in the DOM on close (a CSS scaleY), so later opens are almost free.',
      filter: 'Includes the ~100 ms search delay (real latency).',
      choose: 'Slim Select rebuilds its whole list on every selection - genuinely slow, not a measuring error.',
      unchoose: 'Click-to-deselect is turned on (off by default); the removed tag has a built-in 100 ms delay that is skipped so only work is timed.',
      removeTag: 'The removed tag has a built-in 100 ms delay that is skipped so only work is timed.',
    },
    llselect: {
      choose: multi ? 'Renders a tag per chosen item to match the competitors (its lighter count summary would be less work).' : null,
    },
  }
  return (T[key] && T[key][phase]) || null
}
// Set a cell's text and, if that (library, phase) was tuned, put a `*` (whose title
// explains it) to the LEFT of the number - cells are right-aligned, so a trailing
// star would shift the digits out of line.
function ixCellText(td, text, key, col, multi) {
  td.replaceChildren()
  const title = tuneCellTitle(key, col, multi)
  if (title) { const s = document.createElement('sup'); s.className = 'tune-star'; s.textContent = '*'; s.title = title; td.append(s) }
  td.append(text)
}

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
// 10% for a multiple-select (renders a value / tags at build time).
function preCount(items, opts) {
  if (!opts.preselect) { return 0 }
  return opts.multi ? Math.max(1, Math.ceil(items.length * 0.1)) : 1
}

// --- adapters -------------------------------------------------------------
// setup(mount, items, {multi, custom, preselect, closeBtn}) -> handle; teardown
// disposes it. The interaction test drives each handle through DRIVER (below),
// which uses real DOM events rather than the library's API.

function makeSelect(mount, multi) {
  const sel = document.createElement('select')
  if (multi) { sel.multiple = true }
  mount.appendChild(sel)
  return sel
}

const ADAPTERS = {
  native: {
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
      // tag, so llselect renders tags too (not the lighter count summary),
      // otherwise it would be doing less per-selection work than they do.
      if (opts.multi) { o.triggerDisplay = 'tags' }
      if (opts.custom) {
        o.createItemContentElFn = (it) => iconSpan(it)
        // If list items carry an icon, the chosen display must carry it too:
        // the tags in multi, the trigger content in single.
        if (opts.multi) { o.createTagContentElFn = (it) => iconSpan(it) } else { o.createTriggerContentElFn = (ctx) => (ctx.chosenItem == null ? null : iconSpan(ctx.chosenItem)) }
      }
      const inst = new Ctor(mount, o)
      inst.setItems(items)
      const k = preCount(items, opts)
      if (k > 0) { if (opts.multi) { inst.setChosenItems(items.slice(0, k)) } else { inst.setChosenItem(items[0]) } }
      return { inst, mount }
    },
    teardown(h) { h.inst.destroy() },
  },
  choices: {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      // renderSelectedChoices: 'always' (multi) keeps a chosen option in the
      // dropdown instead of removing it (Choices' default), so choosing / filtering
      // re-renders the same-size list as llselect / Select2 / Slim Select, which
      // keep it. Without this Choices re-renders a shrinking list and does less work.
      // searchResultLimit: items.length renders EVERY match on a filter. Choices
      // caps search results at 4 by default (searchResultLimit:4), so it would draw
      // a handful while the others draw all ~N/2 matches - the maxOptions:50 trap
      // again (looks fast for free, most visibly at 10k items). null-ish = all.
      const inst = new window.Choices(sel, { searchEnabled: true, allowHTML: !!opts.custom, silent: true, removeItemButton: !!(opts.multi && opts.closeBtn), renderSelectedChoices: opts.multi ? 'always' : 'auto', searchResultLimit: items.length })
      inst.setChoices(items.map((v, i) => ({ value: v, label: opts.custom ? iconHtml(v) : v, selected: i < k })), 'value', 'label', true)
      return { inst, mount }
    },
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
        cfg.templateSelection = tmpl // the chosen tag
      }
      $sel.select2(cfg)
      // A click on the tag remove (x) bubbles to the selection and opens the
      // dropdown (a Select2 quirk), which would pollute the Remove-tag timing.
      // select2:opening is a cancelable event; the Remove-tag phase sets the flag
      // around the click so only the removal is timed, not an unwanted open.
      $sel.on('select2:opening', (e) => { if (select2SuppressOpen) { e.preventDefault() } })
      if (k > 0) { $sel.val(opts.multi ? items.slice(0, k) : items[0]).trigger('change') }
      return { $sel, mount }
    },
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
      // hideSelected: false keeps a chosen option in the dropdown (Tom Select
      // hides it by default for multi), so choosing / filtering re-renders the
      // same-size list as the libraries that keep it - not a shrinking one.
      const cfg = {
        options: items.map(v => ({ value: v, text: v })),
        maxItems: opts.multi ? null : 1,
        maxOptions: null,
        hideSelected: false,
        closeAfterSelect: !opts.multi,
      }
      if (opts.multi && opts.closeBtn) { cfg.plugins = ['remove_button'] } // an x on each tag (opt-in)
      if (k > 0) { cfg.items = items.slice(0, k) }
      if (opts.custom) {
        const tmpl = (d, esc) => '<div>' + iconHtml(esc(d.text)) + '</div>'
        cfg.render = { option: tmpl, item: tmpl } // dropdown option + chosen tag
      }
      return { inst: new window.TomSelect(sel, cfg), mount }
    },
    teardown(h) { h.inst.destroy() },
  },
  'slim-select': {
    setup(mount, items, opts) {
      const k = preCount(items, opts)
      const sel = makeSelect(mount, opts.multi)
      // Slim Select v2's multi tag is textContent = option.text with no
      // per-tag HTML hook, so the custom icon reaches the dropdown options
      // (via html) but NOT the tags - a real limitation. A CSS ::before could
      // fake the look, but that is free compositor work and would misrepresent
      // Slim Select as doing per-tag custom rendering it does not, so the tags
      // are left plain (which is also what its measured cost reflects).
      const data = items.map((v, i) => (opts.custom ? { text: v, value: v, html: iconHtml(v), selected: i < k } : { text: v, value: v, selected: i < k }))
      // closeOnSelect: false so a multi choose keeps the popup open for
      // continuous selection (Slim Select otherwise closes it, which is unfair).
      // allowDeselect: true lets a click on an already-chosen option in the OPEN
      // list toggle it off (the Unchoose-in-popup phase). Without it Slim Select
      // ignores such a click (verified in slimselect.umd.js: the option click
      // handler early-returns when `option.selected && !allowDeselect`). Multi only.
      // maxValuesShown: Infinity stops Slim Select collapsing all tags into a
      // single "{n} selected" summary once more than maxValuesShown (default 20)
      // are selected - that would render one node instead of n and make its multi
      // DOM-node / tag work collapse to near-nothing, which is not the same work.
      return { inst: new window.SlimSelect({ select: sel, settings: { showSearch: true, closeOnSelect: !opts.multi, allowDeselect: !!opts.multi, maxValuesShown: Infinity }, data }), mount }
    },
    teardown(h) { h.inst.destroy() },
  },
}

// --- per-library faithful-DOM driver --------------------------------------
// Every interaction phase is driven by the REAL DOM event a user would cause -
// focus + type to filter, click an option to choose / unchoose, click the tag x
// to remove - so no API shortcut can skip work the user actually pays for. Each
// method below was verified in a headless browser. Dropdown selectors target the
// OPEN content, because Select2 and Slim Select portal it to document.body and
// leave closed copies behind (a plain document query would hit the wrong one).
//   - searchInput(h): the search <input> to focus + type into (null = no search).
//     Choices only searches a FOCUSED input; Tom Select debounces the real
//     keystroke - both are why filtering goes through this input, not an API that
//     would bypass the focus gate / the debounce.
//   - optionUnselected(h) / optionSelected(h): the first not-yet-chosen / chosen
//     option element in the OPEN list, to click (choose / unchoose).
//   - tagRemove(h): the first tag's remove (x) button (null = none).
//   - count(h): how many are currently chosen (to confirm a click did its work).
function slimOpenContent() { return document.querySelector('.ss-content.ss-open-below, .ss-content.ss-open-above') }
const DRIVER = {
  llselect: {
    open: (h) => h.inst.open(), close: (h) => h.inst.close(),
    searchInput: (h) => h.mount.querySelector('input'),
    optionUnselected: (h) => h.mount.querySelector('.llselect-item[aria-selected="false"]:not([data-chosen-state])'),
    optionSelected: (h) => h.mount.querySelector('.llselect-item[aria-selected="true"]:not([data-chosen-state])'),
    tagRemove: (h) => h.mount.querySelector('.llselect-tag-remove-button'),
    count: (h) => h.inst.getChosenItems().length,
  },
  choices: {
    open: (h) => h.inst.showDropdown(), close: (h) => h.inst.hideDropdown(),
    searchInput: (h) => h.mount.querySelector('input.choices__input--cloned') || h.inst.input.element,
    optionUnselected: (h) => h.mount.querySelector('.choices__list--dropdown .choices__item--choice:not(.is-selected)'),
    optionSelected: (h) => h.mount.querySelector('.choices__list--dropdown .choices__item--choice.is-selected'),
    tagRemove: (h) => h.mount.querySelector('.choices__button'),
    count: (h) => (h.inst.getValue(true) || []).length,
  },
  select2: {
    open: (h) => h.$sel.select2('open'), close: (h) => h.$sel.select2('close'),
    searchInput: () => document.querySelector('.select2-container--open .select2-search__field'),
    optionUnselected: () => document.querySelector('.select2-container--open .select2-results__option--selectable:not(.select2-results__option--selected)'),
    optionSelected: () => document.querySelector('.select2-container--open .select2-results__option--selected'),
    tagRemove: (h) => h.mount.querySelector('.select2-selection__choice__remove'),
    count: (h) => (h.$sel.val() || []).length,
  },
  'tom-select': {
    open: (h) => h.inst.open(), close: (h) => h.inst.close(),
    searchInput: (h) => h.mount.querySelector('.ts-control input'),
    optionUnselected: (h) => h.mount.querySelector('.ts-dropdown .option:not(.selected)'),
    optionSelected: (h) => h.mount.querySelector('.ts-dropdown .option.selected'),
    tagRemove: (h) => h.mount.querySelector('.ts-control .remove'),
    count: (h) => h.inst.items.length,
  },
  'slim-select': {
    open: (h) => h.inst.open(), close: (h) => h.inst.close(),
    searchInput: () => { const c = slimOpenContent(); return c ? c.querySelector('.ss-search input') : null },
    optionUnselected: () => { const c = slimOpenContent(); return c ? c.querySelector('.ss-option:not(.ss-selected)') : null },
    optionSelected: () => { const c = slimOpenContent(); return c ? c.querySelector('.ss-option.ss-selected') : null },
    tagRemove: (h) => h.mount.querySelector('.ss-value-delete'),
    count: (h) => h.inst.getSelected().length,
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
// Some libraries bind their option / result click to mousedown / mouseup, not the
// synthetic click event - Select2's results fire on mouseup, so el.click() alone
// never selects/deselects there. Dispatch the full pointer + mouse sequence.
function fireMouse(el) {
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }))
  }
}
// Slim Select defers a tag's actual removeChild by a hardcoded 100ms setTimeout
// (its exit animation), which the CSS animation:none override cannot reach - so a
// removal / deselect would time ~100ms of animation, not work. Run SHORT timers
// immediately around such a click so the measured settle is the real re-render.
// Long timers (a ~200ms search debounce) are left alone, so real debounce latency
// is still counted.
function flushShortTimers(fn) {
  const orig = window.setTimeout
  window.setTimeout = (cb, d, ...a) => (typeof cb === 'function' && (d || 0) <= 120 ? (queueMicrotask(() => cb(...a)), 0) : orig(cb, d, ...a))
  try { return fn() } finally { window.setTimeout = orig }
}
function median(xs) { const s = xs.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
function buildItems(n) { return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0')) }
// Interaction items: every other one carries a ' q' token so a single-character
// query 'q' filters the list to exactly half (the interaction filter test).
function ixBuildItems(n) { return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0') + (i % 2 === 0 ? ' q' : '')) }
function countNodes() { return stage.querySelectorAll('*').length }

let live = [] // { key, h } currently rendered, for teardown
let results = {} // key -> latest metrics for the current scenario, for the chart
let stopRequested = false // cooperative cancel for the mass build
let select2SuppressOpen = false // set around a Select2 remove-tag click (see adapter)

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
    for (const col of ['built', 'compute', 'nodes', 'teardown']) {
      const td = document.createElement('td'); td.dataset.col = col; td.textContent = ''
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
}

function setCell(key, col, text) { rowFor(key).querySelector(`td[data-col="${col}"]`).textContent = text }

function highlightBest() {
  for (const col of ['compute', 'nodes', 'teardown']) {
    let best = Infinity, bestText = null
    const cells = []
    for (const key of ORDER) {
      const cell = rowFor(key).querySelector(`td[data-col="${col}"]`)
      cell.classList.remove('best')
      const v = parseFloat(cell.dataset.value)
      if (!isNaN(v)) { cells.push(cell); if (v < best) { best = v; bestText = cell.textContent } }
    }
    // Every cell whose DISPLAYED value ties the best goes green (compare the shown
    // text - these columns use different formatters and mass cells carry no star).
    if (bestText != null) { for (const cell of cells) { if (cell.textContent === bestText) { cell.classList.add('best') } } }
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

  // Teardown: time destroying every widget just built (symmetric to Build total).
  // This empties the scratch area - the mass widgets are transient proof they
  // rendered; the interaction section keeps its widgets live for inspection.
  const td0 = performance.now()
  for (const w of live) { try { ADAPTERS[w.key].teardown(w.h) } catch (e) { /* ignore */ } }
  const teardown = performance.now() - td0
  live = []
  stage.replaceChildren()

  const builtCell = rowFor(key).querySelector('td[data-col="built"]')
  builtCell.textContent = `${res.built} / ${scen.widgets}` + (res.errored ? ' (error)' : res.stopped ? ' (stopped)' : res.timedOut ? ' (timeout)' : '')

  const computeCell = rowFor(key).querySelector('td[data-col="compute"]')
  computeCell.textContent = fmt(res.compute); computeCell.dataset.value = res.compute

  const nodesCell = rowFor(key).querySelector('td[data-col="nodes"]')
  nodesCell.textContent = nodes.toLocaleString(); nodesCell.dataset.value = nodes

  const teardownCell = rowFor(key).querySelector('td[data-col="teardown"]')
  teardownCell.textContent = fmt(teardown); teardownCell.dataset.value = teardown

  results[key] = {
    built: res.built, target: scen.widgets, compute: res.compute, nodes, teardown,
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
  { key: 'teardown', label: 'Teardown total (ms)', color: '#1a7f37', higherBetter: false, value: r => r.teardown, fmt: v => (v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString()) + ' ms' },
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
  { key: 'single', label: 'Single-select', multi: false, live: {}, results: {}, chart: null },
  { key: 'multi', label: 'Multiple-select', multi: true, live: {}, results: {}, chart: null },
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
// Observe for at least this long before accepting a "settled" reading. A search
// can debounce (Slim ~200ms) or defer its render a frame or two (Choices flips an
// input attribute immediately, then renders the filtered list later). Without a
// floor the 2-quiet-frame break lands in that gap and times only the trivial first
// mutation - the Choices "0.25 ms filter / fastest" artifact. We return time to the
// LAST mutation, so what is timed is the real render whenever it lands.
const SETTLE_MIN_MS = 350

async function timeToSettle(fn, stageEl, key) {
  let lastMut = 0
  const obs = new MutationObserver(() => { lastMut = performance.now() })
  obs.observe(document.body, { childList: true, subtree: true, attributes: true })
  const t = performance.now()
  try { fn() } catch (e) { obs.disconnect(); console.warn(key, e); return null }
  // The endpoint is the frame ~2 rAFs AFTER the last DOM mutation, not the mutation
  // itself: rendering a big list re-flows and paints on the frame after the DOM
  // changes, and that layout + paint is real perceived latency (Choices does a fast
  // incremental DOM update but then the browser lays out / paints the whole list -
  // e.g. all N options when the query is cleared). A heavy frame delays the next
  // rAF, so it lands in the number; the layout part shows even headless.
  let quiet = 0, sinceMut = 99, paintedEnd = 0
  for (let i = 0; i < 100; i++) { // ~1.6s hard cap
    const before = lastMut
    await raf(); reflow(stageEl)
    const now = performance.now()
    sinceMut = lastMut > before ? 0 : sinceMut + 1
    if (sinceMut === 2) { paintedEnd = now } // ~after the last mutation's frame laid out + painted
    // Do not accept the quiet break until the minimum window has elapsed, so a
    // deferred / debounced render is not missed.
    if (lastMut === before) { if (now - t >= SETTLE_MIN_MS && ++quiet >= 2) { break } } else { quiet = 0 }
  }
  obs.disconnect()
  const end = paintedEnd > t ? paintedEnd : (lastMut > t ? lastMut : performance.now())
  return end - t
}

const IX_REPS = 5

// Each phase is measured on its own - never mixed - so one phase's cost never
// leaks into another's.
async function measureInteraction(mode, key, stageEl, closeBtn) {
  const h = mode.live[key]
  if (!h) { return null }
  const med = arr => { const v = arr.filter(x => x != null); return v.length ? median(v) : null }

  const d = DRIVER[key]
  if (!d) { return null }
  const safeOp = (fn) => { try { fn() } catch (e) { /* ignore */ } }
  // Focus the search input and type - the real filter path (Choices only searches
  // a FOCUSED input; Tom Select debounces the real keystroke). No-op if no search.
  const typeQuery = (q) => { const i = safe(() => d.searchInput(h)); if (i) { i.focus(); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })) } }
  // A real click on an option element. Slim Select defers a removed tag's
  // removeChild by a 100ms timer (its exit animation); flush short timers so only
  // the render work is timed, not the wait.
  const clickEl = (el) => (key === 'slim-select' ? flushShortTimers(() => fireMouse(el)) : fireMouse(el))
  // A real click on a tag's x. Select2's bubbles into an unwanted dropdown open,
  // suppressed via the select2:opening guard so only the removal is timed.
  const clickTag = (el) => {
    if (key === 'select2') { select2SuppressOpen = true; try { fireMouse(el) } finally { select2SuppressOpen = false } } else { clickEl(el) }
  }
  // Click a batch of not-yet-chosen options (untimed setup), so a phase that needs
  // existing selections is self-contained regardless of prior state.
  const chooseBatch = (n) => { for (let i = 0; i < n; i++) { const el = safe(() => d.optionUnselected(h)); if (el) { safeOp(() => clickEl(el)) } } }

  // OPEN: measured ONCE - the FIRST open, which builds the popup's option DOM. A
  // library that keeps that DOM on close (Slim Select hides it with a CSS scaleY(0)
  // and never removes it) has cheap WARM reopens, so a median of repeats would hide
  // the real build cost - the first open is the honest one. The widget is freshly
  // set up here (not yet opened), so this open pays the build. to-paint.
  safeOp(() => d.close(h)); await raf()
  const openMs = await timeToPaint(() => d.open(h), stageEl, key)

  // CLOSE: open first (untimed), time the close.
  const closeS = []
  for (let i = 0; i <= IX_REPS; i++) {
    safeOp(() => d.open(h)); await raf()
    const dt = await timeToPaint(() => d.close(h), stageEl, key)
    if (i > 0) { closeS.push(dt) }
  }

  // FILTER round-trip (to-settle): focus + type q (narrows the list), then clear.
  // Reported as the SUM of the two medians - one filter interaction is type + clear.
  const filterDownS = [], filterUpS = []
  safeOp(() => d.open(h)); typeQuery(''); await raf()
  for (let i = 0; i < IX_REPS; i++) {
    filterDownS.push(await timeToSettle(() => typeQuery('q'), stageEl, key))
    filterUpS.push(await timeToSettle(() => typeQuery(''), stageEl, key))
  }
  safeOp(() => d.close(h)); await raf()
  const fdown = med(filterDownS), fup = med(filterUpS)
  const filter = (fdown == null && fup == null) ? null : (fdown || 0) + (fup || 0)

  // CHOOSE (to-settle): CLICK a not-yet-chosen option in the OPEN list. Multiple:
  // choose 10, popup staying open. Single: choose one (it closes), repeat.
  const chooseS = []
  if (mode.multi) {
    safeOp(() => d.open(h)); typeQuery(''); await raf()
    for (let i = 0; i < 10; i++) {
      safeOp(() => d.open(h)); await raf() // keep it open (no-op if already open)
      const el = safe(() => d.optionUnselected(h)); if (!el) { break }
      const before = d.count(h)
      const dt = await timeToSettle(() => clickEl(el), stageEl, key)
      if (i > 0 && d.count(h) > before) { chooseS.push(dt) } // only when it really chose
    }
    safeOp(() => d.close(h)); await raf()
  } else {
    for (let i = 0; i <= IX_REPS; i++) {
      safeOp(() => d.open(h)); typeQuery(''); await raf()
      const el = safe(() => d.optionUnselected(h))
      const dt = el ? await timeToSettle(() => clickEl(el), stageEl, key) : null
      if (i > 0) { chooseS.push(dt) }
      safeOp(() => d.close(h)); await raf()
    }
  }

  // UNCHOOSE (multi): with options chosen, CLICK a chosen one in the OPEN list and
  // time the toggle-off. n/a when nothing chosen is clickable, or the click does
  // not drop the chosen count (the library has no in-popup deselect).
  let unchoose = null
  if (mode.multi) {
    safeOp(() => d.open(h)); typeQuery(''); await raf()
    chooseBatch(10) // ensure some are chosen
    safeOp(() => d.close(h)); await raf(); safeOp(() => d.open(h)); await raf() // re-render the selected state
    const unchooseS = []; let clicked = 0
    for (let i = 0; i < 10; i++) {
      safeOp(() => d.open(h)); await raf()
      const el = safe(() => d.optionSelected(h)); if (!el) { break }
      const before = d.count(h)
      const dt = await timeToSettle(() => clickEl(el), stageEl, key)
      clicked++
      if (!(d.count(h) < before)) { unchoose = NA; break } // click did not deselect
      if (i > 0 && dt != null) { unchooseS.push(dt) } // drop first as warm-up
    }
    safeOp(() => d.close(h)); await raf()
    if (unchoose !== NA) { unchoose = clicked === 0 ? NA : med(unchooseS) }
  }

  // REMOVE TAG (multi + close-button checkbox): with tags present, CLICK each tag's
  // remove (x) and time the removal. n/a when the library shows no x.
  let removeTag = null
  if (mode.multi && closeBtn) {
    safeOp(() => d.open(h)); typeQuery(''); await raf()
    chooseBatch(10) // ensure tags exist
    safeOp(() => d.close(h)); await raf()
    if (!safe(() => d.tagRemove(h))) {
      removeTag = NA
    } else {
      const removeS = []
      for (let i = 0; i < 10; i++) {
        const btn = safe(() => d.tagRemove(h)); if (!btn) { break }
        const dt = await timeToSettle(() => clickTag(btn), stageEl, key)
        if (i > 0 && dt != null) { removeS.push(dt) } // drop first as warm-up
      }
      removeTag = med(removeS)
    }
  }

  return { open: openMs, filter, choose: med(chooseS), unchoose, removeTag, close: med(closeS) }
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
  for (const key of IX_ORDER) {
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
  if (m && (m.na || m.err)) { // whole row not-loaded / error: plain text, no stars
    cols.forEach((c, idx) => { cell(c).textContent = idx === 0 ? (m.na || 'error') : ''; delete cell(c).dataset.value })
    return
  }
  for (const col of cols) {
    const v = m ? m[col] : null
    const td = cell(col)
    if (typeof v === 'string') { ixCellText(td, v, key, col, mode.multi); delete td.dataset.value; continue } // e.g. n/a
    ixCellText(td, m == null ? 'n/a' : fmt(v), key, col, mode.multi)
    if (v != null && !isNaN(v)) { td.dataset.value = v } else { delete td.dataset.value }
  }
}

function ixHighlightBest(mode) {
  for (const col of ixPhases(mode).map(p => p.key)) {
    let best = Infinity
    const cells = []
    for (const key of IX_ORDER) {
      const c = ixRow(mode, key).querySelector(`td[data-col="${col}"]`); c.classList.remove('best')
      const v = parseFloat(c.dataset.value)
      if (!isNaN(v)) { cells.push({ c, v }); if (v < best) { best = v } }
    }
    // Highlight every cell whose DISPLAYED value ties the best - two libraries
    // showing the same best number both go green (all these columns use fmt()).
    if (best < Infinity) { const bestStr = fmt(best); for (const { c, v } of cells) { if (fmt(v) === bestStr) { c.classList.add('best') } } }
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
  const libs = IX_ORDER.filter(k => mode.results[k] && mode.results[k].open != null)
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
    // Deselect the two deselect phases by default: Unchoose is n/a for some
    // libraries (Choices, Tom Select) and Remove tag is opt-in, so including them
    // in the default stacked bar would sum uneven totals. The legend toggles them
    // back on.
    hidden: p.key === 'unchoose' || p.key === 'removeTag',
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

function ixSetControlsDisabled(on) {
  for (const el of document.querySelectorAll('#ix-toolbar button, #ix-toolbar select, #ix-toolbar input')) { el.disabled = on }
}

// Build + measure the given libraries in the given modes. A whole-mode run (all
// libraries) resets that mode's table + stage first; a single-library run rebuilds
// just that library's widget + row and leaves the others in place.
async function ixRun(modeKeys, libKeys) {
  const status = document.getElementById('ix-status')
  ixSetControlsDisabled(true)
  stopRequested = false
  scrollLock(true)
  const n = Number(document.getElementById('ix-size').value)
  const custom = document.getElementById('ix-custom').checked
  const closeBtn = ixCloseBtnOn()
  const items = ixBuildItems(n)
  const fullRun = libKeys.length > 1 // all libs for the mode, vs a single lib
  for (const modeKey of modeKeys) {
    if (stopRequested) { break }
    const mode = IX_MODES.find(m => m.key === modeKey)
    const stageEl = ixStageEl(mode)
    if (fullRun) { ixClearMode(mode); ixInitTable(mode) }
    for (const key of libKeys) {
      if (stopRequested) { break }
      if (!available(key)) { ixSetRow(mode, key, { na: 'not loaded' }); continue }
      // Per-lib re-run: tear down this library's previous widget / cell / result.
      if (mode.live[key]) {
        try { ADAPTERS[key].teardown(mode.live[key]) } catch (e) { /* ignore */ }
        delete mode.live[key]; delete mode.results[key]
        const old = stageEl.querySelector(`.ix-cell[data-lib="${key}"]`); if (old) { old.remove() }
      }
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: building 1 x ${n} ...`
      await raf()
      const cell = document.createElement('div'); cell.className = 'ix-cell'; cell.dataset.lib = key
      const lab = document.createElement('div'); lab.className = 'ix-lab'; lab.textContent = DISPLAY[key].name
      const mount = document.createElement('div'); mount.className = 'ix-mount'
      cell.append(lab, mount); stageEl.appendChild(cell)
      try { mode.live[key] = ADAPTERS[key].setup(mount, items, { multi: mode.multi, custom, preselect: false, closeBtn }) } catch (e) { console.warn(key, e); if (key !== 'native') { ixSetRow(mode, key, { err: true }) } continue }
      await raf()
      // Native is built (kept live below for hands-on feel) but not timed - no row.
      if (key === 'native') { continue }
      status.textContent = `${mode.label} - ${DISPLAY[key].name}: measuring ...`
      // On-screen, or llselect refuses to open an off-screen trigger (reads ~0).
      cell.scrollIntoView({ block: 'center', behavior: 'instant' })
      await raf()
      const m = await measureInteraction(mode, key, stageEl, closeBtn)
      ixSetRow(mode, key, m)
      if (m && m.open != null) { mode.results[key] = m }
      ixHighlightBest(mode)
      await raf()
    }
    renderIxChart(mode)
  }
  scrollLock(false)
  ixSetControlsDisabled(false)
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
// Mass "Render one" buttons carry data-lib; the interaction per-lib buttons carry
// data-ix-lib, so [data-lib] keeps this handler off them (both use .bench-libbuttons).
document.querySelectorAll('.bench-libbuttons button[data-lib]').forEach(btn => {
  btn.addEventListener('click', async () => {
    stopRequested = false
    setRunning(true)
    try { await runLib(btn.dataset.lib) } finally { setRunning(false) }
  })
})
// Per-mode "Build + measure all" (native is built only in single). Per-lib buttons
// (re)build just that one library in that one mode.
document.getElementById('ix-run-single').addEventListener('click', () => { ixRun(['single'], ORDER) })
document.getElementById('ix-run-multi').addEventListener('click', () => { ixRun(['multi'], IX_ORDER) })
document.querySelectorAll('#ix-toolbar button[data-ix-lib]').forEach(btn => {
  btn.addEventListener('click', () => { ixRun([btn.dataset.ixMode], [btn.dataset.ixLib]) })
})
document.getElementById('ix-size').addEventListener('change', () => { ixClearAll(); IX_MODES.forEach(ixInitTable); document.getElementById('ix-status').textContent = 'Size changed - press Build + measure.' })
// Toggling the close-button option changes the multi table's columns (adds /
// drops Remove tag), so rebuild the tables and drop the stale results.
document.getElementById('ix-closebtn').addEventListener('change', () => { ixClearAll(); IX_MODES.forEach(ixInitTable); document.getElementById('ix-status').textContent = 'Close-button option changed - press Build + measure.' })
document.getElementById('versions').textContent =
  ORDER.map(k => `${DISPLAY[k].name} ${DISPLAY[k].version}`).join('  |  ') + '  |  jQuery 3.7.1 (for Select2)'
measureSizes()
