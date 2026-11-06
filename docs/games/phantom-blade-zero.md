# 影之刃零（Phantom Blade Zero）

非官方、仅限单机的存档修改支持。权利人及开发：S-GAME Studio；发行：S-GAME Publishing。Steam AppID `4115450`。

当前已验证 Steam build `26266538`。游戏更新后格式或密钥可能变化；认证失败时 SaveSmith 会拒绝保存，而不是冒险写入。

## 存档位置与槽位

默认目录：

`...\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\`

物理主档只有 `PBZSaveGame.sav`。SaveSmith 将其中的 `AutoSaveN` / `ManualSaveN` 显示为可编辑内部槽位。

- `1RealTime`、`2Hourly`、`3Daily` 是游戏自身的备份目录，不会显示为 SaveSmith 槽位。
- `__Advanced__`、`__Achievements__` 是特殊槽，仅只读透传。
- 设置档不受支持。

格式为 PBZS v3：AES-256-GCM 认证加密；可读 raw / zlib / Oodle 槽；脏槽写回为 Oodle stored（`compression=2`，`0xCC06` 分块，无真实压缩）。认证或解析失败会停止写入。

**小黑盒等战绩查看器：** 脏槽标记为 Oodle，一般可被只认 Oodle 的查看器解析。这不是游戏同款压缩器——请先保留改前备份。

## 可编辑范围

资源页显示内部槽位选择，以及分类 Tab：**武器强化材料**、**养成**、**主武器**、**影之武装**、**饰品**。另有顶层 Tab：**战绩**、**进度**。

- `Player.Dust` 中文显示为游戏正式名称「意识尘埃」；内部字段仍是 `Dust`
- 进度：周目只读展示（`max(CycleCount, CycleRecords 条数)+1`）；游戏内周目不靠改 `CycleCount` 生效，故不提供编辑。可编辑 `HasGameTime` / `CurrentCycleGameTime`（HMS，双写）。不改 `CycleRecords`
- 战绩：`PBZDeathMeta.DiedTimes`；`BossRecord.*.Records.*.AttemptCount`（按小黑盒头骨语义 `AttemptCount − KillCount` 编辑被击杀次数；不改 `KillCount` / 通关态）；已有合法 `BestTimeMs` 的行可按整秒改最快用时（存盘为毫秒，SaveSmith 只接受整秒，亚秒会丢失）
- 未遭遇 BOSS 或无有效 `BestTimeMs` 的行不能伪造用时
- 27 种武器强化材料：可改已有数量，也可按正式中文名或内部 ID 搜索后添加，或从背包删除记录
- 材料**编辑**上限为 `0..9999`；提高 `CurrentAmount` 超过原 `MaxAmount` 时会同步提高 `MaxAmount`。若真档已超过 9999（例如拉满后再掉落），仍可打开/保存，编辑器允许保留或下调，但不会再往上加超过该上限
- 「养成」收录游戏内养成向条目：黑石/杀气琥珀及其碎片、杀气核心、榕树之心、饰品/药剂强化材料、穿行符等（共 12 项）
- 穿行符 SaveSmith 上限为 `0..99`；其余养成物品为 `0..9999`
- 已存在物品再次添加时只增加数量，不创建重复记录；删除会从 `InventoryInfos` 移除该键
- **主武器 / 影之武装 / 饰品**（唯一件）：可添加、改强化等级、删除；目录来自 build 表筛选后的静态 `equipment.json`。**可能坏档**——Tab 内有醒目警示，修改前务必备份。装备中的主武/影武禁止删除；删除饰品时会将 `AccessoryIDs` 中对应槽改为 `"None"`
- 名称来自 build `26266538` 的游戏简中资源。该 build 的英文资源没有这些物品名，因此英文界面显示可读 ID（如 `Weapon Material 01`），不编造英文译名，也不回退中文

### 实测效果（build 26266538）

| 类型 | 例子 | 改档后 |
|------|------|--------|
| 意识尘埃 / 武器强化材料 | `Dust`、`Weapon_Material_*` | 游戏内数量可用（如强化武器会扣材料） |
| 常规养成堆叠 | 穿行符、饰品/药剂强化材料等 | 背包可见，一般可按游戏逻辑使用 |
| **累加阈值类** | 黑石 / 杀气琥珀及其**碎片**（集齐 N 块永久加成） | **通常不会导致崩溃**；背包数量可显示，但**永久属性加成等阈值效果一般不会因此生效**（游戏可能另有进度/标记字段，不单看背包计数） |

黑石/琥珀及其碎片在添加对话框仍会显示阈值提示。若只想改「能立刻用上的」资源，优先改意识尘埃与武器强化材料。

不支持记忆之花、摄魂材料、书本、任务/剧情占位道具，也不支持药品、外观衣柜、成就、DLC 或设置档修改。炼魂等高级字段本期不提供独立编辑。后续会继续扩展可改内容。

## 安全须知

1. 修改前**完全退出游戏**。
2. 先复制整个 SteamID64 存档目录，并用副本验证。
3. 建议关闭 Steam Cloud；若保持开启，请接受云端覆盖或回滚本地修改的风险。
4. 本工具非官方，仅供正版游戏的本地单机使用。

## Oodle 与素材

Oodle 读取使用 Clean-room 构建的 MIT [`oozextract 0.5.7`](../../src/games/phantom-blade-zero/codec/oodle/UPSTREAM.md) portable WASM；脏槽写回使用同解码器可识别的 stored 分帧（非官方压缩器）。不使用 GPL `ooz-wasm`，也不捆绑官方 Oodle DLL。许可证见模块内 [`LICENSE`](../../src/games/phantom-blade-zero/codec/oodle/LICENSE)。

封面来自 Steam App `4115450` 商店 header，版权属权利人，仅用于 SaveSmith 库页识别。

实现边界与格式细节见[设计文档](../design/2026-10-30-phantom-blade-zero-design.md)。游戏更新后的解密 / 资源解包复盘见[续航手册](../design/2026-10-30-phantom-blade-zero-re-playbook.md)。
