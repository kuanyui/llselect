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
  choose, close, and (multi only) the two deselect paths, each on its own.

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
- **Multi renders tags.** Every competitor's multi-select shows a tag per chosen
  item, so llselect uses `triggerDisplay: 'tags'`, not the lighter count summary.
- **Custom renderer reaches the chosen display.** The MDI-icon variant adds the
  icon to list items AND to the chosen tag / trigger (llselect
  `createTagContentElFn` / `createTriggerContentElFn`, Select2
  `templateSelection`, Tom Select `render.item`, Choices HTML label). Slim Select
  v2's multi tag is `textContent = option.text` with no per-tag HTML hook, so
  the icon reaches its dropdown options (via `html`) but NOT its tags - a real
  limitation. Not faked with a CSS `::before`: that would be free compositor work
  and would misrepresent Slim Select as doing per-tag custom rendering it does
  not. Its tags stay plain, which is what its Choose cost reflects.
- **Transitions off while measuring.** A run injects
  `* { transition:none; animation:none }`, so a CSS open/close animation (Slim
  Select) is not counted as work.
- **Everyone renders the same N options.** Tom Select caps the rendered options
  (default 50), so it is forced to `maxOptions: null` - otherwise it builds a
  fraction of the list and looks fastest for free, which is not the same work.
- **Selected options stay in the list.** Choices and Tom Select drop a chosen
  option from the dropdown by default, so choosing one shrinks their list and they
  re-render less than llselect / Select2 / Slim Select (which keep it and re-mark
  it). They are set to keep it (`renderSelectedChoices: 'always'` /
  `hideSelected: false`) so every library re-renders the same-size list while
  choosing and filtering.
- **No collapsing tags into a summary.** Slim Select collapses all tags into one
  `{n} selected` summary once more than `maxValuesShown` (default 20) are selected
  - one node instead of n. It is set to `maxValuesShown: Infinity` so it renders
  one tag per selected item like the others; otherwise its multi DOM-node count
  and its tag / choose work would collapse to near-nothing past 20 selections.
- **Multi keeps the popup open on choose.** Select2 (`closeOnSelect`), Tom Select
  (`closeAfterSelect`), and Slim Select (`closeOnSelect`) are configured so a
  multi choose does not close the dropdown - matching llselect and normal
  multi-select UX. A library that closes would skip the open-list re-render and
  look cheaper.
- **Deselect paths are configured from each library's real API, not assumed.**
  For the Unchoose-in-popup phase, Slim Select is given `allowDeselect: true`
  (its documented switch for click-to-deselect); Select2 and llselect need no
  setting. Choices keeps its chosen options in the list (`renderSelectedChoices:
  'always'`) so the harness does click one, but the click only ever adds and never
  deselects, so it lands on n/a. Tom Select marks a chosen option `.selected` (via
  `hideSelected: false`) but clicking it does not deselect either (only its
  `checkbox_options` plugin would, and that changes the rendering to checkboxes), so
  it is n/a too. Every case is decided by the chosen-count guard - a click that did
  not deselect is never timed as if it did, and it was all confirmed in a headless
  browser (Select2 needed a full mouse sequence; Slim needed the OPEN portaled
  content). The tag x (Remove-tag) column is opt-in and off by default,
  because Choices and Tom Select only grow a tag x through a setting / plugin -
  forcing it on everyone would not be their default rendering.
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
- **Teardown total (ms)** - synchronous time to `destroy()` every widget just
  built (the mirror of Build total; a library that leaks listeners or unwinds
  slowly shows here). Measuring it clears the scratch area, so the mass widgets
  are transient - they render during the build and are gone after. One run; a
  timed-out library tears down only what it built.

Filtering is NOT measured here: it is a property of one widget, not of building
many (the widgets are independent), so it belongs to - and is measured in - the
interaction-latency section. It used to have a column here; that was removed as
misplaced.

The comparison chart normalizes each metric to "percent of the best performer"
so metrics of different scale share one axis; the legend toggles metrics. The
chart is drawn only AFTER a run finishes (drawing it mid-run skewed later
timings - see Traps). The default metric is throughput (widgets/sec), which
stays comparable even when a library timed out.

### Interaction latency

One widget per library. Each operation is timed SEPARATELY - never in one mixed
cycle - so one phase's cost never leaks into another's. Median of a few repeats,
first dropped as warm-up. Two timers:

- **to-paint** (open, close): the cost of revealing a list is layout + paint on
  the frame the browser shows it, and libraries schedule the show with
  `requestAnimationFrame`. Run the op, wait one rAF (the library's rAF fires),
  force that frame's layout, wait one more rAF (fires after that frame painted).
  Floor is about one to two frames.
- **to-settle** (filter, choose, unchoose, remove-tag): these re-render the option
  DOM, and some libraries DEBOUNCE the search (Tom Select, Slim Select) or defer the
  render a frame (Choices), so it lands later. A `MutationObserver` watches the DOM;
  the timer observes for a MINIMUM window first - so a tiny immediate mutation (an
  input attribute flip) does not end it inside the gap before the real render - then
  waits until mutations stop, and reports the time to the LAST mutation. So the
  deferred/debounce wait is included without trailing idle. (llselect filters
  synchronously.)

Phase definitions (the single and multi tables carry DIFFERENT columns - single
is open / filter / choose / close; multi adds the two deselect phases below, and
the header rows are built by `ixInitTable` so they track the mode + the checkbox):

- **Open popup** - close first, then time opening.
- **Filter candidates** - a round-trip, reported as the SUM of two medians: narrow
  the list to half (type `q`) and restore it (clear), each timed on its own, five
  reps. One filter interaction is type + clear, so a single direction understates
  it. Clearing between also keeps every keystroke a real change (re-typing the same
  query is a no-op for a library that keeps the query after a selection).
- **Choose candidate** - filter cleared (full list). Multiple: choose the first
  10 items, popup staying open (closing skips the open-list re-render, unfair).
  Single: choose one item.
- **Unchoose (in popup)** - multiple only. CLICK an already-chosen option IN the
  open list and time the toggle-off + re-render (a real click, not an API call).
  Supported only where the open list both shows chosen options and deselects them
  on click: llselect and Select2 natively, Slim Select via `allowDeselect: true`.
  Choices and Tom Select are n/a - clicking an already-selected option is a no-op
  there (Choices' choice handler acts only when the choice is NOT selected; Tom
  Select's `addItem` is idempotent), so their only removal path is the tag x. Each
  timed click is verified to actually drop the chosen count; a no-op click is
  reported n/a rather than as a misleading number. (Verified against the pinned
  builds - see the per-library notes.)
- **Remove tag (x)** - multiple only, and only when the "test close button on
  multiple tags" checkbox is on. CLICK each tag's remove (x) button and time the
  removal + re-render (a real click, not an API call - the "press x to drop a tag"
  path). The checkbox is off by default because Choices (`removeItemButton`) and
  Tom Select (`remove_button` plugin) only grow a tag x through a setting / plugin
  (llselect, Select2, Slim Select show one anyway), so forcing it on everyone is
  not their default rendering; turning it on enables the x on those two and reveals
  this column. It also changes the Choose number (a tag with an x is more DOM).
- **Close popup** - open first, then time closing.

The interaction chart is a stacked bar (whole bar = the summed phases). Unchoose
and Remove tag start DESELECTED in the legend: they are n/a for some libraries or
opt-in, so summing them by default would stack uneven totals across libraries. The
default bar is the shared open / filter / choose / close; the legend toggles the
two deselect phases back on.

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
- **Choices / Tom Select removed chosen options from the dropdown.** Both drop a
  chosen option from the list by default, so choosing shrinks their list and they
  re-render less than the libraries that keep it. Fix: `renderSelectedChoices:
  'always'` / `hideSelected: false` so all re-render the same-size list.
- **Slim Select collapsed tags past 20.** With more than `maxValuesShown` (default
  20) selected, Slim Select replaces every tag with one `{n} selected` summary -
  one node instead of n, so its multi DOM-node count and tag work collapse to
  near-nothing. Fix: `maxValuesShown: Infinity` so it always renders one tag per
  item.
- **Deferred render read as ~0 (the settle broke too early).** The settle timer
  broke after 2 quiet frames; for Choices that landed in the gap between its
  immediate input-attribute flip and its slightly later filtered render, so it
  timed only the trivial first mutation (~0.25 ms, "fastest" - contradicting the
  obvious perceived lag). Fix: a minimum observation window before the quiet break
  is allowed, and return time to the LAST mutation.
- **Select2 tag x opened the dropdown.** A real click on Select2's remove (x)
  bubbles to the selection and opens the dropdown, adding an open render to the
  Remove-tag timing (and a UX surprise). Fix: prevent the cancelable
  `select2:opening` around the remove click, so only the removal is timed.
- **Synthetic `.click()` missed mouseup-bound handlers.** Select2's results select
  / unselect on `mouseup`, so `el.click()` (a lone click event) did nothing and its
  Unchoose read n/a. Fix: dispatch the full pointer + mouse sequence.
- **Portaled dropdowns and the wrong widget.** Slim Select portals every widget's
  `.ss-content` to `document.body`, so a mount-scoped selector missed it and a
  document-wide one hit the FIRST (single-select) widget's leftover content - the
  click landed on the wrong widget, whose count never changed, so Unchoose read
  n/a. Fix: scope to the OPEN content (`.ss-open-below` / `.ss-open-above`).
- **Animation deferral hidden in a JS timer.** Slim Select delays a tag's real
  `removeChild` by a hardcoded 100 ms `setTimeout` for its exit animation - which
  `animation:none` cannot touch - so Remove-tag / Unchoose timed ~100 ms of
  animation. Fix: run short timers immediately around the click.
- **Verified headless.** These were all found and confirmed by driving the page in
  a headless Chromium, not by eyeballing - Select2 Unchoose went n/a -> ~6 ms, Slim
  Unchoose n/a -> a real (slow) number, Slim Remove-tag ~100 ms -> a few ms.

## Per-library adapter notes

- **Native `<select>`** - baseline; `<option>` elements, first N `selected` for
  the pre-select toggle. No in-widget filter, no timed dropdown.
- **llselect** - the library under test. Multi uses `triggerDisplay: 'tags'`.
  Custom renderer wires the item, tag, and trigger content. Filters
  synchronously. Chosen list items carry `aria-selected="true"`, and a click on
  one toggles it off - the Unchoose-in-popup path.
- **Choices.js** - eager-renders all options at init; `display:none` until show;
  rAF-scheduled show/hide. HTML label carries the custom icon into the tag.
  `removeItemButton` for multi only when the close-button checkbox is on.
  `renderSelectedChoices: 'always'` for multi keeps a chosen option in the dropdown
  (its default drops it) so it re-renders the same-size list. A click on an
  already-selected choice still only adds, never deselects (its choice handler acts
  only when the choice is NOT selected), so in-popup unchoose is n/a - measured by
  the count guard, removal is the tag x.
- **Select2** - needs jQuery (counted separately in bundle size). Portals its
  dropdown to `document.body`. `templateResult` + `templateSelection` for the
  icon. Renders chosen options in the results with `--selected` and fires
  `unselect` on a click in multiple mode, so in-popup unchoose works natively - but
  its results bind `mouseup`, not click, so the harness dispatches a full mouse
  sequence (a synthetic `.click()` alone does nothing). Scoped to
  `.select2-container--open` so the open dropdown, not a leftover, is targeted.
- **Tom Select** - caps rendered options to 50 by default; forced to
  `maxOptions: null` here so it renders the same N as the others. `hideSelected:
  false` keeps a chosen option in the dropdown (it hides it by default for multi),
  so it re-renders the same-size list AND marks a chosen option `.selected`.
  Debounced search; `render.option` + `render.item` for the icon;
  `closeAfterSelect:false` for multi, and the `remove_button` plugin (the tag x)
  only when the close-button checkbox is on. Clicking a `.selected` option does NOT
  deselect it - `onOptionSelect` just calls the idempotent `addItem`; only the
  `checkbox_options` plugin toggles off on click, and it renders checkboxes (a
  different UX), so it is not used. In-popup unchoose is n/a (verified headless).
- **Slim Select** - debounced search (200 ms - the Filter number includes it, real
  latency); `closeOnSelect:false` for multi; `allowDeselect:true` for multi so a
  click on a chosen option in the open list toggles it off (the Unchoose phase;
  without it the click is ignored); `maxValuesShown: Infinity` so it never
  collapses tags into a `{n} selected` summary. Its dropdown (`.ss-content`) is
  portaled to `document.body` and every widget leaves one there, so the unchoose
  selector targets only the OPEN content (`.ss-open-below` / `.ss-open-above`). A
  removed tag's actual `removeChild` is deferred by a hardcoded 100 ms setTimeout
  (its exit animation, which CSS `animation:none` cannot reach), so the remove-tag
  / unchoose click runs short timers immediately to time the work, not the wait.
  (slim-select 2.10.0 does not respect `prefers-reduced-motion` - no `matchMedia` in
  its JS, none in its CSS, headless-verified at 102 ms even with `reduce` emulated -
  and a page cannot force that setting on a visitor, so the flush is the fix.)
  Multi tag is `textContent` only, so the custom icon cannot reach its tags
  (dropdown options only) - a real limitation, left plain rather than faked with a
  free CSS `::before`.
