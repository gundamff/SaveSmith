# 影之刃零：图鉴（Codex）解包对照备忘

状态：**研究完成，未立项实现**  
日期：2026-11-13  
触发：社区希望「图鉴编辑 / 一键点亮」；先解包摸清字段再定是否做。

临时产物（勿提交）：`%TEMP%\pbz-codex-export\`（`PbzCodexDump` + `out\` + `analysis\`）  
对照真档：本机 Steam 库 `...\76561198096595921\PBZSaveGame.sav`（只读解析）。

## 结论（一句话）

敌人图鉴进度写在账号级槽 `__Advanced__.Codex`，主列表是 `DiscoveredEnemies`（软路径数组）；与 `DT_CodexEnemyDataTable.EnemyClass` **逐条同构**。目录 177 行、本机已发现 111 条且 **0 条对不上表**。道具图鉴 / `Inventory.AllCodexID` / `UnlockTag` 明文仍未完全打通，不宜假装「全图鉴」已摸清。

## 存档字段

### `__Advanced__.Codex`（主路径）

| 字段 | 类型 | 本机样例 | 推断 |
|------|------|----------|------|
| `DiscoveredEnemies` | `string[]` SoftObject | 111 | 已登入图鉴的敌人类路径（含 `.Asset_C`） |
| `RevealedEnemies` | `string[]` SoftObject | 0 | 「揭示真名/详述」态；表内有 `RevealTag` / `RevealedEnemy_*` |
| `EnemyKillMapIDs` | object | `{}` | 击杀/地图维度；本机空，语义未证实 |

### 同槽旁路（不是怪物图鉴本体）

| 字段 | 本机 | 对应表 |
|------|------|--------|
| `BonusCollection.UnlockedTags` | 15 条叙事/成就 tag 字符串 | 艺术/音乐解锁条件；如 `xg.击杀.新娘阿花` |
| `BonusCollection.ViewedArt` / `ViewedMusic` | 0 / 0 | `DT_BonusArt`（146）/ `DT_BonusMusic`（66）行键 |

### 可编辑周目槽内

| 字段 | 本机 | 备注 |
|------|------|------|
| `Inventory.AllCodexID` | 全槽 `[]` | 名字像图鉴，但全程空；**暂不能当写入依据** |

`__Advanced__` 目前 SaveSmith **整槽只读透传**；要改图鉴必须开 Advanced 的定向写（其它键：衣柜、权益、`BossRecord` 等，误伤面大）。

## 资源表（CUE4Parse 导出于 `%TEMP%\pbz-codex-export\out`）

| 资产 | 行数 | 用途 |
|------|------|------|
| `DT_CodexEnemyDataTable` | **177**（boss≈75） | 敌人图鉴主表 |
| `DT_BonusArt` | 146 | 特典画册 |
| `DT_BonusMusic` | 66 | 特典音乐 |
| `DT_CodexData` | 10 | 像早期/杂项 Codex 行（`NewRow*`），**不是** 177 敌表 |
| `DT_CodexCharacterRenderDataTable` | 3 | 渲染预览 |
| `DT_TagCompleteDegree` | 3 | tag 完成度占位，字段未展开 |

### `DT_CodexEnemyDataTable` 关键字段

- `EnemyClass`：SoftObject，与存档 `DiscoveredEnemies` **同形**（例  
  `/PBZCombatAsset/.../BP_Monster_ZuoShang.BP_Monster_ZuoShang_C`）
- `Enemy_CH_Hans_Name` / `RevealedEnemy_CH_Hans_Name`：简中名（后者本 build 多为空）
- `bIsBoss`、`EnemyType`、`OwnMapID`、`DisplayOrder`
- `UnlockTag` / `RevealTag`：GameplayTag 结构；当前 ToString **未展开明文**（缺口）
- `AliasEnemyClasses`：别名 SoftObject 数组（导出多为空 `[0]`）
- `ReplacedByEnemyClass` / `bUseReplacementTargetEntry`：替换条目
- 图集：`WhiteIcon` / `HighPrecisionTexture` / `HalfBodyTexture`（`UI/.../Literature/Gallery/`）

交叉比对（`scripts/_pbz-analyze-codex.mts`）：

- 存档已发现 **111 / 111** 命中敌表 `EnemyClass`
- 表内尚缺 **66**（其中 boss **42**）——符合未打完进度，不是映射错误

## 与现有功能的边界

- Boss **战绩**（`BossRecord`）≠ 图鉴发现列表；改战绩不保证图鉴点亮（既有 design 已写明）。
- Boss **显示名**已用本表 `Enemy_CH_Hans_Name` 生成 `catalog/bosses.ts`；写入图鉴是另一条线。
- `docs/todo.md` 里的「扩 InventoryInfos」是背包道具，**不是** `__Advanced__.Codex`。

## 一期若做：建议边界

**可尝试：** 仅改 `__Advanced__.Codex.DiscoveredEnemies`（可选同步 `RevealedEnemies`），白名单路径必须来自 `DT_CodexEnemyDataTable.EnemyClass`；其它 Advanced 键字节透传。

**先不做：**

- 假装点亮道具/书籍全图鉴（`AllCodexID` / `DT_CodexData` 未证实）
- 未展开 `UnlockTag` 前，不承诺「揭示」与奖励/成就副作用
- 不把 `BonusCollection` 艺术/音乐绑进第一期

**验收门槛（实现前必过）：**

1. 副本档：追加 1 条**未发现**的 `EnemyClass` → 进游戏图鉴可见  
2. 一键写满 177 路径 → 游戏可载入、无崩溃；记录奖励/成就是否变化  
3. `RevealedEnemies` 单独 A/B（空表名 vs 揭示名）再决定 UI 是否暴露

### 手测档（2026-11-13）

- 探针目录：`...\Steam\76561198096595921-codex-probe\`
- 脚本：`scripts/_pbz-handtest-codex-one.mts`
- 注入：`BP_Monster_Scavenger` / **活人偶清道夫**（boss）
- `DiscoveredEnemies`：111 → 112；写回后解析仍含该路径
- **进游戏结果：无问题**（载入正常，图鉴侧接受该写入；作者确认）
- 结论：只写 `__Advanced__.Codex.DiscoveredEnemies`（白名单 `EnemyClass`）**可行**，可作为写入面

### 揭示探针（2026-11-13 已制备）

- 目录：`...\Steam\76561198096595921-codex-reveal\`
- 模式：仅追加 `RevealedEnemies`（已在发现列表中的 **少年左殇**）
- 脚本：`scripts/_pbz-handtest-codex-reveal.mts`
- 待进游戏确认揭示 UI；实现已同时支持发现+揭示

## 工具备忘

```powershell
$dotnet = 'C:\Program Files\dotnet\dotnet.exe'
$toolRoot = Join-Path $env:TEMP 'pbz-task1-tools'
$outDir = Join-Path $env:TEMP 'pbz-codex-export\out'
& $dotnet run --project (Join-Path $env:TEMP 'pbz-codex-export\PbzCodexDump') -c Release -- `
  'F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Content\Paks' `
  '0x4BC8A51E5381325073F2BC7D4E3089CD557C4E9B7D453901C2C795518867E01D' `
  (Join-Path $toolRoot 'ProjectPBZ-5.7.4-301524-full.usmap') `
  (Join-Path $toolRoot 'oodle\bin\oodle-data-shared.dll') `
  $outDir

$env:PBZ_SAVE='...\PBZSaveGame.sav'
npx vite-node scripts/_pbz-analyze-codex.mts
```

## 未决问题

1. `UnlockTag` / `RevealTag` 明文 tag 名（需更好的 CUE4Parse 展开或 FModel）  
2. `RevealedEnemies` 与 UI「揭示」是否一一对应  
3. `EnemyKillMapIDs` 非空真档长什么样  
4. `Inventory.AllCodexID` 是否死字段  
5. 只写 `DiscoveredEnemies` 会不会缺旁路 tag 导致图鉴有洞/无奖励  
