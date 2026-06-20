# Item rendering - brainstorming notes

**Status: brainstorming paused here.** The conclusions below are
*leanings*, not locked decisions. No API, naming, ctx shape, or implementation
is chosen. Nothing is locked until it reaches `DESIGN.md` + code. This file is
the record of how we got here, split into: what we lean toward, what we
deliberately decided NOT to do, and what is still open.

## The question

llselect's item content today has only two ends: `itemToString` (plain text)
and a `createItemEl` subclass override (take over the whole `role="option"`
element). Nothing in between for rich-but-structured content (icon, checkbox,
two-line). We paused before adding a render setting, to survey prior art and
find the underlying model first.

## What we surveyed

- Item/option *content* customization: Vanilla/jQuery (Select2, Tom Select,
  Choices, Selectize), React (Downshift, Headless UI, Ariakit, react-select,
  MUI), Web Components + Open UI native (Shoelace, Spectrum, `appearance:
  base-select` + `<selectedcontent>`).
- The `multiple` trigger specifically: how Select2 / Tom Select / react-select /
  MUI / Ant Design / headless libs show selected items in the control.

Distilled takeaways only; full per-library notes live in the conversation.

## Where we lean (leanings, not locked)

1. **Add an item-content renderer** (working name `renderItemContentFn`): the
   single source for an item's visual content, no subclass needed. Fills the gap
   in the existing `*Fn` family; invisible to anyone who does not use it.
2. **Fill a node, don't return a prop bag.** The library builds the
   `role="option"` shell and wires ARIA/events; the hook fills the content.
   React's prop-getters solve a constraint (can't hand over a live DOM node) that
   a vanilla library does not have.
3. **Return type encodes safety.** A returned string is inserted as
   `textContent` (does not parse markup - verified against XSS payloads in jsdom
   + DOM spec); a returned element is inserted as-is, caller owns it. No
   sanitizer needed on the text path; the DOMPurify warning shrinks to "only if
   you build a node with innerHTML yourself." (A mechanism fact, stated as such -
   not a guarantee about the whole app.)
4. **The text layer stays independent.** `itemToString` keeps owning accessible
   name + search haystack; rich rendering never replaces it.
5. **single trigger: lean toward projection (NOT decided).** The idea: the
   trigger would mirror the chosen item's rendering, with `renderTriggerContentFn`
   as the override. The user found this elegant, it has precedent
   (`<selectedcontent>`, react-select `meta.context`), and it costs nothing for
   callers who do not use rich items (projecting a text item is just text). But
   this is a leaning we like, not a decision - even the single case is not locked.

## single vs multiple: deliberately NOT unified

The biggest course-correction. We briefly pushed a symmetric model where single
and multiple were "the same thing at different cardinalities." We dropped it: **a
scalar selection and a set selection are different worlds, and forcing them into
one model is over-engineering.**

- **single** leans toward projection (above) - liked, not decided.
- **multiple does NOT project.** It follows the cross-ecosystem norm: the library
  provides the chip/tag shell (including the remove button), and a hook (the
  existing `renderTriggerContentFn`) decides the chip content / layout. No
  "project the whole item rendering into the trigger."

Grounding fact: across Select2, Tom Select, react-select, MUI, Ant Design,
**essentially none render the multiple trigger by projecting the full item
rendering.** The shared shape is "library owns the chip shell + remove button;
you decide what goes inside." The multiple trigger breaks into orthogonal
choices, not one knob:

- unit: chips/tags (dominant) vs a text summary ("3 selected");
- per-chip content source (their `templateSelection` / `MultiValue` / etc.);
- remove button: library-provided by default;
- overflow: list all (Select2 / react-select default) vs cap + "+N"
  (MUI `limitTags`, Ant `maxTagCount`);
- ordering / drag: rare.

Note: native `<select multiple>` has no "trigger" at all (it is an expanded
listbox), and Open UI's customizable select excludes multiple - so there is no
native paradigm to mirror here. That is exactly why single had `<selectedcontent>`
to borrow and multiple did not.

## Where this risks over-engineering (honest read)

- **Forcing `multiple` to project** (now dropped, above) - the rejected symmetry.
- **Over-trusting the two-axis frame** (appendix): descriptive value high,
  new-design value low and concentrated in projection.
- **(Future) ctx completeness**, esp. search-match highlighting (ctx carrying
  matched ranges) - sounds complete, rarely used.
- **(Future) a third escape hatch** (`decorateItemFn`) on top of the content
  renderer + `createItemEl` subclass - two overlapping paths are enough.

## Still open

- **Whether the `single` trigger adopts projection at all** - liked (see above),
  but not a locked decision.
- **`multiple` trigger's sensible default layout** - chips? a summary? built-in
  overflow / "+N" or not? This is the main thing left unresolved.
- Named slots (icon / description) vs one free-form item-content hook.
- All implementation: API shape, ctx fields, naming, and whether the content
  renderer ships in the sketched form.
- Escape-hatch shape: keep `createItemEl` as the deep override (current leaning)
  vs adding `decorateItemFn`.
- (Out of scope; tracked in `TODO.md`) `onChange` diff context.

## Appendix: the two-axis frame (a thinking record, not a spec)

While reasoning we used a frame: Axis A = how one item is drawn (one source,
reused everywhere); Axis B = which container holds a set of items (the list vs
the trigger) and how it lays them out. It is a clean lens for "list and trigger
reuse the same item rendering," and it is what suggested single-trigger
projection. But it is mostly *descriptive* (it re-describes the existing `*Fn`s),
and its only *new* derived behavior is projection - so we keep it as a record,
not as something to implement against, and we do not promote it into the user
docs.

## Sources / verification

Checked against current official docs / source around 2026 (library template /
render / tags APIs as named above; `textContent` non-parsing verified in jsdom +
DOM spec). API names are solid; exact per-library defaults and version drift were
not all re-confirmed. The customizable-native-select area is fast-moving and only
partially shipped across browsers as of 2026.
