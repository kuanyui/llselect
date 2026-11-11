# Native select questionnaire

The list of the owner's hand tests of the browser's native `<select>`, as multiple-choice questions. In a sitting, the agent asks the owner these questions in the conversation, for one browser on one platform, and records the answers in `native-select-scrolling.md`, the record of the owner's tests. Most answers decide values of the behavior presets in `src/behavior-presets.ts`; the others are evidence for behaviors that no setting has yet.

## How a sitting works

- The owner names the browser and its version, the operating system and its version, and the input device: a mouse, a touchpad or a touchscreen.
- The agent asks the questions that the device can answer, one group at a time, with the answers of this list. A question that the device cannot answer is skipped. The owner may answer in Chinese.
- The control under test is the native select of demo 17.1 on the examples page, or another ordinary native select. A customizable select, styled with `appearance: base-select`, behaves differently, as `DESIGN.md` "Outside click while the popup is open" records.
- For a click question, a control outside the select that shows a press serves, such as the trigger of a select component beside the native select of demo 17.1: its popup opens when the click gets through.
- Before a scroll question, scroll the page away from its top and its end, so that a scroll would show. Check once that the gesture scrolls the page while the popup is closed.
- Before a zoom question, check once that the gesture zooms the page while the popup is closed.
- Open the popup again before each attempt.
- When no answer fits, the owner says what happened, and the agent records it in the owner's words.

## The four shared answers

Most questions share these four answers, in this order:

- a: the popup stays open, and the gesture does nothing to the page.
- b: the popup stays open, and the gesture acts on the page.
- c: the popup closes, and the gesture does nothing to the page.
- d: the popup closes, and the gesture acts on the page.

Each group below says what "acts on the page" means there. A question with other answers lists them.

## Click or tap outside the popup

"Acts on the page" means that the control under the click gets it: a button reacts, a popup opens, or the caret blinks in a text field.

- `click-outside-control`: with a mouse, click a control outside the select.
- `click-outside-field`: with a mouse, click into a text field outside the select, where the page has one.
- `tap-outside-control`: on a touchscreen, tap a control outside the select with one finger.
- `tap-outside-field`: on a touchscreen, tap into a text field outside the select, where the page has one.
- `click-on-select`: with a mouse, click the `<select>` element itself, the box that the popup opened from. This question has its own answers:
  - a: the popup stays open.
  - b: the popup closes.
  - c: the popup closes and opens again at once.

## Mouse wheel and touchpad scroll

"Acts on the page" means that the page scrolls.

- `wheel-outside`: turn the mouse wheel one notch outside the popup, over the page.
- `wheel-on-select`: turn the mouse wheel one notch over the `<select>` element itself.
- `wheel-inside-at-end`: scroll the list of the popup to its last option, then turn the wheel one more notch inside the popup. The select needs enough options that its list scrolls.
- `touchpad-outside`, `touchpad-on-select` and `touchpad-inside-at-end`: the same three questions with a two-finger scroll on the touchpad.

## One-finger swipe on a touchscreen

"Acts on the page" means that the page scrolls during the swipe.

- `swipe-outside`: swipe one finger over the page, outside the popup.
- `swipe-on-select`: start the swipe on the `<select>` element itself.
- `swipe-inside`: start the swipe on an option inside the popup, and move along the list.
- `swipe-outside-close-moment`: when did the popup close in `swipe-outside`? This question has its own answers:
  - a: when the finger touched down.
  - b: when the finger began to move.
  - c: when the finger lifted.
  - d: it did not close.
- `swipe-inside-close-moment`: when did the popup close in `swipe-inside`? This question has its own answers:
  - a: when the finger touched down.
  - b: when the finger began to move, still inside the popup.
  - c: when the finger left the popup.
  - d: when the finger lifted.
  - e: it did not close.
- `swipe-inside-highlight`: during `swipe-inside`, did the highlighted option follow the finger? This question has its own answers:
  - a: yes.
  - b: no.
- `swipe-inside-lift`: at the end of `swipe-inside`, lift the finger inside the popup. This question has its own answers:
  - a: the highlighted option is chosen, and the popup closes.
  - b: nothing is chosen, and the popup stays open.
  - c: nothing is chosen, and the popup closes.
- `swipe-inside-lift-outside`: start the swipe inside the popup, move the finger out of the popup, and lift it there. This question has the answers of `swipe-inside-lift`.

## Two-finger zoom

"Acts on the page" means that the page zooms.

- `pinch-outside`: pinch two fingers outside the popup, on a touchscreen or a touchpad.
- `pinch-on-select`: pinch on the `<select>` element itself.
- `pinch-inside`: pinch inside the popup.
- `ctrl-wheel-outside`, `ctrl-wheel-on-select` and `ctrl-wheel-inside`: hold Ctrl and turn the mouse wheel one notch outside the popup, over the `<select>` element, and inside the popup.
- `pinch-first-finger-alone`: on a touchscreen, put one finger down and wait a second. Then put a second finger down, and pinch. Answer once for each of the three places of the first finger: outside the popup, on the `<select>` element, and inside the popup. When did the popup close? This question has its own answers:
  - a: when the first finger touched down.
  - b: when the second finger touched down.
  - c: when the fingers moved.
  - d: it did not close.

## A page that is already zoomed

- `zoomed-repeat`: zoom the page in with two fingers first, and leave it zoomed. Then answer again the wheel, touchpad, swipe and pinch questions that the device can answer. This question has its own answers:
  - a: every answer is the same as on a page that is not zoomed.
  - b: some answers change; the owner names them.

## Mouse drag

Each question here has its own answers.

- `drag-from-select`: while the popup is closed, press the mouse button on the `<select>` element. Drag into the popup while you hold the button, and release on an option.
  - a: the option is chosen, and the popup closes.
  - b: nothing is chosen, and the popup stays open.
  - c: the popup did not open at the press.
- `drag-inside-highlight`: with the popup open, press on an option, and drag along the list while you hold the button. Did the highlighted option follow the pointer?
  - a: yes.
  - b: no.
- `drag-inside-release`: at the end of `drag-inside-highlight`, release the button inside the popup.
  - a: the highlighted option is chosen, and the popup closes.
  - b: nothing is chosen, and the popup stays open.
  - c: nothing is chosen, and the popup closes.
- `drag-out-and-release`: with the popup open, press on an option, drag outside the popup, and release there.
  - a: nothing is chosen, and the popup stays open.
  - b: nothing is chosen, and the popup closes.
  - c: the option is chosen.
- `drag-release-on-select`: with the popup open, press on an option, drag onto the `<select>` element, and release there. This question has the answers of `drag-out-and-release`.

## Rows opened by a touch

- `touch-open-row-height`: open the popup with a tap, and close it. Then open it with a mouse click or a touchpad click. This question has its own answers:
  - a: the rows are taller after the tap.
  - b: the rows look the same.

## Open questions by platform

For each platform, these questions have no answer in the record yet. The last section of the record lists the gaps of the answers that it holds.

- Windows 11, in Chrome and Firefox:
  - Every click and tap question, `click-on-select` included. The `behaviorOfOutsideClick` of the Chromium and Firefox presets comes from the source code alone.
  - `wheel-inside-at-end`, the three Ctrl questions, `pinch-first-finger-alone` and `zoomed-repeat`.
  - The touchpad questions in Chrome, and `touchpad-on-select` and `touchpad-inside-at-end` in Firefox.
  - The pinch questions on a touchpad. The record holds the pinch on a touchscreen only.
  - `pinch-on-select` in Chrome, and every mouse drag question in each.
  - `touch-open-row-height` in Firefox. The record of Firefox names no operating system.
- Windows 11, in Edge: every question. No record covers Edge.
- macOS, in Safari:
  - Every click question, `click-on-select` included. The `behaviorOfOutsideClick` of the Safari preset is an inference.
  - The three Ctrl questions, `zoomed-repeat` and every mouse drag question.
- macOS, in Chrome and Firefox: every question. No preset covers them yet.
- Linux, in Chromium, Firefox and WebKit:
  - `click-outside-field` and `click-on-select`. For `click-outside-control`, the owner's test found the answer c in all three.
  - `wheel-inside-at-end`, the touchpad scroll questions, the three Ctrl questions and `zoomed-repeat`.
  - Every touchscreen question. The owner has not tested a touchscreen on Linux yet.
  - `drag-inside-highlight` and `drag-inside-release` in Chromium and Firefox. The record does not say whether its drag started with a press on an option.
  - In WebKit, `wheel-on-select`, the pinch questions and every mouse drag question.
  - In Chromium, whether the page zooms in `pinch-on-select`; the record says only that the popup closes.
- Android and iOS: every question. No record covers them.

## For the agent: from the answers to the presets

- Record each sitting in `native-select-scrolling.md`, with the browser, the versions and the input device, in the owner's terms, and update the open questions above.
- Only a question with the four shared answers decides a value. A question with its own answers is evidence, which the agent reports to the owner.
- `click-outside-control`, `click-outside-field`, `tap-outside-control` and `tap-outside-field` decide `behaviorOfOutsideClick`: c is `'block'`, and d is `'pass-through'`. No value copies a or b.
- The wheel, touchpad and swipe questions with the shared answers decide `behaviorOfScrollGestureFn`, for the kinds `'wheel'`, `'touch-start'` and `'touch-drag'`:
  - a is `'leave-popup-open-and-block-page-scroll'`, b is `'leave-popup-open-and-allow-page-scroll'`, c is `'close-popup-and-block-page-scroll'`, and d is `'close-popup-and-allow-page-scroll'`.
  - Outside the popup is the zone `'outside'`, the `<select>` element is the zone `'trigger'`, and inside the popup is the zone `'popup'`.
  - The close moment of a swipe says which kind its answer belongs to: a close at the touch-down is a `'touch-start'` answer, and a close when the finger begins to move is a `'touch-drag'` answer.
  - A close when the finger leaves the popup, or when it lifts, needs what a gesture does not carry: the place of the finger, or the kind `'touch-end'`, which the library does not send yet. No preset can copy such a close, so the answer is evidence for the drag behaviors of `TODO.md`.
- The pinch and Ctrl questions decide `behaviorOfZoomGestureFn`: a is `'leave-popup-open-and-block-page-zoom'`, b is `'leave-popup-open-and-allow-page-zoom'`, c is `'close-popup-and-block-page-zoom'`, and d is `'close-popup-and-allow-page-zoom'`.
  - On a touchscreen, a pinch answer decides the zoom value only if the popup stayed open until the second finger touched down, the answer b or later of `pinch-first-finger-alone` for that place. If the first finger closed the popup, the answer a, the close is a `'touch-start'` answer of `behaviorOfScrollGestureFn` instead, and the zoom setting was never asked.
  - A pinch on a touchpad and Ctrl with the mouse wheel decide the zoom value directly.
  - The Ctrl questions also answer an open question of the zoom presets (NEEDS-VERIFICATION-941).
- The questions with their own answers:
  - `click-on-select` concerns the click on the trigger, which no setting decides.
  - `swipe-inside-highlight`, `swipe-inside-lift`, `swipe-inside-lift-outside` and the mouse drag questions are evidence for the drag behaviors of `TODO.md`.
  - `pinch-first-finger-alone` answers an open question of the zoom presets (NEEDS-VERIFICATION-940), and says which setting each pinch answer belongs to.
  - `zoomed-repeat` checks what the owner's ruling on zoomed pages expects: that the native select acts the same on a zoomed page (MEDIUM-939 in `FIXME.md`).
  - `touch-open-row-height` follows an abandoned plan, `ABANDONED_PLAN_MOBILE_NATIVE_SIMULATION.md`, so no preset follows it.
- A preset changes only after the owner's answers for its platform, and the change goes through the review rules of `CLAUDE.md`.
- When the answers show that one setting cannot copy a platform, such as a mouse click that goes through while a tap does not, report it to the owner with options instead of choosing one.
