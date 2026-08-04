// Assemble the static Pages site into public/ (host-agnostic; GitLab CI
// publishes it as-is, the GitHub projects repo nests it under llselect/):
//   index.html  - landing page rendered from README.md
//   demo/       - copied as-is
//   dist/       - built library (run `npm run build` first)
//   angularjs/  - the directive sources the angularjs demo loads
// Relative README links point at repo files that are not published, so they
// are rewritten to GitLab blob URLs; heading ids are generated so the
// README's own #anchors keep working.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { marked } from 'marked'

const REPO_URL = 'https://gitlab.com/kuanyui/llselect'
const REPO_BLOB = `${REPO_URL}/-/blob/master/`

if (!existsSync('dist/index.mjs')) {
  throw new Error('dist/ is missing or incomplete: run `npm run build` first')
}

rmSync('public', { recursive: true, force: true })
mkdirSync('public/angularjs', { recursive: true })
cpSync('demo', 'public/demo', { recursive: true })
cpSync('dist', 'public/dist', { recursive: true })
for (const f of ['llselect-angularjs.js', 'llselect-ui-select.js', 'README.md']) {
  copyFileSync(`angularjs/${f}`, `public/angularjs/${f}`)
}

// GitLab-style slugs for ASCII headings ("Form integration" -> form-integration)
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      // strip tags, then entities (&lt; etc. would otherwise leak into the slug)
      const id = text.replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
  },
})

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
let body = marked.parse(readFileSync('README.md', 'utf8'))
body = body.replace(/href="(?!https?:|#|mailto:)([^"]+)"/g, (_m, path) => `href="${REPO_BLOB}${path.replace(/^\.\//, '')}"`)

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${pkg.description}">
<title>${pkg.name}</title>
<style>
:root { color-scheme: light dark; --fg: #1a1a1a; --bg: #ffffff; --muted: #f4f4f4; --line: #d0d0d0; --link: #0550ae; }
@media (prefers-color-scheme: dark) { :root { --fg: #d8d8d8; --bg: #1b1b1b; --muted: #262626; --line: #444444; --link: #6cb2ff; } }
body { margin: 0 auto; padding: 0 1rem 4rem; max-width: 52rem; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
nav { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.8rem 0; border-bottom: 1px solid var(--line); margin-bottom: 1rem; }
a { color: var(--link); }
pre { padding: 0.8rem; background: var(--muted); overflow-x: auto; }
code { background: var(--muted); padding: 0.1em 0.3em; font-size: 0.92em; }
pre code { padding: 0; }
table { border-collapse: collapse; }
th, td { border: 1px solid var(--line); padding: 0.3em 0.6em; }
</style>
</head>
<body>
<nav>
<a href="demo/">Demo</a>
<a href="demo/examples.html">Examples</a>
<a href="demo/benchmark.html">Benchmark</a>
<a href="demo/angularjs/">AngularJS</a>
<a href="${REPO_URL}">GitLab</a>
</nav>
${body}
</body>
</html>
`
writeFileSync('public/index.html', html)
console.log('build:site: OK (public/)')
