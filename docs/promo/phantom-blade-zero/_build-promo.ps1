# Rebuild PBZ promo to match Belmont quality: loud TTS, sharp 1080p stills, burned subtitles.
$ErrorActionPreference = 'Continue'
$ff = "C:\Users\zhang\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
$fp = "C:\Users\zhang\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffprobe.exe"
$promo = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $promo '..\..\..')).Path
$shot = Join-Path $root 'docs\screenshot'
$work = Join-Path $promo '_work'
$audio = Join-Path $promo '_audio'
$slides = Join-Path $promo '_slides'
foreach ($d in @($work, $audio, $slides)) {
  if (Test-Path $d) { Remove-Item $d -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

function Invoke-FFmpeg([string[]]$ArgumentList) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  & $ff @ArgumentList 2>&1 | Out-Null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  if ($code -ne 0) { throw "ffmpeg failed ($code): $($ArgumentList -join ' ')" }
}

function Get-Duration([string]$path) {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  $o = & $fp -v error -show_entries format=duration -of default=nk=1:nw=1 $path 2>&1 | Out-String
  $ErrorActionPreference = $prev
  $v = 0.0
  [void][double]::TryParse(($o.Trim()), [ref]$v)
  if ($v -le 0) { return 3.0 }
  return $v
}

# --- 1) Canonical screenshot names (Belmont style) ---
$map = @{
  'QQ_1793412531062.png' = 'phantom-blade-zero-materials.png'
  'QQ_1793412545223.png' = 'phantom-blade-zero-add-material.png'
  'QQ_1793412555250.png' = 'phantom-blade-zero-growth.png'
  'QQ_1793412559865.png' = 'phantom-blade-zero-add-growth.png'
  '3b919e56fbc1991d0bfd11cf5e8f9a0f.png' = 'phantom-blade-zero-ingame-weapon.png'
}
foreach ($k in $map.Keys) {
  $src = Join-Path $shot $k
  $dst = Join-Path $shot $map[$k]
  if (Test-Path $src) { Copy-Item $src $dst -Force }
}

# --- 2) Sharp 1920x1080 slides (pad, never upscale blur from tiny sources) ---
Add-Type -AssemblyName System.Drawing
function New-Slide([string]$SrcPath, [string]$OutPath, [string]$Subtitle) {
  $img = [System.Drawing.Image]::FromFile($SrcPath)
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(18, 22, 28))
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.TextRenderingHint = 'ClearTypeGridFit'
  $scale = [Math]::Min(1920.0 / $img.Width, 1080.0 / $img.Height)
  $dw = [int]($img.Width * $scale)
  $dh = [int]($img.Height * $scale)
  $dx = [int]((1920 - $dw) / 2)
  $dy = [int]((1080 - $dh) / 2)
  $g.DrawImage($img, $dx, $dy, $dw, $dh)
  if ($Subtitle) {
    $bar = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $g.FillRectangle($bar, 0, 980, 1920, 100)
    $bar.Dispose()
    $font = New-Object System.Drawing.Font 'Microsoft YaHei UI', 34, ([System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF 40, 980, 1840, 100
    $g.DrawString($Subtitle, $font, [System.Drawing.Brushes]::White, $rect, $sf)
    $font.Dispose(); $sf.Dispose()
  }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

function New-Card([string]$OutPath, [string]$Line1, [string]$Line2, [string]$Subtitle) {
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(18, 22, 28))
  $g.TextRenderingHint = 'ClearTypeGridFit'
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $f1 = New-Object System.Drawing.Font 'Microsoft YaHei UI', 56, ([System.Drawing.FontStyle]::Bold)
  $f2 = New-Object System.Drawing.Font 'Microsoft YaHei UI', 36, ([System.Drawing.FontStyle]::Regular)
  $cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 92, 225, 230))
  $g.DrawString($Line1, $f1, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 420, 1920, 90), $sf)
  if ($Line2) {
    $g.DrawString($Line2, $f2, $cyan, (New-Object System.Drawing.RectangleF 0, 530, 1920, 70), $sf)
  }
  if ($Subtitle) {
    $bar = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $g.FillRectangle($bar, 0, 980, 1920, 100)
    $bar.Dispose()
    $f3 = New-Object System.Drawing.Font 'Microsoft YaHei UI', 34, ([System.Drawing.FontStyle]::Bold)
    $g.DrawString($Subtitle, $f3, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 40, 980, 1840, 100), $sf)
    $f3.Dispose()
  }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  foreach ($x in @($g, $bmp, $f1, $f2, $cyan, $sf)) { $x.Dispose() }
}

New-Card (Join-Path $slides 'title.png') '影之刃零 · 存档修改演示' 'SaveSmith 存档酱' '影之刃零 · 存档修改演示'
New-Slide (Join-Path $shot 'phantom-blade-zero-materials.png') (Join-Path $slides 'materials.png') '意识尘埃 / 武器强化材料：可改、可添加、可删除'
New-Slide (Join-Path $shot 'phantom-blade-zero-add-material.png') (Join-Path $slides 'add-material.png') '按中文名或 ID 搜索添加武器材料'
New-Slide (Join-Path $shot 'phantom-blade-zero-growth.png') (Join-Path $slides 'growth.png') '养成页：穿行符等可添加；累加阈值类永久加成一般不生效'
New-Slide (Join-Path $shot 'phantom-blade-zero-add-growth.png') (Join-Path $slides 'add-growth.png') '养成物品目录可浏览与添加'
New-Slide (Join-Path $shot 'phantom-blade-zero-ingame-weapon.png') (Join-Path $slides 'ingame.png') '游戏内对照：材料可用于武器强化'
New-Card (Join-Path $slides 'notice.png') '退出游戏 · 关云同步 · 自动备份' '后续会有更多修改内容，敬请期待' '后续会有更多修改内容，敬请期待'
$endSrc = Join-Path $promo 'endcard.png'
New-Slide $endSrc (Join-Path $slides 'endcard.png') '存档酱 · 开源本地改档 · 自动备份'

# --- 3) Loud clear TTS (Huihui), 48kHz WAV, then loudnorm ---
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
$hui = $voices | Where-Object { $_ -match 'Huihui' } | Select-Object -First 1
if ($hui) { $synth.SelectVoice($hui) }
$synth.Rate = -1
$synth.Volume = 100
$lines = @(
  @{ f = 'n1.wav'; t = '打开影之刃零模块。资源页可以直接改意识尘埃。武器强化材料能按中文名或编号搜索添加，也能改数量和删除。' },
  @{ f = 'n2.wav'; t = '点击添加物品，可以浏览全部武器强化材料，按名称筛选后确认添加。' },
  @{ f = 'n3.wav'; t = '养成页支持穿行符等养成材料。黑石这类累加阈值道具，改数量一般不会崩溃，但永久加成通常不会生效。' },
  @{ f = 'n4.wav'; t = '养成目录同样可以搜索添加。改完保存后，进游戏对照效果。' },
  @{ f = 'n5.wav'; t = '游戏内可以看到材料数量，并用于武器强化。效果请以局内为准。' },
  @{ f = 'n6.wav'; t = '改前请完全退出游戏，并暂时关闭 Steam 云同步。后续会有更多修改内容，敬请期待。' },
  @{ f = 'n7.wav'; t = '存档酱，开源本地改档，自动备份。GitHub 搜索 SaveSmith。' }
)
foreach ($l in $lines) {
  $raw = Join-Path $audio ("raw_" + $l.f)
  $out = Join-Path $audio $l.f
  $synth.SetOutputToWaveFile($raw)
  $synth.Speak($l.t)
  $synth.SetOutputToNull()
  # Boost + loudnorm to Belmont-like clarity
  Invoke-FFmpeg @('-y', '-i', $raw, '-af', 'volume=8dB,loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', '-ac', '2', $out)
  Remove-Item $raw -Force
}
$synth.Dispose()

# --- 4) Encode clips: still + audio, high quality ---
function New-Clip([string]$img, [string]$wav, [string]$out, [double]$minDur = 3.0) {
  if ($wav -and (Test-Path $wav)) {
    $dur = [Math]::Max((Get-Duration $wav) + 0.6, $minDur)
    Invoke-FFmpeg @(
      '-y', '-loop', '1', '-framerate', '60', '-i', $img, '-i', $wav,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-tune', 'stillimage',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-pix_fmt', 'yuv420p', '-r', '60', '-t', ('{0:0.000}' -f $dur), '-shortest',
      '-movflags', '+faststart', $out
    )
  } else {
    Invoke-FFmpeg @(
      '-y', '-loop', '1', '-framerate', '60', '-i', $img,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-tune', 'stillimage',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-pix_fmt', 'yuv420p', '-r', '60', '-t', ('{0:0.000}' -f $minDur), '-shortest',
      '-movflags', '+faststart', $out
    )
  }
}

New-Clip (Join-Path $slides 'title.png') $null (Join-Path $work 'title.mp4') 3.0
New-Clip (Join-Path $slides 'materials.png') (Join-Path $audio 'n1.wav') (Join-Path $work 'materials.mp4')
New-Clip (Join-Path $slides 'add-material.png') (Join-Path $audio 'n2.wav') (Join-Path $work 'add-material.mp4')
New-Clip (Join-Path $slides 'growth.png') (Join-Path $audio 'n3.wav') (Join-Path $work 'growth.mp4')
New-Clip (Join-Path $slides 'add-growth.png') (Join-Path $audio 'n4.wav') (Join-Path $work 'add-growth.mp4')
New-Clip (Join-Path $slides 'ingame.png') (Join-Path $audio 'n5.wav') (Join-Path $work 'ingame.mp4')
New-Clip (Join-Path $slides 'notice.png') (Join-Path $audio 'n6.wav') (Join-Path $work 'notice.mp4')
New-Clip (Join-Path $slides 'endcard.png') (Join-Path $audio 'n7.wav') (Join-Path $work 'endcard.mp4')

# Normalize intro to same A/V params
$introSrc = Join-Path (Split-Path $promo -Parent) 'intro-savesmith.mp4'
Invoke-FFmpeg @(
  '-y', '-i', $introSrc,
  '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x12161c',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '60', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  (Join-Path $work 'intro.mp4')
)

$workUnix = $work.Replace('\', '/')
$list = @(
  "file '$workUnix/intro.mp4'",
  "file '$workUnix/title.mp4'",
  "file '$workUnix/materials.mp4'",
  "file '$workUnix/add-material.mp4'",
  "file '$workUnix/growth.mp4'",
  "file '$workUnix/add-growth.mp4'",
  "file '$workUnix/ingame.mp4'",
  "file '$workUnix/notice.mp4'",
  "file '$workUnix/endcard.mp4'"
)
$listPath = Join-Path $work 'list.txt'
Set-Content -Path $listPath -Value $list -Encoding ASCII

$out = Join-Path $promo 'savesmith-phantom-blade-zero.mp4'
Invoke-FFmpeg @(
  '-y', '-f', 'concat', '-safe', '0', '-i', $listPath,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '60', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', $out
)

Write-Host '--- output ---'
Get-Item $out | Format-List FullName, Length
& $fp -v error -show_entries format=duration,bit_rate -show_entries stream=codec_type,bit_rate,width,height,sample_rate -of default $out
