# oozextract WASM provenance

- Package: `oozextract 0.5.7`
- Source: <https://crates.io/crates/oozextract/0.5.7>
- Repository revision recorded by the crate:
  `8acaeb2bc375dd56c413a83aae4e87156136fdac`
- crates.io archive SHA-256:
  `890A74CC43300B8E482F62F989BCAB89EC760921B0CEA87AA5BBB7FDFEF1C013`
- wasm-bindgen CLI: `0.2.95`
- License declared by the package: `MIT`

`build-oozextract.ps1` downloads and verifies that exact archive, enables only
the upstream `wasm` feature, and deliberately leaves `x86_sse` disabled. The
checked-in `oozextract/oozextract_bg.wasm` and generated JavaScript glue are
the runtime artifacts; end users do not need Rust.

The upstream revision does not contain a license file even though its Cargo
metadata declares `MIT`. `LICENSE` therefore carries the canonical MIT text
for the redistributed package.
