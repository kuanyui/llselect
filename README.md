# LLSelect - Low-Level Select

[![npm version](https://img.shields.io/npm/v/@llselect/core)](https://www.npmjs.com/package/@llselect/core)

A JavaScript library that replaces the native HTML `<select>` element.

It is a minimal but flexible implementation of `<select>` in JavaScript that you can easily wrap and integrate into your existing UI library / framework / style.

- GitHub: [Git](https://github.com/kuanyui/llselect) | [Demo](https://kuanyui.github.io/llselect/demo/)
- GitLab: [Git](https://gitlab.com/kuanyui/llselect) | [Demo](https://kuanyui.gitlab.io/llselect/demo/)

> [!TIP]
> #### Why not native `<select>`?
>
> Native `<select>` was designed in the 1990s, and the lots of limitations have caused enormous traumatic pains to OCD developers and designers for over two decades:
>
> - Unable to customize the HTML template of `<select>`, `<option>`, `<optgroup>` Behavior of dropdown are platform-dependent (popup/dropdown list are OS-native widgets, which are rendered by system instead of browser)
> - No filter feature, especially for East-Asian languages.
> - Values can only be stored as `string`.
> - Unable to accept mouse event when `<select disabled="true">` (to show tooltip to explain why it's disabled, for example).

**Contents**

- [Features](#features)
- [Design principles](#design-principles)
- [Benchmark](#benchmark)
- [Demo](#demo)
- [Install](#install)
- [Quick start](#quick-start)
- [Limitation: What llselect deliberately decides not to do?](#limitation-what-llselect-deliberately-decides-not-to-do)
- [`<form>` integration](#form-integration)
- [Capabilities overview](#capabilities-overview)
- [Customization: settings or subclassing?](#customization-settings-or-subclassing)
- [Acknowledgment](#acknowledgment)
- [License](#license)

## Features

- No external JS / CSS dependency.
- Blazing fast. Instantiation on DOM is sometimes even faster than native `<select>`.
- Does not rely on a native `<select>` and its `string` to store data: use `number`, customized object or any JavaScript value as the data model directly, without type-casting hell.
- Native TypeScript support.
- Customizable HTML renderer functions.
- Search candidates in input, friendly for Eastern-Asian languages.
- ARIA, A11Y and keyboard support.
- I18n packages and RTL languages support.

> [!WARNING]
> Browser support floor: Firefox 78+, Chrome/Edge 87+, Safari 14.1+. No polyfills or legacy-browser workarounds are included.

## Design principles

1. Minimalist
   - No external JS / CSS dependency. Auditable.
   - Do only one thing: *"a minimal replacement of `<select>`"*, not aimed to be an omnipotent monster.
2. Performance
   - Create minimal elements on DOM when instantiating to optimize the page loading latency.
   - The DOM of popup and candidates are lazy-rendering, and remove unneeded element from DOM when unneeded to minimize memory footprints.
   - Mutate minimal DOM if possible. Choosing candidate in popup list mutates only the DOM of the chosen candidate, instead of rebuilding the whole list.
3. Flexible
   - Highly customizable: HTML templates of select itself, popup, candidates list, candidate row, arrow icon, ...etc.
   - Easy to integrate into an existing project / library / style.
   - Settings configure one instance; subclassing extends the library.
4. Explicit
   - Explicit is better than implicit - API names are long, but hold no surprise or ambiguity.
   - *Single-select* and *multiple-select* are separate classes, avoiding ambiguous / over-abstracted APIs (e.g. one `T[]` adopted on both modes).
   - Improves some UI/UX anti-patterns of the legacy `<select>` (e.g. `aria-disabled` instead of native `disabled`, so a disabled control still receives hover events and can show a "why is this disabled" tooltip).

## Benchmark

> [!NOTE]
> - Tested on Intel 13900HX, Chromium 149.
> - All tests are single select.
> - The following table shows **instantiation** only, other tests (interactions like open popup, filter candidates, choose candidate, ... etc) cannot be accurately benchmarked nor able to be fairly compared across libraries due to the details in implementations of each library. But you still can test by yourself in demo benchmark page, and interact with them and feel the "real experience" instead of relying on inaccurate benchmark results.

### 100 selects x 100 candidates

| Library           | Build total (all widgets, ms) | DOM nodes (all, resting) | Teardown total (all widgets, ms) |
|-------------------|-------------------------------|--------------------------|----------------------------------|
| Native `<select>` | 53                            | 10,200                   | 6.70                             |
| llselect          | 27                            | 800                      | 0.80                             |
| Choices.js        | 318                           | 20,800                   | 9.00                             |
| Select2           | 288                           | 10,900                   | 14                               |
| Tom Select        | 108                           | 800                      | 3.70                             |
| Slim Select       | 154                           | 11,000                   | 6.50                             |

### 1000 selects x 10 candidates
| Library           | Build total (all widgets, ms) | DOM nodes (all, resting) | Teardown total (all widgets, ms) |
|-------------------|-------------------------------|--------------------------|----------------------------------|
| Native `<select>` | 46                            | 12,000                   | 7.70                             |
| llselect          | 54                            | 8,000                    | 7.10                             |
| Choices.js        | 1147                          | 28,000                   | 35                               |
| Select2           | 624                           | 19,000                   | 51                               |
| Tom Select        | 539                           | 8,000                    | 23                               |
| Slim Select       | 171                           | 20,000                   | 32                               |


## Demo

- Live: [GitHub Pages](https://kuanyui.github.io/llselect/demo/) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/)
- AngularJS directives: [GitHub Pages](https://kuanyui.github.io/llselect/demo/angularjs/) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/angularjs/)
- Local: clone this repo, `npm install && npm run build`, then `npm run serve` and open `http://localhost:8080/demo/`

## Install

```sh
npm install @llselect/core
```

Published on npm as [`@llselect/core`](https://www.npmjs.com/package/@llselect/core). For AngularJS 1.x there is [`@llselect/angularjs`](https://www.npmjs.com/package/@llselect/angularjs), a separate package with its own setup - see [angularjs/README.md](angularjs/README.md).

## Quick start

```js
import { LLSelectSingle, LLSelectMultiple } from '@llselect/core'
import '@llselect/core/themes/vanilla.css' // optional: any shipped theme, or bring your own CSS

const sel = new LLSelectSingle(document.querySelector('#mount'), {
  ariaLabel: 'Fruit', // accessible name (or ariaLabelledBy: id of your visible label) - always set one
  placeholder: 'Pick a fruit',
  onChange: (item, previousItem) => console.log(item),
})
sel.setItems(['Apple', 'Banana', 'Cherry'])
```

Multi select: `new LLSelectMultiple(el, { ... })` - `getChosenItems()` / `toggleItem()` / `triggerDisplay: 'tags'` / `selectAllRow: true` and friends.

Language packs (optional, tree-shakeable pure data):

```js
import { zhTW } from '@llselect/core/i18n'
new LLSelectSingle(el, { texts: zhTW })
```

No build tool? The UMD bundle exposes `window.llselect` (`<script src="https://unpkg.com/@llselect/core"></script>`), themes via `<link>`.

## Limitation: What llselect deliberately decides **not** to do?

- **No native form integration.** llselect renders plain `div`s, not a form control: nothing is submitted with a `<form>`, and `name`/value serialization, form reset, constraint validation (`required` etc.), and `<label for>` association do not apply. What to do instead: [`<form>` integration](#form-integration).
- **No HTML sanitizer.** llselect does not do HTML sanitizing for you. Remember to sanitize untrusted input via [DOMPurify](https://github.com/cure53/DOMPurify), or [browser's native Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer).
- **No asynchronous data-fetching API.** llselect is aimed to be a simple `<select>` replacement. Fetch if you really want, then call `setItems(...)`.
- **No virtual scrolling.** llselect is aimed to be a simple `<select>` replacement, not an omnipotent library.
- **No alphabetic prefix typeahead** (the native `<select>` behavior) - because it is unusable for East Asian languages and IME input. Use the `searchable` option instead.
- **No official React / Vue / Angular wrapper** - llselect provides the minimal library and the CSS themes only.
  > Because:
  >
  > - What is the schema of data model (`string[]` or `Array<{ key: T, text: string, ... }>`...etc),
  > - How data models are bound,
  > - What APIs of llselect are needed to be exposed (especially the customizable HTML templates),
  > - How to bind (or when to update) the i18n translation text of select and candidates,
  >
  > All of the above affects the performance, and complexity of wrapper.
  > A generic wrapper for a frontend framework / library may unnecessarily increase complexity and impact performance (and surely I also have no interests to follow up these quickly-outdated libraries / frameworks). so I decide not to provide official wrapper for frontend frameworks / libraries.
  >
  > How you wrap llselect in your project and the trade-offs should be decided by yourself, according to your using scenario.
- **No auto destroy.** - You *must* call `destroy()` manually when unmounting.

## `<form>` integration

llselect's selection state lives in JS (`getChosenItem()` / `getChosenItems()` / `onChange`), not in a form control. That is already enough for most apps:

- Pure UI state (sort order, page size, language switcher): the value never leaves the page - nothing to submit.
- Sending via `fetch` / XHR: build the request body (JSON or `FormData`) from that state directly.
- A `<form>` whose JS submit handler builds the payload: `new FormData(form)` then `formData.append('country', chosenCode)` - no extra DOM needed.

A bridge is needed only for classic full-page form submission, where the browser builds the payload and serializes native form controls only. Mirror the selection into `<input type="hidden">` - hidden inputs are inert by spec (unfocusable, no tab stop, outside the accessibility tree, excluded from constraint validation), so the mirror cannot leak into a11y or focus order:

```js
const hidden = document.querySelector('input[name="country"]') // <input type="hidden" name="country"> inside the form
const sel = new LLSelectSingle(mountEl, {
  ariaLabelledBy: 'country-label',
  itemToStringFn: (c) => c.name,
  // a form value is a string - map it yourself; itemToStringFn is display text ("Taiwan"), not a submit value ("TW")
  onChange: (c) => { hidden.value = c?.code ?? '' },
})
sel.setItems([{ code: 'TW', name: 'Taiwan' }, { code: 'JP', name: 'Japan' }])
```

Multi select submits one hidden input per chosen value, all with the same `name` (spell it `countries[]` if your backend is PHP / Rails; keep it bare for Go / Python):

```js
const form = document.querySelector('form')
const sel = new LLSelectMultiple(mountEl, {
  ariaLabelledBy: 'countries-label',
  itemToStringFn: (c) => c.name,
  onChange: (chosen) => {
    form.querySelectorAll('input[name="countries[]"]').forEach((el) => { el.remove() })
    for (const c of chosen) {
      const hidden = document.createElement('input')
      hidden.type = 'hidden'
      hidden.name = 'countries[]'
      hidden.value = c.code
      form.append(hidden)
    }
  },
})
```

The mirror covers submission only. The rest of native form behavior stays yours to handle:

- **Initial value**: if the server renders a pre-filled `value` attribute, apply the same value to llselect with `setChosenItem()` / `setChosenItems()` - the setters fire `onChange`, so the mirror stays in sync from then on.
- **`form.reset()`** restores hidden inputs to their markup `value` attribute and does not touch llselect, so the two drift apart. Listen for the form's `reset` event and re-sync with `setChosenItem()` / `setChosenItems()`, or avoid reset.
- **Constraint validation** (`required` etc.) never fires on hidden inputs - validate the llselect state in your submit handler.
- **`<label for>`** cannot target llselect - set the accessible name with `ariaLabel` / `ariaLabelledBy`; for label-click-to-focus, add a `click` handler on the label yourself.

Why there is no built-in setting for this, and why the recipe uses hidden inputs rather than a hidden `<select>` mirror: [docs/DESIGN.md](docs/DESIGN.md) "`<form>` integration (ruled out of core)".

## Capabilities overview

| Capability                           | Entry points                                                                                                             |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Search box + custom matching         | `searchable` (bool or predicate), `filterFn`                                                                             |
| Accessible field naming (required)   | `ariaLabel` / `ariaLabelledBy`                                                                                           |
| Disabling - whole control / per item | `setDisabled()`, `focusableWhenDisabled`, `itemDisabledFn`                                                               |
| Grouping (optgroup)                  | `itemToGroupKeyFn`, `groupKeyToLabelFn`, `groupDisabledFn`                                                               |
| Multiple selection                   | `LLSelectMultiple`: `toggleItem()`, `getChosenItems()`, `selectAllRow`, `triggerDisplay: 'count' \| 'tags'`, `clearable` |
| Popup width                          | `popupWidthPolicy: 'match-trigger' \| 'fit-content'`                                                                     |
| Rich rendering without subclassing   | `createItemContentElFn`, `createTriggerContentElFn`, `createTagContentElFn`, ...                                         |
| i18n                                 | `texts` setting + `@llselect/core/i18n` packs (`textsByLocale`, keyed by BCP 47 tag), RTL inherited from `dir`                 |
| Lifecycle                            | `destroy()` (required on unmount), `rerender()`, `setItems()`                                                            |
| Events                               | `onChange(current, previous)`, `onOpen`, `onClose`                                                                       |

Full contracts: [docs/DESIGN.md](docs/DESIGN.md) (API / architecture) and [docs/A11Y.md](docs/A11Y.md) (keyboard / focus / ARIA). The TypeScript declarations shipped in the package document every setting inline.

## Customization: settings or subclassing?

Rule of thumb: **settings configure one instance; subclassing extends the library.**

Quick test: "Am I making a new, named, reusable kind of select?"

- No, I just want this one dropdown to look / behave some way -> **settings**.
- Yes -> **subclass**.

### Settings (the common path - no subclass needed)

| You want to customize            | Setting                         |
|----------------------------------|---------------------------------|
| Item display text                | `itemToStringFn`                |
| Trigger content (e.g. tag chips) | `createTriggerContentElFn`      |
| Disable individual items         | `itemDisabledFn`                |
| Search matching                  | `filterFn`                      |
| Equality for object items        | `compareFn`                     |
| Dropdown arrow                   | `createTriggerArrowContentElFn` |
| Events                           | `onChange`, `onOpen`, `onClose` |

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

How the two layers coexist: every customization point is a `protected` method whose default reads its `*Fn` setting. Overriding the method replaces that default - your override wins, plain OO, no hidden precedence. Rationale: [docs/DESIGN.md](docs/DESIGN.md).


## Acknowledgment

I have had this idea since 2024 and wrote some drafts for it, but I had no time to implement it, so the draft was abandoned.

Now, with Claude Code, I am trying to finish it.

### LLM Disclosures

This project heavily relies on LLM agents. More than 99% of the working code was written directly by an LLM.

#### So you are just a fucking idiot vibe coder? what on Earth were you responsible for in this project, if LLM has done so much?

1. I review all modifications via `git diff` before `git commit`, as much as I can, to avoid obvious anti-patterns and bad-smelling code.
2. I
   - correct unreasonable APIs according to my development experience, trying to avoid the painful APIs and anti-patterns common among existing select UI component libraries,
   - make the technical decisions,
   - test on real browsers and OSes (Firefox / Chromium, Linux / Android) and decide the UI/UX details.

I try to provide usable software, but **I still cannot provide any warranty.**

## License

Copyright (c) 2024, 2026 kuanyui (ono ono)

MIT License. See [LICENSE](./LICENSE) for the full text.
