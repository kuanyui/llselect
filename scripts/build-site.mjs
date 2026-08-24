// Assemble the static Pages site into public/ (host-agnostic; GitLab CI
// publishes it as-is, the GitHub projects repo nests it under llselect/):
//   index.html  - landing page rendered from README.md
//   demo/       - copied as-is
//   dist/       - built library (run `npm run build` first)
//   angularjs/  - the directive sources the angularjs demo loads, plus
//                 index.html rendered from angularjs/README.md and api.html
//                 rendered from angularjs/API.md (hand-written reference)
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
import { ReflectionKind } from 'typedoc'
import ts from 'typescript'
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
// The tree-select subclass example is authored in TypeScript
// (demo/subclass/tree-select.ts); the page needs JS. One-file transpile via
// the TS compiler API - the type CHECK runs in `npm test`
// (tsconfig.test.json includes demo/subclass). The source imports
// '../../src/index.js' so the test build runs it against .build/src; the
// served copy runs against the built library, so that one specifier is
// rewritten.
{
  const treeTs = readFileSync('demo/subclass/tree-select.ts', 'utf8')
  const treeJs = ts.transpileModule(treeTs, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText.replace("'../../src/index.js'", "'../../dist/index.mjs'")
  writeFileSync('public/demo/subclass/tree-select.js', treeJs)
}
for (const f of ['llselect-angularjs.js', 'llselect-ui-select.js']) {
  copyFileSync(`angularjs/${f}`, `public/angularjs/${f}`)
}

// GitLab-style slugs for ASCII headings ("Form integration" -> form-integration).
// Duplicate headings dedupe GitHub-style (x, x-1, x-2) in document order - the
// convention typedoc-plugin-markdown's intra-page links assume. Reset per page.
const slugCounts = new Map()
const ALERT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/
// Title icons mirror GitHub's octicon pairing; mdi equivalents (MIT), same
// source as the other site icons: information-outline / lightbulb-outline /
// message-alert-outline / alert-outline / alert-octagon-outline.
const ALERT_ICONS = {
  NOTE: 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z',
  TIP: 'M12,2A7,7 0 0,1 19,9C19,11.38 17.81,13.47 16,14.74V17A1,1 0 0,1 15,18H9A1,1 0 0,1 8,17V14.74C6.19,13.47 5,11.38 5,9A7,7 0 0,1 12,2M9,21V20H15V21A1,1 0 0,1 14,22H10A1,1 0 0,1 9,21M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z',
  IMPORTANT: 'M13,10H11V6H13V10M13,12H11V14H13V12M22,4V16A2,2 0 0,1 20,18H6L2,22V4A2,2 0 0,1 4,2H20A2,2 0 0,1 22,4M20,4H4V17.2L5.2,16H20V4Z',
  WARNING: 'M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16',
  CAUTION: 'M8.27,3L3,8.27V15.73L8.27,21H15.73C17.5,19.24 21,15.73 21,15.73V8.27L15.73,3M9.1,5H14.9L19,9.1V14.9L14.9,19H9.1L5,14.9V9.1M11,15H13V17H11V15M11,7H13V13H11V7',
}
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
      const icon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${ALERT_ICONS[m[1]]}"/></svg>`
      return `<div class="md-alert md-alert-${m[1].toLowerCase()}">\n<p class="md-alert-title">${icon}${label}</p>\n${inner}</div>\n`
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
    if (repoPath === 'angularjs/API.md') { return `href="${mdDir ? './' : 'angularjs/'}api.html${hash}"` }
    if (/^(demo|dist)\//.test(repoPath) || /^angularjs\/llselect-.+\.js$/.test(repoPath)) { return `href="${target}"` }
    return `href="${REPO_BLOB}${repoPath}${hash}"`
  })
}

// Kind badges for the API pages. The custom @group/@category grouping
// replaced typedoc's kind-based buckets (Methods / Properties / ...), so the
// rendered markdown no longer shows what a symbol IS. The typedoc JSON model
// (.build/api.json, emitted alongside the markdown) still knows: build a
// name -> kind-label map per module and stamp `data-kind` onto each matching
// heading; CSS draws the letter chip. A name mapping to two different labels
// fails the build - badges must never guess.
const KIND_LABELS = new Map([
  [ReflectionKind.Class, 'class'],
  [ReflectionKind.Interface, 'interface'],
  [ReflectionKind.TypeAlias, 'type'],
  [ReflectionKind.Function, 'function'],
  [ReflectionKind.Method, 'method'],
  [ReflectionKind.Property, 'property'],
  [ReflectionKind.Accessor, 'accessor'],
  [ReflectionKind.Variable, 'const'], // every exported binding here is a const
  [ReflectionKind.Enum, 'enum'],
  [ReflectionKind.EnumMember, 'enum-member'],
])
function collectKinds(moduleReflection) {
  const byName = new Map()
  const walk = (r) => {
    const label = KIND_LABELS.get(r.kind)
    if (label) {
      const prev = byName.get(r.name)
      if (prev !== undefined && prev !== label) {
        throw new Error(`build:site: symbol name '${r.name}' is both '${prev}' and '${label}' - kind badges need real disambiguation now`)
      }
      byName.set(r.name, label)
    }
    for (const c of r.children ?? []) { walk(c) }
  }
  for (const c of moduleReflection.children ?? []) { walk(c) }
  return byName
}
// Heading text -> symbol name: strip tags/entities, drop a trailing call
// signature `()`, and retry once without a leading modifier word (the
// `abstract` / `readonly` etc. code chips typedoc puts before the name).
const HEADING_MODIFIERS = new Set(['abstract', 'readonly', 'static', 'protected', 'optional', 'const', 'get', 'set'])
function resolveHeadingKey(innerHtml, kinds) {
  let text = innerHtml.replace(/<[^>]+>/g, '').replace(/&[a-z0-9#]+;/gi, '').trim()
  if (text.endsWith('()')) { text = text.slice(0, -2) }
  if (kinds.has(text)) { return text }
  const space = text.indexOf(' ')
  if (space !== -1 && HEADING_MODIFIERS.has(text.slice(0, space))) {
    const rest = text.slice(space + 1)
    if (kinds.has(rest)) { return rest }
  }
  return null
}
function injectKindBadges(body, kinds, { strictUnused = false } = {}) {
  const matched = new Set()
  const out = body.replace(/<h([2-6]) id="([^"]+)">(.*?)<\/h\1>/g, (whole, depth, id, inner) => {
    const key = resolveHeadingKey(inner, kinds)
    if (key === null) { return whole }
    matched.add(key)
    const label = kinds.get(key)
    return `<h${depth} id="${id}" data-kind="${label}" title="${label}">${inner}</h${depth}>`
  })
  // A hand-written map drifts silently on renames; make the drift loud.
  if (strictUnused) {
    const unused = [...kinds.keys()].filter((k) => !matched.has(k))
    if (unused.length > 0) {
      throw new Error(`build:site: kind-map entries matched no heading (stale after a rename?): ${unused.join(', ')}`)
    }
  }
  return out
}

// The AngularJS attribute entries open with their binding mode in bold
// (**Expression** / **Literal** / ...), so the raw markdown carries it on
// GitHub / GitLab / npm too; lift that token onto the heading as data-binding
// for the right-edge pill. Closed vocabulary plus a guard: an attribute
// entry without a leading token fails the build - the binding mode is the
// one thing the old reference table guaranteed per attribute.
const BINDING_TOKENS = new Set(['expression', 'expression, watched', 'literal', 'flag', 'ng-options grammar'])
function injectBindingBadges(body) {
  return body.replace(/(<h([2-6]) id="([^"]+)" data-kind="attribute"[^>]*>.*?<\/h\2>\n)(<p><strong>([^<]*)<\/strong>)?/g, (_whole, heading, _depth, id, pOpen, token) => {
    const norm = (token ?? '').toLowerCase()
    if (!pOpen || !BINDING_TOKENS.has(norm)) {
      throw new Error(`build:site: attribute entry '${id}' must open with a bold binding token (${[...BINDING_TOKENS].join(' / ')})`)
    }
    return heading.replace(' data-kind="attribute"', ` data-kind="attribute" data-binding="${norm}"`) + pOpen
  })
}
// Reverse guard: an entry that OPENS with a binding token but carries no
// attribute kind means the hand-written kind map missed it (new attribute
// never added, or renamed away). Silent = an unmarked entry on the page.
function assertNoUnclassifiedAttributes(body) {
  const stray = [...body.matchAll(/<h([2-6]) id="([^"]+)"(?![^>]*data-kind)[^>]*>.*?<\/h\1>\n<p><strong>([^<]*)<\/strong>/g)]
    .filter((m) => BINDING_TOKENS.has(m[3].toLowerCase()))
  if (stray.length > 0) {
    throw new Error(`build:site: entries open with a binding token but are missing from the kind map: ${stray.map((m) => m[2]).join(', ')}`)
  }
  return body
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
  for (const m of body.matchAll(/<h([2-6]) id="([^"]+)"([^>]*)>(.*?)<\/h\1>/g)) {
    const kind = (m[3].match(/data-kind="([^"]+)"/) ?? [])[1] ?? null
    const h = { depth: Number(m[1]), id: m[2], kind, text: m[4].replace(/<[^>]+>/g, ''), children: [] }
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
  const ids = new Set()
  const kindsUsed = new Set()
  const collect = (node) => {
    ids.add(node.id)
    if (node.kind) { kindsUsed.add(node.kind) }
    node.children.forEach(collect)
  }
  root.children.forEach(collect)
  const render = (node, isSection) => {
    const kindAttrs = node.kind ? ` data-kind="${node.kind}" title="${node.kind}"` : ''
    const link = `<a href="#${node.id}"${kindAttrs}>${node.text}</a>`
    if (node.children.length === 0) { return `<li>${link}</li>` }
    const inner = `<ul>${node.children.map((c) => render(c, false)).join('')}</ul>`
    // top-level sections stay expanded labels; every deeper parent collapses
    if (isSection) { return `<li class="toc-section">${link}${inner}</li>` }
    return `<li><details><summary>${CHEVRON}${link}</summary>${inner}</details></li>`
  }
  // Legend lists only the kinds this page actually uses, in a fixed order.
  const KIND_ORDER = ['directive', 'attribute', 'class', 'interface', 'type', 'function', 'method', 'property', 'accessor', 'const', 'enum', 'enum-member']
  const legend = kindsUsed.size === 0 ? '' : `\n<div class="toc-legend">${KIND_ORDER.filter((k) => kindsUsed.has(k)).map((k) => `<span data-kind="${k}">${k}</span>`).join('')}</div>`
  const html = `<aside class="toc" id="toc" tabindex="-1" aria-label="Table of contents">
<div class="toc-bar">
<input type="search" placeholder="Filter" aria-label="Filter the table of contents">
<button type="button" class="toc-fold">${FOLD_ICON}Fold all</button>${legend}
</div>
<div class="toc-scroll">
<ul class="toc-tree">${root.children.map((c) => render(c, true)).join('\n')}</ul>
</div>
</aside>`
  return { html, ids }
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
    ['API', `${prefix}angularjs/api.html`],
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
:root { color-scheme: light dark; --fg: #1a1a1a; --fg-muted: #656565; --bg: #ffffff; --muted: #f4f4f4; --line: #d0d0d0; --link: #0550ae; --nav-link: #2456a6; --nav-hover: #eef3fb; --mark: #ffe066; }
@media (prefers-color-scheme: dark) { :root { --fg: #d8d8d8; --fg-muted: #9a9a9a; --bg: #1b1b1b; --muted: #262626; --line: #444444; --link: #6cb2ff; --nav-link: #7fb1f5; --nav-hover: #263344; --mark: rgba(187, 128, 9, 0.45); } }
/* overflow-wrap lets long identifiers (LLSelectMultipleSettings.createTriggerContentElFn,
   in prose / links / bold / inline code) break instead of widening the page body - a
   body horizontal overflow throws off the visual viewport on real phones and trims the
   fixed TOC drawer. Code blocks keep their format (white-space:pre) and scroll via pre;
   wide tables scroll inside themselves (see the table rule). */
body { margin: 0 auto; padding: 0 1rem 4rem; max-width: 52rem; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); overflow-wrap: break-word; }
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
/* Scroll-following block highlight: the section owning the scrollspy's
   current heading. Constant padding (class-independent) so toggling the
   class never shifts layout mid-scroll. */
main section { padding: 0 0.6rem; margin: 0 -0.6rem; border-radius: 4px; transition: background-color 0.15s; }
main section.current-block { background: var(--nav-hover); box-shadow: inset 3px 0 0 var(--nav-link); }
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
/* Wide tables scroll inside themselves (display:block makes overflow-x work on
   a table) so they never widen the page body - a body horizontal overflow
   throws off the visual viewport on real phones, trimming the fixed TOC drawer. */
table { border-collapse: collapse; display: block; overflow-x: auto; max-width: 100%; }
th, td { border: 1px solid var(--line); padding: 0.3em 0.6em; }
/* Two-column shell for pages with a sidebar outline */
body.with-toc { max-width: 78rem; }
.layout { display: grid; grid-template-columns: 17rem minmax(0, 52rem); gap: 2.5rem; align-items: start; }
/* Sidebar shell: a pinned toolbar (filter / fold / legend) over the ONLY
   scroller (.toc-scroll). border-box, so the JS-fitted max-height is the
   real outer height (content-box padding overflowed the viewport before). */
.toc { position: sticky; top: 0; max-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; padding: 1rem 0.5rem 0 0; font-size: 0.82em; line-height: 1.45; }
.toc-bar { flex: none; }
.toc-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 2rem; }
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
/* Kind badges (API pages), stamped as data-kind. One color per kind (fixed,
   white text - fine in both schemes); the sidebar draws compact letter
   chips, the content side an unabbreviated pill at the heading's right
   edge. directive / attribute (the AngularJS page) reuse the class / type
   colors by analogy - the typedoc kinds never share a page with them. */
[data-kind="directive"] { --kind-color: #1f883d; }
[data-kind="attribute"] { --kind-color: #0969da; }
[data-kind="class"] { --kind-color: #1f883d; }
[data-kind="interface"] { --kind-color: #0f766e; }
[data-kind="type"] { --kind-color: #0969da; }
[data-kind="function"] { --kind-color: #bc4c00; }
[data-kind="method"] { --kind-color: #6639ba; }
[data-kind="property"] { --kind-color: #57606a; }
[data-kind="accessor"] { --kind-color: #bf3989; }
[data-kind="const"] { --kind-color: #9a6700; }
[data-kind="enum"] { --kind-color: #bf3989; }
[data-kind="enum-member"] { --kind-color: #57606a; }
.toc [data-kind]::before { display: inline-flex; align-items: center; justify-content: center; width: 1.2em; height: 1.2em; margin-right: 0.4em; border-radius: 3px; font-size: 0.7em; font-weight: 700; font-style: normal; color: #fff; vertical-align: 0.15em; font-family: system-ui, sans-serif; background: var(--kind-color); }
.toc [data-kind="directive"]::before { content: "D"; }
.toc [data-kind="attribute"]::before { content: "A"; }
.toc [data-kind="class"]::before { content: "C"; }
.toc [data-kind="interface"]::before { content: "I"; }
.toc [data-kind="type"]::before { content: "T"; }
.toc [data-kind="function"]::before { content: "F"; }
.toc [data-kind="method"]::before { content: "M"; }
.toc [data-kind="property"]::before { content: "P"; }
.toc [data-kind="accessor"]::before { content: "A"; }
.toc [data-kind="const"]::before { content: "V"; }
.toc [data-kind="enum"]::before { content: "E"; }
.toc [data-kind="enum-member"]::before { content: "E"; }
/* content side: the full kind word, floated to the heading's right edge */
main [data-kind]::after { content: attr(data-kind); float: right; margin-left: 0.6em; margin-top: 0.15em; padding: 0.1em 0.6em; border-radius: 999px; font-size: 0.72rem; font-weight: 600; font-style: normal; line-height: 1.6; color: #fff; background: var(--kind-color); font-family: system-ui, sans-serif; }
/* AngularJS attribute entries: the binding mode as a second, outline pill.
   ::before floats first, so it takes the far-right spot; the kind pill sits
   left of it. */
main [data-binding]::before { content: attr(data-binding); float: right; margin-left: 0.6em; margin-top: 0.15em; padding: 0.1em 0.6em; border-radius: 999px; font-size: 0.72rem; font-weight: 600; font-style: normal; line-height: 1.6; color: var(--fg-muted); border: 1px solid var(--line); font-family: system-ui, sans-serif; }
.toc-legend { display: flex; flex-wrap: wrap; gap: 0.2rem 0.7rem; margin-bottom: 0.6rem; font-size: 0.78em; color: var(--fg-muted); }
.toc-legend span { display: inline-flex; align-items: center; }
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
/* filter-match highlight; --mark swaps for the dark scheme */
.toc mark { padding: 0; border-radius: 2px; background: var(--mark); color: inherit; }
/* Narrow screens: the sidebar becomes a left off-canvas drawer behind a
   fixed "Sections" button (button + backdrop injected by the toc script). */
.toc-toggle { display: none; }
.toc-backdrop { display: none; }
@media (max-width: 62rem) {
  body.with-toc { max-width: 52rem; }
  .layout { display: block; }
  .toc { position: fixed; top: 0; bottom: 0; left: 0; z-index: 3000; width: min(19rem, 85vw); max-height: none; margin: 0; padding: 1rem 1rem 0; background: var(--bg); border-right: 1px solid var(--line); box-shadow: 0 0 24px rgba(0, 0, 0, 0.35); transform: translateX(-100%); visibility: hidden; transition: transform 0.2s ease, visibility 0.2s; }
  body.toc-open .toc { transform: none; visibility: visible; }
  body.toc-open { overflow: hidden; } /* page stays put while the drawer scrolls */
  .toc-toggle { display: flex; align-items: center; gap: 0.4rem; position: fixed; left: 1rem; bottom: 1rem; z-index: 1500; padding: 0.45rem 0.9rem; font: inherit; font-weight: 600; color: var(--nav-link); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
  .toc-toggle svg { width: 1.1em; height: 1.1em; }
  .toc-backdrop { display: block; position: fixed; inset: 0; z-index: 2900; background: rgba(0, 0, 0, 0.4); }
  .toc-backdrop[hidden] { display: none; }
}
@media (prefers-reduced-motion: reduce) { .toc { transition: none; } }
.md-alert { margin: 1rem 0; padding: 0.1rem 1rem; border-left: 0.25rem solid var(--alert, var(--line)); }
.md-alert-title { display: flex; align-items: center; gap: 0.4em; font-weight: 600; color: var(--alert); }
.md-alert-title svg { width: 1.125em; height: 1.125em; flex: none; }
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
.back-to-top { position: fixed; right: 1rem; bottom: 1rem; z-index: 10; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.45rem 0.9rem; font: inherit; font-weight: 600; color: var(--nav-link); background: var(--bg); border: 1px solid var(--line); border-radius: 999px; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
.back-to-top:hover { background: var(--nav-hover); }
.back-to-top svg { width: 1em; height: 1em; }
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
<button class="back-to-top" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z"/></svg>Top</button>
<script>
// Back-to-top: appears after one viewport of scroll.
{
  const topBtn = document.querySelector('.back-to-top')
  const syncTopBtn = () => { topBtn.hidden = window.scrollY < window.innerHeight }
  window.addEventListener('scroll', syncTopBtn, { passive: true })
  syncTopBtn()
  // Instant jump on purpose: a smooth scroll over these page lengths runs
  // for seconds and any user input cancels it midway - reads as a stuck
  // button.
  topBtn.addEventListener('click', () => { window.scrollTo(0, 0) })
}
</script>
${toc ? `<script>
// Sidebar outline: scroll tracking + text filter + narrow-screen drawer. No
// dependencies.
{
  const toc = document.querySelector('.toc')
  const drawerMq = window.matchMedia('(max-width: 62rem)')
  const isOpen = () => document.body.classList.contains('toc-open')
  const links = new Map()
  const linkTexts = new Map() // toc link -> plain text (filter re-renders with <mark>s)
  for (const a of toc.querySelectorAll('a')) {
    links.set(decodeURIComponent(a.hash.slice(1)), a)
    linkTexts.set(a, a.textContent)
  }
  const heads = [...document.querySelectorAll('main h2[id], main h3[id], main h4[id], main h5[id], main h6[id]')].filter((h) => links.has(h.id))
  const openChain = (link) => {
    for (let d = link.closest('details'); d; d = d.parentElement.closest('details')) { d.open = true }
  }
  let activeLink = null
  let blockEl = null
  const sync = () => {
    // Fit the sticky sidebar to the VISIBLE viewport: while the nav is still
    // in view the aside starts below the viewport top, so a plain 100vh box
    // overflows the bottom and its last rows are unreachable. Re-measured
    // every scroll/resize tick; drawer mode owns its own geometry.
    if (!drawerMq.matches) {
      toc.style.maxHeight = String(Math.max(0, window.innerHeight - Math.max(0, toc.getBoundingClientRect().top))) + 'px'
    }
    const y = window.scrollY + 100
    let cur = null
    for (const h of heads) { if (h.offsetTop <= y) { cur = h } else { break } }
    const link = cur ? links.get(cur.id) : null
    if (link === activeLink) { return }
    if (activeLink) { activeLink.classList.remove('active') }
    activeLink = link
    // Mirror the sidebar highlight on the content side: paint the section
    // that owns the current heading.
    if (blockEl) { blockEl.classList.remove('current-block') }
    blockEl = cur && cur.parentElement.tagName === 'SECTION' ? cur.parentElement : null
    if (blockEl) { blockEl.classList.add('current-block') }
    if (link) {
      link.classList.add('active')
      openChain(link)
      // Keep the highlight visible inside the sidebar's own overflow - but
      // NEVER while the user is browsing the sidebar (pointer over it or
      // focus inside it): the page keeps moving under momentum / keyboard
      // input, and re-scrolling to the active row on every change yanks the
      // sidebar away from where the user scrolled it. Skip while the drawer
      // sits closed off-screen too.
      const userBrowsingToc = toc.matches(':hover') || toc.matches(':focus-within')
      if ((!drawerMq.matches || isOpen()) && !userBrowsingToc) { link.scrollIntoView({ block: 'nearest' }) }
    }
  }
  window.addEventListener('scroll', () => { window.requestAnimationFrame(sync) }, { passive: true })
  window.addEventListener('resize', () => { window.requestAnimationFrame(sync) }, { passive: true })
  sync()
  // A symbol link inside a <summary> should always OPEN its branch, never
  // collapse it back while jumping to the section.
  toc.addEventListener('click', (ev) => {
    const a = ev.target.closest('summary a')
    if (a) { const d = a.closest('details'); window.requestAnimationFrame(() => { d.open = true }) }
  })
  // Ancestors stay visible around a match (a parent li's textContent includes
  // its subtree), so the match itself is wrapped in <mark>s to show WHY a row
  // survived the filter.
  const renderLinkText = (a, q) => {
    const text = linkTexts.get(a)
    if (q === '') {
      a.textContent = text
      return
    }
    const lower = text.toLowerCase()
    a.replaceChildren()
    let from = 0
    for (let hit = lower.indexOf(q); hit !== -1; hit = lower.indexOf(q, hit + q.length)) {
      a.append(text.slice(from, hit))
      const mark = document.createElement('mark')
      mark.textContent = text.slice(hit, hit + q.length)
      a.append(mark)
      from = hit + q.length
    }
    a.append(text.slice(from))
  }
  const filter = toc.querySelector('input')
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase()
    for (const li of toc.querySelectorAll('li')) {
      li.hidden = q !== '' && !li.textContent.toLowerCase().includes(q)
    }
    for (const a of linkTexts.keys()) { renderLinkText(a, q) }
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
    for (const a of linkTexts.keys()) { renderLinkText(a, '') }
    for (const d of toc.querySelectorAll('details')) { d.open = false }
  })
  // Narrow screens: off-canvas drawer chrome. Injected here so a no-JS page
  // never shows a dead button.
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'toc-toggle'
  toggle.setAttribute('aria-controls', 'toc')
  toggle.setAttribute('aria-expanded', 'false')
  // mdi table-of-contents (MIT), same source as the other site icons
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3,9H17V7H3V9M3,13H17V11H3V13M3,17H17V15H3V17M19,17H21V15H19V17M19,7V9H21V7H19M19,13H21V11H19V13Z"/></svg>Sections'
  const backdrop = document.createElement('div')
  backdrop.className = 'toc-backdrop'
  backdrop.hidden = true
  document.body.append(toggle, backdrop)
  const openDrawer = () => {
    document.body.classList.add('toc-open')
    backdrop.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
    if (activeLink) {
      openChain(activeLink)
      activeLink.scrollIntoView({ block: 'nearest' })
    }
    toc.focus({ preventScroll: true })
  }
  const closeDrawer = (refocusToggle) => {
    document.body.classList.remove('toc-open')
    backdrop.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
    if (refocusToggle) { toggle.focus() }
  }
  toggle.addEventListener('click', () => { if (isOpen()) { closeDrawer(true) } else { openDrawer() } })
  backdrop.addEventListener('click', () => { closeDrawer(false) })
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isOpen()) { closeDrawer(true) }
  })
  toc.addEventListener('click', (ev) => {
    if (ev.target.closest('a') && drawerMq.matches) { closeDrawer(false) }
  })
  // Widening past the breakpoint while open would leave body scroll locked.
  // Entering the drawer also drops the desktop inline max-height (the drawer
  // is CSS-sized); leaving it, the next sync() re-applies the fit.
  drawerMq.addEventListener('change', () => {
    closeDrawer(false)
    toc.style.maxHeight = ''
  })
}
</script>` : ''}
</body>
</html>
`
}

// Wrap content in <section>s so the scrollspy can paint the current block as
// ONE continuous box (per-element classes would stripe across the margins
// between elements). A section starts ONLY at a TOC-entry heading and runs to
// the next one, so a member's block includes its structural sub-parts
// (Parameters / Returns / Example / Inherited from) - those never become the
// scrollspy target themselves.
function wrapSections(body, tocIds) {
  const chunks = body.split(/(?=<h[1-6] )/)
  let out = ''
  let open = false
  for (const chunk of chunks) {
    const m = chunk.match(/^<h[1-6] id="([^"]+)"/)
    if (m && tocIds.has(m[1])) {
      if (open) { out += '</section>\n' }
      out += '<section>\n' + chunk
      open = true
    } else {
      out += chunk
    }
  }
  if (open) { out += '</section>\n' }
  return out
}

function renderMarkdownPage(mdPath, outPath, { title, description, prefix, current, links, toc = false, subnav = null, kinds = null, kindsStrict = false }) {
  slugCounts.clear()
  let body = marked.parse(readFileSync(mdPath, 'utf8'))
  body = links ? links(body) : rewriteLinks(body, posix.dirname(mdPath).replace(/^\.$/, ''))
  if (kinds !== null) { body = assertNoUnclassifiedAttributes(injectBindingBadges(injectKindBadges(body, kinds, { strictUnused: kindsStrict }))) }
  let tocHtml = null
  if (toc) {
    const built = buildTocHtml(body)
    tocHtml = built.html
    body = wrapSections(body, built.ids)
  }
  writeFileSync(outPath, renderPage({ title, description, nav: navHtml(prefix, current), body, toc: tocHtml, subnav }))
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
// The AngularJS reference is hand-written (markup is not a TypeScript
// surface), so its badge map is hand-written too: keys are heading texts in
// angularjs/API.md. Drift is LOUD in both directions: a map key matching no
// heading throws (kindsStrict), and an entry opening with a binding token
// but missing from this map throws (assertNoUnclassifiedAttributes).
const NG_KINDS = new Map(Object.entries({
  'llselect-single': 'directive', 'llselect-multiple': 'directive', 'ui-llselect': 'directive',
  'ng-model': 'attribute', 'ng-change': 'attribute', 'll-options': 'attribute', name: 'attribute', required: 'attribute',
  'll-disabled': 'attribute', 'll-placeholder': 'attribute', 'll-filterable': 'attribute', 'll-filter-fn': 'attribute',
  'll-clearable': 'attribute', 'll-popup-width-policy': 'attribute', 'll-arrow': 'attribute', 'll-highlight': 'attribute',
  'll-item-content-fn': 'attribute', 'll-trigger-content-fn': 'attribute',
  'll-tag-content-fn': 'attribute', 'll-tag-remove-button-content-fn': 'attribute',
  'll-aria-label': 'attribute', 'll-aria-labelledby': 'attribute', 'll-label-el': 'attribute',
  'll-trigger-display': 'attribute',
  'll-choose-all-row': 'attribute', 'll-hide-chosen-rows': 'attribute', 'll-checkboxes': 'attribute', 'll-item-text': 'attribute',
  defaults: 'method', instance: 'method',
  arrow: 'property', filterable: 'property', highlight: 'property', popupWidthPolicy: 'property', uiTranslationPack: 'property',
}))
renderMarkdownPage('angularjs/API.md', 'public/angularjs/api.html', { title: '@llselect/angularjs API', description: 'Attribute reference for the @llselect/angularjs AngularJS 1.x directives', prefix: '../', current: 'AngularJS', subnav: angularjsSubnavHtml('../', 'API'), toc: true, kinds: NG_KINDS, kindsStrict: true })

if (!existsSync('.build/api-md/@llselect/core.md')) {
  throw new Error('.build/api-md/ is missing: the build:site npm script runs typedoc first')
}
if (!existsSync('.build/api.json')) {
  throw new Error('.build/api.json is missing: typedoc emits it (typedoc.json "json") in the same run as the markdown')
}
const apiModel = JSON.parse(readFileSync('.build/api.json', 'utf8'))
const kindsByModule = new Map((apiModel.children ?? []).map((mod) => [mod.name, collectKinds(mod)]))
mkdirSync('public/api', { recursive: true })
for (const [md, out, title, toc] of API_PAGES) {
  if (md === 'README.md') { continue } // typedoc's index is a bare module list; composed below instead
  const kinds = kindsByModule.get(md.replace(/\.md$/, '')) ?? null
  if (toc && kinds === null) {
    throw new Error(`build:site: no typedoc module matches ${md} for kind badges (modules: ${[...kindsByModule.keys()].join(', ')})`)
  }
  renderMarkdownPage(`.build/api-md/${md}`, `public/api/${out}`, {
    title, description: `API reference for ${pkg.name} - generated from the TypeScript declarations`, prefix: '../', current: 'API', links: makeApiLinkRewriter(posix.dirname(md).replace(/^\.$/, '')), toc, kinds,
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
<li><a href="../angularjs/api.html"><code>@llselect/angularjs</code></a> - the AngularJS 1.x directives: hand-written attribute reference (markup is not a TypeScript surface).</li>
</ul>
`,
}))
console.log('build:site: OK (public/)')
