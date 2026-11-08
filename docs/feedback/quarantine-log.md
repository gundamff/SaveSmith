# Nexus Mods 隔离记录

页面：https://www.nexusmods.com/phantombladezero/mods/365
作者：gundam4d

## 为什么会被隔离

每次上传的附件是 Windows 便携版可执行文件（Tauri + WebView2 打包），
Nexus 的自动安全检查对**可执行文件**一律先隔离、再人工复核。
这是"预期行为"，不是误判，也不是因为文件有问题。

结论对用户的说法：**每次更新都会被拦一次，等人工放行即可，期间旧版本仍可下载。**

## 一般解封周期

| 情形 | 实际耗时 |
|---|---|
| 工作日白天提交申诉 | 4–5 小时（11-02、11-05 两次实测） |
| 周末提交 | 顺延到下一个工作日（Nexus 工单周末基本不处理） |

## 历史

| 版本 | 上传日 | 申诉日 | 结果 |
|---|---|---|---|
| 0.17.2 | 2026-11-02 | 2026-11-02 | 通过，审核者 Oliver，工单 276171 |
| 0.17.5 | 2026-11-03 | 2026-11-04 | 通过，审核者 Maxwell，工单 276703 |
| 0.17.7 | 2026-11-05 | 2026-11-05 | 通过，审核者 Maxwell，工单 276703 |
| 0.17.9 | 2026-11-06 | 2026-11-07 | 待处理 |
| 0.17.10 | 2026-11-07 | 2026-11-07（与 0.17.9 合并申诉） | 待处理 |

## 申诉信要点（照抄不改）

1. 一句话直说请求
2. 引用同一页面已通过的版本与审核者、工单号
3. Mod 名称 / 作者 / 页面链接 / 文件清单（名称、类型、大小、上传日）
4. 说明被拦原因：`portable exe (Tauri/WebView2)`，不是 game DLL injector
5. MIT 源码地址 + release tag + 构建步骤
6. 行为说明：离线读写本地存档、写前备份
7. 附 SHA-256

## 给用户的标准说明（英文，可直接贴到帖子回复）

```
Files on this page are Windows portable executables (Tauri / WebView2),
so every update is quarantined by the automated safety check first and
released after a manual review. That is expected behaviour, not a problem
with the file. While a new build is under review the previous version stays
downloadable from the Files tab. Reviews usually take a few hours on
weekdays; updates submitted over the weekend are handled on the next
business day. Builds are always available from GitHub Releases in the meantime:
https://github.com/gundamff/SaveSmith/releases
```
