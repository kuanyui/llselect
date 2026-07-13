# Documentation and release-readiness review

Review date: 2026-07-13

## Scope

This review covers:

- `CLAUDE.md`
- `README.md`
- all files under `docs/`
- the public settings and DOM behavior in `src/`
- package and build configuration where it affects documented usage

The review focuses on internal consistency, agreement with the current
implementation, usefulness to contributors and coding agents, and readiness for
the first public npm release.

## Executive summary

The project has unusually detailed design records and a coherent public API.
The test suite and production build pass. However, the documentation is not yet
a fully reliable source of truth because normative specifications, completed
roadmaps, research notes, and obsolete design sketches are mixed together.

Three issues should be resolved before the first public release:

1. The accessible-name contract and the ARIA pattern for multiple selection need
   another design and assistive-technology review.
2. The searchable open-state focus contract does not match the current
   implementation, especially for Shift+Tab.
3. The documented CSS import conflicts with `package.json` declaring every file
   side-effect-free.

The remaining findings are documentation accuracy, information architecture,
and public README quality improvements.

## Verification performed

- `npm test`: passed, 21 test-file subtests, 0 failures.
- `npm run build`: passed.
- `npm pack --dry-run`: passed and confirmed that the package contains `dist/`,
  `README.md`, `LICENSE`, and `package.json`, but not `docs/`.
- The Git worktree remained clean after verification.

## 1. Release-blocking findings

### 1.1 The accessible-name contract is incomplete

Evidence:

- `docs/A11Y.md:15-24` describes searchable and non-searchable modes as W3C APG
  combobox patterns.
- `src/base.ts:1565-1587` creates the trigger and assigns either `role="button"`
  or `role="combobox"`, but it does not assign `aria-label` or
  `aria-labelledby`.
- The public base settings do not provide an app-level label or labelled-by
  setting.
- `texts.searchInputAriaLabel` names only the search input. Its default value,
  `Search`, describes the search operation rather than the application field,
  such as `Country` or `Assignee`.

WAI-ARIA 1.2 requires a combobox to have an author-provided accessible name.
The APG also distinguishes a combobox's name from its current value. The current
non-searchable trigger exposes chosen content as the value-like content but does
not provide a separate field name.

The APG combobox pattern is also explicitly a single-select pattern where the
popup contributes one value to the combobox. `LLSelectMultiple` uses a
multi-select listbox, so the documentation should not claim that it directly
implements the APG combobox pattern without a separate rationale and
assistive-technology validation.

References:

- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria/)
- [WAI-ARIA APG combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [WAI-ARIA APG select-only combobox example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)

Recommended action:

1. Define how application code supplies the field's accessible name. Support a
   visible label through `aria-labelledby`, a direct `aria-label`, or both.
2. Define which elements receive that name in each mode: closed trigger, active
   search combobox, and popup listbox.
3. Re-evaluate and document the pattern used by `LLSelectMultiple` instead of
   inheriting the single-select combobox claim.
4. Add automated name assertions and manual screen-reader tests.

### 1.2 The searchable focus contract does not match the implementation

`docs/A11Y.md:19-20`, `:36`, and `:95` state that:

- the search input is the only focusable element while the popup is open;
- the open trigger is not focusable; and
- Tab and Shift+Tab close the popup and leave the widget.

In the implementation:

- `src/base.ts:1572` gives the trigger `tabindex="0"`;
- `syncSearchModeToDom()` changes the role, hidden state, and active-descendant
  host, but not the trigger's tabindex;
- Tab has no explicit keyboard action and relies on `focusout`; and
- `focusout` intentionally keeps the popup open when focus moves to another
  element inside `rootEl`.

Given the DOM order, Shift+Tab from the search input can move to the trigger.
Because the trigger is inside `rootEl`, the popup can remain open. This is an
inference from the current DOM and focus logic and should be confirmed in a real
browser because jsdom does not perform native Tab focus navigation.

Recommended action:

- Make the trigger non-tabbable during an active searchable open cycle and
  restore the correct tabindex on close, including disabled-state handling; or
- intentionally support focus moving back to the trigger and rewrite the
  contract around that behavior.

Whichever behavior is chosen, add real-browser Tab and Shift+Tab tests.

### 1.3 CSS imports conflict with `sideEffects: false`

`README.md:24` recommends:

```js
import 'llselect/themes/vanilla.css'
```

However, `package.json:6` declares:

```json
"sideEffects": false
```

Production bundlers can remove a bare CSS import when the package declares that
all files are side-effect-free. Webpack specifically recommends listing CSS
files in `sideEffects` so that production tree shaking does not drop them.

Reference:

- [Webpack tree-shaking guide](https://webpack.js.org/guides/tree-shaking/)

Recommended action:

```json
"sideEffects": ["**/*.css"]
```

Add a minimal production consumer build that imports one shipped theme and
asserts that the CSS reaches the output.

## 2. Normative documentation does not always describe current behavior

### 2.1 Popup width policy contradicts itself

`docs/DESIGN.md:559-577` says that the popup width is locked to the trigger width
and that llselect's popup is always equal to the trigger width. The same section,
at `:594-601`, correctly documents the shipped `fit-content` policy.

The earlier text and comparison table should say that `match-trigger` is the
default. The behavior should be described separately for `match-trigger` and
`fit-content`.

### 2.2 The ARIA element table collapses two modes into one

`docs/A11Y.md:34-43` lists the trigger role as `button`, even though the document
and implementation say it is `combobox` when search is inactive. The table
should either have separate rows for the two modes or include explicit
mode-dependent cells.

The sentence at `docs/A11Y.md:23` also says that no search input is rendered and
then immediately says that it is built but hidden. `Not displayed` or `present
in the DOM with hidden` would be unambiguous.

### 2.3 The non-searchable open-state keyboard contract is missing

`docs/A11Y.md` has tables for the closed state and for the searchable open state,
but not for the non-searchable open state. The missing table should cover:

- ArrowUp and ArrowDown
- PageUp and PageDown
- Home and End
- Enter and Space
- Escape and Alt+ArrowUp
- Tab and Shift+Tab
- select-all leading-row behavior

### 2.4 Close-time focus wording is too broad

`docs/A11Y.md:63-64` says that close caused by Escape, a single-select pick,
outside click, or focus leaving the root always returns focus to or keeps it on
the trigger. `close()` only returns focus when the searchable input still owns
DOM focus. An outside action that moves focus elsewhere is intentionally allowed
to keep focus there.

The contract should distinguish keyboard cancellation from pointer and
focusout dismissal.

## 3. Historical documents are easy to mistake for current specifications

### 3.1 Optgroup research has an obsolete status

`docs/optgroup-research.md:3` says `API decided; not yet implemented`, while
Phase 10, its settings, tests, themes, and protected methods are implemented.
The same file later uses both `deferred` and `shipped` for related API.

Mark the document as `SUPERSEDED RESEARCH RECORD`, link to the canonical section
of `DESIGN.md`, and describe sketches below the banner as historical.

### 3.2 Item-rendering brainstorm describes resolved questions as open

`docs/item-rendering-brainstorm.md:11-15` says that no middle-layer item renderer
exists. Its `Still open` section includes questions already resolved by
`createItemContentElFn`, `triggerDisplay`, tag rendering, and the `onChange`
previous-value parameter.

The file should be archived or given a superseded banner that summarizes the
final decisions and points to their canonical locations.

### 3.3 TODO is mostly completed history

`docs/TODO.md` is 403 lines, but nearly every item is complete. `Open rulings`
contains only completed rulings, and `API design decisions (open)` contains one
remaining release-readiness item among completed decisions.

Recommended split:

- `docs/TODO.md`: incomplete work only.
- `docs/archive/roadmap-v0.0.1.md`: completed phases and rulings.
- `docs/decisions/`: durable rationale that still helps future changes.

### 3.4 Hard-coded test counts drift

Documentation records both 182 and 219 passing tests in different places. The
current runner reports 21 test-file subtests, while the source contains many
individual `test()` calls inside those files. Counts depend on what is being
counted and become stale whenever tests change.

Prefer `npm test passes` without a number, or generate the number automatically.

### 3.5 Release-review bookkeeping has small inconsistencies

`docs/review-release-candidate.md` says that three real defects were found and
fixed, but its fixed section also includes F7. It also says that all eight
Container-Content pairs were verified and then lists nine pairs.

These do not affect the implementation, but they reduce confidence in a document
whose purpose is to certify consistency.

## 4. CLAUDE.md improvements

The general principles are useful, especially surgical changes, explicit API
naming, null semantics, and verification. The project-specific section can be
made more deterministic and easier to enforce.

### 4.1 Clarify the document's authority

`CLAUDE.md:78` says that `CLAUDE.md is style only`, but sections 1-4 define
behavior and execution policy. Suggested wording:

> CLAUDE.md governs agent behavior and code-style constraints. DESIGN.md owns
> API and architecture decisions. A11Y.md owns the keyboard, focus, and ARIA
> contract.

### 4.2 Add exact project verification commands

Document the expected checks rather than relying only on generic success
criteria:

```sh
npm test
npm run build
npm pack --dry-run
```

Also state which changes require a real-browser pass because jsdom cannot test
layout, native focus navigation, scrollbar dragging, visual viewport behavior,
or assistive-technology output.

### 4.3 Document generated and abandoned files

Add explicit rules that:

- `dist/` and `.build/` are generated and should not be edited manually.
- `src/draft.ts` is an abandoned reference, excluded from builds and tests, and
  should not be repaired or extended.
- public API changes must update exports, declarations, README examples, tests,
  and relevant design contracts.

### 4.4 Make the language and character exceptions match legitimate tests

The English-only exception currently names translated resource strings and demo
data, but CJK search fixtures and visual glyph fixtures also legitimately appear
in tests and CSS. Expand the exception to user-visible translated data, test
fixtures that verify Unicode behavior, and intentional visual glyphs. Keep
identifiers, comments, and surrounding explanations in English.

README currently contains smart quotes in its duplicated license text, which
conflicts with the ASCII punctuation rule. Reusing or linking to the canonical
`LICENSE` file avoids this drift.

### 4.5 Replace the moving browser target

`roughly the last 5 years` changes meaning over time while the compiler target
remains ES2020. Record an explicit support baseline, tested browser matrix, or a
Browserslist-style target. Then update it intentionally rather than letting it
move with the calendar.

### 4.6 Automate enforceable style rules

The following CLAUDE.md rules are not part of `npm test` or `npm run build`:

- explicit-brace style;
- no unexplained explicit `any`;
- prohibited punctuation;
- Markdown structure and links.

Add a lightweight `npm run check` or CI job for rules that can be enforced
mechanically. Leave subjective rules, such as comment usefulness, to review.

## 5. README improvements

### 5.1 Copy-edit the public introduction and limitations

The README contains several grammar and terminology problems, including:

- `This is not mean to provide`
- `This provide`
- `which implement`
- `when the popup open`
- `No asynchronize data fetching API`
- `eastern-Asia languages`
- `heavily relys`
- `an usable software`

Use one H1 for the package title and H2/H3 for the remaining hierarchy. Add
blank lines around lists for consistent Markdown rendering.

### 5.2 State native form limitations explicitly

The package describes itself as a replacement for native `<select>`, but the
README does not explain that it does not automatically provide native form
serialization, `name`/value submission, form reset, constraint validation, or
native `<label for>` association.

These are important integration boundaries, not incidental implementation
details. Put them near the quick start or in a clearly visible limitations
section and show how an application should synchronize its form state.

### 5.3 Narrow the sanitizer warning

`README.md:97` says that no sanitizer is provided and instructs every caller to
use DOMPurify. This is broader than the actual risk:

- default item and trigger strings are assigned through `textContent`;
- content callbacks return caller-created elements; and
- the risk appears when application code itself parses untrusted markup, for
  example through `innerHTML`.

Suggested meaning:

> llselect does not parse item strings as HTML. If custom render callbacks use
> `innerHTML` or otherwise parse untrusted markup, sanitize that markup first.

### 5.4 Replace unmeasured performance claims

`blazing fast` in README and `This beats vdom frameworks` in DESIGN.md are broad
claims. Either publish a repeatable benchmark with dataset, browser, operation,
and result, or use precise implementation descriptions such as `single-item
selection updates replace one item node instead of rebuilding the list`.

### 5.5 Make consumer documentation reachable from npm

README refers to `docs/DESIGN.md`, but `package.json` excludes `docs/` from the
published tarball and the README reference is inline code rather than a link.

Either:

- link to stable repository URLs from README; or
- include selected public documentation in the package.

Internal research and archived roadmaps do not need to ship.

### 5.6 LLM disclosure is appropriate; its tone is an editorial choice

Disclosing extensive LLM involvement is reasonable and should remain. The prior
review comment about tone referred specifically to the heading at
`README.md:112`, which contains `fucking idiot vibe coder`, not to the existence
of the disclosure.

This is not a correctness or transparency defect. If the confrontational voice
is intentional and represents the project's author, keep it. If broader npm
adoption or a more neutral project voice is a goal, the same disclosure can be
kept while changing only that heading. No change is required for technical
reasons.

### 5.7 Add a compact consumer API guide

README currently introduces construction, themes, i18n, and customization, but
does not give a discoverable overview of several major capabilities:

- search and `filterFn`;
- disabled control and item behavior;
- grouping;
- multiple selection and select-all;
- popup width policies;
- lifecycle and required `destroy()` cleanup;
- accessible labeling requirements;
- form-state integration.

A concise table with links to stable detailed documentation is enough. It does
not need to duplicate every declaration file.

## 6. Recommended documentation structure

Keep each file's authority narrow:

- `README.md`: package users, installation, examples, limitations, public links.
- `CONTRIBUTING.md`: local setup, commands, testing matrix, release procedure.
- `CLAUDE.md`: agent behavior and enforceable project coding rules.
- `docs/DESIGN.md`: current normative API and architecture decisions only.
- `docs/A11Y.md`: current normative keyboard, focus, and ARIA contract only.
- `docs/TODO.md`: incomplete work only.
- `docs/decisions/`: durable accepted decisions and their rationale.
- `docs/archive/`: brainstorms, completed roadmaps, migration tables, and review
  history that should not be mistaken for current API.

Add a short status banner to every non-normative document:

```text
Status: ARCHIVED. This is a historical decision record, not the current API
contract. See DESIGN.md section X for the accepted design.
```

## 7. Suggested order of work

1. Resolve accessible naming, the multi-select ARIA pattern, and searchable
   Shift+Tab behavior.
2. Fix the CSS `sideEffects` declaration and add a consumer build test.
3. Correct contradictions in `A11Y.md` and `DESIGN.md`.
4. Archive superseded research and reduce `TODO.md` to unfinished work.
5. Add deterministic project instructions and automated documentation checks.
6. Copy-edit and expand README for public consumers.

