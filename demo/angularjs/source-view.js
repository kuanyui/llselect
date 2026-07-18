/**
 * Shows this page's own source next to each live demo.
 *
 * The markup is fetched from index.html rather than read out of the DOM on
 * purpose: by the time you could read it, AngularJS has compiled it and added
 * its own classes, ids and comment anchors. The raw file is what you would
 * actually copy.
 *
 * Demo-only; not part of the library.
 */
import { highlightJs, highlightHtml, dedent } from '../highlight.js'

const FILES = [
  ['src-llselect-angularjs', '../../angularjs/llselect-angularjs.js'],
  ['src-ui-llselect', '../../angularjs/llselect-ui-select.js'],
  ['src-app', 'app.js'],
]

function fail(el, msg) {
  el.textContent = msg + ' (this page needs `npm run serve`; fetch does not work from file://)'
}

// --- per-section markup, lifted from the untouched file ---------------------
try {
  const raw = await (await fetch(location.pathname.split('/').pop() || 'examples.html')).text()
  const doc = new DOMParser().parseFromString(raw, 'text/html')

  document.querySelectorAll('[data-src-for]').forEach((pre) => {
    const key = pre.dataset.srcFor
    const source = doc.querySelector(`[data-src="${key}"]`)
    const code = pre.querySelector('code')
    if (!source) {
      fail(code, `no [data-src="${key}"] on this page`)
      return
    }
    code.innerHTML = highlightHtml(dedent(source.innerHTML))
  })
} catch (e) {
  document.querySelectorAll('[data-src-for] code').forEach(c => fail(c, 'could not read this page'))
}

// --- whole files, at the bottom ---------------------------------------------
for (const [id, path] of FILES) {
  const el = document.getElementById(id)
  if (!el) { continue }
  try {
    const text = await (await fetch(path)).text()
    el.innerHTML = highlightJs(text)
  } catch (e) {
    fail(el, `could not read ${path}`)
  }
}
