# CLAUDE.md

> This CLAUDE.md is forked from https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md , which is MIT License

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Project-Specific Rules (llselect)

- All source code, identifiers, file names, comments, and documentation are English only.
- Use only the ASCII hyphen-minus character `-`. Do not use em dash, en dash, smart quotes, or other non-ASCII punctuation anywhere in code or docs.
- Exception to the two rules above, limited to user-visible or behavior-verifying DATA: i18n resource STRINGS (the translated values in the `src/i18n/` per-language pack files, and demo data that exists to demonstrate i18n / RTL), test fixtures that verify Unicode behavior (CJK search / IME filtering inputs, bidi labels), and intentional visual glyphs (e.g. a theme's `\00d7` close cross). Identifiers, comments, and surrounding explanations in those files stay English/ASCII. Typography inside translations: zh-TW puts a space between CJK and half-width characters (Pangu spacing); ja follows Japanese convention (no such spacing).
- Markdown: do NOT hard-wrap prose to a fixed column. Write each paragraph, list item, and blockquote as ONE physical line and let the renderer wrap it; wrapping is the reader's / renderer's job, not the author's. This repo lives on GitLab, whose Flavored Markdown (like GitHub issues / PRs / comments) turns every in-paragraph newline into a `<br>`, so column-wrapping renders as a wall of unwanted line breaks. Only fenced code blocks, table rows (one per row), and headings keep their own physical lines.
- Comments should be terse. Skip anything obvious from the code; only note non-obvious intent, invariants, or workarounds.
- Browser support floor (fixed baseline, update deliberately - never let it drift with the calendar): Firefox 78+, Chrome/Edge 87+, Safari 14.1+. This is the measured floor of what the code actually uses (ES2020 output per tsconfig `target`, `replaceChildren`, flex `gap`, `padding-block` / `padding-inline` / `inset` shorthands; `visualViewport` and scroll anchoring degrade gracefully). Do not add polyfills, vendor prefixes, or workarounds for older versions; raising the floor for a new API is fine if it is called out in the commit.
- TypeScript: write explicit, precise types. Do not use `any` unless genuinely unavoidable; when you must, add a short comment explaining why.
- Always wrap the body of `if` / `else` / `while` / `for` / `do` in `{ }`, even when the body is a single statement, and even when written on the same line. Example: `if (x) { return }` not `if (x) return`. This avoids the "next line gets accidentally added but isn't actually in the body" class of bugs.
- Document authority: CLAUDE.md governs agent behavior and enforceable code-style constraints. `docs/DESIGN.md` owns API / architecture decisions (naming conventions, module boundaries, settings vs methods, ARIA mapping, etc.). `docs/A11Y.md` owns the keyboard / focus / ARIA behavior contract. When these disagree, the owning document wins; fix the others to match it.
- When asking the user to decide a name (method / function / setting / type), ALWAYS give its full TypeScript signature (param + return types) and one line on what it actually does. Never ask for a naming decision on insufficient information - the user should not have to go look it up.
- Any callback / setting whose type includes `null` must have its docstring state exactly what `null` means; it differs per case (e.g. "fall back to the default text" vs "render nothing") and is never self-evident.
- When explicit naming / structure conflicts with brevity or "fewer abstractions" (including s2 Simplicity First), prefer explicit. The cost of guessing while reading the API outweighs a few extra methods or longer names.
- Do not ask permission for work that is already agreed, has no decision in it, and is going to happen either way - just do it, and report what was done. s1's "if something is unclear, ask" is about things that are actually UNCLEAR: a question earns its place only when the answer changes what gets built - a name, a boundary, a semantic, a tradeoff only the user can weigh. "Shall I also do the obvious remaining item?" / "which of these two agreed things first?" / "shall I continue?" are not that; they cost a round trip and hand back a decision that was never the user's to make. When in doubt, prefer doing it and saying so over asking - a wrong-but-reported action is cheap to correct, an unnecessary question is pure latency. Splitting work into separate commits is the way to keep it reviewable, not asking first.
- REVIEW / TODO / FIXME finding ids must be descriptive (the `[SEVERITY-N]` format below), never cryptic invented codes like `R20` / `F7` / `REVIEW 1.2`. Refer to a finding by what it is ("the off-screen-open listener leak") - in docs, in commit messages, and when reporting to the user - with the id at most a trailing reference; a bare code forces the reader to look it up. This is ONLY about those tracking ids; it is not a general ban on abbreviations, so it needs no list of allowed words.

### Verification commands (llselect)

Run before claiming a change is done; all must pass:

```sh
npm run verify      # one shot: check + build + test + angularjs (npm ci + test) + build:site; exactly what CI runs
npm test            # tsc test compile + node:test under jsdom
npm run build       # d.ts + rollup bundles + themes
npm run check       # mechanical style checks (ASCII punctuation, doc links)
npm pack --dry-run  # when package.json / exports / files changed
```

The repo holds a SECOND package, `angularjs/` (`@llselect/angularjs`), with its own tests and its own dependencies. The root `npm test` does not touch it, so a green root run says nothing about it. When changing anything under `angularjs/` (or anything in `src/` its directives lean on), also run:

```sh
cd angularjs && npm install && npm test   # jsdom + real angular; needs a root `npm run build` first
cd angularjs && npm run build             # terser only, no bundler; also checked by prepublishOnly
```

`angularjs/*.min.js` and `angularjs/node_modules/` are build outputs / installs and are gitignored: change the source, rebuild. The `angularjs/` directives are plain ES5-style IIFEs on purpose (a legacy AngularJS app drops them into `vendor/` behind a `<script src>`), so the ES2020 / TypeScript rules above do not apply inside that directory - but the ASCII, brace and comment rules do.

jsdom cannot test layout, native Tab focus navigation, scrollbar dragging, visual-viewport behavior, or assistive-technology output. Changes touching positioning, focus order, RTL, themes, or ARIA need a real-browser pass - record what to verify in `docs/TODO.md` ("manual verification") if it cannot happen in the same session.

### Generated and abandoned files (llselect)

- `dist/` and `.build/` are build outputs. Never edit them manually; change `src/` (or the build config) and rebuild.
- `src/draft.ts` is an abandoned early reference, excluded from builds and tests. Do not repair, extend, or "clean it up".
- A public API change is not done until everything it touches moves together: exports (`src/index.ts`), declarations, README examples, tests, and the owning contract doc (`docs/DESIGN.md` / `docs/A11Y.md`).

### Review-findings log (`docs/FIXME.md`)

Findings from reviews (external, `/code-review`, audits) are tracked in `docs/FIXME.md`, newest round on top under a `## review (<topic>)` heading. No date in the heading, or anywhere in the file - `git log` carries the when (see the no-dates-in-docs rule). Each finding is one entry:

`- [ ] **[SEVERITY-N] - title**` - `[ ]` open, `[x]` resolved. SEVERITY is a full word, never abbreviated: HIGH / MEDIUM / PERFORMANCE / QUALITY / DOCUMENTATION / NEEDS-VERIFICATION / LINT. N is a number unique across all rounds (e.g. `[QUALITY-7]`).

Nested body:

- Plain facts use a label, one per line: `Symptom:` / `Cause:` / `Impact:` / `Fix:` / `Verified:` (Verified only on resolved entries).
- A non-obvious judgement becomes a two-level Q&A: `- Q: Why <judgement>, not
  <the tempting alternative>?` then `  - A: Because <why the alternative fails
  / why this holds>.` Add one only when the answer is non-trivial; keep each A terse.
- Cross-round correction is the PRIMARY use of the Q&A: when a later round finds a prior call wrong, delete the wrong CONCLUSION but keep the LESSON as a Q&A for why it was wrong. These accumulate across rounds - keep them. The Q asks about the judgement itself, never which round made it.
- `file:line` refs: keep line numbers while the entry is open (`[ ]` - you still navigate there); on resolving (`[x]`), drop the line number and keep only the file / symbol (lines drift after the fix; git blame / grep finds the exact spot).