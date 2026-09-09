# 更新日志

[**中文**](CHANGELOG.md) | [English](CHANGELOG.en.md)

## [Unreleased]

### 工程

- GitHub Actions：`CI`（push / PR 跑测试与 typecheck）与 `Release`（推送 `v*` 标签自动打包并发版）

### 文档

- README / CHANGELOG / 发版说明对齐 chaos-front-save-editor 结构（中英、免责声明、素材提取）

## [0.1.0] - 2026-09-09

第一版。Windows x64 **免安装**单文件。只内置 *Chaos Front / 混沌兵团*。

### 新增

- 游戏库：封面、中英名称、存档目录探测、Steam 商店页（AppID 2770330）
- 编辑页：槽位列表、资源 / 星球 / 编队 / 机体 / 驾驶员 / 全解锁 / 图鉴
- 顶栏显示当前游戏、存档目录、当前槽位；槽位副标题为游戏内保存时间
- 保存前自动备份，每个被写入的文件保留最近 10 份（`backup/`）
- Windows 覆盖写盘使用原子替换，失败时保留活档
- 中英界面；依赖系统 WebView2，不捆绑 Chromium

### 说明

- 非官方、仅限单机。请先退出游戏，并用存档**副本**试验
- 一键拉满等按钮在对应分页内，不与 Tab 同级
- macOS / Linux 本版不提供
