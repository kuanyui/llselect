// Method-name grammar guide for the core API reference page (public/api/core.html).
// - Under the page title it adds a button, and on the signature of every
//   member whose name has a grammar shape it adds a shape button. Both open
//   one modal.
// - The modal runs a real LLSelectSingle, records the methods it calls, and
//   shows the DOM right after each call, with that call's writes marked.
// - The shape table is README "Method-name grammar", embedded by
//   scripts/build-site.mjs as JSON (#method-grammar-data), so this file never
//   restates it.
// - Shape-named private methods are recorded too but never listed, as the
//   reference does not list them; their writes count as written by the calls
//   inside the documented call around them. A helper with no name shape is
//   not wrapped, so its writes land on the recorded call around it, and a
//   write made while no call runs is dropped.
// - Without <dialog> support the page gets no button: the README table stays.

const DATA = JSON.parse(document.getElementById('method-grammar-data').textContent)
const LIB_URL = new URL('../dist/index.mjs', import.meta.url).href
const THEME_URL = new URL('../dist/themes/vanilla.css', import.meta.url).href
const DEMO_CLASS = 'LLSelectSingle'
const DEMO_ITEMS = ['Apple', 'Banana', 'Cherry']
const DEMO_PICK = 'Cherry'
// Documented methods that are not shapes; recorded because calls start in them.
const ENTRY_METHODS = new Set(['open', 'close', 'toggle', 'setItems', 'setChosenItem', 'rerender', 'onPopupListItemActivated', 'setFocusedIndex'])
// The README's verbs that touch the DOM with no suffix, as far as the example reaches.
const NO_SUFFIX_METHODS = new Set(['open', 'close', 'toggle'])
const BASE_ATTRS = new Set(['class', 'role', 'hidden', 'aria-expanded', 'aria-selected', 'aria-disabled', 'data-empty'])
const VOID_TAGS = new Set(['input', 'img', 'br', 'hr'])
const LONG_VALUE = 28 // longer style values are cut in the code view
const LINE_PX = 20 // the .mg-line height in method-grammar.css
const MAX_USER_STEPS = 12
// mdi close / replay (MIT), the same icon source as the other site icons
const CLOSE_PATH = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z'
const REPLAY_PATH = 'M12,5V1L7,6L12,11V7A6,6 0 0,1 18,13A6,6 0 0,1 12,19A6,6 0 0,1 6,13H4A8,8 0 0,0 12,21A8,8 0 0,0 20,13A8,8 0 0,0 12,5Z'

// "commit*ToDom(content)" -> verb "commit", suffix "ToDom"
const SHAPES = DATA.shapes.map((row) => {
  const [verb, suffix] = row.shape.slice(0, row.shape.indexOf('(')).split('*')
  return { ...row, verb, suffix, re: new RegExp(`^${verb}([A-Z][A-Za-z0-9]*)${suffix}$`) }
})
const shapeOf = (name) => SHAPES.find((s) => s.re.test(name)) ?? null
// commitTriggerContentToDom -> family "TriggerContent"
function splitName(name) {
  const shape = shapeOf(name)
  if (shape === null) { return null }
  return { shape, family: name.slice(shape.verb.length, name.length - shape.suffix.length) }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const kebab = (s) => s.replace(/[A-Z]/g, (c, i) => (i === 0 ? '' : '-') + c.toLowerCase())

function h(tag, props = {}, kids = []) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) { continue }
    if (key === 'class') {
      el.className = value
    } else if (key === 'html') {
      el.innerHTML = value
    } else if (typeof value === 'function') {
      el.addEventListener(key.slice(2), value)
    } else {
      el.setAttribute(key, value === true ? '' : String(value))
    }
  }
  el.append(...kids)
  return el
}
function icon(path) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('fill', 'currentColor')
  p.setAttribute('d', path)
  svg.append(p)
  return svg
}

function argText(value, depth = 0) {
  if (typeof value === 'string') { return JSON.stringify(value) }
  if (typeof value === 'function') { return 'fn' }
  if (value === null || typeof value !== 'object') { return String(value) }
  if (value instanceof Element) { return `<${value.localName}>` }
  if (depth > 0) { return Array.isArray(value) ? '[...]' : '{...}' }
  if (Array.isArray(value)) { return `[${value.map((v) => argText(v, 1)).join(', ')}]` }
  return `{ ${Object.entries(value).map(([k, v]) => `${k}: ${argText(v, 1)}`).join(', ')} }`
}

// --- What the page documents -------------------------------------------

// Heading text -> member name, as scripts/build-site.mjs resolves it.
const MODIFIERS = new Set(['abstract', 'readonly', 'static', 'protected', 'optional', 'const', 'get', 'set'])
function headingName(heading) {
  const words = heading.textContent.trim().replace(/\(\)$/, '').split(/\s+/)
  while (words.length > 1 && MODIFIERS.has(words[0])) { words.shift() }
  return words.join(' ')
}
// name -> heading id. The DEMO_CLASS section wins, so a link from the modal
// lands on the class the example runs.
const members = new Map()
const elementProps = new Set() // documented element properties of the classes
const buttonSpots = [] // class members that get a shape button
{
  let owner = null
  for (const heading of document.querySelectorAll('main h2, main h3, main h4, main h5, main h6')) {
    const level = Number(heading.tagName.slice(1))
    if (owner !== null && level <= owner.level) { owner = null }
    const kind = heading.dataset.kind
    if (kind === undefined) { continue }
    const name = headingName(heading)
    if (kind !== 'method' && kind !== 'property') {
      owner = { name, kind, level }
      continue
    }
    if (!members.has(name) || owner?.name === DEMO_CLASS) { members.set(name, heading.id) }
    if (owner?.kind !== 'class') { continue }
    if (kind === 'property' && /^[a-z]\w*El$/.test(name)) { elementProps.add(name) }
    buttonSpots.push({ heading, name, kind })
  }
}

// --- Recording ----------------------------------------------------------

class Recorder {
  constructor(rootEl) {
    this.rootEl = rootEl
    this.steps = []
    this.current = null
    this.stack = []
    this.ids = new WeakMap()
    this.nextId = 1
    this.builders = new Map() // element id -> the call that returned the element
    this.onRootCallDone = null
    this.observer = new MutationObserver(() => {})
    this.observer.observe(rootEl, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true, characterDataOldValue: true })
  }

  idOf(node) {
    let id = this.ids.get(node)
    if (id === undefined) {
      id = this.nextId++
      this.ids.set(node, id)
    }
    return id
  }

  begin(text, origin) {
    this.flush()
    // A replaced step gets no more calls, so one that lists none can go.
    if (this.current !== null && shownKids(this.current.frames).length === 0) {
      this.steps.pop()
      this.dropBuilders(this.current)
    }
    this.current = { text, origin, frames: [] }
    this.steps.push(this.current)
    const users = this.steps.filter((s) => s.origin !== 'story' && shownKids(s.frames).length > 0)
    if (users.length > MAX_USER_STEPS) {
      // Keep a step that built an element still in the page: the gutter names it.
      const live = new Set([...this.rootEl.querySelectorAll('*')].map((n) => this.ids.get(n)))
      const owners = new Set([...this.builders].filter(([id]) => live.has(id)).map(([, f]) => f.step))
      const old = users.find((s) => !owners.has(s)) ?? users[0]
      this.steps.splice(this.steps.indexOf(old), 1)
      this.dropBuilders(old)
    }
  }

  dropBuilders(step) {
    for (const [id, f] of this.builders) { if (f.step === step) { this.builders.delete(id) } }
  }

  // Records written while no call runs belong to no call (the color-scheme
  // check, the positioner on scroll); they are dropped.
  flush() {
    const records = this.observer.takeRecords()
    const top = this.stack[this.stack.length - 1]
    if (top === undefined) { return }
    for (const r of records) { top.writes.push(this.describe(r)) }
  }

  call(self, name, args, run, display = null) {
    if (this.current === null) { this.begin('Other calls', 'other') }
    this.flush()
    const parent = this.stack[this.stack.length - 1] ?? null
    const frame = { name, display, args: args.map((a) => argText(a)), parent, kids: [], writes: [], ret: undefined, snap: null, step: this.current }
    ;(parent === null ? this.current.frames : parent.kids).push(frame)
    this.stack.push(frame)
    let result
    try {
      result = run()
      if (result instanceof Element) {
        frame.ret = { id: this.idOf(result), model: this.model(result), connected: result.isConnected }
        this.builders.set(frame.ret.id, frame)
      } else if (result === null) {
        frame.ret = null
      }
      return result
    } finally {
      this.flush()
      frame.snap = this.snapshot(self ?? result)
      this.stack.pop()
      if (this.stack.length === 0 && this.onRootCallDone !== null) { this.onRootCallDone(frame.step) }
    }
  }

  describe(r) {
    if (r.type === 'attributes') {
      return { type: 'attr', id: this.idOf(r.target), name: r.attributeName, old: r.oldValue, value: r.target.getAttribute(r.attributeName) }
    }
    if (r.type === 'characterData') {
      return { type: 'text', id: this.idOf(r.target.parentNode ?? r.target), nodes: [this.idOf(r.target)], old: r.oldValue, value: r.target.data }
    }
    const added = [...r.addedNodes]
    const removed = [...r.removedNodes]
    if ([...added, ...removed].every((n) => n.nodeType === Node.TEXT_NODE)) {
      return { type: 'text', id: this.idOf(r.target), nodes: added.map((n) => this.idOf(n)), old: removed.map((n) => n.data).join(''), value: added.map((n) => n.data).join('') }
    }
    const item = (n) => ({ id: this.idOf(n), model: this.model(n) })
    return { type: 'child', id: this.idOf(r.target), added: added.map(item), removed: removed.map(item) }
  }

  model(node) {
    if (node.nodeType === Node.TEXT_NODE) { return { id: this.idOf(node), text: node.data } }
    const tag = node.localName
    const kids = tag === 'svg' ? [] : [...node.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.data.trim() !== ''))
    return { id: this.idOf(node), tag, attrs: [...node.attributes].map((a) => [a.name, a.value]), kids: kids.map((n) => this.model(n)) }
  }

  snapshot(instance) {
    const props = new Map() // element id -> documented property name
    if (instance !== null && typeof instance === 'object') {
      for (const name of elementProps) {
        const value = instance[name]
        if (value instanceof Element && !props.has(this.idOf(value))) { props.set(this.idOf(value), name) }
      }
    }
    return { tree: this.model(this.rootEl), props }
  }
}

// A subclass whose shape-named and entry methods report to the recorder.
// The library calls them through `this`, so every call passes here.
function tracedClass(Base, recorder) {
  class Traced extends Base {}
  const names = new Set()
  for (let p = Base.prototype; p !== null && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
    for (const name of Object.getOwnPropertyNames(p)) {
      const d = Object.getOwnPropertyDescriptor(p, name)
      if (name === 'constructor' || typeof d.value !== 'function') { continue }
      if (shapeOf(name) !== null || ENTRY_METHODS.has(name)) { names.add(name) }
    }
  }
  for (const name of names) {
    const method = Base.prototype[name]
    Traced.prototype[name] = function (...args) {
      return recorder.call(this, name, args, () => method.apply(this, args))
    }
  }
  return Traced
}

// --- Frame helpers ------------------------------------------------------

const isDocumented = (f) => f.display !== null || members.has(f.name)
// The calls the guide lists: a private call is left out, and the documented
// calls inside it move up one level in its place.
function shownKids(frames) {
  return frames.flatMap((f) => (isDocumented(f) ? [f] : shownKids(f.kids)))
}
function shownParent(frame) {
  let p = frame.parent
  while (p !== null && !isDocumented(p)) { p = p.parent }
  return p
}
function* walkFrames(frames) {
  for (const f of frames) {
    yield f
    yield* walkFrames(f.kids)
  }
}
function descendantWrites(frame) {
  const out = []
  for (const k of walkFrames(frame.kids)) { out.push(...k.writes) }
  return out
}

// Writes grouped per element, last value wins, first old value kept.
function summarize(writes) {
  const byEl = new Map()
  for (const w of writes) {
    let e = byEl.get(w.id)
    if (e === undefined) {
      e = { attrs: new Map(), text: null, added: [], removed: [] }
      byEl.set(w.id, e)
    }
    if (w.type === 'attr') {
      const prev = e.attrs.get(w.name)
      e.attrs.set(w.name, { old: prev ? prev.old : w.old, value: w.value })
    } else if (w.type === 'text') {
      e.text = { old: e.text ? e.text.old : w.old, value: w.value, nodes: w.nodes }
    } else {
      e.added.push(...w.added)
      e.removed.push(...w.removed)
    }
  }
  return byEl
}
function changeCount(writes) {
  let n = 0
  for (const e of summarize(writes).values()) { n += e.attrs.size + (e.text ? 1 : 0) + Math.max(e.added.length, e.removed.length) }
  return n
}

// Marks for the code view, keyed "a<id>:<attr>", "t<id>" (a text node) or
// "e<id>" (an element that was put in). The value is the shape verb of the
// call that wrote it, which picks the mark's color; "" is a private call or
// a call outside the five shapes.
const markVerb = (f) => (isDocumented(f) ? splitName(f.name)?.shape.verb ?? '' : '')
function addMarks(marks, writes, verb) {
  for (const [id, e] of summarize(writes)) {
    for (const name of e.attrs.keys()) { marks.set(`a${id}:${name}`, verb) }
    if (e.text) { for (const t of e.text.nodes) { marks.set(`t${t}`, verb) } }
    for (const a of e.added) { marks.set(a.model.text === undefined ? `e${a.id}` : `t${a.id}`, verb) }
  }
}
function ownMarks(frame) {
  const marks = new Map()
  addMarks(marks, frame.writes, markVerb(frame))
  return marks
}
function innerMarks(frame) {
  const marks = new Map()
  for (const k of walkFrames(frame.kids)) { addMarks(marks, k.writes, markVerb(k)) }
  return marks
}

function findNode(tree, id) {
  if (tree.id === id) { return tree }
  for (const k of tree.kids ?? []) {
    const hit = findNode(k, id)
    if (hit !== null) { return hit }
  }
  return null
}
function anyNode(tree, test) {
  if (test(tree)) { return tree }
  for (const k of tree.kids ?? []) {
    const hit = anyNode(k, test)
    if (hit !== null) { return hit }
  }
  return null
}
const attrOf = (node, name) => node.attrs?.find(([n]) => n === name)?.[1] ?? null
const shortValue = (name, value) => (name === 'style' && value.length > LONG_VALUE ? value.slice(0, LONG_VALUE - 3) + '...' : value)

// "triggerEl", else "div.llselect-popup-list-row "Cherry"".
function elName(id, snap, model = null) {
  const prop = snap.props.get(id)
  if (prop !== undefined) { return `<code>${prop}</code>` }
  const node = model ?? findNode(snap.tree, id)
  if (node === null || node.tag === undefined) { return 'an element' }
  const cls = (attrOf(node, 'class') ?? '').split(' ')[0]
  const text = anyNode(node, (n) => n.text !== undefined)?.text
  return `<code>${node.tag}${cls ? '.' + esc(cls) : ''}</code>${text ? ` "${esc(text)}"` : ''}`
}

// The verb and the suffix carry the shape's color, set by a data-shape
// attribute on an ancestor: commitTriggerContentToDom("Cherry").
const verbHtml = (s) => (s === '' ? '' : `<span class="mg-verb">${esc(s)}</span>`)
const shapeAttr = (f) => (markVerb(f) === '' ? '' : ` data-shape="${markVerb(f)}"`)
function shapeHtml(shape) {
  return `${verbHtml(shape.verb)}*${verbHtml(shape.suffix)}${esc(shape.shape.slice(shape.shape.indexOf('(')))}`
}
function callHtml(frame, wrap = false) {
  if (frame.display !== null) { return esc(frame.display) }
  const split = splitName(frame.name)
  const brk = wrap ? '<wbr>' : ''
  const args = frame.args.map(esc).join(`, ${brk}`)
  if (split === null) { return `${esc(frame.name)}(${brk}${args})` }
  return `${verbHtml(split.shape.verb)}${esc(split.family)}${verbHtml(split.shape.suffix)}(${brk}${args})`
}
// The short note at the right of a call in the call list.
function callResultText(frame) {
  const n = changeCount(frame.writes)
  if (n > 0) { return `wrote ${n}` }
  if (frame.ret === null) { return 'returned null' }
  if (frame.ret !== undefined) { return `returned <${frame.ret.model.tag}>` }
  return ''
}

// --- Modal --------------------------------------------------------------

let lib = null
let recorder = null
let sel = null
let ui = null
const view = { step: null, frame: null, prop: null, note: null, allAttrs: false }

async function openGuide(name) {
  if (ui === null) { ui = buildDialog() }
  if (!ui.dialog.open) { ui.dialog.showModal() }
  try {
    if (lib === null) {
      ui.detail.textContent = 'Loading llselect...'
      const [mod] = await Promise.all([import(LIB_URL), loadCss(THEME_URL)])
      lib = mod
    }
    if (recorder === null) { runStory() }
    focusOn(name)
  } catch (err) {
    ui.detail.textContent = `The example could not run: ${err instanceof Error ? err.message : String(err)}`
  }
}

function loadCss(href) {
  return new Promise((resolve) => {
    const link = h('link', { rel: 'stylesheet', href })
    link.addEventListener('load', resolve)
    link.addEventListener('error', resolve)
    document.head.append(link)
  })
}

function buildDialog() {
  const dialog = h('dialog', { class: 'mg-dialog', 'aria-labelledby': 'mg-title' })
  const cards = h('div', { class: 'mg-cards', role: 'group', 'aria-label': 'Name shapes' })
  for (const shape of SHAPES) {
    const btn = h('button', { type: 'button', class: 'mg-card', 'data-shape': shape.verb, 'aria-pressed': 'false', onclick: () => { selectShape(shape) } }, [
      h('code', { class: 'mg-card-shape', html: shapeHtml(shape) }),
      h('span', { class: 'mg-card-contact' }, [shape.contact]),
      h('span', { class: 'mg-card-meaning', html: shape.meaningHtml }),
    ])
    shape.button = btn
    cards.append(btn)
  }
  const stage = h('div', { class: 'mg-mount-slot' })
  const steps = h('div', { class: 'mg-steps', role: 'group', 'aria-label': 'Recorded steps' })
  const trace = h('div', { class: 'mg-trace', role: 'group', 'aria-label': 'Calls' })
  const detail = h('div', { class: 'mg-detail', 'aria-live': 'polite' })
  const returned = h('div', { class: 'mg-returned', hidden: true })
  const allAttrs = h('input', {
    type: 'checkbox',
    onchange: (ev) => {
      view.allAttrs = ev.target.checked
      renderDom()
    },
  })
  const dom = h('div', { class: 'mg-dom' })
  const domTitle = h('h3', {}, ['The DOM right after this call'])
  dialog.append(
    h('header', { class: 'mg-head' }, [
      h('h2', { id: 'mg-title' }, ['Method-name grammar']),
      h('button', { type: 'button', class: 'mg-close', 'aria-label': 'Close', onclick: () => { dialog.close() } }, [icon(CLOSE_PATH)]),
    ]),
    h('p', { class: 'mg-lead' }, ['A method name says how the method touches the DOM. A real select component runs here. The guide records its calls to methods with a name shape, and the methods those calls start in. Pick a call to see what it wrote.']),
    cards,
    h('p', { class: 'mg-small mg-params', html: DATA.paramsNoteHtml }),
    h('div', { class: 'mg-body' }, [
      h('section', { class: 'mg-left', 'aria-label': 'Recorded calls' }, [
        h('div', { class: 'mg-stage' }, [
          h('p', { class: 'mg-small' }, ['This select component is real. Use it, and the calls it makes appear below.']),
          h('div', { class: 'mg-stage-row' }, [
            stage,
            h('button', { type: 'button', class: 'mg-replay', onclick: () => { replay() } }, [icon(REPLAY_PATH), 'Replay the example']),
          ]),
        ]),
        h('h3', {}, ['Steps']),
        steps,
        h('h3', {}, ['Calls']),
        trace,
      ]),
      h('section', { class: 'mg-right', 'aria-label': 'The selected call' }, [
        detail,
        returned,
        h('div', { class: 'mg-dom-head' }, [
          domTitle,
          h('label', { class: 'mg-toggle' }, [allAttrs, 'All attributes']),
        ]),
        h('p', { class: 'mg-legend' }, [
          h('span', { class: 'mg-key mg-key-prop' }, ['JS property']),
          h('span', { class: 'mg-key mg-key-builder' }, ['create method that built it']),
          h('span', { class: 'mg-key mg-key-hit' }, ['written by this call']),
          h('span', { class: 'mg-key mg-key-ind' }, ['written by the calls inside it']),
          h('span', {}, ['Each mark has the color of the name shape that wrote it. A method that is not listed, or has no name shape, leaves a mark with no color.']),
        ]),
        dom,
      ]),
    ]),
  )
  // Arrow keys walk the call list.
  trace.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') { return }
    const buttons = [...trace.querySelectorAll('.mg-call')]
    const next = buttons[buttons.indexOf(document.activeElement) + (ev.key === 'ArrowDown' ? 1 : -1)]
    if (next) {
      ev.preventDefault()
      next.click()
    }
  })
  // While the popup is open, Esc belongs to the select component.
  dialog.addEventListener('cancel', (ev) => {
    if (sel !== null && sel.isOpened()) { ev.preventDefault() }
  })
  dialog.addEventListener('close', () => {
    if (sel !== null && sel.isOpened()) { sel.close() }
  })
  dialog.addEventListener('pointerdown', (ev) => {
    if (recorder !== null && !recorder.rootEl.contains(ev.target)) { recorder.begin('Click outside the select component', 'outside') }
  }, true)
  document.body.append(dialog)
  return { dialog, stage, steps, trace, detail, returned, dom, domTitle }
}

function replay() {
  if (lib === null) { return }
  try {
    runStory()
    focusOn(null)
  } catch (err) {
    ui.detail.textContent = `The example could not run: ${err instanceof Error ? err.message : String(err)}`
  }
}

// The example: build, fill, open, then click the row DEMO_PICK, each a
// recorded step. Afterwards every pointer or key press on the select
// component starts a new step.
function runStory() {
  if (sel !== null) {
    recorder.onRootCallDone = null
    sel.destroy()
  }
  const mountEl = h('div')
  ui.stage.replaceChildren(mountEl)
  const rec = new Recorder(mountEl)
  recorder = rec
  const Traced = tracedClass(lib[DEMO_CLASS], recorder)
  const settings = {
    ariaLabel: 'Fruit',
    placeholder: 'Pick a fruit',
    createTriggerArrowContentElFn: () => lib.createChevronDownSvgEl(),
    createPopupListItemContentElFn: (item) => h('span', { class: 'fruit-name' }, [item]),
  }
  recorder.begin(`new ${DEMO_CLASS}(mountEl, settings)`, 'story')
  sel = recorder.call(null, 'constructor', [], () => new Traced(mountEl, settings), `new ${DEMO_CLASS}(mountEl, settings)`)
  recorder.begin(`sel.setItems(${argText(DEMO_ITEMS)})`, 'story')
  sel.setItems(DEMO_ITEMS)
  recorder.begin('sel.open()', 'story')
  sel.open()
  recorder.begin(`Click on the row "${DEMO_PICK}"`, 'story')
  const row = [...sel.popupListEl.querySelectorAll('[role="option"]')].find((r) => r.textContent === DEMO_PICK)
  if (row === undefined) { throw new Error(`no row "${DEMO_PICK}" after open()`) }
  row.click()
  recorder.begin('Other calls', 'idle')
  mountEl.addEventListener('pointerdown', (ev) => { recorder.begin(describePointer(ev.target), 'user') }, true)
  mountEl.addEventListener('keydown', (ev) => { recorder.begin(`Press ${ev.key}`, 'user') }, true)
  // Show a step of yours once its calls have run. The trigger is the end of
  // a call, not the pointerdown: browsers may run a queued task between
  // pointerdown and click. The newest step is the last one in the list.
  // A click outside the select component that closes the popup only adds
  // its step: the click may be on a call the reader picks.
  let pending = null
  rec.onRootCallDone = (step) => {
    if (step.origin !== 'user' && step.origin !== 'outside') { return }
    if (pending === null) {
      setTimeout(() => {
        const shown = pending
        pending = null
        if (rec !== recorder || shownKids(shown.frames).length === 0) { return }
        if (shown.origin === 'user') { selectStep(shown) } else { renderSteps() }
        ui.steps.scrollTop = ui.steps.scrollHeight
      }, 0)
    }
    pending = step
  }
}

function describePointer(target) {
  const row = target.closest('[role="option"]')
  if (row !== null) { return `Click on the row "${row.textContent}"` }
  if (target.closest('.llselect-trigger') !== null) { return 'Click on the trigger' }
  return 'Click inside the select component'
}

const storyStep = (prefix) => recorder.steps.find((s) => s.origin === 'story' && s.text.startsWith(prefix)) ?? null

// Select the call a page button asked for. A method the example never calls
// falls back to a call of the same shape, with a note saying so.
function focusOn(name) {
  view.note = null
  view.prop = null
  const pick = storyStep('Click on the row')
  const order = [pick, ...recorder.steps.filter((s) => s !== pick && s.origin === 'story')]
  const first = (test) => {
    for (const step of order) {
      for (const f of walkFrames(step.frames)) { if (isDocumented(f) && test(f)) { return f } }
    }
    return null
  }
  if (name !== null && elementProps.has(name)) {
    view.step = storyStep('sel.open()')
    view.frame = null
    view.prop = name
    renderAll()
    return
  }
  let frame = null
  if (name !== null) {
    frame = first((f) => f.name === name)
    const shape = shapeOf(name)
    if (frame === null && shape !== null) {
      // Prefer the same kind: a whole element for createGroupEl, content for createTagContentEl.
      const content = /ContentEl$/.test(name)
      frame = first((f) => shapeOf(f.name) === shape && /ContentEl$/.test(f.name) === content) ?? first((f) => shapeOf(f.name) === shape)
      if (frame !== null) { view.note = `<code>${esc(name)}</code> does not run in this example. Here is a call with the same name shape.` }
    }
  }
  if (frame === null) { frame = first((f) => shapeOf(f.name)?.verb === 'render') }
  if (frame === null) { return }
  select(frame)
}

function selectShape(shape) {
  if (recorder === null) { return }
  view.note = null
  const inStep = [...walkFrames(view.step?.frames ?? [])].find((f) => isDocumented(f) && shapeOf(f.name) === shape)
  if (inStep) {
    select(inStep)
    return
  }
  for (const step of recorder.steps) {
    const f = [...walkFrames(step.frames)].find((g) => isDocumented(g) && shapeOf(g.name) === shape)
    if (f) {
      select(f)
      return
    }
  }
}

function selectStep(step) {
  view.note = null
  view.prop = null
  view.step = step
  const frames = [...walkFrames(step.frames)].filter(isDocumented)
  view.frame = frames.find((f) => shapeOf(f.name) !== null && changeCount(f.writes) > 0) ?? frames[0] ?? null
  renderAll()
}

// A gutter name: explain that property, keep the DOM snapshot on screen.
function showProp(name) {
  view.note = null
  view.prop = name
  renderDetail()
  renderDom()
  renderCards()
}

function select(frame) {
  view.prop = null
  view.step = frame.step
  view.frame = frame
  renderAll()
}

function renderAll() {
  renderSteps()
  renderTrace()
  renderDetail()
  renderDom()
  renderCards()
}

function renderCards() {
  const shape = view.frame === null ? null : shapeOf(view.frame.name)
  for (const s of SHAPES) { s.button.setAttribute('aria-pressed', String(s === shape && view.prop === null && isDocumented(view.frame))) }
}

// One step per line; the list keeps its scroll position when it re-renders.
function renderSteps() {
  const shown = recorder.steps.filter((s) => shownKids(s.frames).length > 0)
  const scroll = ui.steps.scrollTop
  const hadFocus = ui.steps.contains(document.activeElement)
  ui.steps.replaceChildren(...shown.map((step, i) => h('button', {
    type: 'button',
    class: 'mg-step',
    'aria-pressed': String(step === view.step),
    onclick: () => { selectStep(step) },
  }, [`${i + 1}. ${step.text}`])))
  ui.steps.scrollTop = scroll
  if (hadFocus) { ui.steps.querySelector('[aria-pressed="true"]')?.focus() }
}

function renderTrace() {
  const list = (frames) => {
    const ul = h('ul', { class: 'mg-calls' })
    for (const frame of frames) {
      const result = callResultText(frame)
      const btn = h('button', {
        type: 'button',
        class: 'mg-call',
        'data-shape': markVerb(frame) || null,
        'aria-pressed': String(frame === view.frame),
        html: `<span class="mg-dot" aria-hidden="true"></span><code>${callHtml(frame, true)}</code>${result ? `<span class="mg-call-result">${esc(result)}</span>` : ''}`,
        onclick: () => { select(frame) },
      })
      const li = h('li', {}, [btn])
      const kids = shownKids(frame.kids)
      if (kids.length > 0) { li.append(list(kids)) }
      ul.append(li)
    }
    return ul
  }
  // The rebuild drops the focused button; the selected one takes the focus.
  const hadFocus = ui.trace.contains(document.activeElement)
  ui.trace.replaceChildren(list(shownKids(view.step?.frames ?? [])))
  const pressed = ui.trace.querySelector('[aria-pressed="true"]')
  if (hadFocus && pressed !== null) { pressed.focus() }
  revealIn(ui.trace, pressed)
}

// Calls named in the detail text are buttons that select them.
let refFrames = []
function callButton(frame) {
  refFrames.push(frame)
  return `<button type="button" class="mg-ref"${shapeAttr(frame)} data-ref="${refFrames.length - 1}"><code>${callHtml(frame)}</code></button>`
}

function renderDetail() {
  refFrames = []
  const parts = []
  if (view.note !== null) { parts.push(`<p class="mg-note">${view.note}</p>`) }
  if (view.prop !== null) {
    parts.push(propDetail(view.prop))
  } else if (view.frame !== null) {
    parts.push(frameDetail(view.frame))
  } else {
    parts.push('<p>Pick a call on the left.</p>')
  }
  ui.detail.innerHTML = parts.join('')
  for (const btn of ui.detail.querySelectorAll('.mg-ref')) {
    const target = refFrames[Number(btn.dataset.ref)]
    btn.addEventListener('click', () => { select(target) })
  }
  const link = ui.detail.querySelector('.mg-api')
  if (link !== null) { link.addEventListener('click', () => { ui.dialog.close() }) }
  renderReturned()
}

function apiLink(name) {
  const id = members.get(name)
  return id === undefined ? '' : ` <a class="mg-api" href="#${id}">API entry</a>`
}

function propDetail(name) {
  const snap = view.frame?.snap ?? lastSnap(view.step)
  const id = [...snap.props].find(([, n]) => n === name)?.[0]
  const node = id === undefined ? null : findNode(snap.tree, id)
  const out = [`<p class="mg-title"><code class="mg-prop">${esc(name)}</code>${apiLink(name)}</p>`]
  if (node === null) {
    out.push(`<p>This example does not build <code>${esc(name)}</code>.</p>`)
    return out.join('')
  }
  const cls = (attrOf(node, 'class') ?? '').split(' ')[0]
  const words = kebab(name.replace(/El$/, ''))
  out.push('<ul>')
  out.push(`<li>It is the whole element, from <code>&lt;${node.tag}&gt;</code> to <code>&lt;/${node.tag}&gt;</code>, with everything inside.</li>`)
  if (cls === `llselect-${words}`) {
    out.push(`<li>The name <code>${esc(name)}</code> has the same words as the CSS class <code>${esc(cls)}</code>.</li>`)
  } else if ((attrOf(node, 'id') ?? '').endsWith(`-${words}`)) {
    out.push(`<li>It has no class. The name has the same words as its id, <code>${esc(attrOf(node, 'id'))}</code>.</li>`)
  }
  out.push('<li>The blue box in the DOM shows where it starts and ends.</li>')
  out.push('</ul>')
  return out.join('')
}

function frameDetail(frame) {
  const snap = frame.snap
  const split = splitName(frame.name)
  const out = [`<p class="mg-title"${shapeAttr(frame)}><code>${callHtml(frame)}</code>${frame.display === null ? apiLink(frame.name) : ''}</p>`]
  if (split !== null) {
    out.push(`<p class="mg-shape-line"><code class="mg-shape" data-shape="${split.shape.verb}">${shapeHtml(split.shape)}</code> ${split.shape.meaningHtml}</p>`)
  } else if (NO_SUFFIX_METHODS.has(frame.name)) {
    out.push(`<p class="mg-shape-line">${DATA.noSuffixHtml}</p>`)
  } else {
    out.push('<p class="mg-shape-line">Not one of the five name shapes. It is shown because the calls inside it start here.</p>')
  }
  if (split !== null && split.shape.verb === 'create') { out.push(createAdvice(frame)) }
  const did = writeBullets(frame.writes, snap)
  if (frame.ret === null) {
    did.unshift('Returned <code>null</code>.')
  } else if (frame.ret !== undefined) {
    did.unshift(`Returned a new element, ${elName(frame.ret.id, snap, frame.ret.model)}. ${frame.ret.connected ? 'It was already in the page.' : 'It is not in the page. The green box shows it.'}`)
    const inserter = frame.ret.connected ? undefined : [...walkFrames(frame.step.frames)].find((f) => f.writes.some((w) => w.type === 'child' && w.added.some((a) => a.id === frame.ret.id)))
    if (inserter !== undefined) {
      // A private method put it in: name the listed call that ran it, without
      // saying that call wrote the page.
      const shown = isDocumented(inserter) ? inserter : shownParent(inserter)
      if (shown === inserter) {
        did.push(`Later, ${callButton(inserter)} put it in the page.`)
      } else {
        did.push(shown === null ? 'It went into the page later.' : `It went into the page later, during ${callButton(shown)}.`)
      }
    }
  }
  if (frame.writes.length === 0) { did.push('Wrote nothing to the page itself.') }
  const inner = changeCount(descendantWrites(frame))
  if (inner > 0) { did.push(`The calls inside it made ${inner} ${inner === 1 ? 'change' : 'changes'} to the DOM, marked with a dashed outline.`) }
  out.push(`<ul>${did.map((b) => `<li>${b}</li>`).join('')}</ul>`)
  if (split !== null) {
    const words = wordsNote(split, frame)
    if (words) { out.push(`<p class="mg-words">${words}</p>`) }
  }
  const parent = shownParent(frame)
  if (parent !== null) { out.push(`<p class="mg-context">Runs inside ${callButton(parent)}.</p>`) }
  const kids = shownKids(frame.kids)
  if (kids.length > 0) { out.push(`<p class="mg-context">Calls inside it:</p><ul class="mg-context">${kids.map((k) => `<li>${callButton(k)}</li>`).join('')}</ul>`) }
  return out.join('')
}

// README "Customization" at the call: create*El builds the whole element and
// only a subclass changes it; create*ContentEl builds only its content.
function createAdvice(frame) {
  if (/ContentEl$/.test(frame.name)) {
    const setting = `${frame.name}Fn`
    const how = members.has(setting) ? `with the <code>${esc(setting)}</code> setting, or in a subclass` : 'in a subclass'
    return `<p class="mg-advice mg-advice-content"><strong>Content only.</strong> The ARIA stays on the element around this content, which the library builds. Change the content ${how}.</p>`
  }
  const aria = frame.ret?.model.attrs.some(([n]) => n === 'role' || n.startsWith('aria-')) ? ', ARIA included' : ''
  return `<p class="mg-advice mg-advice-el"><strong>The whole element${aria}.</strong> Only a subclass can change it. Change it only when you must.</p>`
}

function writeBullets(writes, snap) {
  const out = []
  for (const [id, e] of summarize(writes)) {
    const where = elName(id, snap)
    if (e.text) {
      const was = e.text.old === e.text.value ? ' Same text as before.' : e.text.old ? ` It was "${esc(e.text.old)}".` : ''
      out.push(`Wrote the text "${esc(e.text.value)}" into ${where}.${was}`)
    }
    if (e.attrs.size > 2) {
      out.push(`Changed ${e.attrs.size} attributes on ${where}:<ul>${[...e.attrs.keys()].map((n) => `<li><code>${esc(n)}</code></li>`).join('')}</ul>`)
    } else {
      for (const [name, a] of e.attrs) {
        if (a.value === null) {
          out.push(`Removed <code>${esc(name)}</code> from ${where}.`)
          continue
        }
        const was = a.old === a.value ? ' Same value as before.' : a.old === null ? '' : ` It was "${esc(shortValue(name, a.old))}".`
        out.push(`Set <code>${esc(name)}="${esc(shortValue(name, a.value))}"</code> on ${where}.${was}`)
      }
    }
    if (e.added.length === 1 && e.removed.length === 1) {
      out.push(`Swapped ${elName(e.removed[0].id, snap, e.removed[0].model)} inside ${where} for a new element.`)
    } else {
      if (e.added.length > 0) { out.push(`Put ${e.added.length === 1 ? elName(e.added[0].id, snap, e.added[0].model) : `${e.added.length} elements`} into ${where}.`) }
      if (e.removed.length > 0) { out.push(`Took ${e.removed.length === 1 ? elName(e.removed[0].id, snap, e.removed[0].model) : `${e.removed.length} elements`} out of ${where}.`) }
    }
  }
  return out
}

// Where the middle words of a name land in the DOM: a documented property, a
// class, or an id with the same words. A create*ContentEl name falls back to
// its container (the Container-Content law): createTriggerArrowContentEl ->
// TriggerArrow.
function wordsTarget({ shape, family }, snap, preferred) {
  const trees = [...preferred, snap.tree]
  const lookup = (words) => {
    const dashed = kebab(words)
    const prop = `${lowerFirst(words)}El`
    const cls = `llselect-${dashed}`
    const idRe = new RegExp(`-${dashed}\\d*$`)
    return {
      words,
      prop,
      cls,
      propId: [...snap.props].find(([, n]) => n === prop)?.[0] ?? null,
      hasClass: trees.some((t) => anyNode(t, (n) => (attrOf(n, 'class') ?? '').split(' ').includes(cls)) !== null),
      idNode: trees.map((t) => anyNode(t, (n) => idRe.test(attrOf(n, 'id') ?? ''))).find(Boolean) ?? null,
      content: false,
    }
  }
  const full = lookup(family)
  const found = full.propId !== null || full.hasClass || full.idNode !== null
  if (found || shape.verb !== 'create' || !/.Content$/.test(family)) { return full }
  return { ...lookup(family.slice(0, -'Content'.length)), content: true }
}

// The element a call returned, the element its caller returned (the row a
// create*ContentEl fills), then the elements it put in.
function preferredModels(frame) {
  const out = [frame.ret?.model, frame.parent?.ret?.model].filter((m) => m !== undefined)
  for (const w of frame.writes) {
    if (w.type === 'child') { out.push(...w.added.map((a) => a.model).filter((m) => m.tag !== undefined)) }
  }
  return out
}

function wordsNote(split, frame) {
  if (split.shape.verb === 'sync') { return `The words <b>${esc(split.family)}</b> name the state it mirrors.` }
  const t = wordsTarget(split, frame.snap, preferredModels(frame))
  const lead = t.content ? `The words <b>${esc(t.words)}</b> before <b>Content</b>` : `The words <b>${esc(t.words)}</b>`
  const out = []
  if (t.propId !== null && t.hasClass) {
    out.push(`${lead} match <code>${esc(t.prop)}</code> and the class <code>${esc(t.cls)}</code>.`)
  } else if (t.hasClass) {
    out.push(`${lead} match the class <code>${esc(t.cls)}</code>.`)
  } else if (t.idNode !== null) {
    out.push(`${lead} match the id <code>${esc(attrOf(t.idNode, 'id'))}</code>.`)
    if (t.words === 'PopupListItem') { out.push('The row class says <code>row</code>, because the class marks every option row, not only item rows.') }
  }
  return out.join(' ')
}

function renderReturned() {
  const ret = view.prop === null && view.frame !== null ? view.frame.ret : undefined
  ui.returned.hidden = !(ret && !ret.connected)
  if (ui.returned.hidden) {
    ui.returned.replaceChildren()
    return
  }
  ui.returned.replaceChildren(
    h('p', { class: 'mg-returned-title' }, ['Returned element, not in the page']),
    codeView(ret.model, { props: new Map(), own: new Map(), inner: new Map(), allAttrs: true, focus: null }),
  )
}

// The last root call returns last, so its snapshot is the step's end state.
function lastSnap(step) {
  return step.frames[step.frames.length - 1]?.snap ?? null
}

function renderDom() {
  if (view.step === null) { return }
  const frame = view.prop !== null ? null : view.frame
  const snap = frame?.snap ?? view.frame?.snap ?? lastSnap(view.step)
  ui.domTitle.textContent = frame === null && view.frame === null ? `The DOM after: ${view.step.text}` : 'The DOM right after this call'
  let focus = null
  let famCls = null
  const split = frame !== null && isDocumented(frame) ? splitName(frame.name) : null
  if (view.prop !== null) {
    focus = [...snap.props].find(([, n]) => n === view.prop)?.[0] ?? null
  } else if (split !== null && split.shape.verb !== 'sync') {
    const t = wordsTarget(split, snap, preferredModels(frame))
    focus = t.propId
    famCls = t.hasClass ? t.cls : null
  }
  const own = frame === null ? new Map() : ownMarks(frame)
  const inner = frame === null ? new Map() : innerMarks(frame)
  const scroll = ui.dom.scrollTop
  ui.dom.replaceChildren(codeView(snap.tree, { props: snap.props, own, inner, allAttrs: view.allAttrs, focus, famCls }))
  ui.dom.scrollTop = scroll
  // Never scroll sideways: the start of every line stays next to its gutter name.
  revealIn(ui.dom, ui.dom.querySelector('.mg-hit, .mg-ind, .mg-box-hit, .mg-box-ind, .mg-box-on'))
  ui.dom.scrollLeft = 0
}

// Scroll only the given container, only vertically: to the top when the
// element fits on the first screen, else just above the element.
function revealIn(container, el) {
  if (el === null) { return }
  const y = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  container.scrollTop = y < container.clientHeight - 60 ? 0 : y - 60
}

// --- Code view -----------------------------------------------------------

let chPx = 0
function measureCh(host) {
  const text = h('span', {}, ['0123456789'])
  const probe = h('div', { class: 'mg-code', style: 'position:absolute;visibility:hidden' }, [text])
  host.append(probe)
  chPx = text.getBoundingClientRect().width / 10
  probe.remove()
}

// One line per tag. Boxes are drawn under the text from line and column
// numbers, so a box spans an element from its opening to its closing tag.
function codeView(tree, { props, own, inner, allAttrs, focus, famCls = null }) {
  // The returned-element panel can be the first code view on screen.
  if (chPx === 0) { measureCh(ui.dom) }
  const lines = []
  const boxes = []
  // class and data-shape attributes of a span that may carry a mark
  const markAttrs = (base, key) => {
    const [cls, verb] = own.has(key) ? [' mg-hit', own.get(key)] : inner.has(key) ? [' mg-ind', inner.get(key)] : ['', '']
    return `class="${base}${cls}"${verb === '' ? '' : ` data-shape="${verb}"`}`
  }
  const openTag = (node) => {
    let html = `<span class="mg-p">&lt;</span><span class="hl-keyword">${node.tag}</span>`
    let len = 1 + node.tag.length
    let hidden = 0
    for (const [name, value] of node.attrs) {
      const key = `a${node.id}:${name}`
      if (!allAttrs && !BASE_ATTRS.has(name) && !own.has(key) && !inner.has(key)) {
        hidden++
        continue
      }
      const shown = allAttrs ? value : shortValue(name, value)
      const valueHtml = name === 'class' ? shown.split(' ').map((c) => (c === famCls ? `<span class="mg-cls-words">${esc(c)}</span>` : esc(c))).join(' ') : esc(shown)
      html += ` <span ${markAttrs('mg-attr', key)}${shown !== value ? ` title="${esc(value)}"` : ''}><span class="hl-func">${esc(name)}</span>${value === '' ? '' : `=<span class="hl-string">"${valueHtml}"</span>`}</span>`
      len += 1 + name.length + (value === '' ? 0 : shown.length + 3)
    }
    if (hidden > 0) {
      html += ' <span class="hl-comment">...</span>'
      len += 4
    }
    return { html: html + '<span class="mg-p">&gt;</span>', len: len + 1 }
  }
  const closeTag = (node) => ({ html: `<span class="mg-p">&lt;/</span><span class="hl-keyword">${node.tag}</span><span class="mg-p">&gt;</span>`, len: node.tag.length + 3 })
  const textSpan = (node) => ({ html: `<span ${markAttrs('mg-txt', `t${node.id}`)}>${esc(node.text)}</span>`, len: node.text.length })
  const push = (depth, parts, id, dim) => {
    lines.push({ depth, html: parts.map((p) => p.html).join(''), len: depth * 2 + parts.reduce((n, p) => n + p.len, 0), id, dim })
  }
  const nodes = new Map() // element id -> model, for the hover tip
  // Returns the right edge (in px) of the element's box.
  const walk = (node, depth, dim) => {
    if (node.text !== undefined) {
      push(depth, [textSpan(node)], null, dim)
      return (depth * 2 + node.text.length) * chPx + 4
    }
    nodes.set(node.id, node)
    const isDim = dim || attrOf(node, 'hidden') !== null
    const first = lines.length
    const open = openTag(node)
    let right
    if (node.tag === 'svg') {
      push(depth, [open, { html: '<span class="hl-comment">...</span>', len: 3 }, closeTag(node)], node.id, isDim)
      right = lines[first].len * chPx + 4
    } else if (VOID_TAGS.has(node.tag)) {
      push(depth, [open], node.id, isDim)
      right = lines[first].len * chPx + 4
    } else if (node.kids.every((k) => k.text !== undefined)) {
      push(depth, [open, ...node.kids.map(textSpan), closeTag(node)], node.id, isDim)
      right = lines[first].len * chPx + 4
    } else {
      push(depth, [open], node.id, isDim)
      let inner = 0
      for (const k of node.kids) { inner = Math.max(inner, walk(k, depth + 1, isDim)) }
      push(depth, [closeTag(node)], node.id, isDim)
      right = Math.max(lines[first].len * chPx, lines[lines.length - 1].len * chPx, inner) + 5
    }
    boxes.push({ id: node.id, first, last: lines.length - 1, depth, right })
    return right
  }
  const wrap = h('div', { class: 'mg-code' })
  const gutter = h('div', { class: 'mg-gutter', 'aria-hidden': 'true' })
  const src = h('div', { class: 'mg-src-col' })
  wrap.append(gutter, src)
  walk(tree, 0, false)
  const layer = h('div', { class: 'mg-boxes', 'aria-hidden': 'true' })
  const boxEls = new Map()
  for (const b of boxes) {
    const cls = ['mg-box']
    if (props.has(b.id)) { cls.push('mg-box-prop') }
    const key = `e${b.id}`
    const verb = own.has(key) ? own.get(key) : inner.has(key) ? inner.get(key) : ''
    if (own.has(key)) {
      cls.push('mg-box-hit')
    } else if (inner.has(key)) {
      cls.push('mg-box-ind')
    }
    if (b.id === focus) { cls.push('mg-box-on') }
    const left = b.depth * 2 * chPx - 4
    const box = h('div', { class: cls.join(' '), 'data-shape': verb || null, style: `left:${left}px;top:${b.first * LINE_PX + 1}px;width:${b.right - left}px;height:${(b.last - b.first + 1) * LINE_PX - 2}px` })
    boxEls.set(b.id, box)
    layer.append(box)
  }
  const tip = h('div', { class: 'mg-name-tip', hidden: true })
  layer.append(tip)
  src.append(layer)
  const namedIds = new Set()
  let anyName = false
  for (const line of lines) {
    // A name goes on the element's first line only: its JS property, else
    // the create method that built it.
    const first = line.id !== null && !namedIds.has(line.id)
    if (line.id !== null) { namedIds.add(line.id) }
    const prop = first ? props.get(line.id) : undefined
    const builder = first && prop === undefined ? builderOf(line.id) : null
    if (prop !== undefined || builder !== null) { anyName = true }
    const gutCls = prop !== undefined ? ` mg-gut-prop${line.id === focus ? ' mg-gut-on' : ''}` : builder !== null ? ' mg-gut-builder' : ''
    gutter.append(h('div', { class: `mg-gut${gutCls}`, 'data-id': line.id ?? '' }, [prop ?? builder?.name ?? '']))
    const named = line.id !== null && (props.has(line.id) || builderOf(line.id) !== null)
    src.append(h('div', { class: `mg-line${line.dim ? ' mg-dim' : ''}${named ? ' mg-line-named' : ''}`, 'data-id': line.id ?? '', html: ' '.repeat(line.depth * 2) + line.html }))
  }
  // No names at all: an empty gutter would only draw a dark strip.
  if (!anyName) { gutter.remove() }
  // Hover an element's line or name: outline the whole element, light up its
  // name and put a tip with its names on the box.
  const hover = (id) => {
    for (const [bid, box] of boxEls) { box.classList.toggle('mg-box-hover', bid === id) }
    for (const g of gutter.children) { g.classList.toggle('mg-gut-hover', Number(g.dataset.id) === id && g.textContent !== '') }
    const box = boxEls.get(id)
    tip.hidden = box === undefined
    if (box === undefined) { return }
    tip.innerHTML = tipHtml(id, props, nodes)
    tip.style.left = box.style.left
    const top = parseFloat(box.style.top)
    tip.style.top = `${top >= 18 ? top - 18 : top + 1}px`
  }
  const idAt = (target) => Number(target.closest('[data-id]')?.dataset.id) || null
  wrap.addEventListener('mouseover', (ev) => { hover(idAt(ev.target)) })
  wrap.addEventListener('mouseleave', () => { hover(null) })
  // Click: go to the create call that built the element, else explain its JS property.
  wrap.addEventListener('click', (ev) => {
    const id = idAt(ev.target)
    if (id === null) { return }
    const builder = builderOf(id)
    if (builder !== null) {
      select(builder)
    } else if (props.has(id)) {
      showProp(props.get(id))
    }
  })
  return wrap
}

// The documented create*El / create*ContentEl call that built an element.
function builderOf(id) {
  const f = recorder.builders.get(id)
  return f !== undefined && isDocumented(f) && splitName(f.name)?.shape.verb === 'create' ? f : null
}

// The names on the hover tip: JS property, the create call that built it, or neither.
function tipHtml(id, props, nodes) {
  const names = []
  if (props.has(id)) { names.push(`<span class="mg-tip-prop">${esc(props.get(id))}</span>`) }
  const builder = builderOf(id)
  if (builder !== null) { names.push(`<span class="mg-tip-builder">${esc(builder.name)}(${esc(builder.args.join(', '))})</span>`) }
  if (names.length > 0) { return names.join(' ') }
  const node = nodes.get(id)
  const cls = (attrOf(node, 'class') ?? '').split(' ')[0]
  return `<span class="mg-tip-none">${esc(node.tag)}${cls ? '.' + esc(cls) : ''}: no name in the API reference</span>`
}

// --- Entry points --------------------------------------------------------

if (typeof HTMLDialogElement === 'function' && typeof HTMLDialogElement.prototype.showModal === 'function') {
  const title = document.querySelector('main h1')
  if (title !== null) {
    title.after(h('p', { class: 'mg-callout' }, [
      'Method names follow a grammar. The name says how a method touches the DOM. ',
      h('button', { type: 'button', class: 'mg-open', onclick: () => { openGuide(null) } }, ['Open the method-name grammar guide']),
    ]))
  }
  for (const { heading, name, kind } of buttonSpots) {
    const text = kind === 'method' ? shapeOf(name)?.shape ?? null : elementProps.has(name) ? 'show in the DOM' : null
    if (text === null) { continue }
    const button = h('button', { type: 'button', class: 'mg-shape-button', title: 'Open the method-name grammar guide at this member', onclick: () => { openGuide(name) } }, [text])
    const sig = heading.nextElementSibling?.tagName === 'BLOCKQUOTE' ? heading.nextElementSibling.querySelector('p') : null
    if (sig !== null) { sig.append(' ', button) } else { heading.after(h('p', {}, [button])) }
  }
}
