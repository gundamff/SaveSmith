# BALL x PIT：图鉴一键点亮 + 城镇资源

日期：2026-11-16  
范围：新模块 `ball-x-pit`；一期可写：弹珠/被动/组合图鉴一键点亮 + 四资源（金钱/麦/木/石）  
状态：**已实现**（2026-11-16；真档 `BALLXPIT_SAVE` 冒烟通过，进游戏手测待用户勾 HANDTEST）  
计划：`docs/design/2026-11-16-ball-x-pit-plan.md`

## 背景

《BALL x PIT》（开发 Kenny Sun，发行 Devolver Digital，Steam AppID `2062430`）。Unity IL2CPP（`GameAssembly.dll`）。

Windows 存档目录（本机已核实）：

`%USERPROFILE%\AppData\LocalLow\Kenny Sun\BALL x PIT\`

| 文件 | 作用 |
|------|------|
| `metaN.yankai` | 主进度（本机见 `meta1.yankai`） |
| `metaN_backup.yankai` | 游戏自管备份；**可与主档同尺寸但 SHA 不同** |
| `saveslotinfo.balls` | 槽位摘要（通关数、游玩时间、种子）；一期只读用于副标题 |

格式：.NET `BinaryFormatter` 风格二进制（UTF-16LE 字段名；流首字节 `0x02`，末字节 `0x05`）。无侧车 HMAC/checksum。Player.log 可见 Odin Serializer 初始化，但落盘形态与社区对 BinaryFormatter 字段扫描的描述一致。

本机 `meta1.yankai` 指纹（探路，不入库）：

- 根类型串：`MetaSaveData, Assembly-CSharp`
- 大段顺序：`Buildings` → `Chars` → `Blueprints` → `HeroStats` → `PassiveStats` → `NumHarvests` → … → `NumBossBlueprintsDropped`
- 图鉴段：`HeroStats`…`PassiveStats` 内约 114 条弹珠 `NumObtained` + 同行 `NumCombos`；`PassiveStats`…`NumHarvests` 内约 117 条被动 `NumObtained`
- 资源：`NumResources` / `TotalResources`；本机为 `08 count=5` + `marker=4` + 四资源（石在数组内）。社区旧文档/部分档为 `count=4`（石在数组后）。**一期两种都认**

公开对照（致谢，不捆绑源码）：[VdustR/game-save-ball-pit](https://github.com/VdustR/game-save-ball-pit)（MIT）的 `--unlock-wiki` / 资源编辑语义。

## 目标

1. 存档酱能发现上述目录，列出 `metaN.yankai` 槽位并打开。
2. **资源 Tab**：编辑当前城镇余额金钱 / 麦 / 木 / 石（只动 `NumResources`，不动生涯 `TotalResources`）。
3. **图鉴 Tab**：展示弹珠/被动/组合发现进度；**一键点亮**（将 `<=0` 的 `NumObtained` / `NumCombos` 单元写成 `1`，已有正值不覆盖）。
4. 写回：`parse → serialize` 未编辑时字节一致；编辑后长度不变、仅目标 `int32` 变化；游戏能载入。
5. 对主档与 `_backup` **各自从原字节打同一语义补丁**（禁止把主档整份覆盖到 backup）。
6. 遵守模块铁律：不碰 `fs` / 不直接 `invoke`；未知字节透传。

## 非目标

- 敌人图鉴（`EnemyData` / `NumDefeated` 等）——用户明确二期
- 单条弹珠/被动名单 UI、组合矩阵细改
- 角色解锁、建筑升级、NG+、蓝图、教程旗、成就灌水
- 改 `saveslotinfo.balls`、PlayerPrefs、云缓存
- 完整 BinaryFormatter / Odin 对象图反序列化
- 捆绑 Python 或社区运行时；不复制其源码（可致谢 + Clean-room）
- 付费/Twitch 专属角色所有权造假
- 保证 Steam Cloud 不回滚（文档免责：先退游戏；建议关云或接受回滚）

## 架构

### 模块边界

`id: 'ball-x-pit'` → `src/games/ball-x-pit/`，`registry.ts` 静态登记。

| 文件 | 职责 |
|------|------|
| `locate.ts` | 路径模板 + 识别文件名 |
| `slots.ts` | `metaN.yankai` 槽；`sessionFiles` 含主档 + 对应 `_backup`（若存在）+ 可选 `saveslotinfo.balls` |
| `model/binary.ts` | UTF-16LE 字段扫描、envelope 校验、资源/图鉴定位 |
| `model/resources.ts` | 读/写四资源投影 |
| `model/wiki.ts` | 图鉴进度投影 + `unlockAllWiki` |
| `parse.ts` | `SlotBytes` → state；serialize / validate |
| `actions.ts` | 空实现（点亮走 Tab → model，不另挂全局 action） |
| `views/` | `ResourcesTab`、`WikiTab`；`useSessionBindings` |
| `index.ts` | `GameModule` 导出 + catalog |

文案键前缀：`bxp.`

### 定位

```ts
windowsPathTemplates: [
  '%USERPROFILE%\\AppData\\LocalLow\\Kenny Sun\\BALL x PIT'
]
identifyAnyOf: ['meta1.yankai', 'saveslotinfo.balls']
identifyNameRegex: /^meta\d+\.yankai$/i   // 仅手动档也要能进
slotFilePatterns: ['meta*.yankai', 'saveslotinfo.balls']
```

勿用未注入的 `%APPDATA%`。

### 槽位

| 主文件 | id | sessionFiles |
|--------|-----|--------------|
| `metaN.yankai` | `meta-N` | `metaN.yankai`，若存在则加 `metaN_backup.yankai`；列表探测里有则附带 `saveslotinfo.balls`（只读摘要） |

- 标题：`存档 N` / `Slot N`
- 副标题：能从 `saveslotinfo.balls` 解出则显示通关关卡数与游玩时间；否则文件大小或「可编辑」
- `readable`：主档通过 envelope 校验才为 true

### 状态模型（内存）

```ts
interface BallXPitState {
  slot: number
  mainPath: string
  backupPath: string | null
  main: Uint8Array          // 工作副本（可 dirty）
  backup: Uint8Array | null // 工作副本
  originalMain: Uint8Array  // 用于未编辑短路 / 测试
  originalBackup: Uint8Array | null
  resources: { money: number; rice: number; wood: number; stone: number }
  wiki: { heroTotal: number; heroDiscovered: number; passiveTotal: number; passiveDiscovered: number; comboCells: number; comboDiscovered: number }
  dirtyResources: boolean
  dirtyWiki: boolean
  // saveslotinfo 仅摘要，不进 serialize
}
```

资源/图鉴变更直接改 `main`（及 `backup` 若有）字节缓冲中的对应 `int32`，再刷新投影计数。

### 二进制约定（Clean-room）

**字段名编码**：`u32le(字符数) + UTF-16LE`。

**Envelope（写前必过）**：

1. `data[0] === 0x02`，`data[data.length-1] === 0x05`
2. 唯一出现根串 `MetaSaveData, Assembly-CSharp`
3. 段字段唯一且有序：`Buildings` < `Chars` < `Blueprints` < `HeroStats` < `PassiveStats` < `NumHarvests` < `NumBossBlueprintsDropped`
4. 终端字段名后恰好 4 字节值 + 1 字节 terminator（与社区 envelope 一致；若本机版本漂移导致失败，**拒绝写**并报错，不瞎改）

**资源**：

1. 在 `NumResources` 字段名后 192 字节窗口内找唯一候选：`0x08` + `count∈{4,5}` + 紧随 `marker===4`
2. 读写四个余额：`count===5` 时为数组下标 1..4；`count===4` 时下标 1..3 为钱麦木，紧随数组后再读/写一个 `int32` 为石（与旧文档一致）
3. 只改 `NumResources`；`TotalResources` 透传
4. 范围：`0 … 2_147_483_647`（signed int32）

**图鉴一键点亮**：

1. 边界：`HeroStats` < `PassiveStats` < `NumHarvests`（均唯一）
2. 弹珠：`HeroStats..PassiveStats` 内每个 `NumObtained`（字段名后直接 `int32`）若 `<=0` → `1`
3. 组合：同区间每个 `NumCombos`：字段名后 64 字节内唯一 `0x08` + `count`（`1…1000`），`values` 为紧随的 `count` 个 `int32`；要求 `count ===` 弹珠 `NumObtained` 条数且 `values[0] === 4`（格式标记，**禁止改**）；仅对下标 `1..count-1` 中 `<=0` 的单元写 `1`（避免社区脚本从 `header+9` 起写 `count` 个导致越界 4 字节）
4. 被动：`PassiveStats..NumHarvests` 内 `NumObtained` 同第 2 步
5. 行数须与 `NumCombos` 行数一致；失败 → 不写、报错
6. **不**改 `NumUpgraded`、`NumDefeated`、`EnemyData`

### 写回策略

- `serialize`：返回已编辑的 `mainPath` 字节；若有 backup 路径则同时返回 patched backup
- 未 `dirty*` 时返回与 `original*` 相同引用/相同字节，宿主可跳过写盘
- 宿主已有备份机制；文档仍要求用户先退游戏、建议副本

### 界面

1. **资源**：四个 `el-input-number`；保存走会话绑定
2. **图鉴**：进度文案（弹珠 a/A · 被动 b/B · 组合格 c/C）+ 主按钮「一键点亮」；风险条：账号级进度、可能影响成就展示、非官方、先退游戏
3. 不做敌人页、不做上千行矩阵

封面：`cover.jpg`（商店头图可，文档声明版权归属权利人）。

### Catalog summary

中英均强调：非官方；请先退出游戏；Steam Cloud 可能回滚；权利人 Kenny Sun / Devolver Digital。

## 测试与验收

### 自动化

- envelope / 字段扫描 / 资源 round-trip（合成 fixture：最小合法头+段名骨架+资源数组+图鉴计数；**不提交玩家真档**）
- `unlockAllWiki`：全 0 → 全 ≥1；已有正值保留
- `count=4` 与 `count=5` 资源布局各一条
- `parse → serialize` 未编辑字节一致
- locate / slots / registry 登记
- 真档 E2E：`BALLXPIT_SAVE`（或同类）环境变量门控 + skip；无向量不假绿

### 手测（用户，副本）

1. 退出游戏；复制整目录
2. 改资源为易辨数值 → 进家园核对
3. 图鉴一键点亮 → 暂停菜单图鉴：弹珠/被动/组合已发现（敌人仍可缺）
4. 确认 `meta1` 与 `meta1_backup` 均被更新且游戏不因 backup 回滚旧图鉴

## 风险

| 风险 | 缓解 |
|------|------|
| 游戏小更新改段序/终端字段 | envelope 失败则只读报错，不开写 |
| `NumResources` count 4↔5 | 双布局探测；唯一候选校验 |
| 主/备不同步导致读旧 backup | 对两文件独立同语义补丁 |
| Steam Cloud 回滚 | 文档免责 |
| 组合矩阵维数≠弹珠数 | 拒绝点亮 |
| 一键点亮触发成就/统计副作用 | UI 风险条；只把 0→1，不灌巨量击杀 |

## 实现路径选择（已确认）

Clean-room TypeScript 字段偏移补丁（方案 1）。不整盘反序列化；不捆绑 Python。

## 澄清记录

- 一期深度：图鉴一键点亮 + 资源（非细粒度名单）
- 敌人图鉴：否（二期）
- 实现：Clean-room TS；致谢社区 MIT 文档
