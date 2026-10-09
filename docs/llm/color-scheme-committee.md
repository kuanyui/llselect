# Committee: dark color scheme for the shipped themes

Agent-facing record of the committee convened on the second layer of color-scheme support: how the five theme stylesheets (`src/themes/*.css`) should gain dark values that work for every way a host website switches between light and dark. The page layer (the site's own switch, `demo/color-scheme.js`) is settled and out of scope here. Seven members, each a fresh read-only session at its highest effort, got the same brief (eight host mechanisms, the browser floor, seven sub-questions with candidate designs): Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex Sol, Codex 5.5, Codex Astra. Raw outputs stayed in the session scratchpad (two were written in Chinese, which the ASCII rule keeps out of the repo); this file carries the positions, the tally and the recommendation. Nothing below is decided until the owner ratifies it; the ratified decision goes to `DESIGN.md`.

## Facts the members verified in the repo

- `rootEl` is the caller's own mount element (`src/base.ts`, the constructor); its existing attributes survive construction, and the popup stays inside it (no body portal; the Popover top layer does not move it).
- Every theme sets explicit `color` / `background-color` on root, trigger, popup, rows and the filter input; no theme sets the CSS `color-scheme` property anywhere today.
- bootstrap-3 / -4 are hard-coded hex, no variable layer; bootstrap-5 reads `--bs-*` with light fallbacks; tailwind reads `--color-*` palette variables (scheme-neutral shades).
- Floor audit (three members): all five themes already use `:has()` (tag rules) and bootstrap-5 / tailwind use `color-mix()`, both above the declared floor (Firefox 78 / Chrome 87 / Safari 14.1), as degradable enhancements. Either the CLAUDE.md floor sentence ("the measured floor of what the code actually uses") is corrected to "no required feature above the floor", or those uses get `@supports` guards and fallbacks. Separate decision; it does not change the design below.
- The command-row dividers and header / footer borders are hard-coded `rgba(0, 0, 0, 0.12)` in every theme and vanish on a dark surface: they must join the token set.
- Pure CSS at the floor cannot tell a light-only site from an OS-following site: both match `@media (prefers-color-scheme: dark)`, and no floor selector can test "an ancestor declared `color-scheme`" (`:has()` and style queries are above it). Only JavaScript reading `getComputedStyle(rootEl).colorScheme` can. This single fact drives the design.

## Positions and tally

### Q1 - where the colors live

- All seven: tokens on `.llselect-root` (`--llselect-*`), light values; the dark palette is a block that redefines the tokens; every color rule reads a token. Nobody chose `:root` tokens (pollutes the page root, breaks two schemes on one page) or duplicated rule blocks.
- Variants on the dark block's hook: a root attribute written by the library (Opus 5, Codex Sol, Codex Astra, Sonnet 4.6, Sonnet 5), inherited custom properties set on the hook element (Codex 5.5, and Opus 4.8's "light values as `var()` fallbacks so ancestors win by inheritance").
- bootstrap-5: keep the `--bs-*` mapping as the token source so Bootstrap's own `data-bs-theme` drives it (five members); Codex Astra would give it an independent palette for reliable light-inside-dark nesting; Codex Sol wants the llselect token layer with `[data-bs-theme]` integration blocks feeding it.
- tailwind: map the tokens to light and dark slate shades (all).
- Token naming: `--llselect-` prefix, literal, independent of `cssClassPrefix`; names follow the element families (Opus 5), kept short (about a dozen, Sonnet 4.6).

### Q2 - how the widget learns the scheme

- All seven: M3, mirror the native control. JavaScript reads the computed `color-scheme` of the root element and combines it with `prefers-color-scheme`: dark when the declared value contains `dark` and either lacks `light` or the OS prefers dark; `normal`, empty or unsupported means light. All seven reject an unconditional `@media (prefers-color-scheme: dark)` block in the themes (M1: a light-only site would go dark for dark-OS visitors) and reject a JavaScript walk over a guessed class list as the main path (M4).
- How legacy hooks (classes / attributes) reach the widget, three camps:
  - CSS descendant selectors that redefine the tokens (`.dark .llselect-root { ... }`), all at the same specificity, precedence by rule order: Sonnet 4.6, Sonnet 5, Opus 4.8 in part.
  - JavaScript resolves everything with `closest()`, the hook list lives in JavaScript, the theme keeps ONE dark selector and zero ancestor hooks: Opus 5.
  - An inherited custom property as the single signal: hook selectors set `--llselect-color-scheme: light | dark | auto` ON the hook element itself, inheritance carries it down, JavaScript reads it first, then the computed `color-scheme`: Codex Sol, Codex 5.5, Codex Astra (and Opus 4.8's token-inheritance variant).
- Three members independently proved the point that decides between the camps: descendant selectors cannot implement "nearest ancestor wins" (selector specificity ignores distance), so a light card inside a dark page and the reverse need either inheritance (custom properties) or JavaScript `closest()`. Inherited custom properties also cross shadow boundaries, which descendant selectors and `closest()` do not without extra work.
- Feedback loop, named by four members as a hard contract: the theme must never declare the CSS `color-scheme` property on `.llselect-root`, because the resolver reads it there; set it on the trigger and the popup (UA-painted parts: scrollbars, the filter input's caret) instead. Opus 5 asks for a mechanical check in `scripts/check.mjs`.
- Updates: a shared `matchMedia` change listener (all); re-evaluate on `open()` (five); a `MutationObserver`: shared and batched on `html` / `body` attributes (Opus 5, Codex Sol, Codex Astra), per instance on the document element (Sonnet 4.6, Sonnet 5), none in v1 (Opus 4.8); an explicit refresh method for changes nothing can observe, such as stylesheet swaps (Opus 5, Codex Sol, Codex Astra).
- Firefox 78-95 (no `color-scheme` property): the computed value is empty, so the native path resolves light, consistent with native controls there; OS-following sites on those versions need the explicit `auto` signal (Codex Sol, Codex Astra).
- Known limit, all members: a host that only swaps its own CSS variables, or only has media-query rules and never declares `color-scheme` nor a recognized hook, cannot be detected; it needs the one-line signal. Documented, not solvable.

### Q3 - the built-in hook list

- Short list, five of seven: `[data-color-scheme="dark|light"]` (this project's page contract), `.dark` (Tailwind), `[data-theme="dark|light"]` (daisyUI, Pico, hand-rolled), `[data-bs-theme="dark|light"]` (Bootstrap 5.3). Sonnet 4.6 adds `[data-mode]`; Codex 5.5 adds `[data-mode]`, `.theme-dark`, `.dark-mode`. Nobody takes `.night`. Codex Astra adds `[data-color-scheme="auto"]` as the explicit OS opt-in.
- Known false positive: daisyUI's `data-theme` carries arbitrary names (`dracula`, `night`), so only the literal `dark` is caught; `.dark` can mean something else on some site; the nearest light signal or the instance override wins back.
- Force channel: reuse `data-color-scheme` on a wrapper or the root as the host's input (Opus 4.8, Opus 5, Sonnet 4.6, Codex Astra); a library-prefixed attribute `data-llselect-color-scheme` (Codex Sol, Codex 5.5); force classes `.llselect-color-scheme-dark|light` (Sonnet 5, Codex 5.5); no force classes (five). `.llselect-dark` fails rule 7a.11.

### Q4 - public API

- A `colorScheme: 'auto' | 'light' | 'dark'` setting (default `'auto'`): Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5, Codex 5.5. No setting at all, the attribute on the root or a wrapper is the override: Codex Sol, Codex Astra (a frozen setting beside a live CSS / DOM channel cuts against "Settings vs methods").
- A setter `setColorScheme`: Opus 4.8, Sonnet 4.6, Sonnet 5, Codex 5.5. Against: Opus 5 (no dual write channel; the host owns the runtime switch), Codex Sol, Codex Astra.
- A getter `getColorScheme(): 'light' | 'dark'` (resolved value only): Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5. Against: Codex Sol, Codex 5.5 (token overrides can change the look without the library knowing).
- A refresh method `refreshColorScheme(): void` for unobservable changes: Opus 5, Codex Sol; Codex Astra folds it into `rerender()`.
- No change event: all seven.
- The library's output attribute: reuse `data-color-scheme` on the root (Opus 4.8, Opus 5, Sonnet 4.6, Sonnet 5: same concept at two DOM levels, like `lang` / `dir`) versus a prefixed output `data-llselect-color-scheme` or `data-llselect-resolved-color-scheme` (Codex Sol, Codex 5.5, Codex Astra: the host's input must stay distinct from the library's result, else the resolver can mistake its own output for an override and a host attribute on the mount element gets overwritten).

### Q5 - packaging

- All seven: one file per theme with both palettes; no forced `*-dark.css` companions (a copied palette drifts, and the `exports` glob would present them as API). A stylesheet-swapping host sets the signal in its dark stylesheet or on its root.

### Q6 - precedence

- Order, all seven in substance: the instance override (setting or root attribute) > the nearest signal (force attribute, recognized hook, declared `color-scheme` on a subtree) > the page's `color-scheme` with the OS preference > light.
- Same-element conflicts (Codex Astra): `[data-color-scheme]` beats `[data-bs-theme]` beats `[data-theme]` beats `.dark`, by rule order at equal specificity.
- The CSS escape hatch (`.night .llselect-root { --llselect-bg: ... }`) beats the theme's own dark block at equal specificity because the host's stylesheet loads later; that is correct and must be documented. A host rule without `.llselect-root` in the selector (`.night { --llselect-bg: ... }`) loses to the root's own declaration, because a direct declaration beats an inherited value: the recipe must say so (Sonnet 5).

### Q7 - demo and docs

- All seven: the examples page is the test bed and already drives the native path (its switch writes `data-color-scheme` on `<html>` and `color-scheme: dark` on `:root`); add examples for a legacy region with a class NOT in the built-in list (`.acme-dark`, one-rule integration), a light card nested in a dark region, and a token override; reconnect the seven `demo/style.css` rules frozen to light values (listed in `TODO.md`); recipe in README "Customization", decision and precedence table in `DESIGN.md`, token naming in `naming-conventions.md`; the site's page CSS adds `html:not([data-color-scheme]) { --llselect-color-scheme: auto }` so old Firefox follows the OS on the site pages.

## Recommendation

Combine the inherited-signal camp with the native mirror; it is the only shape that serves every listed host mechanism at the floor, including nested regions and shadow roots, with one integration point.

- Tokens: `--llselect-*` on `.llselect-root`, light values; the dark block is `.llselect-root[data-llselect-color-scheme="dark"]` and redefines every token; it also sets `color-scheme: dark` on the trigger and the popup, never on the root (the resolver reads the root). Dividers and borders join the tokens. bootstrap-5 keeps `--bs-*` as the light source with dark fallbacks; tailwind maps to slate shades.
- Signal: one inherited custom property, `--llselect-color-scheme: light | dark | auto`, is the integration point for every host method. The themes ship the short hook list as rules that set it on the hook element itself (`.dark, [data-theme="dark"], [data-bs-theme="dark"], [data-color-scheme="dark"] { --llselect-color-scheme: dark }`, the light counterparts, and `[data-color-scheme="auto"]`). Any other method is one host rule (`.night { --llselect-color-scheme: dark }`), an inline style, or the full token override.
- Resolver (JavaScript, shared per document): instance override > inherited `--llselect-color-scheme` read from the root's computed style (`auto` means follow the OS) > computed `color-scheme` combined with the OS > light. Writes `data-llselect-color-scheme="light|dark"` on the root. Updates: a shared media-query listener, re-evaluation on `open()`, a shared batched observer on `html` and `body` attributes, and `refreshColorScheme()` for the rest. Registration is weak and shared: no per-instance listeners, nothing to leak for a discarded closed instance, nothing to run on the 10k-widget benchmark beyond one computed-style read per construction (cache per parent element if measured as costly).
- API: `colorScheme?: 'auto' | 'light' | 'dark'` (default `'auto'`), `getColorScheme(): 'light' | 'dark'`, `refreshColorScheme(): void`; no setter and no event in v1 (the runtime channel is the host's own signal). Open to the owner: whether a setter is wanted despite the dual-channel objection.
- Packaging: one file per theme. Precedence as above; same-element order `[data-color-scheme]` > `[data-bs-theme]` > `[data-theme]` > `.dark`.
- Demo and docs per Q7, plus a `scripts/check.mjs` rule that no theme declares `color-scheme` on `.llselect-root`, and a contrast pass (4.5:1 text, 3:1 borders and focus rings) on all five dark palettes.

## Decisions for the owner

- D1 Signal design: the inherited custom property plus the native mirror (recommended); or JavaScript-only resolution with the hook list in JavaScript (Opus 5); or descendant-selector hooks ordered in the file (Sonnet 4.6, Sonnet 5), which cannot do nested regions without a token override.
- D2 Built-in hooks: the short four with light counterparts (recommended); or add `[data-mode]`, `.theme-dark`, `.dark-mode`.
- D3 API: setting + getter + refresh, no setter, no event (recommended); or add `setColorScheme`; or no setting at all, attribute only.
- D4 The library's output attribute: `data-llselect-color-scheme` (recommended, distinct from the host's `data-color-scheme`); or reuse `data-color-scheme` on the root.
- D5 bootstrap-5: keep `--bs-*` as the light source (recommended); or an independent palette.
- D6 Observation: shared batched observer on `html` / `body` attributes plus open-time re-evaluation plus the refresh method (recommended); or no observer in v1.
- D7 The floor audit: accept `:has()` / `color-mix()` as degradable enhancements and correct the CLAUDE.md floor sentence (recommended); or add `@supports` guards and fallbacks. Decided by the owner: a feature above the floor is acceptable when the difference in older browsers is cosmetic only; a difference that hides state the user needs gets a plain fallback declaration. Applied: fallback lines before every `color-mix()` tint (the keyboard-focused row's background was the functional case); `:has()`, the `:focus-visible` selector lists and unprefixed `user-select` stay as cosmetic degradations; the CLAUDE.md floor bullet states the rule and the status of each use.

## Verification before shipping (union of the members' lists)

- Native comparison on Chrome, Firefox and Safari, floor and current: a native `<select>` beside the widget must render the same scheme for every combination of declared `color-scheme` (`normal`, `light`, `dark`, `light dark`) and OS preference; Firefox 78-95 stays light and throws nothing.
- Every host mechanism in the brief, both nesting directions, conflicting hooks on one element, a shadow root, an iframe (documented limit: no inheritance across documents), `<meta name="color-scheme">` (verify whether the computed style reflects it).
- Live changes while closed and open: OS flip, class or attribute toggle on `html`, `body` and a wrapper, inline `colorScheme`, stylesheet swap followed by `refreshColorScheme()`; no observer loops; `destroy()` leaves no registration.
- Headed browser: popup scrollbar, filter input caret and placeholder, autofill, the Popover top layer (UA `[popover]` chrome must not leak), every visual state (hover, focus, selected, disabled, groups, pinned rows, action rows, header / footer slots, tags, clear buttons).
- Real Bootstrap 5.3 with `data-bs-theme` (whole page and a nested card); real Tailwind v4 with the `.dark` class and with the media variant.
- The 1000-widget and 10k-item benchmark pages before and after (the computed-style read at construction); forced-colors mode and print preview untouched.
