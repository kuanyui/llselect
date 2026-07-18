// Shared jsdom + AngularJS bootstrap for the directive tests.
//
// Everything here loads real angular and the real llselect UMD build off disk -
// no CDN, no network. llselect is resolved from the parent repo's dist/, so the
// tests run against what the sibling package actually ships; if it is missing,
// fail loudly rather than skip, because a skipped test reads as a passing one.

import { JSDOM } from 'jsdom'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..')
const LLSELECT_UMD = join(PKG, '..', 'dist', 'index.umd.js')

// The package's `main` is a CommonJS shim (`require('./angular'); module.exports
// = angular`), not the browser bundle. These tests inject scripts into a jsdom
// page, so they need the real file.
const ANGULAR = require.resolve('angular/angular.js')

if (!existsSync(LLSELECT_UMD)) {
  throw new Error(
    `llselect UMD build not found at ${LLSELECT_UMD}. Run \`npm run build\` in the repo root first.`
  )
}

/**
 * Boot a jsdom page with angular + llselect + this package's directives.
 * `files` names which of the package's own files to load.
 */
export function boot({ html, module: moduleName, deps, controller, files = ['llselect-angularjs.js'] }) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
  })
  const { window } = dom

  const inject = (path) => {
    const el = window.document.createElement('script')
    el.textContent = readFileSync(path, 'utf8')
    window.document.head.appendChild(el)
  }

  inject(ANGULAR)
  inject(LLSELECT_UMD)
  for (const f of files) { inject(join(PKG, f)) }

  window.document.body.innerHTML = html

  const ng = window.angular
  const mod = ng.module('test', deps)
  if (controller) { mod.controller('C', controller) }

  // $compile's invokeLinkFn wraps EVERY link fn in its own try/catch and hands
  // whatever it throws to $exceptionHandler (angular.js:11374). So a directive
  // can never throw at the caller - not during bootstrap, not from a manual
  // $compile. Collect what it reports instead; that is the only observable.
  const errors = []
  mod.config(['$provide', function ($provide) {
    $provide.decorator('$exceptionHandler', function () {
      return function (ex) { errors.push(ex) }
    })
  }])

  const injector = ng.bootstrap(window.document.body, ['test'])
  const scope = ng.element(window.document.querySelector('[ng-controller]') || window.document.body).scope()

  return {
    window,
    ng,
    injector,
    scope,
    /** Everything $exceptionHandler was handed, in order. */
    errors,
    $rootScope: injector.get('$rootScope'),
    doc: window.document,
    $: (sel) => window.document.querySelector(sel),
    $$: (sel) => [...window.document.querySelectorAll(sel)],
    text: (sel) => window.document.querySelector(sel)?.textContent.trim(),

    /** Compile extra markup against this app, for per-test variations. */
    compile(markup) {
      const el = ng.element(markup)
      injector.get('$compile')(el)(scope.$new())
      return el
    },
  }
}
