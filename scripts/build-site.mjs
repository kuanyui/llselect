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
import { highlightJs, highlightHtml } from '../demo/highlight.js'

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
    // Fenced blocks highlight at build time via the demo's own minimal
    // tokenizers (ts is close enough to js for the curated API examples);
    // unknown languages render escaped plain.
    code({ text, lang }) {
      const escaped = text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
      const html = (lang === 'js' || lang === 'ts') ? highlightJs(text) : lang === 'html' ? highlightHtml(text) : escaped
      return `<pre><code>${html}</code></pre>\n`
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

// Sidebar outline for the (long) API pages: a generic nested tree from the
// rendered heading ladder (h2..h6) - depths are NOT fixed per role, because a
// categorized group (@group + @category) sinks its symbols one level deeper
// than an uncategorized one. Structural typedoc headings are skipped by TEXT,
// together with their deeper subtree.
const TOC_SKIP = new Set(['Type Parameters', 'Extends', 'Extended by', 'Implements', 'Type Declaration', 'Parameters', 'Returns', 'Inherited from', 'Overrides', 'Example'])
function buildTocHtml(body) {
  const root = { depth: 1, children: [] }
  const stack = [root]
  let skipDepth = null
  for (const m of body.matchAll(/<h([2-6]) id="([^"]+)">(.*?)<\/h\1>/g)) {
    const h = { depth: Number(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, ''), children: [] }
    if (skipDepth !== null && h.depth > skipDepth) { continue }
    skipDepth = null
    if (TOC_SKIP.has(h.text)) { skipDepth = h.depth; continue }
    while (stack[stack.length - 1].depth >= h.depth) { stack.pop() }
    stack[stack.length - 1].children.push(h)
    stack.push(h)
  }
  // mdi chevron-right / unfold-less-horizontal (MIT), same source as src/icons.ts
  const CHEVRON = '<svg class="toc-chevron" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>'
  const FOLD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.59,5.41L15.17,4L12,7.17L8.83,4L7.41,5.41L12,10M7.41,18.59L8.83,20L12,16.83L15.17,20L16.58,18.59L12,14L7.41,18.59Z"/></svg>'
  const render = (node, isSection) => {
    const link = `<a href="#${node.id}">${node.text}</a>`
    if (node.children.length === 0) { return `<li>${link}</li>` }
    const inner = `<ul>${node.children.map((c) => render(c, false)).join('')}</ul>`
    // top-level sections stay expanded labels; every deeper parent collapses
    if (isSection) { return `<li class="toc-section">${link}${inner}</li>` }
    return `<li><details><summary>${CHEVRON}${link}</summary>${inner}</details></li>`
  }
  return `<aside class="toc">
<input type="search" placeholder="Filter" aria-label="Filter the table of contents">
<button type="button" class="toc-fold">${FOLD_ICON}Fold all</button>
<ul class="toc-tree">${root.children.map((c) => render(c, true)).join('\n')}</ul>
</aside>`
}

// prefix walks from the page back up to the site root ('./' or '../').
const NAV = [
  ['Home', ''],
  ['API', 'api/'],
  ['Examples', 'demo/examples.html'],
  ['Benchmark', 'demo/benchmark.html'],
  ['AngularJS', 'angularjs/'],
]
function navHtml(prefix, current) {
  const items = NAV.map(([label, path]) =>
    `<a href="${path ? prefix + path : prefix}"${label === current ? ' class="current"' : ''}>${label}</a>`)
  // Right-aligned, host-aware: GitHub by default, swapped to GitLab at runtime
  // when served from a gitlab domain (same public/ deploys to both hosts).
  items.push(`<a href="${REPO_GITHUB}" class="repo">GitHub</a>`)
  return items.join('\n')
}

// Second nav tier for the AngularJS section: the main nav marks the section
// ("AngularJS" current), this bar identifies it (logo label) and navigates
// within it. The demo pages carry the same bar statically (.demo-subnav).
// mdi angularjs (MIT), extracted from @mdi/js.
const ANGULARJS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12,2.5L20.84,5.65L19.5,17.35L12,21.5L4.5,17.35L3.16,5.65L12,2.5M12,4.5L5,7L6.08,16.22L12,19.5L17.92,16.22L19,7L12,4.5M12,5.72L16.58,16H14.87L13.94,13.72H10.04L9.12,16H7.41L12,5.72M13.34,12.3L12,9.07L10.66,12.3H13.34Z"/></svg>'
function angularjsSubnavHtml(prefix, current) {
  const items = [
    ['README', `${prefix}angularjs/`],
    ['Examples', `${prefix}demo/angularjs/examples.html`],
    ['Benchmark', `${prefix}demo/angularjs/benchmark.html`],
  ]
  return `<nav class="subnav"><span class="subnav-label">${ANGULARJS_ICON}AngularJS 1.x</span>
${items.map(([label, href]) => `<a href="${href}"${label === current ? ' class="current"' : ''}>${label}</a>`).join('\n')}
</nav>`
}

function renderPage({ title, description, nav, body, toc, subnav = null }) {
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
h6 { font-size: 1em; margin: 1.4em 0 0.5em; }
/* API pages: h6 holds member names AND typedoc's structural labels - the
   labels are a closed set, recognizable by their slug ids */
.with-toc h6[id^="parameters"], .with-toc h6[id^="returns"], .with-toc h6[id^="inherited-from"], .with-toc h6[id^="overrides"], .with-toc h6[id^="example"] { font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-muted); }
/* Jump-target highlight: the content side answers the sidebar's highlight */
main :target { background: var(--nav-hover); box-shadow: 0 0 0 6px var(--nav-hover); border-radius: 2px; scroll-margin-top: 0.6rem; }
/* same look as demo/style.css .demo-nav so the site reads as one family */
nav { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.8rem 0 0.5rem; border-bottom: 1px solid var(--line); margin-bottom: 1.5rem; }
nav a { padding: 0.35rem 0.8rem; color: var(--nav-link); text-decoration: none; border-radius: 4px; font-weight: 600; }
nav a:hover { background: var(--nav-hover); }
nav a.current { background: var(--nav-link); color: var(--bg); }
nav a.repo { margin-left: auto; }
/* Second nav tier (AngularJS section): identity label + in-section items */
.subnav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; margin: -1rem 0 1.5rem; padding: 0.4rem 0.5rem; font-size: 0.92em; background: var(--muted); border-radius: 6px; }
.subnav-label { display: flex; align-items: center; gap: 0.3rem; margin-right: 0.5rem; font-weight: 600; }
.subnav-label svg { width: 1.15em; height: 1.15em; color: #dd1b16; }
.subnav a { padding: 0.25rem 0.7rem; color: var(--nav-link); text-decoration: none; border-radius: 4px; font-weight: 600; }
.subnav a:hover { background: var(--nav-hover); }
.subnav a.current { background: var(--nav-link); color: var(--bg); }
a { color: var(--link); }
/* Fenced blocks: the demo pages' dark One Monokai look, same in both themes */
pre { padding: 0.8rem 1rem; background: #282c34; color: #abb2bf; border-radius: 4px; overflow-x: auto; font-size: 0.9em; line-height: 1.5; }
code { background: var(--muted); padding: 0.1em 0.3em; font-size: 0.92em; }
pre code { padding: 0; background: transparent; color: inherit; }
.hl-comment { color: #676f7d; font-style: italic; }
.hl-string { color: #e6db74; }
.hl-keyword { color: #f92672; }
.hl-number { color: #ae81ff; }
.hl-func { color: #a6e22e; }
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
.toc-fold { display: flex; align-items: center; gap: 0.35rem; width: 100%; margin-bottom: 0.6rem; padding: 0.25rem 0.5rem; font: inherit; color: var(--fg); background: var(--muted); border: 1px solid var(--line); border-radius: 4px; cursor: pointer; }
.toc-fold:hover { background: var(--nav-hover); }
.toc-fold svg { width: 1rem; height: 1rem; flex: none; color: var(--fg-muted); }
/* The native disclosure marker is unclickably small; draw an mdi chevron
   with a real hit area instead. Leaf rows at the same level get a matching
   left inset so their text lines up with the chevron rows' text. */
.toc summary { cursor: pointer; display: flex; align-items: center; list-style: none; }
.toc summary::-webkit-details-marker { display: none; }
.toc summary a { flex: 1; }
.toc-chevron { flex: none; width: 1.1rem; height: 1.1rem; padding: 0.15rem 0.2rem; color: var(--fg-muted); transition: transform 0.15s; }
.toc details[open] > summary > .toc-chevron { transform: rotate(90deg); }
/* leaf rows text-align with their chevron'd siblings at any level */
.toc-tree li > a { margin-left: 1.5rem; }
.toc summary a { margin-left: 0; }
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
/* Back-to-top: fixed bottom-right, hidden until scrolled (script toggles). */
.back-to-top { position: fixed; right: 1rem; bottom: 1rem; z-index: 10; padding: 0.45rem 0.9rem; font: inherit; font-weight: 600; color: var(--nav-link); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.back-to-top:hover { background: var(--nav-hover); }
</style>
</head>
<body${toc ? ' class="with-toc"' : ''}>
<nav>
${nav}
</nav>
${subnav ?? ''}
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
<button class="back-to-top" hidden>Top</button>
<script>
// Back-to-top: appears after one viewport of scroll.
{
  const topBtn = document.querySelector('.back-to-top')
  const syncTopBtn = () => { topBtn.hidden = window.scrollY < window.innerHeight }
  window.addEventListener('scroll', syncTopBtn, { passive: true })
  syncTopBtn()
  topBtn.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  })
}
</script>
${toc ? `<script>
// Sidebar outline: scroll tracking + text filter. No dependencies.
{
  const toc = document.querySelector('.toc')
  const links = new Map()
  for (const a of toc.querySelectorAll('a')) { links.set(decodeURIComponent(a.hash.slice(1)), a) }
  const heads = [...document.querySelectorAll('main h2[id], main h3[id], main h4[id], main h5[id], main h6[id]')].filter((h) => links.has(h.id))
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
  // Fold all = reset the outline: clear the filter, collapse every branch
  // (the active branch reopens on the next scrollspy change, not before).
  toc.querySelector('.toc-fold').addEventListener('click', () => {
    filter.value = ''
    for (const li of toc.querySelectorAll('li')) { li.hidden = false }
    for (const d of toc.querySelectorAll('details')) { d.open = false }
  })
}
</script>` : ''}
</body>
</html>
`
}

function renderMarkdownPage(mdPath, outPath, { title, description, prefix, current, links, toc = false, subnav = null }) {
  slugCounts.clear()
  let body = marked.parse(readFileSync(mdPath, 'utf8'))
  body = links ? links(body) : rewriteLinks(body, posix.dirname(mdPath).replace(/^\.$/, ''))
  writeFileSync(outPath, renderPage({ title, description, nav: navHtml(prefix, current), body, toc: toc ? buildTocHtml(body) : null, subnav }))
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
renderMarkdownPage('angularjs/README.md', 'public/angularjs/index.html', { title: 'llselect + AngularJS 1.x', description: ngPkg.description, prefix: '../', current: 'AngularJS', subnav: angularjsSubnavHtml('../', 'README') })

if (!existsSync('.build/api-md/@llselect/core.md')) {
  throw new Error('.build/api-md/ is missing: the build:site npm script runs typedoc first')
}
mkdirSync('public/api', { recursive: true })
for (const [md, out, title, toc] of API_PAGES) {
  if (md === 'README.md') { continue } // typedoc's index is a bare module list; composed below instead
  renderMarkdownPage(`.build/api-md/${md}`, `public/api/${out}`, {
    title, description: `API reference for ${pkg.name} - generated from the TypeScript declarations`, prefix: '../', current: 'API', links: makeApiLinkRewriter(posix.dirname(md).replace(/^\.$/, '')), toc,
  })
  // The categorization is total by design: an "Other" bucket means some public
  // export or member lost its @category (e.g. a helper inserted between a
  // docstring and its declaration). Fail the build instead of shipping it.
  if (/<h\d id="other(-\d+)?">Other<\/h\d>/.test(readFileSync(`public/api/${out}`, 'utf8'))) {
    throw new Error(`build:site: public/api/${out} has an "Other" category - a public export or member is missing its @category tag`)
  }
}
// The API landing page is site chrome, not typedoc output: it orients across
// the generated module pages AND the hand-written AngularJS reference.
writeFileSync('public/api/index.html', renderPage({
  title: 'llselect API reference',
  description: `API reference index for ${pkg.name} and @llselect/angularjs`,
  nav: navHtml('../', 'API'),
  toc: null,
  body: `<h1>API reference</h1>
<p>llselect v${pkg.version}. The core pages are generated from the TypeScript declarations (TSDoc) at build time, so they cannot drift from the source.</p>
<ul>
<li><a href="core.html"><code>@llselect/core</code></a> - the library itself: <code>LLSelectSingle</code> / <code>LLSelectMultiple</code>, every setting, the subclassing surface, and the SVG icon helpers.</li>
<li><a href="i18n.html"><code>@llselect/core/i18n</code></a> - the UI-translation pack contract and every shipped language pack.</li>
<li><a href="../angularjs/#attribute-reference"><code>@llselect/angularjs</code></a> - the AngularJS 1.x directives: hand-written attribute reference (markup is not a TypeScript surface).</li>
</ul>
`,
}))
console.log('build:site: OK (public/)')
