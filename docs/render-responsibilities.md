# render*() responsibilities (refactor proposal)

> STATUS: DECIDED = (iii). Bodies stay as-is; `render*` is a DOM-touching exception
> (no Dom suffix) with a fixed docstring one-liner. (ii) is kept on file as a future
> experiment. Split out of `naming-conventions.md`; the two interact (render* is
> unsuffixed either way).

## The question

Should every `render*` method be a PURE orchestrator (only call lower-level helpers,
never touch the DOM itself), or is it allowed to write some DOM directly?

## Current bodies (audited line by line)

### Already pure orchestrators (call-only, no direct DOM)

- `renderTrigger` (base.ts:600): `renderTriggerContent()` + `renderTriggerArrow()`.
- `rerender` (base.ts:510, public): `renderTrigger()` + (if open) `renderPopupList()`.

### Mixed (call lower-level AND write DOM directly)

- `renderTriggerContent` base (632): `triggerContentEl.textContent = placeholder`.
- `renderTriggerContent` single (96): `setAttribute('data-empty')` + either
  `commitTriggerContentReturnedByRenderer(custom)` OR `triggerContentEl.textContent = ...`.
- `renderTriggerContent` multiple (150): `setAttribute('data-empty')` + either
  `commit...(custom)` OR `triggerContentEl.textContent = <count summary>`.
- `renderTriggerArrow` (636): `triggerArrowEl.replaceChildren()` + `appendChild(el)` where
  `el = renderArrowFn({isOpen})`.
- `renderPopupList` (649): `popupListEl.replaceChildren()` + loop `createItemEl()` +
  `append(el)` + `positioner.reposition()` + clamp `focusedIndex` + `syncFocusedIndexToDom()`.

So: 2 are already pure; 3 (`renderTriggerContent`, `renderTriggerArrow`, `renderPopupList`)
write some DOM directly.

## Options overview

- **(i) Keep mixed** -> by the mechanical rule render* would need `ToDom`, but the two pure
  orchestrators would not, so the family is inconsistent. REJECTED.
- **(ii) Refactor every render* to a pure orchestrator** -> extract each direct write into a
  primitive; render* carries no Dom suffix. Details in the table below.
- **(iii) Treat `render` as a high-level DOM verb on the exception list** -> bodies unchanged.
  RECOMMENDED. Full write-up in its own section below.

### (ii) detail

| render* | direct write today | becomes |
|---|---|---|
| `renderTriggerContent` x3 | `textContent = ...` + `setAttribute('data-empty')` | compute content (custom ?? default) -> `commitTriggerContentToDom(content)`; data-empty -> `syncEmptyStateToDom()` |
| `renderTriggerArrow` | `replaceChildren()` + `appendChild(el)` | compute arrow el -> NEW `commitTriggerArrowToDom(el|null)` |
| `renderPopupList` | `replaceChildren()` + `append(el)` loop | `createItemEl()` build -> NEW `commitItemElsToDom(els)` + existing `syncFocusedIndexToDom()` |

New low-level methods (ii) requires: `commitTriggerArrowToDom` (single caller),
`commitItemElsToDom` (single caller), `syncEmptyStateToDom` + an `isEmpty()` predicate
(two methods for one attribute).

## Option (iii) in full  -- RECOMMENDED

### Summary

`render*` is a high-level verb meaning "rebuild a container's DOM from current state". It is
allowed to touch the DOM directly, with NO Dom suffix, because (a) the verb's meaning is
single and unambiguous, and (b) it sits on an explicitly-listed exception set. Method bodies
are NOT refactored.

### Outline (how it works)

- The mechanical Dom-suffix rule still holds for the low-level primitives: a method that
  writes existing DOM carries `*ToDom` (content/state into a container) or `*ElInDom`
  (operate on an existing element).
- `render*` is exempt from that suffix, exactly as `open`/`close`/`toggle`/`focus*`/
  `attach*`/`detach*`/`capture*` already are. The exemption is written down, not guessed.
- A render* may freely call primitives (commit/sync/create) AND write a little DOM directly
  (textContent, replaceChildren, setAttribute). Its job is "produce the container's current
  visual state" by whatever mix is simplest.
- It stays distinguishable from the primitives by SHAPE, not only by the list: render* takes
  no content parameter and reads state; `commit*ToDom` takes the content; `sync*ToDom` mirrors
  one state field; `create*El` returns a detached element.

### Principles

1. **"Never guess" is achieved by EXPLICITNESS, not necessarily by ZERO exceptions.** A
   written-down exception list is looked up, not guessed, so it satisfies the no-guessing goal.
2. **A verb may carry meaning when it is single and unambiguous.** `render` = "rebuild a
   container's DOM from state" is precise (unlike `apply`/`handle`), and it does not collide
   with commit/sync/create, which are separated by parameter shape.
3. **Do not abstract for a single use.** Don't extract 2-3 line direct writes into helpers
   called exactly once just to keep render DOM-free.
4. **Don't let the naming rule reshape the architecture** (no tail-wags-dog). The layering
   concept (render high-level vs primitives low-level) is kept; it is not enforced by surgery.

### Rationale / trade-offs

- Cost: one explicitly-listed exception family (`render*`) that touches DOM without a suffix.
- Benefit: zero body refactor, zero new single-use primitives; the high-level / low-level
  layering is still expressed (render = high-level; `*ToDom`/`*ElInDom`/`*El` = primitives).
- vs (ii): (ii) buys "zero exceptions" with 3 single-use primitives + an `isEmpty` predicate
  (over-abstraction). (iii) buys "no over-abstraction" with one explicit exception.
- On "never guess" (iii) TIES (ii) (the exception is listed); on "don't over-abstract" (iii)
  WINS. Hence the recommendation.

### What actually changes under (iii)

- Method bodies: nothing.
- `naming-conventions.md`: list `render*` as a DOM-touching exception (no Dom suffix), next to
  open/close/focus/...; drop the earlier `render*ToDom` idea.
- render* renames: none from the Dom-suffix angle (their only proposed change was adding
  `ToDom`, which (iii) drops). They keep `renderTrigger` / `renderTriggerContent` /
  `renderTriggerArrow` / `renderPopupList`.

### Docstring rule for render* (under iii)

Every `render*` method's docstring opens with this fixed one-liner (swap `<X>` for trigger /
popup list / arrow slot):

> High-level render of `<X>`'s DOM from state; not a low-level `*ToDom`/`*El` primitive.

It labels render* as high-level at every call site - the thing an explicit exception (vs a
mechanical suffix) gives up - so the docstring carries that signal instead.

## Assessment

(ii) is "zero naming exceptions" but pays with single-use primitives (over-abstraction):
`renderTriggerArrow` is 5 plain lines and splitting it only adds an indirection hop to a
once-used helper; `data-empty` (one attribute) would spawn two methods. Only
`renderPopupList -> commitItemElsToDom` is borderline. The layering concept is right; forcing
every small direct write out to honor it is not worth it. (iii) keeps "never guess" via an
explicit exception and avoids the abstraction. Recommendation: (iii).

## Interaction with naming-conventions.md

- (ii): `render*` carries NO Dom suffix (pure orchestrator). Bodies change; +3 primitives.
- (iii): `render*` carries NO Dom suffix (exception list). Bodies unchanged; 0 new methods.
- (i): `render*` carries `ToDom`. Rejected.

Both viable options end with `render*` UNSUFFIXED, so naming can proceed on that assumption;
the only thing pending is whether bodies get refactored (ii) or not (iii).

## Decided

(iii). Bodies unchanged; `render*` joins the naming exception list (no Dom suffix) and gets
the fixed docstring one-liner above. (ii) stays documented as a future experiment: every
per-method extraction is listed, all new helpers are internal/protected (no public API
change), and the 183 tests cover the behavior, so splitting later is local and safe.
