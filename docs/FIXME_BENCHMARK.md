# FIXME - interaction-latency benchmark

Plain checklist for the interaction-latency rework. No severity codes, no
numbering - just tick when done. Design rationale and the traps behind these
live in `SPEC_BENCHMARK.md`.

## Real-browser results that contradict perceived experience (found in testing)

Recorded before fixing (do not lose these). Code fixes for all of these have
landed; they stay unticked until re-confirmed in a real browser.

- [ ] Choices Filter reads ~0.25 ms (ranked first) but clearing the query feels
      slightly SLOWER than llselect. Suspected cause: `timeToSettle` breaks after
      2 quiet frames, and Choices fires a tiny immediate mutation (input attr /
      class) and THEN renders the filtered list a frame or two later (rAF /
      internal defer) - the 2-quiet-frame break lands in the gap and times only
      the trivial first mutation. Fix: observe for a minimum window (past any
      debounce / rAF defer) before allowing the quiet break, and return time to
      the LAST mutation, so the real filtered render is what is timed.
- [ ] Choices Choose reads ~11 ms (ranked first) but has clear perceived lag. Same
      root cause as the filter reading: the real re-render lands after the early
      settle break. The `timeToSettle` fix above should cover it; re-check in a
      browser.
- [ ] Filter should measure BOTH directions as a round-trip, not one direction /
      a mixed median. Report `median('' -> q) + median(q -> '')` so the number is
      "narrow to half, then restore" - the real filter interaction. (Confirm the
      loop already times both directions; make the REPORTED value their sum.)
- [ ] Select2 tag remove (x): a real click on `.select2-selection__choice__remove`
      BUBBLES to the selection container and OPENS the dropdown, which both is a UX
      bug and pollutes the Remove-tag timing (the open render gets counted). Hack:
      suppress the open around the remove click (prevent `select2:opening`), so
      only the tag removal is timed.
- [ ] Legibility: with selected options now kept in the dropdown, a chosen option
      is not visually distinct. Give chosen dropdown options a distinct background
      + text color in the demo CSS: Choices `.choices__item--choice.is-selected`,
      and Tom Select's chosen option (VERIFY it exposes a class / attr to target -
      if it truly marks nothing, note that it cannot be styled). Applies per-library
      to the dropdown option, paint-only (no layout / DOM added), same for all.

## Naming

- [x] Rename the "Select" column and its phase to "Choose".

## Separate the phases - never mix filter with choose

- [x] Filter measured on its own: open once, then `q` -> clear -> `q` -> clear,
      five times, timing each keystroke. No open / choose / close mixed in.
- [x] Choose measured on its own, with the filter cleared first (empty box, full
      list). Multiple: choose the first 10 items; the popup stays open the whole
      time (closing it skips the open-list re-render and is unfair). Single:
      choose one item.
- [x] Open and close measured on their own.

## Measurement accuracy

- [x] Debounced filter: Tom Select and Slim Select debounce the search input, so
      a to-paint timer misses the deferred render and reads fast. Filter is now
      measured by waiting until the DOM settles, which catches the debounced
      render. (llselect filters synchronously - no debounce - confirmed in
      `src/base.ts` `handleSearchInputEvent`.)
- [x] Slim Select open/close transition animation adds perceived time that is not
      work. Transitions / animations are disabled on everything during a run
      (an injected `* { transition:none; animation:none }` style), so the number
      reflects work, not animation.
- [x] Keep the to-paint measurement for open / close (Choices reveals a
      `display:none` pre-rendered list; the cost is layout + paint on the frame,
      not in the synchronous call).

## Deselect phases + close-button checkbox (BUILT)

Per-mode interaction columns plus the two deselect phases. `IX_PHASES` is now a
per-mode `ixPhases(mode)`; the table headers are built by `ixInitTable`.

- [x] Single table columns: Open popup / Filter candidates / Choose candidate /
      Close popup (no tags, no in-popup unchoose).
- [x] Multi table columns: Open popup / Filter candidates / Choose candidate /
      Unchoose (in popup) / Close popup, plus Remove tag (x) only when the
      close-button checkbox is on.
- [x] Checkbox "test close button on multiple tags" gates BOTH the opt-in tag x
      (Choices `removeItemButton`, Tom Select `remove_button` plugin) AND the
      Remove-tag column. Off by default = the libraries' default tag rendering; it
      also affects the Choose number (a tag with an x is more DOM). Mass section
      keeps its old behaviour (`closeBtn: true`).
- [x] Unchoose (in popup): a REAL DOM click on an already-chosen option element in
      the open list, verified to actually drop the chosen count (else n/a).
- [x] Remove tag (x): now gated behind the checkbox (was unconditional).

### Per-library "unchoose in popup" behaviour (VERIFIED against the pinned builds)

Earlier this doc guessed "n/a for most" (Slim Select "no toggle", Select2 "TBD")
without checking each library's deselect API. That was wrong. Grepping the pinned
minified/UMD builds + reading the option-click handlers settles it: 3 of 5 support
an in-popup unchoose.

- llselect: chosen list item carries `aria-selected="true"`; a click toggles it
  off. Supported (native).
- Select2 4.1.0-rc.0: chosen options render in the results with `--selected`; in
  multiple mode a click fires `unselect`. Supported (native, no config).
- Slim Select 2.10.0: the option-click handler early-returns on
  `option.selected && !allowDeselect`, else (multi) filters the id out. Supported
  with `allowDeselect: true` (set in the adapter). NOT "no toggle" as first claimed.
- Choices.js 11.1.0: the choice handler acts only `if (!selected)`, so clicking an
  already-selected choice is a no-op. Genuinely n/a (removal is the tag x). Its
  `renderSelectedChoices: 'always'` keeps selected choices visible but does not
  make them deselect on click.
- Tom Select 2.4.3: `addItem` is idempotent (returns early when the value is
  already an item), so clicking a selected option is a no-op. Genuinely n/a.

The harness detects a real deselect (chosen count dropped) and reports n/a
otherwise, so a version that changes this behaviour degrades safely.

Lesson (the reason the first pass was wrong): do not mark a competitor phase n/a
from memory - check whether the library exposes the capability behind a setting
(`allowDeselect`, `hideSelected`, `renderSelectedChoices`) before concluding it
cannot do the thing.

## Still open (real-browser only - cannot verify without a browser here)

- [ ] Run the reworked interaction test in Firefox and Chromium and sanity-check
      that Choices' open / filter now show realistic (non-zero, human-plausible)
      numbers, and that Tom Select / Slim Select filter is no longer read as ~0.
- [ ] Confirm each competitor keeps its popup open on a multi choose; if one
      closes, decide whether to re-open (untimed) or flag it.
- [ ] Verify the Remove-tag phase in a browser: each competitor's remove-button
      selector (`.choices__button`, `.select2-selection__choice__remove`,
      `.ts-control .remove`, `.ss-value-delete`) actually finds and removes a tag
      on the loaded version. (llselect's `.llselect-tag-remove-button` is
      jsdom-verified.)
- [ ] Verify the Unchoose-in-popup phase in a browser: the chosen-option selectors
      (`.llselect-item[aria-selected="true"]`, Select2
      `.select2-results__option--selected`, Slim `.ss-option[aria-selected="true"]`,
      Choices `.choices__item--choice.is-selected`, Tom `.ts-dropdown .option.selected`)
      each find a clickable chosen option in the OPEN list; the click drops the
      chosen count for llselect / Select2 / Slim; Tom drops it too WHEN the
      close-button checkbox is on (the `remove_button` plugin hook removes a
      `.selected` option) and reads n/a when off; Choices reads n/a (its click only
      adds, never deselects). The count-drop guard must report n/a, never time a
      no-op click.
- [ ] Verify the "keep selected in the list" settings in a browser:
      `renderSelectedChoices: 'always'` (Choices) and `hideSelected: false` (Tom
      Select) keep a chosen option visible in the dropdown, so choosing / filtering
      re-renders the full-size list (not one that shrinks per selection).
- [ ] Verify Slim Select's `maxValuesShown: Infinity` prevents the tag collapse:
      select more than 20 and confirm it renders one chip per item, NOT a single
      `{n} selected` (`.ss-max`) summary. Sanity-check the mass multi + pre-select
      DOM-node count for Slim at 1,000 x 10 reflects ~100 chips, not 1.
