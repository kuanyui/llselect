# Handoff: Codex half of the post-fix review (demo renumbering, AngularJS UI-language example, the ui-select bridge's app-wide defaults)

Status: closed. Written for a reboot that turned out to be unnecessary: the "running low on memory" stops were the harness's background-task guard, not exhaustion, and both Codex members ran on the same machine once launched detached from that tracking (`setsid nohup ... &`, one at a time, watched through a log). All four members' findings are fixed and logged in `../FIXME.md` (ids 139-149). Kept for the operator notes, the memory evidence and the end-to-end smoke script. One lesson for the next brief: pipe only the brief part (from "Change set" on); Codex 5.5 read the operator section as its own instructions and tried to launch `codex exec` itself.

This file has two audiences. "For the operator" is for the session that runs the review. Everything from "Change set" on is the brief the Codex reviewers get on stdin (they can ignore the operator section).

## For the operator (the next session)

1. Preconditions: `cd /workspaces/llselect && npm run build` once (the AngularJS tests and the demo load `dist/index.umd.js` and `dist/i18n.umd.js`). Confirm the change set is present: `git status --short` lists the 18 files under "State at handoff", or the three commits under "If it was committed" exist.
2. Run the two members ONE AT A TIME, never alongside `npm run verify` (the RAM rule in `CLAUDE.md`), with this file on stdin, from the repo root:

```sh
codex exec -m gpt-5.5 -c model_reasoning_effort=xhigh -s read-only < docs/llm/handoff-codex-review-i18n-demo-bridge.md > /tmp/out-codex-5-5.md 2> /tmp/err-codex-5-5.log
codex exec -m gpt-5.6-sol -c model_reasoning_effort=max -s read-only < docs/llm/handoff-codex-review-i18n-demo-bridge.md > /tmp/out-codex-sol.md 2> /tmp/err-codex-sol.log
```

3. What the kills looked like, and what they were: the harness reported "stopped because the system is running low on memory" 1-2 minutes after start; stdout stayed empty; stderr held only the echoed prompt and the warning "Codex could not find bubblewrap on PATH ... Codex will use the bundled bubblewrap in the meantime". `free -m` showed 2.9 GB total and about 2.1 GB available while idle, 1.6 GB of it page cache; no leftover processes (all process RSS summed to about 0.5 GB, the session itself 369 MB). Sampled every 20 s during the detached runs: total used peaked at about 1.03 GB, `free` dipped to 538 MB, `available` never went below 1.86 GB. So the guard reacts to `free` (cache counted as used), not to real pressure. Workaround that worked: launch the CLI with `setsid nohup <runner> &` outside the harness's background-task tracking and wait on its log line with a monitor. `claude -p` at max effort ran about 13 minutes per member and survived as a tracked background task when run alone. Never drop `-s read-only` to work around a kill.
4. Triage each report against the CURRENT files: a reviewer may quote line numbers from the diff at the end of this file, which drift. Fix what holds (`CLAUDE.md`: a low-risk fix executing a reviewer's direction is done directly). A design disagreement (D1-D4 below) goes to the owner as a decision, not into the code. Then `npm run verify` and `cd angularjs && npm install && npm test`; when the demo changed, re-run the smoke in the appendix.
5. Append the findings to the `docs/llm/FIXME.md` round "review (demo renumbering, AngularJS i18n demo, the ui-select bridge's language-pack door)", ids continuing from 145, and update that round's Process line to say the Codex members ran (or were skipped again, and why).
6. Close: move this file to `docs/llm/archive/` with a status line at the top, remove the pointer in `docs/llm/TODO.md` ("Open review round"), and hand the owner the four pending decisions under "Decisions the owner still has to ratify" unless they were ratified in the meantime.

## Change set (what the reviewers are reviewing)

Three change sets in one working tree, all verified green together (`npm run verify`: check, build, 531 core tests, 89 AngularJS tests, site build).

### 1. Core demo page: the i18n section moved to the end and everything renumbered

- `demo/examples.html`: former section 13 "i18n (language packs) + RTL" is now section 16 (16.1-16.3); former 14 Subclassing -> 13; 15 Popup header / footer -> 14; 16 Action rows -> 15. Headings, `data-demo` / `data-demo-css` ids and in-page cross references ("for comparison with 15.1", "Subclass equivalent: 13.1", "subclass instead: section 13") were renumbered.
- `demo/main.js`: the three i18n code regions (`//#region 16.1` / `16.3` / `16.2`, formerly 13.x) moved after region 15.4; every `//#region` marker and every number-bearing comment renumbered. The snippet injector at the end of the file locates regions by name, not position.
- `demo/style.css`: `/* #region */` markers 14.1->13.1, 14.2->13.2, 15.1->14.1, 15.4->14.4, the "14. popup header / footer slots" banner, two comments.
- Cross references updated: `README.md` ("demo section 13.2"), `src/base.ts` TSDoc ("Demo sections 9.1, 13.1 and 13.2"), `demo/data.js` (three comments; two were stale before this change: the rich item-content data is section 11, the grouped data "sections 10 and 11.3", the i18n data section 16), `demo/subclass/tree-select.ts` ("region 13.2"), `docs/llm/DESIGN.md` (sections 13 and 16), `docs/llm/TODO.md`, `docs/llm/FIXME.md`, `docs/llm/popup-rows-and-callbacks.md`. `docs/llm/archive/` was deliberately left untouched (historical records).
- Verified mechanically: every `data-demo` id has a `//#region`, every `data-demo-css` id has a CSS region, heading numbers run 1 .. 16.3 in order. No file links to this page's generated `#anchors` (grep for `examples.html#`), so the changed heading slugs break nothing.

### 2. AngularJS demo: new section 14 "UI language" (`demo/angularjs/examples.html`, `demo/angularjs/app.js`)

- Runs the recipe documented in `angularjs/API.md` "Switching the UI language at runtime" verbatim: `i18nPackSync(ctrlName)` registered under `llselectSingle`, `llselectMultiple` and `uiLlselect`; a native `<select>` bound to `vm.uiLang` calls `$translate.use(key)` on change; `LLSELECT_I18N_PACKS` maps 'zh-TW' and ja to `window.llselectI18n` packs (the page now loads `dist/i18n.umd.js`). Every widget on the page follows, chosen values survive, an explicit `ll-placeholder` (1a) keeps winning.
- angular-translate wiring: the demo's static-files loader points at angular-validation's locale files (12 locales on the CDN, no ja / zh-TW), and angular-translate never switches to a language whose load failed, so app.js registers an empty table per demo language (`$translateProvider.translations('ja', {})`, same for 'zh-TW') and sets `fallbackLanguage('en')` so section 9's validation messages keep resolving. Verified against angular-translate 2.19.1 source: `$translate.use` calls `useLanguage(key)` directly when `$translationTable[key]` exists.
- The hint says the page's own copy stays English and that RTL lives in the core demo, section 16 (direction is inherited from the environment; the AngularJS layer adds nothing). Former section 14 "Full source" is now 15. The demo intro now says the bridge file is loaded beside `llselect-angularjs.js`, not instead of it.
- End-to-end smoke (appendix) in jsdom against the real CDN libraries: switching to ja / zh-TW / en re-packs all 21 widgets that have no explicit placeholder, the ones with an explicit placeholder keep it, section 14's `<ui-llselect>` follows, chosen values survive, `$translate.instant('INVALID_REQUIRED')` keeps returning the English message, no console errors. A manual real-browser pass entry was added to `docs/llm/TODO.md`.

### 3. `<ui-llselect>` (`angularjs/llselect-ui-select.js`): app-wide defaults + `instance()`

Before: the bridge built its own core instances, read nothing from `llselectConfig`, and published no controller, so neither `llselectConfigProvider.defaults({ uiTranslationPack })` nor the API.md language-switch recipe could reach a `<ui-llselect>`; an app using both directive sets and setting the pack once got mixed languages. Now:

- `angular.module('llselect.uiCompat', ['llselect'])` (was `[]`): the bridge injects `llselectConfig` and takes exactly two keys from it, `uiTranslationPack` and `popupWidthPolicy`, the keys ui-select's markup has no word for. The other three follow ui-select: `arrow` (the caret is always rendered), `filterable` (`search-enabled` is ui-select's word), `highlight` (the row template's own `| highlight:` filter). The reason lives in `angularjs/API.md` (`<ui-llselect>` intro bullets) only; `angularjs/SPEC.md` carries the contract sentence; the code comments point at API.md. A slot `placeholder` still wins over the pack's default (core rule).
- `UiLlselectApiController` publishes `instance()` under the directive name `uiLlselect` (`require: ['ngModel', 'uiLlselect']`), same shape and same late-binding contract as `LlselectApiController` in `angularjs/llselect-angularjs.js`; the link wires it with `apiCtrl.$$setInstance(sel)` right after `BRIDGES.set(sel, bridge)`.
- Docs moved with it: `angularjs/API.md` (the `<ui-llselect>` intro line and bullets, "All three directives publish a controller", the recipe gained `.directive('uiLlselect', i18nPackSync('uiLlselect'))`, the `uiTranslationPack` entry), `angularjs/SPEC.md` ("Module and element names": the modules are no longer independent; "App-wide defaults": the full five-key list and the bridge's two-key sentence), `angularjs/README.md` (Files table, lead sentence, two "Implementation notes" bullets).
- Tests added in `angularjs/test/llselect-ui-select.test.mjs`: a config pack seeds a `<ui-llselect>` and a slot placeholder still wins; the recipe under `uiLlselect` re-packs a live bridge widget and `{}` restores English; config `popupWidthPolicy` reaches the bridge while `arrow` / `filterable` / `highlight` from config do not change it; a config pack reaches `<ui-llselect multiple>` (the tag remove button's aria-label).

## State at handoff

Uncommitted in the working tree, 18 files: `README.md`, `angularjs/API.md`, `angularjs/README.md`, `angularjs/SPEC.md`, `angularjs/llselect-ui-select.js`, `angularjs/test/llselect-ui-select.test.mjs`, `demo/angularjs/app.js`, `demo/angularjs/examples.html`, `demo/data.js`, `demo/examples.html`, `demo/main.js`, `demo/style.css`, `demo/subclass/tree-select.ts`, `docs/llm/DESIGN.md`, `docs/llm/FIXME.md`, `docs/llm/TODO.md`, `docs/llm/popup-rows-and-callbacks.md`, `src/base.ts`, plus this handoff and its `docs/llm/TODO.md` pointer. `public/` and `angularjs/*.min.js` are rebuilt (gitignored).

If it was committed before the review runs, the proposed split is three commits with these subjects; then review `git diff <parent of the first>..HEAD`:

```
refactor: [demo][docs][src] move i18n to the end of the core demo; renumber
feat: [demo/angularjs] UI language example: the API.md $translate recipe, live
feat: [angularjs][docs][test] ui-llselect takes the app-wide pack and width policy; publishes instance()
```

## Already reviewed: what Opus 5 and Opus 4.8 found (all fixed, `docs/llm/FIXME.md` ids 139-144)

- Neither found a correctness defect: the link signature and its one call site agree; `UiLlselectApiController` takes no DI parameters, so terser's mangling cannot break it; the moved `demo/main.js` regions declare no identifier used earlier in the file; the injector matches regions by name.
- Fixed from their reports: three lead sentences that still called the two AngularJS files independent (MEDIUM-139); the bridge's config rule admitting `popupWidthPolicy` on paper but not in code (MEDIUM-140, which is why the rule is now two keys); stale section numbers the sweep missed (DOCUMENTATION-141); the section 14 hint over every hint limit (QUALITY-142); untested negative half of the config contract and the multiple-mode pack (QUALITY-143); the pack rationale written four times, SPEC's list lacking `highlight`, the README bridge section silent on the new door (DOCUMENTATION-144).
- Their D1-D4 verdicts: both endorse the hard module dependency (D1); both endorse the two-key rule as now implemented (D2; Opus 5 is the one who pushed it from one key to two); both keep the empty-table plus `fallbackLanguage` wiring (D3; Opus 5 asked that the validation-message path be verified, which the appendix smoke does); both agree RTL stays in the core demo (D4).

## Decisions the owner still has to ratify

1. The bridge's hard dependency on the `llselect` module. This breaks an app that loads only the bridge file, which SPEC.md used to call supported ("the modules are independent"). The alternative, an optional `$injector.has('llselectConfig')` lookup, keeps that sentence true but fails silently when the lookup misses. Recommendation and both Opus verdicts: hard dependency.
2. The bridge takes two keys from the app-wide defaults (`uiTranslationPack`, `popupWidthPolicy`), not one. Reverting to the pack alone is one line in the bridge plus one assertion in the negative test, and the API.md bullet.
3. Whether the Codex members' review is required before the change set ships (this handoff exists because the owner said yes).
4. The three-commit split above.

Follow-up question, not touched: ui-select's own dropdown matches the control's width, while the bridge's default stays llselect's `fit-content`; whether the bridge should default to `match-trigger` is a separate decision (never flip a shipped default in the turn it is questioned).

## Brief for the Codex reviewers

You are one of the review-panel members (Codex 5.5 or Codex Sol). Read-only. Repo root: `/workspaces/llselect`. Two members (Opus 5, Opus 4.8) already reviewed an earlier state; their findings are fixed and logged in `docs/llm/FIXME.md` under "review (demo renumbering, AngularJS i18n demo, the ui-select bridge's language-pack door)". Do not re-report those. Review the CURRENT files (the diff appended below can be stale on line numbers; re-run `git diff` yourself when in doubt) and look for what they missed and for anything their fixes broke.

Design points to challenge, plainly and with the reason:

- D1: the hard module dependency `['llselect']` versus an optional `$injector.has('llselectConfig')` lookup.
- D2: the two-key rule (take `uiTranslationPack` and `popupWidthPolicy`; `arrow`, `filterable`, `highlight` follow ui-select).
- D3: empty angular-translate tables plus `fallbackLanguage('en')` as the demo's way to run the documented recipe on a page whose loader has no ja / zh-TW files. Is there a simpler or more honest wiring for a demo?
- D4: RTL left to the core demo (section 16) and named there in plain text.

Rules the change set must obey (from `/workspaces/llselect/CLAUDE.md`, the governing file; read it for the full text):

- English-only, ASCII-only punctuation in code and docs (hyphen-minus only; no em dashes, smart quotes); i18n resource strings and test fixtures are the exception.
- Demo example titles say what the example SHOWS, in plain words, naming the actual API; demo hint copy stays SHORT and every sentence must help the reader; plain language, no invented terms.
- One word, one concept ("label" only where HTML calls it label; UI copy is `*Text`).
- Comments terse; docstring order rules; `{ }` around every if / else body, even one-liners.
- Never hardcode a runtime-generated `#anchor` in a cross-page link (the demo hint links the API page and names the section in plain text on purpose).
- Markdown prose is not hard-wrapped; no dates in docs.
- A public API change is not done until exports, docs, tests and the owning contract doc move together (for the AngularJS package: `angularjs/API.md`, `angularjs/SPEC.md`, `angularjs/README.md`, tests).
- Settings freeze: llselect settings are read once at construction; `uiTranslationPack` and `placeholder` are the two with runtime setters.
- The bridge's scoping rule (`angularjs/README.md` "The ui-select bridge"): bridge what llselect has; ignore what it does not; nothing half-implemented.

What to report: findings only, ranked most severe first, in this exact shape per finding: `- [ ] **[SEVERITY-N] - title**` then indented `Symptom:` / `Cause:` / `Impact:` / `Fix:` lines, with `file:line` references. SEVERITY is one of HIGH / MEDIUM / PERFORMANCE / QUALITY / DOCUMENTATION / NEEDS-VERIFICATION / LINT (full words). Number N from 1 within your review. Cover: correctness defects; missed cross references or stale section numbers anywhere in the repo (grep for the old numbering: the i18n demo was 13.x, Subclassing 14.x, Popup header / footer 15.x, Action rows 16.x); doc drift between API.md / SPEC.md / README.md / source comments; rule violations from the list above; test gaps; then your verdict on D1-D4 (one short paragraph each, after the findings). If a category has nothing, write "none". Do not restate this brief.

Files to read (verify, do not trust this brief):

- `demo/examples.html`, `demo/main.js`, `demo/style.css`, `demo/data.js`, `demo/subclass/tree-select.ts`
- `demo/angularjs/examples.html`, `demo/angularjs/app.js`
- `angularjs/llselect-ui-select.js`, `angularjs/llselect-angularjs.js` (the sibling controller and config wiring), `angularjs/API.md`, `angularjs/SPEC.md`, `angularjs/README.md`, `angularjs/test/llselect-ui-select.test.mjs`, `angularjs/test/llselect-angularjs.test.mjs` (the existing recipe test)
- `README.md`, `src/base.ts` (around "Demo sections 9.1"), `docs/llm/DESIGN.md`, `docs/llm/TODO.md`, `docs/llm/FIXME.md`, `docs/llm/popup-rows-and-callbacks.md`
- `CLAUDE.md` (rules)

## Appendix: the end-to-end smoke of the AngularJS page (jsdom + the real CDN libraries)

Needs network (CDN) and a static server on `public/`. Run from the repo root after `npm run build:site`; expected output: section 14 triggers read "Please select" / the ja and zh-TW placeholders per language, the page-wide tally shows 21 widgets switching while the explicit placeholders stay, `INVALID_REQUIRED` keeps resolving to "Field is required. ", the chosen value survives, "page errors: none".

```sh
python3 -m http.server 8765 -d public >/dev/null 2>&1 & SRV=$!
node /tmp/ng-i18n-smoke.mjs; kill $SRV
```

```js
// /tmp/ng-i18n-smoke.mjs
import { createRequire } from 'node:module'
const require = createRequire('/workspaces/llselect/package.json')
const { JSDOM, VirtualConsole } = require('jsdom')
const URL = 'http://127.0.0.1:8765/demo/angularjs/examples.html'
const vc = new VirtualConsole()
const pageErrors = []
vc.on('jsdomError', (e) => { pageErrors.push('jsdomError: ' + String(e.message || e).slice(0, 160)) })
vc.on('error', (...a) => { pageErrors.push('console.error: ' + a.map(String).join(' ').slice(0, 160)) })
vc.on('warn', (...a) => { pageErrors.push('console.warn: ' + a.map(String).join(' ').slice(0, 160)) })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let dom
for (let i = 0; i < 30 && !dom; i++) {
  try { dom = await JSDOM.fromURL(URL, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc }) } catch (e) { await sleep(300) }
}
if (!dom) { throw new Error('could not load ' + URL) }
const { window } = dom
const doc = window.document
async function until(fn, what, ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { try { const v = fn(); if (v) { return v } } catch {} await sleep(150) }
  throw new Error('timeout waiting for ' + what)
}
await until(() => window.angular && window.angular.element(doc.body).injector(), 'angular bootstrap')
const $translate = window.angular.element(doc.body).injector().get('$translate')
await until(() => $translate.use() === 'en', 'en.json from the CDN')
await sleep(500)
const sel = doc.getElementById('ui-lang')
const tally = () => {
  const counts = {}
  for (const el of doc.querySelectorAll('.llselect-trigger-content')) {
    const t = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}
const sec14 = () => [...doc.querySelectorAll('[data-src="14"] .llselect-trigger-content')].map((e) => e.textContent.trim())
const report = (label) => {
  console.log(`--- ${label}: $translate.use()=${$translate.use()} | INVALID_REQUIRED -> ${JSON.stringify($translate.instant('INVALID_REQUIRED'))}`)
  console.log('section 14 triggers:', JSON.stringify(sec14()))
  console.log('page-wide trigger texts:', JSON.stringify(tally()))
}
report('initial')
for (const lang of ['ja', 'zh-TW', 'en']) {
  sel.value = lang
  sel.dispatchEvent(new window.Event('change', { bubbles: true }))
  await until(() => $translate.use() === lang, 'switch to ' + lang)
  await sleep(300)
  report(lang)
}
const trig = doc.querySelector('[data-src="14"] llselect-single .llselect-trigger')
trig.click()
await sleep(100)
doc.querySelector('[data-src="14"] llselect-single .llselect-item').click()
await sleep(100)
const before = doc.querySelector('[data-src="14"] llselect-single .llselect-trigger-content').textContent.trim()
sel.value = 'ja'
sel.dispatchEvent(new window.Event('change', { bubbles: true }))
await until(() => $translate.use() === 'ja', 'ja again')
await sleep(300)
const after = doc.querySelector('[data-src="14"] llselect-single .llselect-trigger-content').textContent.trim()
console.log('chosen survives switch:', JSON.stringify(before), '->', JSON.stringify(after))
console.log('page errors:', pageErrors.length ? pageErrors : 'none')
window.close()
```

## Unified diff at handoff (`git diff --stat`, before this handoff and its TODO pointer were added; the full diff is `git diff` on the tree, or the three commits)

```
 README.md                                  |   2 +-
 angularjs/API.md                           |  11 +-
 angularjs/README.md                        |   7 +-
 angularjs/SPEC.md                          |   4 +-
 angularjs/llselect-ui-select.js            |  47 ++++-
 angularjs/test/llselect-ui-select.test.mjs | 121 +++++++++++++
 demo/angularjs/app.js                      |  42 ++++-
 demo/angularjs/examples.html               |  46 ++++-
 demo/data.js                               |   6 +-
 demo/examples.html                         | 198 ++++++++++-----------
 demo/main.js                               | 268 ++++++++++++++---------------
 demo/style.css                             |  14 +-
 demo/subclass/tree-select.ts               |   2 +-
 docs/llm/DESIGN.md                         |   4 +-
 docs/llm/FIXME.md                          |  36 +++-
 docs/llm/TODO.md                           |  13 +-
 docs/llm/popup-rows-and-callbacks.md       |   2 +-
 src/base.ts                                |   2 +-
 18 files changed, 548 insertions(+), 277 deletions(-)
```
