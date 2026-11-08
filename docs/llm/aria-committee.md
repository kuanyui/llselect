# Committee: the ARIA findings and the two blind votes

This record names commits from before the squash of `dev` by their subjects; the branch `backup/dev-before-squash` keeps them.

Agent-facing record of the committee's blind votes on the accessibility findings the owner relayed. `FIXME.md` has the entries (MEDIUM-768 to DOCUMENTATION-775); `DESIGN.md` "Popup header / footer slots" and "Action rows (commands inside the list)" point here; `A11Y.md` holds the contract that came out of the votes. The blind-vote procedure is the one `CLAUDE.md` records.

## The report

The owner relayed four observations: two from Codex Astra's audit of the shipped library, one from the owner's own TalkBack test, and one suspicion of the owner's.

1. Value pollution. In the accessibility tree, demo 1.3 (a single select component with `clearable: true`) showed "Value: Japan Clear selection", and demo 11.4 (a multiple select component with `triggerDisplay: 'tags'`) showed "TypeScript Remove TypeScript Rust Remove Rust". Astra traced it to the buttons sitting inside the combobox, suggested moving the buttons beside the combobox while keeping one visual container, and advised against hiding operable buttons with `aria-hidden`.
2. Commands as options. `createPopupListActionRowEl` gave the demo 15 commands ("Restore defaults", "Add a country", "Sort the list") `role="option"`. Astra: an option is a selectable list item, and an omitted `aria-selected` still implies false, so the row does not become a command; Astra suggested real buttons outside the listbox, as demo 14.4 does.
3. The announcement of a multiple select component. The owner tested one with TalkBack; its trigger shows a count such as "3 / 74 selected". The owner asked whether such a control should read out every chosen item at once, whether the developer should decide, or whether an ARIA attribute describes this meaning. Astra answered that no ARIA attribute means "read the count, then every name", and recommended a short count summary by default that the developer can customize, with the library guaranteeing the options' multiselect semantics.
4. The "header prepended" structure: the header slot, and the subclass recipe that moves the header above the filter input.

The owner delegated the ARIA decisions to the committee, in the owner's words: on ARIA semantics the models should read the W3C specifications directly; each member proposes its own solution, independently and without being misled, and the committee decides; unless something truly needs the owner to decide an API, like Q3, the convener carries the rest through, and on such questions every member still gives its own opinion.

## First blind vote: Q1 to Q4

- Stage 1: a neutral brief (the observations, where the design lives, the W3C sources; no proposals, no options). Nine proposals, at maximum effort: A Opus 5, B Sonnet 5 (second proposal), C Sonnet 4.6, D Codex Astra, E Opus 4.8, F Sonnet 5 (first proposal), G Opus 5.5 (first proposal), H Codex Sol, I Opus 5.5 (second proposal). Opus 5.5 and Sonnet 5 wrote two each at the owner's request.
- Stage 2: Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol and Codex Astra marked the anonymized proposals, at maximum effort.

### Q1, the clear button and the tag remove buttons inside the trigger: H, Codex Sol

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Opus 5 | Sonnet 4.6, Sonnet 5 | Opus 4.8, Opus 5 | Codex Sol, Codex Astra |
| B, Sonnet 5 (second) | - | Sonnet 4.6, Sonnet 5 | Opus 5.5, Codex Sol, Codex Astra |
| C, Sonnet 4.6 | - | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra |
| D, Codex Astra | Sonnet 5, Codex Astra | Opus 5, Opus 5.5, Sonnet 4.6, Codex Sol | - |
| E, Opus 4.8 | - | Sonnet 5 | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Codex Sol, Codex Astra |
| F, Sonnet 5 (first) | - | Opus 5, Sonnet 4.6, Sonnet 5 | Opus 5.5, Codex Sol, Codex Astra |
| G, Opus 5.5 (first) | Opus 4.8, Opus 5, Sonnet 5 | Opus 5.5, Sonnet 4.6 | Codex Sol, Codex Astra |
| H, Codex Sol | Opus 5.5, Sonnet 5, Codex Sol | Opus 5, Sonnet 4.6, Codex Astra | - |
| I, Opus 5.5 (second) | Opus 4.8, Opus 5, Sonnet 5 | Opus 5.5, Sonnet 4.6 | Codex Sol, Codex Astra |

- H, G and I had 3 best marks each, and H won on second marks, 3 against 2 each.
- Both Codex members marked G and I unacceptable. Astra on G: "hides tag removal when `hideChosenRows` removes the claimed popup equivalent. Clear-all does not replace individual removal." Sol on I: "tag removal becomes a pointer-only span and again assumes selected options remain available in the popup."
- Astra marked H second: "The toolbar adds focus-routing complexity and a localized group name beyond D's simpler button approach."
- The structure H decided: a generic visual wrapper holds the role element and, beside it, every action button; the role element (the `combobox`, or the `button` while the filter is active) holds only value text and never another control; the clear and tag remove buttons sit in a `role="toolbar"` with an accessible name, and a lone clear button needs no toolbar; Tab enters the toolbar once, Left and Right Arrow move, Enter and Space activate; removing a tag focuses the next remove button, removing the last focuses the trigger, clearing returns focus to the trigger; a visually hidden value text must not use `hidden` or `aria-hidden`.
- Status: the structure is decided under the delegation; its names are an API decision, which went to the second blind vote and the owner.

### Q2, the action rows and the choose-all row: A, Opus 5

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Opus 5 | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5 | - | Codex Sol, Codex Astra |
| B, Sonnet 5 (second) | - | - | Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra |
| C, Sonnet 4.6 | - | Sonnet 4.6, Sonnet 5 | Opus 5, Codex Sol, Codex Astra |
| D, Codex Astra | Sonnet 5, Codex Sol, Codex Astra | Opus 5, Sonnet 4.6 | - |
| E, Opus 4.8 | Sonnet 5 | Opus 4.8 | Codex Sol, Codex Astra |
| F, Sonnet 5 (first) | - | - | Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra |
| G, Opus 5.5 (first) | Sonnet 5 | Opus 4.8, Opus 5.5, Sonnet 4.6 | Codex Sol, Codex Astra |
| H, Codex Sol | Sonnet 5, Codex Sol, Codex Astra | Opus 5, Sonnet 4.6 | - |
| I, Opus 5.5 (second) | Opus 4.8 | Opus 5, Sonnet 4.6, Sonnet 5 | Codex Sol, Codex Astra |

- A won with 5 best marks; D and H had 3 each.
- The two unacceptable marks on A. Astra: "Explicit selection attributes and revised position counts leave commands misrepresented as selectable options. Preserving the arrow-key sequence does not resolve that semantic defect." Sol: "Explicit `aria-selected="false"` fixes the missing required property, but commands remain falsely represented as selectable values. Giving sibling options unrelated `aria-posinset` sets does not create semantic group boundaries." Both preferred D and H: real buttons outside the listbox, with a native tri-state checkbox for choose-all.
- Implemented under the delegation: `aria-selected="false"` on every action row, and `aria-posinset` / `aria-setsize` while the list holds a non-item row (A11Y.md "Action rows"). Rejected inside A: `aria-roledescription="command"` and a labelled group per command block (DESIGN.md "Action rows").

### Q3, what a multiple select component's trigger announces: I, Opus 5.5 (second proposal); the owner rejected the three options the convener built from the two top-ranked answers, A and I

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Opus 5 | Opus 4.8, Opus 5, Sonnet 5 | Codex Sol | - |
| B, Sonnet 5 (second) | - | Opus 4.8, Opus 5, Sonnet 5, Codex Sol | - |
| C, Sonnet 4.6 | Sonnet 5 | - | Opus 5 |
| D, Codex Astra | Codex Astra | Opus 4.8, Sonnet 5 | - |
| E, Opus 4.8 | Sonnet 5 | Opus 4.8 | - |
| F, Sonnet 5 (first) | - | Opus 4.8, Sonnet 5 | Codex Sol, Codex Astra |
| G, Opus 5.5 (first) | Sonnet 5 | Opus 4.8, Opus 5, Opus 5.5 | - |
| H, Codex Sol | Sonnet 5 | Opus 4.8, Codex Sol, Codex Astra | - |
| I, Opus 5.5 (second) | Opus 5.5, Sonnet 5, Codex Sol | Opus 4.8, Opus 5, Codex Astra | - |

- A and I had 3 best marks each, and I won on second marks, 3 against A's 1. The question was the owner's, and the owner rejected the three options built from the answers, as the last bullet records.
- Sonnet 4.6 gave no marks for Q3 and wrote "My independent opinion for the owner" instead. In its words: no ARIA attribute says "interpret this text as a multi-value summary", so "The meaning must live entirely in the value text"; the trigger should not read every chosen item by default, since "Reading 74 names on every focus event is actively harmful"; one gap is confirmed, since with `createTriggerContentElFn` the value mirror "is unconditionally set to the library's own count-summary text"; it proposed a `triggerValueTextFn` setting and "3 of 74 selected" as the English default, since "Screen readers say 'slash' for `/`".
- Both answers kept a count summary as the default and added one setting for the value a screen reader reads: A a `triggerValueStringFn` in both classes, reading item names by default under `hideChosenRows`; I a `triggerValueTextFn` for the multiple select component only, with "3 of 74 selected" as the new English default.
- The convener offered the owner three options built from these answers. The owner rejected all three, for one reason: in the API, the responsibilities and the names of what is displayed, a text that must stay short, and of what is read out have no clear meaning. The question went to the second blind vote.

### Q4, the header and footer slots and the prepended header: A, Opus 5

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Opus 5 | Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol | Opus 4.8 | - |
| B, Sonnet 5 (second) | - | Sonnet 4.6 | Opus 5, Opus 5.5, Sonnet 5, Codex Sol |
| C, Sonnet 4.6 | - | Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra | - |
| D, Codex Astra | Codex Astra | Opus 4.8, Sonnet 4.6, Sonnet 5 | - |
| E, Opus 4.8 | - | Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra | - |
| F, Sonnet 5 (first) | Opus 4.8, Opus 5 | Sonnet 4.6, Sonnet 5, Codex Sol | - |
| G, Opus 5.5 (first) | Opus 4.8, Sonnet 4.6 | Sonnet 5, Codex Sol | Opus 5 |
| H, Codex Sol | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra | - |
| I, Opus 5.5 (second) | Sonnet 4.6, Sonnet 5 | Opus 4.8, Opus 5, Opus 5.5, Codex Sol, Codex Astra | - |

- A won with 5 best marks.
- Opus 4.8's second mark: the contract fix and the guard are strong, "but it adopts `role="dialog"` / `aria-haspopup="dialog"` blind; that change can regress NVDA/JAWS mode behavior and should not ship without the AT pass A itself says it needs."
- Implemented under the delegation: while the filter is active the popup wrapper is a named, non-modal `dialog` that the trigger's `aria-haspopup="dialog"` and `aria-controls` point to; the prepend recipe states its condition everywhere; `open()` warns once per page about a Tab stop before the filter input. The assistive-technology pass is in `TODO.md`.
- Raised in the members' combinations and not taken:
  - Opus 5: drop `aria-haspopup` in the filter-active mode instead, since a `button` does not need it; that meets the requirement with no new role.
  - G's catch, named in the combinations of Opus 4.8, Opus 5, Opus 5.5, Sonnet 5, Sonnet 4.6 and Codex Astra: demo 14.1 rewrites its "N of M shown" count from `onFilterQueryChange` with no live region, so screen-reader users never hear it; the element wants `role="status"`. Codex Sol: the live status "is separate from the slot-structure decision and could become noisy." Open as MEDIUM-774.

## Second blind vote: the Q3 API and the Q1 names

- Not delegated: both questions are API decisions, so the result goes to the owner, who decides.
- The owner's requirement for Q3, from the rejection above: in the API, what is displayed, a text that must stay short, and what is read out must be separate in responsibility and in name.
- Stage 1, at high effort, the level the owner chose for this vote, below the `max` that `CLAUDE.md` sets for the committee: a neutral brief gave the decided Q1 structure with its names left out, the owner's words, the current design and the W3C sources. Seven proposals: A Sonnet 5, B Opus 4.8, C Opus 5.5, D Opus 5, E Codex Astra, F Codex Sol, G Sonnet 4.6.
- Stage 2, at high effort: the same seven members marked the anonymized proposals.

### Q3, what the trigger shows and what assistive technology reads out: C, Opus 5.5

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Sonnet 5 | Sonnet 5 | Opus 4.8, Opus 5, Sonnet 4.6 | Codex Astra |
| B, Opus 4.8 | Sonnet 5 | Opus 4.8, Sonnet 4.6 | Codex Sol |
| C, Opus 5.5 | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6 | Sonnet 5, Codex Astra | Codex Sol |
| D, Opus 5 | Opus 4.8, Opus 5, Sonnet 5 | Opus 5.5, Sonnet 4.6 | Codex Sol, Codex Astra |
| E, Codex Astra | Codex Sol, Codex Astra | Opus 4.8, Sonnet 4.6, Sonnet 5 | - |
| F, Codex Sol | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra | - |
| G, Sonnet 4.6 | - | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra |

- C won with 4 best marks; Codex Sol gave the one unacceptable mark.
- C's design: "trigger content" is what the screen shows, in `triggerContentEl`, always `aria-hidden="true"`; "trigger value" is what assistive technology reads, in `triggerValueEl`, moved inside the role element and hidden visually by inline styles; the value text never reads the content. The pack key `triggerCountSummary` becomes `triggerContentCountText`, and two keys join it: `triggerValueCountText` ("3 of 74 selected") and `triggerValueItemsText` (the chosen texts, joined). The multiple select component gains the setting `chosenItemsToTriggerValueTextFn`; the protected `computeTriggerValueText()` and `commitTriggerValueTextToDom(valueText)` are new, and `commitTriggerContentToDom(content)` loses its `plainTextValue` parameter.
- Codex Sol's unacceptable mark on C: "The API names are clear, but `triggerContentEl` remains inside the role element. The decided structure permits only value text and decorative content there." Sol marked B and D unacceptable for the same reason.
- Codex Astra's unacceptable mark on D: "The default accessible formatter calls the display formatter, so changing visible count wording also changes accessible wording."
- Every member marked G unacceptable: by default its read-out falls back to the displayed text, the coupling the owner rejected.
- Status: awaits the owner, with C's five sub-decisions (the default read-out in count mode, the read-out beside custom content, a setting for the single select component, the rename of the displayed count key, the new default texts).

### Q1, the names of the decided structure: D, Opus 5, after a further round

Stage 2:

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| A, Sonnet 5 | Opus 4.8, Sonnet 4.6 | Opus 5.5, Sonnet 5 | Opus 5, Codex Sol, Codex Astra |
| B, Opus 4.8 | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5 | Codex Sol, Codex Astra |
| C, Opus 5.5 | Opus 4.8, Opus 5, Opus 5.5 | Sonnet 4.6, Sonnet 5 | Codex Sol, Codex Astra |
| D, Opus 5 | Opus 4.8, Sonnet 5, Codex Astra | Opus 5, Opus 5.5 | Sonnet 4.6, Codex Sol |
| E, Codex Astra | Codex Sol | Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5 | Codex Astra |
| F, Codex Sol | - | Opus 4.8, Sonnet 4.6, Sonnet 5 | Opus 5, Codex Sol, Codex Astra |
| G, Sonnet 4.6 | - | Sonnet 5 | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Codex Sol, Codex Astra |

The further round, at high effort, showed C and D alone, relabelled X and Y, without the stage-2 marks:

| Proposal | Best | Second | Unacceptable |
|---|---|---|---|
| X, Opus 5 (stage-2 D) | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex Astra | - | - |
| Y, Opus 5.5 (stage-2 C) | - | Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6 | Sonnet 5, Codex Sol, Codex Astra |

- In stage 2, C and D had the same best, second and unacceptable counts, so the committee voted again on the two; D won the further round with 7 best marks.
- D's names: `triggerEl` names the wrapper, the box the user presses, which keeps the `data-*` state attributes and the listeners; `triggerFieldEl` names the role element; `triggerButtonsEl` names the strip of the clear button and the tag remove buttons, a `toolbar` in tags mode only; the pack key `triggerButtonsAriaLabel` defaults to "Selection actions"; `triggerFieldClass`, `triggerValueClass`, `triggerButtonsClass` and `triggerFieldId` are new; a public `focus()` is recommended, since `triggerEl.focus()` would otherwise do nothing, silently.
- The two forks in the members' reasons. Which element `triggerEl` names: the wrapper keeps the themes, the positioner, `'match-trigger'` and the color-scheme selectors working, while the role element keeps `triggerEl.focus()` and the ARIA reads working. Whether "toolbar" may name an identifier: most members ruled it out by `DESIGN.md` "ARIA roles vs JS names" and the `onActiveOptionChange` ruling.
- A combination that Opus 4.8, Opus 5.5, Sonnet 4.6 and Codex Sol named in the further round: keep `triggerEl` on the role element, name the box `triggerWrapperEl`, and take D's `triggerButtons*` names.
- Status: awaits the owner, with D's sub-decisions (the three new names, the strip's English name, when the strip is a toolbar, the public `focus()`).

### The owner's rulings on Q3

After the second vote, the owner asked for names that leave no guess about which text is read out and never shown, and ruled the API below, the more reasonable design winning over compatibility because the API is not declared stable.

- The word is `ScreenReader`. It carries no `Aria`: the `*AriaLabel` pack keys name the `aria-label` attribute they fill, while the read-out text fills a visually hidden element, since a combobox supports no `aria-valuetext` and its `aria-label` holds the field name.
- One API: the setting `triggerContextToScreenReaderTextFn`, in both `LLSelectSingleSettings` and `LLSelectMultipleSettings`, in the `<source>To<target>Fn` shape of `naming-conventions.md` section 3, with defaults from the language pack. `null`, as the setting or as a return value, and a blank return mean the default.
- The default is the information the screen shows. In count mode the multiple select component reads `triggerScreenReaderCountText(chosenCount, totalCount)`, English "3 of 74 selected"; in tags mode it reads `triggerScreenReaderItemsText(itemTexts)`, English "TypeScript, Rust"; the single select component reads `itemToString`; an empty selection reads the placeholder. The owner asked how established libraries do it: bootstrap-select, Angular Material and Select2 read what they show, and react-select announces every chosen item through a live region when focus arrives.
- With custom content from `createTriggerContentElFn`, the default of the current mode applies; the library never reads the custom element.
- `triggerCountSummary` is renamed `triggerContentCountText` and serves the screen only. The screen keeps its short slash form ("3 / 74 selected"), which keeps the trigger narrow; the read-out text uses words. An app can show the read-out wording by reusing the read-out key for the display key.
- `triggerValueEl` becomes the private `triggerScreenReaderTextEl`, moved inside the role element and hidden only by CSS; the method that writes it is private too, and the library calls it after every trigger content render. `computeTriggerScreenReaderText()` stays protected, as the customization model gives every setting an overridable method. `classIdMap.triggerValueId` becomes `triggerScreenReaderTextId`, `triggerScreenReaderTextClass` is new, and `commitTriggerContentToDom` loses its `plainTextValue` parameter.
- The popup gets no new API: its states are standard ARIA semantics, and a screen reader words them itself.

### The owner's rulings on the Q1 names

The owner asked whether the case against C was only the cost of changing existing code. It was: the themes, the color-scheme selectors, `'match-trigger'` and the CSS variable names are migration costs, and so is D's silent `triggerEl.focus()` break. Judged on reasonableness alone, the convener recommended the combination four members had named in the further round, and the owner ruled it:

- `triggerEl` keeps naming the role element: the `combobox`, or the `button` while the filter is active, which carries the focus and the ARIA state. Radix's `SelectTrigger` is that element too, and Ark UI keeps `trigger` and the outer `control` as separate parts.
- The generic box around it is `triggerWrapperEl` (class `triggerWrapperClass`), a word `DESIGN.md` already uses for `popupEl`. D's `triggerFieldEl` was not taken: in design systems "field" names the outer form field, and llselect's "field name" spans several elements.
- The strip of the clear button and the tag remove buttons is `triggerButtonsEl` (class `triggerButtonsClass`), not `triggerToolbarEl`, which would put the ARIA role word into a JS name (`DESIGN.md` "ARIA roles vs JS names"). Its accessible name is the pack key `triggerButtonsAriaLabel`, English "Selection actions".
- What follows the wrapper, one word for one concept: the class `.llselect-trigger` stays on the role element and the themes move the box styles to `.llselect-trigger-wrapper`; `data-state`, `data-empty` and `data-disabled` move to the wrapper; the positioner measures the wrapper, and `'match-trigger'` becomes `'match-trigger-wrapper'`; the CSS variables `--llselect-trigger-line` and `--llselect-trigger-hover-line` become `--llselect-trigger-wrapper-line` and `--llselect-trigger-wrapper-hover-line`. No public `focus()` is added: `triggerEl.focus()` keeps working.
- The read-out element's class is `.llselect-trigger-screen-reader-text`, the name WordPress uses for its visually hidden text. The visible side keeps the `triggerContent*` names, since every `*Content*` name in llselect means what an element shows.

## The post-fix reviews of the Q2 and Q4 commits

The review panel (Fable 5, Opus 5, Opus 4.8, Codex Sol) checked the three commits at high effort, then the fixes at medium effort: the levels the owner asked for on routine reviews, below the `max` that `CLAUDE.md` sets for the panel. The findings were fixed within the work, except these:
- Codex Sol asked to add the filter-active condition to the completed P1-a record in `TODO.md`. Declined: that entry records what the P1-a commit shipped; the current contract lives in `A11Y.md` and `DESIGN.md`.
- Codex Sol asked the open-time warning to skip hidden, inert and non-rendered controls, since such a control "can produce a false warning and consume the page-wide guard". Declined: each of the three becomes a Tab stop as soon as it is shown, made non-inert or rendered, with no DOM move, so the warning counts every control that is or can become a Tab stop; only a negative `tabindex` opts out. The cost Sol named stays: a control that never becomes reachable uses up the guard, and `tabindex="-1"` on it silences the warning. Sol's other requests were taken: `summary` and editing hosts count, and the check runs after `onOpen`.
- Fable 5 noted that the action-row builders overclaim "after every chosen change". Declined: the `fireChange` of both select components calls `replacePopupListActionRowElsInDom` after every change, so the claim holds.
- Opus 5 noted a fix commit whose subject runs past 100 characters. Left as it is: the commits are not rewritten.
- Opus 5 and Fable 5 asked that `CLAUDE.md` record the effort levels the owner uses for committees and reviews. That waits for the owner.

## The implementation of Q1 and Q3, and its review

The structure, the names and the read-out API shipped on `dev` in "feat: [src][themes] trigger wrapper and trigger buttons strip; 'match-trigger' renamed 'match-trigger-wrapper'" (the wrapper and the trigger buttons strip) and "feat: [src][i18n] screen-reader text of the trigger: triggerContextToScreenReaderTextFn; triggerCountSummary renamed triggerContentCountText" (the screen-reader text), followed by the review fixes "fix: [src][themes][test] trigger buttons strip leaves the Tab order while the popup is open; review fixes", "fix: [src][themes][test][docs] post-fix review: the empty-strip hide and the closed-popup condition in the docs, two tests", "fix: [src/themes][docs][demo][test] post-fix round three: theme variable comments, demo 1.3 hint, test names", "docs: [src/base.ts][docs/llm] post-fix round four: the scope of 'trigger-buttons', one attribution", "docs: [src/base.ts][docs/llm/A11Y.md][test] post-fix round five: the strip listener comment; onClose before onFocus", "docs: [src/base.ts] post-fix round six: onClose before onFocus in the onFocus docstring; the listener comment's reason" and "docs: [src/base.ts] post-fix round seven: onClose before onFocus in the onClose docstring; the comment's inside test", the docs "docs: [docs/llm][CLAUDE.md][README.md][angularjs/API.md][demo][scripts] trigger structure and screen-reader text", and the owner's rulings below, in "feat: [src][angularjs][test][docs] close reason 'trigger-buttons' for focus entering the trigger buttons strip" and "fix: [src/i18n] zh-TW and zh-CN name of the trigger buttons strip; Tai-lo count word order from a native reviewer"; `FIXME.md` lists every post-fix round with the commits it read. The review panel (Fable 5, Opus 5, Opus 4.8, Codex Sol) checked the first two and "docs: [src/base.ts][README.md][test] header-control rules named explicitly; a negative-tabindex test", the last unreviewed fix of the Q2 and Q4 work, at medium effort, and answered one design question first.

- The question: structure H says "Tab from an open popup closes the popup before entering the toolbar". The strip precedes the popup in DOM order, so with the filter inactive, Tab from the trigger reached a strip button before the popup's slot controls and closed the popup; the slot-control contract (`A11Y.md` "Focus") promises that Tab reaches those controls. The brief offered three options: A, keep H and document the gap; B, no strip button is a tab stop while the popup is open; C, drop the stop only while the popup holds a focusable slot control.
- All four chose B, which shipped in "fix: [src][themes][test] trigger buttons strip leaves the Tab order while the popup is open; review fixes". In their words:
  - Opus 4.8: "Option B restores the exact contract: with strip buttons out of the tab order while open, Tab from the combobox goes host -> slot controls -> out, Shift+Tab from the filter input leaves the component, and the strip is fully keyboard-reachable the moment the popup closes."
  - Opus 5: "Option A breaks a keyboard path that has no replacement." and "Option B costs only the open cycle."
  - Fable 5: "B loses nothing real. While the popup is open, everything the strip does is reachable inside the popup (deselect a row, deselect all)." Fable 5 also named a fourth option, keeping the strip in the tab order without closing the popup, "for completeness; I do not recommend it."
  - Codex Sol: "Choose B: while the popup is open, remove every strip button from the Tab sequence."
- The close reason: the brief asked whether `'blur'` fits focus moving into the strip. All four said no and asked for a separate value; each gave `'trigger-buttons'` as the example spelling, and Opus 5 added "The value is public API; the owner picks the spelling." Two members attached conditions. Opus 4.8: "Under B this path is rare (it can only fire via programmatic/AT focus), so if B is adopted you may instead decide the focusin-close is unneeded; if it stays, it should not borrow `'blur'`." Fable 5: "If the owner keeps one value, the amended docstring must stay." The owner ruled the separate value `'trigger-buttons'` (`FIXME.md` QUALITY-777), and `'blur'` again means only that focus left the select component.
- H's "Removal of the last tag focuses the trigger": the implementation reads "the last tag" as the last remaining one, and focuses the previous chip's button when the removed chip was the last in order but others remain. All four found the reading faithful; Opus 4.8 called it "the APG-conventional and better behavior".
- The other findings were fixed in "fix: [src][themes][test] trigger buttons strip leaves the Tab order while the popup is open; review fixes" and the docs commit, or left open in `FIXME.md`: QUALITY-783 (no warning for a control inside the hidden content slot) and MEDIUM-784 (the choose-all row's count reads a slash aloud in most packs).
- The post-fix rounds that followed are recorded by member in `FIXME.md`, under their own heading. Declined in round two: Codex Sol asked to cut the explanation of the README section "What a screen reader reads for the trigger" to three bullets and 45 words; that cap covers Q&A and FAQ answers (`CLAUDE.md`), and the section is a feature section like "Popup header / footer". In round three all four members, Codex Sol included, held the decline.
- The zh-TW `triggerButtonsAriaLabel`: the owner found the draft, which said "operations on the selected items", hard to understand, and asked whether the word for "action" fits or whether no one translates it that way. The convener offered three options, A the words for "selected items", B "actions of the selected items", C the draft, and recommended A because it is the shortest, matches what the screen shows, and a screen reader adds the role word "toolbar" itself. The owner chose A and said the owner had been thinking the same. The string is in `src/i18n/zhTW.ts`; the zh-CN pack follows it. The ruling covers those two packs: the English default "Selection actions" stays, and the other packs keep their drafts.
