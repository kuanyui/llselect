# Handoff

Agent-facing state of the work in progress, so that a session after a context compaction can continue without the conversation. `$S` stands for this machine's session scratchpad, `/tmp/claude-1000/-workspaces-llselect/b8084c63-e5f2-4d64-a2cb-e34b550f2fe0/scratchpad`. `FIXME.md` holds every finding and ruling in full; this file says what waits for whom, and in which order.

## Waiting for the owner

1. NEEDS-VERIFICATION-840 (which chosen item becomes active at open, and the enabled condition) and NEEDS-VERIFICATION-850 (an `open()` call made while DOM focus is elsewhere, with the filter inactive): the owner was told they can wait.
2. The squash trial: the owner asked to see the effect of squashing `master..dev` before any decision, and fears losing the record of the original states, of the reasons and of the discussions. Two branches show it, and `dev` is untouched:
   - `dev-squash-docs` merges only contiguous commits labeled `docs:` that touch no test, within one topic: 151 commits became 94;
   - `dev-squash-rounds` also merges the review-round fixes of each topic, keeping each feature and each first fix of a topic as its own commit: 151 commits became 41;
   - `$S/squash-build.py docs` and `$S/squash-build.py rounds` built them with `git commit-tree`; each squash keeps the tree of its last commit and the newest author and committer time of its range, as the owner asked, and its body lists the commits it replaces, a deliberate exception to the one-line rule of `CLAUDE.md` that the owner has not ruled on;
   - both final trees equal the tree of `3146d71`, so a later commit is not in them; when the owner decides, delete both branches with `git branch -D` and run the script again;
   - both give `43f25b9` the subject `fix: [src/i18n] update translations`, as the owner asked; `dev` keeps the old subject, since rewording it there would change the hash of every later commit;
   - if the owner adopts a squash, the current history must stay on a backup branch, since the commit hashes that `FIXME.md` and `aria-committee.md` cite, and the step-by-step diffs, exist only there;
   - Codex Sol's round-ten finding, that the subjects of `9be64f5`, `f05bdd9` and `f09603b` describe mechanism or list sub-parts, waits for the same decision; both trial forms keep the summary of `9be64f5`, after its scope; Codex Sol made the same finding on `496b60b` in round twelve, and in round thirteen found that the subject of `5d6f70a` names the review round instead of the change.
3. Optional, from Fable 5 in the round on the owner's cost criterion: one sentence for the `popupEl` docstring that names `close()` inside `onOpen` as the supported way to stop an open, MEDIUM-862. It recommends an API pattern, so it waits for the owner.

MEDIUM-858 and MEDIUM-862 are ruled and fixed: `open()` undoes itself through `close()` when `showPopover()` throws, and a canceled `beforetoggle` is documented as unsupported. Round ten of the review found MEDIUM-865, QUALITY-866, DOCUMENTATION-867 and DOCUMENTATION-868, round eleven MEDIUM-869, QUALITY-870, DOCUMENTATION-871 and DOCUMENTATION-872, round twelve MEDIUM-873, QUALITY-874, DOCUMENTATION-875 and DOCUMENTATION-876, round thirteen DOCUMENTATION-877 and DOCUMENTATION-878, and round fourteen DOCUMENTATION-879 and DOCUMENTATION-880, all fixed.

## Next steps, in order

1. The owner ended the `focusInitial` review after round fourteen. Implement MEDIUM-795, the scroll gesture behavior. Its design and names are ruled; the MEDIUM-795 entry in `FIXME.md` holds every ruling. In short:
   - a new module `behaviors.ts` under `src/` holds the types and the gesture code; `base.ts` only wires the setting, the protected method and the listeners;
   - the presets live in one file, `behavior-presets.ts` under `src/`, built as its own entry point `@llselect/core/behavior-presets`, like `./i18n`: `behaviorPresetsOfLLSelectDefault`, `behaviorPresetsOfFirefoxOnWindows` and `behaviorPresetsOfChromiumOnWindows`, plain objects spread into the settings; `base.ts` imports `behaviorPresetsOfLLSelectDefault` as its default, the way it imports `src/i18n/en.ts`; after the build, check that `dist/index.mjs` holds no Firefox or Chromium preset;
   - the setting `scrollGestureToBehaviorFn`, the protected method `scrollGestureToBehavior`, and `defaultScrollGestureToBehavior`, exported from `@llselect/core`; one function per behavior group, not one function for every group;
   - `LLSelectScrollGesture` has `kind: LLSelectScrollGestureKind`, `'wheel' | 'touch-start' | 'touch-drag' | 'touch-end'`, and `zone: LLSelectScrollGestureZone`, `'popup' | 'trigger' | 'outside'`; `'touch-end'` carries a `TODO:` comment that it is not implemented yet, and its docstring says that the library does not send it; the `'wheel'` docstring says that a mouse wheel and a touchpad both give it;
   - `LLSelectScrollGestureBehavior` is `'leave-popup-open-and-allow-page-scroll' | 'leave-popup-open-and-block-page-scroll' | 'close-popup-and-allow-page-scroll' | 'close-popup-and-block-page-scroll'`, a string union;
   - a close by a gesture has the reason `'scroll-gesture'` and the gesture in `meta.scrollGesture`; no `source` field;
   - the name of the protected predicate that decides whether to listen outside the select component (ruling 3A) is not ruled yet; the design review used `isScrollGestureObservedOutside`.
   The drag behaviors (choosing on release, the active row during a drag) are a later, separate behavior group with their own design round; `native-select-scrolling.md` holds the owner's tests.

## How this session ran the reviews and the browser passes

The paths below use `$S`, defined at the top of this file.

- The panel runner: `$S/readme-dark/queue.sh <out-dir> 3 label:member:max:<brief> ...`, with the members `fable`, `opus5`, `opus48`, `opus55` and `sol`, run in the foreground of a background shell task, so that a notification arrives at the end. It keeps three members running at once under a memory watchdog.
- The reviews of the `focusInitial` loop: rounds one to nine in `$S/scroll/run19` and `$S/scroll/run21` to `run28`, named `fi-*.md` to `fi9-*.md`; the round on whether to fix MEDIUM-858 in `$S/scroll/run29`, named `w-*.md`; the round on the owner's cost criterion in `$S/scroll/run30`, named `c-*.md`, Codex Astra included; round ten in `$S/scroll/run31`, named `fi10-*.md`; round eleven in `$S/scroll/run32`, named `fi11-*.md`; round twelve in `$S/scroll/run33`, named `fi12-*.md`; round thirteen in `$S/scroll/run34`, named `fi13-*.md`; round fourteen in `$S/scroll/run35`, named `fi14-*.md`; the briefs in `$S/scroll/review-focusinitial*.md`, `$S/scroll/brief-858-whether.md` and `$S/scroll/brief-858-cheapest.md`.
- The headless probes: `$S/scroll/afprobe*.mjs`, which load `dist/index.umd.js`, so run `npm run build` first. `afprobe6.mjs` holds the latest MEDIUM-858 cases: `plain` measures bare popovers, `llselect` the fixed bundle; it takes the part as its second argument, before the WebKit 18.4 path. They run in Chromium, Firefox and two WebKit builds with the environment below; `rootless-browser-testing.md` explains the parts.

```sh
S=/tmp/claude-1000/-workspaces-llselect/b8084c63-e5f2-4d64-a2cb-e34b550f2fe0/scratchpad; cd $S/scroll
CH=/tmp/claude-1000/-workspaces-llselect/5aeec04e-3b33-46c0-9b4f-8931b6f9b730/scratchpad/apt/prefix/usr/lib/x86_64-linux-gnu
P=/home/user/.cache/llselect-webkit-prefix; FC=$S/dom-diagram/fonts.conf
LIBDIRS=$(find $P -name '*.so*' -printf '%h\n' | sort -u | tr '\n' ':')
WK="PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 FONTCONFIG_FILE=$FC LD_LIBRARY_PATH=$LIBDIRS GIO_MODULE_DIR=$P/usr/lib/x86_64-linux-gnu/gio/modules GST_PLUGIN_PATH=$P/usr/lib/x86_64-linux-gnu/gstreamer-1.0 GSETTINGS_SCHEMA_DIR=$P/usr/share/glib-2.0/schemas GSETTINGS_BACKEND=memory __EGL_VENDOR_LIBRARY_DIRS=$P/usr/share/glvnd/egl_vendor.d LIBGL_DRIVERS_PATH=$P/usr/lib/x86_64-linux-gnu/dri LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe EGL_PLATFORM=surfaceless XDG_RUNTIME_DIR=/tmp/claude-1000/xdg-wk"
WK18=$(grep -o "/home/user/.npm/_npx/[0-9a-f]*/node_modules/playwright-core/index.mjs" hidden-wk18.mjs | head -1)
for e in chromium firefox; do LD_LIBRARY_PATH=$P/usr/lib/x86_64-linux-gnu:$CH FONTCONFIG_FILE=$FC MOZ_DISABLE_CONTENT_SANDBOX=1 node afprobe6.mjs $e llselect; done
env $WK node afprobe6.mjs webkit llselect
env $WK PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_SKIP_BROWSER_GC=1 node afprobe6.mjs webkit llselect $WK18
```

## State of the tree

- Branch `dev`, with no upstream; `npm run verify` passed with the fixes of round fourteen, with 783 core tests and 115 AngularJS tests.
- No review runs now, so the tree is not frozen.
