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
