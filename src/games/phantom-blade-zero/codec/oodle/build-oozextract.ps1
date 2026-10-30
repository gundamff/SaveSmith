$ErrorActionPreference = "Stop"

$Version = "0.5.7"
$CrateSha256 = "890A74CC43300B8E482F62F989BCAB89EC760921B0CEA87AA5BBB7FDFEF1C013"
$WasmBindgenVersion = "0.2.95"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Output = Join-Path $Root "oozextract"
$Work = Join-Path ([System.IO.Path]::GetTempPath()) "savesmith-oozextract-$Version"
$Archive = Join-Path $Work "oozextract-$Version.crate"
$Source = Join-Path $Work "oozextract-$Version"

Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
New-Item $Work -ItemType Directory | Out-Null

Invoke-WebRequest `
  "https://crates.io/api/v1/crates/oozextract/$Version/download" `
  -OutFile $Archive

$ActualSha256 = (Get-FileHash $Archive -Algorithm SHA256).Hash
if ($ActualSha256 -ne $CrateSha256) {
  throw "oozextract archive SHA-256 mismatch: expected $CrateSha256, got $ActualSha256"
}

tar -xf $Archive -C $Work
rustup target add wasm32-unknown-unknown

$InstalledBindgen = if (Get-Command wasm-bindgen -ErrorAction SilentlyContinue) {
  wasm-bindgen --version
} else {
  ""
}
if ($InstalledBindgen -ne "wasm-bindgen $WasmBindgenVersion") {
  cargo install wasm-bindgen-cli --version $WasmBindgenVersion --locked
}

cargo build `
  --manifest-path (Join-Path $Source "Cargo.toml") `
  --release `
  --target wasm32-unknown-unknown `
  --no-default-features `
  --features wasm

$InputWasm = Join-Path $Source "target\wasm32-unknown-unknown\release\oozextract.wasm"
New-Item $Output -ItemType Directory -Force | Out-Null
wasm-bindgen $InputWasm `
  --target web `
  --no-typescript `
  --out-dir $Output `
  --out-name oozextract

$Wasm = Join-Path $Output "oozextract_bg.wasm"
Write-Host "Generated $Wasm ($((Get-Item $Wasm).Length) bytes)"
