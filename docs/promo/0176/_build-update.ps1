$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$ff = 'D:\bots\AstrBot\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
$promo = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $promo '..\..\..')).Path
$shot = Join-Path $root 'docs\screenshot'
$slides = Join-Path $promo '_slides'
if (Test-Path $slides) { Remove-Item $slides -Recurse -Force }
New-Item -ItemType Directory -Force -Path $slides | Out-Null

function New-Slide {
  param([string]$SrcPath, [string]$OutPath, [string]$Subtitle)
  $bmp = New-Object System.Drawing.Bitmap 1920, 1080
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::FromArgb(20, 24, 30))

  if ($SrcPath -and (Test-Path $SrcPath)) {
    $img = [System.Drawing.Image]::FromFile($SrcPath)
    $scale = [Math]::Min(1680 / $img.Width, 860 / $img.Height)
    $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
    $g.DrawImage($img, [int]((1920 - $w) / 2), [int]((900 - $h) / 2) + 20, $w, $h)
    $img.Dispose()
  }

  if ($Subtitle) {
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 255, 255, 255))
    $font = New-Object System.Drawing.Font 'Microsoft YaHei', 40, ([System.Drawing.FontStyle]::Bold)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = 'Center'
    $fmt.LineAlignment = 'Center'
    $rect = New-Object System.Drawing.RectangleF 120, 930, 1680, 120
    $g.DrawString($Subtitle, $font, $brush, $rect, $fmt)
    $font.Dispose(); $brush.Dispose()
  }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $g.Dispose()
}

$items = @(
  @{ img = (Join-Path $root 'docs\promo\phantom-blade-zero\cover-phantom-blade-zero-1920.jpg'); text = '存档酱 0.17.6 更新 · Windows 本地存档编辑器'; sec = 4.5 },
  @{ img = (Join-Path $shot 'phantom-blade-zero-materials.png'); text = '影之刃零：材料 / 消耗品 / 图鉴，同一页改完'; sec = 5 },
  @{ img = (Join-Path $shot 'phantom-blade-zero-growth.png');  text = '成长与进度：等级、属性、资源直接调'; sec = 5 },
  @{ img = (Join-Path $shot 'phantom-blade-zero-records.png'); text = '新 Progress 页签：BOSS 最佳时间可直接编辑'; sec = 5 },
  @{ img = (Join-Path $shot 'library.png'); text = '0.17.6：保存成功有提示，无改动会告诉你，失败可复制详情'; sec = 5 },
  @{ img = (Join-Path $root 'docs\promo\phantom-blade-zero\endcard.png'); text = '一键复制诊断信息 · 自动备份 · github.com/gundamff/SaveSmith'; sec = 5 }
)

$i = 0
$list = New-Object System.Collections.Generic.List[string]
foreach ($it in $items) {
  $out = Join-Path $slides ('slide{0:d2}.png' -f $i)
  New-Slide -SrcPath $it.img -OutPath $out -Subtitle $it.text
  $list.Add("file '$($out -replace '\\','/')'")
  $list.Add("duration $($it.sec)")
  $i++
}
# concat 需要最后一项重复一次
$list.Add("file '$((Join-Path $slides ('slide{0:d2}.png' -f ($items.Count - 1))) -replace '\\','/')'")
$listPath = Join-Path $promo '_concat.txt'
Set-Content -Path $listPath -Value $list -Encoding ASCII

$outMp4 = Join-Path $promo 'savesmith-0.17.6-update.mp4'
if (Test-Path $outMp4) { Remove-Item $outMp4 -Force }
$ffLog = Join-Path $promo '_ffmpeg.log'
$ffArgs = @('-y','-f','concat','-safe','0','-i',$listPath,'-vf','fps=30,format=yuv420p,fade=t=in:st=0:d=0.6','-c:v','libx264','-preset','medium','-crf','20',$outMp4)
# ffmpeg 把进度写到 stderr，PowerShell 会当成 NativeCommandError；用 Start-Process 重定向避免脚本被中断
$proc = Start-Process -FilePath $ff -ArgumentList $ffArgs -NoNewWindow -Wait -PassThru -RedirectStandardError $ffLog
Get-Content $ffLog -Tail 2
if (Test-Path $outMp4) {
  $len = (Get-Item $outMp4).Length / 1MB
  "OK: $outMp4  ($([math]::Round($len,1)) MB)"
} else { "FAILED" }
