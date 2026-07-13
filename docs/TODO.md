# TODO

Version-controlled source of truth for llselect's REMAINING work only.
Review findings (open and resolved) live in `FIXME.md`; completed phases,
rulings, and design decisions are archived in `archive/roadmap-v0.0.1.md`; the
pre-publish API review record in `archive/review-release-candidate.md`. (The
Claude Code harness keeps its own in-session task list, but that is
session-local and not committed - this file is the durable record.)

Status: `[ ]` todo, `[~]` in progress.

## Release readiness - manual verification (open)

jsdom cannot exercise these; they need a real browser and real assistive
technology before the first public release.

- [ ] **Accessible-name pass with a screen reader** (NVDA + Firefox, VoiceOver
      + Safari if available). With `ariaLabelledBy` (and once with `ariaLabel`):
      closed trigger announces field name + current value in both modes;
      searchable open announces the field name on the search input; listbox is
      named; `LLSelectMultiple` announces multi-selectable state and per-option
      selected state. Contract: `A11Y.md` "Accessible name".
- [ ] **Real-browser Tab / Shift+Tab pass** (jsdom has no native Tab
      navigation). searchable open: Tab and Shift+Tab leave the widget and
      close the popup (trigger is out of the tab order while open); closed:
      one tab stop only. Contract: `A11Y.md` "Focus".
- [ ] **Real-browser visual / pointer pass** for the rest of what jsdom cannot
      cover: RTL mirroring, mousedown focus-steal rules, native scrollbar drag
      inside the popup list, select-all tri-state and no-results visuals.
      Include the placement-stickiness scenario (near-bottom trigger, popup
      opens upward, filter to zero matches, Esc to restore): the popup must
      stay upward the whole time - it used to flip down on the empty list and
      stay stuck squeezed at the bottom after the filter cleared. On Firefox
      specifically, also verify the open instant: no window-scroll jolt on a
      page with `scroll-behavior: smooth` (the demo has it), and a
      scrolled-to-chosen option stays scrolled into view in the list. Confirm
      that opening while the trigger is scrolled out of view / clipped is a
      clean no-op (popup never flashes, no listeners stranded).
- [ ] **Benchmark page competitor adapters** (`demo/benchmark.html`): the
      llselect adapter path is jsdom-smoke-tested, but the Choices / Select2 /
      Tom Select / Slim Select adapters (open / filter / select selectors and
      teardown) only run against the real CDN builds in a browser. Open the page
      in Firefox and Chromium, run each size, and fix any cell showing `-`
      (an API drift on a pinned version). Sanity-check that the numbers are fair
      before citing them anywhere.
- [ ] **Consumer bundler smoke test** (production mode): import
      `llselect/themes/vanilla.css` in a webpack/vite app with tree shaking on
      and assert the CSS reaches the output (`sideEffects: ["**/*.css"]`
      guards this; verify once against a real bundler).
- [ ] **i18n native-speaker review**: ja / ar / he pack translations are
      LLM-drafted (flagged in `src/i18n.ts`); have them vetted before a
      release. (zh-TW is user-vetted.)

## Accepted limitations (known, deliberately not planned)

- A single set of `.d.ts` serves both ESM and CJS. TypeScript consumers on
  `moduleResolution: nodenext` who `require()` the package hit the classic
  dual-types edge (bundler / `import` consumers are unaffected). Fixing it
  properly means bundling declarations into per-format `.d.ts` / `.d.cts` -
  revisit if anyone actually hits it.
- Per-item click listeners stay (no event delegation) until a benchmark shows
  a win; lazy render already bounds the cost. See the event-delegation
  deferral in `archive/roadmap-v0.0.1.md`.

## Notes

- Architecture / naming rationale: see `DESIGN.md`.
- Keyboard / focus / ARIA behavior contract: see `A11Y.md`.
- Method naming conventions (suffixes, callback naming): see `naming-conventions.md`.
- `render*` orchestrator vs `*ToDom` / `*El` primitive split: see `render-responsibilities.md`.
- Code style rules: see `../CLAUDE.md`.
- Review findings (open + resolved): see `FIXME.md`.
- Completed roadmap + rulings: see `archive/roadmap-v0.0.1.md`; pre-publish
  API review: see `archive/review-release-candidate.md`.
