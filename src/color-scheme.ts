// Color scheme (light / dark) resolution for the themes. Contract: DESIGN.md
// "Color scheme (light / dark) in the themes". The themes key their dark values
// on the attribute written here; hosts never write it.

/**
 * The `colorScheme` setting's values.
 * - `'auto'` (default): the library decides from the page. The setting's
 *   docstring on {@link LLSelectBaseSettings.colorScheme} explains the order.
 * - `'light'` or `'dark'`: always that scheme, regardless of the CSS sources and of the operating system's color preference.
 * @group Settings
 * @category Base
 */
export type LLSelectColorScheme = 'auto' | 'light' | 'dark'

/** The attribute the resolver writes on the widget root. The themes key their dark values on it. */
export const COLOR_SCHEME_ATTRIBUTE = 'data-llselect-color-scheme'
/** The CSS variable a host page or a built-in mark sets on any ancestor: `light`, `dark` or `auto`. */
export const COLOR_SCHEME_VARIABLE = '--llselect-color-scheme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The four inputs of one decision, as read from the page. */
export interface ColorSchemeInputs {
  setting: LLSelectColorScheme
  /** The computed `--llselect-color-scheme` of the widget root; empty when nobody set it. */
  variable: string
  /** The computed CSS property `color-scheme` of the widget root; empty where the browser lacks the property. */
  declared: string
  osPrefersDark: boolean
}

/**
 * The decision, as a pure function of its inputs (DESIGN.md "How the resolver decides").
 * Order: the forced setting; the variable (`auto` = the OS preference); the
 * declared `color-scheme` combined with the OS preference; otherwise light.
 */
export function resolveColorScheme(inputs: ColorSchemeInputs): 'light' | 'dark' {
  if (inputs.setting !== 'auto') { return inputs.setting }
  const variable = inputs.variable.trim()
  if (variable === 'light' || variable === 'dark') { return variable }
  if (variable === 'auto') { return inputs.osPrefersDark ? 'dark' : 'light' }
  const keywords = inputs.declared.trim().split(/\s+/)
  if (keywords.includes('dark') && (!keywords.includes('light') || inputs.osPrefersDark)) { return 'dark' }
  return 'light'
}

function prefersDark(view: Window | null): boolean {
  return view !== null && typeof view.matchMedia === 'function' && view.matchMedia(DARK_QUERY).matches
}

/** Reads the inputs for a widget root: one getComputedStyle call when the setting is `'auto'`. */
export function readColorSchemeInputs(rootEl: HTMLElement, setting: LLSelectColorScheme): ColorSchemeInputs {
  if (setting !== 'auto') { return { setting, variable: '', declared: '', osPrefersDark: false } }
  const view = rootEl.ownerDocument.defaultView
  if (view === null) { return { setting, variable: '', declared: '', osPrefersDark: false } }
  const style = view.getComputedStyle(rootEl)
  return {
    setting,
    variable: style.getPropertyValue(COLOR_SCHEME_VARIABLE),
    declared: style.getPropertyValue('color-scheme'),
    osPrefersDark: prefersDark(view),
  }
}

// --- the first decision, batched -----------------------------------------------
// getComputedStyle right after the widget's own DOM edits flushes a style
// recalculation; a page that builds many widgets in one loop would pay one per
// widget (the 1000-widget benchmark measured 2.5x). So the first decision of
// every 'auto' instance waits for a microtask: it still lands before the first
// paint, and all widgets built in one task share one flush. getColorScheme()
// and open() decide at once when the decision is still pending.
interface PendingDecision { decideNow(): void }
// Keyed by the root element: a newer instance built on the same element
// replaces an older one's pending decision, so the older one can never write
// the attribute after the newer one did.
const pendingDecisions = new Map<HTMLElement, PendingDecision>()
let flushScheduled = false

export function queueFirstDecision(rootEl: HTMLElement, decision: PendingDecision): void {
  pendingDecisions.set(rootEl, decision)
  if (flushScheduled) { return }
  flushScheduled = true
  void Promise.resolve().then(() => {
    flushScheduled = false
    const batch = [...pendingDecisions.values()]
    pendingDecisions.clear()
    for (const d of batch) { d.decideNow() }
  })
}

/** Drops the pending decision only when it is still this one (a newer instance may own the element now). */
export function cancelFirstDecision(rootEl: HTMLElement, decision: PendingDecision): void {
  if (pendingDecisions.get(rootEl) === decision) { pendingDecisions.delete(rootEl) }
}

/**
 * Called by every constructor: the new instance owns the element from now on.
 * An older instance on the same element loses its pending decision and its
 * subscription, so it can neither overwrite the attribute nor keep deciding.
 */
export function claimColorSchemeRoot(rootEl: HTMLElement): void {
  pendingDecisions.delete(rootEl)
  subscribersByRoot.delete(rootEl)
}

// --- shared page listeners --------------------------------------------------
// One media-query listener and one attribute observer per document re-decide
// every subscribed widget. Subscribers are keyed by their root element in a
// WeakMap, and the listeners find live roots through the document, so a
// discarded instance is retained by nothing here (the existing lifecycle
// promise of destroy() holds).

interface ColorSchemeSubscriber { refresh(): void }
const subscribersByRoot = new WeakMap<HTMLElement, ColorSchemeSubscriber>()
interface DocumentWiring { observer: MutationObserver | null; bodyObserved: boolean }
const wiringByDocument = new WeakMap<Document, DocumentWiring>()

export function subscribeColorScheme(rootEl: HTMLElement, subscriber: ColorSchemeSubscriber): void {
  subscribersByRoot.set(rootEl, subscriber)
  const wiring = wireDocument(rootEl.ownerDocument)
  // <body> may not have existed when the document was wired (a widget built
  // from a script in <head>); observe it as soon as a subscription sees it.
  if (wiring !== null && !wiring.bodyObserved && wiring.observer !== null && rootEl.ownerDocument.body !== null) {
    wiring.observer.observe(rootEl.ownerDocument.body, { attributes: true })
    wiring.bodyObserved = true
  }
}

/** Drops the subscription only when it is still this one (a newer instance may own the element now). */
export function unsubscribeColorScheme(rootEl: HTMLElement, subscriber: ColorSchemeSubscriber): void {
  if (subscribersByRoot.get(rootEl) === subscriber) { subscribersByRoot.delete(rootEl) }
}

// The listeners stay for the document's life: a pass is one query of the
// document, holds no instance, and an idle document sees few attribute
// changes on <html> or <body>.
function wireDocument(doc: Document): DocumentWiring | null {
  const existing = wiringByDocument.get(doc)
  if (existing !== undefined) { return existing }
  const view = doc.defaultView
  if (view === null) { return null }
  const wiring: DocumentWiring = { observer: null, bodyObserved: false }
  wiringByDocument.set(doc, wiring)
  let scheduled = false
  // Batched: one pass per task, however many attributes changed. Only roots
  // present in the document are reached (a shadow root's widgets re-decide on
  // open() or refreshColorScheme()).
  const refreshAll = (): void => {
    if (scheduled) { return }
    scheduled = true
    void Promise.resolve().then(() => {
      scheduled = false
      for (const el of doc.querySelectorAll<HTMLElement>(`[${COLOR_SCHEME_ATTRIBUTE}]`)) {
        subscribersByRoot.get(el)?.refresh()
      }
    })
  }
  if (typeof view.matchMedia === 'function') {
    const query = view.matchMedia(DARK_QUERY)
    if (typeof query.addEventListener === 'function') { query.addEventListener('change', refreshAll) }
  }
  if (typeof view.MutationObserver === 'function') {
    // A widget mounted on <html> or <body> writes its own attribute on an
    // observed element; those records must not start another pass.
    wiring.observer = new view.MutationObserver((records) => {
      if (records.every((r) => r.attributeName === COLOR_SCHEME_ATTRIBUTE)) { return }
      refreshAll()
    })
    wiring.observer.observe(doc.documentElement, { attributes: true })
    if (doc.body !== null) {
      wiring.observer.observe(doc.body, { attributes: true })
      wiring.bodyObserved = true
    }
  }
  return wiring
}
