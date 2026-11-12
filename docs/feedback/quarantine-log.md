# Nexus Mods 隔离记录

页面：https://www.nexusmods.com/phantombladezero/mods/365
作者：gundam4d

## 为什么会被隔离

每次上传的附件是 Windows 便携版可执行文件（Tauri + WebView2 打包），
Nexus 的自动安全检查对**可执行文件**一律先隔离、再人工复核。
这是"预期行为"，不是误判，也不是因为文件有问题。

结论对用户的说法：**每次更新都会被拦一次，等人工放行即可，期间旧版本仍可下载。**

## 页面上的统一说明（2026-11-08 已加入描述顶部）

已在 Mod 描述顶部加上中英双语说明块，标题「About file availability / 关于文件被隔离」，
内容与本文件「为什么会被隔离」「一般解封周期」两节一致，并附 GitHub Releases 链接。
帖子回复遇到"最新文件无法下载"时，指向上面的说明块即可，不再逐条解释。

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
| 0.17.9 | 2026-11-06 | 2026-11-07 | 通过，审核者 Oliver，2026-11-08 11:22 UTC |
| 0.17.10 | 2026-11-07 | 2026-11-07（与 0.17.9 合并申诉） | 通过，审核者 Oliver，2026-11-08 11:22 UTC |

## 放行后的收尾（Oliver 在回信里要求）

> You can remove the "Some suspicious files" warning by archiving the older
> (unapproved) versions of your mod.

即：把**旧的历史版本归档**（Files → Manage → 对不需要的旧文件选 Archive），
页面上「Some suspicious files」的警告才会消失。待办见下。

- [ ] 归档 0.17.2 / 0.17.5 / 0.17.7 中不再需要的旧文件（保留一个近期可用版本兜底）
- [ ] 保留 0.17.9、0.17.10 为可下载状态


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
business day. The source code is public at https://github.com/gundamff/SaveSmith (MIT).
```

## 2026-11-12 第二轮：11 个页面全部被隔离

### 实况

11 个页面 Files 页均显示 `Virus scan: ✗ Some suspicious files`。
其中 **FFResonance 不同**：`status=under_moderation / available=False`，文件被隐藏，页面横幅指控
「bypassing quarantine procedures with off-site download links」。

### 根因

PBZ 描述里有 3 处指向可执行文件的站外入口：

- `Builds are also always available below.`
- `Always available / 始终可下载：[url=.../releases]GitHub Releases[/url]`
- `Release: https://github.com/gundamff/SaveSmith/releases/tag/v0.17.2`

其余 10 个页面只有仓库根链接（Source），未构成下载入口。

### 已处理

- PBZ 描述：三处全部删除，API 复核 `releases=0`、`Always available=0`
- 本文件末段「给用户的标准说明」也去掉 releases 链接（评论区回复同样不能导流站外）

### 本次申诉（2026-11-12 发出，3 封，均至 support@nexusmods.com）

| 邮件 | 覆盖页面 | 主题 | messageId |
|---|---|---|---|
| 1 | 9 个页面，同一文件 0.17.11 | Quarantine review request - SaveSmith v0.17.11 (9 pages, same build) | 1a1ce9fbfa693904 |
| 2 | Terraria（0.17.10，独立构建） | Quarantine review request - SaveSmith v0.17.10 (Terraria page) | 1a1ce9ff54555fe8 |
| 3 | FFResonance（回应站外链接指控） | Off-site download link removed - Final Fantasy Resonance page 329 | 1a1cea01b8e9afd3 |

### 文件指纹

- 9 页共用：9,809,920 字节，SHA256 `4d730846da0bc5005737f2e06446e4468d3a609495006010efaa010a4f0ed104`（2026-11-09 上传）
- Terraria：9,824,768 字节，SHA256 `440ba45dc0984e83ee88d3bfb43069b25978628e10e63ca9543069ea62985701`（2026-11-09 上传）
- FFResonance：同 0.17.11 构建，API 403 取不到 file_id，邮件里只给版本/大小/日期

### 待办

- [ ] 等回复；若 FFResonance 仍不解，按 staff 要求补源码审查材料
- [ ] 归档旧版未批准文件（Oliver 11-08 明确说过归档可消除警告），本轮仍未做
- [ ] PBZ 描述被编辑器加了 `[size=4][b]` 包裹，渲染偏粗，需手动整理一次
