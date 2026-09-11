# 更新日志

[**中文**](CHANGELOG.md) | [English](CHANGELOG.en.md)

## [Unreleased]

## [0.4.0] - 2026-09-11

新增 **泰拉瑞亚**；混沌兵团解锁避开「未使用」占位；备份列表更清晰。

### 新增

- **泰拉瑞亚 / Terraria**：原版玩家 `.plr`（角色属性、货币、热键栏 / 背包 / 装备）；物品名表可搜索
- 备份面板显示本地时间与文件大小，便于辨认还原目标

### 修复

- 混沌兵团：解锁全部 / 勾选时跳过名称「未使用」的占位机型（写入后进游戏会崩溃）

### 工程 / 文档

- `npm run dist` 产出 `SaveSmith-<版本>-windows-x64.exe`；Release 工作流与之对齐
- README / 手测清单补充泰拉瑞亚；游戏说明见 `docs/games/terraria.md`

## [0.3.0] - 2026-09-10

品牌与文档整理；顶栏捐助。

### 新增

- 顶栏「捐助」：微信 / 支付宝收款码 + [PayPal](https://paypal.me/gundamff)（关于页同源）

### 变更

- 「存档酱」主视觉更新：桌面图标 / 顶栏 / About / README 统一为新版 Q 版形象
- README 改为「支持游戏」表格，详情见 `docs/games/*`；补充界面截图

## [0.2.0] - 2026-09-09

第二版。新增 **Wanderburg**；品牌「存档酱」；解锁全量表 + 中英名称。

### 新增

- **Wanderburg** 存档模块：嵌套 `Generation_*/SaveData.json` 槽位；`StringCipher`（Rijndael-256-CBC + PKCS7）解密写回；同步 `SaveData.backup.json`
- 资源页：银币 / 上次出征前银币
- 解锁页：按游戏 `UnlockableData.allUnlockables` 全量勾选；名称随界面语言切换（官方 `LocaTest_zh` 简中，缺译回退英文）
- 品牌：中文名「存档酱」、二次元 logo、游戏库页视觉；Wanderburg 封面

### 修复

- 银币编辑失焦还原；加密填充错误导致游戏拒档并从 backup 回滚
- 备份面板可删除；备份文件名改为 `SaveData_{stamp}.bak`

### 工程 / 文档

- 宿主支持嵌套相对路径槽位探测；Wanderburg 解锁表导出手册（本地维护，不入库）
- GitHub Actions `CI` / `Release`（推送 `v*` 标签自动打包）

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
