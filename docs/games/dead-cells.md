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
| 资源 | 金币（`deathMoney`）、细胞（`deathCells`） |
| 蓝图解锁 | 物品解锁表（`itemProgress`）：已解锁、新获得、投入细胞 |
| 统计 | 生涯统计只读展示；皮肤 / 头部皮肤（字符串）；Boss Rush 解锁开关 |

存档为自定义二进制格式（59 字节头 + zlib + hxbit 序列化），头内含 SHA-1 校验；保存时自动重算校验和，未改动的字节保持原样。

## 使用注意

1. 修改前**完全退出游戏**。Steam 云在游戏退出时上传存档——若在游戏运行时改档，游戏退出会用内存中的旧档**覆盖**你的修改。
2. 改档后建议先在游戏内确认生效，再进行正常游玩；写坏了用备份面板还原。
3. 首次请用存档**副本**试验。
4. 皮肤 ID 为游戏内部标识符（如 `default`），填入不存在的 ID 可能导致显示异常。
5. 金币/细胞不设业务上限，仅保证非负整数；异常大数值的行为以游戏为准。
6. `S_Game`（进行中的一局）与 `dc_options.json` 永不改动，字节级透传。

保存前自动备份（每文件最多 10 份），可在备份面板还原。

## 测试

真实存档冒烟测试由环境变量 `DC_SAVE` 门控（指向 `user_0.dat`）：

```
DC_SAVE=<path\to\user_0.dat> npm test
```

返回 [README](../../README.md)。
