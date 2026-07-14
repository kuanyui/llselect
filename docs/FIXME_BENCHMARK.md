# FIXME - interaction-latency benchmark

Plain checklist for the interaction-latency rework. No severity codes, no
numbering - just tick when done. Design rationale and the traps behind these
live in `SPEC_BENCHMARK.md`.

## Real-browser results that contradict perceived experience (found in testing)

Recorded before fixing (do not lose these). All fixed and VERIFIED by driving the
real page in a headless Chromium (Playwright), not by eyeballing.

- [x] Choices Filter read ~0.25 ms (ranked first) despite feeling slower than
      llselect: `timeToSettle` broke after 2 quiet frames, and Choices fires a tiny
      immediate mutation then renders the filtered list a frame or two later - the
      break landed in the gap and timed only the trivial first mutation. Fixed with
      a minimum observation window before the quiet break; returns time to the LAST
      mutation. Headless: now ~4.7 ms.
- [x] Choices Choose read ~11 ms despite clear perceived lag - same root cause.
      Headless: now ~2.8 ms.
- [x] Filter is a round-trip: `median('' -> q) + median(q -> '')`, reported as the
      sum. Headless: Slim ~205 ms (its real 200 ms debounce shows up), others single
      digit.
- [x] Select2 tag remove (x) click bubbled to the selection and opened the dropdown,
      polluting Remove-tag. Fixed by preventing the cancelable `select2:opening`
      around the click.
- [x] Select2 Unchoose read n/a: its results select on `mouseup`, so `el.click()`
      did nothing. Fixed by dispatching a full pointer + mouse sequence. Headless:
      n/a -> ~5.8 ms.
- [x] Slim Unchoose read n/a: `.ss-content` is portaled to body and every widget
      leaves one, so a mount-scoped selector missed it and a document-wide one hit
      the wrong widget. Fixed by targeting the OPEN content (`.ss-open-*`). Headless:
      n/a -> a real (slow) number.
- [x] Slim Remove-tag / Unchoose timed ~100 ms of a hardcoded `setTimeout` chip
      removal (exit animation) that `animation:none` cannot reach. Fixed by running
      short timers immediately around the click. Headless: Remove-tag ~100 ms -> ~3.7 ms.
- [x] Tom Unchoose is n/a: clicking a `.selected` option calls the idempotent
      `addItem` - the `remove_button` plugin does NOT deselect (that was the
      `checkbox_options` plugin, which renders checkboxes). Confirmed headless.
- [x] Legibility: chosen dropdown options get a distinct background + text color in
      the benchmark CSS (Choices `.is-selected`, Tom `.option.selected`, Select2
      `--selected`, Slim `.ss-selected`, llselect `aria-selected`) - all classes
      confirmed present in the headless probe. Paint-only, uniform.

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

## Verified in headless Chromium (Playwright, driving the real page)

- [x] Interaction test runs; Choices open / filter / choose show realistic numbers
      (filter ~4.7 ms, choose ~2.8 ms), not ~0.
- [x] Each competitor keeps its popup open on a multi choose (choose is measured for
      all five).
- [x] Remove-tag: every remove-button selector (`.choices__button`,
      `.select2-selection__choice__remove`, `.ts-control .remove`,
      `.ss-value-delete`) finds and removes a tag (all five report a number).
- [x] Unchoose selectors find a clickable chosen option in the OPEN list; the click
      drops the chosen count for llselect / Select2 / Slim; Choices and Tom read n/a
      (both keep the option visible but neither deselects on click - Tom's
      `remove_button` does NOT toggle off, only `checkbox_options` would). The
      count-drop guard reports n/a, never times a no-op click.
- [x] Keep-selected settings work: Choices `renderSelectedChoices: 'always'` and Tom
      `hideSelected: false` leave a chosen option visible (`.is-selected` /
      `.selected` present), so the list does not shrink per selection.
- [x] Slim `maxValuesShown: Infinity` prevents the collapse: 20-30 selected still
      renders one chip per item (Remove-tag found the chips), not a `.ss-max` summary.

## Still worth a manual pass (not done here)

- [ ] Spot-check in Firefox and Safari (only Chromium was driven headless here); the
      positioning / portaling and any WebKit-specific event quirks want a real look.
- [ ] Eyeball the chosen-option highlight colors and the RTL / dark cases visually.
