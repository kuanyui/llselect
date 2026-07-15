# llselect - low-level select

A JavaScript library that replaces the native HTML `<select>` element.

llselect is not meant to be a full-bundle select (like `select2.js`). It is a
minimal but flexible implementation of `<select>` in JavaScript that you can
easily wrap and integrate into your existing UI library / framework / style.

## Features

- Lazy rendering: the item-list DOM is built only when the popup opens.
- Does not rely on a native `<select>` to store data: use `number` or any JS
  value as the data model directly, without type-casting hell.
- Native TypeScript support.
- Customizable HTML renderer functions.
- Search input with IME-aware filtering.
- ARIA combobox keyboard / focus model built in (see
  [docs/A11Y.md](https://gitlab.com/kuanyui/llselect/-/blob/master/docs/A11Y.md)).

Browser support floor: Firefox 78+, Chrome/Edge 87+, Safari 14.1+. No
polyfills or legacy-browser workarounds are included.

## Install

```sh
npm install llselect
```

## Quick start

```js
import { LLSelectSingle, LLSelectMultiple } from 'llselect'
import 'llselect/themes/vanilla.css' // optional: any shipped theme, or bring your own CSS

const sel = new LLSelectSingle(document.querySelector('#mount'), {
  ariaLabel: 'Fruit', // accessible name (or ariaLabelledBy: id of your visible label) - always set one
  placeholder: 'Pick a fruit',
  onChange: (item, previousItem) => console.log(item),
})
sel.setItems(['Apple', 'Banana', 'Cherry'])
```

Multi select: `new LLSelectMultiple(el, { ... })` - `getChosenItems()` /
`toggleItem()` / `triggerDisplay: 'tags'` / `selectAllRow: true` and friends.

Language packs (optional, tree-shakeable pure data):

```js
import { zhTW } from 'llselect/i18n'
new LLSelectSingle(el, { texts: zhTW })
```

No build tool? The UMD bundle exposes `window.llselect`
(`<script src="https://unpkg.com/llselect"></script>`), themes via `<link>`.

## What llselect deliberately does NOT do

These are integration boundaries, not bugs. Plan for them up front:

- **No native form integration.** llselect renders plain `div`s, not a form
  control: nothing is submitted with a `<form>`, and `name`/value
  serialization, form reset, constraint validation (`required` etc.), and
  `<label for>` association do not apply. Name the field through the
  `ariaLabel` / `ariaLabelledBy` setting, and mirror the selection into your
  own form state (or a hidden input) yourself:

  ```js
  const hidden = document.querySelector('input[name="fruit"]')
  const sel = new LLSelectSingle(mountEl, {
    ariaLabelledBy: 'fruit-label',
    onChange: (item) => { hidden.value = item ?? '' },
  })
  ```

- **No HTML parsing of your data - and therefore no sanitizer.** Item strings
  and trigger text are assigned via `textContent`, never parsed as HTML. An
  XSS risk appears only when your own render callbacks
  (`createItemContentElFn` and friends) parse untrusted markup (e.g. via
  `innerHTML`); sanitize that markup first (e.g. with DOMPurify, or the
  browser's native Sanitizer API) - llselect does not do it for you.
- **No asynchronous data-fetching API.** Fetch however you like, then call
  `setItems(...)`.
- **No virtual scrolling.** llselect is a `<select>` replacement, not a data
  grid.
- **No alphabetic prefix typeahead** (the native `<select>` behavior) - it is
  unusable for East Asian languages and IME input. Use the `searchable`
  option instead.
- **No official React / Vue / Angular wrapper - on purpose.** A good wrapper is
  inseparable from choices only your project can make. llselect is generic over
  your item type `T` (`LLSelectSingle<T>`), so how your model objects are shaped,
  keyed and compared, and how `onChange` flows back into your state (Pinia,
  Redux, signals, a form library), depend on your schema and your performance
  budget. A one-size wrapper would have to pick a `T` and a sync strategy for
  everyone - wrong for someone - and a thorough one (typed generics, slot /
  render-prop bridging for custom trigger / item / tag content) would lag every
  framework's API churn. So llselect ships the library and the CSS themes and
  leaves the small, stable binding to you: create the instance in your mount
  hook, push state in with `setItems` / `setChosenItem(s)`, read it back through
  `onChange`, and `destroy()` on unmount. The Quick start above is the whole
  pattern; it ports to any framework in ~15 lines.
- **You must call `destroy()`** when unmounting (e.g. in a framework
  wrapper): it removes the document / window listeners the instance owns.

## Capabilities overview

| Capability | Entry points |
|---|---|
| Search box + custom matching | `searchable` (bool or predicate), `filterFn` |
| Accessible field naming (required) | `ariaLabel` / `ariaLabelledBy` |
| Disabling - whole control / per item | `setDisabled()`, `focusableWhenDisabled`, `itemDisabledFn` |
| Grouping (optgroup) | `itemToGroupKeyFn`, `groupKeyToLabelFn`, `groupDisabledFn` |
| Multiple selection | `LLSelectMultiple`: `toggleItem()`, `getChosenItems()`, `selectAllRow`, `triggerDisplay: 'count' \| 'tags'`, `clearable` |
| Popup width | `popupWidthPolicy: 'match-trigger' \| 'fit-content'` |
| Rich rendering without subclassing | `createItemContentElFn`, `createTriggerContentElFn`, `createTagContentElFn`, ... |
| i18n | `texts` setting + `llselect/i18n` packs (en / ja / zh-TW / ar / he), RTL inherited from `dir` |
| Lifecycle | `destroy()` (required on unmount), `rerender()`, `setItems()` |
| Events | `onChange(current, previous)`, `onOpen`, `onClose` |

Full contracts:
[docs/DESIGN.md](https://gitlab.com/kuanyui/llselect/-/blob/master/docs/DESIGN.md)
(API / architecture) and
[docs/A11Y.md](https://gitlab.com/kuanyui/llselect/-/blob/master/docs/A11Y.md)
(keyboard / focus / ARIA). The TypeScript declarations shipped in the package
document every setting inline.

## Customization: settings or subclassing?

Rule of thumb: **settings configure one instance; subclassing extends the library.**

Quick test: "Am I making a new, named, reusable kind of select?"

- No, I just want this one dropdown to look / behave some way -> **settings**.
- Yes -> **subclass**.

### Settings (the common path - no subclass needed)

| You want to customize | Setting |
|---|---|
| Item display text | `itemToStringFn` |
| Trigger content (e.g. tag chips) | `createTriggerContentElFn` |
| Disable individual items | `itemDisabledFn` |
| Search matching | `filterFn` |
| Equality for object items | `compareFn` |
| Dropdown arrow | `createTriggerArrowContentElFn` |
| Events | `onChange`, `onOpen`, `onClose` |

```js
const sel = new LLSelectSingle(el, {
  itemToStringFn: (u) => `#${u.id} ${u.name}`,
  itemDisabledFn: (u) => !u.active,
  onChange: (u) => console.log('chosen:', u),
})
```

### Subclassing (extending the library)

Subclass only when settings cannot express it:

1. **A new select kind** - new public API / state / interaction (e.g. a TreeSelect).
2. **A framework wrapper** - e.g. `class VueLLSelect extends LLSelectSingle` for lifecycle glue (call `destroy()` on unmount). This is the main reason llselect is "low-level".
3. **Core behavior with no setting** - e.g. replace `onItemActivated` semantics, or take full control of the item element via `createItemEl` (rich HTML, icons).

How the two layers coexist: every customization point is a `protected` method
whose default reads its `*Fn` setting. Overriding the method replaces that
default - your override wins, plain OO, no hidden precedence. Rationale:
[docs/DESIGN.md](https://gitlab.com/kuanyui/llselect/-/blob/master/docs/DESIGN.md).

## Design principles

1. Minimal - no external JS / CSS dependency. Auditable.
2. Performance - lazy popup rendering, and a single-item selection change
   replaces just the one affected option node in the popup list instead of
   rebuilding every row (the list update is O(1) in list size). The trigger is
   refreshed too; its cost depends on `triggerDisplay` (`count` is constant,
   `tags` rebuilds one chip per chosen item).
3. Flexible
   - Easy to integrate into an existing project / library / style.
   - Settings configure one instance; subclassing extends the library. (See "Customization" above.)
4. Explicit
   - Explicit is better than implicit - API names are long, but hold no surprise or ambiguity.
   - Single-select and multiple-select are separate classes, avoiding ambiguous / over-abstracted APIs (e.g. one `T[]` modeling both modes).
   - Improves some UI/UX anti-patterns of the legacy `<select>` (e.g. `aria-disabled` instead of native `disabled`, so a disabled control still receives hover events and can show a "why is this disabled" tooltip).

## Acknowledgment

I have had this idea since 2024 and wrote some drafts for it, but I had no
time to implement it, so the draft was abandoned.

Now, with Claude Code, I am trying to finish it.

### LLM Disclosures

This project heavily relies on LLM agents. More than 99% of the working code
was written directly by an LLM.

#### So you are just a fucking idiot vibe coder? what on Earth were you responsible for in this project, if LLM has done so much?

1. I review all modifications via `git diff` before `git commit`, as much as
   I can, to avoid obvious anti-patterns and bad-smelling code.
2. I
   - correct unreasonable APIs according to my development experience, trying
     to avoid the painful APIs and anti-patterns common among existing select
     UI component libraries,
   - make the technical decisions,
   - test on real browsers and OSes (Firefox / Chromium, Linux / Android) and
     decide the UI/UX details.

I try to provide usable software, but **I still cannot provide any warranty.**

## License

Copyright (c) 2024, 2026 kuanyui (ono ono)

MIT License. See [LICENSE](./LICENSE) for the full text.
