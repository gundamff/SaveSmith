# 更新日志

[**中文**](CHANGELOG.md) | [English](CHANGELOG.en.md)

## [0.6.0] - 2026-09-17

新增 **混沌银河 2**；舰队 / 指挥官编辑体验加固。

### 新增

- **混沌银河 2 / Chaos Galaxy 2**（ChaosGalaxyStudio，Steam AppID 1537910）：二进制 ES3 槽位 `savedataN.cg2` + `config.cg2` 图鉴；资源、星球、指挥官、舰队、解锁、图鉴
- 势力 / 技能芯片等以下拉名称展示（旁注 `#id`）；解锁项「外星内容解锁」附说明
- 指挥官：默认仅己方、姓名/编号搜索、阵营列；一键拉满己方
- 舰队：卡片式布局（元信息 + 单位槽网格）；默认仅己方；切换「全部势力」有加载提示
- 宿主切 Tab 忙碌遮罩多留帧，减轻重面板切换卡顿感

### 工程 / 文档

- 游戏说明与截图见 `docs/games/chaos-galaxy-2.md`；素材抽取 `scripts/extract-chaos-galaxy-2.mjs`
- 真实存档 E2E 由 `CG2_SAVE` / `CG2_E2E_SAVE` / `CG2_E2E_CONFIG` 门控，不入库玩家存档

## [0.5.1] - 2026-09-14

混沌兵团资源页可改委员会历（游戏时间）。

### 新增

- 混沌兵团：资源页编辑委员会历年 / 月 / 日，同步 `PlayerDay` 与 `HistoryTime`（结局与时间相关时可调）

## [0.5.0] - 2026-09-12

新增 **龙之剑：觉醒**；槽位探测、中文 CID、加载/保存忙碌反馈与关于文案修正。

### 新增

- **龙之剑：觉醒 / DragonSword: Awakening**（HOUND13，Steam AppID 4570720）：SQLCipher v4 槽位 `*_SlotN.db`；货币、堆叠物品、料理/配方、角色、编队、装备、解锁（角色/称号/业力）、已拥有外观/坐骑、世界坐标
- 保存校验：金额与堆叠须非负有限、坐标须有限、编队 CID 须为已有角色或空槽
- 龙之剑 CID 中英标签目录；编辑区提示可在 [th.gl 数据库](https://dragonswordawakening.th.gl/) 查询 CID
- README Shields.io 徽章（下载 / 版本 / 许可证 / Windows）

### 修复

- 宿主 `slotFilePatterns` 支持段内多星 glob（修复龙之剑 `*/*_Slot*.db`「已找到目录却无槽位」）
- 「关于」免责声明始终按多游戏产品表述，不再把当前游戏/SaveSmith 写成唯一权利人
- 打开槽位 / 保存 / 切 Tab 显示忙碌遮罩；保存前让出一帧以便「正在保存…」可见

### 变更

- 龙之剑封面改为 Steam 商店头图（© HOUND13）

### 工程 / 文档

- 游戏说明见 `docs/games/dragon-sword.md`；编解码按 [gfriloux 公开格式文档](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs) 独立实现，未移植社区编辑器源码
- 目录生成：`scripts/convert-dragon-sword-catalog.mjs` + 本机 `merge-dragon-sword-zh-from-pak.mjs`（`Zh_CN`）

## [0.4.1] - 2026-09-11

修复存档编辑页数值框「改不动 / 弹回」；机体表增加等级列。

### 修复

- 宿主 `session.revision` + 表行 snapshot：混沌机体经验 / 星球数值、资源等 InputNumber 与 `markRaw` 原地修改对齐
- 编队页去掉脆弱的 `invTick`，统一订阅 `editor.rev`
- 泰拉瑞亚角色 / 背包、Wanderburg 资源等同路径加固
- 混沌：打开存档时清洗「未使用」机型解锁；添加机体列表过滤占位机型
- Wanderburg：银币字段校验（`INVALID_SILVER`）

### 变更

- 混沌机体表：独立「等级」列（`+N`），与人物经验页布局对齐

### 工程

- `useSessionBindings` / `editorBindings`；反应性契约测试

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
