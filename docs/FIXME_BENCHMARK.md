# FIXME - interaction-latency benchmark

Plain checklist for the interaction-latency rework. No severity codes, no
numbering - just tick when done. Design rationale and the traps behind these
live in `SPEC_BENCHMARK.md`.

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
      `.select2-results__option--selected`, Slim `.ss-option[aria-selected="true"]`)
      find a clickable element in the OPEN list and the click drops the chosen
      count; and that Choices / Tom Select correctly fall to n/a (the count-drop
      guard reports n/a, it does not time a no-op click). Source-verified above,
      but the actual DOM classes / open-list rendering need a real browser.
