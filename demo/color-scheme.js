// Page color scheme (light / dark) for the site pages and the demo pages.
// - The stylesheets follow the OS preference on their own (prefers-color-scheme
//   under `:root:not([data-color-scheme])`), so a page without JavaScript still
//   renders dark on a dark OS.
// - A stored override (localStorage "llselect-color-scheme", light / dark) is
//   written to <html data-color-scheme="..."> before first paint; the
//   stylesheets key their explicit values on that attribute.
// - The "Dark" switch at the end of the page's main nav (the first `body > nav`)
//   shows the effective scheme. Setting it to what the OS already says clears
//   the override, so the page follows the OS again; the other value stores one.
// Classic script on purpose: the demo pages load it with <script src> in
// <head>; scripts/build-site.mjs inlines it into the generated pages' <head>.
// Vocabulary: "theme" is the library's visual theme (dist/themes/*.css);
// light / dark is the color scheme (naming-conventions.md 7a.11).
(() => {
  const STORAGE_KEY = 'llselect-color-scheme'
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
  const osScheme = () => (darkMq.matches ? 'dark' : 'light')
  const readOverride = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'light' || stored === 'dark' ? stored : null
    } catch {
      return null // storage blocked (private browsing, site data disabled)
    }
  }
  let override = readOverride() // null = follow the OS
  let switchInput = null
  const apply = () => {
    const root = document.documentElement
    if (override) { root.setAttribute('data-color-scheme', override) } else { root.removeAttribute('data-color-scheme') }
    if (switchInput) { switchInput.checked = (override ?? osScheme()) === 'dark' }
  }
  apply()
  darkMq.addEventListener('change', apply) // keeps the switch in step while no override is stored
  const mount = (nav) => {
    switchInput = document.createElement('input')
    switchInput.type = 'checkbox'
    switchInput.checked = (override ?? osScheme()) === 'dark'
    switchInput.addEventListener('change', () => {
      const chosen = switchInput.checked ? 'dark' : 'light'
      override = chosen === osScheme() ? null : chosen
      try {
        if (override) { localStorage.setItem(STORAGE_KEY, override) } else { localStorage.removeItem(STORAGE_KEY) }
      } catch {
        // storage blocked: the choice lasts for this page only
      }
      apply()
    })
    const label = document.createElement('label')
    label.className = 'color-scheme-switch'
    label.append(switchInput, ' Dark')
    nav.append(label)
  }
  // Mount as soon as the nav is parsed to its end (a node follows it), not at
  // DOMContentLoaded, which waits for every classic script at the page's end.
  const tryMount = (navMayBeOpen) => {
    if (switchInput) { return true }
    const nav = document.querySelector('body > nav')
    if (!nav || (!navMayBeOpen && !nav.nextSibling)) { return false }
    mount(nav)
    return true
  }
  if (!tryMount(false)) {
    const observer = new MutationObserver(() => { if (tryMount(false)) { observer.disconnect() } })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    document.addEventListener('DOMContentLoaded', () => { observer.disconnect(); tryMount(true) })
  }
})()
