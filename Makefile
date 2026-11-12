# Release runbook. `make help` lists targets; `make release` runs the whole
# flow. Day-to-day verification stays `npm run verify` (shared with CI).

VERSION := $(shell node -p "require('./package.json').version")

.PHONY: help verify check-version login check-login push publish-core publish-angularjs publish tag release build server

help: ## list targets
	@grep -E '^[a-z-]+:.*##' Makefile | awk -F ':.*## ' '{ printf "  make %-18s %s\n", $$1, $$2 }'

verify: ## full pipeline, same command CI runs
	npm run verify

check-version: ## fail if package.json version is already on the registry (bump first)
	@if [ "$$(npm view @llselect/core version 2>/dev/null)" = "$(VERSION)" ]; then \
	  echo "ERROR: @llselect/core@$(VERSION) is already published - bump first:"; \
	  echo "  package.json + angularjs/package.json versions, angularjs peer range,"; \
	  echo "  src/index.ts version const, then npm install in both dirs (lockfiles)"; \
	  exit 1; \
	fi
	@echo "OK: $(VERSION) is unpublished"

login: ## ensure the npm token is alive (tokens expire; auth failure shows as 404)
	@npm whoami >/dev/null 2>&1 || npm login
	@echo "npm user: $$(npm whoami)"

# With a token, npm whoami asks the registry whose token it is; with a
# username and password in .npmrc, it only prints the username. Either way it
# proves no right to publish: after its tests, npm publish can still ask for a
# one-time password, or fail on a missing package permission or on a token
# that expired after the check.
check-login: ## stop at once unless npm knows the login; every publish runs it before its tests
	@user=$$(npm whoami 2>/dev/null) || { echo "ERROR: npm whoami failed (not logged in, an expired token, or no network): run make login, then publish again"; exit 1; }; echo "npm user: $$user"

push: ## push master to both remotes
	git push github master
	git push gitlab master

publish-core: check-login ## publish @llselect/core (prepublishOnly: check + build + test)
	npm publish

publish-angularjs: check-login ## publish @llselect/angularjs (AFTER core - its peer range needs core on the registry)
	cd angularjs && npm install && npm publish

publish: publish-core publish-angularjs ## both packages, in dependency order

tag: ## annotated v<version> tag on HEAD, pushed to both remotes
	git tag -a v$(VERSION) -m "$(VERSION)"
	git push github v$(VERSION)
	git push gitlab v$(VERSION)

release: check-version login push publish tag ## the whole flow: guard, auth, push, publish, tag
	@echo "released: @llselect/core@$$(npm view @llselect/core version) @llselect/angularjs@$$(npm view @llselect/angularjs version)"


build: ## build the library into dist/ (d.ts, bundles, themes)
	npm run build

server: build ## build the library and the site, then serve public/ at localhost
	npm run 'serve:site'
