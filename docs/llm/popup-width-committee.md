# Committee: the fit-content popup width, rounded to the nearest pixel

Agent-facing record of the committee convened on an owner report: with `popupWidthPolicy: 'fit-content'` the popup could be up to half a pixel narrower than its content, so CJK text wrapped between characters. The decision, the measurements and the reasons live here; `FIXME.md` has the entry (MEDIUM-704) and `DESIGN.md` "Popup width policy" points here.

## The report and the facts verified

- The owner's page: the vanilla theme, a 15-glyph CJK option, the trigger at its 14rem min-width. Chromium on Linux: the popup's max-content width is 249.375px; `measureNaturalWidth` read `offsetWidth`, 249; the popup got `width: 249px`; the option wrapped onto two lines. Reproduced in headless Chromium 153 against the current build with a CJK font installed: the same three numbers and two lines.
- Why the fraction: the row padding 2 x 0.7rem = 22.4px, the 2px popup border, and 15 glyphs at 15.2px (0.95rem).
- `offsetWidth` rounds to the nearest pixel (CSSOM View), so a fraction under .5 is lost. Latin text without spaces cannot wrap and overflows unseen; Latin text with a space near the end wraps at the space.
- The library forces `box-sizing: border-box` on the popup at construction (`src/base.ts`), so `offsetWidth`, `getBoundingClientRect().width` and the computed `width` all describe the same border box.
- No shipped theme transforms the popup; only the arrow rotates. A consumer's open animation may scale the popup.
- Measured in Chromium 153 on the open popup with `width: max-content` applied:

| state | computed `width` | `getBoundingClientRect().width` | `offsetWidth` |
|---|---|---|---|
| as opened | 249.375px | 249.375 | 249 |
| `transform: scale(0.95)` on the popup | 249.375px | 236.90625 | 249 |
| `left: 50.5px` | 249.375px | 249.375 | 249 |

- Cost, 2000 calls of each candidate on the open popup, every call forcing one layout: the current read 5 microseconds, every candidate 5 to 6. The forced layout is the cost; the read is not.

## The candidates

- A, the owner's proposal: `Math.ceil(el.getBoundingClientRect().width)`. Fixes the report. The rect includes transforms: a popup scaled to 0.95 while opening measures 236.9, the ceiling gives 237, and that inline width wraps the content for the whole open cycle.
- B: `el.offsetWidth + 1`. Never short (natural <= offsetWidth + 0.5), transform-free, but over-allocates up to 1.5px on every open, even for an integral width.
- F, the floating-ui pattern: `Math.round(rect) === el.offsetWidth ? Math.ceil(rect) : el.offsetWidth + 1`. Exact when nothing scales the box; a mismatch detects a scale and falls back to the integer plus one. A scale that leaves the rounded rect equal to `offsetWidth` slips through (Codex Astra); Chromium reads `offsetWidth` from pixel-snapped edges, so a fractional `left` could trip the guard without a transform, in the safe direction (Opus 5).
- G: `Math.ceil(parseFloat(getComputedStyle(el).width))`, falling back to `offsetWidth` when not numeric. The resolved `width` of a rendered element is its used value, the border box under `box-sizing: border-box`, unaffected by transforms. Two members doubted that engines at the browser floor report the border box there; Chromium 153 does (table above); Firefox 78 and Safari 14.1 could not be run here.
- H, chosen: G's measure with F's guard. `parseFloat(getComputedStyle(el).width)`; when finite and equal to `offsetWidth` after rounding, `Math.ceil` of it; otherwise `offsetWidth + 1`. Transform-free like G; an engine that reports the content box, a non-numeric value, or a pixel-snap mismatch all fall back to the integer plus one, which is never short.

## Positions and tally

- F: Sonnet 5, Opus 5, Opus 4.8. The failure direction is safe, jsdom can test it, and it assumes nothing about the computed width.
- G: Sonnet 4.6, Codex Sol, Codex Astra. Transform-free by construction; the guard only for a non-numeric value.
- A: nobody; all six named the transform risk. B: nobody.
- All six: `computePosition` and the style write stay as they are; `'match-trigger'` does not measure; the RTL branch right-aligns with the width and a ceiling only grows leftward; the viewport clamp absorbs the extra pixel; applying `max-content` with min and max would move the collision and RTL math into CSS and break the layout-free tests.
- All six: the height path (`offsetHeight`, `scrollHeight`, `clientHeight` in `createPositioner`) has the same rounding class, bounded by `maxHeight`: a borderline above / below flip or a sub-pixel gap at worst; not this fix (`TODO.md`).
- Opus 5: the F snippet in the brief lost the restore of the inline width; the restore stays in every variant.
- The agent (Fable 5) proposed H after the tally as the synthesis of the two camps; the post-fix review reads it.

## Decision

H, in `measureNaturalWidth` only. The owner's criteria: robust, and no performance cost, since performance is one of the project's points. H is the most robust of the five, since every known failure falls back to a width that is never short, at the same cost as before: one forced layout per reposition, plus a `getComputedStyle` read and a `parseFloat`, about a microsecond. The regression tests mock the computed width and `offsetWidth` (`test/positioning.test.ts`, the block "fit-content: the natural width is measured as a fractional border box"). The owner's page verified in headless Chromium 153 against the fixed build: 250px and one line, and the same with the popup scaled to 0.95 before opening.

## Follow-ups

- Manual, on Firefox 78 and Safari 14.1: confirm the computed `width` of the border-box popup is the border box; if an engine reports the content box, the guard falls back and the popup is up to 1.5px wider, still correct (`TODO.md` "Release readiness").
- The height rounding class, separately (`TODO.md` "Positioning precision").
- The existing `TODO.md` item "Cache the fit-content natural-width measurement" stands; this fix does not change how often the measure runs.
