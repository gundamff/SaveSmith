# 死亡细胞

[**中文**](dead-cells.md) | [English](dead-cells.en.md)

非官方存档修改说明。权利人 **Motion Twin / Evil Empire**（Steam AppID [588650](https://store.steampowered.com/app/588650/)）。与官方无关联。

> 第一版仅支持 PC（Steam）版 `user_N.dat` 元进度（`S_User`）编辑；不支持进行中的局内状态（`S_Game`）与移动端/主机存档。

## 存档位置

按以下顺序探测（`user_0.dat` / `user_1.dat` / `user_2.dat` 存在即命中）：

1. **Steam 云同步目录**（Steam 云开启时的权威副本）：

   `C:\Program Files (x86)\Steam\userdata\<SteamID3>\588650\remote`

2. **游戏目录下的 `save\`**（Steam 云关闭时）：

   `<游戏目录>\save\`（如 `D:\SteamLibrary\steamapps\common\Dead Cells\save`）

Steam 云开启时，游戏目录 `save\` 里通常只有 `steam_cloud.dat` 标志文件，真实存档在 Steam 云同步目录。探测不到时请手动选择上述目录之一。

同目录的 `dc_options.json` 是键位/设置，**不参与**编辑。每个 `user_N.dat` 是一个独立存档槽位。

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 资源 | 金币（`deathMoney`）、细胞（`deathCells`）、皮肤 / 头部皮肤（**下拉选择**，名称取自游戏本地化）、Boss Rush 解锁（中文字段名） |
| 蓝图解锁 | 物品解锁表（`itemProgress`）：物品名称（取自游戏官方本地化）、已解锁、新获得、投入细胞 |
| 皮肤 | 游戏全部 **149 套装束 + 43 个头饰**，可搜索、按类型筛选，解锁 / 锁定；存档里没有的皮肤会**新增物品进度条目** |
| 符文 | 永久符文解锁开关（藤蔓 / 传送 / 公羊 / 蜘蛛 / 人造人 / 自定 / 挑战者 / 探险家 / 旅行者 / 里希特…） |

物品、皮肤与符文显示名来自游戏本体的官方本地化（`lang/main.zh.mo`），皮肤与头部目录取自 `skin` / `customHead` 表；均由 `scripts/extract-dead-cells-names.mjs` 从已安装游戏提取生成 `data/item-names.json` 与 `data/skins.json`；未收录的 ID 直接显示原始标识符。

存档为自定义二进制格式（59 字节头 + zlib + hxbit 序列化），头内含 SHA-1 校验；保存时自动重算校验和，未改动的字节保持原样。

> **符文说明（实验性）**：符文以字符串 ID 形式存于 `permanentItems` / `metaItems` 两个列表，本工具**同时写入两处**。该字段尚未经社区实测确认，若游戏内未生效请把存档副本反馈，以便定位。修改前会自动备份。

## 使用注意

1. 修改前**完全退出游戏**。Steam 云在游戏退出时上传存档——若在游戏运行时改档，游戏退出会用内存中的旧档**覆盖**你的修改。
2. 改档后建议先在游戏内确认生效，再进行正常游玩；写坏了用备份面板还原。
3. 首次请用存档**副本**试验。
4. 皮肤 ID 为游戏内部标识符（如 `default`），填入不存在的 ID 可能导致显示异常。
5. 蓝图条目的「投入细胞」在真实存档里可能是负数哨兵值（如 `-2`），这是游戏内部状态，**不建议改动**；未解锁条目为 `0`。
6. 金币/细胞不设业务上限，仅保证非负整数；异常大数值的行为以游戏为准。
7. `S_Game`（进行中的一局）与 `dc_options.json` 永不改动，字节级透传。

保存前自动备份（每文件最多 10 份），可在备份面板还原。

## 测试

真实存档冒烟测试由环境变量 `DC_SAVE` 门控（指向 `user_0.dat`）：

```
DC_SAVE=<path\to\user_0.dat> npm test
```

返回 [README](../../README.md)。
