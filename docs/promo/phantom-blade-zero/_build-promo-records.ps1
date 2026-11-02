# Records-only PBZ promo (0.17.2): loud TTS, 1080p stills, burned subtitles.
$ErrorActionPreference = 'Continue'
$ff = "C:\Users\zhang\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
$fp = "C:\Users\zhang\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffprobe.exe"
$promo = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $promo '..\..\..')).Path
$shot = Join-Path $root 'docs\screenshot'
$work = Join-Path $promo '_work_records'
$audio = Join-Path $promo '_audio_records'
$slides = Join-Path $promo '_slides_records'
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

Add-Type -AssemblyName System.Drawing

function New-Card([string]$OutPath, [string]$Title, [string]$Sub, [string]$Subtitle) {
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(18, 22, 28))
  $g.SmoothingMode = 'HighQuality'
  $g.TextRenderingHint = 'ClearTypeGridFit'
  $cyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 64, 196, 180))
  $f1 = New-Object System.Drawing.Font 'Microsoft YaHei UI', 52, ([System.Drawing.FontStyle]::Bold)
  $f2 = New-Object System.Drawing.Font 'Microsoft YaHei UI', 28, ([System.Drawing.FontStyle]::Regular)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $g.DrawString($Title, $f1, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 80, 360, 1760, 120), $sf)
  $g.DrawString($Sub, $f2, $cyan, (New-Object System.Drawing.RectangleF 80, 500, 1760, 80), $sf)
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

function New-Slide([string]$SrcPath, [string]$OutPath, [string]$Subtitle) {
  $img = [System.Drawing.Image]::FromFile($SrcPath)
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(18, 22, 28))
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.TextRenderingHint = 'ClearTypeGridFit'
  $scale = [Math]::Min(1920.0 / $img.Width, 980.0 / $img.Height)
  $dw = [int]($img.Width * $scale)
  $dh = [int]($img.Height * $scale)
  $dx = [int]((1920 - $dw) / 2)
  $dy = [int]((980 - $dh) / 2)
  $g.DrawImage($img, $dx, $dy, $dw, $dh)
  if ($Subtitle) {
    $bar = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
    $g.FillRectangle($bar, 0, 980, 1920, 100)
    $bar.Dispose()
    $font = New-Object System.Drawing.Font 'Microsoft YaHei UI', 34, ([System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'
    $sf.LineAlignment = 'Center'
    $g.DrawString($Subtitle, $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 40, 980, 1840, 100), $sf)
    $font.Dispose(); $sf.Dispose()
  }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}

$uiShot = Join-Path $shot 'phantom-blade-zero-records.png'
$heybox = Join-Path $shot 'phantom-blade-zero-heybox-records.jpg'
if (-not (Test-Path $heybox)) { throw "missing $heybox" }

New-Card (Join-Path $slides 'title.png') '影之刃零 · 战绩编辑' 'SaveSmith 0.17.2' '累计身陨 / BOSS 被击杀次数可改'
if (Test-Path $uiShot) {
  New-Slide $uiShot (Join-Path $slides 'records.png') '战绩页：累计身陨与各 BOSS 被击杀次数'
} else {
  New-Card (Join-Path $slides 'records.png') '战绩页' '累计身陨 · 每 BOSS 被击杀次数' '不改击杀掉落，不造未遭遇 BOSS'
}
New-Slide $heybox (Join-Path $slides 'heybox.png') '对照常见战绩展示：身陨与 BOSS 头骨一类数据'
New-Card (Join-Path $slides 'notice.png') '保存后进游戏再存一次' '小黑盒等查看器若解析失败请这样处理' '退出游戏改档 · 建议关云同步 · 自动备份'
New-Slide (Join-Path $promo 'endcard.png') (Join-Path $slides 'endcard.png') '存档酱 · 开源本地改档 · 自动备份'

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
$hui = $voices | Where-Object { $_ -match 'Huihui' } | Select-Object -First 1
if ($hui) { $synth.SelectVoice($hui) }
$synth.Rate = -1
$synth.Volume = 100
$lines = @(
  @{ f = 'n1.wav'; t = '存档酱影之刃零模块新增战绩页。可以改累计身陨，也可以改每个已遭遇BOSS的被击杀次数。' },
  @{ f = 'n2.wav'; t = '和常见战绩展示里的身陨、BOSS头骨数是一类数据。不改击杀掉落，也不伪造未遭遇的BOSS。' },
  @{ f = 'n3.wav'; t = '保存后如果小黑盒解析失败，请进游戏加载存档再保存一次，然后再让查看器读取。改前请完全退出游戏。' },
  @{ f = 'n4.wav'; t = '存档酱，开源本地改档，自动备份。GitHub搜索SaveSmith。' }
)
foreach ($l in $lines) {
  $raw = Join-Path $audio ("raw_" + $l.f)
  $out = Join-Path $audio $l.f
  $synth.SetOutputToWaveFile($raw)
  $synth.Speak($l.t)
  $synth.SetOutputToNull()
  Invoke-FFmpeg @('-y', '-i', $raw, '-af', 'volume=8dB,loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', '48000', '-ac', '2', $out)
  Remove-Item $raw -Force
}
$synth.Dispose()

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
New-Clip (Join-Path $slides 'records.png') (Join-Path $audio 'n1.wav') (Join-Path $work 'records.mp4')
New-Clip (Join-Path $slides 'heybox.png') (Join-Path $audio 'n2.wav') (Join-Path $work 'heybox.mp4')
New-Clip (Join-Path $slides 'notice.png') (Join-Path $audio 'n3.wav') (Join-Path $work 'notice.mp4')
New-Clip (Join-Path $slides 'endcard.png') (Join-Path $audio 'n4.wav') (Join-Path $work 'endcard.mp4')

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
  "file '$workUnix/records.mp4'",
  "file '$workUnix/heybox.mp4'",
  "file '$workUnix/notice.mp4'",
  "file '$workUnix/endcard.mp4'"
)
$listPath = Join-Path $work 'list.txt'
Set-Content -Path $listPath -Value $list -Encoding ASCII

$out = Join-Path $promo 'savesmith-phantom-blade-zero-records.mp4'
Invoke-FFmpeg @(
  '-y', '-f', 'concat', '-safe', '0', '-i', $listPath,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '60', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-movflags', '+faststart', $out
)

Write-Host '--- output ---'
Get-Item $out | Format-List FullName, Length
& $fp -v error -show_entries format=duration,bit_rate -show_entries stream=codec_type,bit_rate,width,height,sample_rate -of default $out
