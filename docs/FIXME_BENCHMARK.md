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

## Planned: deselect phases + close-button checkbox (AGREED, not yet built)

Design agreed with the user; this is the next rework. Rationale below.

Structure (decided): keep ONE interaction section, but give the single and multi
tables their OWN column sets (no shared list, no n/a-column noise). So `IX_PHASES`
becomes per-mode instead of one shared array.

- [ ] Single table columns: Open popup / Filter candidates / Choose candidate /
      Close popup. (single has no tags and no in-popup unchoose.)
- [ ] Multi table columns: Open popup / Filter candidates / Choose candidate /
      **Unchoose (in popup)** / Close popup, PLUS **Remove tag (x)** only when the
      close-button checkbox is on.
- [ ] Add a checkbox "test close button on multiple tags" (interaction controls).
      It GLOBALLY gates the close-button rendering, not just the extra column:
      enabling close buttons changes what each library renders on a tag, so it
      also affects the Choose number. OFF (default) = each library's default tag
      rendering, i.e. the "no custom template / no forced close button" baseline;
      ON = close buttons enabled + the Remove-tag column appears. Some libraries
      only get a tag close button through a setting/plugin/custom template
      (Choices `removeItemButton`, Tom Select `remove_button` plugin; a custom
      `render.item` can REPLACE the built-in button, so you would have to add it
      back), so forcing it on everyone always is not a fair default - hence the
      opt-in.
- [ ] Unchoose (in popup): a REAL DOM click on an already-chosen option element
      IN the open popup list (not an API call), matching the Remove-tag spirit.
- [ ] Remove tag (x): change the CURRENT (already-built, unconditional) Remove-tag
      phase to be gated behind the close-button checkbox, and keep it as a real
      click on the tag x button. Currently it is always measured - that must
      become conditional.

### Per-library "unchoose in popup" behaviour (IMPORTANT - measured n/a for most)

Unchoose-in-popup is NOT universal; clicking a chosen option in the open list
does different things per library, so most will be n/a (which itself shows
llselect supports it and the others do not):

- llselect: clicking a chosen item in the list toggles it OFF. Supported.
- Choices.js: a chosen candidate is auto-REMOVED from the popup, so there is
  nothing in the list to click to unchoose - n/a.
- Tom Select: same as Choices - chosen candidates are removed from the popup - n/a.
- Slim Select: clicking a chosen candidate in the popup has NO toggle effect - n/a.
- Select2: TBD - verify in a browser (likely removes chosen from the dropdown, or
  no toggle). Treat as n/a until confirmed.

So the Unchoose column will mostly be n/a for competitors. Detect "did the click
actually deselect?" (chosen count dropped); if not, report n/a rather than a
misleading number.

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
