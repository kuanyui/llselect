# TODO

Version-controlled source of truth for llselect's REMAINING work only. Review findings (open and resolved) live in `FIXME.md`; completed phases, rulings, and design decisions are archived in `archive/roadmap-v0.0.1.md`; the pre-publish API review record in `archive/review-release-candidate.md`. (The Claude Code harness keeps its own in-session task list, but that is session-local and not committed - this file is the durable record.)

Status: `[ ]` todo, `[~]` in progress.

## Release readiness - manual verification (open)

The automatable layer of the original checklist ran green in real Chromium and Firefox (Playwright: accessibility trees, native Tab, layout, pointer, both benchmark pages, bundler builds) - evidence recorded in `FIXME.md` under the release-acceptance entries. What remains needs a human or real assistive technology:

- [ ] **Screen-reader announcement pass** (NVDA + Firefox, VoiceOver + Safari if available). The computed name / role / state layer is verified in both engines' accessibility trees, including `clearable` and tags chips (the `Apple Remove Apple` duplication was found there and fixed), so this pass is only about what AT actually speaks: announcement order and verbosity across open / close / filter, multiselectable + per-option selected phrasing, the combobox VALUE channel for non-filterable tags (does NVDA read the chip remove buttons into the value?), and the timing of the `role="status"` no-results announcement. Contract: `A11Y.md`.
- [ ] **Headed-browser scrollbar drag** (headless browsers hide real scrollbars): drag the popup list's native scrollbar; the popup must stay open, focus must stay on the combobox host, and the drag must scroll. The guard it depends on (mousedown on the list body not default-prevented, on options prevented) is verified in both engines.
- [ ] **i18n native-speaker sign-off**: ja / ar / he are LLM-drafted and were line-reviewed and corrected by a second model (ja count-summary now state-phrased, he number agreement fixed, ar clean - see `src/i18n.ts`). Decide whether a human native-speaker sign-off is required before release or the cross-model review is accepted for 0.0.1. Also decide there: the `filterInputAriaLabel` VALUES still say "Search" in every pack (key renamed, values kept) - whether the spoken label should move to "Filter" wording is a per-language copy call.
- [ ] **Pages-site interactive JS pass** (this session's sandbox had no runnable browser: playwright chromium is missing system libs, no sudo). The static layer is machine-verified (TOC built for every heading, 431 sidebar links + all intra/cross-page anchors resolve, nav markup correct); what needs a human in a real browser, on `npm run serve:site`: API sidebar scrollspy (highlight follows scroll, active branch auto-opens, sidebar auto-scrolls its own overflow), sidebar filter (narrows while typing, clearing restores + re-collapses to the active chain), symbol links inside `<summary>` (navigate AND stay open, second click must not collapse), the mdi chevron toggle (rotates when open, hit area comfortable, chevron-less leaf rows text-align with chevron rows), the Fold all button (collapses every branch and clears the filter; active branch reopens only on the next scroll change), the jump-target highlight on the content side (`main :target` halo after clicking a sidebar link), narrow-viewport fallback (sidebar hides below 62rem), the heading scale (h5 members no longer smaller than body), and the nav repo-link host swap (shows GitHub locally / on github.io, GitLab on kuanyui.gitlab.io). All in `scripts/build-site.mjs`.

## Accepted limitations (known, deliberately not planned)

- A single set of `.d.ts` serves both ESM and CJS. TypeScript consumers on `moduleResolution: nodenext` who `require()` the package hit the classic dual-types edge (bundler / `import` consumers are unaffected). Fixing it properly means bundling declarations into per-format `.d.ts` / `.d.cts` - revisit if anyone actually hits it.
- Per-item click listeners stay (no event delegation) until a benchmark shows a win; lazy render already bounds the cost. See the event-delegation deferral in `archive/roadmap-v0.0.1.md`.

## Notes

- Architecture / naming rationale: see `DESIGN.md`.
- Keyboard / focus / ARIA behavior contract: see `A11Y.md`.
- Method naming conventions (suffixes, callback naming): see `naming-conventions.md`.
- `render*` orchestrator vs `*ToDom` / `*El` primitive split: see `render-responsibilities.md`.
- Code style rules: see `../../CLAUDE.md`.
- Review findings (open + resolved): see `FIXME.md`.
- Completed roadmap + rulings: see `archive/roadmap-v0.0.1.md`; pre-publish API review: see `archive/review-release-candidate.md`.
