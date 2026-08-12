# LLSelect - Low-Level Select

[![npm version](https://img.shields.io/npm/v/@llselect/core)](https://www.npmjs.com/package/@llselect/core)

A JavaScript library aims to be a replacement of native HTML `<select>`. Focus on performance and flexibility.

It is a minimal but flexible implementation of `<select>` in JavaScript that you can easily wrap and integrate into your existing UI library / framework / style.

- GitHub: [Git Repo](https://github.com/kuanyui/llselect) | [Live Demo](https://kuanyui.github.io/llselect/demo/)
- GitLab: [Git Repo](https://gitlab.com/kuanyui/llselect) | [Live Demo](https://kuanyui.gitlab.io/llselect/demo/)

> [!TIP]
> #### Why not native `<select>`?
>
> Native `<select>` was designed in the 1990s, and the lots of limitations have caused enormous traumatic pains to OCD developers and designers for over two decades:
>
> - Unable to customize the HTML template of `<select>`, `<option>`, `<optgroup>` Behavior of dropdown are platform-dependent (popup/dropdown list are OS-native widgets, which are rendered by system instead of browser)
> - No filter feature, especially for East-Asian languages.
> - Values can only be stored as `string`.
> - Unable to accept mouse event when `<select disabled="true">` (to show tooltip to explain why it's disabled, for example).
>
> #### Arrrrgh... Yet another select library? Why not existing select libraries? Are you too bored?
>
> Yeeeee, it's just because all of the existing libraries are unable to satisfy my requirements, mainly on aspect of performance, then flexibility, and explicitly.
>
> At least as of May 2026, this situation was still not solved. The only way was implement one to fit my ideal.



> [!WARNING]
> I know [Semantic Versioning](https://semver.org/), but the API of versions < `v0.1.0` is unstable currently and may have breaking changes. I'm still trying to eat my own dog food in real-world projects and trying to make the API stable. Thanks for your understanding.

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
- [API reference](#api-reference)
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
   - Consistent & comprehensible API naming convention, avoid user from guessing the meaning of APIs.
   - *Single-select* and *multiple-select* are separate classes, avoiding ambiguous / over-abstracted APIs (for example, `select2` uses `T[]` adopted on single & multiple modes.).
   - Improves some UI/UX anti-patterns of the legacy `<select>` (e.g. `aria-disabled` instead of native `disabled`, so a disabled control still receives hover events and can show a "why is this disabled" tooltip).

## Benchmark

> [!NOTE]
> - Tested on Intel 13900HX, Chromium 149. All libraries are the latest version at 2026-07-16.
> - All tests are single select.
> - The following table shows **instantiation** only, other tests (interactions like open popup, filter candidates, choose candidate, ... etc) cannot be accurately benchmarked nor able to be fairly compared across libraries due to the details in implementations of each library. But you still can test by yourself in benchmark page (Live Benchmark: [GitHub Page](https://kuanyui.github.io/llselect/demo/benchmark.html) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/benchmark.html). Source Code: [HTML](demo/benchmark.html), [JS](demo/benchmark.js)), and interact with them and feel the "real experience" instead of relying on inaccurate benchmark results.

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

- Live Example: [GitHub Pages](https://kuanyui.github.io/llselect/demo/) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/)
- Live Benchmark: [GitHub Pages](https://kuanyui.github.io/llselect/demo/benchmark.html) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/benchmark.html)
- AngularJS directives: [GitHub Pages](https://kuanyui.github.io/llselect/demo/angularjs/examples.html) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/angularjs/examples.html)
- Local: clone this repo, `npm install && npm run build`, then `npm run serve` and open `http://localhost:8080/demo/`
- Local, full-site preview: `npm run serve:site` (after `npm run build`) and open `http://localhost:8080/` - builds and serves `public/` exactly as the Pages hosts publish it (landing page, docs, API reference, demos)

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
import { ja, zhTW } from '@llselect/core/i18n'
const sel = new LLSelectSingle(el, { uiTranslationPack: zhTW })
sel.setUiTranslationPack(ja) // switch language at runtime - no rebuild, chosen state survives
```

### CDN (no build tool)

Everything in `dist/` is served by both CDNs; pin at least the major version (`@0`):

```html
<!-- library: window.llselect -->
<script src="https://cdn.jsdelivr.net/npm/@llselect/core@0/dist/index.umd.js"></script>
<!-- or: https://unpkg.com/@llselect/core@0/dist/index.umd.js -->

<!-- language packs (optional): window.llselectI18n -->
<script src="https://cdn.jsdelivr.net/npm/@llselect/core@0/dist/i18n.umd.js"></script>

<!-- a theme (optional): vanilla / tailwind / bootstrap-3 / bootstrap-4 / bootstrap-5 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@llselect/core@0/dist/themes/vanilla.css">
```

The bare URLs `https://cdn.jsdelivr.net/npm/@llselect/core` and `https://unpkg.com/@llselect/core` resolve straight to the UMD (via the `jsdelivr` / `unpkg` package fields). Browse every published file: [jsdelivr file tree](https://www.jsdelivr.com/package/npm/@llselect/core?tab=files) or [unpkg browser](https://unpkg.com/browse/@llselect/core/). ESM and CJS entries ship unminified for bundlers (which minify your app themselves); the UMD is minified, and every file carries a source map.

## Limitation: What llselect deliberately decides **not** to do?

- **No native form integration.** llselect renders plain `div`s, not a form control: nothing is submitted with a `<form>`, and `name`/value serialization, form reset, constraint validation (`required` etc.), and `<label for>` association do not apply (the label half ships separately: the `labelEl` setting provides the accessible name + label-click-to-focus). What to do instead: [`<form>` integration](#form-integration).
- **No HTML sanitizer.** llselect does not do HTML sanitizing for you. Remember to sanitize untrusted input via [DOMPurify](https://github.com/cure53/DOMPurify), or [browser's native Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/Sanitizer).
- **No asynchronous data-fetching API.** llselect is aimed to be a simple `<select>` replacement. Fetch if you really want, then call `setItems(...)`.
- **No virtual scrolling.** llselect is aimed to be a simple `<select>` replacement, not an omnipotent library.
- **No alphabetic prefix typeahead** (the native `<select>` behavior) - because it is unusable for East Asian languages and IME input. Use the `filterable` option instead.
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
- **`<label for>`** cannot target llselect (plain `div`s are not labelable) - pass the element instead: `labelEl: document.querySelector('label[for="country"]')` covers both halves (accessible name via a live `aria-labelledby` reference, and label clicks focus the trigger).

Why there is no built-in setting for this, and why the recipe uses hidden inputs rather than a hidden `<select>` mirror: [docs/llm/DESIGN.md](docs/llm/DESIGN.md) "`<form>` integration (ruled out of core)".

## Capabilities overview

| Capability                           | Entry points                                                                                                             |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Search box + custom matching         | `filterable` (bool or predicate), `filterFn`                                                                             |
| Accessible field naming (required)   | `ariaLabel` / `ariaLabelledBy` / `labelEl` (visible label element: name + label-click-to-focus)                          |
| Disabling - whole control / per item | `setDisabled()`, `focusableWhenDisabled`, `itemDisabledFn`                                                               |
| Grouping (optgroup)                  | `itemToGroupKeyFn`, `groupKeyToLabelFn`, `groupDisabledFn`                                                               |
| Multiple selection                   | `LLSelectMultiple`: `toggleItem()`, `getChosenItems()`, `selectAllRow`, `triggerDisplay: 'count' \| 'tags'`, `clearable` |
| Popup width                          | `popupWidthPolicy: 'fit-content' \| 'match-trigger'` (default `'fit-content'` - grows to content like a native select)   |
| Rich rendering without subclassing   | `createItemContentElFn`, `createTriggerContentElFn`, `createTagContentElFn`, ...                                         |
| i18n                                 | `uiTranslationPack` setting + `setUiTranslationPack()` runtime switch + `@llselect/core/i18n` packs (`uiTranslationPackByLocale`, keyed by BCP 47 tag), RTL inherited from `dir` |
| Lifecycle                            | `destroy()` (required on unmount), `rerender()`, `setItems()`                                                            |
| Events                               | `onChange(current, previous)`, `onOpen`, `onClose`                                                                       |

Full contracts: [docs/llm/DESIGN.md](docs/llm/DESIGN.md) (API / architecture) and [docs/llm/A11Y.md](docs/llm/A11Y.md) (keyboard / focus / ARIA). The TypeScript declarations shipped in the package document every setting inline.

## API reference

Every class, setting and type, generated with TypeDoc from the same TSDoc that ships in the package's declarations - so it cannot drift from the source:

- [GitHub Pages](https://kuanyui.github.io/llselect/api/) | [GitLab Pages](https://kuanyui.gitlab.io/llselect/api/)

For the AngularJS directives (`ll-*` attributes), see the attribute reference in [angularjs/README.md](angularjs/README.md#attribute-reference).

### Method-name grammar

Method names follow a strict grammar. Some notes maybe helpful if you need to customize it via subclass / settings:

| Name shape              | DOM contact         | Meaning                                                              |
|-------------------------|---------------------|----------------------------------------------------------------------|
| `create*El(...)`        | none - detached     | Builds a new element and returns it. Never inserts it.               |
| `commit*ToDom(content)` | writes the DOM      | Takes the content as its param. Writes it into the DOM.              |
| `sync*ToDom()`          | writes the DOM      | **No params.** Reads one `this.*` state field. Writes it to the DOM. |
| `replace*ElInDom(...)`  | writes the DOM      | Swaps one existing element for a fresh one. O(1).                    |
| `render*()`             | none - orchestrator | Calls the methods above in the right order. Writes no DOM itself.    |

> (`(...)` means the params vary per method. `()` means always zero params: the method reads instance state instead.)

- A few verbs touch the DOM with no suffix. The full fixed list: `open` / `close` / `toggle` / `destroy`, `focus*`, `attach*` / `detach*`, `capture*`. Every other verb (`get*`, `compute*`, `is*`, `itemTo*`) never touches the DOM.

- Settings callbacks are named by return type: `create*ElFn` returns an element, `itemTo*Fn` returns a string, other `*Fn` return a boolean, `on*` are event hooks. Full convention: [docs/llm/naming-conventions.md](docs/llm/naming-conventions.md).

## Customization: settings or subclassing?

Rule of thumb: **settings configure one instance; subclassing extends the library.**

Quick test: "Am I making a new, named, reusable kind of select?"

- No, I just want this one dropdown to look / behave some way -> **settings**.
- Yes -> **subclass**.

The capability line between the two: **settings stop at the content layer** - a `create*ContentElFn` fills what an element shows, while the element itself (the shell, e.g. the `role="option"` row: its attributes, its structure, the ARIA the library pins on it) stays library-owned. Changing the shell requires overriding `create*El` in a subclass - deliberately, so no setting can break the ARIA contract. Live comparison: [demo examples, section 14](https://kuanyui.github.io/llselect/demo/examples.html#14-subclassing).

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

How the two layers coexist: every customization point is a `protected` method whose default reads its `*Fn` setting. Overriding the method replaces that default - your override wins, plain OO, no hidden precedence. Rationale: [docs/llm/DESIGN.md](docs/llm/DESIGN.md).


## Acknowledgments

### LLM Disclosures

This project heavily relies on LLM agents. More than 99% of the working code was written directly by an LLM.

#### So you are just a fucking idiot vibe coder? What on Earth were you responsible for in this project, if LLM has done so much?

1. I review crucial modifications (before or after `git commit`) via `git diff` as possible as I can, to avoid obvious anti-patterns and bad-smelling code.
2. I
   - correct unreasonable APIs according to my development experience, trying to avoid the painful APIs and anti-patterns common among existing select UI component libraries,
   - make the technical decisions,
   - decide API naming conventions,
   - test on real browsers and OSes (Firefox / Chromium, Linux / Android) and decide the UI/UX details.

I try to provide usable software, but **I still cannot provide any warranty.**

### Special Thanks

The development of `llselect` is influenced by the following FLOSS projects:

- [W3C WAI](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) - provides reference implementations and canonical ARIA usage
- [`select2`](https://select2.org/) - a popular, long-lived, and very mature select library, as a sophisticated and well-designed a11y reference for a select component. (ARIA semantic, keyboard behaviors)

### Origin of This Project

I have had the idea to implement this library at least since 2020, because I had enough of the terrible inflexibility of the HTML native `<select>`, but none of any existing libraries satisfies my requirements. Especially the performance issue when initializing a page containing hundreds of selects components.

But I clearly know that there are surprisingly lots of details in the behaviours of a select, and deeply know how time-costing to implementing such library, so I didn't try to write it.

In 2024 I tried to wrote some drafts for it, but I still had no time to implement it, so the drafts were abandoned.

Now, with Claude Code, I am trying to finish it. Even with LLM agent, this project still costs me about 3 months to release `v0.0.1`.

## License

Copyright (c) 2024, 2026 kuanyui (ono ono)

MIT License. See [LICENSE](./LICENSE) for the full text.
