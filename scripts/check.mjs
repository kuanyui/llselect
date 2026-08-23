#!/usr/bin/env node
// Mechanical style checks (CLAUDE.md s5). No dependencies beyond the repo's
// own devDependencies (typescript, for the AST rules); exits non-zero listing
// every violation.
//   1. ASCII punctuation - no smart quotes / dashes / ellipsis / CJK
//      punctuation outside the documented exceptions (i18n pack values,
//      unicode test fixtures, demo i18n data, external review inputs).
//      Test sources are scanned with string literals masked: fixture DATA may
//      be unicode, the surrounding code / comments must stay ASCII.
//   2. Markdown relative links must point at existing files; `#anchor`
//      fragments (same-file or into another checked .md) must match a real
//      heading slug; backticked repo paths must exist on disk.
//   3. if / else / while / for / do bodies must be wrapped in { }.
//   4. `any` needs an explaining comment on the same or previous line.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const problems = []

// --- collect files --------------------------------------------------------

function walk(rel, extension) {
  const dir = join(root, rel)
  if (!existsSync(dir)) { return [] }
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') { continue }
    const childRel = join(rel, e.name)
    if (e.isDirectory()) {
      out.push(...walk(childRel, extension))
    } else if (e.name.endsWith(extension)) {
      out.push(childRel)
    }
  }
  return out
}

// Exceptions (CLAUDE.md s5): i18n pack values, draft.ts (abandoned), test
// fixtures (unicode-behavior data; handled by string masking, not exclusion),
// demo (i18n / RTL data).
const srcTs = walk('src', '.ts').filter((f) => !f.endsWith('draft.ts'))
const testTs = walk('test', '.ts')
const scriptFiles = walk('scripts', '.mjs')
// Plain-JS surfaces carry the brace rule too (CLAUDE.md: the angularjs
// directory keeps the ASCII / brace / comment rules; demo JS is real code).
const demoTs = walk('demo', '.ts')
const demoJs = walk('demo', '.js')
const angularjsJs = walk('angularjs', '.js').filter((f) => !f.endsWith('.min.js') && !f.includes('/test/') && !f.includes('\\test\\'))
const angularjsTestMjs = walk('angularjs/test', '.mjs')
const testUtilsTs = walk('test-utils', '.ts')
const rootConfigMjs = ['rollup.config.mjs']

const asciiFiles = [
  ...srcTs.filter((f) => !f.startsWith('src/i18n/')),
  ...walk('src', '.css'),
  ...walk('docs', '.md'),
  ...walk('angularjs', '.md'),
  ...scriptFiles,
  ...demoTs,
  ...angularjsJs,
  ...testUtilsTs,
  ...rootConfigMjs,
  'README.md',
  'CLAUDE.md',
  'package.json',
]

const markdownFiles = [
  ...walk('docs', '.md'),
  ...walk('angularjs', '.md'),
  'README.md',
  'CLAUDE.md',
]

// --- shared AST pass (rules 3 / 4, and string masking for rule 1) ---------

// Typographic / CJK punctuation that must not appear (the ASCII rule).
// Deliberately NOT flagged: currency / math / (c) symbols and non-punctuation
// unicode - the rule is about punctuation drift, and real violations of the
// English-only rule need human review anyway.
const BAD_PUNCTUATION = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A0\u3000\u3001\u3002\uFF08\uFF09\uFF0C\uFF1A\uFF1B\uFF01\uFF1F]/

function scanPunctuation(rel, lines) {
  lines.forEach((line, i) => {
    const m = line.match(BAD_PUNCTUATION)
    if (m) {
      problems.push(`${rel}:${i + 1}: non-ASCII punctuation U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in: ${line.trim().slice(0, 80)}`)
    }
  })
}

const HAS_COMMENT = /\/[/*]/

function checkAst(rel, text, { maskedLinesOut = null } = {}) {
  const kind = rel.endsWith('.mjs') ? ts.ScriptKind.JS : ts.ScriptKind.TS
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind)
  const lines = text.split('\n')
  const stringRanges = []
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line
  const flag = (node, msg) => { problems.push(`${rel}:${lineOf(node) + 1}: ${msg}`) }

  function visit(node) {
    if (ts.isIfStatement(node)) {
      if (!ts.isBlock(node.thenStatement)) { flag(node.thenStatement, 'if body not wrapped in { }') }
      // `else if` chains are fine; anything else must be a block
      if (node.elseStatement && !ts.isBlock(node.elseStatement) && !ts.isIfStatement(node.elseStatement)) {
        flag(node.elseStatement, 'else body not wrapped in { }')
      }
    } else if (ts.isWhileStatement(node) || ts.isDoStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      if (!ts.isBlock(node.statement)) { flag(node.statement, 'loop body not wrapped in { }') }
    }
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const line = lineOf(node)
      if (!HAS_COMMENT.test(lines[line] ?? '') && !HAS_COMMENT.test(lines[line - 1] ?? '')) {
        flag(node, '`any` without an explaining comment on the same or previous line')
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      stringRanges.push([node.getStart(sf), node.getEnd()])
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  if (maskedLinesOut) {
    const chars = [...text]
    for (const [start, end] of stringRanges) {
      for (let i = start; i < end; i++) {
        if (chars[i] !== '\n') { chars[i] = 'x' }
      }
    }
    maskedLinesOut.push(...chars.join('').split('\n'))
  }
}

// --- rule 1: ASCII punctuation --------------------------------------------

for (const rel of asciiFiles) {
  scanPunctuation(rel, readFileSync(join(root, rel), 'utf8').split('\n'))
}

// --- rules 3 / 4 on TS + script sources; rule 1 on masked test sources ----

for (const rel of [...srcTs, ...scriptFiles, ...demoTs, ...demoJs, ...angularjsJs, ...testUtilsTs, ...rootConfigMjs]) {
  checkAst(rel, readFileSync(join(root, rel), 'utf8'))
}
for (const rel of [...testTs, ...angularjsTestMjs]) {
  const masked = []
  checkAst(rel, readFileSync(join(root, rel), 'utf8'), { maskedLinesOut: masked })
  scanPunctuation(rel, masked)
}

// --- rule 2: markdown relative links exist --------------------------------

const LINK = /\]\(([^)\s]+)\)/g

// Heading slugs per markdown file (GitLab-style, deduped GitHub-style) - the
// same scheme scripts/build-site.mjs and demo/toc.js mint, so a `#anchor`
// that passes here resolves on the rendered site too. Fenced code blocks are
// skipped so `# comment` lines in examples do not register as headings.
const slugCache = new Map()
function headingSlugs(relMd) {
  if (slugCache.has(relMd)) { return slugCache.get(relMd) }
  const ids = new Set()
  const counts = new Map()
  let inFence = false
  for (const line of readFileSync(join(root, relMd), 'utf8').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue }
    if (inFence) { continue }
    // Blockquoted headings (`> #### ...`) also mint anchors on GitLab/GitHub.
    const m = /^(?:>\s*)?#{1,6}\s+(.+)$/.exec(line)
    if (!m) { continue }
    let id = m[1].trim().replace(/`/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const n = counts.get(id) ?? 0
    counts.set(id, n + 1)
    if (n > 0) { id = `${id}-${n}` }
    ids.add(id)
  }
  slugCache.set(relMd, ids)
  return ids
}

for (const rel of markdownFiles) {
  const text = readFileSync(join(root, rel), 'utf8')
  for (const m of text.matchAll(LINK)) {
    const target = m[1]
    const line = () => text.slice(0, m.index).split('\n').length
    if (/^(https?:|mailto:)/.test(target)) { continue }
    if (target.startsWith('#')) {
      if (!headingSlugs(rel).has(target.slice(1))) {
        problems.push(`${rel}:${line()}: dead same-file anchor: ${target}`)
      }
      continue
    }
    const [file, fragment] = target.split('#')
    const path = resolve(root, dirname(rel), file)
    if (!existsSync(path)) {
      problems.push(`${rel}:${line()}: broken relative link: ${target}`)
      continue
    }
    if (fragment !== undefined && file.endsWith('.md')) {
      const targetRel = join(dirname(rel), file)
      if (!headingSlugs(targetRel).has(fragment)) {
        problems.push(`${rel}:${line()}: dead anchor into ${file}: #${fragment}`)
      }
    }
  }
}

// --- rule 2b: backticked repo paths exist ---------------------------------
// Only paths rooted in a checked-in top-level directory count - hypothetical
// example paths never start with one, and build outputs (dist/, public/,
// .build/) are legitimately absent on a fresh clone. docs/llm/archive/ is
// exempt: an archive records history, and history references past paths.
const PATHY = /`((?:src|test|test-utils|docs|angularjs|demo|scripts)\/[A-Za-z0-9_@./-]+\.(?:ts|mjs|cjs|js|css|md|json|html))`/g

for (const rel of markdownFiles) {
  if (rel.includes('docs/llm/archive/') || rel.includes('docs\\llm\\archive\\')) { continue }
  const text = readFileSync(join(root, rel), 'utf8')
  for (const m of text.matchAll(PATHY)) {
    if (!existsSync(join(root, m[1]))) {
      const line = text.slice(0, m.index).split('\n').length
      problems.push(`${rel}:${line}: backticked path does not exist: ${m[1]}`)
    }
  }
}

// --- report ----------------------------------------------------------------

if (problems.length > 0) {
  console.error(`check: ${problems.length} problem(s)\n` + problems.join('\n'))
  process.exit(1)
}
console.log(`check: OK (${asciiFiles.length + testTs.length + angularjsTestMjs.length} files punctuation-scanned, ${markdownFiles.length} markdown link-checked, ${srcTs.length + scriptFiles.length + demoTs.length + demoJs.length + angularjsJs.length + testUtilsTs.length + rootConfigMjs.length + testTs.length + angularjsTestMjs.length} AST-checked)`)
