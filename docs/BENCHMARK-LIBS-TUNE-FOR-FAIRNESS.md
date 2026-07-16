# Per-library tuning for a fair benchmark

> Everything below was derived by an AI reading each library's shipped implementation directly (the pinned CDN builds under test). If a library changes any of these internals in a later version, this document may be out of date.

Each heading is one library. It lists what the benchmark (`demo/benchmark.js` + `demo/benchmark.html`) has to do so that library is driven and timed the SAME way as the others - the settings that stop it doing less work for free, the real DOM events that avoid API shortcuts, and the quirks a naive harness measures wrong. The measurement techniques themselves (to-paint, to-settle-to-paint, focus before typing, real clicks, short-timer flush, `animation:none`) live in `SPEC_BENCHMARK.md`; this file is the per-library specifics. Versions under test: Choices.js 11.1.0, Select2 4.1.0-rc.0, Tom Select 2.4.3, Slim Select 2.10.0.

## llselect (the library under test)

Tuned only to match the competitors, so it is not doing less work than they do.

- `triggerDisplay: 'tags'` in multi - draws one tag per chosen item, like the competitors, not its lighter count summary.
- Custom-renderer variant wires the icon into list items AND the chosen display (`createItemContentElFn`, `createTagContentElFn`, `createTriggerContentElFn`).
- Filters synchronously (no debounce), so its Filter number is pure work.
- In-popup unchoose is native: a chosen list item carries `aria-selected="true"` and a click toggles it off. Its popup lives in the mount (not portaled), so selectors are mount-scoped.

## Choices.js

- **Filter only runs on a FOCUSED input.** `_handleSearch` begins with `if (this.input.isFocussed)`, so a programmatic `input` event on an unfocused input never searches (Filter read ~0). The harness `.focus()`es the search input (`input.choices__input--cloned`) before typing.
- **`searchResultLimit: 4` caps rendered search results.** Like Tom Select's `maxOptions: 50` - it would draw a handful while others draw every match. Set to `items.length` to render all matches. (At 1k the effect on the number is small - the cost is the Fuse.js search over all items, not the render - but it matters at 10k.)
- **Search is a Fuse.js FUZZY match over all items, synchronous (no debounce).** The Filter cost is dominated by that search, not the render (Choices does a fast INCREMENTAL DOM diff). But rendering / clearing a big list then LAYS OUT + PAINTS it, which is the perceived cost - see the to-settle-to-paint note in the spec.
- **`renderSelectedChoices: 'always'` in multi** keeps a chosen option in the dropdown; its default drops it, which would shrink the list and do less work per choose / filter.
- **In-popup unchoose is n/a.** `_handleChoiceAction` acts only `if (!selected)`, so clicking a chosen option just re-adds it (never deselects). Choices deselects via the tag x (`removeItemButton`) or Backspace, not from the dropdown.
- Choose / unchoose are done by clicking the option element (`.choices__list--dropdown .choices__item--choice`), never `setChoiceByValue`.
- Eager-renders all options at init (`display:none` until shown); show / hide is `requestAnimationFrame`-scheduled - so Open is timed to the painted frame.

## Select2

- **Results select / unselect on `mouseup`, not `click`.** A synthetic `el.click()` does nothing; the harness dispatches a full pointer + mouse sequence (`pointerdown, mousedown, pointerup, mouseup, click`).
- **The dropdown portals to `document.body`** and each widget can leave one behind, so option / result selectors are scoped to `.select2-container--open`.
- **`closeOnSelect: false` in multi** so a choose does not close the dropdown and skip the open-list re-render.
- **`.val(...).trigger('change')` does NOT re-render the open results** the way a click does, so Choose is a real click on a result element, not that API call.
- **In-popup unchoose is native.** A chosen result carries `.select2-results__option--selected`; clicking it in multi fires `unselect`.
- **The tag x bubbles into an unwanted dropdown open.** A click on `.select2-selection__choice__remove` bubbles to the selection and opens the dropdown; the harness prevents the cancelable `select2:opening` around the remove click so only the removal is timed.
- `templateResult` + `templateSelection` carry the custom icon. Needs jQuery (counted separately in bundle size).

## Tom Select

- **`maxOptions: 50` caps rendered options** - forced to `null` so it renders the same N, not a fraction that looks fastest for free.
- **`hideSelected: true` (multi default) hides chosen options from the dropdown** - set `false` so choosing / filtering re-renders the same-size list (and a chosen option then carries `.selected`).
- **The search is THROTTLED; drive it through a real keystroke.** The old adapter called `refreshOptions()` directly and BYPASSED the throttle (Filter read ~8 ms instead of the real ~300 ms). Type into `.ts-control input` instead.
- **`closeAfterSelect: false` in multi** so a choose keeps the popup open.
- **In-popup unchoose is n/a.** Clicking a `.selected` option is a no-op - `onOptionSelect` calls the idempotent `addItem`. Only the `checkbox_options` plugin toggles off on click, and it renders checkboxes (a different UX), so it is not used. Tom Select deselects via Backspace (keyboard) or the tag x (`remove_button` plugin), not from the dropdown. Verified headless: dropdown click 3->3, Backspace 3->2, tag x 2->1.
- `remove_button` plugin adds the tag x (opt-in). Choose by clicking the option element (`.ts-dropdown .option`). `render.option` + `render.item` for the icon. Its dropdown lives in `.ts-wrapper` (in the mount).

## Slim Select

- **`allowDeselect: true` in multi** - without it, clicking a chosen option in the open list is ignored (the option-click handler early-returns on `option.selected && !allowDeselect`). With it, the click toggles off.
- **`maxValuesShown: Infinity`** - past `maxValuesShown` (default 20) selected, Slim collapses ALL tags into one `{n} selected` summary (one node instead of n), which would make its multi DOM-node / tag work collapse to near-nothing.
- **`closeOnSelect: false` in multi**; search input debounces ~100 ms (`input.oninput = debounce(fn, 100)`).
- **The dropdown (`.ss-content`) portals to `document.body`** and every widget leaves one, so option / search selectors target only the OPEN content (`.ss-open-below` / `.ss-open-above`) - a mount-scoped one misses it and a plain document one hits the wrong widget.
- **`setSelected` rebuilds everything on every change** - `updateOptions` (rebuilds the whole native `<select>`), `renderValues` (all tags), `renderOptions` (all option divs). So its Choose / Unchoose / Filter numbers are genuinely high, real work, not animation.
- **A removed tag's `removeChild` is deferred by a hardcoded 100 ms `setTimeout`** (its exit animation), which `animation:none` cannot reach - the remove / unchoose click runs short timers immediately so only work is timed. Slim 2.10.0 does NOT respect `prefers-reduced-motion` (no `matchMedia` in its JS, none in its CSS), and a page cannot force that setting, so the flush is the fix.
- **Its multi chip is `textContent` only** (no per-chip HTML hook), so the custom icon reaches its dropdown options but NOT its chips - a real limitation, left plain rather than faked with a CSS `::before`.
- Open / close animate via a CSS `scaleY` transform and DO NOT remove the option DOM on close - so only the FIRST open builds it (see the "Open measured once" note on the page).

## Native `<select>`

- The floor for the mass section (build / nodes / teardown). In the interaction section it has NO row - its dropdown is browser / OS-driven, so the page cannot time open / filter / close, and what JS can measure (setting a value) is ~0. Its widget is left live so a reader can open and scroll it by hand.
