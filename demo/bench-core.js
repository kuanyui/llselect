// The mass-instantiation measurement, shared by the benchmark page
// (benchmark.js) and the benchmark history page (bench-history-frame.js), so
// that both pages measure in exactly the same way. REAL BROWSER ONLY: it needs
// layout. The adapters of the other libraries stay in benchmark.js.

// The time budget of one library's mass build, unless "no timeout" is on.
export const BUDGET_MS = 20000

export const SCENARIOS = {
  's-100x100': { widgets: 100, itemsPer: 100, multi: false },
  's-1000x10': { widgets: 1000, itemsPer: 10, multi: false },
  's-10000x10': { widgets: 10000, itemsPer: 10, multi: false },
  's-10x10000': { widgets: 10, itemsPer: 10000, multi: false },
  'm-100x100': { widgets: 100, itemsPer: 100, multi: true },
  'm-1000x10': { widgets: 1000, itemsPer: 10, multi: true },
  'm-10000x10': { widgets: 10000, itemsPer: 10, multi: true },
  'm-10x10000': { widgets: 10, itemsPer: 10000, multi: true },
}

export const raf = () => new Promise(r => requestAnimationFrame(r))
export function buildItems(n) { return Array.from({ length: n }, (_, i) => 'Item ' + String(i + 1).padStart(6, '0')) }
function countNodes(stage) { return stage.querySelectorAll('*').length }

export function iconSpan(text) {
  const s = document.createElement('span')
  const i = document.createElement('i')
  i.className = 'mdi mdi-tag-outline'
  i.setAttribute('aria-hidden', 'true')
  s.append(i, ' ' + text)
  return s
}

// How many items to pre-select when the toggle is on: one for a
// single-select component, 10% for a multiple-select component (renders a
// value / tags at build time).
export function preCount(items, opts) {
  if (!opts.preselect) { return 0 }
  return opts.multi ? Math.max(1, Math.ceil(items.length * 0.1)) : 1
}

export function makeSelect(mount, multi) {
  const sel = document.createElement('select')
  if (multi) { sel.multiple = true }
  mount.appendChild(sel)
  return sel
}

// setup(mount, items, {multi, custom, preselect, closeBtn}) -> handle; teardown
// disposes it.
export const NATIVE_ADAPTER = {
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
}

// Reads `window.llselect`, the global of the UMD bundle that the page loaded.
// filterSettingName: 0.0.1 and 0.0.2 call the filter setting `searchable`;
// 0.0.3 renamed it to `filterable`. The benchmark history page runs both.
export function createLLSelectAdapter(filterSettingName) {
  return {
    setup(mount, items, opts) {
      const Ctor = opts.multi ? window.llselect.LLSelectMultiple : window.llselect.LLSelectSingle
      const o = { [filterSettingName]: true, ariaLabel: 'Benchmark select component' }
      // Match the competitors: their multi-select components render each
      // chosen item as a tag, so llselect renders tags too (not the lighter
      // count text), otherwise it would be doing less per-selection work
      // than they do.
      if (opts.multi) { o.triggerDisplay = 'tags' }
      if (opts.custom) {
        o.createPopupListItemContentElFn = (it) => iconSpan(it)
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
  }
}

export const LLSELECT_ADAPTER = createLLSelectAdapter('filterable')

// Build all N select components in chunks, yielding between them. With the budget on, a
// library that overruns is cut off (timedOut). With noTimeout, it builds every
// select component no matter how long. Returns compute time (yields excluded), the time
// each chunk still cost before paint (prepaint, see the column's legend) and
// how many were built.
// Every handle that setup returns goes into `handles`, the one collector of
// both pages, so both time the same bookkeeping.
// hooks: name (for the console), budgetMs, shouldStop() and onProgress(built),
// which runs every eight chunks.
async function buildAll(adapter, stage, scen, runOpts, handles, hooks) {
  const items = buildItems(scen.itemsPer)
  // closeBtn: true keeps the mass section's existing tag rendering (Choices /
  // Tom Select keep their opt-in remove button); only the interaction section
  // exposes this as a checkbox.
  const opts = { multi: scen.multi, custom: runOpts.custom, preselect: runOpts.preselect, closeBtn: true }
  const CHUNK = scen.widgets >= 1000 ? 25 : 1
  let built = 0
  let compute = 0
  let prepaint = 0
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
      try { handles.push(adapter.setup(mount, items, opts)); built++ } catch (e) { console.warn(hooks.name, e); errored = true; break }
    }
    compute += performance.now() - c0
    // What the chunk still costs before paint, timed apart from Build total:
    // the microtasks it queued (a Promise, a MutationObserver callback) run at
    // the await, then one forced style and layout pass covers the new select components
    // for every library alike (a library whose microtask reads computed style
    // has already paid the style part there). Timers, rAF callbacks and a
    // microtask queued from inside one of those microtasks stay out of it.
    // Timed before the exits below, so a chunk that Build total counts is
    // always timed here too.
    const p0 = performance.now()
    await null
    void stage.offsetHeight
    prepaint += performance.now() - p0
    if (errored) { break }
    if (hooks.shouldStop()) { stopped = true; break }
    if (!runOpts.noTimeout && performance.now() - wall0 > hooks.budgetMs) { timedOut = true; break }
    if (++chunk % 8 === 0) { hooks.onProgress(built) }
    await raf()
  }
  void stage.offsetHeight
  return { built, compute, prepaint, timedOut, errored, stopped }
}

// One mass-instantiation measurement on an empty `stage`: build every select
// component (buildAll), count the DOM nodes it left at rest, then time
// destroying them all (symmetric to Build total), which empties the stage.
// teardownErrors counts the teardowns that threw; the loop goes on past them.
// hooks: those of buildAll, plus onStart(), which runs between the two frames
// that come before the build.
export async function measureMass(adapter, stage, scen, runOpts, hooks) {
  await raf()
  hooks.onStart()
  await raf()
  const before = countNodes(stage)
  const handles = []
  const res = await buildAll(adapter, stage, scen, runOpts, handles, hooks)
  const nodes = countNodes(stage) - before
  let teardownErrors = 0
  const td0 = performance.now()
  for (const h of handles) { try { adapter.teardown(h) } catch (e) { teardownErrors++ } }
  const teardown = performance.now() - td0
  stage.replaceChildren()
  return { ...res, nodes, teardown, teardownErrors }
}
