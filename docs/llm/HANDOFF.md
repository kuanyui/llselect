# Handoff

Agent-facing state of the work in progress, so that a session after a context compaction can continue without the conversation. `$S` stands for this machine's session scratchpad, `/tmp/claude-1000/-workspaces-llselect/b8084c63-e5f2-4d64-a2cb-e34b550f2fe0/scratchpad`. `FIXME.md` holds every finding and ruling in full; this file says what waits for whom, and in which order.

## Waiting for the owner

1. NEEDS-VERIFICATION-840 (which chosen item becomes active at open, and the enabled condition) and NEEDS-VERIFICATION-850 (an `open()` call made while DOM focus is elsewhere, with the filter inactive): the owner was told they can wait.
2. Optional, from Fable 5 in the round on the owner's cost criterion: one sentence for the `popupEl` docstring that names `close()` inside `onOpen` as the supported way to stop an open, MEDIUM-862. It recommends an API pattern, so it waits for the owner.

MEDIUM-858 and MEDIUM-862 are ruled and fixed: `open()` undoes itself through `close()` when `showPopover()` throws, and a canceled `beforetoggle` is documented as unsupported. Round ten of the review found MEDIUM-865, QUALITY-866, DOCUMENTATION-867 and DOCUMENTATION-868, round eleven MEDIUM-869, QUALITY-870, DOCUMENTATION-871 and DOCUMENTATION-872, round twelve MEDIUM-873, QUALITY-874, DOCUMENTATION-875 and DOCUMENTATION-876, round thirteen DOCUMENTATION-877 and DOCUMENTATION-878, and round fourteen DOCUMENTATION-879 and DOCUMENTATION-880, all fixed.

The squash of the history: the owner adopted the form that merges the review rounds of each topic, so `master..dev` went from 152 commits to 42. The history before it stays on the branch `backup/dev-before-squash`, which holds the commit hashes that `FIXME.md` and `aria-committee.md` cite and the step-by-step diffs; it is local, so it must be pushed before anyone else needs those hashes. Each merged commit lists the commits it replaced in its body. The merged commit of the refused-show fix took an outcome-only subject, as Codex Sol asked in rounds ten to thirteen, and `43f25b9` took `fix: [src/i18n] update translations`, as the owner asked. `$S/squash-build.py rounds` built the form from `master..dev`, so a rebuild must now read the backup branch instead. The commit `be9f943`, signed by the owner, lost its signature in the rebuild.

## Next steps, in order

1. MEDIUM-795, the scroll gesture behavior, is implemented as ruled and resolved in `FIXME.md`, in three commits: the core with its tests, the AngularJS attribute, and the docs. Next: the post-implementation review of those three commits by the panel, each member in a fresh session at max effort.
   - The real-browser pass found that Chromium 156 makes a wheel over the top-layer popup cancelable only for a listener on the popup element itself, so the popup's gestures now go to listeners there; `FIXME.md` MEDIUM-795 holds the measurements and the lesson.
   - Not ruled by the owner, and done as the plain mapping of the core setting: the AngularJS attribute `ll-scroll-gesture-to-behavior-fn` and the `ll-on-close` local `$scrollGesture`. An app-wide default through `llselectConfigProvider`, natural for a preset, was not added.
   - The later steps, such as the drag behaviors, wait in `TODO.md` "Scroll-gesture behaviors - later steps", each with its own design round.

## How this session ran the reviews and the browser passes

The paths below use `$S`, defined at the top of this file.

- The panel runner: `$S/readme-dark/queue.sh <out-dir> 3 label:member:max:<brief> ...`, with the members `fable`, `opus5`, `opus48`, `opus55` and `sol`, run in the foreground of a background shell task, so that a notification arrives at the end. It keeps three members running at once under a memory watchdog.
- The reviews of the `focusInitial` loop: rounds one to nine in `$S/scroll/run19` and `$S/scroll/run21` to `run28`, named `fi-*.md` to `fi9-*.md`; the round on whether to fix MEDIUM-858 in `$S/scroll/run29`, named `w-*.md`; the round on the owner's cost criterion in `$S/scroll/run30`, named `c-*.md`, Codex Astra included; round ten in `$S/scroll/run31`, named `fi10-*.md`; round eleven in `$S/scroll/run32`, named `fi11-*.md`; round twelve in `$S/scroll/run33`, named `fi12-*.md`; round thirteen in `$S/scroll/run34`, named `fi13-*.md`; round fourteen in `$S/scroll/run35`, named `fi14-*.md`; the briefs in `$S/scroll/review-focusinitial*.md`, `$S/scroll/brief-858-whether.md` and `$S/scroll/brief-858-cheapest.md`.
- The MEDIUM-795 passes: `$S/scroll/gesture1.mjs <chromium|firefox|webkit> [webkit playwright path]` runs the wheel cases in every engine and the touch cases in Chromium, with the environment below; `$S/mut795/run.py [M1 ...]` applies each code mutation to `src/`, runs `test/behaviors.test.ts` and restores the files.
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

- Branch `dev`, with no upstream; `npm run verify` passed with MEDIUM-795, with 805 core tests and 116 AngularJS tests.
- No review runs now, so the tree is not frozen.
