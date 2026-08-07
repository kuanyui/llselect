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
const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      // strip tags, then entities (&lt; etc. would otherwise leak into the slug)
      const id = text.replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    // GitHub-style alerts: > [!TIP] etc. Marked has no built-in for them, so a
    // blockquote whose first paragraph opens with the marker becomes a styled
    // div; the marker is stripped whether it sits alone or leads the paragraph.
    blockquote({ tokens }) {
      const first = tokens[0]
      const m = first?.type === 'paragraph' ? first.text.match(ALERT_RE) : null
      if (!m) { return false } // not an alert: default blockquote rendering
      const label = m[1][0] + m[1].slice(1).toLowerCase()
      let inner = this.parser.parse(tokens)
      inner = inner.replace(/^<p>\[!\w+\]<\/p>\n?/, '').replace(/^<p>\[!\w+\]\s*/, '<p>')
      return `<div class="md-alert md-alert-${m[1].toLowerCase()}">\n<p class="md-alert-title">${label}</p>\n${inner}</div>\n`
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
<title>llselect</title>
<style>
:root { color-scheme: light dark; --fg: #1a1a1a; --bg: #ffffff; --muted: #f4f4f4; --line: #d0d0d0; --link: #0550ae; --nav-link: #2456a6; --nav-hover: #eef3fb; }
@media (prefers-color-scheme: dark) { :root { --fg: #d8d8d8; --bg: #1b1b1b; --muted: #262626; --line: #444444; --link: #6cb2ff; --nav-link: #7fb1f5; --nav-hover: #263344; } }
body { margin: 0 auto; padding: 0 1rem 4rem; max-width: 52rem; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
/* same look as demo/style.css .demo-nav so the site reads as one family */
nav { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.8rem 0 0.5rem; border-bottom: 1px solid var(--line); margin-bottom: 1.5rem; }
nav a { padding: 0.35rem 0.8rem; color: var(--nav-link); text-decoration: none; border-radius: 4px; font-weight: 600; }
nav a:hover { background: var(--nav-hover); }
nav a.current { background: var(--nav-link); color: var(--bg); }
a { color: var(--link); }
pre { padding: 0.8rem; background: var(--muted); overflow-x: auto; }
code { background: var(--muted); padding: 0.1em 0.3em; font-size: 0.92em; }
pre code { padding: 0; }
table { border-collapse: collapse; }
th, td { border: 1px solid var(--line); padding: 0.3em 0.6em; }
.md-alert { margin: 1rem 0; padding: 0.1rem 1rem; border-left: 0.25rem solid var(--alert, var(--line)); }
.md-alert-title { font-weight: 600; color: var(--alert); }
.md-alert-note { --alert: #0969da; }
.md-alert-tip { --alert: #1a7f37; }
.md-alert-important { --alert: #8250df; }
.md-alert-warning { --alert: #9a6700; }
.md-alert-caution { --alert: #cf222e; }
@media (prefers-color-scheme: dark) {
  .md-alert-note { --alert: #4493f8; }
  .md-alert-tip { --alert: #3fb950; }
  .md-alert-important { --alert: #ab7df8; }
  .md-alert-warning { --alert: #d29922; }
  .md-alert-caution { --alert: #f85149; }
}
</style>
</head>
<body>
<nav>
<a href="./" class="current">Home</a>
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
