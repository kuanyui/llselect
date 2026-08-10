// Assemble the static Pages site into public/ (host-agnostic; GitLab CI
// publishes it as-is, the GitHub projects repo nests it under llselect/):
//   index.html  - landing page rendered from README.md
//   demo/       - copied as-is
//   dist/       - built library (run `npm run build` first)
//   angularjs/  - the directive sources the angularjs demo loads, plus
//                 index.html rendered from angularjs/README.md
//   api/        - core API reference; typedoc writes it AFTER this script
//                 (the `build:site` npm script chains the two)
// Relative README links are kept when they point at published content
// (demo/, dist/, the directive files, the other rendered README); everything
// else is a repo file that is not published, so it is rewritten to a GitLab
// blob URL. Heading ids are generated so the READMEs' own #anchors keep
// working.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { posix } from 'node:path'
import { marked } from 'marked'

const REPO_URL = 'https://gitlab.com/kuanyui/llselect'
const REPO_BLOB = `${REPO_URL}/-/blob/master/`
const REPO_GITHUB = 'https://github.com/kuanyui/llselect'

if (!existsSync('dist/index.mjs')) {
  throw new Error('dist/ is missing or incomplete: run `npm run build` first')
}

rmSync('public', { recursive: true, force: true })
mkdirSync('public/angularjs', { recursive: true })
cpSync('demo', 'public/demo', { recursive: true })
cpSync('dist', 'public/dist', { recursive: true })
for (const f of ['llselect-angularjs.js', 'llselect-ui-select.js']) {
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

// mdDir is the source README's directory relative to the repo root ('' for the
// root README, 'angularjs' for the other). Both rendered pages mirror their
// source's directory in public/, so a kept relative href works unchanged.
function rewriteLinks(body, mdDir) {
  return body.replace(/href="(?!https?:|#|mailto:)([^"]+)"/g, (_m, target) => {
    const hashIndex = target.indexOf('#')
    const path = hashIndex === -1 ? target : target.slice(0, hashIndex)
    const hash = hashIndex === -1 ? '' : target.slice(hashIndex)
    const repoPath = posix.normalize(posix.join(mdDir, path))
    if (repoPath === 'README.md') { return `href="${mdDir ? '../' : './'}${hash}"` }
    if (repoPath === 'angularjs/README.md') { return `href="${mdDir ? './' : 'angularjs/'}${hash}"` }
    if (/^(demo|dist)\//.test(repoPath) || /^angularjs\/llselect-.+\.js$/.test(repoPath)) { return `href="${target}"` }
    return `href="${REPO_BLOB}${repoPath}${hash}"`
  })
}

// prefix walks from the page back up to the site root ('./' or '../').
const NAV = [
  ['Home', ''],
  ['Examples', 'demo/examples.html'],
  ['Benchmark', 'demo/benchmark.html'],
  ['AngularJS', 'demo/angularjs/'],
  ['API', 'api/'],
]
function navHtml(prefix, current) {
  const items = NAV.map(([label, path]) =>
    `<a href="${path ? prefix + path : prefix}"${label === current ? ' class="current"' : ''}>${label}</a>`)
  // Right-aligned, host-aware: GitHub by default, swapped to GitLab at runtime
  // when served from a gitlab domain (same public/ deploys to both hosts).
  items.push(`<a href="${REPO_GITHUB}" class="repo">GitHub</a>`)
  return items.join('\n')
}

function renderPage({ title, description, nav, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>${title}</title>
<style>
:root { color-scheme: light dark; --fg: #1a1a1a; --bg: #ffffff; --muted: #f4f4f4; --line: #d0d0d0; --link: #0550ae; --nav-link: #2456a6; --nav-hover: #eef3fb; }
@media (prefers-color-scheme: dark) { :root { --fg: #d8d8d8; --bg: #1b1b1b; --muted: #262626; --line: #444444; --link: #6cb2ff; --nav-link: #7fb1f5; --nav-hover: #263344; } }
body { margin: 0 auto; padding: 0 1rem 4rem; max-width: 52rem; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
/* same look as demo/style.css .demo-nav so the site reads as one family */
nav { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.8rem 0 0.5rem; border-bottom: 1px solid var(--line); margin-bottom: 1.5rem; }
nav a { padding: 0.35rem 0.8rem; color: var(--nav-link); text-decoration: none; border-radius: 4px; font-weight: 600; }
nav a:hover { background: var(--nav-hover); }
nav a.current { background: var(--nav-link); color: var(--bg); }
nav a.repo { margin-left: auto; }
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
${nav}
</nav>
${body}
<script>
// One build serves both hosts: the nav repo link follows the serving domain.
if (location.hostname.includes('gitlab')) {
  const repoLink = document.querySelector('nav a.repo')
  repoLink.href = '${REPO_URL}'
  repoLink.textContent = 'GitLab'
}
</script>
</body>
</html>
`
}

function renderMarkdownPage(mdPath, outPath, { title, description, prefix, current }) {
  const body = rewriteLinks(marked.parse(readFileSync(mdPath, 'utf8')), posix.dirname(mdPath).replace(/^\.$/, ''))
  writeFileSync(outPath, renderPage({ title, description, nav: navHtml(prefix, current), body }))
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const ngPkg = JSON.parse(readFileSync('angularjs/package.json', 'utf8'))
renderMarkdownPage('README.md', 'public/index.html', { title: 'llselect', description: pkg.description, prefix: './', current: 'Home' })
renderMarkdownPage('angularjs/README.md', 'public/angularjs/index.html', { title: 'llselect + AngularJS 1.x', description: ngPkg.description, prefix: '../', current: null })
console.log('build:site: OK (public/)')
