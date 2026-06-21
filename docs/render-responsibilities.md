# render*() responsibilities

> STATUS: DECIDED = (ii). Every `render*` method is a PURE ORCHESTRATOR - it computes
> content/elements and calls the low-level primitives, and touches NO DOM directly. So each
> `render*` is unsuffixed AND genuinely DOM-free in its body. (iii) is recorded at the bottom
> as NOT TAKEN. Bodies are refactored when the renames land (see naming-conventions.md s6).

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
| `renderPopupList`                           | `replaceChildren()` + `append` loop          | `createItemEl()` xN + `commitItemElsToDom(els)`                |
| `renderTrigger`, `rerender`                 | already pure orchestrators                   | unchanged                                                      |

New primitives this adds: `commitArrowElToDom`, `commitItemElsToDom`, `syncEmptyStateToDom`,
`isEmpty` (signatures live in naming-conventions.md).

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
  const el = this.settings.renderArrowFn?.({ isOpen: this.isOpen }) ?? null
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

None here - `render*` responsibility is settled. The only naming still open is the
arrow/trigger render-prop SETTINGS (`renderArrowFn` / `renderTriggerContentFn`), tracked in
naming-conventions.md s4b.
