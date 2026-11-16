# BALL x PIT

[**中文**](ball-x-pit.md) | [English](ball-x-pit.en.md)

非官方存档修改说明。权利人 **Kenny Sun / Devolver Digital**（Steam AppID [2062430](https://store.steampowered.com/app/2062430/)）。与官方无关联。游戏库封面取自 Steam library hero，版权归权利人。

## 存档位置

`%USERPROFILE%\AppData\LocalLow\Kenny Sun\BALL x PIT\`

| 文件 | 说明 |
|------|------|
| `metaN.yankai` | 主进度 |
| `metaN_backup.yankai` | 游戏自管备份（可能与主档不完全相同） |
| `saveslotinfo.balls` | 槽位摘要（本工具只读） |

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 资源 | 当前城镇金钱 / 麦 / 木 / 石（只改 `NumResources`，不改生涯 `TotalResources`） |
| 图鉴 | 弹珠 / 被动 / 组合发现进度；**一键点亮**（未发现→1，已有正值保留） |

**不做：** 敌人图鉴、角色解锁、建筑等级、NG+、单条名单细改。

格式为 BinaryFormatter 风格二进制字段补丁（Clean-room）。公开格式对照致谢 [VdustR/game-save-ball-pit](https://github.com/VdustR/game-save-ball-pit)（MIT），不捆绑其源码。

## 使用注意

1. **完全退出游戏**后再改档保存。
2. 建议用存档**副本**试验；工具也会自动备份。
3. 保存时会同时补丁主档与对应 `_backup`（各自从原字节改，不用主档整份覆盖 backup）。
4. Steam Cloud 可能回滚本地修改；可暂时关闭云同步或接受回滚风险。
5. 一键点亮可能影响成就/收集展示；不含敌人页。

## 测试

真档冒烟由环境变量 `BALLXPIT_SAVE` 门控（指向某 `metaN.yankai` 副本）：

```
BALLXPIT_SAVE=<path\to\meta1.yankai> npm test
```

返回 [README](../../README.md)。
