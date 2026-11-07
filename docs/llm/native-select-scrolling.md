# Native select: scrolling and dragging while the popup is open

Agent-facing record of the owner's hand tests of the browser's native `<select>`: what the native control does with a mouse wheel, with a touch swipe, with a mouse drag and with a two-finger zoom while its popup is open. It is the evidence behind the scroll gesture behavior that the owner ruled and the agent implemented, MEDIUM-795 in `FIXME.md`: the presets `behaviorPresetsOfFirefoxOnWindows`, `behaviorPresetsOfChromiumOnWindows` and `behaviorPresetsOfSafariOnMac` follow its rows on the wheel and on a touch outside the popup, and `DESIGN.md` "Scroll gestures while the popup is open" holds the contract. Its rows on a drag inside the popup, which the presets follow only in blocking the page scroll, feed the later drag behaviors in `TODO.md`. Its rows on a two-finger zoom are the owner's spec for the zoom answers of the presets, which `DESIGN.md` "Zoom gestures while the popup is open" holds.

How to read this record:

- Every observation is the owner's, from tests the owner made by hand. The agent translated the owner's report and organized it, and added nothing to the observations. The last section, on the gaps, is the agent's note.
- "The popup" is the native control's dropdown list.
- "The `<select>` element" is the control's own box on the page, the box the popup opens from.
- "The active item" is the highlighted row of the popup, the same highlight a mouse hover over an item shows.
- "A mouse drag" is moving the mouse while its button is held down.

## Mouse wheel inside the popup

- The owner's first report, which named no operating system and no browser: while the popup of a native `<select>` is open, wheeling inside the popup never scrolls the page, however hard the wheel turns.

### macOS, Safari

The owner tested Safari on macOS with a mouse wheel and with a two-finger scroll on the touchpad, and answered the agent's multiple-choice questions; the results of the two were the same.

- With the options long enough that the popup scrolls, the owner scrolled inside the popup to the top or the bottom of the list, and picked the answer, translated from Chinese: "the page does not move: after the list reaches its end, the page still does not move at all".

## Mouse wheel outside the popup

The owner found that the native control differs here by operating system; the owner's rows also differ by browser.

### Linux, on Wayland

- Firefox blocks the page from scrolling by mouse wheel completely, and the popup stays open.
- WebKit behaves the same as Firefox.
- Chromium closes the popup the moment the wheel turns outside the popup.
  - At that moment Chromium also blocks the scroll outside, so the page stays where it was.
  - After that the popup is closed, so what follows is the behavior of a closed native `<select>`.

### Windows 11, with a mouse

- Firefox blocks the page from scrolling by mouse wheel completely, and the popup stays open.
- Chromium closes the popup the moment the wheel turns outside the popup, and at that moment the page scrolls in the wheel's direction.

### Windows 11, with a touchpad

The owner found that Firefox treats a two-finger scroll on the touchpad differently from its mouse wheel, in the owner's words, translated from Chinese: "wow, I just found a super subtle difference: with the popup open, outside the popup, a touchpad scroll and a mouse scroll behave differently in Firefox for Windows... but I think we treat this one as LOW PRIORITY? Otherwise, can a web API even detect this kind of difference..."

- Firefox closes the popup at a two-finger scroll on the touchpad outside the popup, and at that moment the page does not scroll. The owner picked this among the agent's options, translated: "closes, the page does not move: the popup closes at once, but the page does not scroll this time".

### macOS, Safari

- From the owner's answers to the agent's multiple-choice questions, with a mouse wheel and with a two-finger scroll on the touchpad alike: the owner picked, translated from Chinese, "does not close, the page does not move: the popup stays open, and the page does not scroll at all".

## Touch swipe

### Windows 11, on a touchscreen

Firefox:

- A swipe outside the popup:
  - Firefox closes the popup the moment the finger touches down.
  - Firefox blocks the swipe from going on to scroll anything outside. From that touch-down until the finger lifts, no other part of the page scrolls.
- A swipe inside the popup:
  - The swipe does not affect the active item at all.
  - The moment the swipe moves beyond the popup, Firefox closes the popup.
  - Firefox blocks the swipe from going on to scroll. From that touch-down until the finger lifts, the whole page does not scroll.
  - Once a swipe has started, lifting the finger does not affect the active item, chooses nothing, and does not scroll the page behind at all. This holds whether the finger lifts outside or inside the popup.

Chromium:

- A swipe that starts directly outside the popup:
  - Chromium closes the popup the moment the finger touches down.
  - The swipe at once scrolls the place where the finger touched down.
- A swipe inside the popup:
  - The swipe does affect the active item.
  - When the swipe moves beyond the popup, the active item stays in its last state from just before the finger left the popup's area, until the finger comes back.
  - If the finger then lifts outside the popup, the popup stays open, unchanged.
  - If the finger then lifts inside the popup, the lift counts as choosing the active item, and the popup closes.
  - From start to end, Chromium blocks the swipe from scrolling anything outside. From that touch-down until the finger lifts, the whole page does not scroll.

### Linux, on a touchscreen

- The owner has not yet tested the desktop browsers on Linux with a touchscreen.

## Mouse wheel or swipe on the `<select>` element itself

The owner's later test: one notch of the mouse wheel on the native `<select>` element itself, while its popup is open. For the touchscreen, the owner compared the result with a swipe outside the popup. In every case the owner reported, the browser treats the `<select>` element as it treats the outside of the popup.

### Linux desktop, on Wayland

- Chromium behaves the same as for a wheel outside the popup: it closes the popup at once, and the page behind does not scroll.
- Firefox behaves the same as for a wheel outside the popup: nothing moves at all.

### Windows, with a mouse

- Chromium behaves the same as for a wheel outside the popup.
- Firefox behaves the same as for a wheel outside the popup.

### Windows, on a touchscreen

- Chromium behaves the same as for a swipe outside the popup.
- Firefox behaves the same as for a swipe outside the popup.

### macOS, Safari

- With the pointer on the `<select>` element itself, by mouse wheel and by a two-finger scroll on the touchpad alike, the owner picked the same answer as outside the popup: the popup stays open, and the page does not scroll at all.

## Mouse drag inside the popup

### Linux

Firefox:

- A mouse drag inside the popup changes the active item.
- Releasing the button inside the popup closes the popup and chooses the active item.
- While the drag is outside the popup, the last active item does not change at all.
- Releasing the button outside the popup does nothing: nothing is chosen, and the popup stays open.
- Releasing it on the `<select>` element itself does not close the popup either.

Chromium behaves exactly as Firefox does here.

## Press on the `<select>` element, drag, release

### Linux

- Firefox and Chromium both support the behavior of early macOS: press the mouse button on the `<select>` element, drag into the popup while holding it, and release on an item. The release chooses that item.
- Releasing outside the popup chooses nothing, and the popup does not close by itself.
- The two browsers behave the same.

## Two-finger zoom

### Linux, with a touchpad, and Windows, on a touchscreen

The owner tested the desktop versions of both browsers, on Linux with a touchpad and on Windows on a touchscreen, and reported one set of results.

- In both browsers, the popup's options do not zoom: after a two-finger zoom of the page, the `<option>` elements keep their size.

Firefox:

- While the popup is open, Firefox blocks the two-finger zoom. Two fingers inside the popup, outside the popup or on the `<select>` element have no effect.
- The popup stays open.

Chromium:

- Two fingers outside the popup: Chromium first closes the popup, then at once zooms the page with the fingers.
- Two fingers inside the popup: Chromium blocks the zoom. Only outside the popup does the gesture close the popup.
- Two fingers on the `<select>` element, on Linux with a touchpad: Chromium at once closes the popup.

### macOS, Safari

The owner reported, in the owner's words, translated from Chinese: "in macOS Safari, while the popup is open, a two-finger zoom, whether on the page, on the popup or on the select, does not work at all, and the popup does not close because of it either".

- While the popup is open, Safari blocks the two-finger zoom everywhere: on the page, inside the popup and on the `<select>` element.
- The popup stays open.

### llselect, for comparison

- The owner compares llselect's popup, which is part of the page: a two-finger zoom enlarges its options with the page, so llselect does better than the native popup here.
- The presets copy the rows above through `zoomGestureToBehaviorFn`; `DESIGN.md` "Zoom gestures while the popup is open" has the details and the open first-finger question.

## Mouse and touch differ

- The owner notes that Chromium's drag behavior differs again, and that a mouse and a touch behave differently in two places: a drag after pressing an item, and a release on an item or outside the popup.

## Browser versions

- The owner gave the versions as Firefox 156 and Chromium 154, in the same report as the test of the `<select>` element itself.

## Gaps, noted by the agent

- No observation covers Android or iOS. For macOS, the record holds Safari only: the wheel and the touchpad scroll inside the popup, outside it and on the `<select>` element, and the two-finger zoom.
- For the mouse wheel inside the popup, the record holds the owner's first report, which named no operating system and no browser, and the Safari row on macOS.
- The owner stated the test of the `<select>` element itself as one notch of the mouse wheel. For the Windows touchscreen the owner named only the behavior the result matches, a swipe outside the popup, so the gesture on the `<select>` element there is the agent's reading.
- The test of the `<select>` element itself names Chromium and Firefox on Linux and on Windows, and Safari on macOS; it holds no result for WebKit on Linux.
- That test names Windows without a version, while the earlier tests name Windows 11.
- The record does not say whether the earlier tests used the same browser versions, and it names no WebKit version.
- The mouse-drag tests name Linux without Wayland or X11, give no browser versions, and hold no WebKit result and no Windows result.
- The mouse-drag tests do not say whether the drag inside the popup started with a press on an item.
- The two-finger zoom test gives no browser versions and no Windows version.
- For two fingers on the `<select>` element, the record holds Chromium on Linux with a touchpad only, and does not say whether the page then zooms.
- The two-finger zoom test does not say whether a page that was already zoomed behaves differently.
- The Safari tests give no Safari or macOS version. The wheel answers were picked from the agent's options, not described freely.
- The touchpad row on Windows names Firefox only, outside the popup only, and gives no version.
- No test says whether the native select treats a wheel or a one-finger touch differently on a pinch-zoomed page. The owner's ruling of MEDIUM-939 expects it to act the same.
