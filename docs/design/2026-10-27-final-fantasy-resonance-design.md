# FINAL FANTASY RESONANCE 存档模块设计

日期：2026-10-27  
模块 id：`final-fantasy-resonance`  
状态：已设计（待实现计划）  
路径：标准通道 · savesmith-add-game + superpowers brainstorming

## 背景

- 游戏：FINAL FANTASY RESONANCE（Steam AppID `3259780`）
- 引擎：Unreal Engine 5（安装目录含 `Engine/`、`FFRS/`、`FFRS.exe`；内容包 `FFRS/Content/Paks`）
- 权利人：Square Enix；开发：LANCARSE Ltd.
- 安装目录（本机示例）：`D:\Program Files\steam\steamapps\common\FINAL FANTASY RESONANCE`
- 存档目录：`%USERPROFILE%\AppData\Local\FFRS\Steam\<SteamID64>\`
- 试玩目录（非一期目标）：`%USERPROFILE%\AppData\Local\FFRS_DEMO\Steam\<SteamID64>\`
- 槽位文件：
  - `GameSaveData0.sav`：自动档
  - `GameSaveDataN.sav`：手动槽 N（N≥1）
  - `OptionSaveData.sav`、`EnhancedInputUserSettings.sav`：**不编辑**
- Steam Cloud：同步 `FFRS/Steam/{64BitSteamID}/GameSaveData*.sav`；写档前须退出游戏，建议关云或接受回滚风险
- 社区对照：[ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor)（MIT）。本模块 **Clean-room**：按公开格式说明与真档对拍自写 TypeScript；文档致谢；**不复制**其源码进仓

### 格式指纹（探路）

- 主进度文件魔数 **`SVHD`**，体部高熵（≈8 bits/byte），文件内 **无** 明文 `GVAS`
- 公开格式要点（社区 README）：
  - 32 字节头：`SVHD` + 两个 u16 版本字段 + **SHA-1(密文体)** + 4 字节零
  - 体部：**AES-256-ECB** 加密（无 IV；明文长度须为 16 的倍数）
  - 解密后：UE 5.5+ 属性标签格式的 **GVAS** SaveGame
- `EnhancedInputUserSettings.sav` 为明文 GVAS，但本模块不将其作为编辑目标

## 决策记录（brainstorming）

| 议题 | 选择 |
|------|------|
| 一期深度 | **B**：对齐社区编辑器完整可编辑面 |
| 实现路径 | **A**：Clean-room 自写 |
| 实体增删 | **A**：允许物品/神器等增删（结构不清则拒绝） |
| 名称素材 | **A**：从安装资源自行派生 ID→名称表；图标可延后 |
| 架构方案 | **方案 1**：容器 crypto 独立 + GVAS 树 + 投影 UI（否决「仅解密壳」与「嵌社区编辑器」） |
| Journal 主线 | 剧情/主线进度计数 **默认只读**（防坏档） |
| Option / 键位 | 完全不碰 |

## 目标

按写回硬门槛分阶段交付，最终对齐社区完整面（主线计数只读除外）。

### P0 — 容器与往返

1. 登记模块；定位 `GameSaveData*.sav` 多槽（含自动档摘要）
2. SVHD 校验 / AES-256-ECB 加解密 / SHA-1 重算（Clean-room）
3. UE5.5+ GVAS 解析与序列化；未知属性透传
4. **未编辑** `parse → serialize` 后游戏仍能载入；过不了则禁止任何可写 UI

### P1 — 白名单标量

1. 可写：Gil、角色等级/经验/HP·MP 相关等无害标量；Items **只改已有堆叠数量**
2. 改一无害字段 → 重算校验 → 游戏接受后再铺深 Tab

### P2 — 完整面 + 增删

1. Tab：Status / Visions / Items / Artifacts / Maps / Records / Journal / Bestiary / Quick
2. 允许按 catalog 新增/删除物品、神器等；无映射 ID 拒绝
3. Maps（known/visited/cleared、区域揭示、宝箱重置）、Bestiary（含 Libra 批量）、Visions、Artifacts、Quick 批量动作
4. registry、i18n、`docs/games`、README 表、CHANGELOG、HANDTEST、自动化测试

### P3（可选，不挡 P2 合入）

图标派生、Quick 用户预设持久化、中英名称表打磨

## 非目标

- 编辑 `OptionSaveData.sav` / `EnhancedInputUserSettings.sav`
- 强开付费外观 / DLC 所有权
- 保证 Steam Cloud 冲突安全、联机/成就公平、主机档
- 捆绑社区编辑器二进制或庞大运行时进便携包
- 提交玩家真档、游戏原始 pak、反编译整库、密钥「说明文档以外」的衍生机密材料滥用
- 将社区仓库 `data/` 或源码原样搬入本仓
- 一期验收 Mac/Linux/Proton 路径（模板可预留，不挡 Windows）

## 架构

### 模块边界

新建 `src/games/final-fantasy-resonance/`，在 `src/host/registry.ts` **静态 import** 登记。

| 路径 | 职责 |
|------|------|
| `locate.ts` | 路径模板与识别；只认进度档模式 |
| `slots.ts` | `GameSaveDataN.sav` → 槽位摘要（自动档 / 槽号） |
| `parse.ts` | `parse` / `serialize` / `validate` + `FinalFantasyResonanceState` |
| `crypto/` | SVHD 头、SHA-1、AES-256-ECB（模块内自写） |
| `model/gvas*` | UE5.5+ GVAS 树读写（可对照 AC8 `ue54` 的思路，**独立实现或显式分支**，不硬绑战役逻辑） |
| `model/saveModel*` | 角色/物品/神器/地图/图鉴等投影；其余 opaque 透传 |
| `catalog/` | 派生名称表 + `SOURCE.md`（游戏版本 / build） |
| `actions.ts` | 白名单动作；增删受 catalog / validate 门闩 |
| `views/` | Tab UI；深页走 `useSessionBindings` |
| `index.ts` | `GameModule` 导出 + `cover.jpg` |

Catalog 元数据建议：

- name：`{ zh: '最终幻想：共鸣', en: 'FINAL FANTASY RESONANCE' }`（中文名以实现时商店/官方译名为准微调）
- `steamAppId: 3259780`
- `rightsHolder: Square Enix`
- `developer: LANCARSE`
- `publisher: Square Enix`
- summary：非官方；先退出游戏；建议关闭 Steam 云同步

### 定位

宿主 `probe.ts` 已支持路径段 `*` 通配（每层一个目录）。SteamID 子目录用：

```ts
windowsPathTemplates: [
  '%USERPROFILE%\\AppData\\Local\\FFRS\\Steam\\*'
]
identifyAnyOf / identifyNameRegex / slotFilePatterns:
  GameSaveData*.sav（须匹配槽 0 与任意 N，避免「仅手动档目录进不去」）
```

优先 `%USERPROFILE%\AppData\...`；**不要**单独依赖未注入的 `%LOCALAPPDATA%`（可与 `%USERPROFILE%` 模板并列作兜底）。

### 数据流

```
宿主读盘 → SlotBytes
  → crypto.decrypt（验 SVHD + SHA-1）
  → gvas.parse（UE5.5+）
  → saveModel.project → GameState（投影 + opaque）
  → views / actions 改投影
  → saveModel.apply → gvas.serialize
  → crypto.encrypt（明文对齐 16 字节、AES-ECB、写回 SHA-1）
  → 宿主备份 + 原子写
```

铁律：模块不碰 `fs`、不直接 `invoke` Tauri；只吃/吐 `Uint8Array` 与内存状态。

## 可编辑面（P2 目标）

| Tab | 内容 | 备注 |
|-----|------|------|
| Status | 等级/经验/HP·MP/属性、装备槽 | 装备用 catalog 下拉；大列表避免一次挂上千 option |
| Visions | MRP、Mastery Rank、Awakening | |
| Items | 改数量 + 新增/删除 | 堆叠上限提示（如 99）；超限策略在 plan 中二选一并写死 |
| Artifacts | 拥有与开关 | 允许补缺失 |
| Maps | known/visited/cleared、区域揭示、宝箱重置 | |
| Records | Gil、时长、战斗统计、Tablet Shards 携带/上交等 | |
| Journal | 剧情摘要只读；支线/斗技场等可写白名单 | 主线计数默认只读 |
| Bestiary | 击败数、Libra 扫描（含批量） | |
| Quick | 满级/满 Gil/补消耗品/满 Mastery/全神器/全图/全 Libra 等 | 用户预设 → P3 |

## 错误处理

| 情况 | 行为 |
|------|------|
| 非 SVHD / SHA-1 不符 | `ModuleError`（格式/校验），拒解析 |
| AES / GVAS 失败 | 明确失败，不半写 |
| 新增未知 catalog ID | `validate` / action 拒绝 |
| 堆叠超上限 | UI 警告；写回钳制或拒绝（plan 定一种） |
| 热更导致格式变 | summary 标明风险；解密/解析失败即停写 |

## 测试与验收

- 单元：header / AES / SHA-1、GVAS 往返、投影白名单、增删门闩
- 真档：环境变量门控 + `skip`；**无对照向量不得假绿**；禁止提交玩家真档
- 声称可写前必须实证：未编辑往返可载入；改一无害字段可载入
- 合入前：`npm test` 与 `npm run typecheck` 贴输出
- 真机手测：`docs/HANDTEST.md` 本节；由用户在**副本**上确认

### 成功标准（P2 合入）

1. Windows 自动找到 FFRS Steam 存档目录与多槽  
2. 未编辑往返 + 改 Gil/物品数量，游戏可载入  
3. Tab 覆盖社区完整可写能力（主线计数只读除外）  
4. 测试与 typecheck 通过；文档（games / README / CHANGELOG / HANDTEST）齐全  

## 风险

| 风险 | 缓解 |
|------|------|
| AES 密钥/填充与游戏不一致 | P0 真档往返；按公开格式事实自实现算法与密钥材料，不整文件抄社区源码 |
| UE5.5 tag 与现有 AC8(5.4) 差异 | 独立 gvas 或显式版本分支；不假设可直接复用战役模块 |
| 增删破坏任务/世界旗 | Journal 主线只读；增删门闩 + HANDTEST |
| Steam Cloud 回滚 | 文档警告；建议关云 |
| 包体膨胀 | 名称表优先；图标按需 |
| 许可污染 | Clean-room + 致谢；不搬源码与社区 `data/` 原样 |

## 文档与致谢

实现后更新：

- `docs/games/final-fantasy-resonance.md` + `.en.md`
- `README.md` / `README.en.md` 支持表一行
- `CHANGELOG.md` / `.en.md`
- `docs/HANDTEST.md` 手测节

致谢文案须提及社区公开格式说明来源（ffr-save-editor），并重申非官方、与 Square Enix / LANCARSE 无关。
