# Eslabong

[**中文**](eslabong.md) | [English](eslabong.en.md)

非官方存档修改说明。权利人：**shirowita**（Steam AppID [4560660](https://store.steampowered.com/app/4560660/)）。与官方无关联。模块封面取自 Steam 商店头图，版权归 shirowita。

> Early Access：存档格式可能变更；写回依赖侧车 `integrity` 与当前版本对齐。

## 存档位置

默认（Windows）：

`%USERPROFILE%\AppData\Roaming\Godot\app_userdata\Eslabong`

识别文件示例：`campaign_save_0.json`、`campaign_autosave.json`（同名还有 `.res`）。只列手动档与当前自动档，不列 `campaign_autosave_N` 历史环。

进度在 `.res`（Godot RSCC 压缩资源）；侧车 `.json` 为摘要，保存时会重算 `integrity`，并同步 `gold` ↔ `.res` `player_gold`。

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 概览 | 金钱、声望、成长典籍；队名 / 赛季 / 周 / 存档时间只读 |
| 人物 | 阵容内已有佣兵：等级/经验、成长风格、倾向、出生/成长/生涯属性、个性、技能槽、伤病清除；可直接编辑已装备遗物的随机属性（不增删佣兵） |
| 物品 | 已有实例：品质、roll 属性、`stats`（不增删；不改市场列表） |

可编辑数值有静态合理区间（硬顶）；越界会在输入框卡住，保存前校验也会拒绝。

保存前自动备份（每文件最近 10 份），可在备份面板还原。挑战之塔 / PVP 相关字段透传、不进编辑 UI。

## 使用注意

1. 修改前**完全退出游戏**（退出时可能覆写存档）。
2. 首次请用存档**副本**试验。
3. EA 更新后若无法加载或写回，以当前版本发行说明为准，可能需要等待模块适配。
4. 不保证 Steam Cloud；若侧车与 `.res` 不成对（如错位自动档），可能无法打开或保存。

返回 [README](../../README.md)。
