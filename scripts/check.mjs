#!/usr/bin/env node
// Mechanical style checks (CLAUDE.md s5). No dependencies beyond the repo's
// own devDependencies (typescript, for the AST rules); exits non-zero listing
// every violation.
//   1. ASCII punctuation - no smart quotes / dashes / ellipsis / CJK
//      punctuation outside the documented exceptions (i18n pack values,
//      unicode test fixtures, demo i18n data, external review inputs).
//      Test sources are scanned with string literals masked: fixture DATA may
//      be unicode, the surrounding code / comments must stay ASCII.
//   2. Markdown relative links must point at existing files.
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

const asciiFiles = [
  ...srcTs.filter((f) => !f.startsWith('src/i18n/')),
  ...walk('src', '.css'),
  ...walk('docs', '.md'),
  ...scriptFiles,
  'README.md',
  'CLAUDE.md',
  'package.json',
]

const markdownFiles = [
  ...walk('docs', '.md'),
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

for (const rel of [...srcTs, ...scriptFiles]) {
  checkAst(rel, readFileSync(join(root, rel), 'utf8'))
}
for (const rel of testTs) {
  const masked = []
  checkAst(rel, readFileSync(join(root, rel), 'utf8'), { maskedLinesOut: masked })
  scanPunctuation(rel, masked)
}

// --- rule 2: markdown relative links exist --------------------------------

const LINK = /\]\(([^)\s]+)\)/g

for (const rel of markdownFiles) {
  const text = readFileSync(join(root, rel), 'utf8')
  for (const m of text.matchAll(LINK)) {
    const target = m[1]
    if (/^(https?:|mailto:|#)/.test(target)) { continue }
    const path = resolve(root, dirname(rel), target.split('#')[0])
    if (!existsSync(path)) {
      const line = text.slice(0, m.index).split('\n').length
      problems.push(`${rel}:${line}: broken relative link: ${target}`)
    }
  }
}

// --- report ----------------------------------------------------------------

if (problems.length > 0) {
  console.error(`check: ${problems.length} problem(s)\n` + problems.join('\n'))
  process.exit(1)
}
console.log(`check: OK (${asciiFiles.length + testTs.length} files punctuation-scanned, ${markdownFiles.length} markdown link-checked, ${srcTs.length + testTs.length + scriptFiles.length} AST-checked)`)
