// Collect the bundles for the benchmark history page (demo/bench-history.html):
// the minified UMD bundle and the vanilla theme of every version of
// @llselect/core on npm, into demo/bench-history/<version>/, laid out as in
// dist/, and the list of the versions into demo/bench-history/versions.json.
// The page loads the current build from dist/ itself. A version collected
// before is kept, since a published version never changes; a version that npm
// cannot deliver is skipped. Run `npm run build:site` after, which copies
// demo/ into public/. demo/bench-history/ is not committed.

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const PACKAGE = '@llselect/core'
const OUT = join('demo', 'bench-history')
const FILES = ['index.umd.js', join('themes', 'vanilla.css')]

const published = JSON.parse(execFileSync('npm', ['view', PACKAGE, 'versions', '--json'], { encoding: 'utf8' }))
const versions = Array.isArray(published) ? published : [published]
mkdirSync(OUT, { recursive: true })
const collected = []
const tmp = mkdtempSync(join(tmpdir(), 'llselect-bench-history-'))
try {
  for (const version of versions) {
    const dir = join(OUT, version)
    if (!FILES.every((f) => existsSync(join(dir, f)))) {
      try {
        const into = join(tmp, version)
        mkdirSync(into)
        execFileSync('npm', ['pack', `${PACKAGE}@${version}`, '--pack-destination', into, '--silent'], { stdio: ['ignore', 'ignore', 'inherit'] })
        execFileSync('tar', ['-xzf', join(into, `llselect-core-${version}.tgz`), '-C', into])
        for (const f of FILES) {
          mkdirSync(dirname(join(dir, f)), { recursive: true })
          copyFileSync(join(into, 'package', 'dist', f), join(dir, f))
        }
      } catch (e) {
        console.warn(`bench-history:prepare: skipped ${version}: ${String(e.message).split('\n')[0]}`)
        rmSync(dir, { recursive: true, force: true })
        continue
      }
    }
    collected.push(version)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

writeFileSync(join(OUT, 'versions.json'), JSON.stringify(collected, null, 2) + '\n')
console.log(`bench-history:prepare: ${collected.length} published versions in ${OUT}`)
