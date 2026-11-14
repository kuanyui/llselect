# Committee: the build time of a select component after 0.0.9

Agent-facing record of the committee that the owner asked for after the search of `OPTIMIZE.md` "The first build in a page got slower after 0.0.9": each member proposed its own fix. The owner's request, in the owner's words, translated from Chinese: "did the other committee members propose solutions? Or did you not ask the other members to propose their own solutions? (do not preset solutions for them)". The convener had consulted no member before; the two test builds of `OPTIMIZE.md` were the convener's alone. No decision has been made.

## How the committee ran

- Members: Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol and Codex Astra. Each ran in a fresh session at the highest effort, `--effort max` or `model_reasoning_effort=max`, read-only, in a worktree of the commit "docs: [README.md] update features", the tree before the search's records. No member was skipped, and none stopped for memory.
- The brief held the observations of the search, the owner's goal and priority, the owner's worry quoted below, the API stability ruling of `CLAUDE.md`, the withdrawn `destroy()` flag, how the benchmark measures, where the design lives and the primary sources. It held no proposal, no option list and no conclusion, and it left out the convener's two test builds. It told the members not to read `OPTIMIZE.md`, `HANDOFF.md`, `TODO.md`, `FIXME.md` and `docs/llm/archive/`, to answer alone, to start no model, CLI or subagent, and not to name their model.
- A first start was stopped after one to three minutes, before any answer, to add the owner's worry and the questions on maintenance cost and bug risk. The owner's worry, in the owner's words, translated from Chinese, said about the convener's test build that builds the popup at the first open: "what I was worried about just now is that after the change the maintenance complexity rises sharply, or that bugs come out that can never all be fixed".
- The brief asked for: the proposals, the most promising first, with their saving per select component and how to verify it; what each changes in the public API, the DOM, `A11Y.md` and `DESIGN.md`, with the migration cost; the maintenance cost and the bug risk in concrete terms; the member's ranking of its own proposals; what it would not do; and what it reads differently in the observations.
- Every saving below is the member's own estimate; no member ran a browser or a test.

## The proposals, by member

### Opus 4.8

- Proposal 1: cache the 29 class strings of `createClassIdMap` that depend on the prefix only, per prefix, and build a flat own-property object per instance; skip the no-op `removeAttribute('lang')` on the construction path; let the constructor write the attributes of `syncFilterModeToDom` directly and keep `setAttributeIfChanged` for the re-sync at open. About 1 to 2 microseconds per select component. No change to the API, the DOM or ARIA. Low risk; the one new rule is that the skips apply to the construction path only, split at the three call sites, "not by a global flag".
- Proposal 2: clone a cached skeleton template per document and prefix. About 3 to 5 microseconds. No change to the API, the DOM or ARIA, and "Popup DOM lifecycle" stays. It adds "a second construction path and one new rule: a change to the skeleton shape must update both `buildSkeletonTemplate` and the positional child-reference resolver"; to be taken only after proposal 1, re-measured on the owner's machine, and only if the gap to the native select still matters to the owner.
- Ranking: proposal 1, then proposal 2. "If I had to pick one and stop: Proposal 1 only, because the owner's stated fear is disproportionate complexity, and the honest total already beats native."
- Would not: build the popup at the first open, "firmly ruled out by DESIGN 'Popup DOM lifecycle'"; remove the trigger wrapper or the screen-reader span; add a `destroy()` flag; rewrite the settings resolution; chase the per-method differences below a microsecond.
- Reads differently: the sum of build and before paint at 1000 x 10 is about 60 ms for the current build against 109 ms for the native select, so "'beat native' on the metric that reaches the user, time to first paint, is already met", which the member would confirm with the owner before accepting risk for the build column alone; part of the regression is systemic cost of a larger class, which trimming calls will not recover; the own times below a microsecond are near the sampling floor; the call counts miss the style writes; the owner's machine is the reference.

### Opus 5

- P1: clone one cached skeleton per document and prefix, a detached fragment built imperatively, never through `innerHTML`. 5 to 8 microseconds, "an estimate from the prices above, not a measurement".
- P2: cache the prefix half of `classIdMap`. 1 to 1.7 microseconds.
- P3: guard the no-op `removeAttribute('lang')` and the removals in `syncFieldNameToDom` with `hasAttribute` or `setAttributeIfChanged`. 0.3 to 0.5 microseconds.
- P4: one `MediaQueryList` per window in `prefersDark`, a before-paint item. 0.5 to 2 ms per 1000 select components.
- P5: attach the five listeners that matter only while the popup is open at the first `open()`. 0.7 to 0.9 microseconds; "the first proposal that adds a rule a future change could break".
- P6: run the duplicate-items check at the first open. 0.26 ms per 1000; it weakens a developer warning.
- Ranking: P1 to P6; "P1 to P4 together should carry the build column back below 0.0.9", shipped as separate commits, each with its own run of the version history page.
- Maintenance of P1: the rule "anything identical for all select components of one prefix goes in the template; anything per-instance is written after the clone"; the failure modes are a forgotten per-instance write, "loud and easy to test", a reference kept into the template, and use across documents; it "adds no flag that every write path has to keep true".
- Would not: build the popup at the first open; delegate the listeners to the document; add a "nothing was written" flag; remove the wrapper or the span; touch `destroy()`; chase the own time of the `LLSelectSingle` constructor; rewrite the settings resolution.
- Reads differently: the per-function decimals are below the sampling resolution; the current build against 0.0.14 at p = 0.064 is not established; the version steps mix the theme CSS with the library code, and 0.0.10 moved every theme to CSS variables, so its before-paint jump is probably mostly style; Blink's style properties can be wrapped as accessors on `CSSStyleDeclaration.prototype`; only Chromium was measured; the gap of the warm-up pass is warm-up of the JavaScript that a page with a few dozen select components pays.

### Opus 5.5

- P1: clone the fixed DOM from one template per document and prefix, with the class names of `createClassIdMap` cached. 4 to 6 ms per 1000 select components, 15 to 20 percent of the build.
- P2: write the trigger only when something changes: `data-empty` and `tabindex` through `setAttributeIfChanged`; the screen-reader text and its `lang` skipped when equal to the last write, since that span is private and has one writer; the string path of the content slot skipped when the slot holds exactly that text, read from the DOM, since `triggerContentEl` is public; the empty arrow slot left alone; `recomputeFilteredItems` skipped by `setItems` and `rerender()` while the popup is closed. 1 to 2 ms per 1000.
- P3: one `MediaQueryList` per window, under 1 ms per 1000 in before paint; also, to measure first, `overflow: clip` after `overflow: hidden` in the screen-reader recipe.
- P4: attach the five listeners of the hidden popup at the first `open()`, behind one private boolean. About 1 ms per 1000.
- Ranking: P1 to P4. "Together, P1, P2 and P4 might take 6 to 9 ms per 1000 select components off the build", about 19 to 22 ms at 1000 x 10, "level with or better than 0.0.9", "This is an estimate, not a measurement."
- Maintenance of P1: the rule "the template holds only what is the same for every select component of one prefix in one document"; new tests: an attribute snapshot over a matrix of settings, no shared node between two select components, a custom prefix after the default one, a second document. Of P2: "compare before writing; remember a value only for an element that no one else writes".
- Would not: a flag that several write paths must keep in step; "Not now: building the filter input and the no-results element at the first open", because of three recorded decisions, 28 uses of the two fields and tests that read the input before any open, with "If P1 to P4 fall short of the native `<select>`, revisit this idea with fields typed as nullable"; initial items as settings; `hidden` on the screen-reader span; moving the theme's color variables off the root.
- Reads differently: init is more than the build; on the owner's machine before paint grew about 13 to 15 ms since 0.0.9 against 5 to 8 ms for the build, and build plus before paint is 79.70 ms against 158.95 ms for the native select; `createPopupListEl` makes the same five calls at 0.0.9 and now yet took 0.48 and 0.90 microseconds, so a cost outside it grew, with garbage collection to be reported per version; the own time of the `LLSelectSingle` constructor is probably attributed work, to check with `--js-flags=--trace-deopt`; a page with 20 select components runs mostly unoptimized code; the benchmark sets `filterable: true`, not the default; the DOM counts include the mount element; the call table weights calls of very different cost alike.

### Sonnet 4.6

- Proposal A: write `lang` in `commitLangToDom` through `setAttributeIfChanged`. 0.1 to 0.2 ms per 1000, plus the rows at open.
- Proposal B: write the attributes of the `apply` helper of `syncFieldNameToDom` through `setAttributeIfChanged`. About 0.11 ms per 1000 at construction, and the same per open.
- Both change nothing in the API, the DOM, ARIA or the recorded decisions, add no rule and need no new test beyond one for A.
- Ranking: A, then B. "Both together recover an estimated 0.3-0.4 ms at 1000x10. That is not the full 7.15 ms gap vs 0.0.9, but it is the fraction that can be fixed without touching structural decisions." And: "The remaining gap ... is the cost of features added since 0.0.9. It cannot be recovered without removing those features or making architectural changes whose maintenance complexity the owner has explicitly said is a concern."
- Would not: group rarely used fields into a lazy object; share defaults through a prototype-chain settings bag; skip the construction-time render of the screen-reader text; try `destroy()` again; split `syncFilterModeToDom` into an init path and an update path, since "a future change that adds a new attribute to the filter-mode sync must remember to update both paths".
- Reads differently: a hypothesis for the own time of the `LLSelectSingle` constructor, that the instance's hidden class may have crossed a V8 threshold at 0.0.11, which the member could not confirm; otherwise the data look consistent.

### Sonnet 5

- P1: extend the clone of a cached template from the screen-reader span to the always-built skeleton, one or two templates, the trigger half and the popup half, with the buttons strip built as now. 2 to 4 microseconds per select component, "roughly a third to half of the ~7us/component regression".
- P2: skip the call of `commitLangToDom` at the render sites when no `lang` setting is set; the member found that a `hasAttribute` guard inside it would not help. 0.5 to 1.5 microseconds.
- P3: an unconditional write for the constructor's first `syncFilterModeToDom`. Under 0.5 microseconds.
- Ranking: P1, P2, P3; "None but P1 is worth a release alone."
- Maintenance of P1: "low-to-moderate, concentrated in one well-understood place"; the rule "a setting-independent part of the skeleton goes in the template; anything per-instance or per-setting stays an explicit post-clone write"; a new test across two documents.
- Would not: touch `destroy()` further; optimize the color-scheme code further; build the filter input lazily when `filterable` is `false`; make the frozen settings lazy; "Add a second, parallel 'fast construction' path behind a flag".
- Reads differently: the fine split of own times is directional only; the zero of `attachFocusListeners` at 0.0.9 "is partly a naming artifact", since 0.0.9 had `attachFocusOut`; nine `createElement` at 0.0.9 and now because the wrapper added one and the span clone replaced one; the owner's run cannot be reproduced from the repository.
- The member also added a summary in Traditional Chinese.

### Codex Sol

- 1: clone one persistent DOM scaffold per document, with the listeners attached after the clone. 2.5 to 4.5 microseconds per select component. No contract changes; the rule is that "the scaffold's child positions and the field extraction must stay aligned", and static state never holds ids, text, settings or listeners.
- 2: attach the popup-only listeners on the first open, one boolean. 0.8 to 1.3 microseconds; a synthetic event sent into the hidden input before the first open is then no longer handled.
- 3: remove repeated JavaScript work: a typed module-level table of the default prefix's class names, `ownExtras` passed directly when no further subclass settings exist, `handleLabelElClick` allocated only with a `labelEl`. 0.4 to 1.0 microseconds, each change kept "only if an isolated benchmark shows a repeatable shift".
- Ranking: 1, 2, 3. "Together I estimate 3.7-6.8 ms at 1000 x 10 ... I would not promise native synchronous parity before measuring." Verification: at least 24 interleaved rounds, the DOM census, the first open measured apart, and current Firefox, Chromium and Safari.
- Would not: build the popup lazily, "exactly the kind of maintenance multiplication the owner warned about"; remove the wrapper or the span; defer construction work to a microtask only to move it into before paint; change the default color scheme; a distributed "state was written" flag in `destroy()`; bitsets or a lazy state object without profile evidence.
- Reads differently: p = 0.064 is not a proved gain; inclusive times overlap and do not add; the counts miss the style writes and weight calls alike; the warm second build confirms that most of the regression survives warm-up; the native select builds every option while llselect leaves the rows lazy; missing are the split between constructor, `setItems` and `setChosenItem`, the first open, memory, a forced light scheme, the mode without the filter, custom prefixes, and Firefox and Safari; "Build plus Before paint is about 59.8 ms versus native's 109.35 ms. The synchronous initialization gap is real; it is not an overall pre-paint loss."

### Codex Astra

- 1: build the fixed DOM once per document, then clone it; one construction implementation, with no separate fast path. 2 to 5 microseconds per select component; "Cloning could save less, or lose, in another browser." The rules: templates hold no instance ids, caller content or listeners; the references are taken before the optional parts are inserted; the instance's initialization supplies every dynamic value.
- 2: a constructor form with initial items and selection, for example `new LLSelectSingle({ targetEl, settings, initial: { items, chosenItem } })`, which establishes the state with no initial notification. 1 to 3 microseconds per select component that adopts it; "The existing benchmark adapter gains zero from this proposal alone." It extends three constructor signatures, exports two types and needs lines in `DESIGN.md` and `A11Y.md`.
- Ranking: 1, then 2. "Neither estimate establishes native synchronous-build parity."
- Would not: "Make the popup lazy as the first fix", which "deserves a separate design proposal only if the simpler experiment falls short"; remove the wrapper or the span; skip the `focusout` listener when no callback is set, since it also closes the popup and `test/focus-events.test.ts` tests that; "Replace every absent-attribute removal with a getter or tracking flag", since "Another DOM call may save nothing; cached state introduces invalidation obligations"; change the automatic color scheme or optimize the teardown first.
- Reads differently: the regression is not only startup cost; the DOM count appears to include the root element; before paint is not the time of presentation; the native select and llselect do different work; "Permanent closed-popup DOM is a project decision, not necessarily an ARIA requirement", since the member recalls that the APG and WAI-ARIA 1.2 let a collapsed combobox omit `aria-controls`, wording unverified.

## Where the answers meet

- The skeleton clone: the first proposal of Opus 5, Opus 5.5, Sonnet 5, Codex Sol and Codex Astra, and the second of Opus 4.8, who would take it only after the smaller fixes and only if the gap to the native select still matters. Sonnet 4.6 does not propose it. The estimates run from 2 to 8 microseconds per select component.
- The class names of `createClassIdMap` cached per prefix: Opus 4.8, Opus 5, Opus 5.5 and Codex Sol.
- The no-op `removeAttribute('lang')`: Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6 and Sonnet 5 propose a fix, in different forms. Codex Astra would not replace the removals with a getter or a tracking flag.
- The read before the write at construction: Opus 4.8 and Sonnet 5 propose a direct write; Sonnet 4.6 would not split `syncFilterModeToDom` into two paths.
- The popup-only listeners attached at the first open: Opus 5, Opus 5.5 and Codex Sol.
- One `MediaQueryList` per window, for before paint: Opus 5 and Opus 5.5.
- A popup built at the first open: Opus 4.8, Opus 5 and Codex Sol would not do it. Opus 5.5 would not build the filter input and the no-results element late now, and would revisit that with nullable fields if its other proposals fall short of the native select. Codex Astra would not do it as the first fix, only as a separate design proposal if the simpler experiment falls short. Sonnet 4.6 and Sonnet 5 do not discuss it.
- A flag in `destroy()`: no member proposes one; Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol and Codex Astra say they would not.
- The sum of build and before paint: Opus 4.8, Opus 5.5 and Codex Sol point out that llselect's sum is well below the native select's.

## Facts the convener checked against the answers

- The DOM counts of the brief included the benchmark's mount element, as Opus 5.5 and Codex Astra found: correct. The library's own calls are three fewer in every version, and the library builds one element fewer; `OPTIMIZE.md` is corrected.
- Sonnet 5's reading of `attachFocusListeners`: at 0.0.9, `attachFocusOut` ran in `open()`, not in the constructor, so the `focusout` listener that every select component gets at construction is new at 0.0.11.
- Opus 5's statement that Blink's style properties can be wrapped as accessors: the convener's counter wrapped the own properties of `CSSStyleDeclaration.prototype` and of `CSSStyleProperties.prototype` in Chromium 156 and counted no style write. Not resolved.
- Kept out of the brief, and relevant to several answers: the convener's two test builds, in `OPTIMIZE.md`. The first skipped the no-op writes and cached the class names, with the same DOM as the current build: about 2 to 3 ms less per 1000 select components. The second also built the popup at the first open: 10.45 ms less, for `LLSelectSingle` only.

## Test builds before the second stage

- The agent offered three ways on: the second stage at once; test builds of the main proposals first, then the second stage with the numbers; or the owner's own pick. It recommended the test builds. The owner answered, in the owner's words, translated from Chinese: "as you said".
- The convener built and measured them: `OPTIMIZE.md` "The first build in a page got slower after 0.0.9", step 7, which says what each test build implements and of whose proposal. In short, at 1000 x 10, build total, against the current build: the clone of the skeleton saved about 2.3 ms in Chromium, 12 ms in Firefox and 9 ms in WebKit; the smaller fixes together saved about 1 ms, 6 ms and 5 ms; both together about 4.8, 17 and 10 ms, while 0.0.9 was 7.1, 15 and 21 ms faster than the current build. No single smaller fix was measurable alone in Chromium. Before paint moved with two changes only, one `MediaQueryList` per window and `overflow: clip` on the screen-reader span: together 1.15 to 2.50 ms in Chromium and 4.09 to 5.51 ms in Firefox, two runs each, against a growth of 9.30 ms and 22.30 ms since 0.0.9; in WebKit, before paint grew from 79 to 154 ms since 0.0.9, and no test build moved it measurably.

## Status

- The second stage: every member marks every proposal, anonymized, with the test builds' numbers in the brief.
