# Benchmark specification

Design, methodology, and the traps hit while building the llselect benchmark
(`demo/benchmark.html` + `demo/benchmark.js`). Open work is in
`FIXME_BENCHMARK.md`.

The benchmark is REAL-BROWSER ONLY: it needs layout, paint, and the competitor
libraries loaded from the CDN. jsdom can smoke-test the llselect adapter path but
cannot produce meaningful timings.

## Purpose

Compare llselect against the native `<select>` (baseline floor) and the common
JavaScript select libraries - Choices.js, Select2, Tom Select, Slim Select - on
work that actually stresses a select: building many at once, and interacting
with one. It replaces the unmeasured "blazing fast" claims with numbers a reader
can reproduce.

## Page layout

Two co-equal sections (`<h2>`), plus shared bundle-size and method notes:

- **Mass instantiation** - build many independent selects at once and measure it,
  with the widgets actually rendered in an on-page scroll area.
- **Interaction latency** - one dedicated widget per library; time open, filter,
  choose, and close, each on its own.

## Libraries and versions

Loaded from jsDelivr as minified UMD builds (pinned; see `benchmark.js`
`DISPLAY` / `SIZE_URLS`). Native `<select>` is built inline. The demo is allowed
CDN dependencies (like the examples page's icon font); the library itself stays
dependency-free.

## Fairness principles

- **Minified vs minified.** llselect loads its minified UMD, like every
  competitor's `.min.js`. (This forced adding a terser step to the library's
  build; the UMD was previously unminified.)
- **On-screen widgets.** A widget is scrolled into view before it is measured -
  llselect refuses to open an off-screen trigger, so measuring off-screen would
  read zero (see Traps). Manual scrolling is blocked during a run.
- **Multi renders tags.** Every competitor's multi-select shows a chip per chosen
  item, so llselect uses `triggerDisplay: 'tags'`, not the lighter count summary.
- **Custom renderer reaches the chosen display.** The MDI-icon variant adds the
  icon to list items AND to the chosen chip / trigger (llselect
  `createTagContentElFn` / `createTriggerContentElFn`, Select2
  `templateSelection`, Tom Select `render.item`, Choices HTML label). Slim Select
  v2 cannot: its chip is `textContent = option.text`, no per-chip HTML hook.
- **Transitions off while measuring.** A run injects
  `* { transition:none; animation:none }`, so a CSS open/close animation (Slim
  Select) is not counted as work.
- **Everyone renders the same N options.** Tom Select caps the rendered options
  (default 50), so it is forced to `maxOptions: null` - otherwise it builds a
  fraction of the list and looks fastest for free, which is not the same work.
- **Multi keeps the popup open on choose.** Select2 (`closeOnSelect`), Tom Select
  (`closeAfterSelect`), and Slim Select (`closeOnSelect`) are configured so a
  multi choose does not close the dropdown - matching llselect and normal
  multi-select UX. A library that closes would skip the open-list re-render and
  look cheaper.
- **Guarded adapters.** Every op is wrapped; an adapter that cannot drive a
  loaded version reports `-` / error for that cell instead of breaking the page.

## Measurement methodology

### Mass instantiation

Widgets are built in small chunks with a `requestAnimationFrame` yield between
them, under a per-library time budget (about 20 s, or unlimited with the "no
timeout" toggle). A Stop button cancels cooperatively; it lives ON the run
overlay, because the overlay blocks clicks to everything behind it, so a
page-level Stop would be unreachable mid-run. Reported:

- **Built / target** - how many finished before the budget (a competitor that
  cannot mass-instantiate shows e.g. `240 / 10000 (timeout)`).
- **Build total (ms)** - summed synchronous build time (the yields are excluded).
  One run, not a median: the signal dwarfs the noise at this scale.
- **DOM nodes (resting)** - element nodes under the scratch area after building,
  popups closed. Shows llselect's lazy-render footprint (it builds no option DOM
  until a popup opens).
- **Filter candidates (ms)** - open the first widget, clear the box, type one
  character, re-render; timed to after the next paint.

The comparison chart normalizes each metric to "percent of the best performer"
so metrics of different scale share one axis; the legend toggles metrics. The
chart is drawn only AFTER a run finishes (drawing it mid-run skewed later
timings - see Traps). The default metric is throughput (widgets/sec), which
stays comparable even when a library timed out.

### Interaction latency

One widget per library. The four operations are timed SEPARATELY - never in one
mixed cycle - so one phase's cost never leaks into another's. Median of a few
repeats, first dropped as warm-up. Two timers:

- **to-paint** (open, close): the cost of revealing a list is layout + paint on
  the frame the browser shows it, and libraries schedule the show with
  `requestAnimationFrame`. Run the op, wait one rAF (the library's rAF fires),
  force that frame's layout, wait one more rAF (fires after that frame painted).
  Floor is about one to two frames.
- **to-settle** (filter, choose): these re-render the option DOM, and some
  libraries DEBOUNCE the search (Tom Select, Slim Select), so the render lands
  later. A `MutationObserver` watches the DOM; the timer waits until mutations
  stop, then reports the time to the LAST mutation - so the debounce wait is
  included without trailing idle. (llselect filters synchronously.)

Phase definitions:

- **Open** - close first, then time opening.
- **Filter** - open once, then `q` / clear / `q` / clear five times, timing each
  keystroke. Clearing between makes every keystroke a real change (re-typing the
  same query is a no-op for a library that keeps the query after a selection).
- **Choose** - filter cleared (full list). Multiple: choose the first 10 items,
  popup staying open (closing skips the open-list re-render, unfair). Single:
  choose one item.
- **Close** - open first, then time closing.

Native `<select>` is shown for reference but not timed (its dropdown is
browser-driven).

## Traps hit (so they are not re-hit)

- **Off-screen open reads zero.** llselect's own guard refuses to open a trigger
  that is scrolled out of the viewport (a correctness fix for real usage); with
  the widget below the fold, `open()` no-ops, `isOpen` stays false, so `close()`
  early-returns too - open / filter / choose / close all read ~0 on a widget that
  never opened. Fix: `scrollIntoView` the widget (forced `behavior:'instant'`,
  because the demo sets `scroll-behavior:smooth` which would animate the scroll
  and start measuring before the widget arrived) and block manual scrolling.
- **Choices reads zero synchronously.** `showDropdown` / `hideDropdown` / search
  schedule their DOM work with `requestAnimationFrame`, and the dropdown is
  `display:none` until shown, so the real cost (laying out + painting N options)
  is off the synchronous path. A synchronous timer reads ~0. Fix: to-paint
  timing.
- **Debounced filter reads zero.** Tom Select and Slim Select debounce the
  search; the render lands after the timer window. Fix: to-settle timing.
- **Filter no-op on a repeated query.** Typing the same `q` twice is a no-op
  (query unchanged), and libraries disagree on the query after close (llselect
  clears it, Choices keeps it). Fix: reset the box between timed keystrokes.
- **Chart animation skews the run.** Drawing (and animating) the Chart.js chart
  after each library polluted the next library's timing. Fix: draw only after the
  whole run.
- **CSS transition counted as work.** A library's open/close animation would add
  animation time to the number. Fix: disable transitions/animations during a run.
- **Unfair bundle size.** llselect's UMD shipped unminified while competitors
  loaded `.min.js`. Fix: minify the UMD (added terser to the library build).
- **Tom Select rendered only 50 options.** Its default `maxOptions: 50` meant it
  built a fraction of the list and looked fastest for free. Fix:
  `maxOptions: null` so it renders the same N.
- **Multi choose closed the popup for some libraries.** Slim Select (and Select2)
  close the dropdown after a selection by default, skipping the open-list
  re-render that llselect and the others pay. Fix: `closeOnSelect:false` /
  `closeAfterSelect:false` for multi.

## Per-library adapter notes

- **Native `<select>`** - baseline; `<option>` elements, first N `selected` for
  the pre-select toggle. No in-widget filter, no timed dropdown.
- **llselect** - the library under test. Multi uses `triggerDisplay: 'tags'`.
  Custom renderer wires the item, tag, and trigger content. Filters
  synchronously.
- **Choices.js** - eager-renders all options at init; `display:none` until show;
  rAF-scheduled show/hide. HTML label carries the custom icon into the chip.
- **Select2** - needs jQuery (counted separately in bundle size). Portals its
  dropdown to `document.body`. `templateResult` + `templateSelection` for the
  icon.
- **Tom Select** - caps rendered options to 50 by default; forced to
  `maxOptions: null` here so it renders the same N as the others. Debounced
  search; `render.option` + `render.item` for the icon; `closeAfterSelect:false`
  for multi.
- **Slim Select** - debounced search; open/close transition (disabled while
  measuring); `closeOnSelect:false` for multi; chip is plain text (no per-chip
  HTML), so the custom icon cannot reach its chips.
