# Abandoned plan: mobile native simulation

Agent-facing record of three features that were planned, investigated and then abandoned by the owner, before any library code was written for them. The three would have made a select component follow the native select on phones and on touchscreens: the Android back button closes the popup, the rows grow taller when a touch opens the popup, and the popup gets a phone layout. The record holds each plan, the evidence the investigation found and why the plan ended, so that nobody has to research the question again if it comes back.

How to read this record:

- The numbers 1, 3 and 4 are the step numbers of the agent's four-step plan. Step 2, browser detection, is not part of this record and stays in `TODO.md`, "Browser detection".
- "The committee" is the design committee of `CLAUDE.md`: a fresh session each of Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol and Codex Astra, at max effort, read-only. Its brief and its seven answers lived in the session's scratchpad and are not in the repository; this record keeps their content.
- Platform facts come from specifications, documentation and browser source code, each named at its fact and listed under "Sources". Nothing here was tested in a real browser or on a device, except where a line says that the owner tested it.
- Paths of browser source files are written without code formatting, since they are not files of this repository.

## Status

- Abandoned by the owner. The owner's words, translated from Chinese: "It seems better not to do the phone native simulation after all; of the four items just discussed, is anything still worth doing?"
- The owner then asked for this record, translated from Chinese: "Record the original plans of items 1, 3 and 4, and the evidence found that they cannot be done, in a standalone file under docs/llm/".
- The agent's finding is narrower than "cannot be done", and this record keeps the two apart. Each of the three features can be built. What cannot be had is listed per feature under "What cannot be done"; the rest is cost, under "What it would cost".
- No library code, no test and no public API changed.

## How the plan came about

- The owner noticed a missing behavior, translated from Chinese: "on the desktop version of Firefox, at a touch, the top and bottom padding of an item gets bigger", and asked whether the feature would cost too much to build.
- The owner then widened the question, translated from Chinese: if it is really to be done, also evaluate whether the phone version can have a full-screen modal style, "especially since Android also has the function of closing with the back button; I have not used iOS and do not know it". The owner also named a new function in `behaviors.ts` that would detect the OS and the browser, and later an option with which llselect would mimic the behavior of the current OS and browser as far as it can, so that the user need not choose.
- The agent answered with four steps, the smallest first: 1, the Android back button closes the popup; 2, browser detection, with a preset picked for the platform; 3, taller rows when a touch opens the popup; 4, a phone layout for the popup.

## 1. The Android back button closes the popup

### The plan

- In `open()`, the library creates one `CloseWatcher`, where the browser has one, and destroys it in `close()`. The watcher's `close` event closes the popup.
- The owner called it doable and asked, translated from Chinese: "on by default? Or should this be on only on phones? (This operation is reasonable on Android, but I do not know whether the desktop version would be affected in navigation back, closing the tab and the like)".
- The agent recommended three things. The owner's answer, translated from Chinese: "As recommended. Will it be you who writes the code by hand this time? Before starting work, first have the committee, Opus, Sonnet, Astra, Sol, review your proposed plan." The agent answered that it would write the code itself. The three recommendations:
  - A: always on wherever the browser has `CloseWatcher`, with no setting.
  - B: a new value `'close-request'` in `LLSelectCloseReason`, not a wider `'escape'`.
  - C: the back button closes at once, also while the filter input holds text, while Esc keeps its two stages.

### Evidence: the platform

- A close request is the HTML Standard's name for the user's wish to close what is on the screen. Its examples: the Esc key on desktop platforms, the back button or the back gesture on Android, an assistive technology's dismiss gesture, a game controller's back button.
- The browser hands a close request only to a close watcher. Three things have one: a modal `<dialog>`, a popover in the `auto` or `hint` state, and a `CloseWatcher` object. The popover show steps establish a close watcher inside the branch for `auto` and `hint` only, so llselect's `popover="manual"` popup has none, and neither would a plain element.
- For the back button, the Standard says: "no event is involved, so when the back button is pressed, the user agent proceeds directly to process close watchers. If there is an active close watcher, then that will get triggered. If there is not, then the user agent can interpret the back button press in another way, for example as a request to traverse the history by a delta of -1." So today a back press with the popup open may leave the page; this is inferred from the Standard.
- For Esc, the Standard says that the browser first fires the `keydown`, and: "If the web developer cancels the event by calling preventDefault(), then nothing further happens. But if the event fires without being canceled, then the user agent proceeds to process close watchers." The library cancels every Esc `keydown` that `handleKeydown` or `handleSlotKeydown` handles.
- The `close` event says nothing about what triggered it. The browser destroys the watcher before it fires `close`. The constructor throws `InvalidStateError` when the document is not fully active. The `cancel` event is cancelable only while the page has history-action activation.
- Anti-abuse grouping: a close watcher made while the window allows no further group joins the last group. One close request asks every watcher of the last group to close, the newest first, and stops at a watcher whose `cancel` event is canceled. The window allows one group at first, and a user interaction can allow one more. The Standard's summary: web developers "can create a number equal to at most 1 + the number of times the user activates the page".
- Support, from MDN browser-compat-data: `CloseWatcher` in Chrome 126, Edge 126 and Firefox 149, where Firefox for Android mirrors the desktop entry; Safari has it in the Technology Preview only.
- The platform notes of the WICG close-watcher proposal, under "On platforms with keyboards": "Pressing down on the Esc key is a close request." On Android they name the back button, or the swipe from a screen edge in gesture navigation; on iOS, "only [...] if assistive technology is being used, or if a keyboard is attached to the device". Its README says of holding the back button to choose a history step, and of closing the tab: "These are never a close request."
- Blink, read on Chromium's main branch: `KeyboardEventManager::DefaultEscapeEventHandler` calls `CloseWatcher::WatcherStack::EscapeKeyHandler`, which signals only for a trusted `keydown` that is not default-handled and whose key code is Escape. A second way in is a `CloseListener` interface that the browser process signals; the agent took it for the path of the Android back button and did not read the caller.
- Gecko, read on Firefox's main branch: `PresShell::EventHandler::FinalizeHandlingEvent` calls `Document::ProcessCloseRequest` for a `keydown` whose key code is Escape and that is not default-prevented, under the preference `dom.closewatcher.enabled`. On Android, `_processBackPressed` in GeckoViewContent.sys.mjs answers false when the browser has no active close watcher, and otherwise processes the close request and answers true. The desktop front end defines `BrowserCommands.processCloseRequest`, for which the agent's search found no caller outside the tests.
- Esc during an IME composition: the library leaves that key to the IME and does not cancel it. A key that an IME took reaches the page as a `keydown` with key code 229, the sign that `isImeKeydown` in `src/keyboard.ts` reads, as far as the agent knows. Both engines test the key code for Escape, so by their source such a key does not become a close request. Nobody tested it with a real IME.
- TypeScript 5.9.3 has no `CloseWatcher` type in its DOM library, and jsdom 25 has no `CloseWatcher`.

### Evidence: the committee review

All seven members answered; none was skipped. Where a line below says "seven of seven", it means Opus 4.8, Opus 5, Opus 5.5, Sonnet 4.6, Sonnet 5, Codex Sol and Codex Astra.

- The mechanism, a close watcher per open cycle that the library owns: seven of seven in favor. Opus 4.8 wrote "agree", the six others "agree with changes". No member chose `popover="auto"`, a `history.pushState` entry with `popstate`, or doing nothing.
- Recommendation A: seven of seven wanted it on by default; no member chose an opt-in setting, a preset field or a detection of Android. The members split on a way to turn it off:
  - No setting: Opus 5.5, Opus 4.8, Sonnet 4.6. Opus 5.5, translated from Chinese: neither counter-case is worth a setting now, and a protected method in the manner of `shouldListenForScrollGesturesOutside()` can be added later without a breaking change. Sonnet 4.6: "An opt-out boolean setting would impose a permanent API obligation and an extra decision on every user of the library for a behavior most will never see."
  - No public setting, plus a protected method `shouldWatchCloseRequests(): boolean`, default `true`, called once per open: Opus 5, which noted that apps on the AngularJS bridge cannot reach a protected method, and: "If the owner wants them covered, the gate must be a setting instead."
  - On by default, with an opt-out boolean setting: Codex Sol, Codex Astra, Sonnet 5. None of the three named the setting. Sonnet 5 on the cost named below: "I weigh it as disqualifying, not a caveat."
- The cost that the three named, each with its own example: an app that already closes its own UI on the back button, by pushing a history entry and listening for `popstate`. Codex Sol: "Android Back would now close llselect without traversing; the sentinel remains, so the next Back performs a redundant dismissal or requires an extra press." Every member named a form of this case; Opus 5.5, Opus 4.8 and Sonnet 4.6 held that it does not justify a setting.
- Recommendation B: seven of seven for `'close-request'`. Several pointed to the precedent of `'trigger-buttons'`, split from `'blur'`. Members asked that the docstring name the triggers and say that the browser does not tell them apart, and that the compile break for code that switches over every `LLSelectCloseReason` be named.
- Recommendation C: seven of seven for closing at once. Opus 5 noted that a two-stage back press could be built without `cancel`, by clearing the query and making a new watcher inside the `close` handler, "so the brief's reason is weaker than stated", and still agreed.
- Esc during an IME composition: all seven named it as a risk. Sonnet 4.6 asked for a guard before any code, `if (this.composing) { return }` in the `close` handler. Sonnet 5: "Needs a named contingency [...], not just 'check in a browser.'" Opus 5: "the IME case is a regression, not a check", to be measured before shipping. Opus 5.5, translated from Chinese: it must be tested before a release, and the guard should not be written in advance. Opus 4.8, translated from Chinese: it should not ship before a device test confirms it, or it needs a guard at the `keydown`. Codex Astra: "Verify before shipping." Codex Sol called it unverified. The agent's reading of both engines' source, in "Evidence: the platform", came after the review.
- What changes on the desktop: Codex Sol answered "disagree" here, with "The proposal understates desktop changes"; the six others answered "agree with changes". An Esc that no library handler cancels would start to close the popup, with the reason `'close-request'`:
  - while DOM focus sits on content inside the popup that no handler covers, such as a focusable element that an app or a subclass put into a row, with no header or footer slot (Codex Sol, Codex Astra, Opus 5.5, Opus 5);
  - on a slot control whose own handler stops the event's propagation without canceling it (Codex Astra, Opus 5.5, Sonnet 4.6);
  - after a scripted `open()` with the filter inactive, while DOM focus is elsewhere on the page (Codex Sol, Codex Astra, Opus 5.5, Opus 5);
  - inside a modal `<dialog>`, such an Esc today closes the dialog and leaves the popup, and would then close the popup alone (Opus 5.5, Opus 5).
  - Opus 4.8 held the opposite on app content in the popup, translated from Chinese: `handleSlotKeydown` sits on the popup element and covers every slot, so there is no gap. The constructor attaches that listener only when a header or a footer slot exists, which is the gap the members above named.
- Grouping: every member found that two select components opened by script without a user gesture can share one group, in which one close request closes both. Codex Astra stated it for a fresh page, where both watchers join the first group, and Opus 5.5 for the case that the allowed groups are used up; Codex Astra: "Activation and group capacity, rather than DOM nesting, determine separation." A popup opened by script inside an app's modal dialog can share the dialog's group in the same way (Codex Sol, Codex Astra, Opus 5.5, Opus 5, Opus 4.8, Sonnet 4.6), and Codex Sol added that a canceled close of the dialog can stop the rest of its group. Sonnet 5 marked as unverified whether a shipping `<dialog>` closes through this grouping today.
- A `dialog.showModal()` over an open popup, on which the members differed. Codex Sol: the dialog's focus move first closes a focused select component with `'blur'`; if focus was elsewhere, a separate group closes the dialog first and a shared group can close the dialog and then the popup; and `FIXME.md` says that the Standard does not hide a manual popover by itself. Codex Astra: if focus was already elsewhere, "A surviving watcher could dismiss an obscured popup alongside the dialog or consume a later Back." Opus 4.8, translated from Chinese: the dialog hides the popover without the library knowing, the watcher stays, and a later back press closes a popup that nobody sees and fires `onClose`. Sonnet 4.6 on that same close: "That is exactly the right recovery path. No new failure mode." Opus 5.5, translated from Chinese: the dialog's watcher is newer, so the dialog closes first, and if the popover was hidden behind the library's back, the next back press runs `close()` and brings the state back in step. Opus 5: with activation the dialog closes first and then the popup, without it both at once. None of them had a browser result for this case.
- The mechanism changes that members asked for: read `CloseWatcher` from the window of the root element, not from `globalThis` (Codex Sol, Opus 5), where Codex Astra chose neither and noted for the tests that the test setup copies no `CloseWatcher` onto `globalThis`: "Patch and restore the actual lookup target."; create the watcher only while the popup is still open (Opus 5.5, Codex Astra), and only once `showPopover()` has run, so that the hidden popup of a detached root element takes no back press (Opus 5.5; Codex Astra asked that this case be defined), where Sonnet 5 held the opposite, a watcher also on a detached mount; destroy the watcher right after `close()` marks the popup closed, before the focus return runs app listeners (Codex Sol, Opus 5.5); keep the type local, with no global declaration (Opus 5).
- A watcher that outlives its popup takes one back press with no visible effect. Members named three ways there: a root element removed while open without `destroy()` (Opus 5, Opus 5.5), a close during the open (Opus 5.5, Codex Astra) and a detached root element (Opus 5.5, Codex Astra).
- On the later steps: no member found that step 1 would make them harder. Four said that a phone layout must not create a second close watcher (Opus 5.5, Opus 5, Codex Sol, Codex Astra).
- Corrections: `LLSelectSingle` and `LLSelectMultiple` are declared in `src/single.ts` and `src/multiple.ts`, not in `src/base.ts` as the brief read (Codex Sol); the grouping limit is 1 plus the user interactions, where `TODO.md` then said one close watcher (Opus 5.5).

### What cannot be done

- Taking the back button and nothing else. A close watcher gets every close request, and the page cannot ask what triggered one. A page keeps an Esc from becoming a close request only by canceling that `keydown`. So the feature cannot leave the desktop untouched, and a reason named `'back'` would be wrong.
- Limiting the feature to phones without a guess at the device. The browser, not the page, knows which platform has a back button.
- The same behavior in every browser. No Safari release has `CloseWatcher`, and neither do Chrome before 126 and Firefox before 149.
- A guarantee of one popup per back press for popups opened without a user gesture, while every select component makes a close watcher of its own: whether two watchers share a group is the browser's rule. One watcher shared by every select component, for the newest popup only, could keep the library's own popups apart (Codex Sol, in the review of this record); a popup that shares a group with an app's dialog or watcher stays out of the library's reach.
- Hearing the back button without a close watcher, short of a `history.pushState` entry with a `popstate` listener. That writes into the app's own history and meets the app's router, and the WICG README says that browsers "try to have the actual back button UI skip entries that were added without user activation".

### What it would cost

- The break of `'close-request'`: TypeScript code that switches over every `LLSelectCloseReason` stops compiling, and `$reason` of `ll-on-close` gains a value.
- The split on a way to turn it off, three to one to three, which the owner would have had to rule on.
- Checks that only the owner can run: Esc during an IME composition in Chrome and in Firefox; the back button and the back gesture on Android, with the on-screen keyboard up and down; TalkBack.
- The desktop changes above, each to be documented, and an app with its own `pushState` handling, which would have to drop it.
- Tests with a fake `CloseWatcher`, and changes to the docstrings in `src/base.ts`, `DESIGN.md`, `A11Y.md`, `naming-conventions.md`, `angularjs/API.md` and the list of features above the floor in `CLAUDE.md`.

### Why it ended

- After the committee's report the owner asked, translated from Chinese: "So it turns out that our use of the popup API is what keeps the behavior from being consistent when we build this feature?"
- The agent's answer: no. A plain element gets no close request either, and `popover="auto"` would register the same kind of close watcher under the same rules, with the browser's light dismiss on top. The inconsistency comes from the close request itself, which covers Esc and the back button alike, and shows only where the library cancels no Esc.
- The agent named one way to remove most of it: a `keydown` listener on the document while the popup is open, which closes with `'escape'` at any Esc that nothing canceled. Its cost is one more listener and a changed behavior in every browser; the committee did not review it, and the agent advised against it for step 1.
- The owner then abandoned the phone native simulation.
- The agent's own recommendation changed at the end, from building it in to leaving it out, for two reasons: an app gets the same result with the public API, below; and inside the library the feature brings the desktop changes and the open question of a way to turn it off.

### What an app can do today

```js
let sel
let watcher
sel = new LLSelectSingle(el, {
  onOpen: () => {
    // The window of the select component, which differs from the script's own inside an iframe.
    const view = sel.rootEl.ownerDocument.defaultView
    if (view === null || typeof view.CloseWatcher !== 'function') { return }
    try {
      watcher = new view.CloseWatcher()
    } catch {
      // The browser refuses a close watcher while the document is not fully active.
      return
    }
    watcher.onclose = () => { sel.close() }
  },
  onClose: () => {
    if (watcher) { watcher.destroy() }
    watcher = undefined
  },
})
```

- `onClose` then reports the reason `'api'`.
- Everything under "What cannot be done" holds for that app too, and for that app alone.
- Checked under jsdom against the built bundle, with a fake `CloseWatcher` on the window: one watcher per open, a close request closes the popup, `close()` destroys the watcher, a late close request is not taken, and a constructor that throws leaves the popup open. Not checked in a browser.

## 3. Taller rows when a touch opens the popup

### The plan

- The library reads the pointer type at `pointerdown` on the trigger wrapper, marks the popup at open when a touch opened it, and each theme makes the rows taller under that mark.
- Who decides the taller rows: the agent gave two options, a further field of the behavior preset or taller rows in llselect's own default. Owner ruling, translated from Chinese: "more fields on the preset". Only `behaviorPresetsOfFirefoxOnWindows` would then have turned it on. The field's name and signature were never decided.

### Evidence

- The owner's observations are in `native-select-scrolling.md`, "Row height when a touch opens the popup": Firefox on the desktop makes the rows taller at a touch, and Chromium on the desktop does not, in the owner's test on Windows.
- Firefox's source, read on its main branch and not on a release: SelectChild.sys.mjs handles the event `mozshowdropdown-sourcetouch` by reporting a native select opened through a touch; SelectParent.sys.mjs then runs `menupopup.classList.toggle("isOpenedViaTouch", isOpenedViaTouch)`; the Windows theme, toolkit/themes/windows/global/global.css, sets `--menuitem-text-padding-block` to 0.3333em and, under `.isOpenedViaTouch`, to 0.9167em, which its comments give as 4 px and 11 px at the default font size of 12 px. The agent's search of the source found a rule for that class in the Windows theme only.
- Chromium's source, read the same way: internal_popup_menu.cc writes a top and bottom padding of 4 px and a minimum block size of 24 px for every option, each times the scale factor, with no branch for a touch in that file. This agrees with the owner's test.
- llselect reads no pointer type, and `'toggle'` in `LLSelectOpenReason` covers a mouse and a touch alike.
- A `click` event carries `pointerType` only from Chrome 92, Firefox 129 and Safari 18.2, above the support floor; `pointerdown` carries it from Chrome 55, Firefox 59 and Safari 13 (MDN browser-compat-data). jsdom 25 has no `PointerEvent`.

### What cannot be done

- Nothing: the feature can be built. One limit: at the support floor, the pointer type cannot come from the `click` that opens the popup, so it must be remembered from the `pointerdown` before it.

### What it would cost

- A `pointerdown` listener and a mark in the core, a new field of `LLSelectBehaviorPreset`, one rule in each of the five themes, tests with a faked pointer event, and a pass on a Windows touchscreen.

### Why it ended

- It was abandoned with the plan. The agent advised against building it in: by the evidence above the behavior exists in one browser on one operating system, on touchscreens only, and an app can do it with the public API.

### What an app can do today

```js
let sel
let touched = false // the last pointerdown on the trigger wrapper was a touch
let touchClick = false // the click now being handled came from that touch
sel = new LLSelectSingle(el, {
  onOpen: (meta) => {
    sel.popupEl.classList.toggle('opened-by-touch', meta.reason === 'toggle' && touchClick)
  },
})
sel.triggerWrapperEl.addEventListener('pointerdown', (ev) => { touched = ev.pointerType === 'touch' })
sel.triggerWrapperEl.addEventListener('pointercancel', () => { touched = false })
// The library opens the popup in its own click listener on the trigger wrapper.
// A capture listener on the root element runs before it, a bubble listener after it.
sel.rootEl.addEventListener('click', () => { touchClick = touched; touched = false }, true)
sel.rootEl.addEventListener('click', () => { touchClick = false })
```

```css
.opened-by-touch .llselect-popup-list-row { padding-block: 0.9em; }
```

- Checked under jsdom against the built bundle: a touch open sets the class; a mouse open clears it; a `toggle()` call after a touch open and a close does not set it. Not checked in a browser.
- The positioner watches the popup's size, so it should place the popup again once the rows grow; inferred from `createPositioner`, not tested.

## 4. A phone layout for the popup

### The plan

- `TODO.md` held "a near-full-screen popup on phones, an earlier idea of the owner's"; the owner's later wording was a full-screen modal style.
- At each open, the library would decide whether the phone layout applies, from the pointer type and the size of the viewport, not from the user agent string. In the phone layout the popup covers the visible area and no longer hangs on its trigger.
- The owner asked whether it could be an optional module, which the agent read as a question about this layout. The agent's assessment: possible in the way of `@llselect/core/behavior-presets`, a bundle of its own whose exports fill settings, once the core has customization points for the placement and for the choice per open; its CSS could be one stylesheet for all five themes, since every theme color is a `--llselect-*` variable.

### Evidence

- The native select on Android, from the browsers' source on their main branches, not from a hand test. Chrome, in SelectPopup.java, shows an anchored `SelectPopupDropdown` on a tablet for a native single select while touch exploration is off, and a `SelectPopupDialog` otherwise; SelectPopupDialog.java builds an `AlertDialog` that can be canceled, with OK and Cancel buttons for a native multiple select. Firefox, in ChoiceDialogFragment.kt, builds an alert dialog too, with Cancel and OK buttons for a native multiple select.
- So the native select on a phone is an alert dialog in both browsers, which Android centers on the screen, as far as the agent knows. A full-screen popup is a design of its own, not a simulation.
- No one on the project has tested iOS, and the owner has not used it.
- What the popup already has: the top layer through the Popover API; a positioner that follows the visible area, the part of the screen that the on-screen keyboard leaves free (`getVisibleViewport` in `src/positioning.ts`); a default behavior that keeps a scroll inside the popup off the page.
- `createPositioner` is internal, so nothing outside the core can ask for another placement.
- By the style sheet of the HTML Standard, `:popover-open::backdrop` has `pointer-events: none !important`, so a tap on a dimmed surround reaches the page under it. `outsideClickBehavior: 'block'` stops such a tap from activating what it lands on.
- `A11Y.md` makes the popup a non-modal dialog while the filter is active, and no focus trap.
- The multiple select component applies each pick at once; both native dialogs apply the picks at OK.
- The Popover API exists from Chrome 114, Firefox 125 and Safari 17 (MDN browser-compat-data). Without it, an ancestor that creates a containing block displaces a fixed popup (`DESIGN.md`, "In-place popup (no body portal)").
- The library has 54 language packs under `src/i18n/`.
- A close button through the header or the footer slot is possible: no settings function receives the instance (`popup-rows-and-callbacks.md`), but an event handler on slot content may read it once the constructor has returned, as the docstring of `createPopupHeaderContentElFn` says. A module that is a plain object of settings holds no instance, so it would need a function that is given one, or the dimmed surround, or a function that takes a select component class and returns a subclass, as `defineCompatClass` in the ui-select bridge does. Such a button would also take the slot from the app.

### What cannot be done

- Verifying the layout on iOS, with the people and devices the project has.
- Leaving the cancel to the platform on iOS: iOS has no back button, and no Safari release has `CloseWatcher`. A full-screen popup leaves no outside to tap either, so a touchscreen user there needs a visible way to cancel, which the library or the app must draw.
- The phone layout in a browser without the Popover API, under an ancestor that creates a containing block; such a browser would have kept the anchored popup.
- Calling a full-screen popup a simulation of the native select, by the Android evidence above.

### What it would cost

- The largest of the three, by the agent's estimate no smaller than the work that made the scroll gestures configurable (MEDIUM-795): a new placement; a close button whose text all 54 language packs carry, or a dimmed surround with outside taps blocked; a ruling for the multiple select component; a change to the `A11Y.md` contract for a true modal; CSS in five themes and their dark values; a demo; the README; device passes on Android, and none possible on iOS.
- On Android it also needed step 1, the back button.

### Why it ended

- The owner abandoned it with the plan. The agent agreed: it cost the most, it leaned on step 1, and half of its target, iOS, could not be verified.

## Found on the way

- Two lifecycle problems in the code as it is, both found by Codex Astra while reviewing step 1: `open()` reopens a select component that `destroy()` is tearing down (MEDIUM-968 in `FIXME.md`), and a `close()` from inside the list render leaves the listeners of that open attached (MEDIUM-969).
- A stale entry of `TODO.md`, found by Codex Sol: "Close reason on `onClose`" still said that `onClose()` has no argument (DOCUMENTATION-970).

## Sources

- HTML Standard, "Close requests and close watchers": https://html.spec.whatwg.org/multipage/interaction.html
- HTML Standard, the popover show steps: https://html.spec.whatwg.org/multipage/popover.html
- HTML Standard, the style sheet for popovers: https://html.spec.whatwg.org/multipage/rendering.html
- WICG close-watcher, README.md and platform-implementation-notes.md: https://github.com/WICG/close-watcher
- MDN browser-compat-data, main branch: https://github.com/mdn/browser-compat-data
- Chromium, main branch, https://github.com/chromium/chromium : third_party/blink/renderer/core/html/closewatcher/close_watcher.cc, third_party/blink/renderer/core/input/keyboard_event_manager.cc, third_party/blink/renderer/core/html/forms/internal_popup_menu.cc, content/public/android/java/src/org/chromium/content/browser/input/SelectPopup.java and SelectPopupDialog.java in the same folder.
- Firefox, main branch, https://github.com/mozilla-firefox/firefox : layout/base/PresShell.cpp, mobile/shared/modules/geckoview/GeckoViewContent.sys.mjs, browser/base/content/browser-commands.js, toolkit/actors/SelectChild.sys.mjs, toolkit/actors/SelectParent.sys.mjs, toolkit/themes/windows/global/global.css, mobile/android/android-components/components/feature/prompts/src/main/java/mozilla/components/feature/prompts/dialog/ChoiceDialogFragment.kt.
