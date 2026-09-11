# 泰拉瑞亚

[**中文**](terraria.md) | [English](terraria.en.md)

非官方存档修改说明。权利人：**Re-Logic**（Steam AppID [105600](https://store.steampowered.com/app/105600/)）。与官方无关联。

> 第一版仅支持**原版玩家** `.plr`（不含世界 `.wld`、不含 tModLoader 保证）。

## 存档位置

默认（Windows，优先系统「文档」已知文件夹，支持重定向如 `D:\user\Documents`）：

`%DOCUMENTS%\My Games\Terraria`

兼容回退：`%USERPROFILE%\Documents\My Games\Terraria`。

槽位：`Players/*.plr`（不读写 `.plr.bak` 与同名目录下的 `.map`）。

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 角色 | 名字、难度、生命/魔力、铂/金/银/铜（写入币槽） |
| 物品 | 热键栏、主物品栏、装备/时装/饰品；可搜索物品表或手输 ID |

改档内名字**不会**重命名 `.plr` 文件，以免断开同名地图目录关联。

保存前自动备份（每文件最近 10 份），可在备份面板还原。

## 使用注意

1. 修改前**完全退出游戏**。
2. 首次请用存档**副本**试验。
3. 超高生命/堆叠可能被游戏裁剪，以进游戏后结果为准。
4. 物品名称表来自官方 Wiki 对照（约 6000+）；极少数缺失仍显示 `#ID`，可手输。

返回 [README](../../README.md)。
