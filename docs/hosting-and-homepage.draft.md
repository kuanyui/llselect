# Homepage + Pages hosting - exploration (DRAFT, do not commit)

Scratch analysis for two things: turning the README into a homepage, and hosting the homepage + demos cleanly on Pages, reusable across future projects. Nothing here is decided or built. This file is intentionally NOT committed.

## Update: the repo lives on GitLab - this settles most of it

`git remote -v` shows the only remote is `git@gitlab.com:kuanyui/llselect.git` (the README links point to gitlab.com/kuanyui/llselect too). The blog is a Hexo site on GitHub Pages. So the repo and the blog are on DIFFERENT hosts, which dissolves the two worries:

- Blog interference: deploy the demo to GitLab Pages (`kuanyui.gitlab.io/llselect/`). It shares nothing with the GitHub/Hexo blog - different platform - so no Hexo deploy can touch it, and no `/blog/` prefix is needed. (Even on one host, a project page at `/<repo>/` never overwrites the user/blog page at `/`; moot here.)
- "Works on GitLab too / stable + shared": the repo is ON GitLab, so GitLab Pages is the primary target, not an afterthought. The shared, portable piece is the BUILD (`public/` of static files with relative paths); GitLab runs it first, and the identical output would deploy on GitHub if ever mirrored.

Recommended plan (least machinery, most maintainable):

| Item | Choice | Why |
|---|---|---|
| Host | GitLab Pages (where the repo is) | zero overlap with the GitHub blog |
| URL | per-repo `kuanyui.gitlab.io/llselect/` | simplest/stable; `/projects/` prefix needs an umbrella repo (extra aggregation) |
| Output | `scripts/build-site.mjs` -> `public/` (render README + copy demo + copy dist) | one portable node script; GitHub could run the same |
| Layout | mirror: `public/index.html` + `public/demo/*` + `public/dist/*` | preserves the demo `-> ../dist` relative link; NO path rewriting |
| Landing | rendered from `README.md` | single source of truth (add a `marked` devDep) |
| CI | `.gitlab-ci.yml` `pages` job: `npm ci && npm run build && node scripts/build-site.mjs` | master stays the only source; no build artifacts committed |

Verified: every internal ref in the demo pages is already relative (`../dist/`, `style.css`, `main.js`), so the same `public/` works under any prefix or host.

CDN is a later drop-in: it needs an npm publish first (and then the demo would exercise the published version, not the repo). Solve the dist-build deploy now; switching to CDN later just deletes the build-dist step.

## Q7 - README.md -> homepage/index.html (+ examples.html)

Three ways, cheapest first:

1. Hand-written static homepage that mirrors the README intro. This is basically what `demo/index.html` already is, minus the README prose. Zero tooling; drifts from the README by hand.
2. Build-time render: a tiny script (marked / markdown-it) renders `README.md` -> `index.html` at CI time, wrapped in a page template. One source of truth (the README), no SSG framework, ~30 lines. Re-runs on every push.
3. Static site generator (Hugo / Eleventy / Astro): layouts, nav, multi-page, syntax highlight - at the cost of a toolchain and templates to maintain.

Recommendation: for a homepage plus a couple of demo pages, option 2 (render the README, keep the hand-written demo pages) is the cleanest and most maintainable. Reach for an SSG only once you have many pages or blog-like structure. Note the demo pages (`examples.html`, `frameworks.html`, `benchmark.html`) are already hand-written and should stay that way; only the landing page is worth deriving from the README.

## Q8 - GitLab Pages: clean + maintainable, `/projects/<name>/`, reusable

Facts:

- GitLab Pages publishes whatever a CI `pages` job puts in `public/`. PLAIN static files work - Hugo is NOT required. GitLab has no built-in renderer of its own; the "renderer" is whatever the job runs (nothing, or an SSG you choose). The old built-in templates are just starter `.gitlab-ci.yml` files, not magic.
- Default URL: `https://<user>.gitlab.io/<project>/`. The `/<project>/` segment is the repo name, not a folder you pick.

Two layouts for a reusable `/projects/<name>/`:

- (a) Per-project Pages: each repo ships its own `public/`; URL is `<user>.gitlab.io/<repo>/`. Simple, isolated, but the prefix is the repo name, not `/projects/`.
- (b) One umbrella Pages repo - the user/group Pages project named `<user>.gitlab.io` - whose `public/projects/<name>/` holds each project's built demo. URL becomes `<user>.gitlab.io/projects/<name>/`: exactly the prefix you want, one place to maintain. Cost: it must ASSEMBLE each project's demo, via git submodules, a multi-project pipeline that copies build artifacts, or a monorepo.

Recommendation: if the `/projects/<name>/` prefix matters to you, go (b) - a single umbrella Pages repo that pulls each project's `demo/` build into `public/projects/<name>/`. If `<user>.gitlab.io/<repo>/` is acceptable, (a) is far less machinery. Either can sit behind a custom domain (e.g. `projects.<you>.dev`).

## Q9 - GitHub `/` is a blog; where do projects go

- GitHub PROJECT Pages live at `<user>.github.io/<repo>/` and are INDEPENDENT of the user/root Pages (your blog at `/`). The blog can stay at `/` untouched while each project publishes at `/<repo>/`; they do not collide.
- Common patterns:
  1. Blog at GitHub root; each project's demo as a GitHub project Page (`<user>.github.io/<repo>/`). Zero extra infra.
  2. Blog at GitHub root; all project demos on GitLab Pages (keeps the two concerns on separate hosts and gives the `/projects/` grouping via Q8b).
  3. Everything under a custom domain with paths you fully control.

Recommendation: keep the blog on the GitHub root - don't move it. For projects, either accept per-repo GitHub Pages (`<user>.github.io/llselect/`, least effort) or, if you want the tidy `/projects/llselect/` prefix and a single maintenance point, use the GitLab umbrella repo from Q8b.

### GitHub Pages mechanics: branch vs Actions (and why `dist/` forces the choice)

- A `gh-pages` branch is NOT automatic and NOT required. It is an old convention: a tool pushes built files to a `gh-pages` branch and Pages serves that branch. The modern native path deploys a built artifact directly, with no such branch.
- Settings -> Pages -> "Build and deployment" -> Source has two modes:
  1. Deploy from a branch: pick any branch (`master` is fine) + a folder (`/` or `/docs`). GitHub serves those files AS-IS (Jekyll runs unless a `.nojekyll` file is present). It does NOT build your code.
  2. GitHub Actions: a workflow builds and deploys a Pages artifact. No branch to manage, no committed build output.
- Constraint for this repo: `dist/` is gitignored (0 tracked files - correct, it is a build output), and the demo pages hard-depend on `../dist/index.mjs`, `../dist/i18n.mjs`, `../dist/index.umd.js`, `../dist/themes/*.css`. So a raw branch-deploy from `master` serves a BROKEN demo (no `dist/` on GitHub -> 404s). A README render is itself a build step too.
- Therefore: use GitHub Actions. `master` stays the single source; CI runs `npm ci && npm run build` (produces `dist/`), renders `README.md` -> `index.html`, assembles a `public/` (hand-written demo pages + `dist/` + the rendered landing page), and deploys it. No `gh-pages` branch, no committed build artifacts.
- Rejected alternatives: (a) commit `dist/` and branch-deploy - violates the repo's .gitignore / build-output policy; (b) switch the demo to load llselect from a CDN so no local `dist/` is needed - requires publishing to npm first and then the demo exercises the published version, not the current repo.
- Published-layout note (decide at build time): the demo pages use `../dist/...` relative paths, so `public/` must preserve that demo-to-dist relationship (mirror `public/demo/` + `public/dist/`), or the assembly step rewrites `../dist/` to a root-relative path when flattening the pages to `public/`.

## Serving BOTH GitHub Pages and GitLab Pages at once

One portable build, two thin CI adapters, kept in sync by a push mirror. The shared piece is `scripts/build-site.mjs` -> `public/` (exposed as `npm run build:site`); because the demo uses relative paths, the identical `public/` works under `/llselect/` on either host.

- GitLab (primary, where the repo lives): `.gitlab-ci.yml` `pages` job runs `npm ci && npm run build:site` with `artifacts: public`. Serves `kuanyui.gitlab.io/llselect/`.
- GitHub (secondary mirror): `.github/workflows/pages.yml` runs the same `build:site`, then `actions/upload-pages-artifact` (path `public`) + `actions/deploy-pages`. Serves `<ghuser>.github.io/llselect/`. The Actions path does not run Jekyll (no `.nojekyll` needed) and needs no `gh-pages` branch.
- Both config files coexist in one repo (GitLab ignores `.github/`, GitHub ignores `.gitlab-ci.yml`).
- Reaching both hosts from a GitLab-only origin: GitLab's built-in Push Mirror (Settings -> Repository -> Mirroring) auto-pushes every commit to a GitHub mirror repo. You push only to GitLab; each host's CI builds and deploys its own Pages. Single source of truth, no manual dual-push.
- Reuse: copy the two CI files + `build-site.mjs` into any future project for instant dual-host Pages.
- Open question: is the GitHub copy actually needed? The repo is on GitLab, so GitLab Pages alone is the least machinery (one CI file, no mirror). GitHub is only worth it for reach / redundancy.

## Cross-cutting note

The homepage build (Q7) and the demos already share `demo/`. Whatever the host, the published artifact is the same static `demo/` folder plus a README-derived landing page. Keep the build host-agnostic - produce a `public/` folder - so GitHub and GitLab stay interchangeable and you are never locked in.

## Open choices for you

- Host for project demos: GitHub per-repo vs GitLab umbrella (`/projects/`).
- Landing page: hand-written vs README-rendered (option 2) vs SSG.
- If GitLab umbrella: submodules vs artifact-copy vs monorepo to assemble it.
