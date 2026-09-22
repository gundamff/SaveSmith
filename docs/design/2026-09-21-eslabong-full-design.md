# Eslabong 完整改档（纯 TypeScript）

日期：2026-09-21  
范围：写回通道 + 全局资源（金钱/声望/成长典籍）+ 已有人物（等级/成长风格/倾向/属性/个性/技能/伤病）+ 已有物品（含声望 roll 的随机属性/品质）  
状态：已实现；实现计划见 `docs/design/2026-09-21-eslabong-full-plan.md`  
前置：只读一期已落地（`docs/design/2026-09-21-eslabong-readonly-design.md`）  
实现策略：纯 TypeScript（不向玩家分发 Godot）；本机 Godot 仅作开发期对拍

## 背景

Eslabong（shirowita，Steam `4560660`）存档为：

- 侧车 `campaign_*.json`（队名、金币、赛季、周、`integrity`、`campaign_lineage_hmac`）
- 同名 `.res`：Godot `RSCC`（Zstd）压缩的二进制 `CampaignSave`

只读一期已能列槽、展示侧车。完整改档必须：解压 → 改 Resource → 再压 → **重算侧车校验**，游戏才认。

曾评估「捆绑 headless Godot 助手」：空导出模板约 80–100 MB，相对当前便携版 ~8.4 MB 膨胀约 10×，且加密 pck 导致助手难以加载游戏脚本类。**否决。** 产品路径定为纯 TS。

真档中已观察到的相关键（实现时再锁白名单）：`player_gold`、`renown`、`development_stars`、`growth_styles`、`birth_*` / `growth_base_*` / `career_*`、个性向数值（如 `adaptability`、`showmanship`…）、`ai_profile`、物品 `quality` / `rolled_modifiers` / `stats`。

## 目标

1. 打开手动档 / 当前自动档后，可编辑白名单字段并成功写盘，游戏能载入。
2. 人物：只改阵容内**已有**佣兵——等级/经验、成长风格、倾向、出生/成长/生涯属性、个性相关数值、技能槽引用；清除伤病与约定的战斗状态字段。
3. 物品：只改**已有**实例——含用声望 roll 出的随机属性（`rolled_modifiers` / 品质 `quality` 等）；可同槽替换已知引用。
4. 概览/全局：可改金钱、声望、成长典籍（`development_stars`）；队名/赛季/周/队徽只读。
5. 挑战之塔 / PVP 相关数据整段忽略（透传、不进 UI、不提供一键修改）。
6. 遵守模块铁律：不碰 `fs`、不直接 `invoke`；备份与原子写仍由宿主完成。

## 非目标

- 不增删佣兵、物品实例、市场生成结果。
- 不改 `settings.cfg`、成就、`global_progression.json`、自动档历史环 `campaign_autosave_N`。
- 不捆绑 Godot / 不要求玩家安装 Godot。
- 不保证 Steam Cloud；不保证挑战之塔等异步对战公平（相关字段不改）。
- 不实现完整通用 Godot Resource 编辑器；只覆盖本游戏白名单路径。

## 架构

### 写回流水线

```
sidecar JSON + .res
  → RSCC decompress
  → Resource model (whitelist + opaque passthrough)
  → UI edits existing entities only
  → serialize Resource
  → RSCC compress
  → recompute integrity (+ lineage hmac if required)
  → host atomic write (json + res)
```

### 模块边界

| 单元 | 职责 |
|------|------|
| `rscc.ts` | Godot `FileAccessCompressed` 编解码（已有，沿用） |
| `resource/` | 二进制 Resource 解析/序列化；未知属性透传 |
| `integrity.ts` | 与游戏一致的侧车校验；开发期对拍夹具 |
| `model/` | 全局资源、佣兵、技能槽、物品随机属性的读写 API |
| `catalog/` | 技能/遗物/显示名/品质与 stat_id 枚举；来自明文或本档已见值 |
| `views/` | 概览 / 人物 / 物品 |
| Godot（仅开发） | 解压对拍、integrity 黑盒对照；**不进发行包** |

### 与只读一期关系

- `locate` / 槽位策略保持：手动 + 当前自动；不列 `autosave_N`。
- `serialize` 从「原样回写」改为「重算后写出」；未脏字段仍应与输入语义一致。
- 概览页从只读升级为金钱/声望/典籍可编辑；提示改为「请先退出游戏」。

## 编辑面

### 概览（全局资源）

- 可写：
  - 金钱：侧车 `gold` 与 `.res` `player_gold`（并存时必须同值）
  - 声望：`.res` `renown`；`highest_renown_reached` 保存时取 `max(原值, 新声望)`（只升不降，避免成就回退）
  - 成长典籍：`.res` `development_stars`（账本里 academy/典籍相关资源）
- 只读：`team_name`、`season`、`week`、`saved_at_text`、难度（若有）
- 不展示 / 不编辑：`integrity`、`campaign_lineage_*`、挑战之塔提交标记（原样写回）

### 人物

对阵容内每个已有佣兵：

- 进度：`level`、`experience`
- 成长风格：`growth_styles` 及关联 remainder / `levelup_stat_bonus_*`
- 倾向：`ai_profile` 内已暴露的倾向数值（只改已知标量，不拆未知子树结构）
- 属性：`birth_*`、`growth_base_*`、`career_*`，以及白名单 `stat_*` / mastery 基数
- 个性：个性向数值（真档已见如 `adaptability`、`teamwork_affinity`、`revenge_factor`、`showmanship`、`situational_awareness` 等；探路时锁全表）
- 技能：`skill_01`…`skill_03`（及已确认 mastery / specialization 槽）下拉替换为已知 `res://`
- 伤病与战斗状态：按字段表白名单清除（禁止「清掉一切」）

页内动作（可选）：「拉满等级/经验」「清除伤病」——仅当前筛选结果。

### 物品

- 列出已装备 / 已持有实例
- **随机属性 / 品质（声望 roll）**：编辑 `quality`、`rolled_modifiers`、`exceptional_roll`（若有）、`stats[]`（`stat_id` / `amount` / `ratio` / `display_value` 等）
- 定义引用可换成同槽兼容的已知物；无兼容表时仅允许本档已出现过的同类路径
- 不创建空槽新实例；默认不改 `market_listings` 生成器

### 目录

1. 优先从未加密明文抽表。
2. 否则用本档已出现的 `res://` 与枚举值。
3. 发版不依赖解开 `eslabong.pck`。

## 校验与错误

- `validate`：金钱/声望/典籍/等级/经验及可编辑属性为有限非负（个性/倾向允许有限浮点）；引用合法；物品 `stats` 结构完整；越界拒存。
- RSCC / Resource / integrity 失败 → 不写盘；中英错误键。
- 空序列化 → `EMPTY_SERIALIZE`。
- EA 格式变更风险写入 `docs/games/eslabong.md`。

## integrity

- 未对齐前禁止写盘（保存禁用并提示）；可只读打开。
- 对齐后每次保存重算 `integrity`；`campaign_lineage_hmac` 仅在对拍需要时更新。
- `gold` ↔ `player_gold` 必须同值；声望/典籍以 `.res` 为准。
- 无对照向量的 integrity 测试必须 `skip`，不得假绿。
- 手测：改金钱或等级后游戏能载入。

## 实现探路门禁（写功能 UI 之前）

1. 真档 RSCC 解压 → 再压 → 游戏仍能载入。
2. 对齐 `integrity`（改 `player_gold` / 侧车 `gold`，游戏接受）。
3. 锁定字段表（全局 / 人物成长·个性·倾向 / 物品 roll 属性）写入 `model` 或本文件附录。
4. 再做概览 / 人物 / 物品 UI。

## 测试

- 单元：RSCC、Resource 往返、integrity（有向量时）、全局资源与人物/物品补丁不误伤透传字段
- 模块：parse → 编辑 → serialize → parse
- 可选 `ESLABONG_SAVE` 真档 E2E（不入库）
- 更新游戏文档中英页

## 触及文件（预期）

- `src/games/eslabong/**`
- `src/host/i18n/zh.ts`、`en.ts`
- `tests/eslabong/**`
- `docs/games/eslabong.md`、`eslabong.en.md`
- 后续 `docs/design/2026-09-21-eslabong-full-plan.md`

## 验收

1. `npm test` / `npm run typecheck` 通过。
2. 本地真档：改金钱/声望/典籍 + 改一名佣兵成长风格/个性/属性/技能 + 改一件物品的 roll 属性/品质 → 游戏能载入且数值生效。
3. PVP/塔相关字段语义保持。
4. 发行包不增加 Godot 运行时。

## 决策记录

| 项 | 选择 |
|----|------|
| 交付范围 | 同一期：写回 + 全局资源 + 人/物/等级/技能（含成长风格/倾向/个性与物品 roll 品质） |
| 实体 | 只改已有，不增删 |
| PVP / 挑战之塔 | 忽略（透传） |
| 运行时 | 纯 TS（B）；不捆绑 Godot |
| 队名/赛季/周 | 只读 |
| 自动档历史环 | 不列出 |
| 最高声望 | 随当前声望只升不降 |
