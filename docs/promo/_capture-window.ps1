param(
  [string]$Exe = 'D:\gits\SaveSmith\src-tauri\target\release\SaveSmith-0.17.5-windows-x64.exe',
  [string]$Out = 'D:\bots\logs\library-0176.png',
  [int]$WaitSec = 8
)
# Capture a window with PrintWindow (works even when occluded)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinCap {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$p = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds $WaitSec
$proc = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if (-not $proc -or $proc.MainWindowHandle -eq 0) { Write-Output 'ERR no window handle'; exit 1 }

$h = $proc.MainWindowHandle
[WinCap]::ShowWindow($h, 5) | Out-Null
Start-Sleep -Milliseconds 1500

$r = New-Object WinCap+RECT
[WinCap]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Right - $r.Left
$hh = $r.Bottom - $r.Top
if ($w -le 0 -or $hh -le 0) { Write-Output 'ERR bad rect'; exit 1 }

$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [WinCap]::PrintWindow($h, $hdc, 2)
$g.ReleaseHdc($hdc)
$g.Dispose()

if ($ok) {
  $bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output ("OK {0} {1}x{2} {3}KB" -f $Out, $w, $hh, [math]::Round((Get-Item $Out).Length/1KB))
} else {
  Write-Output 'ERR PrintWindow failed'
}
$bmp.Dispose()
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
