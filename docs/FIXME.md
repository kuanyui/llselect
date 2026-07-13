# FIXME - review-findings log

Findings from reviews of llselect, newest round on top. Format spec (severity
words, `[SEVERITY-N]` ids, Symptom/Cause/Fix/Verified labels, cross-round Q&A)
lives in `../CLAUDE.md` "Review-findings log". `N` is a stable id in creation
order, not a rank; open items are `[ ]`, resolved `[x]`. No dates here - git
log owns the when.

## review (release-readiness follow-up)

- [x] **[HIGH-26] - opening against an off-screen trigger leaked listeners re-entrantly**
  - Symptom: `open()` with the trigger already scrolled out of view / clipped
    reported the control closed yet left the positioner (scroll / resize /
    ResizeObserver) plus outside-click / focusout handlers live; `destroy()`
    could not recover them.
  - Cause: the positioner's initial synchronous `reposition(true)` fired
    `onHide -> close()` before `this.positioner` was assigned and before the
    listeners were attached, then `open()` continued past the aborted close.
  - Fix: `open()` refuses up front when `isAnchorHidden(triggerEl)` (new
    exported predicate reusing the positioner's own layout-viewport test),
    mirroring the disabled guard, so the positioner is never built for a
    hidden anchor. base.ts `open`, positioning.ts `isAnchorHidden`.
  - Verified: test/positioning.test.ts (no-op open, no callbacks, later resize
    does not mutate the hidden popup, `destroy()` clean).

- [ ] **[NEEDS-VERIFICATION-27] - release acceptance gates are not signed off**
  - Impact: the code / doc fixes for accessible names, searchable Tab order,
    and CSS retention are in and unit-covered, but their real-browser /
    screen-reader / real-bundler acceptance is still open, so the original
    release blockers are only conditionally closed.
  - Fix: the actionable checklist lives in `TODO.md` "release readiness -
    manual verification". Expand the screen-reader pass to `clearable: true`
    and `triggerDisplay: 'tags'`: in searchable mode the trigger is
    `role="button"` and the clear / tag-remove buttons are its descendants
    (presentational to AT), so only a real AT run can rule out a hidden control
    or a duplicated name like `Apple Remove Apple`.

- [x] **[DOCUMENTATION-28] - generated API docstrings described the trigger as always a combobox**
  - Symptom: `triggerClass` and `triggerEl` docstrings (emitted into
    `dist/base.d.ts`, so consumer-facing) gave a fixed `role="combobox"` and
    put `aria-activedescendant` on the trigger unconditionally.
  - Fix: both now state the role per search mode (combobox inactive / button
    while a searchable popup is open) and where `aria-activedescendant` lives.
    base.ts `triggerClass`, `triggerEl`.

- [ ] **[QUALITY-29] - the mechanical check covers only part of its policy**
  - Impact: `scripts/check.mjs` catches punctuation and relative links, but its
    collectors are non-recursive, skip all of `test/`, and do not enforce the
    explicit-brace or unexplained-`any` rules.
  - Fix (proposed): make file discovery recursive and scan test source
    (exempting only intentional fixture data). Brace / explicit-`any`
    enforcement wants an ESLint or TypeScript-aware rule, not a text scan -
    decide whether that dependency is worth it before building it.

- [x] **[PERFORMANCE-30] - natural-height reconstruction assumed no author clamp on the inner list**
  - Symptom: the height reconstruction adds back all of
    `popupList.scrollHeight - clientHeight`; a consumer `max-height` on
    `.llselect-popup-list` would be read as extra natural height and could pick
    a placement side as if the popup were taller than it can render.
  - Fix: documented the invariant - the positioner owns the popup `maxHeight`;
    themes / consumers must not independently height-clamp the inner list.
    positioning.ts `PositionerOptions.innerScrollEl`.
  - Q: Why document the invariant instead of subtracting an author clamp?
    - A: Because the positioner cannot tell its own clamp-driven overflow from
      a consumer's without measuring against a known baseline, and shipped
      themes already honor it; a real-browser case is the way to revisit if a
      consumer actually hits it.

## review (documentation and release readiness)

- [x] **[HIGH-1] - trigger / listbox / search input had no author-supplied accessible name**
  - Cause: no `ariaLabel` / `ariaLabelledBy` setting existed (violates WAI-ARIA 1.2).
  - Fix: field-name settings wired per mode. base.ts `syncFieldNameToDom`,
    texts.ts, test/aria-name.test.ts. Screen-reader acceptance: [NEEDS-VERIFICATION-27].
- [x] **[HIGH-2] - searchable open-state focus contract did not match the code**
  - Cause: the trigger kept `tabindex="0"` while the search input held focus,
    so Shift+Tab landed back on it with the popup open.
  - Fix: trigger leaves the tab order for the searchable open cycle. base.ts
    `syncTriggerTabindex`. Native Tab acceptance: [NEEDS-VERIFICATION-27].
- [x] **[MEDIUM-3] - `sideEffects: false` let bundlers drop the theme CSS import**
  - Fix: `sideEffects: ["**/*.css"]`. package.json. Bundler acceptance: [NEEDS-VERIFICATION-27].
- [x] **[DOCUMENTATION-4] - popup width policy section contradicted itself**
  - Fix: `match-trigger` (default) and `fit-content` described separately;
    dropped the "always = trigger width" claims. DESIGN.md "Popup width policy".
- [x] **[DOCUMENTATION-5] - ARIA element table collapsed the two trigger modes**
  - Fix: one row per mode (combobox / button) with the open-cycle tabindex.
    A11Y.md "Elements, roles, ARIA".
- [x] **[DOCUMENTATION-6] - the non-searchable open-state keyboard table was missing**
  - Fix: added it. A11Y.md "Keyboard - open, search inactive".
- [x] **[DOCUMENTATION-7] - close-time focus wording was too broad**
  - Fix: separated keyboard cancel from pointer / focusout dismissal to match
    `close()`'s `shouldReturnFocus`. A11Y.md "Focus".
- [x] **[DOCUMENTATION-8] - optgroup research carried an obsolete "not implemented" status**
  - Fix: archived with a superseded banner. docs/archive/optgroup-research.md.
- [x] **[DOCUMENTATION-9] - item-rendering brainstorm described resolved questions as open**
  - Fix: archived with a superseded banner mapping each question to what shipped.
    docs/archive/item-rendering-brainstorm.md.
- [x] **[DOCUMENTATION-10] - TODO.md was mostly completed history**
  - Fix: completed roadmap moved to docs/archive/roadmap-v0.0.1.md; TODO.md
    holds open work only.
- [x] **[DOCUMENTATION-11] - hard-coded test counts drift out of date**
  - Symptom: `219` / `182` test counts in naming-conventions.md and
    render-responsibilities.md.
  - Fix: replaced with `npm test passes`. naming-conventions.md,
    render-responsibilities.md.
  - Q: Why not dismiss this as a false positive (no such counts exist)?
    - A: Because they DID exist - the earlier scan matched only `test` / `subtest`
      adjacent to a digit and missed the `<n> tests` prose form, so the counts
      sat unnoticed in two docs. Grep the surface form the doc actually uses,
      not the one you expect.
- [x] **[DOCUMENTATION-12] - release-candidate review bookkeeping was inconsistent**
  - Fix: corrected the fixed-defect count (four - the fourth being the
    isItemEffectivelyDisabled rename) and the Container-Content pair count
    (nine); archived. docs/archive/review-release-candidate.md.
- [x] **[DOCUMENTATION-13] - CLAUDE.md claimed to be "style only" while defining behavior**
  - Fix: authority split - CLAUDE.md = agent behavior + style, DESIGN.md = API,
    A11Y.md = keyboard / focus / ARIA. CLAUDE.md.
- [x] **[DOCUMENTATION-14] - exact project verification commands were undocumented**
  - Fix: added the test / build / check / pack list + the real-browser caveat. CLAUDE.md.
- [x] **[DOCUMENTATION-15] - generated / abandoned files had no rule**
  - Fix: documented `dist/` / `.build/` (generated) and `src/draft.ts`
    (abandoned) + the API-change move-together list. CLAUDE.md.
- [x] **[DOCUMENTATION-16] - the language / character exception was narrower than legitimate use**
  - Fix: exception now covers unicode-behavior test fixtures and intentional
    visual glyphs, not just i18n strings. CLAUDE.md.
- [x] **[DOCUMENTATION-17] - the browser target "roughly the last 5 years" drifted with the calendar**
  - Fix: fixed support floor (Firefox 78+, Chrome/Edge 87+, Safari 14.1+)
    derived from the APIs actually used. CLAUDE.md.
- [x] **[QUALITY-18] - enforceable style rules were not automated**
  - Fix: `npm run check` (zero-dep: ASCII punctuation + doc links), wired into
    `prepublishOnly`. scripts/check.mjs. Broader coverage: [QUALITY-29].
- [x] **[DOCUMENTATION-19] - README needed copy-editing and a single-H1 hierarchy**
  - Fix: full copy-edit; one H1 with H2/H3. README.md.
- [x] **[DOCUMENTATION-20] - native form limitations were unstated**
  - Fix: "What llselect deliberately does NOT do" section with a form-sync
    example. README.md.
- [x] **[DOCUMENTATION-21] - the sanitizer warning was broader than the real risk**
  - Fix: narrowed - item strings go through `textContent`; the risk is only in
    app-side `innerHTML` in custom render callbacks. README.md.
- [x] **[DOCUMENTATION-22] - unmeasured performance claims ("blazing fast", "beats vdom")**
  - Fix: replaced with a concrete implementation description. README.md, DESIGN.md.
  - Q: Why revisit after "blazing fast" was already replaced?
    - A: Because the replacement ("O(1) DOM work" for a single-item selection)
      was itself too broad - `toggleItem` also re-renders the trigger, which in
      `tags` mode rebuilds one chip per chosen item. Only the popup-list ROW
      replacement is O(1); the claim now says exactly that. README.md, multiple.ts.
- [x] **[DOCUMENTATION-23] - consumer docs were unreachable from the npm tarball**
  - Fix: stable repository links from README (docs/ is not packed). README.md.
- [x] **[DOCUMENTATION-24] - the LLM-disclosure heading's tone was flagged**
  - Fix: none - kept verbatim.
  - Q: Why keep the confrontational `fucking idiot vibe coder` heading?
    - A: Because it is the author's voice and an explicit editorial choice, not
      a correctness / transparency / release-readiness defect. Only grammar
      around it was fixed.
- [x] **[DOCUMENTATION-25] - there was no compact consumer API overview**
  - Fix: capabilities table with links to the contract docs. README.md.
