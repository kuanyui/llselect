import { JSDOM } from 'jsdom'

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
