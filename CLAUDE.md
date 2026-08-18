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
- No dates in docs: never stamp the date of writing into documentation, headings, or decision-log entries - `git log` / `git blame` own the when. A date that is itself content (e.g. "the abandoned 2024 draft") is fine.
- Never hardcode a runtime-generated `#anchor` (e.g. the demo pages' section slugs, derived from heading text) in a cross-page link - renumbering or rewording the heading silently breaks it and nothing checks it. Link the page and name the target section in plain text; `#anchors` are only for ids stable by construction (hand-written ids, or same-file anchors `npm run check` verifies).
- Comments should be terse. Skip anything obvious from the code; only note non-obvious intent, invariants, or workarounds.
- Docstrings and human-facing docs (TSDoc in src/, README, angularjs/API.md) are written for fast scanning - a reader with mild dyslexia must be able to follow them. Precise, short sentences; complete but never long-winded. Short never means telegraphic: when a fact is conditional, spell the connective out (if / when / while / otherwise) - write "If no query is active, every item is visible", never a fronted fragment like "No query active: every item is visible". Colon-fronted labels are for defining a term or introducing a list, not for carrying an if. Lead with ONE short sentence saying what the thing is, then put every further fact in its own bullet, one fact per bullet. Never glue several clauses into one sentence with dashes and nested parentheses. When one word bundles several conditions (e.g. which items count as "visible" for an operation), define it with a nested list: an intro bullet like "acts on items that satisfy all of the following:", then one condition per sub-bullet. Implementation and internals notes (what a method composes, complexity, subclass wiring) go LAST, at the tail of the docstring, after every reader-facing fact. TSDoc renders verbatim into the generated API reference, so docstrings are user-facing documentation held to this rule, not internal comments. (Agent-facing docs under docs/llm/ keep their dense house style.)
- Plain language everywhere an explanation lives: docs, code comments, demo copy, and replies to the user. Never invent a term or lean on a vague metaphor when the concrete thing has a name - say "the option element the library builds", not "shell". A niche term is acceptable only if the same sentence defines it. When an existing doc uses an invented term, replace it with the concrete wording.
- One word, one concept - STRICT. Never reuse a word that already names one thing in this project for a second, confusable thing. Reserved: "label" appears in a name only where HTML itself calls the concept label (`<label>` -> `labelEl`, `aria-label` -> `ariaLabel`, `<optgroup label>` -> the groupLabel element family) - the canonical string machinery is `*String` / `toString` (JS's idiom; it also drives search and accessible names), while UI-facing copy and "what this item shows" are `*Text`. External vocabulary (ng-options' `label` clause, ui-select's `tagging-label`) may be quoted in backticks as the other project's term, mapped once to ours. Full ruling: `docs/llm/naming-conventions.md` s7a.7-8.
- Demo example titles say what the example SHOWS, in plain words. Never a bare mechanism tag like "(settings)" or "(subclass)" - if the mechanism matters, name the actual API in the title or the first hint sentence.
- Demo hint copy stays short. Every sentence must help a reader understand the example faster; cut anything that only records agent reasoning. When editing an example, the hint should usually get SHORTER, not longer.
- When a demo mimics a native control behavior, reproduce the native presentation - no invented decoration beyond the ask. If the platform reference is uncertain, say so instead of asserting. Styling library-built elements from a demo goes through the public API (`triggerEl`, angularjs `instance()`).
- Interactive controls (buttons, toggles) keep a stable position across state changes: never relocate the control itself on open/close; only the content it reveals may move or reflow.
- demo/style.css has NO global `box-sizing: border-box` reset. To fill a container in demo CSS, use flex or block auto width - never `width: 100%` plus padding (content-box math overflows and grows a horizontal scrollbar).
- Default UI content is rendered by the library as real text / DOM, never via CSS generated content (`::before` + attribute gating). CSS glyphs are only for styling-layer decoration on EMPTY elements the theme owns the look of (the `\00d7` close crosses).
- Browser support floor (fixed baseline, update deliberately - never let it drift with the calendar): Firefox 78+, Chrome/Edge 87+, Safari 14.1+. This is the measured floor of what the code actually uses (ES2020 output per tsconfig `target`, `replaceChildren`, flex `gap`, `padding-block` / `padding-inline` / `inset` shorthands; `visualViewport` and scroll anchoring degrade gracefully). Do not add polyfills, vendor prefixes, or workarounds for older versions; raising the floor for a new API is fine if it is called out in the commit.
- TypeScript: write explicit, precise types. Do not use `any` unless genuinely unavoidable; when you must, add a short comment explaining why.
- Start identifier/key-like API types as a defaulted generic param, never a hard-coded concrete type - widening later cascades through internals and is a breaking change, so it never happens. When such a type opens to objects, pair it with an equality fn and keep it off the DOM (index-based ids, no `String(key)`). Worked example: the `GK` bullets in DESIGN.md "Data model".
- Always wrap the body of `if` / `else` / `while` / `for` / `do` in `{ }`, even when the body is a single statement, and even when written on the same line. Example: `if (x) { return }` not `if (x) return`. This avoids the "next line gets accidentally added but isn't actually in the body" class of bugs.
- Document authority: CLAUDE.md governs agent behavior and enforceable code-style constraints. `docs/llm/DESIGN.md` owns API / architecture decisions (naming conventions, module boundaries, settings vs methods, ARIA mapping, etc.). `docs/llm/A11Y.md` owns the keyboard / focus / ARIA behavior contract. When these disagree, the owning document wins; fix the others to match it.
- Doc placement: `docs/llm/` holds agent-facing material (contracts, specs, findings logs, decision archives); `docs/` itself is for human-facing documentation only. New agent-facing docs go under `docs/llm/`, never the docs/ root. Human API reference is GENERATED (TypeDoc -> `public/api/`, from the TSDoc in src/) - do not hand-write a parallel core API doc; the AngularJS directive reference is hand-written in `angularjs/API.md` (narrative stays in `angularjs/README.md`).
- Rules live in this repo, never in the assistant's memory (`~/.claude/**/memory/`): memory does not travel across machines or collaborators, so a rule stored only there is invisible to everyone else. Write to memory only when the user explicitly asks. When the user states a durable rule or convention, write it into the governing doc (this file, or the owning `docs/llm/` doc) FIRST, then do the work it governs.
- When asking the user to decide a name (method / function / setting / type), ALWAYS give its full TypeScript signature (param + return types) and one line on what it actually does. Never ask for a naming decision on insufficient information - the user should not have to go look it up.
- Any callback / setting whose type includes `null` must have its docstring state exactly what `null` means; it differs per case (e.g. "fall back to the default text" vs "render nothing") and is never self-evident.
- When explicit naming / structure conflicts with brevity or "fewer abstractions" (including s2 Simplicity First), prefer explicit. The cost of guessing while reading the API outweighs a few extra methods or longer names.
- Do not ask permission for work that is already agreed, has no decision in it, and is going to happen either way - just do it, and report what was done. s1's "if something is unclear, ask" is about things that are actually UNCLEAR: a question earns its place only when the answer changes what gets built - a name, a boundary, a semantic, a tradeoff only the user can weigh. "Shall I also do the obvious remaining item?" / "which of these two agreed things first?" / "shall I continue?" are not that; they cost a round trip and hand back a decision that was never the user's to make. When in doubt, prefer doing it and saying so over asking - a wrong-but-reported action is cheap to correct, an unnecessary question is pure latency. Splitting work into separate commits is the way to keep it reviewable, not asking first.
- Hold a position by the strength of the argument, not by the user's tone. Change it when genuinely refuted - that change is honest, not soft; hold while the arguments stand, even against displeasure. Serious or casual phrasing must not enter the decision. State verifiable facts plainly, but never give absolute guarantees about what cannot be guaranteed (e.g. security claims).
- Never flip a shipped library default in the same turn it is questioned. Deliver a tradeoff discussion first: short plain sentences (no dense tables), separate "the architecture is wrong" from "the implementation has a bug", give a recommendation, and wait for the pick. Demo-level iteration stays act-then-report.
- "Update the data" means the data ONLY (benchmark numbers, versions, tables). Never reword the user's own prose alongside - not even for vocabulary consistency. After such an edit, diff and confirm every hunk is data; if a wording change genuinely seems needed, propose it in one sentence and let the user decide.
- REVIEW / TODO / FIXME finding ids must be descriptive (the `[SEVERITY-N]` format below), never cryptic invented codes like `R20` / `F7` / `REVIEW 1.2`. Refer to a finding by what it is ("the off-screen-open listener leak") - in docs, in commit messages, and when reporting to the user - with the id at most a trailing reference; a bare code forces the reader to look it up. This is ONLY about those tracking ids; it is not a general ban on abbreviations, so it needs no list of allowed words.
- Commit messages: ONE line, in the house shape `type: [scope] terse summary`. The summary names WHAT changed, nothing more - mechanism, rationale, and sub-part inventories belong in the diff, docs, and FIXME/TODO entries. Length: aim ~72 chars for the whole subject, normally stay under 100; when the content genuinely needs it (e.g. two long API names in a rename) up to 140 is acceptable, never more. At most one `;`-joined second clause, and only when the commit genuinely does two things (e.g. add + rename). Needing more room means the message is explaining instead of naming, or the commit should be split. For the register read the EARLY history (`git log --reverse | head -40`), not recent commits - matching the latest entries is exactly how subjects once drifted past 400 chars. No paragraph bodies. Trailers (e.g. Co-Authored-By) stay, after a blank line.

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

jsdom cannot test layout, native Tab focus navigation, scrollbar dragging, visual-viewport behavior, or assistive-technology output. Changes touching positioning, focus order, RTL, themes, or ARIA need a real-browser pass - record what to verify in `docs/llm/TODO.md` ("manual verification") if it cannot happen in the same session. A real-browser pass IS possible in this no-sudo devcontainer: `docs/llm/rootless-browser-testing.md` has the rootless Playwright recipe.

The user previews the demo / site through `make server`, which serves the `public/` build output. `public/` regenerates only when `build:site` runs - after changing `demo/`, site generation, or READMEs, run `npm run build:site` before reporting anything as viewable (no server restart needed; mention a browser hard refresh when cached CSS / JS is involved).

### Generated and abandoned files (llselect)

- `dist/` and `.build/` are build outputs. Never edit them manually; change `src/` (or the build config) and rebuild.
- `src/draft.ts` is an abandoned early reference, excluded from builds and tests. Do not repair, extend, or "clean it up".
- A public API change is not done until everything it touches moves together: exports (`src/index.ts`), declarations, README examples, tests, and the owning contract doc (`docs/llm/DESIGN.md` / `docs/llm/A11Y.md`).

### Review-findings log (`docs/llm/FIXME.md`)

Findings from reviews (external, `/code-review`, audits) are tracked in `docs/llm/FIXME.md`, newest round on top under a `## review (<topic>)` heading. No date in the heading, or anywhere in the file - `git log` carries the when (see the no-dates-in-docs rule). Each finding is one entry:

`- [ ] **[SEVERITY-N] - title**` - `[ ]` open, `[x]` resolved. SEVERITY is a full word, never abbreviated: HIGH / MEDIUM / PERFORMANCE / QUALITY / DOCUMENTATION / NEEDS-VERIFICATION / LINT. N is a number unique across all rounds (e.g. `[QUALITY-7]`).

Nested body:

- Plain facts use a label, one per line: `Symptom:` / `Cause:` / `Impact:` / `Fix:` / `Verified:` (Verified only on resolved entries).
- A non-obvious judgement becomes a two-level Q&A: `- Q: Why <judgement>, not
  <the tempting alternative>?` then `  - A: Because <why the alternative fails
  / why this holds>.` Add one only when the answer is non-trivial; keep each A terse.
- Cross-round correction is the PRIMARY use of the Q&A: when a later round finds a prior call wrong, delete the wrong CONCLUSION but keep the LESSON as a Q&A for why it was wrong. These accumulate across rounds - keep them. The Q asks about the judgement itself, never which round made it.
- `file:line` refs: keep line numbers while the entry is open (`[ ]` - you still navigate there); on resolving (`[x]`), drop the line number and keep only the file / symbol (lines drift after the fix; git blame / grep finds the exact spot).