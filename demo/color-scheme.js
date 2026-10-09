// Page color scheme (light / dark) for the site pages and the demo pages.
// - Resolves the scheme before first paint: the stored choice (localStorage
//   "llselect-color-scheme"), otherwise the OS preference.
// - Writes it to <html data-color-scheme="light|dark">. The stylesheets key
//   their dark values on that attribute, never on prefers-color-scheme, so the
//   switch can override the OS.
// - Mounts a "Dark" switch at the end of the page's main nav (the first
//   `body > nav`); it stores the choice and re-applies.
// Classic script on purpose: the demo pages load it with <script src> in
// <head>; scripts/build-site.mjs inlines it into the generated pages' <head>.
// Vocabulary: "theme" is the library's visual theme (dist/themes/*.css);
// light / dark is the color scheme (naming-conventions.md 7a.11).
(() => {
  const STORAGE_KEY = 'llselect-color-scheme'
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
  const readStoredScheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'light' || stored === 'dark' ? stored : null
    } catch {
      return null // storage blocked (private mode, site data disabled)
    }
  }
  let chosenScheme = readStoredScheme() // null = follow the OS
  let switchInput = null
  const resolveScheme = () => chosenScheme ?? (darkMq.matches ? 'dark' : 'light')
  const apply = () => {
    const scheme = resolveScheme()
    document.documentElement.setAttribute('data-color-scheme', scheme)
    if (switchInput) { switchInput.checked = scheme === 'dark' }
  }
  apply()
  darkMq.addEventListener('change', apply) // no effect once a choice is stored
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('body > nav')
    if (!nav) { return }
    switchInput = document.createElement('input')
    switchInput.type = 'checkbox'
    switchInput.setAttribute('role', 'switch')
    switchInput.checked = resolveScheme() === 'dark'
    switchInput.addEventListener('change', () => {
      chosenScheme = switchInput.checked ? 'dark' : 'light'
      try {
        localStorage.setItem(STORAGE_KEY, chosenScheme)
      } catch {
        // storage blocked: the choice lasts for this page only
      }
      apply()
    })
    const label = document.createElement('label')
    label.className = 'color-scheme-switch'
    label.append(switchInput, ' Dark')
    nav.append(label)
  })
})()
