# Handoff: popup slots, action rows, and the pending "pinned rows" + "filter-query event" work

Written for the next agent session (the previous session's context was about to compact). Everything below is either committed on the local `dev` branch (not pushed, not published: the npm 0.0.8 release predates all of it), or a decision the owner has ratified, or an open decision listed as such. The committee briefs and verbatim answers of rounds 5-9 lived only in the previous session's scratchpad; their outcomes are summarized here. Rounds 1-4 are in `archive/popup-slots-research.md`.

## 1. Vocabulary (defined once; use these words, never shorthands)

- Popup: the panel that opens under the trigger (`popupEl`).
- Listbox: the scrolling area inside the popup (`popupListEl`, `role="listbox"`), the ONLY scroll container. Items are the selectable options inside it.
- Header slot / footer slot: `popupHeaderEl` / `popupFooterEl`. Outside the listbox, never scroll, no ARIA role, filled ONCE at construction by `createPopupHeaderContentElFn` / `createPopupFooterContentElFn`, never rebuilt by the library. Any content. Controls inside are reached by Tab while the popup is open (A11Y.md "Slot controls").
- Choose-all row: the built-in `chooseAllRow: true` row of `LLSelectMultiple`. First child of the listbox, `role="option"`, tri-state counting text, acts on the visible enabled subset, self-hides when nothing is actionable.
- Action rows: `popupListActionRowsBeforeItems` / `popupListActionRowsAfterItems`. App-defined commands, each rendered by the library as one `role="option"` row inside the listbox. Descriptor: `{ textFn, createContentElFn?, disabledFn?, onActivate }`.
- Rows before the items: the choose-all row plus the action rows before the items, together, at the top of the listbox. Rows after the items: the action rows after the items, at the bottom. "Before" / "after" in every name is the position in the list (above / below the items), never time: the prepend / append pair.
- The ring: the arrow-key order: choose-all row, rows before the items, items, rows after the items.
- Pinned: stuck to the top or bottom edge of the listbox while the items scroll. Today NOTHING inside the listbox is pinned; the slots are outside the listbox and never scroll.

## 2. What is committed (local `dev` only, not pushed, not published; `npm run verify` green: core 502 tests, AngularJS 82)

Commits, oldest first (subjects abbreviated): `8e5e2ba` group-label wording sweep; `514500f` header / footer slots; `310e857` Esc from popup content closes, `close()` returns focus from inside the popup; `535e4a8` AngularJS `ll-popup-header-content-fn` / `ll-popup-footer-content-fn`; `2d05e11` ring characterization tests + `LLSelectAction` -> `LLSelectKeyboardAction`; `a7ddd6e` leading-row flag -> nullable ring tag; `ace52c0` action rows; `2822ca8` AngularJS `ll-popup-list-action-rows-before-items` / `-after-items`; `b7f721d` final-review fix batch (FIXME 110-122); `9747406` research archived, DOCUMENTATION-109 resolved; demo commits `7b65178`, `f160177`, `c88c262`, `633a417`, `6d58848`, `8ba0b58`, `c65b1cc`; `7a7e01f` dividers moved to block edges (QUALITY-123); `189416b` AngularJS `onActivate(instance)` (MEDIUM-110 resolved); `b04e23a` CLAUDE.md context-first reply rule.

Living contracts: `DESIGN.md` "Popup header / footer slots" and "Action rows"; `A11Y.md` "Slot controls" and "Action rows"; `naming-conventions.md` 4h / 4i; README "Popup header / footer" and "Action rows"; `angularjs/API.md` the four `ll-popup-*` entries; demo sections 15.1-15.4 and 16.1-16.3 (core), 12-13 (AngularJS). Findings log: `FIXME.md` "review (popup header / footer slots and action rows)", ids 109-123, all resolved. Open manual passes: `TODO.md` "Popup slot and action-row passes" (real browser + screen reader).

Decisions ratified along the way (do not re-open): keep `createItemEl(item, index)`; two action-row builders, one per position (`createPopupListActionRowBeforeItemsEl` / `AfterItemsEl(row, index)`); slot content called once; rows rebuilt per render and after every chosen change (right after `onChange`) and after `setItems`; the conditional tab-stop contract; multi opens with the active option on the first chosen item (status quo kept; the selection-order vs list-order nuance was left as is); the AngularJS wrapper passes the widget instance to `onActivate` only; dividers are drawn at block edges by the next element's `border-top`, the choose-all row draws none of its own.

Demo rulings: 16.1 uses rows BEFORE the items; no "Clear all" row (the choose-all row toggles); no "Load more" example (a paged list fights the filter); 16.3 is a sort toggle; 15.1 = tags in the trigger, count + a link-styled Clear all in the header; 15.4 = the 16.1 commands as header rows that LOOK like list rows (buttons wearing the theme's item class); a content fn must not read the instance variable (TDZ, `c65b1cc`).

## 3. The pending work: pinned rows and the filter-query event (design ratified in principle, names open)

### 3.1 How the model ended up (owner's reasoning, rounds 7-9)

- Round 7 (sticky choose-all row only) was rejected by the owner: pinning ONE row while its sibling rows scroll is an inconsistency.
- Round 8 (neutral, four options) found: "pinned but in the ring" is coherent as a BLOCK rule, an anomaly as a one-row exception; no library pins per row; nine of eleven built-in select-alls are pinned above the scroll area (survey table in that brief; Kendo and Syncfusion keep it arrow-reachable).
- The owner then ruled: three kinds may coexist in one select, PROVIDED the API says which rows are pinned and the docs state the differences. Rows are one mechanism (choose-all + action rows) with a per-block pin flag; in the docs table they appear as two columns (pinned rows / scrolling rows) next to the slots column. That is why the summary reads as "three kinds" while the code has two mechanisms (slots, rows).
- Round 9 (6:0 on everything below unless a split is noted):
  - Pin per BLOCK, never per row: two boolean settings, one for the rows before the items, one for the rows after the items. The "row 1 and 3 pinned, row 2 not" case cannot be written. Per-row flags rejected (every fallback rule harms: reordering the ring, warn-and-degrade, per-row offset math).
  - Defaults `false` for both (the current look on `dev`). The choose-all row pins WITH the before-items block (no separate flag). An empty pinned block builds no wrapper and no line.
  - Rendering: one wrapper per pinned block, a `div role="presentation"` (non-focusable, no aria attributes; ARIA exposes its children as the listbox's own), built only when non-empty. `position: sticky` and `top: 0` / `bottom: 0` set inline by the library (a boolean setting must always work); themes own the opaque background, `z-index`, and the edge line: the top wrapper draws `border-bottom`, the bottom wrapper `border-top`; the existing next-sibling `border-top` divider rules stay for unpinned rows. Bootstrap 5's translucent `color-mix` focus color must not be used on the wrapper.
  - Scroll math: `ensureVisibleInScroll` (src/keyboard.ts) gains top / bottom insets MEASURED from the wrappers' rects at scroll-into-view time (never a theme-declared number); clamp so the usable viewport stays positive; when the blocks exceed the scrollport, scrolling is best-effort. A theme that also pins group labels offsets their `top` itself.
  - The ring, the roles, the keyboard tables, `focusedIndex`, initial-focus rules: unchanged.
  - AngularJS mirrors the two flags as read-once boolean attributes.
- Open (owner decides; vote counts from round 9):
  1. Flag names. 5 votes: `popupListRowsBeforeItemsPinned: boolean` / `popupListRowsAfterItemsPinned: boolean`. 1 vote: verb form `pinPopupListRowsBeforeItems` (like `hideChosenRows`).
  2. Wrapper element name and visibility. Proposals: `popupListPinnedBeforeItemsEl`, `popupListPinnedRowsBeforeItemsEl`, `popupListRowsBeforeItemsPinnedEl`, `popupListRowsBeforeItemsBlockEl` (+ the `AfterItems` twin); public 2, protected 2, private 2; a protected `create...El` override point: 3 for, 3 against. The word "leading" is taken (the choose-all row); "block" must not be shortened to a bare word in replies.
  3. Whether `onFilterQueryChange` fires when `close()` resets a non-empty query (2 yes, 2 no, 2 silent).
  4. Keep the defaults at `false` (6:0 recommended; the owner may still flip the before-items default later in its own turn per CLAUDE.md).

### 3.2 The filter-query event (round 9, 6:0)

- `onFilterQueryChange: ((query: string) => void) | null` on `LLSelectBaseSettings`; `null` = nothing fires. No ctx param (the callback-context review in `TODO.md` stays open).
- Fires only when the query TEXT actually changes: after each input event once IME composition ends, and on Esc clearing a non-empty query. Not on identical text, not on `open()` resetting `''` to `''`, not on `setItems` / `rerender()`.
- Fires AFTER `recomputeFilteredItems()` + `renderPopupList()` (5 of 6), so a handler reading `getVisibleItems()` sees the new list. Recipe: a header count element built once, rewritten from `onOpen`, `onChange` and this event.
- AngularJS: `ll-on-filter-query-change` as an event expression with a `$query` local, wrapped like `ll-on-open`.
- `onActiveItemChange` stays deferred (6:0).

### 3.3 Implementation plan once the names are ratified (one feature per commit, `npm run verify` green each, whole-committee review at the end, per the owner's process)

- Pinned blocks: `src/base.ts` (settings + defaults, classIdMap keys, wrapper builder(s), `commitPopupSegmentsToDom` wrapping the before / after blocks when pinned and non-empty, inline sticky styles, inset measurement passed to `ensureVisibleInScroll` from `syncFocusedIndexToDom`); `src/keyboard.ts` (`ensureVisibleInScroll(child, scrollParent, topInset?, bottomInset?)` with the clamp; pure unit tests with stubbed rects); five themes (opaque background, `z-index`, wrapper edge lines; the wrapper must not use the translucent focus color); A11Y.md (pinned rows: unchanged ring, "N of M" includes them, the wrapper is presentational; the sticky-group-label caveat now has a fix path); DESIGN.md (the three-kinds table and why per block); naming tables; README (table + one pinned example); demo (a pinned variant of 16.1 - the owner wanted the choose-all row visible at all times in that example); tests (a new file test/pinned-rows.test.ts: wrapper presence / absence, empty block, role / no tabindex, ring unchanged, inset math with stubbed rects, `hideChosenRows` emptying the block); AngularJS attributes + API.md + SPEC.md + the site-build `NG_KINDS` map (`scripts/build-site.mjs`, or `npm run verify` fails) + tests + demo; TODO.md manual pass (short popup, opaque paint, sticky group label collision, NVDA / VoiceOver on the presentational wrapper).
- Filter-query event: `src/base.ts` `handleSearchInputEvent` (fire after render when the text changed; also the Esc-clear path) + settings/defaults; tests; A11Y.md "Filtering"; README events row; demo 15.1 / 15.4 counts updated from the event; AngularJS `ll-on-filter-query-change` (+ `NG_KINDS`, SPEC.md taxonomy "event expression", API.md, tests, demo).
- Optional, recommended by four of six in round 8: make `getVisibleEnabledItems()` public so an app-built header select-all can act on the same subset as the built-in row.

## 4. Process rules the owner set in this thread (also in CLAUDE.md)

- The committee: Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex 5.5; fresh sessions; the brief piped on stdin; ONE CLI AT A TIME (RAM); `claude -p --model <id> --effort max --allowedTools Read,Grep,Glob` (the option is variadic: pipe the prompt), `codex exec -m gpt-5.6-sol -c model_reasoning_effort=max -s read-only`, `codex exec -m gpt-5.5 -c model_reasoning_effort=xhigh -s read-only`. Briefs must be NEUTRAL: equal detail per option, no author lean unless labeled, the owner's own words quoted; the owner called out round 7 for elaborating one option more than the others.
- Replies: context first - define every noun before any tally or label; short sentences; one fact per bullet; a reader with dyslexia and none of the earlier conversation must follow. Ask before starting work whenever a decision is the owner's; one feature per commit; verify before every commit; report failures plainly (a verify that failed once got amended, and the owner was told).
- Pitfalls hit: a demo content fn read the instance variable inside the constructor (TDZ); AngularJS test arrays come from the page realm (`deepStrictEqual` on prototypes fails - spread first); `pgrep -f` matches the shell running it (use `^[c]laude -p` style patterns); `npm run check` rejects backticked paths that do not exist; every new AngularJS attribute must be added to `NG_KINDS` in `scripts/build-site.mjs`; commit subjects: one line, `type: [scope] summary`.

## 5. Rounds 10-12 (after this handoff was written)

The owner re-opened two premises: whether the choose-all row is one of the action rows, and whether settings callbacks receive the widget instance. Rounds 10, 11 and 12 (the last a labeled one-sided round arguing AGAINST the instance, after round 11 leaned toward it) are recorded in `archive/choose-all-and-callback-context-research.md`, with the votes, the arguments and the open owner decision. Read it before touching the callback signatures or the choose-all row; the rename in section 3 and the pinned-rows plan are unaffected.

## 6. What the next session should do first

1. Read this file, `TODO.md` (the plan section and manual passes), `DESIGN.md` "Action rows", `A11Y.md` "Action rows" / "Slot controls".
2. Put the four open decisions of section 3.1 to the owner in one message, with full TypeScript signatures for every name option (CLAUDE.md requires it).
3. After ratification: implement in the order of section 3.3, one commit per feature, then convene the whole committee for one review of the change set, then fix findings under a new `FIXME.md` round.
