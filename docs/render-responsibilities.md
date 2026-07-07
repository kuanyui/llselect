# render*() responsibilities

> STATUS: APPLIED = (ii). Every `render*` method is a PURE ORCHESTRATOR - it computes
> content/elements and calls the low-level primitives, and touches NO DOM directly. So each
> `render*` is unsuffixed AND genuinely DOM-free in its body. (iii) is recorded at the bottom
> as NOT TAKEN. Bodies refactored in src/ (base + single + multiple); npm test green (182).
>
> Phase 10 update: `renderPopupList` now composes `computePopupSegments` +
> `commitPopupSegmentsToDom` (group containers); `commitItemElsToDom` was superseded and no
> longer exists. The (ii) model itself is unchanged. Code samples below are the decision-time
> record (pre-Phase-10, pre-s4a setting names); do not copy them as current API.

## The decision (ii)

`render*` = pure orchestrator: compute, then call primitives
(`create*El` / `commit*ToDom` / `sync*ToDom` / `replace*ElInDom`); never write DOM in the
`render*` body itself. Payoff: "see `render*` -> orchestrator, does not touch DOM; see a Dom
suffix -> that is the actual write" - knowable from the name, without reading the body.

## Per-method refactor (names UNCHANGED, bodies change)

| render*                                     | direct DOM write today                       | after: calls                                                   |
| ------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `renderTriggerContent` (base + 2 overrides) | `textContent` + `setAttribute('data-empty')` | `commitTriggerContentToDom(content)` + `syncEmptyStateToDom()` |
| `renderTriggerArrow`                        | `replaceChildren()` + `appendChild(el)`      | `commitArrowElToDom(el)`                                       |
| `renderPopupList`                           | `replaceChildren()` + `append` loop          | `createItemEl()` xN + `commitItemElsToDom(els)` (Phase 10: -> `computePopupSegments` + `commitPopupSegmentsToDom`) |
| `renderTrigger`, `rerender`                 | already pure orchestrators                   | unchanged                                                      |

New primitives this adds: `commitArrowElToDom`, `commitItemElsToDom` (superseded in Phase 10
by `commitPopupSegmentsToDom`), `syncEmptyStateToDom`, `isEmpty` (signatures live in
naming-conventions.md).

## before / after

```ts
// renderTriggerArrow - BEFORE
private renderTriggerArrow(): void {
  this.triggerArrowEl.replaceChildren()
  const renderer = this.settings.renderArrowFn
  if (!renderer) { return }
  const el = renderer({ isOpen: this.isOpen })
  if (el) { this.triggerArrowEl.appendChild(el) }
}
// AFTER
private renderTriggerArrow(): void {
  const el = this.settings.createArrowElFn?.({ isOpen: this.isOpen }) ?? null
  this.commitArrowElToDom(el)
}
private commitArrowElToDom(el: HTMLElement | SVGElement | null): void {
  this.triggerArrowEl.replaceChildren()
  if (el) { this.triggerArrowEl.appendChild(el) }
}
```

```ts
// renderPopupList - AFTER
protected renderPopupList(): void {
  const list = this.getVisibleItems()
  const els = list.map((item, i) => this.createItemEl(item, i))
  this.itemEls = els
  this.focusedEl = undefined
  this.commitItemElsToDom(els)
  this.positioner?.reposition()
  if (this.focusedIndex >= list.length) { this.focusedIndex = list.length === 0 ? -1 : list.length - 1 }
  this.syncFocusedIndexToDom()
}
private commitItemElsToDom(els: HTMLElement[]): void {
  this.popupListEl.replaceChildren(...els)
}
```

## docstring rule for render*

Every `render*` opens with:
> Orchestrator: composes the `*ToDom` / `*El` primitives to (re)build `<X>` from state; touches no DOM directly.

## (iii) - NOT TAKEN (kept for reference)

(iii) left `render*` bodies mixed (writing some DOM directly) and listed `render*` as a
DOM-touching exception with no Dom suffix. Rejected once "explicit > simplicity" was locked
(CLAUDE.md s5): (ii)'s layering is knowable from names alone (`render` = orchestrator,
`*ToDom`/`*El` = the writes), whereas (iii) makes you read each body to see how much DOM it
touches. The cost (~4 small, mostly single-use primitives) is precise structure, not
over-abstraction, under that priority.

## Open

None - `render*` responsibility is settled, and the arrow / trigger settings shipped renamed
as `createArrowElFn` / `createTriggerContentElFn` (naming-conventions.md s4a/s4b, both DONE).
