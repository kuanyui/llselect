// One run of the benchmark history page, inside its own frame: build the
// select components of one library for one scenario with bench-core.js, the
// measurement of the benchmark page, and post the result to the history page.

import { BUDGET_MS, SCENARIOS, NATIVE_ADAPTER, createLLSelectAdapter, measureMass } from './bench-core.js'

const params = new URLSearchParams(location.search)
const id = params.get('id')

function post(payload) {
  parent.postMessage({ type: 'bench-history-result', id, ...payload }, location.origin)
}

async function run() {
  const scen = SCENARIOS[params.get('scenario') || '']
  if (!scen) { throw new Error('unknown scenario') }
  const native = params.get('lib') === 'native'
  if (!native && !window.llselect) { throw new Error('the llselect bundle did not load') }
  if (document.readyState !== 'complete') {
    await new Promise((resolve) => { window.addEventListener('load', resolve, { once: true }) })
  }
  // A stylesheet that failed to load would measure unstyled select components.
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    if (!link.sheet || link.sheet.cssRules.length === 0) { throw new Error(`a stylesheet did not load: ${link.getAttribute('href')}`) }
  }
  const adapter = native ? NATIVE_ADAPTER : createLLSelectAdapter(/^0\.0\.[12]$/.test(params.get('v') || '') ? 'searchable' : 'filterable')
  // The default options of the benchmark page: pre-select at build time on,
  // custom renderer off, the time budget on.
  const res = await measureMass(adapter, document.getElementById('stage'), scen, { custom: false, preselect: true, noTimeout: false }, {
    name: native ? 'native' : 'llselect',
    budgetMs: BUDGET_MS,
    onStart: () => {},
    onBuilt: () => {},
    shouldStop: () => false,
    onProgress: () => {},
  })
  post({ res })
}

run().catch((e) => { post({ error: String((e && e.message) || e) }) })
