# oozextract WASM provenance

- Package: `oozextract 0.5.7`
- Source: <https://crates.io/crates/oozextract/0.5.7>
- Repository revision recorded by the crate:
  `8acaeb2bc375dd56c413a83aae4e87156136fdac`
- crates.io archive SHA-256:
  `890A74CC43300B8E482F62F989BCAB89EC760921B0CEA87AA5BBB7FDFEF1C013`
- wasm-bindgen CLI: `0.2.95`
- Recorded build compiler: `rustc 1.98.1 (48a229cea 2026-09-01)`
- License declared by the package: `MIT`

`build-oozextract.ps1` downloads and verifies that exact archive, enables only
the upstream `wasm` feature, and deliberately leaves `x86_sse` disabled. The
checked-in `oozextract/oozextract_bg.wasm` and generated JavaScript glue are
the runtime artifacts; end users do not need Rust.

## Checked-in artifacts

- `oozextract_bg.wasm`: `216370` bytes, SHA-256
  `A4207524A1EDEE6A67BD8FB3707011ADB32A244595149D3DDF86FDDEDBC32A94`
- `oozextract.js`: `6413` bytes, SHA-256
  `2CA8BCA1A63E7AD41B4B3C9FE919C81ECE3B696F2D14FC68838F75FF6C9E012C`
- `oozextract.d.ts` is a hand-maintained minimal declaration for the
  wasm-bindgen `--no-typescript` output; it is not generated upstream.

The build script deterministically removes wasm-bindgen's unused default
`new URL("oozextract_bg.wasm", import.meta.url)` branch. The application
imports the checked-in WASM with Vite `?inline`, decodes the data URL itself,
and passes bytes to wasm-bindgen, so runtime initialization never calls
`fetch(data:)`.

## Vite production output

`npm run build` on this task's commit produces `dist/assets/index-L4FoziDX.js`
at `5503586` bytes. The Phantom Blade Zero module is not registered by this
supply-chain task, so Vite tree-shakes the currently unreachable Oodle codec:
no Oodle `.wasm`, glue chunk, data URL, or `oozextract_bg.wasm` reference is
present in `dist`. The only standalone WASM is the pre-existing
`sql-wasm-DfANybxk.wasm` at `658410` bytes. Removing the glue fallback URL
also prevents a future reachable import from emitting a second standalone
Oodle WASM beside the explicitly inlined bytes.

The upstream revision does not contain a license file even though its Cargo
metadata declares `MIT`. `LICENSE` therefore carries the canonical MIT text
for the redistributed package.
