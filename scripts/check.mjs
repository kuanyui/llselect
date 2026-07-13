#!/usr/bin/env node
// Mechanical style checks (CLAUDE.md s5). Zero-dependency; exits non-zero
// listing every violation. Only rules that need no parser live here:
//   1. ASCII punctuation - no smart quotes / dashes / ellipsis / CJK
//      punctuation outside the documented exceptions (i18n pack values,
//      unicode test fixtures, demo i18n data, external review inputs).
//   2. Markdown relative links must point at existing files.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const root = process.cwd()
const problems = []

// --- collect files --------------------------------------------------------

function listDir(rel, extension) {
  const dir = join(root, rel)
  if (!existsSync(dir)) { return [] }
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(extension))
    .map((e) => join(rel, e.name))
}

// Exceptions (CLAUDE.md s5): i18n pack values, draft.ts (abandoned), test
// fixtures (unicode-behavior data), demo (i18n / RTL data), REVIEW inputs.
const asciiFiles = [
  ...listDir('src', '.ts').filter((f) => !f.endsWith('i18n.ts') && !f.endsWith('draft.ts')),
  ...listDir('src/themes', '.css'),
  ...listDir('docs', '.md').filter((f) => !f.endsWith('REVIEW.md')),
  ...listDir('docs/archive', '.md'),
  ...listDir('scripts', '.mjs'),
  'README.md',
  'CLAUDE.md',
  'package.json',
]

const markdownFiles = [
  ...listDir('docs', '.md').filter((f) => !f.endsWith('REVIEW.md')),
  ...listDir('docs/archive', '.md'),
  'README.md',
  'CLAUDE.md',
]

// --- rule 1: ASCII punctuation --------------------------------------------

// Typographic / CJK punctuation that must not appear (the ASCII rule).
// Deliberately NOT flagged: currency / math / (c) symbols and non-punctuation
// unicode - the rule is about punctuation drift, and real violations of the
// English-only rule need human review anyway.
const BAD_PUNCTUATION = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A0\u3000\u3001\u3002\uFF08\uFF09\uFF0C\uFF1A\uFF1B\uFF01\uFF1F]/

for (const rel of asciiFiles) {
  const lines = readFileSync(join(root, rel), 'utf8').split('\n')
  lines.forEach((line, i) => {
    const m = line.match(BAD_PUNCTUATION)
    if (m) {
      problems.push(`${rel}:${i + 1}: non-ASCII punctuation U+${m[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} in: ${line.trim().slice(0, 80)}`)
    }
  })
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
console.log(`check: OK (${asciiFiles.length} files punctuation-scanned, ${markdownFiles.length} markdown files link-checked)`)
