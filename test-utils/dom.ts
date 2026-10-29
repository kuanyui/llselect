import { JSDOM } from 'jsdom'

// The core warns once per page when a select component has no accessible name,
// and when open() refuses a hidden trigger. Fixtures are unnamed on purpose,
// some tests refuse an open on purpose, and node:test runs every file in its own
// process, so each warn would print once per file. Drop both here; every other
// warn passes. Tests that assert on warnings replace console.warn themselves,
// bypassing this.
const DROPPED_WARN_PREFIXES = ['llselect: this select component has no accessible name', 'llselect: open() did nothing']
const forwardWarn = console.warn
console.warn = (...args: unknown[]): void => {
  const first = args[0]
  if (typeof first === 'string' && DROPPED_WARN_PREFIXES.some((prefix) => first.startsWith(prefix))) { return }
  forwardWarn(...args)
}

export function setupDom(html = '<!doctype html><html><body></body></html>'): JSDOM {
  const dom = new JSDOM(html)
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    Event: dom.window.Event,
    KeyboardEvent: dom.window.KeyboardEvent,
    MouseEvent: dom.window.MouseEvent,
    FocusEvent: dom.window.FocusEvent,
  })
  return dom
}
