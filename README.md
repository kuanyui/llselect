# llselect -- low-level select

A JavaScript library to replace HTML native `<select>`.

This is not mean to provide a full-bundle select (such `select2.js`). This provide a minimal but flexible library which implement `<select>` in JavaScript, which you can easily wrap & integrate it into your existing UI library / framework / style.

# Features
- Lazy rendering: the DOM of items list is rendered only when the popup open.
- Do not rely on native `<select>` to store data. (so you can directly use `number` or any type of JS value as data model, without type-casting hell anymore)
- Native TypeScript support.
- Customizable HTML renderer function.
- Search input.

# Customization: settings or subclassing?

Rule of thumb: **settings configure one instance; subclassing extends the library.**

Quick test: "Am I making a new, named, reusable kind of select?"
- No, I just want this one dropdown to look / behave some way -> **settings**.
- Yes -> **subclass**.

## Settings (the common path - no subclass needed)

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

## Subclassing (extending the library)

Subclass only when settings cannot express it:

1. **A new select kind** - new public API / state / interaction (e.g. a TreeSelect).
2. **A framework wrapper** - e.g. `class VueLLSelect extends LLSelectSingle` for lifecycle glue (call `destroy()` on unmount). This is the main reason llselect is "low-level".
3. **Core behavior with no setting** - e.g. replace `onItemClick` semantics, or take full control of the item element via `createItemEl` (rich HTML, icons).

How the two layers coexist: every customization point is a `protected` method whose default reads its `*Fn` setting. Overriding the method replaces that default - your override wins, plain OO, no hidden precedence. Rationale: `docs/DESIGN.md`.

# Design Decisions
## Principles
1. Minimal - No external JS / CSS dependency. Auditable.
2. Performance - blazing fast.
3. Flexible
  - Easy to integrate into existing project / library / style.
  - Settings configure one instance; subclassing extends the library. (See "Customization" above.)
4. Explicit
  - Explicit better than implicit - API names are long but no surprise nor ambiguity.
  - Single-select and multiple-select are handled by separate classes to avoid ambiguous / too-complicated / over-abstraction API (e.g. use the same `T[]` to model single / multiple select).
  - Improve some terrible UI/UX anti-pattern in legacy `<select>` (ex: replace `disabled` with `aria-disabled` to let it still able to accept mouse hover event, for example, show the reasons of disabling in hovering tooltip)

## Limitations
- **No sanitizer is provided by default. Please use `DOMPurify` by yourself.**
- No asynchronize data fetching API. Please do it by yourself.
- No virtual scroll. That's too complicated; `llselect` is merely meant to be a replacement of native `<select>`.
- No "alphabet suffix searching" (like native `<select>`) because this is totally unusable for eastern-Asia languages. If you really want search, please use `searchable` option.
- Legacy browser is not handled.

# Acknowledgment
I had this idea since 2024 and wrote some drafts for this. But I have no time to implement this so the draft was abandoned.

Now with Claude Code, I try to finish this with it.

## LLM Disclosures

This project heavily relys on LLM agent. >= 99% main working codes are directly written by LLM.

### So you are just a fucking idiot vibe coder? what on Earth were you responsible for in this project, if LLM has done so much?
1. I review all modifications via `git diff` before `git commit` as possible as I can, to avoid some obvious anti-patterns, or bad-smelling codes.
2. I
  - correct unreasonable APIs according to my development experiences, trying to avoid some painful APIs and anti-patterns which are common among existed select UI component libraries.
  - do technical decisions,
  - test on real browsers and OS (Firefox / Chromium, Linux / Android) and decide UI/UX details,

I tried to provide an usable software, but **I still cannot provide any warranty.**

# License
Copyright © 2024, 2026 kuanyui (ono ono)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
