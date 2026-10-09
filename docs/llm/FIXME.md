# FIXME - review-findings log

Findings from reviews of llselect, newest round on top. Format spec (severity words, `[SEVERITY-N]` ids, Symptom/Cause/Fix/Verified labels, cross-round Q&A) lives in `../../CLAUDE.md` "Review-findings log". `N` is a stable id in creation order, not a rank; open items are `[ ]`, resolved `[x]`. No dates here - git log owns the when.

## review (theme dark color schemes, post-fix round 9)

Process: the ninth fix batch (commit `8bc62b2`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, two QUALITY, two DOCUMENTATION. Opus 4.8: ship, one QUALITY. Codex 5.5: fix first, one QUALITY. Codex Sol: fix first, two QUALITY. All four found the scanner's three outputs length-safe (one member fuzzed 20,000 inputs). The entries below merge the overlapping findings.

- [x] **[QUALITY-273] - the url() scan took `noturl(` for a url(), skipped only space, tab and newline before a quoted argument, and stopped at a `)` inside a comment after it; the declaration message still printed an inline comment**
  - Fix: a url() needs an identifier boundary before it; the blank walk before and after the argument skips every CSS whitespace character and comments; the declaration message quotes the comment-free text with its whitespace collapsed.
- [x] **[DOCUMENTATION-274] - two comments overstated the scanner (a url() "span" is a start index and an argument) and one line overran the comment wrap**
  - Fix: reworded and rewrapped; QUALITY-270 names the two messages it covered.

## review (theme dark color schemes, post-fix round 8)

Process: the eighth fix batch (commit `7945d2d`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, three QUALITY, three DOCUMENTATION. Opus 4.8: fix first, one QUALITY, two DOCUMENTATION. Codex 5.5: fix first, one QUALITY, one DOCUMENTATION. Codex Sol: fix first, three QUALITY, two DOCUMENTATION. All four found the masker and the pinned test sound. The entries below merge the overlapping findings.

- [x] **[QUALITY-269] - the url() color scan ran a fresh regex over the unmasked source: a url() inside a comment or a string counted, a quoted url() holding ")" was missed, and a fragment reference such as `url(#cafe)` was a false positive**
  - Fix: the single pass records every real url() with its argument; the scan covers only `data:` URLs (an embedded image), so `url(#id)` and `url(file.svg)` are not scanned; the lookahead for a quoted argument walks the whitespace instead of slicing 16 characters.
- [x] **[QUALITY-270] - the messages blanked a `/*` inside a selector string as a comment**
  - Fix: the same pass also returns the text with only the comments blanked; the selector and `@media` messages quote from it (the declaration message followed under QUALITY-273).
- [x] **[DOCUMENTATION-271] - DESIGN's property list missed `tap-highlight-color`; the header summary of `scripts/check.mjs` claimed color functions inside a url() are scanned; "such a declaration" named a narrower scope than the code**
  - Fix: the list names the property; the header says "a hex also inside a data: url()"; DESIGN says "any declaration other than the `--llselect-*` variables".
- [ ] **[QUALITY-272] - rule 6 has no automated test; the probe that checked every round lives outside the repo**
  - Symptom: the rule changed in every round of this feature, each time verified by a throwaway script that writes a temporary theme file; `npm run check` and `npm test` exercise neither the masker nor the scanner on a crafted input.
  - Fix (owner decision pending): extract the scan into a module the test runner can import (a file next to check.mjs under scripts, exporting a function that takes a file's text and returns its problems), make `scripts/check.mjs` call it, and turn the probe's cases into a `node:test` file. Needs a place for script tests: the root runner compiles `test/**/*.ts` only.

## review (theme dark color schemes, post-fix round 7)

Process: the seventh fix batch (commit `a820acd`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, three QUALITY, one DOCUMENTATION. Opus 4.8: fix first, one DOCUMENTATION. Codex 5.5: fix first, one QUALITY. Codex Sol: fix first, three QUALITY, one DOCUMENTATION. All four found the two observer tests sound. The entries below merge the overlapping findings.

- [x] **[QUALITY-265] - rule 6's messages quoted a preceding comment with the declaration, and the widget-root messages printed masked selectors**
  - Fix: the quote starts at the declaration's first non-blank character; the root messages and the `@media` message quote the unmasked source.
- [x] **[QUALITY-266] - a comment opener inside a string masked real declarations, because comments were masked before strings**
  - Fix: one left-to-right pass masks comments, strings and unquoted `url()` in context; a quoted `url()` argument is masked by the string branch, so a `)` inside it ends nothing.
- [x] **[QUALITY-267] - a color inside a `url()` was never scanned, and `tap-highlight-color` was missing from the keyword properties**
  - Fix: a `#hex` or `%23hex` inside a `url()` of a declaration other than `--llselect-*` is rejected (an embedded image color follows no scheme); `tap-highlight-color` joins the list.
  - Q: Why reject `list-style: red` although `red` may name a custom counter style?
    - A: Because a counter style named like a color misleads the reader as much as the check; the theme renames it. The check cannot tell the two apart without a CSS parser.
- [x] **[DOCUMENTATION-268] - DESIGN's check.mjs bullet repeated the `transparent` clause; the header summary of `scripts/check.mjs` lagged; the no-`<html>` test did not pin that its callback runs**
  - Fix: the duplicate clause is gone and the url() rule is stated; the header names the two scopes (literals anywhere, keywords in color-bearing properties); the test first proves the `<body>` is registered (a re-decision), then runs the negative half.

## review (theme dark color schemes, post-fix round 6)

Process: the sixth fix batch (commit `a98db89`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, three QUALITY. Opus 4.8: ship, one QUALITY. Codex 5.5: fix first, one QUALITY. Codex Sol: fix first, three QUALITY. All four found the registration path correct. The entries below merge the overlapping findings.

- [x] **[QUALITY-262] - the callback half of the no-`<html>` test could not fail, and the "nothing registered yet" start value had no test**
  - Fix: the callback half asserts that no window `error` event fired (jsdom reports a callback exception that way, not as a thrown error); a new test wires a document whose `<body>` is missing and asserts the `<body>` that arrives later is observed.
  - Verified: with the file from two batches back swapped in (its callback path unguarded), the callback assertion fails with the `observe` TypeError; with the start value changed back to `null`, the new test fails.
- [x] **[QUALITY-263] - a hex or color-function literal in a property outside the list went unscanned, while a keyword list could never be complete**
  - Fix: a hex or color-function literal counts in every declaration other than `--llselect-*`; only the named and system color keywords are limited to the color-bearing properties, where they cannot be ordinary values.
- [x] **[QUALITY-264] - a `}` inside a string hid a declaration, escaped quotes were not understood, and `list-style-type: red` was a false positive**
  - Fix: comments, strings and `url()` are masked over the whole file before the rules are split, escape-aware; the message quotes the original text; the list-style scan covers `list-style` and `list-style-image` only.

## review (theme dark color schemes, post-fix round 5)

Process: the fifth fix batch (commit `6ec3799`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, two QUALITY. Opus 4.8: ship, one DOCUMENTATION. Codex 5.5: fix first, two QUALITY. Codex Sol: fix first, three QUALITY, one DOCUMENTATION. All four found the strengthened body test sound. The entries below merge the overlapping findings.

- [x] **[QUALITY-260] - the initial observer registration at wiring time passed `documentElement` unguarded, and the new guard had no test**
  - Fix: `observeBody()` is the only registration path (its "nothing registered yet" start value makes the first call register), so the guard covers wiring too; a test runs the callback after `<html>` is removed and wires a fresh document whose `<html>` is gone.
  - Verified: with the previous file swapped in, the suite fails at the wiring step with the TypeError.
- [x] **[QUALITY-261] - rule 6: the `list-style` shorthand was unscanned, the `-webkit-` prefix counted for two properties only, and a `;` inside a string or a data URI split a declaration**
  - Fix: `list-style*` joins the list; the optional `-webkit-` prefix applies to every listed property; strings and `url()` (any case) become blanks over the whole block before the split on `;`, so offsets and line numbers stay exact; DESIGN says so.

## review (theme dark color schemes, post-fix round 4)

Process: the fourth fix batch (commit `270ca7a`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, three QUALITY, two DOCUMENTATION. Opus 4.8: ship, two QUALITY. Codex 5.5: fix first, two QUALITY. Codex Sol: fix first, three QUALITY. All four found the observer re-registration and the copy correct. The entries below merge the overlapping findings.

- [x] **[QUALITY-256] - the extended body test passed with the previous observer too, so it did not prove the removed-body fix**
  - Fix: after the new `<body>` is active, the test changes an attribute on the removed `<body>` and asserts no re-decision, then changes one on the new `<body>` and asserts the re-decision.
  - Verified: with the previous observer swapped in, the suite fails at exactly that assertion ("the removed <body> is not observed any longer", actual light); with the current one it passes.
  - Q: Why did a Verified line get written for a test that could not fail?
    - A: Because the test was written for the symptom (a new body is observed) and not for the change (the old body is not). A test that guards a fix is run against the previous code, by reasoning or by reverting, before its Verified line is written.
- [x] **[QUALITY-257] - the color-bearing property list missed `background-image` and other image or SVG color properties; a `)` inside a quoted `url()` broke the masking**
  - Fix: `background*`, `mask*`, `backdrop-filter`, `stop-color`, `flood-color`, `lighting-color`, `list-style-image`, `content`, `text-fill-color` and `text-stroke*` join the list; strings are stripped before `url()`; DESIGN names the list.
- [x] **[QUALITY-258] - `observeBody()` re-registered `documentElement` without a null guard**
  - Fix: guarded like `<body>`; a detached `<html>` leaves the observer registered on nothing, and a new `<html>` is the known limit below.
- [x] **[DOCUMENTATION-259] - the replaced-`<html>` limit read as a one-time repair**
  - Fix: it says the attribute-driven re-decision does not resume for that document, the OS listener and `open()` still work, and `refreshColorScheme()` is needed after each later change.

## review (theme dark color schemes, post-fix round 3)

Process: the third fix batch (commit `e2440e2`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, two QUALITY, five DOCUMENTATION. Opus 4.8: fix first, two DOCUMENTATION. Codex 5.5: fix first, one QUALITY, one DOCUMENTATION. Codex Sol: fix first, two QUALITY, three DOCUMENTATION. All four found the observer and the theme value correct; the contract text lagged. The entries below merge the overlapping findings.

- [x] **[QUALITY-250] - the observer kept a removed `<body>` referenced and kept old bodies observed**
  - Fix: on a `<body>` identity change the observer disconnects and re-registers `<html>` and the current `<body>` (none while it is missing), so a removed `<body>` is neither observed nor referenced.
  - Verified: the replaced-body test, strengthened under QUALITY-256, changes an attribute on the removed `<body>` and asserts no re-decision.
- [x] **[QUALITY-251] - the system-color keywords matched ordinary values (`transition: background .2s`, `font: menu`, `url(menu.svg)`)**
  - Fix: the literal-color scan covers only properties that accept a color (`color`, `background*`, `border*`, `outline*`, the shadows, `fill`, `stroke`, `filter`, ...) and custom properties other than `--llselect-*`, after stripping strings and `url()`.
- [x] **[DOCUMENTATION-252] - DESIGN described the observer as attributes only, its trigger list missed a replaced or late `<body>`, and a replaced `<html>` element was not a listed limit**
  - Fix: the resolver bullet names the observation targets (the attributes of `<html>` and of the current `<body>`, the child list of `<html>`, no subtree) and the trigger; the known limits say a replaced `<html>` element is not observed again and needs `refreshColorScheme()`.
  - Q: Why not observe the document node for a replaced `<html>` as well?
    - A: Because `document.open()` and `documentElement.replaceWith()` remove every widget with the old `<html>`; a page that moves its widgets into a new `<html>` is not a case worth code, and a one-line limit covers it.
- [x] **[DOCUMENTATION-253] - the bootstrap-5 shadow comparison was wrong twice: the dark block redefines the shadow as plain black**
  - Fix: DESIGN, the divider comment in the theme and the MEDIUM-211 entry describe the dividers alone (both blocks read `--bs-body-color-rgb`); the shadow reads it in the light block only.
  - Q: Why did a wrong claim about the shadow survive two rounds?
    - A: Because the check behind the first correction read the light block only. A claim that compares one declaration with another is verified in both blocks before it is written.
- [x] **[DOCUMENTATION-254] - wording that contradicted the code or lacked a referent**
  - Fix: `destroy()` says a further call empties the mount element again, and that collectability also needs the application to drop its references; DESIGN's bootstrap-5 note says the light focus border follows `--bs-primary-rgb` while the dark one is the literal Bootstrap itself uses in both schemes; demo 17.5 names the demo's own style.css; the `'auto'` bullet of `angularjs/API.md` is a nested list, one decision stage per item.
- [x] **[NEEDS-VERIFICATION-255] - the copy changed in this round went through the wording review**
  - Fix: Codex Astra at medium effort (the substitute for Codex Luna 6) reviewed the changed `destroy()` bullets, the demo 17.5 hint and the `ll-color-scheme` list: 4 findings, 4 applied (a repeated `destroy()` "repeats the cleanup", the demo hint names style.css and the theme's dark rule, the fallback condition of the `color-scheme` step spelled out, the reference sentence moved out of the decision list).

## review (theme dark color schemes, post-fix round 2)

Process: the second fix batch (commits `8498748` and `63c6995`) went to the other four panel members, one at a time, read-only. Opus 5: fix first, five QUALITY, six DOCUMENTATION. Opus 4.8: ship, one QUALITY, one DOCUMENTATION. Codex 5.5: fix first, two QUALITY, one DOCUMENTATION. Codex Sol: fix first, two MEDIUM, four QUALITY, three DOCUMENTATION. The entries below merge the overlapping findings.

- [x] **[MEDIUM-239] - bootstrap-5's focused trigger border was a 50 percent tint of the primary color, which composites dark on a dark page**
  - Symptom: `rgba(var(--bs-primary-rgb), 0.5)` equals Bootstrap's `#86b7fe` over white but gives about 1.8:1 over Bootstrap's dark body; Bootstrap itself keeps the opaque `#86b7fe` in dark mode.
  - Fix: the dark block sets `--llselect-focus-line: #86b7fe` (Bootstrap's input focus border color, which has no CSS variable and does not change in dark mode); about 7:1 on the dark body.
- [x] **[DOCUMENTATION-240] - the 3:1 claim covered the translucent focus halos, which sit between 1.3:1 and 2:1 in bootstrap-4, bootstrap-5 and tailwind**
  - Fix: the contrast floor names the focused control's border (3:1 or better in every dark palette after MEDIUM-239) and exempts the ring shadow drawn around it as decoration that follows each framework's own halo; bootstrap-3's denser halo passes on its own. A probe over the five palettes measured the focused borders and the halos.
- [x] **[QUALITY-241] - a replaced <body> was never observed again, and the <head>-script repair depended on DOMContentLoaded**
  - Cause: the document is wired once; the one-shot `DOMContentLoaded` listener covered only the first appearance of `<body>`.
  - Fix: the observer also watches the child list of `<html>` (not the subtree); every callback observes the current `<body>` when it is new. That covers a `<body>` appearing after a `<head>` script and a `document.body` replaced later.
  - Verified: test "a replaced <body> is observed too"; the `<head>`-script case stays in the manual pass.
- [x] **[QUALITY-242] - the literal-color check reported each declaration one line early**
  - Cause: a declaration chunk starts with the newline left by the previous `;`.
  - Fix: the line is counted at the first non-blank character of the declaration.
- [x] **[QUALITY-243] - rule 6 matched `color-scheme` and `prefers-color-scheme` case-sensitively and knew no system colors**
  - Fix: the property name, the at-rule and the media feature match case-insensitively (the custom property `--llselect-color-scheme` stays case-sensitive, as CSS defines it); the CSS system colors join the literal-color list; keyword boundaries exclude the hyphen, so `context-menu` does not match `Menu`.
- [x] **[QUALITY-244] - the batch test asserted "none before" for one of its two widgets**
  - Fix: both roots are asserted attribute-free before the microtask.
- [x] **[DOCUMENTATION-245] - the retention statements missed two facts: the promise holds for a CLOSED instance, and `labelEl` is a second retaining element**
  - Fix: DESIGN's resolver bullet, the resolver comment and the `destroy()` docstring say: a CLOSED instance stays reachable only through its mount element and `labelEl`, like its own DOM listeners; an OPEN instance holds document listeners until `close()` or `destroy()`.
- [x] **[DOCUMENTATION-246] - the first-check bullets of the setting docstring read as if every value queued the first check; `destroy()` promised that a further call does nothing, without the rebuild condition**
  - Fix: both scoped: a forced value is written during construction; a further `destroy()` does nothing unless a second instance was built on the element since.
- [x] **[DOCUMENTATION-247] - the reason logged for keeping the `cancelFirstDecision` identity check was wrong**
  - Q: Why keep the identity check in `cancelFirstDecision` when `unsubscribeColorScheme` lost its own?
    - A: Because a discarded instance calls no method, so neither check serves it. The cancel check serves the unsupported path where a replaced older instance's `getColorScheme()` runs: that call does not empty the element, so a dropped newer decision would be silent. `destroy()` on that path empties the element anyway, so its check protected nothing visible.
- [x] **[DOCUMENTATION-248] - README and demo misstated the cascade for custom colors; API.md never said what the value `auto` does; DESIGN pointed at a heading that does not exist and omitted the literal-color rule**
  - Fix: README says a rule needs the specificity of a class plus an attribute and later source order, with `.acme .llselect-root` as the example; demo 17.5 explains why its rule also names the attribute (the demo stylesheet loads before the theme) and drops the sentence that only named the wrapper; API.md states the `auto` outcome; DESIGN names "Rules for every theme file" and lists the literal-color rejection.
- [x] **[NEEDS-VERIFICATION-249] - the copy changed in this round went through the wording review**
  - Fix: Codex Astra at medium effort (the substitute for Codex Luna 6) reviewed the changed setting bullets, the changed `destroy()` bullets, the README custom-colors bullet, the demo 17.5 hint and the `ll-color-scheme` sentence: 14 findings, 14 applied (conditions as "if" sentences, the check triggers one per sentence, the retention direction stated, the README cascade rule corrected to "higher specificity, or equal specificity and a later position").

## review (theme dark color schemes, post-fix)

Process: the fix batch `45d34ab` went to the other four panel members for a post-fix review, one at a time, read-only, with the round below in the brief; Codex Sol also covered the whole implementation, since its first-round review never arrived. Opus 5: fix first, one MEDIUM, five QUALITY, nine DOCUMENTATION. Opus 4.8: fix first, three QUALITY, two DOCUMENTATION, one NEEDS-VERIFICATION. Codex 5.5: fix first, one MEDIUM, four QUALITY, three DOCUMENTATION. Codex Sol: fix first, three MEDIUM, five QUALITY, eight DOCUMENTATION. The entries below merge the overlapping findings.

- [x] **[QUALITY-228] - check.mjs rule 6 lost the dark block: masking brackets as letters defeated the class-name lookahead**
  - Symptom: `.llselect-root[data-llselect-color-scheme='dark']` masked to `.llselect-rootxxx...`, so the `(?![\w-])` lookahead failed and the dark block, the one place the forbidden declarations are most likely to land, went unchecked; `div.llselect-root` and `.foo.llselect-root` were still missed by the `(^|[^\w-])` prefix.
  - Fix: masking (repeated, innermost first) only locates the commas and the last combinator; the subject is tested unmasked with `/\.llselect-root(?![\w-])/`, so `.llselect-root[attr]`, `div.llselect-root`, `[attr].llselect-root` and `:is(.llselect-root)` all count, and a comma inside `:is()` or an attribute value no longer splits the list.
  - Verified: the rule rejects a copy of vanilla.css with `color-scheme: dark` added to the dark block, and passes the shipped themes.
- [x] **[QUALITY-229] - the literal-color check reported drifted line numbers and missed named colors, modern color functions and same-line declarations**
  - Cause: comments were deleted with their newlines before the lines were counted; the scan was per line and matched `#hex`, `rgb()` and `hsl()` only.
  - Fix: comments become blanks of equal length; the scan is per declaration (split on `;`), skips only properties that start with `--llselect-`, and matches hex, every color function (rgb, hsl, hwb, lab, lch, oklab, oklch, color, color-mix; case-insensitive) and the CSS named colors; `transparent` and `currentColor` stay allowed.
- [x] **[QUALITY-230] - the `<body>` observation retry needed a later subscription**
  - Symptom: one widget built from a script in `<head>` wired the document before `<body>` existed and never observed it; only a second subscription repaired that.
  - Fix: a one-shot `DOMContentLoaded` listener observed `<body>` when it was missing at wiring time; superseded by QUALITY-241, which watches the child list of `<html>` instead and covers a replaced `<body>` too.
- [x] **[QUALITY-231] - four tests were green for the wrong reason**
  - Symptom: "destroy() ends the subscription" passed because `destroy()` removes the attribute the shared pass queries; "every widget" built one widget; "one batch" cannot be observed in jsdom; the identity check in `cancelFirstDecision` had no test.
  - Fix: the destroy test puts the attribute back before the `<html>` change; the observer test builds two widgets; the batch test is named for what it asserts (all decided after one microtask, none before); a new test calls `getColorScheme()` on a replaced older instance and asserts the newer instance still decides in the batch.
- [x] **[DOCUMENTATION-232] - three statements of the no-leak promise disagreed**
  - Symptom: DESIGN and the resolver comment said the shared listeners retain nothing; the `destroy()` docstring said a discarded instance keeps deciding while its mount is in the document; the code does the latter, as the widget's own DOM listeners already do.
  - Fix: all three say the same thing: the shared listeners hold no instance; an instance stays reachable only through its mount element; once the mount leaves the document, everything is collectable, with or without `destroy()`.
- [x] **[DOCUMENTATION-233] - two instances on one element: the supported order was undocumented, and the identity check in `unsubscribeColorScheme` guarded an unsupported path**
  - Fix: the `destroy()` docstring and DESIGN's known limits state the order (destroy first, then build) and that an older instance must not be used after a rebuild, `destroy()` included; the `unsubscribeColorScheme` identity check is removed; the claim in the constructor stays, since it covers a closed instance discarded without `destroy()`; the identity check in `cancelFirstDecision` stays for the reason under DOCUMENTATION-247.
  - Q: Why not guard every root mutation of `destroy()` with an owner token, so an older instance's `destroy()` after a rebuild is harmless?
    - A: Because the newer constructor already empties the element, and a `destroy()` that skips its teardown when it is not the owner would leave the host believing two instances are live. The supported order is cheap to follow, and a host that breaks it gets a visibly empty widget, not silent corruption.
- [x] **[DOCUMENTATION-234] - the Tailwind table in DESIGN kept the old hover border value**
  - Fix: dark `--llselect-trigger-hover-line` is slate-400 in the table too.
- [x] **[DOCUMENTATION-235] - the 3:1 border claim covered dividers and the tag outline, which sit near 1.4:1 in every dark palette, and omitted bootstrap-5's filter border**
  - Fix: the contrast floor in DESIGN, the TODO status and the bootstrap-5 note name the borders they cover (trigger, filter input, popup) and the focus rings; dividers and the tag outline are decorative and exempt; bootstrap-5's filter-input border is listed with its trigger border as Bootstrap's own. In the round below, the #868e96 attribution is corrected to Bootstrap 4.0's gray-600, and "like the shadow" is dropped: the dark block redefines the shadow as plain black, so the dividers alone read the variable in both blocks (the first correction, "as the shadow already does", was wrong too; DOCUMENTATION-253 holds the lesson).
- [x] **[DOCUMENTATION-236] - docstring sentences a developer could misread**
  - Fix: the shadow-root bullet of `refreshColorScheme()` says the page checks do not reach a shadow root and when to call; `getColorScheme()` says it decides now while the first decision is still queued (DESIGN matched); the dangling "comes last" sentence of the setting is deleted; the marks bullet lists `auto` for `data-color-scheme` and says a mark on the root itself counts; the forced-value sentence in the type docstring and in `angularjs/API.md` carries the bootstrap-5 note.
- [x] **[DOCUMENTATION-237] - README and demo wording**
  - Fix: README: "the same wrapper" became "the element your rule targets, or one of its ancestors"; "as Bootstrap documents" became "the attribute Bootstrap's own documentation uses"; the marks count on the widget root too; the custom-colors bullet says to load the rule after the theme stylesheet. Demo 17.5: "in both schemes" dropped, since the wrapper now resolves dark; the hint says the rule replaces the theme's light and dark values.
- [x] **[NEEDS-VERIFICATION-238] - the new copy of both fix batches had not been through the wording review the specification requires**
  - Fix: Codex Astra at medium effort (the substitute for Codex Luna 6, which this account cannot use) reviewed the changed docstrings, the README recipe, the demo hints and the `ll-color-scheme` entry after this round: 34 findings, 32 applied (the condition of each sentence spelled out, the `color-scheme` property rule as three "if" sentences, the `destroy()` docstring restructured into one lead sentence and bullets, "marks" replaced by "classes and attributes" in the README). Two declined: the `**Expression** ->` line of `angularjs/API.md` keeps the format every attribute entry there uses; the Bootstrap caveat is not repeated in the README's nested-regions bullet, since the Bootstrap bullet two lines down carries it.

## review (theme dark color schemes)

Process: post-implementation review of the themes' dark color schemes (commits `c037159` to `a536449`: the 32 variables, the resolver, the setting and methods, the AngularJS attribute, demo section 17, the README recipe) by the other four panel members, one at a time, read-only, on a self-contained brief with the specification (`DESIGN.md` "Color scheme (light / dark) in the themes"). Opus 5: fix first, four MEDIUM, eight QUALITY, six DOCUMENTATION. Opus 4.8: ship, three QUALITY, two DOCUMENTATION. Codex 5.5: fix first, three MEDIUM, two QUALITY, two DOCUMENTATION. Codex Sol: no output, the model reported "at capacity" (re-run pending). The entries below merge the overlapping findings.

- [x] **[MEDIUM-211] - bootstrap-5's dark dividers were a fixed white tint while its surfaces follow Bootstrap's variables**
  - Symptom: on a page whose Bootstrap variables stay light while the widget resolves dark (OS dark, `color-scheme: light dark`, no `data-bs-theme`), the header, footer and command-row dividers painted white on white.
  - Fix: both blocks read `rgba(var(--bs-body-color-rgb, ...), 0.12)` (the light shadow reads the same variable; the dark shadow stays black); the light fallback is the near-black Bootstrap text color, a hue change from pure black that the eye cannot tell at 12 percent.
- [x] **[MEDIUM-212] - three dark border values sat below the 3:1 floor the specification states**
  - Symptom: vanilla's filter-input border #555 on #1e1e1e (2.2:1), bootstrap-4's trigger and filter borders #6c757d on #343a40 (2.5:1), tailwind's hover border darker than its rest border; the docs claimed every palette passed, and bootstrap-5's exception was written as 2.1:1, the value on the demo page's background; on Bootstrap's own dark body background it is 1.9:1, and the popup border (Bootstrap's translucent border) is 1.6:1.
  - Fix: vanilla #6b6b6b, bootstrap-4 #868e96 (Bootstrap 4.0's gray-600), tailwind hover slate-400; the contrast probe now measures the filter border and the hover border too; the bootstrap-5 note corrected.
- [x] **[MEDIUM-213] - a second instance built on the same element could be overwritten or unsubscribed by the first**
  - Symptom: an older `'auto'` instance's batched first decision ran after a newer forced instance wrote its attribute; the older instance's `destroy()` dropped the newer instance's subscription.
  - Cause: pending decisions were a set of instances and subscriptions were keyed by the root without an identity check.
  - Fix: pending decisions are keyed by the root element; every constructor claims the element (drops the older pending decision and subscription); `cancelFirstDecision` and `unsubscribeColorScheme` act only when the entry is still their own.
  - Verified: test "a newer instance on the same element owns it".
- [x] **[MEDIUM-214] - under bootstrap-5 a forced light widget inside a data-bs-theme="dark" page stays Bootstrap-dark**
  - Symptom: the setting promised "always that scheme"; Bootstrap's variables supply the colors regardless.
  - Fix: documented, not changed: the setting docstring, the README Bootstrap bullet and DESIGN's known limits say so. Changing the CSS would give up decision 5 (Bootstrap drives the bootstrap-5 theme).
- [x] **[QUALITY-215] - a widget built on a detached element decided light and nothing re-decided it on insertion**
  - Fix: documented in DESIGN's known limits and in the `refreshColorScheme()` docstring (call it after inserting); test added. The batched first decision already covers "built and inserted in the same task".
- [x] **[QUALITY-216] - when the document was wired before <body> existed, <body> was never observed**
  - Fix: the wiring records whether `<body>` is observed; every later subscription observes it as soon as it exists.
- [x] **[QUALITY-217] - the observer reacted to the resolver's own attribute when the widget root is <html> or <body>**
  - Fix: records whose attribute is `data-llselect-color-scheme` start no pass.
- [x] **[QUALITY-218] - check.mjs rule 6 missed a compound selector with the root class not first, and nothing checked for literal colors**
  - Fix: the subject is matched anywhere in the last compound after masking parentheses and brackets; a second check rejects any literal color outside the `--llselect-*` declarations.
- [x] **[QUALITY-219] - the shared listener path had no jsdom coverage**
  - Fix: tests for the observer pass, for the subscription ending on `destroy()`, for several widgets in one batch, and for the ui-select bridge's config passthrough.
- [x] **[QUALITY-220] - demo 17.5 painted a dark palette on a widget resolved light, so the scrollbar came out light**
  - Fix: the wrapper also sets `--llselect-color-scheme: dark`; the README's custom-colors bullet says to pair a palette with its scheme.
- [x] **[QUALITY-221] - the shared listeners stay for the document's life**
  - Fix: none. A pass is one document query, holds no instance, and `<html>` / `<body>` attribute changes are rare; a counter to disconnect and reconnect was judged more state than it saves.
- [x] **[DOCUMENTATION-222] - the README recipe broke the README limits and listed the marks incompletely**
  - Fix: nested list, one mark family per line, sentences under 20 words, at most two code names per line, the light classes and `auto` listed.
- [x] **[DOCUMENTATION-223] - the destroy() docstring did not mention the attribute, the subscription, or the residue of a discarded instance**
  - Fix: both sentences extended.
- [x] **[DOCUMENTATION-224] - the setting docstring reused "trigger" for the update conditions and numbered the fallback as a source**
  - Fix: reworded; the fallback is a plain bullet.
- [x] **[DOCUMENTATION-225] - widgets inside a shadow root miss the two automatic re-decisions, undocumented**
  - Fix: the setting docstring, the `refreshColorScheme()` docstring and DESIGN's Shadow DOM limit say so.
- [x] **[DOCUMENTATION-226] - the fixed variable and attribute names under cssClassPrefix were undocumented**
  - Fix: the setting docstring and DESIGN's known limits say the names never change.
- [x] **[DOCUMENTATION-227] - the demo section 17 intro enumerated the examples in one misreadable sentence and claimed a "resolved" line for 17.5**
  - Fix: the intro keeps two facts; the "resolved" claim is limited to 17.1 to 17.4.

## review (site color-scheme switch)

Process: post-change review of the site's light / dark switch (`88f698a`: `demo/color-scheme.js`, the demo chrome tokens, the site template) by the other four panel members, one at a time. Round 1: Opus 5 (max) on the shipped commit, its findings fixed in one batch (`739aeaf`). Round 2: Opus 4.8 (max) on the fixed state: ship, one QUALITY finding (169), fixed. Round 3: Codex 5.5 (xhigh): ship, one QUALITY and two DOCUMENTATION findings (170-172), fixed. Round 4: Codex Sol (max): fix first, three MEDIUM, four QUALITY, three DOCUMENTATION findings (173-182), fixed. Round 5 (post-fix review of round 4 by the other four members, one at a time): Opus 5: fix first, two MEDIUM, four QUALITY, five DOCUMENTATION (183-193; two were the pre-change baseline, kept). Opus 4.8: ship, one QUALITY, two DOCUMENTATION (194-196). Codex 5.5: fix first, one MEDIUM, three DOCUMENTATION (197-200). Codex Sol: fix first, one MEDIUM, one QUALITY, three DOCUMENTATION (201-205). Round 6 (confirmation of `6ceeccd` by Opus 5): ship, two QUALITY, three DOCUMENTATION (206-210), comment and doc level plus one pin, applied without a further review round. Entries follow the round-4 ones.

- [x] **[MEDIUM-155] - the vanilla filter input was painted dark by the UA under a dark page scheme**
  - Symptom: with `color-scheme: dark` on the page root, the vanilla theme's filter input rendered as a dark field with white text inside the white popup (measured: rgb(59, 59, 59)); every other theme sets both colors.
  - Cause: `src/themes/vanilla.css` `.llselect-filter-input` declared no `background-color` / `color`, so the UA's dark form-control colors applied.
  - Fix: explicit `background-color` / `color` on the rule, matching the other four themes; the benchmark stages pin `color-scheme: light` for the competitors' widgets (Select2 leaves its search field to the UA).
  - Verified: headless Chromium, dark OS, the open popup of a filterable example shows a white field.
- [x] **[MEDIUM-156] - benchmark charts kept Chart.js's light defaults under the dark scheme**
  - Symptom: tick, legend and title text stayed #666 and the grid rgba(0,0,0,0.1), unreadable on the dark page; a scheme change did not repaint.
  - Fix: `demo/benchmark.js` reads the scheme (attribute, else `matchMedia`) into `Chart.defaults.color` / `borderColor` before each build, and a `MutationObserver` on `data-color-scheme` plus the media-query listener rebuild live charts from state (`renderChart`, `renderIxChart`).
  - Verified: headless Chromium: a chart built under the dark scheme shows light text; a chart built in light, then the switch, then an OS flip without an override, resolves ticks, legend, grid and title to the dark values each time.
  - Q: Why rebuild the chart, not `chart.update()`?
    - A: Because, measured on Chart.js 4.4.7, `update()` re-reads the changed `Chart.defaults` for the legend only; scale ticks, grid and title kept the old values (QUALITY-169).
- [x] **[MEDIUM-157] - the generated pages lost their no-JavaScript dark fallback**
  - Symptom: before the switch, a dark-OS visitor with scripts off saw the site pages dark; the first version keyed every dark value on the attribute the script writes.
  - Fix: the dark token set is printed twice, under `@media (prefers-color-scheme: dark) { :root:not([data-color-scheme]) }` and under `:root[data-color-scheme="dark"]`; the script writes the attribute only for a stored override. Same shape in `demo/style.css`.
  - Verified: headless Chromium with scripts disabled and a dark OS: the home page, the examples page and the Bootstrap 3 page render dark.
  - Q: Why two copies, not one block?
    - A: Because `light-dark()` and style queries sit above the browser floor; a media query and an attribute selector cannot share one rule, so the set is a constant printed twice in the generator and a commented pair in the demo stylesheet.
- [x] **[MEDIUM-158] - the attribute always carried a resolved value, so a theme could not tell an explicit choice from "follow the OS"**
  - Symptom: the TODO contract for the theme work asked themes to honor "the page's own signal", but every page stated light or dark even when nobody had chosen.
  - Fix: attribute present = explicit override, absent = follow the OS; the TODO entry states this contract and that a theme consults `prefers-color-scheme` only under `:root:not([data-color-scheme])`.
- [x] **[QUALITY-159] - inline code text had no token, so Bootstrap's pink won under the dark scheme**
  - Symptom: with a Bootstrap theme picked, inline code read in Bootstrap's pink on the dark `--muted` chip, about 3:1.
  - Cause: the demo's `code` rule set a background and no text color, so Bootstrap's `code` color applied.
  - Fix: `code { color: var(--fg) }` in `demo/style.css`.
  - Verified: headless Chromium, dark OS, an inline code element on the examples page computes to the `--fg` text color.
- [x] **[QUALITY-160] - role="switch" on a control that looks like a checkbox**
  - Symptom: sighted users saw a checkbox, assistive technology announced a switch.
  - Cause: the role was added for the word "switch" in the request, not for a switch-looking control.
  - Fix: dropped; a native checkbox labelled "Dark" announces its own checked state.
  - Verified: headless Chromium, every page: the input carries no role attribute.
- [x] **[QUALITY-161] - once stored, a choice could never return to following the OS**
  - Symptom: the first version stored every toggle; only clearing site data brought the OS preference back.
  - Cause: a two-state control has no third "follow the OS" position, and the first version did not derive one.
  - Fix: the switch stores only an override that differs from the OS preference; setting it to what the OS says clears the stored value and the attribute.
  - Verified: jsdom smoke and headless Chromium: check on a light OS stores dark; uncheck clears storage and the attribute.
- [x] **[QUALITY-162] - the inlined script was not escaped**
  - Symptom: a future `</script` or `<!--` in `demo/color-scheme.js` would have ended the inline block early on every generated page.
  - Cause: the file was interpolated verbatim into the template literal.
  - Fix: the generator escapes `</script` and `<!--` when inlining `demo/color-scheme.js`.
  - Verified: the replace expression, run on a sample containing both sequences, yields `<\/script` and `<\!--`.
- [x] **[QUALITY-163] - two token vocabularies for one palette (site `--nav-link` / `--nav-hover` vs demo `--accent` / `--accent-soft`)**
  - Symptom: the same color concept had two names across the two stylesheets, and nothing said whether the differing light values were deliberate.
  - Cause: the site template named the blue by its only use there (nav links); the demo uses it for buttons and active rows too.
  - Fix: the site template renamed to `--accent` / `--accent-soft`; both files say the light values differ on purpose and the dark values match.
  - Verified: no `--nav-link` / `--nav-hover` left in the repository.
- [x] **[QUALITY-164] - "private mode" in a comment gave "mode" a third meaning**
  - Symptom: a `demo/color-scheme.js` comment, in the commit that reserved "mode" for single vs multiple.
  - Fix: "private browsing".
- [x] **[QUALITY-168] - two copied demo files carry no switch**
  - Symptom: `cpSync('demo', 'public/demo')` copies `demo/index.html` and `demo/bench-reflow.html`, which load no `color-scheme.js`.
  - Fix: none. `demo/index.html` is a redirect stub; `demo/bench-reflow.html` is an unlinked measurement harness with its own light styles. Every page reachable from the nav has the switch.
- [x] **[QUALITY-169] - the charts' live repaint path was unverified, and once measured it recolored the legend only**
  - Symptom: round 2 noted the recorded verification covered the build-time path only; measured, `chart.update('none')` after changing `Chart.defaults` recolored the legend but left ticks, grid and title light.
  - Fix: a scheme change rebuilds live charts from state (MEDIUM-156).
  - Verified: the live-path probe under MEDIUM-156.
- [x] **[QUALITY-170] - a scheme change reset the legend's dataset visibility and replayed the entry animation**
  - Symptom: rebuilding a chart from state discards legend clicks (visibility lives on the chart instance) and animates the bars from zero.
  - Fix: `rebuildChart` snapshots per-dataset visibility, rebuilds with `animation: false`, restores it and updates without animation; `rebuildCharts` skips when the effective scheme is unchanged.
  - Verified: headless Chromium: a dataset shown through the legend stays shown after the switch, and the rebuilt chart carries the dark values.
- [x] **[DOCUMENTATION-171] - two comments said "theme" for the light / dark axis**
  - Symptom: `scripts/build-site.mjs` ("same in both themes") and `src/icons.ts` ("light/dark themes"), against rule 7a.11.
  - Fix: "color schemes" in both; the benchmark-stage comment no longer says "light-themed".
- [x] **[DOCUMENTATION-172] - several resolved entries of this round carried only a Fix line**
  - Symptom: seven QUALITY entries of round 1 had no Symptom, Cause or Verified line.
  - Fix: every entry states its Symptom; Cause and Verified where the fact exists.
- [x] **[DOCUMENTATION-165] - the body-rule comment claimed "same colors in light"**
  - Symptom: Bootstrap 3's body text is #333, the token is #222, and the comment named no page.
  - Fix: the comment names `demo/angularjs/benchmark.html` and states what each scheme shows.
- [x] **[DOCUMENTATION-166] - rule 7a.11 was separated from rule 10 by a blank line, turning the ordered list loose**
  - Symptom: Markdown renders a list with a blank line between items as a loose list, so every rule of 7a gained paragraph spacing.
  - Fix: blank line removed.
- [x] **[MEDIUM-173] - the benchmark's light pin targeted a heading, and body-attached dropdowns escaped it**
  - Symptom: `#playground` is the section heading, not the widget grid (`#pg-grid`); Select2 and Slim Select append their dropdowns to body, so both inherited the dark root scheme.
  - Cause: the pin was written from the nav's anchor name, not the markup.
  - Fix: the pin covers `#pg-grid`, `.select2-container` and `.ss-content`.
  - Verified: headless Chromium, dark OS: the playground's Select2 search field computes to a white background.
- [x] **[MEDIUM-174] - demo classes rendered inside widgets took the page's dark tokens on the widgets' white surfaces**
  - Symptom: row hints (`.hint`), the CSS arrow, the tree caret and the popup link button read in dark-scheme grays and blues on white, down to about 2.2:1.
  - Cause: those rules were tokenized with the page chrome although their elements live inside the light-themed widget.
  - Fix: fixed light colors for the widget-internal rules, and `.llselect-root .hint` scoped under the page-level `.hint`; a comment names the theme work as the point where this changes.
  - Verified: headless Chromium, dark OS: a row hint inside an open popup computes to #666.
- [x] **[MEDIUM-175] - chart bars kept their light-scheme colors on the dark background**
  - Symptom: the default blue dataset sat at about 2.4:1 on #1b1b1b, the purple one dimmer.
  - Fix: every metric and phase carries a `darkColor`; the builders pick it under the dark scheme (the rebuild on a scheme change applies it to live charts).
  - Verified: headless Chromium, dark OS: the built chart's first dataset uses the dark blue.
- [x] **[QUALITY-176] - links on the Bootstrap 3 page stayed Bootstrap blue on the dark background**
  - Symptom: `#337ab7` on #1b1b1b is about 3.8:1, darker on hover.
  - Cause: the demo stylesheet has no link rule, and Bootstrap 3 loads after it on that page.
  - Fix: the page's own style block sets `a { color: var(--link) }`; hover and focus followed in MEDIUM-184.
  - Verified: headless Chromium, dark OS: a body link on that page computes to the `--link` dark value, the light value in a light context.
- [x] **[QUALITY-177] - a filter match in the active sidebar row inherited the active blue over the amber mark**
  - Symptom: about 3.2:1 in the dark scheme, in both the site sidebar and the examples TOC.
  - Fix: `.toc mark { color: var(--fg) }` in both stylesheets.
  - Verified: headless Chromium, dark OS: a mark in the examples TOC computes to the `--fg` dark value on the amber mark.
- [x] **[QUALITY-178] - a scheme rebuild left `animation: false` on the replacement chart**
  - Symptom: legend clicks after a scheme change no longer animated.
  - Fix: the rebuild restores the 300 ms animation option after its animation-free update.
  - Verified: headless Chromium: after the switch, the rebuilt chart's animation option is back to 300 ms.
- [x] **[QUALITY-179] - the switch mounted at DOMContentLoaded, behind the page-end CDN scripts**
  - Symptom: on the benchmark pages the control appeared only after jQuery, the competitors and Chart.js had loaded.
  - Cause: DOMContentLoaded waits for every classic script.
  - Fix: a MutationObserver mounts the switch as soon as the nav is parsed to its end (a node follows it); DOMContentLoaded stays as the fallback.
  - Verified: headless Chromium: the switch exists while `document.readyState` is still "loading".
- [x] **[DOCUMENTATION-180] - resolved entries lacked Cause and Verified lines where the fact existed**
  - Symptom: round 4 counted entries whose cause or verification was known but unwritten.
  - Fix: added across the round.
- [x] **[DOCUMENTATION-181] - the open QUALITY-167 entry kept line numbers from before the head script insertion**
  - Symptom: the entry cited lines 7-8 vs 10; the script tag in the head had shifted them to 9 vs 12.
  - Fix: renumbered.
- [x] **[DOCUMENTATION-182] - the TODO contract said "absent means follow the OS" and then listed following the OS as undecided**
  - Symptom: the page contract and the theme question were written as one sentence.
  - Fix: the page contract is marked settled; precedence is stated (explicit hooks beat the OS, a page that states light stays light); the open question is narrowed to a theme with no hook at all.
- [x] **[MEDIUM-183] - the competitors' option rows inherited the page's dark text onto their white dropdowns**
  - Symptom: measured in headless Chromium, dark OS: Select2 and Choices options computed to the dark-scheme `--fg` (#d8d8d8) on white; Tom Select and Slim Select declare their own row color and were fine.
  - Cause: `color-scheme: light` only reaches UA-painted parts; the inherited `color` property still comes from the page root.
  - Fix: the competitors' containers (`.choices`, `.select2-container`, `.ts-wrapper`, `.ts-dropdown`, `.ss-main`, `.ss-content`) get `color-scheme: light; color: #222`; the stages keep only the control part, since they also hold page text; the AngularJS page pins ui-select the same way (`.ui-select-container, .ui-select-choices { color-scheme: light; color: #333 }`): its theme colors the rows itself and Bootstrap colors the controls, so the pin covers what inherits and what the UA paints (the dropdown's scrollbar).
  - Verified: headless Chromium, dark OS: Select2 and Choices options compute to #222 on white; ui-select likewise after a benchmark run builds its widgets.
- [x] **[MEDIUM-184] - the Bootstrap 3 page's link rule covered the rest state only**
  - Symptom: Bootstrap 3's `a:hover, a:focus` (0,1,1) outranked the new `a` rule, and tied with `.demo-nav a:hover` while loading later: hovered links fell to about 2.1:1 on the dark page, nav links to about 1.6:1 on the active tint.
  - Fix: the page's style block adds `a:hover, a:focus { color: var(--accent-hover) }` and the nav / subnav hover and focus colors.
  - Verified: headless Chromium, dark OS: a hovered body link and a hovered nav link on that page compute to the dark-scheme values.
- [x] **[QUALITY-185] - the disabled popup link button's fixed color was read as a change from #555 to #999**
  - Symptom: the reviewer compared with the tokenized intermediate (`--fg-muted`, #555 in light); the pre-change baseline (`87aa254`) is #999.
  - Fix: none; #999 is the shipped light value, and a disabled control is exempt from the text-contrast minimum.
  - Q: Why keep #999, not the darker #555 the tokens had briefly given it?
    - A: Because the demo's shipped look is the baseline for "surgical" changes, the tokens had changed it unasked, and a disabled control carries no contrast requirement.
- [x] **[QUALITY-186] - two widget-internal fixed colors were read as drifting from #555 to #666**
  - Symptom: `.llselect-root .hint` and the `#mount-ind-css` CSS arrow were compared with the tokenized intermediate; the baseline for both is #666, the restored value.
  - Fix: none for those two. The one deliberate change to the light values stays and is recorded here: page-level `.hint` and the caption / label grays (#666, #777) unified onto `--fg-muted` (#555).
  - Q: Why is the pre-change commit the baseline, not the tokenized version a reviewer reads first?
    - A: Because the token pass was itself part of this change; a value it altered without being asked is not a reference point, and the "surgical changes" rule measures the diff against what shipped.
- [x] **[QUALITY-187] - the mount helper's parameter named a state it does not describe**
  - Symptom: `tryMount(navMayBeOpen)` was called with `true` from DOMContentLoaded, where the nav is certainly closed.
  - Fix: `tryMount(parsingDone)`, with the comment saying what it skips.
- [x] **[QUALITY-188] - an override that the OS later agrees with stays stored, and nothing said so**
  - Symptom: OS light, Dark chosen, OS turns dark: the stored override now equals the OS and still outlives the OS turning light again.
  - Fix: documented in the script header as the intended meaning: only the switch clears an override.
  - Q: Why keep the override, not clear it when the OS catches up?
    - A: Because the user asked for that scheme explicitly; silently dropping the choice when the OS passes through the same value would make the next OS change surprising.
- [x] **[DOCUMENTATION-189] - two round-4 entries carried only a Fix line, and QUALITY-177 had no Verified line**
  - Symptom: DOCUMENTATION-180 and 181 repeated the shape DOCUMENTATION-172 had just closed.
  - Fix: Symptom lines added; QUALITY-177 cites the TOC mark measurement.
- [x] **[DOCUMENTATION-190] - the TODO contract asked for "outside every legacy hook", a selector the browser floor cannot express**
  - Symptom: excluding "any ancestor with a hook" needs `:has()`, which sits above the floor.
  - Fix: the contract states the mechanism, rule order: the OS block first under `:root:not([data-color-scheme])`, every hook block after it, each redeclaring the full token set.
- [x] **[DOCUMENTATION-191] - the contract described the attribute in this site's implementation terms**
  - Symptom: "(a stored override)" read as part of the contract a host page must follow.
  - Fix: "the page states that scheme explicitly (on this site: a stored override)".
- [x] **[DOCUMENTATION-192] - the TODO did not point back at the demo rules frozen to light values**
  - Symptom: six rules carried a comment pointing at the TODO, and the TODO named none of them, so the theme work would have had to grep for them.
  - Fix: the entry names the `demo/style.css` rules to reconnect once the themes have dark values.
- [x] **[DOCUMENTATION-193] - the generator's token comment overstated the overlap with demo/style.css**
  - Symptom: the demo defines tokens the site lacks and the site defines `--alert-*`.
  - Fix: both comments say the tokens they share use the same names.
- [x] **[QUALITY-194] - the animation restore after a scheme rebuild was verified on the option only**
  - Symptom: Chart.js resolves animation settings through a cached resolver, so `options.animation = { duration: 300 }` was not proof that a later legend click animates.
  - Fix: none needed; measured instead.
  - Verified: headless Chromium: right after a scheme rebuild the chart reports animations disabled; a legend toggle then repaints over 500 ms (canvas differs between the two samples) and the chart reports animations enabled again, as before the switch.
- [x] **[DOCUMENTATION-195] - the round-5 severity count in the process line was wrong**
  - Symptom: "three MEDIUM, three QUALITY" for entries 183-193, which hold two MEDIUM and four QUALITY.
  - Fix: counts corrected.
- [x] **[DOCUMENTATION-196] - the TODO contract called precedence "rule order, not a selector"**
  - Symptom: the site's own attribute override works by the selector `:root:not([data-color-scheme])`, and a legacy hook on an ancestor would win by specificity or by nearest-ancestor inheritance of the custom properties; order decides only ties.
  - Fix: the contract states the mechanism in those terms and keeps the `:has()` limit.
- [x] **[MEDIUM-197] - the Bootstrap 3 page's nav hover rule also recolored the current link, accent on accent**
  - Symptom: `.demo-nav a:hover` from the page's style block ties `.demo-nav a.current` (0,2,1) and comes later, so the active tab's text took `--accent` on its `--accent` background while hovered or focused.
  - Cause: the hover rule added in MEDIUM-184 did not exclude the current link.
  - Fix: the rule targets `a:not(.current)`.
  - Verified: headless Chromium, dark and light contexts: the hovered current nav link keeps `--accent-fg` text on the `--accent` background; a hovered plain nav link takes `--accent`.
- [x] **[DOCUMENTATION-198] - the process line claimed round 5 covered all four members before their entries existed**
  - Symptom: "all four members" stood above entries from two of them.
  - Fix: the line names each member as its review lands.
- [x] **[DOCUMENTATION-199] - "light-mode change" in QUALITY-186 used "mode" for the color-scheme axis**
  - Symptom: rule 7a.11 reserves "mode" for single vs multiple.
  - Fix: "change to the light values".
- [x] **[DOCUMENTATION-200] - DOCUMENTATION-192 carried only a Fix line**
  - Symptom: the shape DOCUMENTATION-172 and 189 had already corrected twice.
  - Fix: Symptom added.
- [x] **[MEDIUM-201] - the popup footer link inherited the UA's dark-scheme link color onto the white popup**
  - Symptom: measured in headless Chromium, dark OS: the "Manage countries..." link of the footer examples (core 14.x, AngularJS 12c) computed to rgb(158, 158, 255) on white, about 2.4:1.
  - Cause: no demo rule gave links inside a widget a color; the page root's `color-scheme: dark` switches the UA link color.
  - Fix: `.llselect-root a { color: #1c4d8f }`, the light link value, listed with the other frozen rules in the TODO entry. No focus rule: measured with Tab, Chromium's focus ring on that link is `auto` in rgb(16, 16, 16) under both schemes, visible on white.
  - Verified: headless Chromium, both schemes: the link inside the open popup computes to #1c4d8f.
- [x] **[QUALITY-202] - the Bootstrap 3 page kept Bootstrap's pink code chips on the dark page**
  - Symptom: Bootstrap 3 loads after `demo/style.css` there, so its `code` rule beat the tokenized one in both schemes: light pink chips on the dark page.
  - Fix: the page's style block adds dark-only `code` rules (media query and attribute, like the token set) with the demo's chip colors; light keeps Bootstrap's chips.
  - Verified: headless Chromium: dark computes to the demo's chip colors, light to Bootstrap's.
- [x] **[DOCUMENTATION-203] - MEDIUM-183's ui-select sentence gave a reversed reason and a wrong claim**
  - Symptom: it said the page's root scheme "already reaches" ui-select's controls as a reason NOT to pin them, and the page comment said ui-select's rows declare no text color; its theme does (`.ui-select-choices-row > span { color: #333 }`).
  - Fix: the rule now pins `color-scheme: light` too (QUALITY-207), and the entry and the comment state the real reason: the theme has no dark values, so what inherits and what the UA paints stay light.
- [x] **[DOCUMENTATION-204] - QUALITY-186 lacked the Q&A for a non-obvious baseline call**
  - Symptom: the round summary claimed two baseline Q&As; only QUALITY-185 had one.
  - Fix: Q&A added (the pre-change commit is the baseline, not the tokenized intermediate).
- [x] **[DOCUMENTATION-205] - entries 198-200 carried only Fix lines**
  - Symptom: the shape corrected three times already in this round.
  - Fix: Symptom lines added.
- [x] **[QUALITY-206] - the umbrella comment on the frozen light rules did not list the new link rule, and the link comment named one of its two examples**
  - Fix: the comment lists it; the link comment names core 14.x and AngularJS 12c.
- [ ] **[NEEDS-VERIFICATION-207] - the ui-select pin lacked `color-scheme: light`, so its scrollable dropdown would get a dark UA scrollbar on a dark page**
  - Symptom: the core benchmark page pins its competitors with `color-scheme: light`; the AngularJS page pinned ui-select's text color only, and its 400-row dropdown scrolls.
  - Fix: `color-scheme: light` added to the rule. Headless Chromium hides scrollbars (`--hide-scrollbars`), so the scrollbar itself needs a headed browser: open a ui-select dropdown on `demo/angularjs/benchmark.html` under the dark scheme and confirm a light scrollbar (TODO.md "manual verification").
- [x] **[DOCUMENTATION-208] - MEDIUM-183's ui-select sentence and the page comment gave a wrong reason**
  - Symptom: see DOCUMENTATION-203, corrected in the same batch.
  - Fix: both reworded.
- [x] **[DOCUMENTATION-209] - DOCUMENTATION-204 carried only a Fix line**
  - Fix: Symptom added.
- [x] **[DOCUMENTATION-210] - DOCUMENTATION-192 said "six" rules after the TODO list grew to seven**
  - Fix: the number lives in the TODO entry only.
- [ ] **[QUALITY-167] - demo/angularjs/benchmark.html loads Bootstrap 3 after demo/style.css, so the html font-size pin loses**
  - Symptom: measured in headless Chromium: `html` 10px, nav links 14px with 8px padding, against 16px / 12.8px on the other demo pages. Pre-existing; surfaced while the review compared the two Bootstrap-order comments in `demo/style.css` (`html { font-size: 16px }` and the dark body rule).
  - Cause: Bootstrap 3's `html { font-size: 10px }` is loaded after the pin (`demo/angularjs/benchmark.html` line 9 vs 12).
  - Fix: open. Swapping the link order lets `demo/style.css` win every tie on that page (body text, code chips), so it needs an eyeball pass; alternatively pin `html` again in the page's own style block.

## review (item vocabulary, the popupListItem rename, chosenItemsOrder)

Process: post-fix review of the item-row rename (`8cb3658`), the item vocabulary docs (`30e1f95`) and the `chosenItemsOrder` setting (`f62d332`) by the other four panel members (Opus 5, Opus 4.8, Codex Sol at max, Codex 5.5 at xhigh), two rounds. Round 1 found no correctness defect and asked for the fixes in `13019d6`; round 2 reviewed that commit and produced the entries below. The rename itself followed a seven-model committee that rejected a `candidateItems` vocabulary unanimously; the ruling is naming-conventions rule 10.

- [x] **[MEDIUM-150] - setItems rendered an open popup before the multiple variant reconciled the chosen list**
  - Symptom: under `chosenItemsOrder: 'as-listed'`, a row whose content read the chosen order was stale after a `setItems` that reordered the list.
  - Cause: base `setItems` renders the open popup, then calls `onItemsChanged`, where `LLSelectMultiple` drops or reorders chosen items.
  - Fix: `LLSelectMultiple.onItemsChanged` renders an open popup once more after a drop or reorder; the `setItems` docstring says so.
  - Verified: test/chosen-items-order.test.ts, the open-popup re-render test.
  - Q: Why a second render, not reconciliation before the first?
    - A: Because the base sequence (render, `onItemsChanged`, replace action rows) is shared with single mode and fires `onChange` after the DOM shows the new list; moving reconciliation first changes that order for every consumer. The extra render runs only when the chosen items actually changed.
- [ ] **[NEEDS-VERIFICATION-151] - the compareFn-equal reload path still renders rows before the chosen references are swapped; a chosen-changing setItems renders an open popup twice**
  - Symptom: after a `setItems` whose items are compareFn-equal fresh objects, rows rendered before the swap may hold the old chosen objects (only action rows are replaced: `src/base.ts:1681` renders, `src/base.ts:1682` reconciles); a drop or reorder now costs two full list renders while open.
  - Cause: the render-before-reconcile sequence in base `setItems`.
  - Fix: open. A single final render needs reconciliation split from notification in both variants. Two round-2 reviewers asked for it; one judged the double render acceptable for a batch call.
- [x] **[QUALITY-152] - toggleItem replaces only the toggled row, so row content that reads the chosen ORDER goes stale under 'as-listed'**
  - Symptom: adding an earlier-listed item moves the existing chosen items' positions, but their rows are not rebuilt.
  - Fix: contract, not code. `createPopupListItemContentElFn` now says: read chosen state through `isChosen`, never derive content from the chosen order.
  - Q: Why document the limit, not rebuild the list on every add?
    - A: Because the O(1) single-row DOM swap of `toggleItem` is a recorded design property (DESIGN.md "hideChosenRows"); order-dependent row content is exotic; the panel split two to two. Ruled here: keep the cheap toggle, let the docstring carry the limit.
- [x] **[PERFORMANCE-153] - 'as-listed' rebuilt the item position table on every add**
  - Cause: `orderChosen` built a `Map` over the whole item list per call.
  - Fix: `itemPositionCache`, keyed by the items array reference and cleared in `onItemsChanged`; the setting's docstring lists the costs.
  - Verified: the as-listed tests pass; the cache is invalidated on every list replacement.
- [x] **[DOCUMENTATION-154] - docstrings, the README row and the API.md entry lagged the new setting and the row-class rename**
  - Symptom: `chosenItems`, `getChosenItems`, `setChosenItems`, `onChange` and `toggleItem` still described only the chosen order; README's multiple-selection row lacked `chosenItemsOrder`; `angularjs/API.md` packed the attribute's facts into one paragraph and missed the list-reorder case; `angularjs/DESIGN.md`, `docs/llm/A11Y.md`, the theme comments and one test title kept the old row class spelling; `createGroupEl`'s `itemsInGroup` rename stopped at the base signature.
  - Fix: every place named above follows the setting and the rename; `setChosenItems(chosenItems)` so that bare `items` means the full list; naming-conventions rule 10 states that direct children of a family always carry its prefix.
  - Q: Why leave "candidates" in README's introduction, not align it with rule 10?
    - A: Because the introduction prose is the maintainer's own wording and, by ruling, agents do not touch it; rule 10 governs API names.

## review (demo renumbering, AngularJS i18n demo, the ui-select bridge's language-pack door)

Process: post-fix review of three change sets in one working tree: the core demo's i18n section moved to the end (16) with every cross reference renumbered, the AngularJS demo's new section 14 (the API.md "Switching the UI language at runtime" recipe, verbatim, driving every widget on the page from `$translate`), and `<ui-llselect>` gaining the app-wide defaults plus an `instance()` controller. All four members reviewed (fresh sessions, max effort, read-only): Opus 5 and Opus 4.8 first, then Codex 5.5 and Codex Sol on the fixed tree. The harness stopped every `codex exec` started as a tracked background task within two minutes for "running low on memory" while `free -m` showed about 2.1 GB available; run detached from that tracking (`setsid nohup`, one at a time) both finished in 5 and 10 minutes, with total used memory peaking at about 1.0 GB of 2.9 GB and never less than 1.86 GB available, so the trigger was the harness's background-task guard, not exhaustion. No member found a correctness defect. Verified after the fixes: `npm run verify` green (531 core tests, 89 AngularJS tests), and the AngularJS page driven end to end in jsdom against the real CDN libraries (angular-translate with its static-files loader, angular-validation, ui-bootstrap): ja / zh-TW / en re-pack every widget without an explicit placeholder, explicit placeholders stay, chosen values survive, and `INVALID_REQUIRED` keeps resolving to the English message through `fallbackLanguage`.

- [x] **[MEDIUM-139] - three lead sentences still called the two AngularJS files independent**
  - Symptom: `angularjs/README.md` line 5, `angularjs/API.md` line 5 and the `demo/angularjs/examples.html` intro said "two independent files" / "copy one or the other" after `llselect.uiCompat` gained a dependency on the `llselect` module; SPEC.md had already been updated.
  - Impact: an app that loads only the bridge file now fails at bootstrap with `$injector:modulerr`, and the documents contradicted themselves within one page.
  - Fix: all three state the dependency.
  - Q: Why a hard module dependency, not an optional `$injector.has('llselectConfig')` lookup that keeps the modules independent?
    - A: Because README and API.md already required `llselect-angularjs.js` to be loaded, and an app can only set an app-wide default by having the `llselect` module in its graph, so independence was a promise nobody could use; the optional lookup would fail silently when it misses.
- [x] **[MEDIUM-140] - the bridge's config rule admitted `popupWidthPolicy` on paper and refused it in code**
  - Symptom: the first cut took only `uiTranslationPack` from `llselectConfig` and justified it as "the house-style setting ui-select's markup has no word for"; `popupWidthPolicy` fits that description too, so an app setting it once got a different popup width on `<ui-llselect>` than everywhere else, the same mixed-look symptom the pack fix removed.
  - Fix: the bridge takes both keys. API.md states the discriminator once: `arrow` (the caret is always rendered), `filterable` (`search-enabled` is ui-select's word) and `highlight` (the row template's own `| highlight:` filter) follow ui-select. SPEC.md carries the contract sentence; the code comments point at API.md.
  - Q: Why not take the other three as well, for symmetry?
    - A: Because on ui-select's own markup they would override ui-select's own conventions, which is what a migrating call site expects to hold; the two taken keys have no ui-select convention to defer to.
- [x] **[DOCUMENTATION-141] - stale section numbers the renumbering sweep missed**
  - Symptom: `demo/examples.html` (the 11.6 hint) still said "subclass instead: section 14"; the `demo/style.css` banner still read "15. popup header / footer slots"; `demo/data.js` labelled the rich item-content data "(section 10)", a pre-existing error, since its users are the section 11 renderers.
  - Fix: 13, 14 and 11; the grouped data names "sections 10 and 11.3".
- [x] **[QUALITY-142] - the AngularJS section 14 hint was over every hint limit**
  - Symptom: about 95 words, sentences up to 28 words, two parentheses, eight code names; and it never said that the page's own copy stays English or where RTL is shown.
  - Fix: shortened to sentences under 20 words with no parentheses; two closing sentences say the page copy stays English and that RTL lives in the core demo, section 16.
- [x] **[QUALITY-143] - the negative half of the bridge's config contract and the multiple-mode pack were untested**
  - Fix: `angularjs/test/llselect-ui-select.test.mjs` pins that `arrow` / `filterable` / `highlight` from config leave the bridge alone while `popupWidthPolicy` reaches it, and that a config pack reaches `<ui-llselect multiple>` (the tag remove button's aria-label).
  - Q: Why did the first cut of the filter assertion fail on the query "al"?
    - A: Because Angular's `filter` filter matches every property of an object, and `String(false)` contains "al"; the query is "bob".
- [x] **[DOCUMENTATION-144] - the pack rationale was written out four times; SPEC's defaults list lacked `highlight`; the README bridge section said nothing about the new door**
  - Fix: the reason lives in API.md only; SPEC.md carries the contract sentence and the full five-key list; the file header and the assignment comment point at API.md; README "Implementation notes" gained two bullets, each pointing at API.md.
- [x] **[DOCUMENTATION-145] - the instance-access example still required only two directives**
  - Symptom: `angularjs/API.md` "Reaching the instance from your own directive" said all three directives publish a controller, but the copied `ownDisabled` example required only `llselectSingle` / `llselectMultiple`, so on a `<ui-llselect>` it fell into the native branch and toggled a `disabled` attribute nothing honors.
  - Fix: the example and its pinned test (`angularjs/test/llselect-angularjs.test.mjs`) require `ui: '?uiLlselect'` as well and pick `ctrls.single || ctrls.multiple || ctrls.ui`; the test asserts the bridge trigger is disabled too.
- [x] **[QUALITY-146] - the bridge's module dependency was not pinned**
  - Symptom: every bridge test booted with both modules listed, so reverting `llselect.uiCompat` to `[]` would have kept the suite green while breaking apps that list only the bridge module.
  - Fix: a test boots with `deps: ['llselect.uiCompat']` alone, the two files loaded in reverse order, and asserts a config pack still reaches the widget.
- [x] **[DOCUMENTATION-147] - a module dependency was described as a script load order**
  - Symptom: README, API.md, SPEC.md and the bridge's own comment said `llselect-angularjs.js` "must load first"; AngularJS records module definitions at load and resolves their dependencies at bootstrap, so either order works when both files are loaded before it.
  - Fix: all four say both files load before bootstrap, in either order, and that listing `llselect.uiCompat` brings `llselect` in transitively.
- [x] **[QUALITY-148] - the AngularJS section 14 title named a path the example does not run**
  - Symptom: the title said the pack comes "from llselectConfigProvider", but the page's config sets only `arrow`; the packs arrive through `setUiTranslationPack` from the `$translate` watch.
  - Fix: "UI language switch: instance().setUiTranslationPack follows $translate"; the provider seeding stays in the hint as the way an app picks its language once.
- [x] **[LINT-149] - markdown links with heading anchors reported as rule violations (rejected)**
  - Symptom: the `README.md#files` and `API.md#ui-llselect` links in the AngularJS docs were flagged under the "never hardcode a runtime-generated anchor" rule.
  - Fix: none.
  - Q: Why keep markdown-to-markdown `#anchors` when the rule bans hardcoded anchors?
    - A: Because the rule targets runtime-generated slugs nothing checks (the demo pages' section ids); markdown heading anchors are verified by `npm run check` (dead anchors fail the build) and are the house practice throughout the docs.

## review (leading / trailing rows, construction context, this, pinned blocks, filter-query event)

Process: the design settled by the unframed two-stage review (`archive/choose-all-and-callback-context-research.md`, rounds 13-14), then six commits `937e5db` to `9581257`, then one whole-committee review of the change set (six fresh sessions, Codex Sol rerun with a longer cap after a timeout), then this fix batch and its post-fix panel review. The post-fix review (Opus 4.8, Opus 5, Codex 5.5, Codex Sol) confirmed every fix and raised the follow-ups folded into the entries: the A11Y row for Alt+ArrowUp, the archived handoff's paths, the render-time `data-edge-to-items` attribute that zeroes the line between two touching pinned blocks, an inset test starting from a scroll position a browser can hold, a grouped-plus-pinned scroll test, one comment and two prose trims, and the pinned-row scroll assertions now step onto an item first, because Home on an already-active row returned before the guard. A second post-fix pass over those follow-ups found wording and one style item. Examples: an archived path one level short; "below" for "above the browser floor"; a wrapper docstring that said "under it" for both edges; an "only attribute" claim; a compressed `chooseAllRow` sentence; the arrow-function half of the pack's `this` note; the missing eyeball check for two touching pinned blocks; double-quoted attribute selectors in the themes. Two docs commits close the round.

- [x] **[HIGH-124] - grouped items no longer scrolled into view**
  - Symptom: with `itemToGroupKeyFn` on a list taller than the popup, arrowing or End moved `aria-activedescendant` onto an item outside the scrollport and the list did not scroll. Every reviewer but one found it; the two flat-list demos hide it.
  - Cause: the new `scrollRingEntryIntoView` (`src/base.ts`) decided "this row is inside a pinned wrapper" by `el.parentElement !== popupListEl`; an item inside a `role="group"` container has the group as its parent, so it was skipped too.
  - Fix: the guard asks the two wrappers `contains(el)`; everything else scrolls with the wrappers' measured heights as insets.
  - Verified: `test/pinned-rows.test.ts` now drives the widget's own scroll path on stubbed geometry: End on a flat list, End on a grouped list, a pinned row that never scrolls, an item half under the pinned block scrolling past it.
  - Q: Why did 523 green tests miss a scroll regression?
    - A: Because jsdom has no layout: every rect is zero and `scrollTop` never moves, so a guard that returns early and a scroll that does nothing look the same. The scroll helper had pure unit tests; the path from the widget to it had none.
- [x] **[HIGH-136] - Alt+ArrowUp cleared the filter instead of closing (pre-existing; since `9581257` it also fired the event)**
  - Symptom: Alt+ArrowUp maps to the Close action like Esc, and the two-stage rule "clear a non-empty query first" ran for it too: with a query typed, Alt+ArrowUp emptied the query and left the popup open, and after `9581257` fired `onFilterQueryChange('')` for a close gesture.
  - Cause: the Close branch in `handleKeydown` tested the action, never the key.
  - Fix: the two-stage clear runs only for `ev.key === 'Escape'`; Alt+ArrowUp always closes, and the close resets the query silently. A11Y.md's filter-active keyboard table gains the Alt+ArrowUp row and the Focus rule names both gestures.
  - Verified: `test/filter-query-change.test.ts` pins Alt+ArrowUp with a query typed: closed, query empty, no event.
- [x] **[MEDIUM-125] - two lines between two adjacent pinned blocks**
  - Symptom: both blocks pinned and no item between them (a filter matching nothing, or `hideChosenRows` hiding everything): the leading wrapper's `border-bottom` and the trailing wrapper's `border-top` stacked into a 2px line, where the unpinned case draws none.
  - Fix: the library sets `data-edge-to-items` on each wrapper on every render, `"true"` while items are listed. The themes draw the edge line only then. Two blocks that touch draw no line, matching the unpinned case.
  - Q: Why a render-time attribute, not a CSS adjacency rule?
    - A: Because `+` can only drop the trailing block's top line. The leading block's own bottom line needs `:has()`. `:has()` is above the browser floor. The first cut used the adjacency rule and still drew one line.
  - Verified: `test/pinned-rows.test.ts` pins the attribute flipping with the filter; layout is jsdom-blind (the "Pinned rows pass" in `TODO.md` covers the eyeball).
- [x] **[MEDIUM-126] - `LLSelectConstructionContext` overstated who receives it, and had no `@group`**
  - Symptom: its TSDoc said "the functions that the constructor calls" receive it; four of the six construction-time functions do not (the trigger builders get their own data). Without `@group`, TypeDoc dropped the type into a trailing "Interfaces" section.
  - Fix: the bullet names the two receivers and says the trigger functions get their own data; `@group Popup slots`.
- [x] **[MEDIUM-127] - the `this` rule had an undocumented exception**
  - Symptom: DESIGN.md said `this` is `undefined` in every function-typed setting, but the translation pack's three message functions are still called as methods of the pack.
  - Fix: kept as a documented exception (DESIGN.md, README, `popup-rows-and-callbacks.md` 4.10, and the pack contract's own TSDoc in `src/i18n.ts`): a pack may read its own other messages through `this`. Neutralizing it would break that legitimate pattern for pack authors.
- [x] **[MEDIUM-128] - "visible" in the select-all docs ignored `hideChosenRows`**
  - Symptom: `getVisibleEnabledItems()` and `toggleAllVisible()` documented "visible" as "matches the filter query; with no query, every item", but `hideChosenRows` also removes chosen items from `getVisibleItems()`.
  - Fix: both docstrings, and the A11Y.md "Choose-all" scope sentence, define visible as membership in `getVisibleItems()`: matches the query, and with `hideChosenRows` not chosen; the two "preserved either way" sentences name the hidden chosen items too, and the `chooseAllRow` docstring points at `getVisibleEnabledItems()` for the set instead of restating it.
- [x] **[QUALITY-129] - the widget's scroll path and two pinned-block paths had no test**
  - Fix: the four scroll-path tests of HIGH-124, a trailing-block presence test, and an in-place rebuild of a pinned action row keeping its wrapper and the active option; `test/settings-this.test.ts` now also pins `onFilterQueryChange` and `groupKeyCompareFn`; the AngularJS suite gains the inside-digest and error-routing cases for `ll-on-filter-query-change`.
- [x] **[QUALITY-130] - the scroll helper lost its rationale**
  - Symptom: rewriting `ensureVisibleInScroll` dropped the two non-obvious reasons (rect deltas, not `offsetTop`; `clientTop` / `clientHeight`) that DESIGN.md "Optgroup" still points at.
  - Fix: restored at the tail of the docstring, after the inset bullets.
- [x] **[DOCUMENTATION-131] - rename leftovers in the contracts**
  - Symptom: A11Y.md "Choose-all" still said "Action rows before the items"; DESIGN.md "Action rows" still called the visible-enabled subset protected.
  - Fix: both sentences updated; the naming table gains a row for the now-public `getVisibleEnabledItems`.
- [x] **[DOCUMENTATION-132] - the rename rewrote history, and the handoff stayed in the living docs**
  - Symptom: the identifier sweep changed commit subjects quoted in `TODO.md` (P2-b, P2-c) and in the handoff into text no commit ever had, produced the non-name `AfterItemsEl`, and left the handoff's "open decisions" reading as still open after everything landed.
  - Fix: the two TODO entries restored from git; the handoff moved to `archive/` with a status line, the real subjects and the decided names; the pointers in `TODO.md`, `popup-rows-and-callbacks.md` and the research archive updated.
  - Q: Why restore the old names in ticked TODO entries instead of updating them?
    - A: Because a quoted commit subject is a lookup key for `git log --grep`; a rewritten one finds nothing. History entries keep the names of their time; the living docs carry the new ones.
- [x] **[LINT-133] - prose over the CLAUDE.md limits**
  - Symptom: one README sentence of 29 words with three clauses; the demo 14.1 hint grew and said "next to it" for two different elements; two misaligned rows in the naming table.
  - Fix: the sentence split into four; the hint shortened and the button named; the rows realigned.
- [x] **[MEDIUM-137] - the action-row docs said rows always scroll**
  - Symptom: the `popupListLeadingActionRows` TSDoc and the README said rows scroll with the items and sent "content that must stay put" to the slots, which the pin flags now contradict.
  - Fix: both say "unless the block is pinned" and send content that is not a command to the slots.
- [x] **[LINT-138] - positional locals and a stale wrapper comment**
  - Symptom: `replacePopupListActionRowElsInDom` still named its locals `before` / `after`, the AngularJS wrapper `actionRowsBefore` / `actionRowsAfter`, and its `wireEventAttr` comment described only the open and close events.
  - Fix: leading / trailing locals; the comment names the third event and the `toLocals` argument.
- [x] **[QUALITY-134] - action rows rebuilt twice on one toggle (pre-existing, accepted)**
  - Symptom: `toggleItem` on a multiple whose choose-all row disappears runs `renderPopupList` (rows rebuilt) and then `fireChange` rebuilds the rows again; the same on `setChosenItems`.
  - Fix: none; the second rebuild is O(rows), yields the final state, and predates this change set. Recorded so the next reader does not rediscover it.
- [x] **[QUALITY-135] - `this: void` in the callback types (deferred)**
  - Symptom: the `this` rule holds at runtime only; a non-arrow function that reads `this` compiles.
  - Fix: deferred; noted in `TODO.md` "API design review". Adding `this: void` to about 30 function types is a separate, mechanical change once the shape is agreed.

## review (popup header / footer slots and action rows)

Process: design research plus four committee rounds recorded in `archive/popup-slots-research.md`, then the implementation in eight commits (plan: `TODO.md`), then one whole-committee review of the change set (round 5) - its findings below, most severe first, fixed in one batch.

- [x] **[MEDIUM-110] - an AngularJS action row that writes the model counts as a programmatic change**
  - Symptom: with the documented recipe `onActivate: function () { vm.langs = [] }`, "Clear all" empties the model, but the form control stays pristine and `ng-change` never runs - a footer count updated from `ng-change` goes stale.
  - Cause: the model write reaches the core through `$render` -> `setChosenItems` inside the directive's gate, which drops the core's `onChange`; only core-originated changes flow back through `$setViewValue` (the rule `angularjs/API.md` states for every model write).
  - Fix: the wrapper hands `onActivate` the widget instance as its first argument (committee round 6, 4:2; the owner picked it): `onActivate: function (sel) { sel.setChosenItems([]) }` fires the core `onChange` outside the write-back gate, so it reaches `ng-model` through `$setViewValue` like a click - `ng-change` runs, the control turns dirty. A plain model write stays programmatic, and API.md says to pick one. Only `onActivate` gets the argument; the render fns receive nothing (6:0). Demo 13 shows the instance form with an `ng-change` counter.
  - Verified: angularjs tests pin the dirty state and `ng-change` on the instance path, the pristine state on the model-write path, and one shared descriptor array serving two widgets each with its own instance.
  - Q: Why give the wrapper's `onActivate` an argument while the core's descriptor passes nothing and the core callback-context review is still open?
    - A: The argument is the wrapper's own call into app code, not the core's; the wrapper can re-map it whatever shape the core later settles on, and an ES5 handler ignores an argument it does not name. The alternative was a `require`d controller directive for a one-line command - a tax out of proportion to the feature. The minority (2 of 6) preferred waiting for the core review; the Q&A records that the wrapper must follow the core's eventual shape when it lands.
- [x] **[QUALITY-111] - double divider between the choose-all row and the first row before the items**
  - Symptom: with `chooseAllRow: true` plus `popupListActionRowsBeforeItems`, that boundary drew two stacked 1px lines in every theme, against the rule's own comment.
  - Cause: the choose-all row carries `itemClass`, so it matched the `.llselect-item:not(.llselect-popup-list-action-row) + .llselect-popup-list-action-row` divider while keeping its own `border-bottom`.
  - Fix: the left operand also excludes `.llselect-choose-all-row`, in all five themes; superseded by QUALITY-123, which moved every divider to the block edges.
  - Q: Why not keep the choose-all row's own `border-bottom` and merely exclude it from the new rule?
    - A: Because the row's own line then sits INSIDE the command block once rows before the items exist (choose-all, line, command, line, items - two lines in three rows). A line belongs to a block edge, not to an element; drawing it as the next element's `border-top` renders identically when no command rows exist and draws one line otherwise. "Do not restyle an old element" was the wrong lesson: the old element's line was a block edge in disguise.
- [x] **[QUALITY-123] - two lines inside the command block above the items**
  - Symptom: with `chooseAllRow: true` plus rows before the items, the popup showed choose-all, a line, the command row, a line, the items - a line under every command row, unlike the one-line-under-the-block look of ng-select, Element Plus and Vuetify's select-all recipe (owner's eyeball on demo 15.1).
  - Cause: the choose-all row drew its own `border-bottom` regardless of what followed it.
  - Fix: the choose-all rule loses its border; the divider block draws one `border-top` on the first item or group after the choose-all row or after a command row, and one on the first command row after the items - identical pixels without command rows. All five themes; `TODO.md` manual pass item (e) reworded.
- [x] **[QUALITY-116] - `setItems` left action rows stale after a compare-equal reload**
  - Symptom: while open, `setItems` with new objects for the same keys swapped the chosen references (no change fires), but a row whose `textFn` reads `getChosenItem()` kept the old object's fields.
  - Cause: `renderPopupList` built the rows before the variant's `onItemsChanged` swapped the references.
  - Fix: `setItems` calls `replacePopupListActionRowElsInDom()` after `onItemsChanged` (a no-op without rows); pinned for both variants in `test/action-rows.test.ts`.
- [x] **[QUALITY-115] - the AngularJS descriptor clone read `onActivate` live**
  - Symptom: reassigning `row.onActivate` on the app's object after link changed what the widget ran, while the other fields were snapshotted - against `API.md`'s "the objects are copied".
  - Fix: the wrapper snapshots `onActivate` too; a post-link mutation test covers the array and every field.
- [x] **[DOCUMENTATION-112] - three docblocks were detached from their declarations by insertions**
  - Symptom: `LLSelectBaseSettings` lost its TSDoc in the generated reference (the new `LLSelectPopupListActionRow` interface landed between the docblock and the interface); the `PopupListSegment` comment sat above the new ring types; the `labelEl` comment sat above the copied row arrays.
  - Fix: the insertions moved above the docblocks they had split.
- [x] **[DOCUMENTATION-113] - the README lost the "Subclassing (extending the library)" heading**
  - Symptom: the subclassing guide rendered inside the new "Action rows" recipe.
  - Cause: the recipe replaced the heading line instead of inserting above it.
  - Fix: heading restored.
- [x] **[DOCUMENTATION-114] - A11Y.md ring wording ignored the rows before the items**
  - Symptom: "ArrowUp from the topmost item continues onto the choose-all row" and "ArrowDown returns to the first enabled item" are false when rows sit before the items; the Page-key line promised "the ring's end entry" (a disabled end row is skipped); the open-focus summary said "else the first option", which could read as a row.
  - Fix: reworded to the previous / next ring entry, the nearest enabled entry, and the chosen item / choose-all / first enabled item priority.
- [x] **[DOCUMENTATION-117] - new overridable methods missed the docstring rule**
  - Symptom: `onPopupListActionRowActivated` named neither its caller, the source of `row`, nor that an override must call `super` or the entry's `onActivate` stops running; `createPopupListActionRowAfterItemsEl` and `createPopupFooterEl` said "same contract as ..." instead of being self-contained; `isPopupListActionRowDisabled` sat in the rendering group beside the builders.
  - Fix: all three rewritten in the CLAUDE.md order; the predicate moved to "Subclassing: semantics" beside `isGroupDisabled`.
- [x] **[DOCUMENTATION-118] - README recipes did not run as written, and the new table rows broke the prose limits**
  - Symptom: `isSameSet` was never defined; "Enter, Space or click" hid that Space types into an active filter; the footer count started blank; two capabilities rows carried parentheticals and three code names.
  - Fix: helper defined in the snippet, Space qualified, count seeded, rows trimmed.
- [x] **[DOCUMENTATION-121] - AngularJS docs over-claimed the slot digest and said nothing about async commands; the demo showed half the attributes**
  - Symptom: "runs inside the link digest" is false for a manual `$compile` outside a digest; an `onActivate` that awaits leaves the view stale like `ng-click` would; the demo had only the footer slot and the after-items rows.
  - Fix: `API.md` reworded (at link time, inside whatever digest compiles the element, if any; digest yourself after an `await`); demo sections 12 / 13 show all four attributes.
- [x] **[QUALITY-120] - demo 15.2 could add a duplicate item**
  - Symptom: entering an existing country appended it again, against the items-unique contract.
  - Fix: an existing name is picked, not added.
- [x] **[QUALITY-122] - three promised behaviors were untested**
  - Symptom: nothing pinned that rows rebuild AFTER `onChange` (moving the call earlier would stay green), that an AngularJS row activated from inside a digest takes the `$eval` branch, or that post-link edits to the app's array do nothing.
  - Fix: one test each (`test/action-rows.test.ts`, `angularjs/test/llselect-angularjs.test.mjs`).
- [x] **[LINT-119] - "action" and "slot" each named a second thing; a DOM-writing helper lacked its suffix**
  - Symptom: `findEnabledRingPositionForAction` meant the keyboard action right beside `focusActionRow`; DESIGN.md and the naming table called the row positions "slots", the header / footer word; `replaceActionRowEls` wrote the DOM without `InDom`.
  - Fix: `findEnabledRingPositionForKeyboardAction`, "positions", `replaceActionRowElsInDom`; the ring test's stale "position -1" comment reworded.

- [x] **[DOCUMENTATION-109] - row-index docstrings named `items` instead of the rendered list, and called the ids "stable"**
  - Symptom: `createItemEl`'s `@param index` said "index in `this.items`" and the `focusedIndex` field said "Index (into `items`)"; both values are positions in `getVisibleItems()` - the list as rendered (gathered by group, filtered, minus hidden chosen rows) - which differs from `items` whenever any of those steps applies (`src/base.ts` `createItemEl`, `focusedIndex`). `createGroupEl`'s param line said the index "builds a stable id" (`src/base.ts` `createGroupEl`): nothing reads a group id, and whether id-text stability across an in-place row swap matters to assistive technology is unverified (committee round 3c), so "stable" claimed a benefit nobody has measured.
  - Cause: the docstrings predate gathering, filtering and `hideChosenRows`; `renderPopupList` always mapped the visible list.
  - Fix: all three lines now name `getVisibleItems()` and say what the index is used for (minting the row id `aria-activedescendant` points at); "stable" is gone. The owner then ruled the `createItemEl` docstring itself unfit: a dense internals paragraph that never said who calls the method, who supplies `index`, or how to override it. Both `createItemEl` and `createGroupEl` are restructured to the house shape - lead sentence, then one fact per bullet: who calls it, params supplied by the library and forwarded to `super`, what `index` means and is NOT, the super-then-edit override shape, internals last - and CLAUDE.md's docstring rule now requires that order for every overridable method. Post-fix panel review batched with the action-row implementation, which touches the same docstrings.
  - Verified: the round-5 review read every new and rewritten overridable-method docstring against the rule; its remaining gaps are DOCUMENTATION-117, fixed in the same batch.

## review (prefix typeahead)

Process: implementation of the maintainer-ratified typeahead rulings (`DESIGN.md` "Prefix typeahead"), then seven post-fix panel rounds (commit subjects count FIX BATCHES, one behind the round that reviewed them) - the other four members (Opus 5, Opus 4.8, Codex Sol at max, Codex 5.5 at xhigh) reading the repo read-only through the CLI channels in `CLAUDE.md`, commit diff inline in the brief. Round 1: three of four independently found HIGH-95. Round 2 verified the round-1 fixes and surfaced the second half of MEDIUM-96 plus QUALITY-98. Rounds 3-7: light rounds on the nit batches (DOCUMENTATION-100 onward); the Final_Sigma fold took three changes across rounds 3-5 to become symmetric; round 6 caught the release-data row the 0.0.8 bump had missed (DOCUMENTATION-108).

- [x] **[HIGH-95] - closed-state typeahead landed on the second match**
  - Symptom: single with nothing chosen, `['apple','avocado']`, closed, press "a" - the active option became avocado; `A11Y.md` promises the first match.
  - Cause: the closed branch called `open()` first, `focusInitial` parked the convenience focus on item 0, and a one-character search starts AFTER the current index - so index 0 was skipped (`src/base.ts` `handleTypeaheadKeydown`).
  - Fix: a type-opened popup anchors on `computeTypeaheadClosedStartIndex` - base `-1` (first match from the top), single overrides with the chosen item's index. Open-state typing still anchors on the visual focus.
  - Verified: `test/keyboard.test.ts` "lands on the FIRST match" + "cycles past the chosen item"; found independently by three round-1 reviewers.
  - Q: Why anchor single mode on the CHOSEN item instead of always `-1`?
    - A: Native anchors on the selection - typing "b" with banana chosen reaches blueberry in one press. `-1` would land back on the chosen item and cost a second press. With nothing chosen the two agree.
- [x] **[MEDIUM-96] - the printable-key modifier gate was wrong twice**
  - Symptom: round 1 shipped reject-all-modifiers, losing AltGraph and macOS Option characters (real text). The round-2 fix accepted all Alt chords, letting Windows plain Alt+D typeahead and swallow `accesskey` / address-bar chords.
  - Fix: reject Meta and Ctrl-only; accept an Alt-carrying chord only when the delivered key is no longer a bare ASCII letter or digit (produced text changes the key - "@", "a-ring"; an unchanged letter is a shortcut chord). Known cost: a non-ASCII `accesskey` chord (Alt+Shift+o-umlaut) is swallowed while the trigger holds focus.
  - Verified: gate tests in `test/keyboard.test.ts` (Ctrl-only / Meta / plain-Alt pass through untouched; AltGraph "@" and Option "a-ring" type); the real-layout pass is queued in `TODO.md`.
  - Q: Why the delivered-key heuristic, not `getModifierState('AltGraph')`?
    - A: AltGraph reporting for macOS Option is uncertain on Safari, jsdom cannot construct that state for tests, and the heuristic also rejects VoiceOver's Ctrl+Option chords (they deliver bare letters). The delivered key is itself the evidence that text was produced.
- [x] **[MEDIUM-97] - repeated-character buffers tried a literal doubled-prefix match first**
  - Symptom: `['alpha','avocado','aachen']` with alpha active, "a" twice landed on aachen instead of cycling to avocado. `A11Y.md` says "repeating one initial cycles", and native folds an all-same buffer to its single character.
  - Cause: the first implementation copied the W3C APG example, which is the outlier on this rule.
  - Fix: cycle-always. The repeated test folds code points one by one, so the Turkish dotted capital I (lower-case form expands to two units), astral characters (`buffer[0]` had been a lone surrogate), and a mid-repeat Shift ("aA") all still cycle.
  - Verified: pure tests for all four shapes; the divergence from the APG example is recorded in `DESIGN.md`.
  - Q: One round-1 reviewer defended literal-first - why did cycle-always win?
    - A: Native parity, the already-written contract line, and simpler code. A text really starting "aa" is still reached by the cycle, so nothing becomes unreachable.
- [x] **[QUALITY-98] - the closed-anchor hook shipped without a verb prefix**
  - Symptom: `typeaheadClosedStartIndex` is protected, so it lands in the `.d.ts` and the TypeDoc reference; `naming-conventions.md` fixes the method vocabulary, and renaming after a release breaks subclassers.
  - Fix: renamed to `computeTypeaheadClosedStartIndex` (derive-at-use-time - the `computeFilterActive` precedent) before any release carried it.
- [x] **[DOCUMENTATION-99] - typeahead contract wording drifted from the code in six places**
  - Symptom: "commit stays Enter" (Space also activates); "under 1 s" (code extends at exactly 1 s); the reset-key list missed Home / End / Page; the `filterable` TSDoc claimed the predicate runs only at open (closed typing consults it read-only); DESIGN said "consistent with the filter's default compare" (that compare is substring, typeahead is prefix); the README had no reader-facing behavior section, its IME bullet led with the fix instead of the reason, and "highlight" named the focused option against the naming ruling.
  - Fix: all reworded; the README gained the "Typing to jump" section and a capabilities-table row.
  - Verified: round-2 reviewers re-checked each rewording against the code.
- [x] **[DOCUMENTATION-100] - the README typeahead section reused "focus" for the focused option**
  - Symptom: "It only moves the focus" - everywhere else in the README "focus" means DOM focus, which typeahead never moves (it stays on the trigger); the same reserved-word slip the "highlight" rewording had just removed.
  - Fix: "It only moves the focused option".
- [x] **[QUALITY-101] - the multi-character needle was folded as a whole string (Greek Final_Sigma)**
  - Symptom: buffer "ALPHA-SIGMA" (Greek capitals) lower-cased as a string turns its final sigma into the final-form sigma, while the option text folds the same sigma mid-word - the prefix never matched.
  - Fix: BOTH operands fold per code point (`foldForTypeahead`), and the fold maps the Greek final sigma to sigma so the final-sigma KEY matches upper-case text; the first fix folded only the needle, and the round-3 / round-4 passes caught that an option text ENDING in sigma (or before a space) then failed the other way.
  - Impact: the text side now spreads, maps, joins and regex-scans each candidate instead of one `toLowerCase` - negligible at keydown pace on visible-item counts.
  - Verified: pure test "Greek sigma folds the same on both sides" covers mid-word, trailing, the final-sigma key, and sigma before a space.
  - Q: Why not fold both operands as whole strings and accept the Final_Sigma edge?
    - A: Because the buffer is a PREFIX: its last character is always "final" to `toLowerCase`, while the same character sits mid-word in the option text - whole-string folding can never agree on a trailing sigma. Once the fold also maps final sigma to sigma, whole-string and per-code-point folding agree on every input (Final_Sigma is Unicode's only non-locale conditional lower-case mapping); the per-code-point split stays as the backstop should another conditional mapping ever land.
- [x] **[DOCUMENTATION-102] - the accesskey pass-through claim was over-general**
  - Symptom: the MEDIUM-96 fix line and TODO item (d) read as if every `accesskey` chord passes through; only bare ASCII letters / digits do - a non-ASCII accesskey (Alt+Shift+o-umlaut) is swallowed while the trigger holds focus.
  - Fix: both records now state the cost; `A11Y.md` was already precise.
- [x] **[DOCUMENTATION-103] - naming-conventions.md did not log the typeahead members**
  - Symptom: the doc claims coverage of every method and logs each round's new protected members, but the feature commit added `computeTypeaheadClosedStartIndex` (protected) and the keyboard.ts helpers without an entry - while QUALITY-98 cites that doc as the rename authority.
  - Fix: logged (method table + round prose). `appendTypeaheadChar` renamed `getUpdatedTypeaheadBuffer` on the way: `append*` is in no verb family, and the same file's `getUpdatedIndex` is the precedent for "next state from inputs".
- [x] **[DOCUMENTATION-104] - README said "Space always chooses"**
  - Symptom: closed Space OPENS the popup, and multiple-mode Space TOGGLES (it can unchoose); the sentence over-promised.
  - Fix: "Space never joins the prefix ... Space keeps its usual job: open when closed, choose or toggle when open."
- [x] **[DOCUMENTATION-105] - the hook docstring claimed the opening keystroke is always a one-character buffer, but a refused open kept the first character**
  - Symptom: `open()` refuses on a hidden anchor; the buffer already held the key, so a second key within 1 s could open with a two-character buffer - the docstring's claim was false for that path.
  - Fix: a refused open now empties the buffer (nothing opened, so nothing to prefix), which makes the claim true instead of softening it.
  - Verified: `test/keyboard.test.ts` "a refused open empties the buffer" (trigger parked above the viewport, then restored).
- [x] **[QUALITY-106] - reserved-term and commit-subject slips**
  - Symptom: two pre-existing test titles said "highlights" for the focused option (naming ruling: "highlight" = query-match marking only); the round-2 and round-3 commit subjects ran 149 and 143 characters, past the 140 hard limit.
  - Fix: test titles reworded to "focuses". Both long subjects STAY (round 2 at 149, round 3 at 143): both commits were already on `github/dev` / `gitlab/dev`, and published history is not rewritten - recorded here instead. The round-3 subject was in fact amended once, in a race with a push that landed between the status check and the amend; the round-5 panel caught the divergence, and the later commits were re-based onto the published commit (no force-push).
  - Q: Why not force-push the shorter subject, with lease, to both remotes?
    - A: A subject line is not worth a history rewrite on two remotes that other clones may already hold; the rule exists so nobody has to weigh that per case.
- [ ] **[QUALITY-107] - the filter's default compare has the Final_Sigma asymmetry the typeahead fold just fixed**
  - Symptom: `matchesQuery` (`src/base.ts:2650`) is `itemToString(item).toLowerCase().includes(query.toLowerCase())`; a query ending in a Greek capital sigma folds to the final form while the option text folds the same letter mid-word, so the query misses until one more letter is typed. Pre-existing; found by the round-5 panel while verifying QUALITY-101; substring matching makes it self-correcting, so it does not block 0.0.8.
  - Fix: none yet - fold both sides through the typeahead fold (it would become a shared helper; the `filterFn` contract is untouched). Audit `src/query-highlight.ts:31` in the same change: it mirrors the whole-string lower-case rule by design, so the mark placement must keep agreeing with the match.
- [x] **[DOCUMENTATION-108] - the 0.0.8 bump left the README bundle-size row at 0.0.7 / 40.7 KB**
  - Symptom: the row is a matched measurement pair (version, minified UMD bytes) and README ships inside the tarball, so 0.0.8 would have published a row contradicting the bundle beside it. Three round-6 reviewers found it; the 0.0.7 bump had touched that data, the 0.0.8 bump did not.
  - Fix: re-measured on the 0.0.8 build with the benchmark page's own formula (`dist/index.umd.js` 43,007 bytes / 1024 = 42.0 KB) and both cells updated - never a blind version-string swap. `scripts/check.mjs` now also asserts that the angularjs package version and its `@llselect/core` peer range follow the root version, the one release wiring nothing guarded.
  - Q: Why not automate the README row too?
    - A: The other rows are CDN measurements taken by hand at benchmark time; a script that rewrote one row would make the table half-live, half-snapshot. The check guards what is mechanical (versions); the data row stays a deliberate release step, now recorded here.

## review (external, ChatGPT API-design review - five-model panel)

Process: the owner fed the generated API reference (`public/api/`) plus README to ChatGPT, which returned nine "should change" items; the owner added their own questions. Convened as a design fork BEFORE any execution: Fable 5 (convener; its position written before reading the others), Opus 5 (max), Opus 4.8 (max), Codex Sol (max), Codex 5.5 (xhigh, its ceiling), each reading the repo read-only through the CLI channels recorded in `CLAUDE.md`. Every behavioral claim below was re-verified by the convener with a tsc or jsdom probe. Unanimous rejections are logged `[x]` with the reason kept. The owner then ruled on the rest: the approved fixes landed (`[x]`, with the post-fix review's findings folded in), QUALITY-89 was ruled last (part A landed, part B rejected); the round holds no open items.

- [x] **[QUALITY-81] - (rejected) forbid constructors from calling overridable methods; "solve" the constructor trap with two-phase init or a factory**
  - Symptom claimed: `LLSelectSingle` / `LLSelectMultiple` constructors call `this.renderTrigger()` right after `super()`, and (at the time) the base constructor reached `createTriggerClearButtonEl` / `createTriggerClearButtonContentEl` through the private `createTriggerEl` when `clearable` - since QUALITY-89 the first trigger render builds the button instead. A THIRD-level subclass's field initializers have not run yet, so an override reading its own fields sees `undefined` on that first render. MEDIUM-78 documented this; the reviewer wants it eliminated.
  - Fix: none - 5:0 REJECT of the prescription; MEDIUM-78 stands. The one real residue - the clear-button methods `rerender()` could NOT repair - was QUALITY-89, since resolved.
  - Q: What would "solved" concretely look like, and why is each shape rejected?
    - A: (1) Static factory + protected constructor (`LLSelectSingle.create(el, settings)`): the only true elimination - `new` must become unavailable, every call site changes (README, demos, tests, both ES5 wrappers), and third-party subclasses need polymorphic `static create` typing over `<T, GroupKey, S>`. (2) A protected `init()` hook: JS has no point inside a base constructor that runs after every derived class's initializers, so it degenerates into caller-called two-phase init - the MEDIUM-78 rejection. (3) Deferred first render (microtask): `new` returns an empty trigger synchronously; breaks wrappers, tests and the benchmark's measured window. (4) Lazy first render on `open()` / `setItems`: the placeholder must show at construction. (5) ES2022 field order / `declare` fields: no effect - derived fields always initialize after `super()` returns. (6) Overridable methods read only `this.settings`: already true and already the supported answer - the typed `subclassSettings` channel (QUALITY-37) is merged before any base construction code runs, so construction-time CONFIG belongs there, and `rerender()` at the end of the extender's constructor covers genuine instance state. The docs should present (6) as the recipe, not as a warning (DOCUMENTATION-90 carries that wording).
- [x] **[QUALITY-82] - (rejected) a factory taking `items` and the initial value ("atomic" initial state, `T` inference)**
  - Fix: none - 5:0 REJECT. `items` / the value in the construction input is the second write channel DESIGN.md "Settings vs methods" rejects; a factory that just calls the setters is not atomic anyway (the trigger renders once with the placeholder and once on `setChosenItem`, which fires `onChange` - `meta.source === 'api'` already lets a handler ignore that echo); genuinely atomic construction needs a deferred-render internal constructor plus a "no `onChange` for initial state" rule. Two construction idioms forever, for a gain nobody has measured.
  - Q: Does a factory buy `T` inference that a constructor cannot?
    - A: No - TypeScript infers constructor generics from arguments exactly like a factory's. But the premise had a true half, now its own finding: QUALITY-83.
- [x] **[QUALITY-83] - `T` is inferred from `compareFn` only; every nullable callback setting leaves `T = unknown`**
  - Symptom: `new LLSelectSingle(el, { itemToStringFn: (u: User) => u.name })` failed to compile (`(u: User) => string` is not assignable to `(item: unknown) => string`); the same for `itemDisabledFn`, `onChange`, and the multiple's callbacks. Only `compareFn: (a: User, b: User) => ...` inferred `T`. Verified by tsc probes.
  - Cause: the constructor's `settings` param was typed only through the class's `S` param (`LLSelectSettingsInputOf<S>`, src/base.ts / src/single.ts / src/multiple.ts constructors), not in `T`, and `T` does not infer through that indirection for `Fn | null` members.
  - Fix: a NON-extending constructor overload typed directly in `T` - `constructor(targetEl, settings?: LLSelectSingleSettingsInput<T, GroupKey>)` ahead of the subclass form `(targetEl, settings?: LLSelectSettingsInputOf<S>, subclassSettings?)` (same for multiple). Additive; every existing call keeps compiling.
  - Verified: test/type-inference.test.ts pins inference from `itemToStringFn` / `onChange` / `compareFn`, `unknown` with no callback (`@ts-expect-error`), explicit `<string>`, and a subclass through the `S` channel; tsc strict + full suite + the tree-select demo green.
- [x] **[QUALITY-84] - (rejected) a discriminated union forcing `ariaLabel` / `ariaLabelledBy` / `labelEl`**
  - Fix: none - 5:0 REJECT; MEDIUM-47's warn stands. New arguments recorded: the union cannot reject `''` / whitespace (which the runtime treats as unset), so the warn must ship regardless; it needs a redesign of `LLSelectSettingsInputOf<S>` (a `Partial<>` mapping erases the requirement) and complicates the `S` channel; both wrappers build settings imperatively and would cast it away; plain-JS (UMD) users get nothing from a type.
- [x] **[DOCUMENTATION-85] - the `compareFn` docstring states neither its contract (equivalence relation) nor its cost**
  - Symptom: the docstring (src/base.ts `compareFn`) said "used for selection, dedup, matching" and nothing about cost. The Set fast paths (`isChosen` / `chosenSet`, `setChosenItems` dedup, the `hideChosenRows` subtraction, the `setItems` duplicate warn) run only for the DEFAULT `compareFn`; a custom one is linear everywhere and the duplicate check does not run at all (MEDIUM-77). A caller cannot "optimize" that from inside the callback - the O(n) is the library's algorithm, not the comparison.
  - Fix: none - owner ruling: too obvious to spell out (`setItems` already documents the skipped duplicate check for a custom compareFn, and the docstring already says symmetric). Only the default's identity rule was written down, as part of QUALITY-92.
  - Q: Why not the reviewer's `itemKeyFn: T => string | number` (replacing, or beside, `compareFn`)?
    - A: 5:0 against. `string | number` is the hard-coded key type CLAUDE.md s5 forbids (the correct shape would be a defaulted `ItemKey = T` generic and the name `itemToKeyFn` per naming s3 - a foundational break); a key cannot express the ui-select bridge's `angular.equals` structural identity; two identity settings are two truths. The reviewer's technical point (only a hashable key makes membership O(1)) is right; the owner's "the user optimizes compareFn" is not the reason to reject it - expressiveness and the single identity authority are. Revisit only on a measured custom-`compareFn` hotspot (PERFORMANCE-31 / -72 caches already bound the cost).
- [x] **[QUALITY-86] - (rejected) narrow the protected inheritance API into a renderer / adapter interface**
  - Fix: none - 5:0 REJECT. The `*Fn` settings already ARE the composed, content-only interface (deliberately unable to break ARIA); the protected methods are the extension layer, and their real users (the tree-select demo; the ui-select bridge wrapping `renderPopupList` / `renderTriggerContent` / `replacePopupListItemElInDom` / `close` for scope lifecycle) need `this` state, `super` chaining and lifecycle hooks a renderer object cannot express without growing into the same surface. An adapter object per instance also fights the mass-instantiation goal.
  - Q: Is the reviewer saying the current abstraction is badly factored?
    - A: No - it is the general composition-over-inheritance critique (constructor ordering, fragile-base-class coupling, a protected surface that is de facto public API under semver), which any reviewer raises against any class with ~60 protected members. No method was named as missing, overlapping or mis-scoped. The honest cost is the semver surface; the cheap mitigation, if wanted, is one DESIGN.md / README sentence that `protected` members are the extender API and follow semver, optionally split into customization points (meant to be overridden) vs mechanism (protected only so a subclass can call them: `withUserChangeSource`, `setFocusedIndex`, `findNextEnabledIndex`, `focusLeadingRow`, `replaceLeadingRowElInDom`).
  - Owner ruling: the semver sentence is not needed either. Nothing to do.
- [x] **[QUALITY-87] - (rejected) `subscribe()` or a DOM CustomEvent beside the frozen single callback**
  - Fix: none - 5:0 REJECT; QUALITY-36 stands. New arguments recorded: a CustomEvent on a plain `div` cannot be typed (no `HTMLElementEventMap` entry, so `detail` is `unknown` at every listener - against "native TypeScript support"); a per-change `dispatchEvent` allocation on 1000 widgets where nearly none listen; a second channel reopens callback-vs-event ordering; and neither shape solves wrapper echo suppression (the write-back gate stays). A plain `change` name is impossible anyway - the filter input's native `change` already bubbles through `rootEl`. Native parity (`<select>` fires `change`) is the only argument for it; if ever wanted, a namespaced `llselect:change` dispatched after the callback, on demand only.
- [x] **[QUALITY-88] - the AngularJS directives forwarded no open / close hook**
  - Symptom: no `ll-on-open` / `ll-on-close` attribute existed (angularjs/llselect-angularjs.js), and `instance()` cannot subscribe because `onOpen` / `onClose` are construction-frozen settings the directive owns - an app using the directives could not observe open / close at all. Surfaced by the panel while checking QUALITY-87; verified by grep.
  - Fix: `ll-on-open` / `ll-on-close` on both directives (`wireEventAttr`): an expression evaluated on EACH event like `ng-click`, phase-safe (`$eval` inside a digest, `$apply` outside). API.md "Shared attributes" documents it as a fourth binding mode, **Event expression**; an expression error goes to `$exceptionHandler` (inside a digest `$eval` has no routing of its own), and the close that `destroy()` runs at scope teardown fires it too (see the Q below).
  - Verified: angularjs tests pin the digest (an interpolated span updates on open and on close), a trigger click run inside `$apply` (no nested `$apply`), an expression error inside a digest reaching `$exceptionHandler` with the open still completing (focus lands in the filter input), and the teardown close (`ng-if` removing an open control) firing `ll-on-close` with nothing reported to `$exceptionHandler`.
  - Q: Should the close that `destroy()` runs at scope teardown fire `ll-on-close`?
    - A: Yes. The post-fix panel split - Opus 5: suppress it, the scope is dying; Codex Sol: fire it, the popup did close. Ruled for firing: core's `onClose` fires there and the directive maps 1:1 to it; an app's open-state cleanup (restore scrolling, drop a backdrop) must run when `ng-if` removes an open control; and AngularJS broadcasts `$destroy` before disabling the scope precisely so such handlers work. A first cut carried a suppress guard; the test now pins the firing.
- [x] **[QUALITY-89] - the clear-button methods were the only construction-time overridable methods `rerender()` could not repair; hide-when-empty stays a theme rule**
  - Symptom: src/base.ts `createTriggerEl` built the clear button once in the base constructor through the protected `createTriggerClearButtonEl` / `createTriggerClearButtonContentEl`; `rerender()` rebuilt trigger content and arrow only, so an extender override that read its own fields kept its first result forever - `setUiTranslationPack` even patched the button's `aria-label` by `querySelector` because nothing else re-rendered it. Separately, hide-when-empty is CSS in each shipped theme (`[data-empty='true'] .llselect-trigger-clear-button { display: none }`); core's `syncEmptyStateToDom` writes only `data-empty`.
  - Q: Was this about turning `clearable` off, or about showing the x only while something is chosen?
    - A: Neither. `clearable` stays a frozen capability (the DESIGN.md rule), and the "show it only when there is a value" behavior ALREADY ships - in the themes, via `data-empty`.
  - Fix: (owner ruling, part A) every trigger render rebuilds the clear button through `createTriggerClearButtonEl` (private `replaceTriggerClearButtonElInDom`: read whether focus is on or inside the old button, park it on the old button, build, insert the new button, move focus to it, then remove the old one; the first trigger render builds the button, every later one swaps it; a builder returning the same element keeps it, and focus goes back to the node that held it, if it is still inside the button and can take focus), so the documented remedy - `rerender()` at the end of the extender's constructor - repairs this override like every other trigger method. `setUiTranslationPack` dropped its `querySelector` patch (the rebuild reads the new pack). The `renderTrigger` docstring's exception bullet and DESIGN.md's "one wrinkle" sentence are gone.
  - Q: Why does core not hide the button while empty (part B)?
    - A: Owner ruling: hide-when-empty stays a theme rule on `data-empty` - consistent with the arrow's `:empty` rule, a custom theme author copies one line, near-zero downside. The panel had split 4:1 for core-side hiding; the dissent (Opus 4.8) won on consistency.
  - Verified: test/clear.test.ts pins a subclass override that reads its own field (wrong at construction, repaired by `rerender()`), the button staying in its slot and functional after the rebuild, focus following the rebuilt button, and no button appearing without `clearable`, the popup staying open when `rerender()` runs with the button focused, a single value change and a multiple clear click (the button replaces itself inside its own handler) each yielding a fresh, working button; test/i18n.test.ts (assertions unchanged) pins the pack rename through the rebuild. Post-fix review (Codex Sol): `document.activeElement` is the shadow HOST when the widget lives in a shadow root, so the focus hand-over (and `close()`'s focus return, the same read) now asks the element's own root (`isFocused`); pinned by shadow-root tests. The button is built once per construction (the first trigger render builds it; the base constructor no longer pre-builds a throwaway one - Opus 5 / Opus 4.8), pinned by a content-fn call count. The focus read happens before the next button is built, so a content fn that hands back the same icon element each time (reparented into the new button) does not lose the hand-over (Codex Sol); pinned by a reused-icon test. The parking itself is pinned from inside the content fn (the active element while the new button is built is the old BUTTON, not the icon); the same-element path hands focus back to the node that held it, or leaves it on the button when the override detached that node or moved it out of the button - all pinned (Opus 5 / Codex Sol, fifth pass); the focus read descends through open shadow roots inside the icon, so focus inside a shadow-rooted icon is handed back to the real element, not to its host (Codex Sol). The shadow-host climb follows only a Node-valued `host`: a detached `<a>` / `<area>` icon is its own root and carries a STRING `host` (its URL host), which would have thrown (Codex 5.5 / Opus 5, sixth pass; pinned). On the rebuild path, a fresh element that cannot take focus no longer lets the old button's removal drop focus to `<body>`: focus moves to the trigger (Opus 5; pinned). A11Y.md and the `renderTrigger` docstring carry both conditions. Real-browser residue in TODO.md.
  - Q: A memoizing builder with a focusable icon sees two extra focus transitions per render (icon -> button -> icon) although no DOM changed. Accepted?
    - A: Yes, for now. The parking exists because the builder may reparent the focused node, and whether it returns the same element is only known after it ran. The only cheaper shape skips the parking and repairs focus after the build, which reopens the reparent hazard on the fresh-build path. Both transitions stay inside the root, so the library's own guards are unaffected; external `focusin` / `focusout` listeners and AT re-announcement are the exposure - TODO.md item (e) checks it in a real browser.
  - Q: Why keep TS `private` for the new members instead of `#private` fields or module-scoped helpers, given that a JS subclass could overwrite a same-named property?
    - A: Every other private member of the class carries the same risk and the same TS `private`; singling three out would be inconsistent, and `#` members are ES2022 - below the ES2020 target they downlevel to WeakMap / WeakSet brand checks. The name-collision risk is accepted for the class as a whole (the names are long and specific).
  - Q: Why rebuild on every trigger render, like the arrow, not in `rerender()` only?
    - A: The first cut rebuilt in `rerender()` only, on the ground that a per-render rebuild would drop focus to `<body>` right after the clear click that caused the render. Two things were wrong with that. The replace now inserts and focuses the new button BEFORE removing the old one, so focus never leaves the root for a render that leaves a value chosen (removing a focused element first drops focus to `<body>` in every engine, and where the engine fires `focusout` on removal, with `relatedTarget = null`, which the open popup's guard reads as focus leaving - Opus 4.8). After a clear click the theme still hides the rebuilt button via `data-empty`, and focus is expected to end on `<body>` as before (real-browser check in TODO.md). And `LLSelectMultiple.setChosenItems` runs `rerender()` on every chosen-items write, so the "rerender() only" contract was already per write for multiple and per explicit repaint for single - two contracts (Opus 5). One rule now: every trigger render, like the arrow; the cost is one small element per value change.
- [x] **[DOCUMENTATION-90] - the generated API doc presented three "deliberate exceptions" to frozen settings and never stated the rule**
  - Symptom: `setUiTranslationPack`'s docstring said "a deliberate exception to constructor-frozen settings, like `setDisabled`", `setPlaceholder` said "like `setUiTranslationPack`", DESIGN.md "Texts (i18n)" said "in the same spirit as `setDisabled`", and both constructor docstrings said settings "are immutable afterwards". `disabled` was never a setting (QUALITY-46), so the docs themselves miscounted two copy exceptions as three, and the rule ("state and copy move at runtime; capabilities do not") lived only in agent-facing DESIGN.md - the reviewer read the docs correctly.
  - Fix: the three-way rule is stated once where API readers look, on the `LLSelectBaseSettings` docstring (state moves by method and never was a setting; the copy fields - the pack, `placeholder` - are the only settings with setters; everything else is a capability fixed for the instance's lifetime, with the function-valued setting as the runtime valve). Both setters and both constructor docstrings point there; the `setDisabled` comparisons are gone from base.ts and DESIGN.md "Texts (i18n)". DESIGN.md "Customization model" and the `renderTrigger` docstring now give the recipe (construction-time configuration goes into the typed `subclassSettings` channel; `rerender()` is for instance state) instead of a warning.
  - Verified: check green; `public/api/` regenerated by build:site. Post-fix review (Opus 5 / Opus 4.8 / Codex 5.5) swept the restatements the first pass missed: README's "frozen like every setting", demo 16.1's "the one deliberate exception" comment, DESIGN.md's lead example list (`placeholder` swapped for `filterable`), both constructor docstrings restructured to lead sentence + bullets, and the `LLSelectBaseSettings` bullets split to one fact each.
  - Q: Is the settings-vs-state line itself wrong, as the reviewer inferred?
    - A: No, 5:0. `placeholder` is app copy layered over pack-owned chrome (`triggerPlaceholder`) - the split is right; moving both copy fields out of `this.settings` to make "frozen" literally true would churn `LLSelectSettingsInputOf<S>` and every read site for no behavior change. Honest caveat, now written into the rule: several capabilities (`triggerDisplay`, `popupWidthPolicy`, `outsideClickBehavior`, `chooseAllRow`, `hideChosenRows`) are read per use and are frozen by POLICY (one write channel, small API), not by construction-time necessity. The owner's follow-up worry - "native `<select>` is live for everything, so by that logic everything is state" - is answered under the Q below.
  - Q: Native `<select>` is live for every attribute; why is llselect not "everything is state"?
    - A: The browser implements a re-apply path per attribute; a DOM library has no diff layer, so every live setting is hand-written code plus tests plus a permanent API. The rule keeps that list to what people actually change at runtime (items, value, disabled, language, placeholder); everything else is a rebuild (~0.2 ms). If real demand for a live capability appears, the valve is a function-valued setting (`filterable`'s predicate) or a per-key setter - never a generic `updateSettings`, which would be the everything-is-state model with its whole re-apply matrix.
- [x] **[DOCUMENTATION-91] - `LLSelectBaseSettings` had no docstring; its comment block was orphaned above `LLSelectChangeSource`**
  - Symptom: src/base.ts held the interface's docstring ("Resolved (defaults applied) settings shared by all select variants", `@group Settings` / `@category Base`) immediately followed by a second block comment for `LLSelectChangeSource`; the interface itself carried nothing. In the generated `public/api/core.html` the interface rendered under a fallback "Interfaces" heading as the LAST section of the page, with no description - the exact page the external reviewer read. Collateral from QUALITY-48's type insertion. Found by Opus 5; verified.
  - Fix: the block moved onto the interface and carries the freeze rule (DOCUMENTATION-90); `public/api/` regenerated.
  - Verified: `public/api/core.html` now renders the description under Settings and the fallback "Interfaces" section is gone. Follow-up idea (not done): a mechanical check for a doc block immediately followed by another doc block, which `npm run check` cannot see today.
- [x] **[QUALITY-92] - the default `compareFn` (`===`) disagreed with the Set fast paths (SameValueZero) on `NaN`; the set model broke for it**
  - Symptom: jsdom probe against the built package - `setItems([NaN, 1])` then `toggleItem(NaN)` twice: `getChosenItems()` was `[NaN, NaN]`, `isChosen(NaN)` `true`, the trigger read "All 2 selected"; single: two identical `setChosenItem(NaN)` calls fired `onChange` twice.
  - Cause: `toggleItem` / `areEqual` / `onItemsChanged` went through `defaultCompareFn` (src/base.ts, `===`, never true for `NaN`) while `chosenSet()`, the `setChosenItems` dedup and `warnOnDuplicateItems` used `Set` (SameValueZero). The code comments dismissed `NaN` as absurd; the inconsistency still violated the promised set semantics. Found by Codex Sol; verified.
  - Fix (owner ruling): `defaultCompareFn` is SameValueZero (`a === b || (a !== a && b !== b)`), so every path agrees; the `compareFn` docstring states the default's rule; the two comments that excused the mismatch are gone. Only `NaN` behaves differently; the fast-path detection (`=== defaultCompareFn`) is untouched. The post-fix review (Opus 5) found the same `===`-vs-`Map` split one level up - `gatherItemsByGroupKey`'s internal key equality and `groupKeyCompareFn`'s default - so both now use the same identity rule; a `NaN` group key no longer renders one group per item.
  - Verified: test/compare-fn.test.ts pins one chosen entry after two toggles (removed, not duplicated), `isChosen` agreeing on both sides, a single `onChange` for a repeated NaN choice, and `setItems` keeping a chosen NaN. Post-fix review (Codex 5.5): the AngularJS wrapper's no-`track by` identity branch in `fromModelValue` (`items[i] === value`) now uses SameValueZero too, so a `NaN` model value resolves to its item; pinned by an angularjs test. Post-fix review (Codex Sol): the `select as` / `track by` key comparisons in both wrappers, the ui-select bridge's `on-select` / `on-remove` diff (through its own `compareFn` instead of `indexOf`), and the reference-swap check in both `onItemsChanged` (`!==` read a NaN match as a swap and re-rendered) now all use SameValueZero; pinned by angularjs and core tests. `defaultCompareFn`'s docstring records its second job (the reference-swap check), so the two stay SameValueZero together. The bridge's `on-select` / `on-remove` diff answers by reference first (`includes`) and falls back to `compareFn` only for an item not found that way, so a toggle over k chosen items is not O(k^2) `angular.equals` deep compares (Codex Sol, second post-fix round: ~0.5 s per direction at 1000 items with the scan alone).
- [x] **[MEDIUM-93] - a multiple's count summary kept the OLD list total after `setItems`**
  - Symptom: `setItems([A, B])` then `setChosenItems([A])` shows "1 / 2 selected"; a later `setItems([A, B, C])` still shows "1 / 2 selected" - the visible text and the accessible value both stale. Single's DEFAULT trigger is unaffected (it shows the item's own text). Pre-existing; found by Opus 5 in the second post-fix round while checking the `renderTrigger` docstring claim "runs on every value / state change", which was false - `setItems` never re-rendered the trigger unless a chosen entry was dropped or swapped.
  - Fix: both `onItemsChanged` re-render the trigger content (`renderTriggerContent`) after every `setItems`: the multiple count summary reads the list total, and a custom `createTriggerContentElFn` receives `items` in both modes. The arrow does not re-render, unless the chosen entry was dropped - a value change, which runs the whole trigger. The base `renderTrigger` docstring states exactly when it runs.
  - Verified: test/multiple.test.ts pins the refreshed default total, custom content with nothing chosen, exactly one content render per `setItems` with no arrow render, and the per-branch counts (swap: content only; drop: the whole trigger, arrow included); test/compare-fn.test.ts pins single's custom content after a `setItems` that neither drops nor swaps the chosen item.
  - Q: Why re-render on every `setItems`, not only while something is chosen?
    - A: A first cut did exactly that. The third post-fix round showed a custom trigger showing `0 / items.length` staying stale with nothing chosen, and single's custom content staying stale after a reload that kept the chosen reference. One content render per `setItems` is acceptable for a bulk call, and the docstrings disclose the tags cost (one chip per chosen item; while the popup is closed it may be the only DOM rebuild `setItems` does, next to its O(n) copy and duplicate check, and the chosen-state reconciliation - one list scan per chosen entry).
- [x] **[MEDIUM-94] - the ui-select bridge left a jqLite cache entry for every template element the core removed natively**
  - Symptom: the bridge released template scopes with `$destroy()` only. AngularJS 1.8 jqLite keeps element data (the compiled element's `$scope`, handlers) in a GLOBAL store keyed by the element's `ng339` expando (`angular.element.cache`), cleared only by jqLite's own `cleanData` / `.remove()`. The core removes rows and trigger content natively (`replaceChildren` / `replaceWith`), so every compiled row and chip left its cache entry - and the destroyed scope it holds - behind. The live-scope counts stayed flat while memory grew. Pre-existing; found by Codex Sol in the fourth post-fix round.
  - Fix: `releaseSlot` destroys the scope AND calls `angular.element(el).remove()` (deallocs the element subtree's data and handlers; the element is detached, or replaced right after, either way) on every release path - wholesale rows, detached rows, trigger content.
  - Verified: both leak tests (repeated toggles; repeated reloads with a chip on screen) also pin a flat `angular.element.cache` size.

## review (user-reported, disabled tag x + stale demo build)

- [x] **[MEDIUM-79] - an item-disabled but chosen chip's x still removed it (pointer path)**
  - Symptom: with `itemDisabledFn` / `groupDisabledFn` marking a CHOSEN item disabled, its tag x removed it on click - a pointer user could re-toggle a disabled selection, violating A11Y.md "only user re-toggling is blocked". Keyboard was already safe (disabled rows carry no click handler).
  - Cause: MEDIUM-59 guarded only the whole-control case (`isDisabled()`) in the tag x handler; `toggleItem` is deliberately disabled-blind (the programmatic channel), so the item-level gesture leaked. The popup row and choose-all paths already routed through `isItemEffectivelyDisabled`; only the tag x did not.
  - Fix: the tag x handler also returns on `isItemEffectivelyDisabled(item)` (covers disabled groups), kept at the gesture layer so `toggleItem` stays native-parity disabled-blind. The disabled chip + its x are marked (`aria-disabled` + `tagDisabledClass`; themes grey it with opacity + `cursor: not-allowed`, never `pointer-events: none`) so the inert x reads as disabled, not broken. Clear stays a total wipe. multiple.ts `createTagEl` / `createTagRemoveButtonEl`, base.ts `classIdMap`, the five themes, A11Y.md Tags + Disabled.
  - Verified: test/disabled.test.ts pins the item- and group-disabled pointer no-op, the enabled chip still removing, the `aria-disabled` + class marking, the rerender flip, and that a disabled chip x never opens the popup. Each failed on the pre-fix code first. Real-browser (rootless Chromium, coordinate click): clicking the disabled chip x leaves the popup closed and the selection intact, an enabled chip x still removes, and injecting the DESIGN-forbidden `pointer-events: none` reproduces the fall-through that opens the popup - proving both the fix and the probe.
  - Q: Why guard at the tag x handler, not inside `toggleItem`?
    - A: `toggleItem` is the raw programmatic channel (setChosenItems, framework write-back) and must stay disabled-blind to match native `<select>`. The contract blocks USER re-toggling only, so the guard belongs at the gesture entry points - where the popup row already sits (no click handler on a disabled row).
  - Q: Why mark the chip disabled (visible-but-inert) instead of dropping its x (option C)?
    - A: Panel fork. Real-browser probes: native `<select multiple>` keeps a disabled selected option greyed-but-inert (the user can never remove it), select2 and react-select both still remove it (select2 is this same bug), antd drops the control. The repo bases disabled on native (QUALITY-40), so the x stays visible-but-inert and greyed; dropping it would contradict llselect's own whole-control visible-but-inert rule and reflow the tag strip when `itemDisabledFn` flips (control-stability rule). A toggle setting was rejected (Simplicity First; overriding `createTagRemoveButtonEl` already covers the drop-the-x taste). All five panel members agree on A+: Opus 4.8 / Opus 5 / Fable 5 converged, and Codex Sol (max) + Codex 5.5 (xhigh) both AGREE on review of the landed fix.
  - Q: Why grey the disabled chip x with `cursor: not-allowed`, not `pointer-events: none`?
    - A: DESIGN.md forbids `pointer-events: none` on disabled (it re-blocks hover tooltips), and here it also breaks the fix - with the x not hit-testable the real click falls through to the trigger and opens the popup (the JS `stopPropagation` never runs). Both Codex members caught it independently. The JS guard, not CSS, is the real block; jsdom `.click()` cannot see this - a real coordinate click is needed (TODO.md manual verification).
- [x] **[QUALITY-80] - "the control-disabled tag x still works" was a stale build, not a code defect**
  - Symptom: the user saw a disabled control's tag x still mutating the selection in the demo. The src fix (MEDIUM-59) was in and unit-green, but `dist/` and `public/dist/` were built before it, so `make server` served the un-guarded bundle.
  - Fix: rebuilt (`npm run build` + `build:site`); no source change.
  - Q: The guard for this lesson?
    - A: A green `npm test` says nothing about what `make server` serves - `public/` only regenerates on `build:site`. When a "shipped fix does not work" report arrives, diff the built bundle against src before touching source.

## review (five-model panel over two independent full-repo reviews)

Process: two independent full-repo reviews (a clean Claude Opus 5 session; Codex gpt-5.6-sol at max effort). Convergent findings were fixed outright. Single-source findings went to a five-model panel (Fable 5, Opus 5, Opus 4.8, Codex Sol, Codex ChatGPT 5.5) voting CERTAIN-BUG / NEEDS-HUMAN-DECISION / REJECT per finding. Each round of fixes was then re-reviewed, and findings on the fixes were fixed in turn. Everything else in those rounds was explicitly judged sound by the re-reviewers. Open entries below await the user's ruling.

- [x] **[HIGH-53] - an async preset ng-model never resolves once items arrive**
  - Symptom: a preset model with an initially empty (async) list stays on the placeholder forever, in all three directives.
  - Cause: NgModel's first `$render` precedes the first items `$watchCollection` tick; `setItems` then prunes the fresh choice (`onItemsChanged`), and the watcher re-rendered only for `select as` projections. The ui bridge was missed by the first fix entirely.
  - Fix: every items watcher now calls `$render()` after `setItems`. `llselect-angularjs` resolves by MEMBERSHIP (`select as` key / `track by` key / identity), so an absent value shows empty while the model keeps it; the ui bridge stays identity - ui-select's own semantics, the selection is the model. SPEC.md / README invariants rewritten to match.
  - Verified: llselect-angularjs async test (with and without `select as`); ui bridge async tests (an object preset renders from boot; an alias key resolves on arrival).
  - Q: The panel split 2 REJECT / 1 NEEDS-HUMAN-DECISION / 1 CERTAIN-BUG - what settled it?
    - A: A failing test, not votes: the probe showed 'Please select' where 'Apple' was expected, proving the CERTAIN-BUG vote's mechanism right. When reviewers disagree about a claimed runtime behavior, write the probe before arguing.
  - Q: Without `track by`, should a reload's structurally equal fresh object count as a SECOND item (relisted, separately addable), as the identity default made it?
    - A: No. One reviewer read ui-select's `refreshItems` (`indexOf`, identity) and called identity parity; a direct probe of real ui-select 0.19.8 refuted that - its multiple-mode comparison is `_isItemSelected`'s `angular.equals` (`uiSelectController.js:332`), so the fresh object is the same item and a double-add is impossible. The bridge now wires `compareFn` to `angular.equals` for no-`track by` multiple; a test pins one chip / hidden row / no second entry. Lesson (again): source-reading claims about another library lose to a direct probe of it.
  - Q: Codex proposed the wrappers write back to ng-model only when `meta.source === 'user'` - why was that rejected (4/4)?
    - A: App code calling `instance().setChosenItems()` legitimately expects the model to sync. The write-back gate already suppresses the wrapper's own echo, which is the actual hazard; gating on 'user' would break direct API use for no gain.
- [x] **[HIGH-54] - ui bridge template scopes leaked**
  - Symptom: compiled template scopes accumulated: popup rebuilds leaked row scopes, trigger rebuilds leaked match / tag scopes, and single-row repaints (multi toggle with `remove-selected="false"`) leaked one scope per toggle even after the first fix.
  - Cause: one shared array released only in `renderPopupList`; the trigger and the partial-row path rebuild their DOM on their own schedules.
  - Fix: per-slot tracking (row vs trigger), each released where its slot's DOM dies; entries carry their element, and `replacePopupListItemElInDom` / `close` release the scopes whose element is no longer in the DOM.
  - Verified: scope-count regression test (repeated toggles hold the total scope count flat); SPEC.md invariant updated.
- [x] **[MEDIUM-55] - keyboard focus could land on, or stay on, a disabled row**
  - Symptom: three holes against A11Y.md "disabled rows are skipped": a filter keystroke focused index 0 even when disabled; the shrink clamp landed on a disabled last row; a rerender kept focus on a row that BECAME disabled in place.
  - Fix: all three routes go through `findNextEnabledIndex` (keystroke forward from 0; clamp backward; in-place backward first, then the choose-all leading row when one is rendered - it is the option above the first item - then forward).
  - Verified: filterable + disabled tests; the clamp test reaches the clamp via `setItems` while open; select-all test pins the leading-row hand-back.
  - Q: The first version of the clamp test was green before the fix too - why?
    - A: The filter path resets `focusedIndex` before rendering, so typing can never reach the clamp; only `setItems` while open can. A pin must FAIL on the pre-fix code - run it against the old code once before trusting it.
- [x] **[MEDIUM-56] - bridge reused a stale filter result when the collection changed**
  - Symptom: with a query active, newly added matching items stayed hidden until the next keystroke.
  - Cause: the `$watchCollection` called `setItems` before invalidating `lastQuery` / `matchSet`, so the synchronous refilter answered from the previous collection.
  - Fix: invalidate before `setItems`.
  - Verified: bridge test adds a matching item mid-query.
- [x] **[MEDIUM-57] - a track-by reload left stale chosen objects showing**
  - Symptom: replacing `{id:1, name:'Alice'}` with `{id:1, name:'Alicia'}` under a key `compareFn` left the trigger showing Alice.
  - Cause: `setChosenItem(s)` short-circuits on compareFn equality, so re-resolution kept the old reference; the ui bridge additionally overwrote `$select.selected` with its stale input after the core had already swapped.
  - Fix: core `setItems` swaps the stored reference to the list's own object when a compareFn-equal but DIFFERENT one arrives (trigger re-renders; no `onChange` - the logical value did not change, matching ngOptions, which never rewrites the model). The ui bridge re-syncs `$select.selected` from the core after `$render`.
  - Verified: core single + multiple reference-swap tests; bridge track-by rename test.
- [x] **[MEDIUM-58] - tree demo: inherited bulk ops could break the leaves-only model**
  - Symptom: `setChosenItems([branch])` put branches in the model; the first fix (filter branches there) then left `toggleAll` and the choose-all row able only to choose, never to clear - branches can never be chosen, so their all-chosen checks never held - and the row's counts were wrong.
  - Fix: `setChosenItems` drops branches (the one entry point every raw array passes through); a new protected `getVisibleEnabledItems` method in `LLSelectMultiple` - the choose-all row and `toggleAllVisible` are documented as acting on the SAME set and now share the one method - is narrowed to leaves, plus a `toggleAll` override.
  - Verified: leaves-only bulk test; `toggleAll` round-trip; choose-all row counts / tri-state / click test.
  - Q: Why a core method instead of overriding `createPopupListLeadingRowEl` in the demo?
    - A: Without a shared method a subclass can only keep the row and `toggleAllVisible` in agreement by duplicating the whole row builder. The shared method is the smallest honest fix and follows the existing create*/get* method architecture.
- [x] **[MEDIUM-59] - a disabled control's embedded buttons stayed live**
  - Symptom: with `setDisabled(true)`, the tag remove buttons and the clear button still mutated the selection - they sit in the trigger, reachable while closed, and only open/keyboard were guarded.
  - Fix: both clicks no-op while disabled (buttons stay visible so the value stays readable). A11Y.md Disabled / Tags / Clear sections and both builder docstrings state it; demo 9.3 shows it.
  - Verified: disabled-buttons test, including the re-enabled path.
  - Q: MEDIUM-79 later found this incomplete - an item-disabled chosen chip's x still removed it. Why did the original miss it?
    - A: This fix and its only test covered one axis, whole-control `isDisabled()`. The other axis - an item-level disabled (`itemDisabledFn` / `groupDisabledFn`) CHOSEN item - is a separate gesture path that was never written down or tested. Lesson: "disabled" has two axes here; a guard added for one must be checked against the other.
- [x] **[QUALITY-60] - bridge `on-select` / `on-remove` ran outside a digest**
  - Symptom: scope writes in the app's callbacks stayed invisible until an unrelated digest.
  - Fix: `applyOnScope` wrapper (`$$phase`-safe) around `fireSelectRemove` and the single-mode `on-select`.
  - Verified: bridge callback tests assert same-digest visibility.
- [x] **[QUALITY-61] - `allow-clear` parse deviated from ui-select**
  - Symptom: the bare attribute read as false; `allow-clear="false"` read as true (raw-string truthiness).
  - Fix: ui-select's exact parse (`'' -> true`, else lowercase equals `'true'`). The remaining deviation - the attribute is read once, not `$observe`d - is documented in API.md (llselect's `clearable` is construction-frozen; a runtime flip needs a re-link).
  - Verified: parse test in both directions.
- [x] **[QUALITY-62] - blank aria settings suppressed the unnamed-widget warn**
  - Symptom: `ariaLabel: ''` (or whitespace) counted as "named" but produced no accessible name.
  - Fix: `blankToNull` normalizes `ariaLabel` / `ariaLabelledBy` - blank counts as unset, the ladder moves on, the warn fires. Docstrings + A11Y.md state the rule.
  - Verified: blank-ariaLabel test (warn still fires; a lower rung still names the field).
- [x] **[QUALITY-63] - demo regression: `ll-aria-label` values carried literal quotes**
  - Symptom: 18 demo sites wrote `ll-aria-label="'Country'"`; the attribute is a Literal, so accessible names included the quotes.
  - Cause: my own edit pattern-matched the $eval'd attributes when adding names everywhere.
  - Fix: unquoted all 18.
  - Q: How did it slip in?
    - A: One directive mixing Literal and expression attributes invites exactly this. Caught by the mandated re-review of the fixes - which is why that step exists.
- [x] **[DOCUMENTATION-64] - doc drift left behind by the fixes**
  - Symptom: the provider `arrow` docstring and the API.md config example still described `null` as "the theme draws it" (it is the package chevron default; `'none'` is theme-drawn); `createTriggerContentElFn`'s docstring claimed the SETTING wins over a subclass override; DESIGN.md "Customization model" rules the opposite (override = replace, the override wins), and the docstring now says so; the `changeSource` docstring still said the source stays 'user' for the whole gesture, though the first `onChange` now resets it; API.md's filter-cost bullet claimed "evaluates ONCE per typed query" while the items watcher still evaluates the full expression per digest.
  - Fix: all corrected in place.
- [x] **[DOCUMENTATION-65] - README regrown claims and broken links**
  - Symptom: wording resolved under DOCUMENTATION-22 ("Blazing fast", overbroad minimal-DOM claims) had partially survived; both Home links rendered with a stray `]`; the selection-perf bullet claimed only the chosen row mutates (single refreshes two rows; multiple also rebuilds the trigger and the choose-all row).
  - Fix: reworded to the recorded contract; links fixed.
  - Q: Why did an overbroad claim outlive its resolved `[x]` entry?
    - A: The fix edited one restatement of the claim, not all of them. Resolving a documentation finding means grepping every restatement, not correcting the cited line.
- [x] **[LINT-66] - check.mjs blind spots**
  - Symptom: demo / angularjs JS carried no AST checks; heading-slug anchors were unverified; blockquoted headings (`> ####`) minted anchors the checker could not see; `test-utils/**/*.ts` and `rollup.config.mjs` were on no list; backticked repo paths were unchecked.
  - Fix: all surfaces added; the summary line counts them (79 punctuation / 114 AST / 22 markdown-linked files at time of writing).
- [x] **[QUALITY-67] - (rejected) filterable predicate evaluated against the empty construction list**
  - Symptom claimed: `filterable: (items) => ...` wires the role from an empty list, flipping on first open.
  - Fix: none - unanimous panel REJECT. The predicate re-evaluates per open by documented design; wiring computed from the initial (empty) list is the documented starting state before the first open.

Open items from the panel, awaiting the user's ruling:

- [x] **[MEDIUM-68] - mousedown on the popup's non-option areas closed the popup or stranded the keyboard**
  - Symptom: mousedown on the no-results message / popup padding blurred the focus host, so focusout closed the popup; mousedown on the list element itself focused a `tabindex="-1"` element - the keyboard went dead. The old guard was on popupListEl and covered its descendants only. src/base.ts.
  - Fix (five-model direction panel - no scrollbar special-casing needed): the mousedown guard moved from popupListEl to the whole `popupEl` and now `preventDefault`s every mousedown EXCEPT the filter input's subtree (which must take focus), via the shadow-safe `eventTargetNode`. Padding / no-results / the list element all keep focus on the combobox host. The eager `ev.target !== popupListEl` exception that caused the keyboard-dead hole is gone; native scrollbar dragging is unaffected because a scrollbar mousedown is not a cancelable content event, so preventDefault never reaches it.
  - Verified: focus.test.ts pins the mechanism (list element + no-results prevented; filter input NOT prevented). Real browser (rootless Chromium, FONTCONFIG set): after opening a filterable multi, a mousedown on the list padding leaves focus on the filter input, not the tabindex="-1" list - the effect jsdom cannot exercise (it has no mousedown focus-fixup). The literal scrollbar-drag gesture is headless-invisible (`--hide-scrollbars`); tracked in TODO.md.
  - Q: The prior panel returned 4x NEEDS-HUMAN-DECISION over the pinned scrollbar-drag test. What settled it?
    - A: It was a verification question, not a value decision (Opus 5's read). preventDefault only reaches cancelable content mousedowns; a native scrollbar drag is not one, so the "except the list element" exception was never protecting the scrollbar - it was the very hole that killed the keyboard. The real-browser focus pass confirmed focus stays put; the old scrollbar pin was replaced by the popupEl-wide prevent.
- [x] **[QUALITY-69] - $eval'd enum attributes fell back silently on the likeliest typo**
  - Symptom: `ll-trigger-display="tags"` (inner quotes dropped) $eval'd to undefined and silently became the default 'count'. angularjs/llselect-angularjs.js.
  - Fix: `evalEnumAttr` (mirrors `evalFnAttr`) wraps the `$eval` for `ll-trigger-display` and `ll-popup-width-policy`; a NON-STRING result `console.warn`s (naming the attribute, re-quoting the given value as the fix) and never throws - the default stays a working control. The ui-select bridge hardcodes `triggerDisplay = 'tags'`, so it has no such attribute.
  - Verified: angularjs test asserts the warn fires for `ll-trigger-display="tags"` (undefined) AND `ll-popup-width-policy="match-trigger"` (0), and does NOT fire for a correctly-quoted value. Each new case failed on the first-cut guard first.
  - Q: Why guard on `typeof value !== 'string'`, not the Proposed's `=== undefined`?
    - A: The post-fix panel review (both Codex members) caught it: only a single-identifier typo (`ll-trigger-display="tags"` -> `scope.tags`) yields undefined. A dashed enum literal - the ONLY shape `ll-popup-width-policy` typos take (`fit-content` / `match-trigger`) - $evals as SUBTRACTION (`fit - content`), and AngularJS treats undefined operands as 0, so `=== undefined` never fired and the first cut silently missed every popup-width typo. A valid enum value is always a string; rejecting any non-string catches both shapes.
  - Q: Why not wrap `ll-placeholder` too - it shares the dropped-quotes hazard?
    - A: `ll-placeholder` is free text often bound to a scope expression, where an undefined / non-string result is a legitimate "not set yet", not a typo - warning there would be noisy. The enum attributes have a fixed valid set, so a non-string is unambiguously wrong. (A single-word unquoted placeholder still falls back silently; a multi-word one $parses to a loud syntax error. Documented tradeoff, not a hole.)
- [x] **[MEDIUM-70] - ui bridge had no ariaLabelledBy path**
  - Symptom: only `aria-label` / `title` mapped to a name. angularjs/llselect-ui-select.js.
  - Fix: the host's `aria-labelledby` attribute is forwarded verbatim to `settings.ariaLabelledBy`; the core name ladder picks it over `aria-label` per ARIA. No new vocabulary. labelEl stays out - ui-select has no label-element concept, and `aria-labelledby` is the by-reference path.
  - Verified: ui-select test asserts a host `aria-labelledby` reaches the trigger's name chain.
- [x] **[MEDIUM-71] - the no-results live region was rewritten identically on every keystroke**
  - Symptom: `role="status"` content re-set while visible risks repeated announcements (AT-dependent; A11Y.md: announced once on appearance). src/base.ts.
  - Fix: `syncPopupListNoResultsToDom` records the last written text (`lastNoResultsText`) and skips the write when the resolved text is unchanged; it resets to `null` when the region hides - both when the list becomes non-empty AND on `close()` - so a reopen with a still-empty list re-announces. Custom `createPopupListNoResultsContentElFn` output is compared by its `textContent` (what the status region speaks), so a query-dependent message rewrites when its text actually changes.
  - Verified: filterable tests pin that a still-no-match keystroke keeps the SAME text node, and that reopening a persistently-empty list rewrites (re-announces). Each failed on the pre-fix code (the first with the skip disabled, the second before `close()` reset).
  - Q: The first cut reset `lastNoResultsText` only when the list became non-empty. What did the post-fix panel catch?
    - A: All four reviewers flagged that `close()` hides the region without resetting, so an intrinsically-empty list (`setItems([])` / all-hidden) closed and reopened found the cached text unchanged and skipped the write - the genuine reappearance never re-announced. `close()` now resets too. The panel also noted the skip is text-keyed (`textContent`), so query-dependent RICH markup with constant text goes stale; recorded on the `createPopupListNoResultsContentElFn` docstring as a deliberate limit (the status region speaks text).
- [x] **[PERFORMANCE-72] - `isChosen` was a linear scan per rendered row**
  - Symptom: multi popup render was O(visible x chosen); `isChosen` scanned `chosenItems` per rendered row. src/multiple.ts.
  - Fix (five-model direction panel - do the cache half, defer the refresh half): `isChosen` under the DEFAULT compareFn now uses a memoized `chosenSet()` Set (O(1)), invalidated by the `chosenItems` array reference (every mutation replaces the array; mirrors `visibleItemsCache` from PERFORMANCE-31). A custom compareFn stays linear (cannot hash). The other half - replacing `setChosenItems`' full `rerender()` with a chosen-only refresh - is DEFERRED: a cold path (per-click `toggleItem` is already an O(1) single-row swap) with a large correctness surface (hideChosenRows visibility, grouping memo, leading-row tri-state); measure a real hotspot first.
  - Verified: multiple.test.ts pins isChosen correctness and cache invalidation on a chosen change (setChosenItems + toggleItem), and the custom-compareFn linear path.
- [ ] **[PERFORMANCE-73] - bridge items watcher re-runs the whole `| filter:` chain every digest**
  - Symptom: the watched expression retains `| filter: $select.search` with an empty query, so filterFilter deep-compares every item per digest per widget. angularjs/llselect-ui-select.js:414. The overstated doc claim is already corrected (DOCUMENTATION-64).
  - Proposed (five-model direction panel - fidelity-preserving, DEFERRED by the user): NOT a blanket "watch the bare source" - that would drop reactivity to `| orderBy` / scope-var filters, a compatibility regression on a shim whose whole point is ui-select parity. Instead, ONLY when the filter chain is search-only (nothing but `| filter: $select.search`), watch the parsed bare source and re-evaluate on source/query change; keep the full-expression watcher for any chain with other dependencies. Needs a `parseRepeat` change to find the top-level `|` outside quotes/ternaries. Lowest priority of the round; deferred.
- [x] **[QUALITY-74] - unprefixed public TYPE exports (icon trio + WidthPolicy / Placement)**
  - Symptom: `IconOptions` / `CheckboxState` / `CheckboxIconOptions` were unprefixed exports; so were `WidthPolicy` / `Placement`. The owner also flagged that the icon builder FUNCTIONS carry no prefix either.
  - Fix: the five TYPES gained the prefix - `LLSelectIconOptions`, `LLSelectCheckboxState`, `LLSelectCheckboxIconOptions`, `LLSelectWidthPolicy`, `LLSelectPlacement`. Exported FUNCTIONS (`createChevronDownSvgEl` ... `createHighlightedTextEl`, `gatherItemsByGroupKey`) and `version` stay unprefixed. Rule recorded in naming-conventions.md s3.
  - Verified: build + 390 tests green after the rename (src + demo/subclass/tree-select.ts); no bare type name remains.
  - Q: Why prefix TYPES but not FUNCTIONS - is that not inconsistent?
    - A: Five-model panel, 5:0 (Opus 4.8 / Opus 5 / Fable 5 / Codex Sol max / Codex 5.5 xhigh), each verifying against real libraries: no reputable JS library prefixes a standalone exported FUNCTION with its own name (date-fns `format`, lodash `debounce`, MUI `createTheme`, D3 `select`, Floating UI `computePosition`, React `useState`) - named imports already namespace values, and a consumer wanting a uniform prefix writes `import * as LLSelect` (free; the Three.js / D3 / zod pattern). TYPES differ: they appear in `.d.ts` / hover / error messages with no import context and collide across libraries (`Placement` ships in both Popper and Floating UI), so the prefix is collision safety. zod is the living template - type `ZodType`, function `string()`.
- [x] **[QUALITY-75] - demo 4.2's visible labels and spoken names disagreed**
  - Symptom: `<label>` elements with no `for=`, while the widgets get `ariaLabel: 'chevron'` / `'triangle'`. demo/examples.html.
  - Fix (user ruling + five-model direction panel): the two `<label class="arrow-label">` (which show the demoed API function name - a caption, not a field label) became `<div>`; the CSS is a class selector so the look is unchanged. The widgets keep `ariaLabel: 'chevron'` / `'triangle'`, which already matches their visible placeholder. Wiring `labelEl` to the caption was rejected - the accessible name would become "createChevronDownSvgEl()", strictly worse. Once no element claims to be a `<label>`, the label-in-name mismatch is gone. Demo-only.
  - Verified: `npm run build:site` regenerates; arrow-label styling is class-based (unchanged), the widgets' accessible name stays their short ariaLabel.
- [x] **[MEDIUM-76] - hosted inside an app's shadow root, option clicks read as outside clicks**
  - Symptom: the document-level outside handlers used `rootEl.contains(ev.target)`; composed events retarget to the shadow host, so an inside click closed the popup. llselect itself uses NO shadow DOM - this is about being hosted in one. src/base.ts.
  - Fix: a private `eventTargetNode(ev)` returns `ev.composedPath?.()?.[0] ?? ev.target` (the deepest element the pointer actually hit, piercing the shadow boundary); the three pointer outside handlers (pass-through mousedown, block mousedown + click) resolve their target through it. With no shadow tree it equals `ev.target`, so non-shadow behavior is unchanged. The focusout guard (relatedTarget) is a separate mechanism, untouched (proposed did not cover it).
  - Verified: outside-click tests host the widget in a shadow root and dispatch a composed pointer-down / click on an inside option (pass-through AND block mode; jsdom retargets `ev.target` to the host, confirmed by a probe); the popup stays open. Demonstrated failing on the pre-fix `ev.target`.
  - Q: Should the focusout guard also pierce the shadow boundary?
    - A: No - the post-fix panel (all four members) confirmed it is correct by construction. The focusout listener sits on `rootEl`, INSIDE the host shadow tree, so an intra-widget focus move exposes the real inside `relatedTarget` (retargeting is relative to the listener's node; it rewrites toward the host only for listeners OUTSIDE the boundary - the three document-level pointer handlers). Focus genuinely leaving the widget still closes. Known limitation: a CLOSED host shadow root truncates `composedPath()` at the host, so an inside click reads as outside - unfixable from a document-level listener; documented on `eventTargetNode` and the TODO manual-verification note.
- [x] **[MEDIUM-77] - duplicate compareFn-equal items got stale selection DOM**
  - Symptom: partial updates use `findIndex`, so only the first equivalent row's `aria-selected` refreshes. src/base.ts. Related data point: the ui bridge's `angular.equals` compare makes a MODEL holding structurally equal duplicates render one chip and lose an entry on the first user change, and a single-mode LIST holding duplicate rows marks, on a fresh list build, every row equal to the CURRENT choice `aria-selected` (both documented as edge deviations in angularjs/API.md) - the duplicates policy now rules all of these.
  - Fix (policy - user ruling + five-model direction panel): items must be UNIQUE under `compareFn`; duplicates are NOT supported (index/identity selection would fight the set-valued model). `setItems` warns once per page under the DEFAULT compareFn (O(n) Set, never throws); a custom compareFn is documented only (an O(n^2) scan would tax large lists, per PERFORMANCE-31). Contract in the `setItems` docstring, DESIGN.md "Data model", and angularjs/API.md.
  - Verified: base.test.ts pins the default-compareFn duplicate warn (once per page, not per call) and that a custom compareFn is NOT scanned.
  - Related (five-model round on MEDIUM-79): with a custom `compareFn`, a chosen chip holds the `chosenItems` object while the popup row holds the `items` object; if their `itemDisabledFn` / group projections disagree, the chip can render enabled (x removable) while the row is `aria-disabled`. Same root as the duplicates gap - ruled by the same uniqueness / projection-congruence contract, not per-site reconciliation.
- [x] **[MEDIUM-78] - constructors invoke overridable render before subclass fields initialize**
  - Symptom: a subclass override of a render method that reads subclass fields runs during `super()`, before the subclass's field initializers (classic virtual-call-in-constructor). src/single.ts, src/multiple.ts.
  - Fix (user ruling + five-model direction panel - document, NOT two-phase init): the constraint is stated on `renderTrigger` (the method the constructors run) and in DESIGN.md "Customization model" - only the trigger methods run at construction, the popup-list methods wait for `open()`. An override reading its own fields tolerates defaults or calls `rerender()` at the end of its constructor. Two-phase init was rejected: it taxes every user (not just extenders) with a mandatory second call, for a footgun a one-line `rerender()` already fixes.
  - Verified: docs only; the tree-select demo (reads its fields only in popup-list methods) needs no change. check + build green.

## review (user-reported, Firefox mass-build gap)

- [x] **[PERFORMANCE-52] - the 1000x10 mass build reads ~2.6x slower on Firefox than Chromium (81 ms vs 31 ms), while competitors do not degrade**
  - Symptom: user-measured, repeatable. llselect 81 ms on Firefox vs 31 ms on Chromium; the other libraries move much less between engines.
  - Cause: no llselect defect. Verified in real headless Firefox + Chromium (Playwright, the rootless recipe): phase-timed construction shows NO phase spike - construct 34 vs 21 ms, reflow 12 vs 10, destroy 6 vs 4 per 1000 widgets (warm minimums). The gap is a generic engine factor (~1.5x warm) on DOM-scaffold construction, amplified to ~2.2-2.6x by the benchmark's cold first run (Firefox JIT warms slower) and its chunked build with a forced reflow per chunk (amplifies both engines ~3x equally).
  - Impact: none actionable. 81 us per widget on Firefox is still 2.3x faster than the nearest library (Slim Select, 187 ms) and 2.9x native - while every competitor sits at 6.7-24x native on the same run.
  - Fix: none - no defect to fix. The README benchmark table states its engine (Chromium 150); engine-to-engine ratios are expected to differ. Upstream is already moving on both isolated families: Gecko's quadratic-scan `setAttribute` fix is VERIFIED FIXED (bugzil.la/2047481, resolved shortly before this entry - re-measure on a post-fix Firefox before ever revisiting), and listener-registration cost is ASSIGNED with partial patches (bugzil.la/1945310; our few-listeners-many-targets data is complementary evidence to attach there if pursued).
  - Q: Was the Popover API the culprit (the one llselect-only feature, with `popover="manual"` set per construction)?
    - A: No - hypothesized first, then refuted by an A/B/A run deleting `showPopover` before construction: 102 / 82 / 72 ms in Firefox, i.e. warm-up noise larger than any popover signal, and Chromium showed the same pattern. The lesson: engine-difference reports need a phase-timed measurement before naming any culprit; the one-liner A/B lever (`delete HTMLElement.prototype.showPopover`) plus the rootless Playwright recipe made the real measurement cheap.
  - Q: Do isolated per-primitive micro-benchmarks (setAttribute ~2.1x, addEventListener ~2.1x on Firefox) prove the attribution?
    - A: Not alone - a cross-model critique (codex) correctly objected that detached monomorphic loops suffer interning / IC-warmup / detachment skew, and demanded application-level subtraction. That experiment (a simulated constructor replicating the exact op inventory - interleaved, attached, unique ids, per-widget closures - with variants each omitting one op family, fresh page per variant) CONFIRMED the attribution causally: warm marginals per 1000 widgets, Firefox vs Chromium - attributes 18 ms vs 2.4 ms, listeners 13 ms vs 1.2 ms, every other family under 9 vs 2.2. The two families are ~70% of Firefox's total and near-free on Chromium, and the simulation reproduces the user-observed ratio (44 vs 17.9 ms = 2.5x vs the real 2.6x). Which Gecko subsystem inside setAttribute pays (attr parsing, a11y bookkeeping, restyle hints) stays un-split - irrelevant to the conclusion.
  - Q: Is template + cloneNode(true) the fix to ship?
    - A: Logged as an idea only. It is the classic remedy for attribute-dense scaffolds (the platform's template element, lit-html, the js-framework-benchmark vanilla winner), and the subtraction numbers say the attribute family is the right target - but it bypasses the subclass create*El overrides, doubles the truth (template vs constructor), and keys the cache on prefix x clearable; the listener family (13 ms on Firefox) would need shared/delegated handlers, a separate architecture change. At 34 us per widget while already fastest in every engine, neither is worth those costs today.

## review (external, ChatGPT API review)

Five findings relayed by the user; each verified against source before logging. Two halves were already ruled in the public-API round (single callback: QUALITY-36; live arrays: QUALITY-38) - the new substance is logged here.

- [x] **[MEDIUM-47] - an unnamed widget is representable, and nothing warns**
  - Symptom: `ariaLabel` / `ariaLabelledBy` / `labelEl` are all optional; with none given the combobox has no accessible name. The docs state the violation plainly (base.ts `ariaLabel` docstring; A11Y.md name-ladder table's "unnamed" column) but the default construction stays silent.
  - Impact: a library that leads with a11y ships unnamed widgets by default; the docs-only guard catches only doc readers.
  - Fix: `console.warn` ONCE PER PAGE when a name ladder resolves to unnamed (base.ts) - the house "reported in the console, never silent" style; the non-contiguous-group warn is precedent. A type-union forcing one source was considered and is worse: it breaks every minimal snippet and cannot express the `labelEl` rung.
  - Verified: aria-name.test.ts pins the warn on an unnamed widget, the once-per-page dedupe, and silence for each ladder rung; the two group-warn spy tests now name their widgets so their counts stay about the group warn.
  - Q: Why once per page, not once per instance?
    - A: The first cut warned per instance and the user pushed back; checking the blast radius proved them right - the benchmark page builds hundreds of unnamed widgets per run, so a per-instance warn floods the console and its cost lands inside the timed build loop. One nudge carries the rule; per-instance granularity buys nothing because the message cannot point at "which one" anyway. W3C's "no ARIA is better than bad ARIA" is about not INVENTING names (which the library still refuses to do); a combobox's accessible name itself is spec-required (Accessible Name Required: True), so warning on its absence is not ARIA overreach.
- [x] **[QUALITY-48] - onChange carries no source, and programmatic setters cannot update silently**
  - Symptom: `setChosenItem(s)` fires the same `onChange` as a user click; the callback receives values only - no user-vs-api flag, no silent option.
  - Impact: every wrapper must build echo suppression. The in-repo AngularJS wrapper's write-back gate IS that workaround, so the pain is proven, not hypothetical.
  - Fix: `onChange` gained an additive third argument `meta: LLSelectChangeMeta` (`{ source: 'user' | 'api' }`; the object shape leaves room to grow without breaking). The library attributes 'user' by wrapping exactly its pointer / keyboard entry points (option activation, tag remove, clear button, choose-all row) via a protected `withUserChangeSource`; everything else reports 'api'. A `silent` flag was rejected: two ways to mutate = two truths. Split `onChangeByUser` / `onChangeByApi` callbacks were rejected: most consumers want both (register-twice bugs), the pair cannot grow new sources, and it still cannot tell a wrapper's own echo from other api calls - the DOM's one-change-event + `isTrusted` shape is the precedent. The single-callback half stays ruled by QUALITY-36.
  - Verified: events.test.ts pins 'user' for all four built-in interactions and 'api' for `toggleItem` / `setChosenItems` / `chooseAll`.
- [x] **[QUALITY-49] - mutating setters demand mutable arrays: `setItems(items: T[])`, `setChosenItems(items: T[])`**
  - Symptom: an immutable-typed app (`readonly T[]` state) cannot pass its arrays without a cast, even though both setters defensively `slice()` anyway.
  - Fix: both parameters widened to `readonly T[]` (base.ts setItems, multiple.ts setChosenItems). Parameter-position widening is non-breaking. The returns-live-array half of the criticism stays ruled by QUALITY-38.
  - Verified: tsc strict across the repo; full suite green.
- [x] **[HIGH-50] - setChosenItems accepts duplicates while the contract promises set semantics**
  - Symptom: `compareFn`'s docstring says it is "Used for selection, dedup, ..." (base.ts), but `setChosenItems` stores `items.slice()` with no dedup: `[a, a]` is representable, `toggleItem(a)` then removes only the first, and count summaries / choose-all tallies skew.
  - Cause: the bulk `choose*` ops filter through `isChosen` and never create duplicates, so the gap is reachable only through `setChosenItems` (including framework model write-back) and was never exercised.
  - Fix: dedup in `setChosenItems` via `compareFn`, first occurrence wins, with the `defaultCompareFn` Set fast path; docstring states the set semantics. This is a contract bug fix, not a default flip - the dedup promise was already written.
  - Verified: multiple.test.ts pins identity and custom-`compareFn` dedup, and that one `toggleItem` fully unchooses after a duplicate-carrying assignment.
- [x] **[DOCUMENTATION-51] - "a replacement of native `<select>`" overclaims form association**
  - Symptom: README's headline says "aims to be a replacement of native HTML `<select>`", while the widget deliberately does not participate in form submission / reset / constraint validation / `<label for>` (all documented, with the hidden-input recipe and the `labelEl` click emulation).
  - Impact: the gaps are documented decisions, but the headline word "replacement" invites exactly this review's objection.
  - Fix: none for now - user ruling: the headline stays; revisit only as a positioning-copy pass. The form-integration section keeps carrying the tradeoffs.

## review (settings-freeze boundary)

- [x] **[QUALITY-46] - the settings-freeze exceptions read as arbitrary (why setPlaceholder but no setClearable?)**
  - Symptom: an external review read "frozen after the constructor" plus the exceptions (`setPlaceholder`, `setUiTranslationPack`, `setDisabled`) as an arbitrary boundary.
  - Cause: the rule existed in the code but was never stated. The premise also miscounts: `disabled` was never a setting (it is instance state behind `setDisabled()`, and its capability `focusableWhenDisabled` stays frozen), so the true exceptions are only the two text ones.
  - Fix: the boundary is now stated in DESIGN.md "Settings vs methods": state and copy move at runtime; capabilities are frozen. State = what a native `<select>` also mutates live (items, value, disabled). Copy = locale-owned text (pack, placeholder). Capability = decides structure / wiring / ARIA topology at construction.
  - Verified: docs only; check + link pass.
  - Q: Why does `placeholder` get a setter while `clearable` gets none?
    - A: `placeholder` is copy: a text-node swap, driven by i18n, a normal runtime event. `clearable` gates whether the clear-button element exists and is wired at all (base.ts, trigger build), so a `setClearable` is a mini-rebuild plus permanent API for a rare need - rebuilding the instance costs ~0.2 ms and covers it. The designed valve for genuinely-runtime capability needs is a function-valued setting evaluated per use (`filterable`'s predicate), and the always-built-hidden filter input is the promotion precedent.

## review (user-reported, pinch-zoom popup drift)

- [x] **[HIGH-45] - pinch-zoom drifts the popup left of the trigger (Linux, Firefox AND Chromium)**
  - Symptom: open the popup, two-finger pinch-zoom past some level: only llselect's popup shifts left and stops aligning with the trigger's x; the competitor libraries stay aligned. Reproduced by the user on Linux in both engines.
  - Cause: unverified. Prime suspect: `getVisibleViewport()` (positioning.ts) returns `visualViewport.width/height`, and the popup is `position: fixed`, i.e. LAYOUT-viewport coordinates. Under pinch zoom the visual viewport shrinks and pans (`offsetLeft/offsetTop`), so clamping x into `[0, vv.width]` without the vv offset drags the popup toward the left edge even though the trigger's client x is legitimate.
  - Impact: popup misalignment under pinch zoom; no data loss. jsdom cannot reproduce (no visual viewport); needs the real-browser pass.
  - Fix: landed (positioning.ts). The visible window is now a RECT in client coordinates: `getVisibleViewport()` returns `visualViewport`'s offsets alongside its size, and `computePosition` measures every edge against `[left, left + width]` x `[top, top + height]` (x clamp edges, spaceAbove/Below, maxHeight). With offsets 0 the math reduces exactly to the old formulas, so nothing changes outside pinch zoom; unit tests pin the offset cases and the zero-offset equivalence (positioning.test.ts).
  - Verified: by the user with the real pinch gesture on Linux (the benchmark playground): the popup keeps the trigger's x through zoom in both Firefox and Chromium. Unit tests pin the offset math and the zero-offset equivalence (positioning.test.ts); jsdom itself has no visual viewport.

## review (hideChosenRows performance audit)

Micro-bench after shipping `hideChosenRows` (jsdom, 10k items; numbers are rough but order-of-magnitude): flag off costs nothing measurable (`toggleItem` keeps its O(1) path, `getVisibleItems` adds one boolean check). Flag on with the default `compareFn` is fine: the Set-path subtraction is ~0.6 ms per call at 5000 chosen, and opening got FASTER (443 ms vs 659 ms) because hidden rows are never built. The by-design costs (full list rebuild per toggle while open; documented in the docstring) measured ~1x popup-open per click at 10k items.

- [x] **[PERFORMANCE-31] - hideChosenRows with a custom compareFn makes getVisibleItems O(visible x chosen), recomputed on every call**
  - Symptom: 10k items + 5000 chosen + custom `compareFn`: one `getVisibleItems()` call costs ~416 ms (jsdom micro-bench). Hot paths call it repeatedly: `renderPopupList` at least twice (its own pass + the choose-all row's re-query), keyboard nav once per key.
  - Cause: the subtraction falls back to per-item `isChosen` (a linear scan of `chosenItems`) whenever `compareFn` is not the identity default, and the result was never cached across calls.
  - Impact: only custom-`compareFn` apps with large lists AND large chosen sets. Default `compareFn` takes the Set path and stays ~0.6 ms at the same scale.
  - Fix: the subtraction result is cached on the instance (`visibleItemsCache` in multiple.ts). Validity is two reference checks (base list + chosen set) - complete, because every upstream layer and the chosen set replace their arrays on change. The choose-all row's second query now hits the cache, so no hook-signature change was needed.
  - Verified: micro-bench re-run on the rebuilt dist: 100x `getVisibleItems` at 10k items / 5000 chosen went from ~64 ms to ~0 ms with the default `compareFn`, and from ~42 s to ~0.66 s with a custom one (one real compute + 99 cache hits; absolute times vary run to run, within-run ratios are the signal). A reference-identity test pins the cache contract (hide-chosen-rows.test.ts).
  - Q: Why did this ship un-memoized?
    - A: Because the O(visible x chosen) bound was known and documented in the docstring, but the magnitude (hundreds of ms per single call at 10k/5k) and the call multiplicity per operation were only measured afterward. The lesson: for costs written into a docstring, measure the worst case before shipping, not after.

## review (public API surface)

External review of the public API surface, relayed by the user; every item converged and landed. Naming rulings live in naming-conventions.md (s2 verb boundary, s5 decisions log, s7a.9); behavior contracts in DESIGN.md / A11Y.md.

- [x] **[MEDIUM-33] - open/close/toggle had no public open-state reader**
  - Symptom: reading open state required DOM attributes (`data-state`) or mirroring `onOpen` / `onClose`; the flag was a protected field.
  - Fix: public `isOpened()` (base.ts); field renamed to private `opened`; the `createTriggerArrowContentElFn` ctx renamed `{ isOpen }` -> `{ isOpened }`, keyboard.ts's param following.
  - Verified: test/base.test.ts pins open/toggle/disabled-no-op; full suite green.
  - Q: Why `isOpened()`, not `isOpen()` matching the state adjective and industry habit?
    - A: s7a.9 (user ruling): with `open()` the verb on the same class, `isOpen` has a competing parse; `isOpened` reads one way only - idiom never outweighs ambiguity.
- [x] **[MEDIUM-34] - visible items and the filter query were unreachable for consumers**
  - Symptom: `getVisibleItems()` was protected and the query private; the in-repo ui-select emulation had to reconstruct `$select.search` by caching the query inside its `filterFn` (angularjs/llselect-ui-select.js) - the predicted wrapper-author wall, already hit.
  - Fix: `getVisibleItems()` widened to public (live read-only array, display order, full list while closed) and `getFilterQuery()` added (base.ts).
  - Verified: test/filterable.test.ts covers closed / filtered / reset-on-close for both.
- [x] **[QUALITY-35] - placeholder was frozen; a runtime change meant rebuilding the instance**
  - Fix: `setPlaceholder(placeholder: string | null)` - `null` reverts to `uiTranslationPack.triggerPlaceholder`; an explicit value keeps winning over later pack changes (base.ts `explicitPlaceholder`). DESIGN.md's "sole exception" wording became "two exceptions".
  - Verified: test/placeholder.test.ts (explicit-wins, null-reverts, multiple trigger).
  - Q: Why did `filterable` and `clearable` get no setter?
    - A: `filterable`'s predicate form re-evaluates on every open, so `filterable: () => flag` already is the runtime toggle; `clearable` changes are rare enough that rebuild-on-change is acceptable.
- [x] **[QUALITY-36] - single constructor-time event callbacks, no on()/off()**
  - Fix: none - by design. Settings-for-consumers + protected hooks-for-subclasses is the recorded two-channel model; both in-repo wrappers bind once at link time. README now shows the one-line closure recipe for swapping / fanning out handlers.
  - Q: Why no subscription API when the settings freeze makes handlers unswappable?
    - A: wrappers own multiplexing; an emitter adds teardown and ordering semantics for a need a one-line closure covers, and the low-level positioning (README) makes the wrapper the right layer.
- [x] **[QUALITY-37] - subclassSettings channel weakly typed for third-party extenders**
  - Fix (supersedes an earlier "none - by design" ruling): the settings type became each class's third generic param `S`, defaulted to its own settings type. `this.settings` is `S` (the `declare` re-types are gone) and each constructor's `subclassSettings` param accepts exactly `Omit<S, keyof OwnSettings>` - an extender's typo or missing field is now a compile error. One commented cast per constructor remains (base / single / multiple).
  - Verified: tsc strict + the full suite; the typed channel is exercised by the tree-select subclass example.
  - Q: Why was it first ruled "by design", and what was wrong with that call?
    - A: The ruling's two costs were real but overweighted. The surviving cast is confined and commented either way; and a DEFAULTED third param keeps every existing `LLSelect*<T>` mention valid, so nothing "grows a param". What flipped the call: a real third-party extender path (the tree-select example) made the `Record<string, unknown>` hole concrete - `satisfies` only ever protected in-repo call sites, never an extender's.
- [x] **[QUALITY-38] - getItems() returns the live internal array (plain-JS mutation footgun)**
  - Fix: none - deliberate, documented at the method; the same contract is stated on `getChosenItems` / `getUiTranslationPack` and now `getVisibleItems`.
  - Q: Why not a defensive copy or `Object.freeze`?
    - A: a copy is O(n) garbage per render (`renderTriggerContent` reads it every render); freeze only protects strict-mode JS callers and taxes every set. The docstring warning is the chosen mitigation.
- [x] **[QUALITY-39] - "all" bulk-op names do not show their enabled-only scope**
  - Symptom: `chooseAll` / `unchooseAll` / `toggleAll` act on enabled items only and preserve chosen-disabled entries; the names alone do not say so.
  - Fix: names kept (user ruling); the verb boundary is recorded in naming-conventions s2 (`choose*` / `toggle*` = UI-parity, enabled-only; `set*` / `clearSelection` = raw disabled-blind total channel) and each method docstring states its side. `toggleAllVisible()` added: the choose-all row's visible-subset action as a public method (multiple.ts; the row delegates to it), closing the "row semantics unreachable programmatically" gap.
  - Verified: test/select-all.test.ts covers filtered-subset toggling + outside-choice preservation.
  - Q: Why keep the names instead of renaming to `*AllEnabled`?
    - A: "select all" is universally scoped to actionable items; `toggleAllEnabled` misparses as toggling an enabled flag; and no sane-length name carries the preservation rule anyway - the docstring stays load-bearing.
- [x] **[QUALITY-40] - clear button wiped chosen-disabled items while unchooseAll preserves them**
  - Symptom: `unchooseAll`'s rationale said disabled items "cannot be toggled through the UI", yet the clear button (UI) removed them - looked inconsistent.
  - Fix: behavior kept - the user ruled native `<select>` as the standard, and native matches on every applicable point: a selected option that becomes disabled stays selected, programmatic mutation and clearing ignore disabled entirely, and form submission (the one nuance omitting disabled options) has no core analogue. The rationale wording was corrected (bulk ops mirror clicking) and A11Y.md "Clear button" records the total-wipe rule.
- [x] **[QUALITY-41] - setChosenItems equality is order-sensitive (claim: weird for a "set")**
  - Fix: none - correct as is. `chosenItems` is an ordered list by contract (insertion order; tags render in it), so `[a, b] -> [b, a]` must re-render and fire `onChange`; order-insensitive equality would leave stale tag order. "set" in the name is the verb, not the data structure.
- [x] **[MEDIUM-42] - grouping required pre-sorted data; non-contiguous keys rendered duplicate labels**
  - Fix: `gatherGroups: boolean` setting (default `true`): the display order is derived by the exported pure `gatherItemsByGroupKey` (grouping.ts) - groups gather at their key's first appearance, within-group order kept, `null`-key items in place, contiguous input returned as-is (zero copy). Lazy + memoized (invalidated by `setItems` / `rerender()`); the DATA order (`getItems()`) is never touched. `gatherGroups: false` = strict mode keeping the duplicate-label + `console.warn` behavior for callers who guarantee sorted data. DESIGN.md "Grouping semantic (gather + contiguous-run)".
  - Verified: test/gather.test.ts (pure fn + instance + laziness + filter interplay); test/optgroup.test.ts strict-mode warn.
  - Q: Why gather once then filter, not filter then re-gather per keystroke?
    - A: a group's position must not jump while typing - it stays pinned by its first appearance in the FULL list (exactly what pre-sorted data does), and one gather per items-change beats one per keystroke.
  - Q: Why not the nested `{ label, items }[]` input shape instead?
    - A: the recorded rejection stands (single write channel, identity-driven grouping, generic `GroupKey`, setting composability); the gather removes the footgun without a second data channel.
- [x] **[MEDIUM-43] - a subclass itemToGroupKey override did not drive grouping render**
  - Symptom: segmentation (and initially the gather) read the `itemToGroupKeyFn` setting directly; only the disabled layer called the protected method - an override could neither turn grouping on nor change rendered groups, contradicting DESIGN.md's customization model ("the library calls the method directly").
  - Fix: every key now resolves via `this.itemToGroupKey` (base.ts `computePopupSegments` + the gather), unconditionally. `rerender()` additionally invalidates the gather memo and re-runs an active filter, so overrides reading external state (and in-place item mutation) refresh through the documented `rerender()` path.
  - Verified: test/optgroup.test.ts subclass-override tests (override enables grouping incl. gather; external-state flip + rerender).
  - Q: How does the library know grouping is on when the setting is null but the method is overridden?
    - A: it does not need to - rendering an all-`null`-key list is byte-identical to the old grouping-off early return, and the gather detects all-null as contiguous and returns `items` itself. "Grouping off" IS "all keys null"; the old setting-gate was an optimization, not a semantic.
- [x] **[DOCUMENTATION-44] - the settings-null vs value-undefined split looked accidental**
  - Fix: DESIGN.md "Settings vs methods" now records the value-side rationale: `undefined` keeps `null` usable as a real item value for `T` and matches JS's absent-return convention (`Array.prototype.find`).

## review (real-browser acceptance run)

- [x] **[MEDIUM-31] - filterable tags trigger accname duplicated chip labels ("Apple Remove Apple")**
  - Symptom: with `filterable: true` + `triggerDisplay: 'tags'`, the closed trigger's computed accessible name repeated every chip (label text + the remove button's `aria-label`): `Toppings Apple Remove Apple Banana Remove Banana`. Measured identically in Chromium and Firefox accessibility trees - the exact duplication [NEEDS-VERIFICATION-27] flagged as unverifiable in jsdom.
  - Cause: the filterable-mode `aria-labelledby` chain referenced the visible content span, and accname traversal descends into it, collecting every labelled control inside (the per-chip remove buttons).
  - Fix: the chain now references a hidden root-level plain-text value span kept in sync by `commitTriggerContentToDom` (tags: labels joined with `", "`; count summary / single label / placeholder analogous; explicit `plainTextValue` param for rich content). base.ts `triggerValueEl` / `syncFieldNameToDom`, single.ts / multiple.ts `renderTriggerContent`, contract in A11Y.md "Accessible name".
  - Verified: Chromium + Firefox aria snapshots now read `button "Toppings Apple, Banana"`; test/aria-name.test.ts pins the span, the chain, and the tags plain-text value; full suite green.
  - Q: Why a hidden sibling span, not `aria-label` on the content span or `aria-hidden` on the remove buttons?
    - A: `aria-label` on a `generic` span is ARIA-prohibited (validators flag it), and `aria-hidden` on the remove buttons would erase the chips' guaranteed AT name (A11Y.md "Tags") to fix a different channel. A root-level `hidden` span referenced by the chain is validator-clean, keeps `triggerEl.textContent` equal to the visible content (inside the trigger it doubled it), and accname includes referenced hidden nodes by design.

- [x] **[QUALITY-32] - ja / he count summaries were grammatically off (i18n review)**
  - Symptom: ja `triggerCountSummary` read as an action ("N件を選択" - "select N items"), not a state; he used plural `נבחרו` even for 1 chosen item and an unidiomatic bare "all N" with no noun.
  - Fix: ja appends `中` (state phrasing); he branches on count (singular `נבחר פריט אחד מתוך N`, all-case `נבחרו כל N הפריטים`). ar reviewed clean. i18n.ts.
  - Verified: npm test (i18n tests call the pack functions, no fixture drift); human native-speaker sign-off remains tracked in TODO.md.

## review (release-readiness follow-up)

- [x] **[HIGH-26] - opening against an off-screen trigger leaked listeners re-entrantly**
  - Symptom: `open()` with the trigger already scrolled out of view / clipped reported the control closed yet left the positioner (scroll / resize / ResizeObserver) plus outside-click / focusout handlers live; `destroy()` could not recover them.
  - Cause: the positioner's initial synchronous `reposition(true)` fired `onHide -> close()` before `this.positioner` was assigned and before the listeners were attached, then `open()` continued past the aborted close.
  - Fix: `open()` refuses up front when `isAnchorHidden(triggerEl)` (new exported predicate reusing the positioner's own layout-viewport test), mirroring the disabled guard, so the positioner is never built for a hidden anchor. base.ts `open`, positioning.ts `isAnchorHidden`.
  - Verified: test/positioning.test.ts (no-op open, no callbacks, later resize does not mutate the hidden popup, `destroy()` clean).

- [x] **[NEEDS-VERIFICATION-27] - release acceptance gates are not signed off**
  - Impact: the code / doc fixes for accessible names, filterable Tab order, and CSS retention were in and unit-covered, but their real-browser / screen-reader / real-bundler acceptance was still open, so the original release blockers were only conditionally closed.
  - Fix: the automatable layer of every gate ran in real Chromium + Firefox (Playwright, real layout / native Tab / accessibility trees): accessible names in all modes including `clearable` and tags (which surfaced and fixed [MEDIUM-31]), the full Tab / Shift+Tab and one-tab-stop contract, RTL mirroring, placement stickiness, Firefox no-jolt + scrolled-to-chosen, clipped-trigger no-op open + clean destroy, no-results / tri-state, both benchmark pages against the pinned CDN builds, and CSS retention verified against the packed tarball in vite AND webpack production builds. The remaining human-only residue is narrowed in TODO.md: AT announcement pass, headed scrollbar drag, i18n sign-off.
  - Verified: session Playwright runners (a11y / focus / visual / angularjs / benchmark) all green in both engines; bundler outputs contain the theme CSS.

- [x] **[DOCUMENTATION-28] - generated API docstrings described the trigger as always a combobox**
  - Symptom: `triggerClass` and `triggerEl` docstrings (emitted into `dist/base.d.ts`, so consumer-facing) gave a fixed `role="combobox"` and put `aria-activedescendant` on the trigger unconditionally.
  - Fix: both now state the role per search mode (combobox inactive / button while a filterable popup is open) and where `aria-activedescendant` lives. base.ts `triggerClass`, `triggerEl`.

- [x] **[QUALITY-29] - the mechanical check covers only part of its policy**
  - Impact: `scripts/check.mjs` caught punctuation and relative links, but its collectors were non-recursive, skipped all of `test/`, and did not enforce the explicit-brace or unexplained-`any` rules.
  - Fix: file discovery is recursive; `test/` is punctuation-scanned with string literals AST-masked (fixture unicode stays exempt with no pragma invention); the brace and unexplained-`any` rules run as AST checks. scripts/check.mjs.
  - Verified: deliberate violations (uncommented `any`, braceless `if`, braceless `for`) are each flagged; CJK punctuation inside a test string literal is not; suite and check green.
  - Q: Why not the proposed ESLint / TS-aware rule?
    - A: The `typescript` package is already a devDependency and its parser answers both rules in ~40 lines; an ESLint stack would add a dependency tree and config surface to express the same two checks. The "is that dependency worth it" question dissolves - no new dependency was needed.

- [x] **[PERFORMANCE-30] - natural-height reconstruction assumed no author clamp on the inner list**
  - Symptom: the height reconstruction adds back all of `popupList.scrollHeight - clientHeight`; a consumer `max-height` on `.llselect-popup-list` would be read as extra natural height and could pick a placement side as if the popup were taller than it can render.
  - Fix: documented the invariant - the positioner owns the popup `maxHeight`; themes / consumers must not independently height-clamp the inner list. positioning.ts `PositionerOptions.innerScrollEl`.
  - Q: Why document the invariant instead of subtracting an author clamp?
    - A: Because the positioner cannot tell its own clamp-driven overflow from a consumer's without measuring against a known baseline, and shipped themes already honor it; a real-browser case is the way to revisit if a consumer actually hits it.

## review (documentation and release readiness)

- [x] **[HIGH-1] - trigger / listbox / filter input had no author-supplied accessible name**
  - Cause: no `ariaLabel` / `ariaLabelledBy` setting existed (violates WAI-ARIA 1.2).
  - Fix: field-name settings wired per mode. base.ts `syncFieldNameToDom`, src/i18n/en.ts, test/aria-name.test.ts. Screen-reader acceptance: [NEEDS-VERIFICATION-27].
- [x] **[HIGH-2] - filterable open-state focus contract did not match the code**
  - Cause: the trigger kept `tabindex="0"` while the filter input held focus, so Shift+Tab landed back on it with the popup open.
  - Fix: trigger leaves the tab order for the filterable open cycle. base.ts `syncTriggerTabindex`. Native Tab acceptance: [NEEDS-VERIFICATION-27].
- [x] **[MEDIUM-3] - `sideEffects: false` let bundlers drop the theme CSS import**
  - Fix: `sideEffects: ["**/*.css"]`. package.json. Bundler acceptance: [NEEDS-VERIFICATION-27].
- [x] **[DOCUMENTATION-4] - popup width policy section contradicted itself**
  - Fix: `match-trigger` (default) and `fit-content` described separately; dropped the "always = trigger width" claims. DESIGN.md "Popup width policy".
- [x] **[DOCUMENTATION-5] - ARIA element table collapsed the two trigger modes**
  - Fix: one row per mode (combobox / button) with the open-cycle tabindex. A11Y.md "Elements, roles, ARIA".
- [x] **[DOCUMENTATION-6] - the non-filterable open-state keyboard table was missing**
  - Fix: added it. A11Y.md "Keyboard - open, search inactive".
- [x] **[DOCUMENTATION-7] - close-time focus wording was too broad**
  - Fix: separated keyboard cancel from pointer / focusout dismissal to match `close()`'s `shouldReturnFocus`. A11Y.md "Focus".
- [x] **[DOCUMENTATION-8] - optgroup research carried an obsolete "not implemented" status**
  - Fix: archived with a superseded banner. docs/archive/optgroup-research.md.
- [x] **[DOCUMENTATION-9] - item-rendering brainstorm described resolved questions as open**
  - Fix: archived with a superseded banner mapping each question to what shipped. docs/archive/item-rendering-brainstorm.md.
- [x] **[DOCUMENTATION-10] - TODO.md was mostly completed history**
  - Fix: completed roadmap moved to docs/archive/roadmap-v0.0.1.md; TODO.md holds open work only.
- [x] **[DOCUMENTATION-11] - hard-coded test counts drift out of date**
  - Symptom: `219` / `182` test counts in naming-conventions.md and render-responsibilities.md.
  - Fix: replaced with `npm test passes`. naming-conventions.md, render-responsibilities.md.
  - Q: Why not dismiss this as a false positive (no such counts exist)?
    - A: Because they DID exist - the earlier scan matched only `test` / `subtest` adjacent to a digit and missed the `<n> tests` prose form, so the counts sat unnoticed in two docs. Grep the surface form the doc actually uses, not the one you expect.
- [x] **[DOCUMENTATION-12] - release-candidate review bookkeeping was inconsistent**
  - Fix: corrected the fixed-defect count (four - the fourth being the isItemEffectivelyDisabled rename) and the Container-Content pair count (nine); archived. docs/archive/review-release-candidate.md.
- [x] **[DOCUMENTATION-13] - CLAUDE.md claimed to be "style only" while defining behavior**
  - Fix: authority split - CLAUDE.md = agent behavior + style, DESIGN.md = API, A11Y.md = keyboard / focus / ARIA. CLAUDE.md.
- [x] **[DOCUMENTATION-14] - exact project verification commands were undocumented**
  - Fix: added the test / build / check / pack list + the real-browser caveat. CLAUDE.md.
- [x] **[DOCUMENTATION-15] - generated / abandoned files had no rule**
  - Fix: documented `dist/` / `.build/` (generated) and `src/draft.ts` (abandoned) + the API-change move-together list. CLAUDE.md.
- [x] **[DOCUMENTATION-16] - the language / character exception was narrower than legitimate use**
  - Fix: exception now covers unicode-behavior test fixtures and intentional visual glyphs, not just i18n strings. CLAUDE.md.
- [x] **[DOCUMENTATION-17] - the browser target "roughly the last 5 years" drifted with the calendar**
  - Fix: fixed support floor (Firefox 78+, Chrome/Edge 87+, Safari 14.1+) derived from the APIs actually used. CLAUDE.md.
- [x] **[QUALITY-18] - enforceable style rules were not automated**
  - Fix: `npm run check` (zero-dep: ASCII punctuation + doc links), wired into `prepublishOnly`. scripts/check.mjs. Broader coverage: [QUALITY-29].
- [x] **[DOCUMENTATION-19] - README needed copy-editing and a single-H1 hierarchy**
  - Fix: full copy-edit; one H1 with H2/H3. README.md.
- [x] **[DOCUMENTATION-20] - native form limitations were unstated**
  - Fix: "What llselect deliberately does NOT do" section with a form-sync example. README.md.
- [x] **[DOCUMENTATION-21] - the sanitizer warning was broader than the real risk**
  - Fix: narrowed - item strings go through `textContent`; the risk is only in app-side `innerHTML` in custom render callbacks. README.md.
- [x] **[DOCUMENTATION-22] - unmeasured performance claims ("blazing fast", "beats vdom")**
  - Fix: replaced with a concrete implementation description. README.md, DESIGN.md.
  - Q: Why revisit after "blazing fast" was already replaced?
    - A: Because the replacement ("O(1) DOM work" for a single-item selection) was itself too broad - `toggleItem` also re-renders the trigger, which in `tags` mode rebuilds one chip per chosen item. Only the popup-list ROW replacement is O(1); the claim now says exactly that. README.md, multiple.ts.
- [x] **[DOCUMENTATION-23] - consumer docs were unreachable from the npm tarball**
  - Fix: stable repository links from README (docs/ is not packed). README.md.
- [x] **[DOCUMENTATION-24] - the LLM-disclosure heading's tone was flagged**
  - Fix: none - kept verbatim.
  - Q: Why keep the confrontational `fucking idiot vibe coder` heading?
    - A: Because it is the author's voice and an explicit editorial choice, not a correctness / transparency / release-readiness defect. Only grammar around it was fixed.
- [x] **[DOCUMENTATION-25] - there was no compact consumer API overview**
  - Fix: capabilities table with links to the contract docs. README.md.
