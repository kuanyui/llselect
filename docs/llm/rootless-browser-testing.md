# Rootless real-browser testing (no-sudo devcontainer)

How to run real Chromium / Firefox (Playwright) for llselect real-browser passes in this devcontainer, which has no sudo and no GUI libs / fonts.

- `npm i playwright && npx playwright install chromium firefox` in a scratch dir; browsers land in `~/.cache/ms-playwright`.
- Missing system libs: download debs via a user-dir apt sandbox (`apt-get -o Dir::State::Lists=$D/lists -o Dir::Cache=$D/cache update / download <pkgs>`), extract with `dpkg-deb -x` into a prefix, run with `LD_LIBRARY_PATH=<prefix>/usr/lib/x86_64-linux-gnu`. Debian trixie names need the `t64` variants (libasound2t64, libgtk-3-0t64, ...); transitive stragglers were libcloudproviders0 + libjpeg62-turbo.
- Whole closure in one go: `apt-get -o Dir::State::Lists=$D/lists -o Dir::Cache=$D/cache -o Dir::State::Status=/var/lib/dpkg/status -o Debug::NoLocking=1 install --download-only -y <pkgs>` resolves the dependency closure against the installed system into `$D/cache/archives` (no straggler hunting), then `dpkg-deb -x` each deb into the prefix. Headless Chromium (`chromium_headless_shell`, what `chromium.launch({ headless: true })` runs) needs no GTK / cups / pango: the 13 libs `ldd` reports missing (nss, nspr, atk, atspi, gbm, asound, xkbcommon, Xcomposite / Xdamage / Xfixes / Xrandr) plus `fonts-dejavu-core` came to 46 debs. Launch with `chromiumSandbox: false` and `--disable-dev-shm-usage`.
- Serve `public/` from inside the Playwright script (a few lines of `node:http`): a background `python3 -m http.server` started from a tool call does not outlive the call.
- No `/etc/fonts` exists: write a minimal fonts.conf pointing `<dir>` at extracted fonts (fonts-dejavu-core, fonts-noto-core, fonts-noto-cjk) plus a writable `<cachedir>`, export `FONTCONFIG_FILE`.
- Firefox content processes ignore `FONTCONFIG_FILE` unless `MOZ_DISABLE_CONTENT_SANDBOX=1` is set (symptom: tofu boxes in screenshots while Chromium renders fine).
- Headless hides real scrollbars (`--hide-scrollbars`), so literal scrollbar-drag gestures cannot be tested headless - test the mousedown-guard mechanism instead; `page.mouse.wheel` works.
- Playwright's `ariaSnapshot()` gives computed accessible names in BOTH engines - it is what caught the tags-trigger accname duplication (`FIXME.md`, MEDIUM-31).

The a11y / visual / ng / bench runner harness lived in a session scratchpad and is not committed; recreate it from this recipe when needed.
