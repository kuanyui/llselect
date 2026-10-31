# Handoff

Agent-facing state of the work in progress, so that a session after a context compaction can continue without the conversation. `FIXME.md` holds every finding and ruling in full; this file says what waits for whom, and in which order.

## Waiting for the owner

1. MEDIUM-858, an open of a select component while another popover's `showPopover()` runs: the owner picks option A (no fix, known limitation), B (catch, undo, rethrow) or C (a per-document record of llselect shows), or asks the panel again with the new measurements. The entry holds the problem, the measurements, every option with its pros and cons and its supporters, and the agent's recommendation, B. The owner first leaned to no fix, because of the complexity; the measurements since then showed one `beforetoggle` listener reaching the defect and a blind keyboard choice in the stuck state.
2. NEEDS-VERIFICATION-840 (which chosen item becomes active at open, and the enabled condition) and NEEDS-VERIFICATION-850 (an `open()` call made while DOM focus is elsewhere, with the filter inactive): the owner was told they can wait.

## Next steps, in order

1. After the owner's pick on MEDIUM-858, fix it together with MEDIUM-862 (a canceled `beforetoggle`, and the wrong `display: none !important` comment in `open()`), DOCUMENTATION-863 (the open doc findings of round nine) and DOCUMENTATION-864 (the open record findings of round nine). If the pick is A, the docs must teach `setTimeout(() => sel.open())`, not `queueMicrotask`, and `$timeout`, not `$evalAsync`, in AngularJS.
2. Run `npm run verify`, commit in parts, then run post-fix round ten of the `focusInitial` review with the five panel members, and handle it under the stop rule of `CLAUDE.md`.
3. When that review ends, implement MEDIUM-795, the scroll gesture behavior. Its design and names are ruled; the MEDIUM-795 entry in `FIXME.md` holds every ruling. In short:
   - a new module `behaviors.ts` under `src/` holds the types and the gesture code; `base.ts` only wires the setting, the protected method and the listeners;
   - the presets live in one file, `behavior-presets.ts` under `src/`, built as its own entry point `@llselect/core/behavior-presets`, like `./i18n`: `behaviorPresetsOfLLSelectDefault`, `behaviorPresetsOfFirefoxOnWindows` and `behaviorPresetsOfChromiumOnWindows`, plain objects spread into the settings; `base.ts` imports `behaviorPresetsOfLLSelectDefault` as its default, the way it imports `src/i18n/en.ts`; after the build, check that `dist/index.mjs` holds no Firefox or Chromium preset;
   - the setting `scrollGestureToBehaviorFn`, the protected method `scrollGestureToBehavior`, and `defaultScrollGestureToBehavior`, exported from `@llselect/core`; one function per behavior group, not one function for every group;
   - `LLSelectScrollGesture` has `kind: LLSelectScrollGestureKind`, `'wheel' | 'touch-start' | 'touch-drag' | 'touch-end'`, and `zone: LLSelectScrollGestureZone`, `'popup' | 'trigger' | 'outside'`; `'touch-end'` carries a `TODO:` comment that it is not implemented yet, and its docstring says that the library does not send it; the `'wheel'` docstring says that a mouse wheel and a touchpad both give it;
   - `LLSelectScrollGestureBehavior` is `'leave-popup-open-and-allow-page-scroll' | 'leave-popup-open-and-block-page-scroll' | 'close-popup-and-allow-page-scroll' | 'close-popup-and-block-page-scroll'`, a string union;
   - a close by a gesture has the reason `'scroll-gesture'` and the gesture in `meta.scrollGesture`; no `source` field;
   - the name of the protected predicate that decides whether to listen outside the select component (ruling 3A) is not ruled yet; the design review used `isScrollGestureObservedOutside`.
   The drag behaviors (choosing on release, the active row during a drag) are a later, separate behavior group with their own design round; `native-select-scrolling.md` holds the owner's tests.

## How this session ran the reviews and the browser passes

The paths below are this machine's session scratchpad; `S` stands for `/tmp/claude-1000/-workspaces-llselect/b8084c63-e5f2-4d64-a2cb-e34b550f2fe0/scratchpad`.

- The panel runner: `$S/readme-dark/queue.sh <out-dir> 3 label:member:max:<brief> ...`, with the members `fable`, `opus5`, `opus48`, `opus55` and `sol`, run in the foreground of a background shell task, so that a notification arrives at the end. It keeps three members running at once under a memory watchdog.
- The reviews of the `focusInitial` loop: rounds one to nine in `$S/scroll/run19` and `$S/scroll/run21` to `run28`, named `fi-*.md` to `fi9-*.md`; the round on whether to fix MEDIUM-858 in `$S/scroll/run29`, named `w-*.md`; the briefs in `$S/scroll/review-focusinitial*.md` and `$S/scroll/brief-858-whether.md`.
- The headless probes: `$S/scroll/afprobe*.mjs`, which load `dist/index.umd.js`, so run `npm run build` first. `afprobe5.mjs` holds the latest MEDIUM-858 and MEDIUM-862 cases. They run in Chromium, Firefox and two WebKit builds with the environment below; `rootless-browser-testing.md` explains the parts.

```sh
S=/tmp/claude-1000/-workspaces-llselect/b8084c63-e5f2-4d64-a2cb-e34b550f2fe0/scratchpad; cd $S/scroll
CH=/tmp/claude-1000/-workspaces-llselect/5aeec04e-3b33-46c0-9b4f-8931b6f9b730/scratchpad/apt/prefix/usr/lib/x86_64-linux-gnu
P=/home/user/.cache/llselect-webkit-prefix; FC=$S/dom-diagram/fonts.conf
LIBDIRS=$(find $P -name '*.so*' -printf '%h\n' | sort -u | tr '\n' ':')
WK="PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 FONTCONFIG_FILE=$FC LD_LIBRARY_PATH=$LIBDIRS GIO_MODULE_DIR=$P/usr/lib/x86_64-linux-gnu/gio/modules GST_PLUGIN_PATH=$P/usr/lib/x86_64-linux-gnu/gstreamer-1.0 GSETTINGS_SCHEMA_DIR=$P/usr/share/glib-2.0/schemas GSETTINGS_BACKEND=memory __EGL_VENDOR_LIBRARY_DIRS=$P/usr/share/glvnd/egl_vendor.d LIBGL_DRIVERS_PATH=$P/usr/lib/x86_64-linux-gnu/dri LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe EGL_PLATFORM=surfaceless XDG_RUNTIME_DIR=/tmp/claude-1000/xdg-wk"
WK18=$(grep -o "/home/user/.npm/_npx/[0-9a-f]*/node_modules/playwright-core/index.mjs" hidden-wk18.mjs | head -1)
for e in chromium firefox; do LD_LIBRARY_PATH=$P/usr/lib/x86_64-linux-gnu:$CH FONTCONFIG_FILE=$FC MOZ_DISABLE_CONTENT_SANDBOX=1 node afprobe5.mjs $e; done
env $WK node afprobe5.mjs webkit
env $WK PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_SKIP_BROWSER_GC=1 node afprobe5.mjs webkit $WK18
```

## State of the tree

- Branch `dev`, with no upstream; `npm run verify` passed at the last code commit, `4c9ea33`, with 777 core tests and 115 AngularJS tests.
- No review runs now, so the tree is not frozen.
