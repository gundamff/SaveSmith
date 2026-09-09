# SaveSmith v1：宿主 + 游戏模块 + Chaos Front

日期：2026-09-09  
状态：设计已与用户确认，待用户审阅本文后进入实施计划

## 1. 背景与目标

SaveSmith 是开源**单机游戏存档修改器**桌面应用。不做内存修改（不与 Wand / WeMod 抢训练器赛道），做结构化改档（加人、加机体、改编队等训练器做不到的事）。

第一期交付：

- 可扩展的桌面**宿主**（游戏库、快捷动作条、备份/原子写）
- 主仓库内的**游戏模块契约**（加盟方式 = 给本仓库提 PR，不加载外部插件）
- 第一款游戏：**Chaos Front**，从已有 `chaos-front-save-editor`（Electron）迁入，功能不低于现有修改器

收入（捐赠 → 订阅 → 定制）和开发者商店**不在 v1**。关于页只放捐赠链接。

## 2. 已锁定的决策

| 项 | 选择 |
|----|------|
| 加盟 | 游戏模块只进主仓库（PR / 自己写）。无插件商店、无服务端。 |
| 结构 | 同仓从第一天拆宿主与模块，避免第二款游戏时从单体刨。 |
| 界面模型 | **混合**：宿主渲染 Wand 式快捷动作；深编辑页由模块提供 Vue 视图。 |
| 桌面栈 | **Tauri 2 + Vue 3**。解析与游戏逻辑继续 **TypeScript**（WebView 内纯函数）。文件 IO 在 Rust。 |
| 仓库形态 | 单仓应用 + **编译期注册表**（`registry.ts` 静态 import）。不加 npm workspaces，不上 Node sidecar。 |
| 第一期平台 | Windows x64。不承诺 macOS/Linux 发版。 |
| 旧仓库 | 代码迁入后 `chaos-front-save-editor` 停止作为产品发版，归档并指向 SaveSmith。 |

## 3. 架构

```
SaveSmith/
  src-tauri/                 Rust：选目录、读字节、备份、原子写、列/还原备份
  src/sdk/                   GameModule / Action / Catalog 类型。无游戏逻辑、无 fs。
  src/host/                  Vue 壳：游戏库、槽位、动作条、备份面板、关于/捐赠、i18n
  src/host/registry.ts       静态登记已编译的游戏模块
  src/games/chaos-front/     定位声明、解析、actions、views、素材、测试
```

三条硬规则：

1. 模块**不碰文件系统**、不直接调 Tauri。只处理字节与内存中的 `GameState`。
2. 宿主**不知道**游戏内部结构（机体、编队、金币字段名）。`GameState` 对宿主不透明。
3. 写盘纪律（备份、临时文件、原子替换、保留最近 10 份）**只属于宿主**，所有游戏共用。

Tauri 没有 Node：现有 Electron `main/files.ts` 全部换成 Rust 命令；`es3.ts` / `saveModel.ts` 等纯 TS 迁到模块，在 WebView 运行。

## 4. 模块契约

### 4.1 目录卡（游戏库展示）

与存档定位分开。运行时不访问 Steam、不在线拉封面。

**必填**

| 字段 | 说明 |
|------|------|
| `name` | `{ zh, en }` 游戏显示名（游戏标题是数据，不用 i18n key） |
| `cover` | 模块内静态封面资源，打包进应用 |
| `rightsHolder` | 免责声明中的权利人 |

`id` 只存在 `GameModule.id` 上，catalog 不重复。

**选填（没有就不写；缺商店字段则库卡不显示商店按钮）**

`summary`（`{ zh, en }`）、`developer`、`publisher`、`steamAppId`、`storeUrl`（无 Steam 时的备用商店）、`website`。

有 `steamAppId` 时商店按钮优先打开 `https://store.steampowered.com/app/{id}`，忽略 `storeUrl`。Chaos Front v1 **必须**带 `steamAppId: 2770330`。

**不做：** 标签云、评分、在线封面、启动时扫 Steam 已购库。`steamAppId` 以后可辅助找安装目录；v1 探测仍用模块声明的已知存档路径。

Chaos Front 实例：

- 模块 `id`: `chaos-front`
- `steamAppId`: `2770330`（[商店页](https://store.steampowered.com/app/2770330/Chaos_Front/)）
- `rightsHolder`: ChaosGalaxyStudio
- Demo（AppID `3525590`）v1 **不**注册为独立游戏

封面版权与现有修改器同一声明：本地展示、非官方、不暗示授权。实施时若无正式封面，模块内放占位图。

### 4.2 存档定位（声明，宿主执行）

模块描述「存档可能在哪」，不自己读盘：

- Windows 已知路径模板（如 `%USERPROFILE%\AppData\LocalLow\ChaosGalaxyStudio\Chaos Front`）
- 主槽文件名规则（如 `savedata{n}.cf`）
- 附属文件名（如 `collection.cf`）
- 「用户手选的目录是否是我的存档」的判定规则（文件名/魔数级，短且便宜）

宿主：按模板探测；失败则对话框选目录；再用判定规则确认。

列槽位时宿主把目录清单及**已读字节**交给 `listSlots`（展示军团名、天数等需要轻量解析）。某个文件读失败：槽位仍出现，展示为无法读取，不能载入。

### 4.3 状态、动作、视图

```ts
interface GameModule<S = unknown> {
  id: string
  catalog: GameCatalog
  locate: SaveLocator
  listSlots(files: ListedFiles): SlotInfo[]
  parse(files: SlotBytes[]): S
  serialize(state: S): { relativePath: string; bytes: Uint8Array }[]
  validate(state: S): ValidationIssue[]
  actions(state: S): ActionSpec[]
  applyAction(state: S, id: string, payload?: unknown): S
  views: ViewSpec[]
}
```

一次编辑会话可以包含**多个文件**（主槽 + 图鉴等附属）。宿主按模块声明读齐字节后交给 `parse`；`serialize` 返回要写回的文件列表。只对相对原始字节**有变化**的文件做备份 + 原子写；未改动的文件不写盘。

- `S` 对宿主不透明，可在模块内部聚合多份文档。
- `ActionSpec.kind`：`button` | `toggle` | `number` | `slider` | `select`。壳/动作文案走 i18n key。当前值/是否禁用由 `actions(state)` 算出。
- `applyAction` 只改内存草稿，不写盘。
- `views`：`id`、文案 key、Vue 组件。组件只通过注入的 `state` + `mutate` 改草稿。
- `validate` 失败则宿主拒绝保存。
- `serialize` 若返回空列表、或任一条 `bytes` 为空/过短，视为缺陷，拒绝写入。

**刻意不做：** 运行时加载外部插件、通用 JSON 树编辑器、模块自己写文件。

## 5. 宿主职责与数据流

### 5.1 三块

| 块 | 位置 | 职责 |
|----|------|------|
| IO 内核 | `src-tauri` | `pick_folder`、`list_dir`、按字节读、`write_atomic`（备份 + 临时文件 + 替换）、列备份、还原。无游戏知识。 |
| 壳 | `src/host` | 游戏库、槽位、动作条、备份面板、关于/捐赠链接、脏标记、中英 i18n。 |
| 注册表 | `src/host/registry.ts` | 静态 import 各模块。加游戏 = 加目录 + 这里一行。 |

备份格式由宿主统一：时间戳 + 原文件名，**每个被写入的文件**保留最近 **10** 份。模块不可自定义备份策略。

壳的视觉：游戏库与动作条按「平台」布局，不做成后台管理表格风。Chaos Front 的 **views 内**可继续用 Element Plus（迁入成本最低）；宿主壳不强制整站套 Element Plus。

### 5.2 打开 → 改 → 保存

1. 启动：注册表列出已编译游戏。v1 只有 Chaos Front，库页仍按多游戏信息架构排（封面、名称、探测状态、Steam 链接）。
2. 选游戏：宿主用 `locate` 探测；失败则手选目录并校验。
3. 列槽位：宿主列文件，模块 `listSlots` 变成展示用 `SlotInfo`（失败槽位标红，不进入草稿）。
4. 载入：按模块声明读取该会话全部相关文件字节 → `parse` → 草稿 `state`。保留各文件原始字节供「放弃修改」和「是否脏」比较。
5. 编辑：动作条绑定 `actions` / `applyAction`；Tab 挂模块 `views`。任一改动打脏标记。未保存切槽位或切游戏必须确认。
6. 保存：`validate` → 失败则展示问题列表且不写盘 → 成功则 `serialize` → 对每个有变化的文件：Rust 备份盘上当前文件 → 写临时文件 → 原子替换。成功后清脏标记，刷新备份列表。
7. 还原：用户选某个文件的一份备份，宿主覆盖该文件，再对当前会话重新读齐并 `parse`。还原是 IO，不是模块函数。

草稿**只活在渲染进程**。不把 `GameState` 送进 Rust，不写中间库。未保存即退出 = 丢失草稿（盘上备份是上次成功保存的版本）。

不把附属文件做成第二套 IO 协议：与主槽共用备份 API（时间戳 + 原文件名，每文件最近 10 份）。

### 5.3 关于页（v1）

版本号、免责声明（壳通用条款 + 当前游戏 `rightsHolder`）。仓库 URL、捐赠 URL 放在宿主配置常量里，**未配置则隐藏对应按钮**（v1 允许先留空）。无登录、无支付、无广告、无自动更新器。

## 6. Chaos Front 迁入

从 `D:\eclipse\git\chaos-front-save-editor` **复制进** `src/games/chaos-front/`，不是 git submodule，不是套旧 Electron 窗口。

### 6.1 迁入

- 纯 TS：`es3.ts`、`saveModel.ts`、`level.ts`、`gameData.ts`、`game-data.json`
- 深页 Vue：资源、星球、编队、机体/飞船、驾驶员、全解锁、图鉴
- 素材与开发期提取脚本
- 现有 Vitest（解析往返、等级、saveModel、脱敏夹具）。真实存档 e2e 仍只在开发机用副本跑，不入库玩家存档

### 6.2 丢掉

Electron `main` / `preload` / IPC / `electron-builder`；任何渲染进程直接碰 `fs` 的路径。

### 6.3 拆开的 UI

现有「存档」Tab 拆成：

- **宿主：** 选目录、槽位列表容器、备份列表、还原/删除备份、保存按钮与脏标记
- **模块：** `listSlots` 的展示字段（军团名、天数、机体数等）、槽位文件规则、图鉴等附属文件

### 6.4 v1 actions（宿主条）

从现有一键能力抽出，不新发明：

- 资源拉满
- 机体全满级
- 驾驶员全满级
- 全解锁
- 图鉴点亮

编队、单机体/装备编辑、星球数值**只走 views**。

### 6.5 产品规则（保持）

修改前须退出游戏（提示，不杀进程、不抢文件锁）。解析失败拒绝写入。结构疑似游戏更新时提示风险；若仍能 parse 则允许保存。非官方、仅限正版单机学习研究；禁止联机/商业使用声明保留。

## 7. 错误处理

模块错误使用稳定 `code` + 参数（沿用 `SaveError`），宿主按 code 做 i18n。解析层不硬编码给用户看的中英句子。

| 场景 | 行为 |
|------|------|
| 目录不是该游戏存档 | 不能进入编辑；「未识别」+ 再选目录 |
| 槽位 `parse` 失败 | 该槽禁用；其它槽仍可用 |
| 非关键字段缺失 | 可编辑；保存前再 `validate` |
| 关键字段缺失 / 硬失败 | 不可保存（只读或拒绝进入编辑，以模块 `parse` 是否抛错为准） |
| 疑似游戏版本更新但仍能 parse | 明确警告后允许保存 |
| 写盘权限不足或文件被锁 | 失败；目标文件保持写盘前状态；若备份已生成则保留 |
| `serialize` 得到空列表或任一条过短/空字节 | 视为缺陷，拒绝写入 |
| `validate` 失败（如已上阵机体无驾驶员） | 展示问题列表，不写盘 |

不自动杀游戏进程。不静默覆盖。失败时不删除已有备份。

## 8. 测试

- **SDK：** 假游戏模块覆盖注册表、`applyAction`、validate 挡住保存、views 清单形状。
- **Chaos Front：** 迁入现有 Vitest。
- **宿主 IO：** 备份轮转（10 份）、原子写失败时目标文件不变、还原。尽量在无窗口的临时目录测。
- **UI：** v1 不强制 Playwright。实施计划附手测清单：库页、动作条、脏标记确认框、保存后游戏可读。

发布门禁：单元测试通过、typecheck 通过、打出 Windows Tauri 包、用 Chaos Front 存档**副本**走通「载入 → 一个 action → 一个 view 修改 → 保存 → 游戏能读」。

## 9. v1 范围

**做**

- Tauri + Vue 壳与上述 IO
- 模块契约 + 编译期注册表
- Chaos Front 模块（目录卡 + locate + actions + 现有深页）
- 中英、MIT、免责声明；关于页预留仓库/捐赠按钮（URL 未配置则隐藏）
- Windows x64 可分发包

**不做**

- 服务端、账号、订阅、支付、广告、自动更新
- 运行时外部插件、插件商店
- 第二款游戏
- 通用 JSON 树编辑、内存修改、游戏内 overlay
- 扫描 Steam 已购库、在线拉封面
- macOS/Linux 发版承诺
- 与 `chaos-front-save-editor` 双轨发版

实施时按阶段拆计划（脚手架 → SDK/契约测试 → 宿主壳与 IO → 迁入 Chaos Front → 打包手测），仍视为**一份** v1 计划，不另开第二份产品 spec。

## 10. 成功标准

1. 只安装 SaveSmith，即可修改 Chaos Front 存档，能力不低于现修改器（槽位/备份改在宿主，功能仍在）。
2. 加第二款游戏时，预期工作是：`src/games/<id>/` + `registry.ts` 一行，不必再拆宿主或改 IO 内核。
3. 包体相对现有 Electron 便携 exe 明显下降（系统 WebView2；Win10/11 通常已具备）。缺 WebView2 时走官方引导安装，不自行捆绑完整 Chromium。

## 11. 合规与许可

- 许可证：MIT（应用代码）。游戏名称、商标、素材归各权利人；README/关于页声明非官方、无授权。
- 仅限单机。不支持联网/多人公平相关修改。
- 权利人合理下架/屏蔽请求：配合处理该游戏模块的发行与仓库公开访问。
