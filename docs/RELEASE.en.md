# Maintainer: How to release

[中文](RELEASE.md) | **English**

For maintainers. Pushing a `v*` tag runs GitHub Actions to test, build the portable exe, and create a Release.

## First time

1. Open the repo → **Actions**
2. Enable workflows if prompted
3. Pushes to `main` run **CI**; tags like `v0.2.0` run **Release**

## Ship a new version (e.g. 0.2.0)

1. Add `## [0.2.0] - date` (and notes) at the top of `CHANGELOG.md` and `CHANGELOG.en.md`
2. Set `version` in `package.json` / `package-lock.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` to `0.2.0` (optional; CI also syncs from the tag)
3. Commit and push `main`
4. Tag and push (triggers the release):

```bash
git tag v0.2.0
git push origin v0.2.0
```

5. Watch **Actions → Release** until green, then download `SaveSmith-0.2.0-windows-x64.exe` from **Releases**

## Notes

- Tag format: `v` + semver, e.g. `v0.2.0`
- Release body is generated from the Chinese `CHANGELOG.md` section (`scripts/changelog-for-version.mjs`)
- On failure, check the red step in the Actions log
- Local Windows needs Node, Rust, and MSVC; `windows-latest` on CI already has them
