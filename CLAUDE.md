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
- Comments should be terse. Skip anything obvious from the code; only note non-obvious intent, invariants, or workarounds.
- Browser target: roughly the last 5 years. Do not add polyfills, vendor prefixes, or workarounds for older versions.
- TypeScript: write explicit, precise types. Do not use `any` unless genuinely unavoidable; when you must, add a short comment explaining why.
- Always wrap the body of `if` / `else` / `while` / `for` / `do` in `{ }`, even when the body is a single statement, and even when written on the same line. Example: `if (x) { return }` not `if (x) return`. This avoids the "next line gets accidentally added but isn't actually in the body" class of bugs.
- For API / architecture decisions (naming conventions, module boundaries, settings vs methods, ARIA mapping, etc.) see `docs/DESIGN.md`. For the keyboard / focus / ARIA behavior contract see `docs/A11Y.md`. CLAUDE.md is style only.
- When asking the user to decide a name (method / function / setting / type), ALWAYS give its full TypeScript signature (param + return types) and one line on what it actually does. Never ask for a naming decision on insufficient information - the user should not have to go look it up.
- Any callback / setting whose type includes `null` must have its docstring state exactly what `null` means; it differs per case (e.g. "fall back to the default text" vs "render nothing") and is never self-evident.
- When explicit naming / structure conflicts with brevity or "fewer abstractions" (including s2 Simplicity First), prefer explicit. The cost of guessing while reading the API outweighs a few extra methods or longer names.