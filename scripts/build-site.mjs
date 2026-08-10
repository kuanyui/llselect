// Assemble the static Pages site into public/ (host-agnostic; GitLab CI
// publishes it as-is, the GitHub projects repo nests it under llselect/):
//   index.html  - landing page rendered from README.md
//   demo/       - copied as-is
//   dist/       - built library (run `npm run build` first)
//   angularjs/  - the directive sources the angularjs demo loads, plus
//                 index.html rendered from angularjs/README.md
//   api/        - core API reference, rendered from the markdown typedoc
//                 emits into .build/api-md (the `build:site` npm script runs
//                 typedoc first)
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

// GitLab-style slugs for ASCII headings ("Form integration" -> form-integration).
// Duplicate headings dedupe GitHub-style (x, x-1, x-2) in document order - the
// convention typedoc-plugin-markdown's intra-page links assume. Reset per page.
const slugCounts = new Map()
const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      // strip tags, then entities (&lt; etc. would otherwise leak into the slug)
      let id = text.replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const n = slugCounts.get(id) ?? 0
      slugCounts.set(id, n + 1)
      if (n > 0) { id = `${id}-${n}` }
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

// Sidebar outline for the (long) API pages, from the rendered headings:
// h2 = top section, h3 = symbol (collapsible), h4 = member group, h5 = member.
// Structural typedoc headings that are not navigation targets are skipped.
const TOC_SKIP = new Set(['Type Parameters', 'Extends', 'Extended by', 'Implements', 'Type Declaration'])
function buildTocHtml(body) {
  const link = (h) => `<a href="#${h.id}">${h.text}</a>`
  const root = []
  let curH2 = null
  let curH3 = null
  let curH4 = null
  for (const m of body.matchAll(/<h([2-5]) id="([^"]+)">(.*?)<\/h\1>/g)) {
    const h = { depth: Number(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, '') }
    if (TOC_SKIP.has(h.text)) { continue }
    if (h.depth === 2) {
      curH2 = { h, children: [] }
      root.push(curH2)
      curH3 = curH4 = null
    } else if (h.depth === 3 && curH2) {
      curH3 = { h, children: [] }
      curH2.children.push(curH3)
      curH4 = null
    } else if (h.depth === 4 && curH3) {
      curH4 = { h, children: [] }
      curH3.children.push(curH4)
    } else if (h.depth === 5 && curH4) {
      curH4.children.push({ h })
    }
  }
  const sections = root.map((s) => {
    const symbols = s.children.map((sym) => {
      if (sym.children.length === 0) { return `<li>${link(sym.h)}</li>` }
      const groups = sym.children.map((g) =>
        `<li class="toc-group">${link(g.h)}${g.children.length ? `<ul>${g.children.map((mem) => `<li>${link(mem.h)}</li>`).join('')}</ul>` : ''}</li>`)
      return `<li><details><summary>${link(sym.h)}</summary><ul>${groups.join('')}</ul></details></li>`
    })
    return `<li class="toc-section">${link(s.h)}${symbols.length ? `<ul>${symbols.join('')}</ul>` : ''}</li>`
  })
  return `<aside class="toc">
<input type="search" placeholder="Filter" aria-label="Filter the table of contents">
<ul class="toc-tree">${sections.join('\n')}</ul>
</aside>`
}

// prefix walks from the page back up to the site root ('./' or '../').
const NAV = [
  ['Home', ''],
  ['API', 'api/core.html'],
  ['Examples', 'demo/examples.html'],
  ['Benchmark', 'demo/benchmark.html'],
  ['AngularJS', 'demo/angularjs/'],
]
function navHtml(prefix, current) {
  const items = NAV.map(([label, path]) =>
    `<a href="${path ? prefix + path : prefix}"${label === current ? ' class="current"' : ''}>${label}</a>`)
  // Right-aligned, host-aware: GitHub by default, swapped to GitLab at runtime
  // when served from a gitlab domain (same public/ deploys to both hosts).
  items.push(`<a href="${REPO_GITHUB}" class="repo">GitHub</a>`)
  return items.join('\n')
}

function renderPage({ title, description, nav, body, toc }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>${title}</title>
<style>
:root { color-scheme: light dark; --fg: #1a1a1a; --fg-muted: #656565; --bg: #ffffff; --muted: #f4f4f4; --line: #d0d0d0; --link: #0550ae; --nav-link: #2456a6; --nav-hover: #eef3fb; }
@media (prefers-color-scheme: dark) { :root { --fg: #d8d8d8; --fg-muted: #9a9a9a; --bg: #1b1b1b; --muted: #262626; --line: #444444; --link: #6cb2ff; --nav-link: #7fb1f5; --nav-hover: #263344; } }
body { margin: 0 auto; padding: 0 1rem 4rem; max-width: 52rem; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
/* Explicit heading scale: browser defaults shrink h5/h6 BELOW body text,
   which the API pages (members are h5) cannot live with. */
h1 { font-size: 1.9em; }
h2 { font-size: 1.5em; border-bottom: 1px solid var(--line); padding-bottom: 0.2em; margin-top: 2em; }
h3 { font-size: 1.25em; margin-top: 1.8em; }
h4 { font-size: 1.08em; margin-top: 1.6em; }
h5 { font-size: 1em; margin: 1.4em 0 0.5em; }
h6 { font-size: 0.85em; margin: 1.2em 0 0.4em; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-muted); }
/* API pages: member headings are identifiers - set them in code face */
.with-toc h5 { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
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
/* Two-column shell for pages with a sidebar outline */
body.with-toc { max-width: 78rem; }
.layout { display: grid; grid-template-columns: 17rem minmax(0, 52rem); gap: 2.5rem; align-items: start; }
.toc { position: sticky; top: 0; max-height: 100vh; overflow-y: auto; padding: 1rem 0.5rem 2rem 0; font-size: 0.82em; line-height: 1.45; }
.toc input { width: 100%; box-sizing: border-box; margin-bottom: 0.6rem; padding: 0.3rem 0.5rem; font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 4px; }
.toc ul { list-style: none; margin: 0; padding-left: 0.85rem; }
.toc ul.toc-tree { padding-left: 0; }
.toc a { display: block; padding: 0.1rem 0.35rem; color: var(--fg); text-decoration: none; border-radius: 3px; overflow-wrap: anywhere; }
.toc a:hover { background: var(--nav-hover); }
.toc a.active { background: var(--nav-hover); color: var(--nav-link); font-weight: 600; }
.toc .toc-section > a { font-weight: 600; margin-top: 0.5rem; }
.toc .toc-group > a { color: var(--fg-muted); }
.toc summary { cursor: pointer; }
.toc summary a { display: inline-block; }
@media (max-width: 62rem) {
  body.with-toc { max-width: 52rem; }
  .layout { display: block; }
  .toc { display: none; }
}
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
<body${toc ? ' class="with-toc"' : ''}>
<nav>
${nav}
</nav>
${toc ? `<div class="layout">
${toc}
<main>
${body}</main>
</div>` : `<main>
${body}</main>`}
<script>
// One build serves both hosts: the nav repo link follows the serving domain.
if (location.hostname.includes('gitlab')) {
  const repoLink = document.querySelector('nav a.repo')
  repoLink.href = '${REPO_URL}'
  repoLink.textContent = 'GitLab'
}
</script>
${toc ? `<script>
// Sidebar outline: scroll tracking + text filter. No dependencies.
{
  const toc = document.querySelector('.toc')
  const links = new Map()
  for (const a of toc.querySelectorAll('a')) { links.set(decodeURIComponent(a.hash.slice(1)), a) }
  const heads = [...document.querySelectorAll('main h2[id], main h3[id], main h4[id], main h5[id]')].filter((h) => links.has(h.id))
  const openChain = (link) => {
    for (let d = link.closest('details'); d; d = d.parentElement.closest('details')) { d.open = true }
  }
  let activeLink = null
  const sync = () => {
    const y = window.scrollY + 100
    let cur = null
    for (const h of heads) { if (h.offsetTop <= y) { cur = h } else { break } }
    const link = cur ? links.get(cur.id) : null
    if (link === activeLink) { return }
    if (activeLink) { activeLink.classList.remove('active') }
    activeLink = link
    if (link) {
      link.classList.add('active')
      openChain(link)
      link.scrollIntoView({ block: 'nearest' })
    }
  }
  window.addEventListener('scroll', () => { window.requestAnimationFrame(sync) }, { passive: true })
  sync()
  // A symbol link inside a <summary> should always OPEN its branch, never
  // collapse it back while jumping to the section.
  toc.addEventListener('click', (ev) => {
    const a = ev.target.closest('summary a')
    if (a) { const d = a.closest('details'); window.requestAnimationFrame(() => { d.open = true }) }
  })
  const filter = toc.querySelector('input')
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase()
    for (const li of toc.querySelectorAll('li')) {
      li.hidden = q !== '' && !li.textContent.toLowerCase().includes(q)
    }
    if (q !== '') {
      for (const d of toc.querySelectorAll('details')) { d.open = true }
    } else {
      for (const d of toc.querySelectorAll('details')) { d.open = false }
      if (activeLink) { openChain(activeLink) }
    }
  })
}
</script>` : ''}
</body>
</html>
`
}

function renderMarkdownPage(mdPath, outPath, { title, description, prefix, current, links, toc = false }) {
  slugCounts.clear()
  let body = marked.parse(readFileSync(mdPath, 'utf8'))
  body = links ? links(body) : rewriteLinks(body, posix.dirname(mdPath).replace(/^\.$/, ''))
  writeFileSync(outPath, renderPage({ title, description, nav: navHtml(prefix, current), body, toc: toc ? buildTocHtml(body) : null }))
}

// The API pages come out of typedoc (markdown, one page per module, written to
// .build/api-md by the `build:site` npm script BEFORE this script runs). Their
// only non-anchor links are the three inter-page ones; map them onto the
// published names. Everything else (source links) is already absolute.
const API_PAGES = [
  ['README.md', 'index.html', 'llselect API reference', false],
  ['@llselect/core.md', 'core.html', '@llselect/core API', true],
  ['@llselect/core/i18n.md', 'i18n.html', '@llselect/core/i18n API', true],
]
function makeApiLinkRewriter(mdDir) {
  return (body) => body.replace(/href="(?!https?:|#|mailto:)([^"]+)"/g, (_m, target) => {
    const hashIndex = target.indexOf('#')
    const path = hashIndex === -1 ? target : target.slice(0, hashIndex)
    const hash = hashIndex === -1 ? '' : target.slice(hashIndex)
    const mdPath = posix.normalize(posix.join(mdDir, path))
    const page = API_PAGES.find(([md]) => md === mdPath)
    if (!page) { throw new Error(`build:site: unexpected relative link in API markdown: ${target}`) }
    return `href="${page[1]}${hash}"`
  })
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const ngPkg = JSON.parse(readFileSync('angularjs/package.json', 'utf8'))
renderMarkdownPage('README.md', 'public/index.html', { title: 'llselect', description: pkg.description, prefix: './', current: 'Home' })
renderMarkdownPage('angularjs/README.md', 'public/angularjs/index.html', { title: 'llselect + AngularJS 1.x', description: ngPkg.description, prefix: '../', current: null })

if (!existsSync('.build/api-md/README.md')) {
  throw new Error('.build/api-md/ is missing: the build:site npm script runs typedoc first')
}
mkdirSync('public/api', { recursive: true })
for (const [md, out, title, toc] of API_PAGES) {
  renderMarkdownPage(`.build/api-md/${md}`, `public/api/${out}`, {
    title, description: `API reference for ${pkg.name} - generated from the TypeScript declarations`, prefix: '../', current: 'API', links: makeApiLinkRewriter(posix.dirname(md).replace(/^\.$/, '')), toc,
  })
}
console.log('build:site: OK (public/)')
