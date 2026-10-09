// Color scheme (light / dark) resolution for the themes. Contract: DESIGN.md
// "Color scheme (light / dark) in the themes". The themes key their dark values
// on the attribute written here; hosts never write it.

/**
 * The `colorScheme` setting's values.
 * - `'auto'` (default): the library decides from the page. The setting's
 *   docstring on {@link LLSelectBaseSettings.colorScheme} explains the order.
 * - `'light'` / `'dark'`: that scheme, whatever the page says.
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

// --- shared page listeners --------------------------------------------------
// One media-query listener and one attribute observer per document re-decide
// every subscribed widget. Subscribers are keyed by their root element in a
// WeakMap, and the listeners find live roots through the document, so a
// discarded instance is retained by nothing here (the existing lifecycle
// promise of destroy() holds).

interface ColorSchemeSubscriber { refresh(): void }
const subscribersByRoot = new WeakMap<HTMLElement, ColorSchemeSubscriber>()
const wiredDocuments = new WeakSet<Document>()

export function subscribeColorScheme(rootEl: HTMLElement, subscriber: ColorSchemeSubscriber): void {
  subscribersByRoot.set(rootEl, subscriber)
  wireDocument(rootEl.ownerDocument)
}

export function unsubscribeColorScheme(rootEl: HTMLElement): void {
  subscribersByRoot.delete(rootEl)
}

function wireDocument(doc: Document): void {
  if (wiredDocuments.has(doc)) { return }
  wiredDocuments.add(doc)
  const view = doc.defaultView
  if (view === null) { return }
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
    const observer = new view.MutationObserver(refreshAll)
    observer.observe(doc.documentElement, { attributes: true })
    if (doc.body !== null) { observer.observe(doc.body, { attributes: true }) }
  }
}
