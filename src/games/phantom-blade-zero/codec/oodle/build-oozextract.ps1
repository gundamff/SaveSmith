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
if ($LASTEXITCODE -ne 0) {
  throw "tar failed with exit code $LASTEXITCODE"
}

rustup target add wasm32-unknown-unknown
if ($LASTEXITCODE -ne 0) {
  throw "rustup target add failed with exit code $LASTEXITCODE"
}

$RustcVersion = rustc --version
if ($LASTEXITCODE -ne 0) {
  throw "rustc --version failed with exit code $LASTEXITCODE"
}
Write-Host "Building with $RustcVersion"

$InstalledBindgen = if (Get-Command wasm-bindgen -ErrorAction SilentlyContinue) {
  $VersionOutput = wasm-bindgen --version
  if ($LASTEXITCODE -ne 0) {
    throw "wasm-bindgen --version failed with exit code $LASTEXITCODE"
  }
  $VersionOutput
} else {
  ""
}
if ($InstalledBindgen -ne "wasm-bindgen $WasmBindgenVersion") {
  cargo install wasm-bindgen-cli --version $WasmBindgenVersion --locked
  if ($LASTEXITCODE -ne 0) {
    throw "cargo install wasm-bindgen-cli failed with exit code $LASTEXITCODE"
  }
}

cargo build `
  --manifest-path (Join-Path $Source "Cargo.toml") `
  --locked `
  --release `
  --target wasm32-unknown-unknown `
  --no-default-features `
  --features wasm
if ($LASTEXITCODE -ne 0) {
  throw "cargo build failed with exit code $LASTEXITCODE"
}

$InputWasm = Join-Path $Source "target\wasm32-unknown-unknown\release\oozextract.wasm"
New-Item $Output -ItemType Directory -Force | Out-Null
wasm-bindgen $InputWasm `
  --target web `
  --no-typescript `
  --out-dir $Output `
  --out-name oozextract
if ($LASTEXITCODE -ne 0) {
  throw "wasm-bindgen failed with exit code $LASTEXITCODE"
}

$Wasm = Join-Path $Output "oozextract_bg.wasm"
$Glue = Join-Path $Output "oozextract.js"
$GlueSource = [System.IO.File]::ReadAllText($Glue)
$DefaultUrlPattern = "(?ms)^    if \(typeof module_or_path === 'undefined'\) \{\r?\n        module_or_path = new URL\('oozextract_bg\.wasm', import\.meta\.url\);\r?\n    \}\r?\n"
$PatchedGlue = [regex]::Replace($GlueSource, $DefaultUrlPattern, "")
if ($PatchedGlue -eq $GlueSource) {
  throw "wasm-bindgen glue default URL branch was not found"
}
[System.IO.File]::WriteAllText(
  $Glue,
  $PatchedGlue,
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "Generated $Wasm ($((Get-Item $Wasm).Length) bytes)"
Write-Host "Generated $Glue ($((Get-Item $Glue).Length) bytes, default URL removed)"
