import { JSDOM } from 'jsdom'

// The core warns once per page when a widget has no accessible name. Fixtures
// are unnamed on purpose and node:test runs every file in its own process, so
// the warn would print once per file. Drop it here; every other warn passes.
// Tests that assert on warnings replace console.warn themselves, bypassing this.
const UNNAMED_WARN_PREFIX = 'llselect: this widget has no accessible name'
const forwardWarn = console.warn
console.warn = (...args: unknown[]): void => {
  if (typeof args[0] === 'string' && args[0].startsWith(UNNAMED_WARN_PREFIX)) { return }
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
