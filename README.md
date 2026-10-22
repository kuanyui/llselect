# LLSelect - Low-Level Select

[![npm version](https://img.shields.io/npm/v/@llselect/core)](https://www.npmjs.com/package/@llselect/core)

A low-level JavaScript library aims to be an alternative of `<select>`.

This is a low-level `<select>`-liked component library written in TypeScript. Focus on performance and flexibility. You can easily wrap and integrate into your existing UI library / framework / style.

- GitHub: [Git](https://github.com/kuanyui/llselect) | [Home](https://kuanyui.github.io/llselect/) | [Demo](https://kuanyui.github.io/llselect/demo/) | [API](https://kuanyui.github.io/llselect/api/)
- GitLab: [Git](https://gitlab.com/kuanyui/llselect) | [Home](https://kuanyui.gitlab.io/llselect/) | [Demo](https://kuanyui.gitlab.io/llselect/demo/) | [API](https://kuanyui.gitlab.io/llselect/api/)

> [!TIP]
> #### Why not native `<select>`?
>
> Native `<select>` was designed in the 1990s, and the lots of limitations have caused innumerous indescribable discomfort to OCD developers and designers for over two decades:
>
> - Unable to customize the HTML template of `<select>`, `<option>`, `<optgroup>` Behavior of dropdown are platform-dependent (popup/dropdown list are OS-native controls, which are rendered by system instead of browser)
> - No filter feature, especially for East-Asian languages.
> - Values can only be stored as `string`.
> - Unable to accept mouse event when `<select disabled="true">` (to show tooltip to explain why it's disabled, for example).
>
> #### Arrrrgh... Yet another select library? Why not existing select libraries? Are you too bored?
>
> Yeeeee, it's just because all of the existing libraries are unable to satisfy my requirements, mainly on aspect of performance (initializing hundreds of instances), then flexibility, and explicitly.
>
> At least as of May 2026, this situation was still not solved. The only way was implement one to fit my ideal.
>
> #### It's AI era! Why a library instead of using LLM agent to write an ad-hoc select component directly?
>
> If you are sensitive enough, you should know select is a terribly long-tailed UI component. Lots of detailed behaviors and edge cases that you won't want to waste time to struggle with. Includes but not limited:
>
> - ARIA (detailed behavior of keyboard navigation, `lang` attribute... etc)
> - Popup width, layout and position on small-sized screen, or items containing long text content.
> - CJK characters and layout problem (ex: unexpected newline).
> - System and browser compatibility (Desktop / Mobile / Touchscreen; Firefox / Chromium / Safari)

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
- [Acknowledgments](#acknowledgments)
- [License](#license)

## Features

- No external JS / CSS dependency.
- Fast where it is measured: mass instantiation is sometimes even faster than native `<select>` (see [Benchmark](#benchmark)).
- Does not rely on a native `<select>` and its `string` to store data: use `number`, customized object or any JavaScript value as the data model directly, without type-casting hell.
- Native TypeScript support.
- Customizable HTML renderer functions.
- Search candidates in input, friendly for Eastern-Asian languages.
- ARIA, A11Y and keyboard support, including native-style prefix typeahead.
- I18n packages and RTL languages support.

> [!WARNING]
> Browser support floor: Firefox 78+, Chrome/Edge 87+, Safari 14.1+. No polyfills or legacy-browser workarounds are included.

## Design principles

1. Minimalist
   - No external JS / CSS dependency. Auditable.
   - Do only one thing: *"a minimal replacement of `<select>`"*, not aimed to be an omnipotent monster.
2. Performance
   - Create minimal elements on DOM when instantiating to optimize the page loading latency.
   - The DOM of popup and candidates are lazy-rendering, and remove unneeded element from DOM when unneeded to minimize memory usages.
   - Mutate minimal DOM if possible. Toggling a candidate in the popup list replaces only the affected candidate rows and refreshes the trigger, instead of rebuilding the whole list. (Features that change which rows are listed or add a summary row - `hideChosenRows`, `chooseAllRow` - rebuild or update those parts too.)
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
> - Tested on Intel i9-13900HX (Linux, Wayland, KDE 6 power profile: Performance), Chromium 154.
> - Tested versions of each libraries are the latest versions as of **2026-08-25**.
>   - Library versions are pinned in the bundle-size table below.
> - All tests are single select.
>   - Every select widget is built WITH a pre-selected value (the benchmark page's `pre-select at build time`).
> - **Before paint** measures the work that must finish before the browser can paint the new select widgets. Build total does not count this work.
>   - The benchmark builds the select widgets in chunks. A chunk is a group of select widgets that the benchmark builds one after another, with no pause. Between two chunks, the benchmark waits for the next frame, so the page stays responsive.
>   - In the test with 1000 select widgets, a chunk is 25 select widgets. In the test with 100 select widgets, a chunk is 1 select widget.
>   - For each chunk, the time starts when the library has built the DOM of that chunk. First, the browser runs the microtasks that the library queued while building that chunk. Then the browser does the style and layout work that is still left for that DOM. The time ends when the browser has done that work.
>   - The column adds up the times of all chunks.
>   - Work that a library delays with a timer or with `requestAnimationFrame` is not counted. A microtask queued from inside another microtask is not counted either.
> - The following table shows **instantiation** only, other tests (interactions like open popup, filter candidates, choose candidate, ... etc) cannot be accurately benchmarked nor able to be fairly compared across libraries due to the details in implementations of each library. But you still can test by yourself in benchmark page (Live Benchmark: [GitHub Page](https://kuanyui.github.io/llselect/demo/benchmark.html) or [GitLab Pages](https://kuanyui.gitlab.io/llselect/demo/benchmark.html). Source Code: [HTML](demo/benchmark.html), [JS](demo/benchmark.js)), and interact with them and feel the "real experience" instead of relying on inaccurate benchmark results.

### 100 selects x 100 candidates

| Library           | Build total (all select widgets, ms) | Before paint (all select widgets, ms)       | DOM nodes (all, resting) | Teardown total (all select widgets, ms) |
|-------------------|-------------------------------|--------------------------------------|--------------------------|----------------------------------|
| Native `<select>` | 28                            | 105                                  | 10,200                   | 4.40                             |
| llselect          | 9.10                          | 22                                   | 900                      | 0.50                             |
| Choices.js        | 149                           | 32                                   | 20,900                   | 6.10                             |
| Select2           | 118                           | 95                                   | 10,900                   | 11                               |
| Tom Select        | 40                            | 35                                   | 900                      | 1.10                             |
| Slim Select       | 63                            | 113                                  | 11,000                   | 5.40                             |

### 1000 selects x 10 candidates
| Library           | Build total (all select widgets, ms) | Before paint (all select widgets, ms)       | DOM nodes (all, resting) | Teardown total (all select widgets, ms) |
|-------------------|-------------------------------|--------------------------------------|--------------------------|----------------------------------|
| Native `<select>` | 31                            | 137                                  | 12,000                   | 5.60                             |
| llselect          | 32                            | 39                                   | 9,000                    | 5.40                             |
| Choices.js        | 869                           | 18                                   | 29,000                   | 28                               |
| Select2           | 471                           | 167                                  | 19,000                   | 36                               |
| Tom Select        | 457                           | 74                                   | 9,000                    | 25                               |
| Slim Select       | 129                           | 210                                  | 20,000                   | 24                               |

### Bundle size

Minified bytes as loaded by the benchmark page (llselect from the local `dist/index.umd.js`, the rest from the pinned CDN builds); not gzipped.

| Library                      | Version    | Minified |
|------------------------------|------------|----------|
| llselect                     | 0.0.11     | 59.6 KB  |
| Choices.js                   | 11.1.0     | 73.6 KB  |
| Select2                      | 4.1.0-rc.0 | 71.4 KB  |
| Tom Select                   | 2.4.3      | 49.1 KB  |
| Slim Select                  | 2.10.0     | 86.1 KB  |
| jQuery (required by Select2) | 3.7.1      | 85.5 KB  |


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

Multi select: `new LLSelectMultiple(el, { ... })` - `getChosenItems()` / `toggleItem()` / `triggerDisplay: 'tags'` / `chooseAllRow: true` / `hideChosenRows: true` and friends.

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
- **Prefix typeahead cannot cover IME input, because composition needs a text field and the trigger is not one.** Typing letters to jump still works like a native `<select>` on alphabetic lists. For CJK lists, enable `filterable` and type in its search box.
- **No auto destroy.** - You *must* call `destroy()` manually when unmounting.
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
  > How you wrap `llselect` in your project and the trade-offs should be decided by yourself, according to your using scenario.

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
- **A chosen item that becomes disabled** stays chosen. A native `<select>` also keeps a disabled option selected. Native `required` still counts it as chosen. When a form submits, the browser omits selected options that are disabled.
- **Matching native submission**: disabling an item does not fire `onChange`, so the hidden input keeps its value. If a chosen item is disabled when the form submits, remove or disable its hidden input. An item whose group is disabled through `groupDisabledFn` counts as disabled too.
- **`<label for>`** cannot target llselect (plain `div`s are not labelable) - pass the element instead: `labelEl: document.querySelector('label[for="country"]')` covers both halves (accessible name via a live `aria-labelledby` reference, and label clicks focus the trigger).

Why there is no built-in setting for this, and why the recipe uses hidden inputs rather than a hidden `<select>` mirror: [docs/llm/DESIGN.md](docs/llm/DESIGN.md) "`<form>` integration (ruled out of core)".

## Capabilities overview

| Capability                           | Entry points                                                                                                             |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Search box + custom matching         | `filterable` (bool or predicate), `filterFn`                                                                             |
| Typing to jump (prefix typeahead)    | always on while the filter is off - no setting; matches the text `itemToStringFn` returns; see Typing to jump            |
| Accessible field naming (required)   | `ariaLabel` / `ariaLabelledBy` / `labelEl` (visible label element: name + label-click-to-focus)                          |
| Disabling - whole control / per item | `setDisabled()`, `focusableWhenDisabled`, `itemDisabledFn`                                                               |
| Grouping (optgroup)                  | `itemToGroupKeyFn`, `groupKeyToStringFn`, `groupDisabledFn`                                                               |
| Multiple selection                   | `LLSelectMultiple`: `toggleItem()`, `getChosenItems()`, `chooseAllRow`, `hideChosenRows`, `chosenItemsOrder: 'as-chosen' \| 'as-listed'`, `triggerDisplay: 'count' \| 'tags'`, `clearable` |
| Popup width                          | `popupWidthPolicy: 'fit-content' \| 'match-trigger'` (default `'fit-content'` - grows to content like a native select)   |
| Rich rendering without subclassing   | `createPopupListItemContentElFn`, `createTriggerContentElFn`, `createTagContentElFn`, ...                                         |
| Action rows: commands in the list    | `popupListLeadingActionRows`, `popupListTrailingActionRows` - option rows in the arrow-key ring; see Action rows |
| Pinned rows                          | `popupListLeadingRowsPinned`, `popupListTrailingRowsPinned` - the choose-all row and the command rows stay in view while the items scroll |
| Popup header / footer, pinned        | `createPopupHeaderContentElFn`, `createPopupFooterContentElFn` - called once; the node is yours to update; see Popup header / footer |
| i18n                                 | `uiTranslationPack` setting + `setUiTranslationPack()` runtime switch + `@llselect/core/i18n` packs (`uiTranslationPackByLocale`, keyed by BCP 47 tag), RTL inherited from `dir`, `itemToLangFn` writes each item's `lang` for screen readers that switch voices, `groupKeyToLangFn` the same for a group |
| Lifecycle                            | `destroy()` (required on unmount), `rerender()`, `setItems()`                                                            |
| Events                               | `onChange(current, previous, meta)`, `onBeforeChange(next, previous, event)`, `onOpen(meta)`, `onClose(meta)`, `onFocus`, `onBlur`, `onActiveItemChange(item)`, `onFilterQueryChange(query)`; `onChange`'s `meta` carries `source`, `reason` and, for one added or removed item, `item`; `event` adds `preventDefault()`; `onOpen` / `onClose` get a `meta.reason` naming the path, such as `'escape'` or `'outside'`; `onFocus` / `onBlur` report DOM focus entering / leaving the whole select widget, never a move inside it; `onActiveItemChange` reports the item the arrow keys land on, `undefined` for no item |

### Typing to jump (prefix typeahead)

While the filter is off, typing characters moves the focused option to the match, like a native `<select>`.

- Keystrokes one second or less apart chain into one prefix; a pause starts a new one.
- Repeating one character cycles through the options that start with it.
- Typing while closed opens the list first. It only moves the focused option; Enter, Space, or a click chooses.
- Space never joins the prefix, so a typed prefix ends before any space. Space keeps its usual job: open when closed, choose or toggle when open.
- The matched text is the same string `itemToStringFn` returns.

Full contracts: [docs/llm/DESIGN.md](docs/llm/DESIGN.md) (API / architecture) and [docs/llm/A11Y.md](docs/llm/A11Y.md) (keyboard / focus / ARIA). The TypeScript declarations shipped in the package document every setting inline.

## API reference

Every class, setting and type, generated with TypeDoc from the same TSDoc that ships in the package's declarations - so it cannot drift from the source:

- [GitHub Pages](https://kuanyui.github.io/llselect/api/) | [GitLab Pages](https://kuanyui.gitlab.io/llselect/api/)

For the AngularJS directives (`ll-*` attributes), see the attribute reference in [angularjs/API.md](angularjs/API.md).

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

Settings can only fill content inside the elements the library builds. Subclassing changes those elements themselves, including their ARIA.

- So no setting can break the ARIA contract.
- Use settings first. Subclass only for a new select kind or a framework wrapper.
- Content is what a `create*ContentElFn` fills. The element around it, e.g. the `role="option"` row, changes only by overriding `create*El`.
- Live comparison: the "Subclassing" section of the [demo examples](https://kuanyui.github.io/llselect/demo/examples.html) page.

A complete worked subclass, in TypeScript with typed subclass settings (the class's `S` generic param): the tree multiple select in demo section 13.2 (`demo/subclass/tree-select.ts`).

### Settings (the common path - no subclass needed)

| You want to customize            | Setting                         |
|----------------------------------|---------------------------------|
| Item display text                | `itemToStringFn`                |
| Trigger content (e.g. tag chips) | `createTriggerContentElFn`      |
| Disable individual items         | `itemDisabledFn`                |
| Search matching                  | `filterFn`                      |
| Highlight filter matches in rows | `createPopupListItemContentElFn` + the `createHighlightedTextEl` helper |
| Equality for object items        | `compareFn`                     |
| Dropdown arrow                   | `createTriggerArrowContentElFn` |
| Events                           | `onChange`, `onBeforeChange`, `onOpen`, `onClose`, `onFocus`, `onBlur`, `onActiveItemChange`, `onFilterQueryChange` |

```js
const sel = new LLSelectSingle(el, {
  itemToStringFn: (u) => `#${u.id} ${u.name}`,
  itemDisabledFn: (u) => !u.active,
  onChange: (u) => console.log('chosen:', u),
})
```

Settings are frozen after construction. The library re-applies nothing on its own, so a live setting would need its own re-apply code.

- Data changes by method, for example `setItems`.
- Only two texts have setters: `setPlaceholder`, `setUiTranslationPack`.
- Event callbacks are settings too, one callback per event. To swap a handler at runtime or call several listeners, wrap it in your own function: `onChange: (current, previous, meta) => myHandler?.(current, previous, meta)`.
- For anything else, build a new instance.

#### Highlight what the filter matched

The exported helper `createHighlightedTextEl(text, query)` wraps every match of `query` in a `<mark>` element. Pair it with `createPopupListItemContentElFn`, which re-runs on every filter keystroke:

```js
import { LLSelectSingle, createHighlightedTextEl } from '@llselect/core'

let sel
sel = new LLSelectSingle(el, {
  filterable: true,
  createPopupListItemContentElFn: (item) => createHighlightedTextEl(item, sel.getFilterQuery()),
})
```

- Matching mirrors the built-in filter: case-insensitive substring. If you set a custom `filterFn`, mark your own matches instead.
- Screen readers are unaffected: the option's accessible name comes from `itemToString`, not from the rendered content.
- A third argument replaces the default `<mark>`: `(matchedText) => HTMLElement`, inserted as-is.

#### Popup header / footer

A header sits between the filter input and the list. A footer sits under the list. Neither scrolls with the items.

```js
const countEl = document.createElement('div')
countEl.textContent = '0 chosen'
const sel = new LLSelectMultiple(el, {
  createPopupFooterContentElFn: () => countEl, // called once; the node is yours
  onChange: (chosen) => { countEl.textContent = `${chosen.length} chosen` },
})
```

- The library never rebuilds the node. Update it from `onChange` or `onOpen`.
- The function runs while the instance is being built. It receives `classIdMap` and the translation pack, and should read nothing else.
- A button in a slot works with the mouse and keeps keyboard input on the combobox. Give it `type="button"` and an accessible name.
- A text field in a slot must stop its own `mousedown` from bubbling, or it cannot take focus.
- To put the header above the filter input, move it from a subclass constructor: `if (this.popupHeaderEl) { this.popupEl.prepend(this.popupHeaderEl) }`.

#### Action rows: commands inside the list

A row is a command a keyboard user reaches with the arrow keys. It sits above or below the items and scrolls with them unless its block is pinned. For content nobody runs, use a header or footer instead.

```js
const DEFAULTS = ['Japan', 'Taiwan']
const isSameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x))
let sel
sel = new LLSelectMultiple(el, {
  popupListTrailingActionRows: [
    {
      textFn: () => 'Restore defaults',
      disabledFn: () => isSameSet(sel.getChosenItems(), DEFAULTS),
      onActivate: () => { sel.setChosenItems(DEFAULTS) },
    },
  ],
})
```

- The library builds the row: it is an option in the list, with your text as its name.
- `textFn` and `disabledFn` run again after every change, so they may read live state.
- `onActivate` runs on Enter, on click, and on Space while the filter is off. The library neither chooses nor closes for it.
- Put no button or link inside a row. The row itself is the control.
- `popupListLeadingRowsPinned: true` keeps the choose-all row and the leading rows in view while the items scroll. `popupListTrailingRowsPinned` does the same at the bottom. Pinning is per block: all the rows at one end, or none.
- Inside these functions, and inside every other settings function, `this` is `undefined`. Reach the instance through the variable you assigned it to. The translation pack is the exception: its message functions are called on the pack.

To put "select all" somewhere other than first, turn `chooseAllRow` off and write it as an action row. Such a row is a command. It has no selected state. It is never the active option when the popup opens. It stays listed when nothing is selectable.

```js
let sel
sel = new LLSelectMultiple(el, {
  popupListTrailingActionRows: [
    {
      textFn: () => {
        const all = sel.getVisibleEnabledItems()
        const chosen = all.filter((item) => sel.isChosen(item)).length
        return sel.getUiTranslationPack().chooseAllRowText(chosen, all.length)
      },
      disabledFn: () => sel.getVisibleEnabledItems().length === 0,
      onActivate: () => { sel.toggleAllVisible() },
    },
  ],
})
```

#### Confirm before a change

`onBeforeChange` runs **before** a user pick, toggle, chip removal, clear or choose-all is written. Call `event.preventDefault()` to stop it.

> Pairs with `onChange`, which runs **after** the change was written.

The value stays and `onChange` does not fire. A vetoed pick in single mode still closes the popup, like any pick.

```js
let sel
let agreed = false
sel = new LLSelectSingle(el, {
  onBeforeChange: (next, _previous, event) => {
    if (next !== 'advanced' || agreed) { return }
    event.preventDefault() // the value stays as it was
    askForAgreement().then((ok) => { if (ok) { agreed = true; sel.setChosenItem('advanced') } }) // reported as source 'api'
  },
})
```

- Programmatic setters never ask. Guard your own calls in your own code.
- A setter called inside the handler wins; the pending change is dropped.
- A rule that never allows an item belongs in `itemDisabledFn`. `onBeforeChange` is for a decision that depends on the moment.

#### Dark color scheme

Every theme ships a dark palette. The select widget checks two CSS sources, in this order: the variable `--llselect-color-scheme`, then the property `color-scheme`.

- Standard: declare `color-scheme: light dark` on `<html>`. With no variable set, the select widget then follows the operating system, like a native select element.
- Your own toggle: set the variable to dark or light on an ancestor of the select widget. One rule does it: `.night { --llselect-color-scheme: dark; }`.
- Built in: the themes set the variable for the classes and attributes in the table below. They count on the root element or on any ancestor.
- Nested regions: the select widget inherits the variable from the nearest ancestor that sets it. So a card with `data-color-scheme="light"` keeps its select widgets light inside a dark page.
- Per instance: the setting `colorScheme: 'dark'` or `'light'` wins over both CSS sources and the operating system.
- Bootstrap 5.3 pages: set `data-bs-theme="dark"`, the attribute Bootstrap's own documentation uses. The bootstrap-5 theme takes its colors from Bootstrap's own variables, so that attribute drives it. A forced light select widget inside such a page keeps Bootstrap's dark colors.
- If the variable is not set and the property does not list dark, the select widget stays light. This holds on a dark operating system too.
- Your own colors: redefine the `--llselect-*` variables in a rule like `.acme .llselect-root`, loaded after the theme stylesheet. Every theme file lists the names and roles at its top.
- Your rule must beat the theme's dark rule, `.llselect-root[data-llselect-color-scheme='dark']`. It wins with higher specificity, or with equal specificity and a later position in the page.
- A custom dark palette also needs the dark scheme: set `--llselect-color-scheme: dark` on the root element or an ancestor. The selected scheme controls the scrollbar's look. The color variables do not.
- At runtime: the select widget rechecks the scheme when a class or attribute changes on the html or body element. It also rechecks when its popup opens or the operating system preference changes. The select widget does not recheck after a class or attribute change on any element other than html or body. If the change affects a select widget's scheme, call `refreshColorScheme()` for every affected select widget. Usually, the affected select widgets are on or inside that element.
- Shadow DOM: load the theme stylesheet inside the shadow root. A built-in class or attribute may be on an ancestor outside the shadow root. The class or attribute takes effect only if the document outside the shadow root also loads the theme stylesheet. Inside a shadow root, the select widget does not detect class or attribute changes on the html or body element. The select widget also does not detect operating system preference changes. When one of these changes affects the scheme, call `refreshColorScheme()` for every select widget inside the shadow root. Refreshing a select widget whose scheme is unchanged changes nothing.
- Live comparison: section 16 of the [demo examples](https://kuanyui.github.io/llselect/demo/examples.html) page.

| Class or attribute on the root element or an ancestor | Selects |
|---|---|
| class `dark` | dark |
| class `theme-dark` | dark |
| class `dark-mode` | dark |
| class `theme-light` | light |
| class `light-mode` | light |
| attribute `data-theme` | its value, dark or light |
| attribute `data-bs-theme` | its value, dark or light |
| attribute `data-color-scheme` | its value: dark, light, or auto to follow the operating system |

Your page may already use a class or attribute from the table for another purpose. Select widgets on or inside an element with that class or attribute then take the scheme the table lists. To stop that class or attribute from setting the scheme, add a rule that beats its theme rule:

```css
.hero.dark { --llselect-color-scheme: inherit; }
```

With this rule, that element takes its parent's value of the variable. If that value is empty, the select widget falls back to the property. To keep the select widgets light even inside a dark page, write `light` instead of `inherit`.

### Subclassing (extending the library)

Subclass only when settings cannot express it:

1. **A new select kind** - new public API / state / interaction (e.g. a TreeSelect).
2. **A framework wrapper** - e.g. `class VueLLSelect extends LLSelectSingle` for lifecycle glue (call `destroy()` on unmount). This is the main reason llselect is "low-level".
3. **Core behavior with no setting** - e.g. replace `onPopupListItemActivated` semantics, or take full control of the item element via `createPopupListItemEl` (rich HTML, icons).

How the two layers coexist: every customization point is a `protected` method whose default reads its `*Fn` setting. Overriding the method replaces that default - your override wins, plain OO, no hidden precedence. Rationale: [docs/llm/DESIGN.md](docs/llm/DESIGN.md).


## Acknowledgments

### LLM Disclosures

This project heavily relies on LLM agents. More than 99% of the working code was written directly by an LLM.

#### So you are just a fucking idiot vibe coder? What on Earth were you responsible for in this project, if LLM has done so much?

- I:
   - Review crucial modifications (before or after `git commit`) via `git diff` as possible as I can, to avoid obvious anti-patterns and bad-smelling code.
   - correct unreasonable APIs according to my development experience, trying to avoid misleading APIs naming and anti-patterns common among existing UI component libraries,
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
