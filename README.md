# torr9-scripting

Repository ready for Tampermonkey userscript development with:

- a clean `src -> dist` pipeline,
- automatic generation of `@updateURL` and `@downloadURL`,
- a dedicated `userscripts` publishing branch,
- a classic git flow based on `main`, `develop`, `feature/*`, `release/*` and `hotfix/*`.
- Python-only local tooling, so the workflow stays usable on Windows without Node.js.

## Structure

```text
.
├── .github/workflows/
├── src/userscripts/
├── tools/
├── CONTRIBUTING.md
├── Makefile
└── userscripts.json
```

- `src/userscripts/*.user.js`: source files you edit every day.
- `dist/`: generated publish-ready files (`*.user.js`, `*.meta.js`, `manifest.json`).
- `tools/build_userscripts.py`: injects repository URLs and builds Tampermonkey artifacts.
- `tools/bump_version.py`: updates the `@version` metadata of one source script.
- `Makefile`: optional shortcut for environments where `make` is available.

## Quick start

```bash
git switch develop
python3 tools/build_userscripts.py --check
python3 tools/build_userscripts.py
```

To list the available script ids:

```bash
python3 tools/build_userscripts.py --list
```

To bump a published version before a release:

```bash
python3 tools/bump_version.py blacklist-shoutbox 2.16.0
```

If `make` is available on your machine, the repository also exposes equivalent shortcuts through the `Makefile`.

## Tampermonkey auto-update

Published artifacts are served from the `userscripts` branch. For each source file in `src/userscripts`, the build generates:

- `dist/<script-id>.user.js`: installable script,
- `dist/<script-id>.meta.js`: lightweight metadata used by Tampermonkey update checks.

Current install URL for the existing script:

```text
https://raw.githubusercontent.com/SaltedButch/torr9-scripting/userscripts/blacklist-shoutbox.user.js
```

Current metadata URL:

```text
https://raw.githubusercontent.com/SaltedButch/torr9-scripting/userscripts/blacklist-shoutbox.meta.js
```

Those URLs are injected automatically at build time, so source files stay clean.

## Git flow

The intended branch policy is:

- `main`: production-ready source only.
- `develop`: staging branch for the next release.
- `feature/*`: new feature branches created from `develop`.
- `release/*`: release hardening branches created from `develop`.
- `hotfix/*`: urgent fixes created from `main`.
- `userscripts`: generated artifacts branch used by Tampermonkey.

Detailed release steps are documented in [CONTRIBUTING.md](/CONTRIBUTING.md).

## GitHub Actions

- `CI`: validates every userscript metadata block on pushes and pull requests.
- `Publish Userscripts`: rebuilds `dist/` on every push to `main` and publishes the result to `userscripts`.

## Next repository actions

1. Push the local `develop` branch to GitHub once created: `git push -u origin develop`
2. Optionally protect `main`, `develop` and `userscripts` in GitHub settings.
3. Install scripts in Tampermonkey from the raw `userscripts` URLs, never from `src/`.
