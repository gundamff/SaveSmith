# 重生2我独自逆袭

[**中文**](re2-i-rise-alone.md) | [English](re2-i-rise-alone.en.md)

非官方存档修改说明。权利人 **Proudmate Entertainment**（Steam AppID [3816120](https://store.steampowered.com/app/3816120/)）。与官方无关联。游戏库封面取自 Steam library header，版权归权利人。

## 存档位置

`%USERPROFILE%\AppData\LocalLow\ProudmateEntertainment\重生2我独自逆袭\`

| 文件 | 说明 |
|------|------|
| `SaveData.dat` | 全部手动/自动槽（单文件多槽，AES 加密 JSON 袋） |

## 可编辑内容

| 标签 | 内容 |
|------|------|
| 资源 | 主角全部基础属性（对齐游戏 `GetAllPropertyKey`）；缺键保存时补建 |

| UI | `Data` 键 |
|----|-----------|
| 体能 | `property_Property_Stamina` |
| 智慧 | `property_Property_Wisdom` |
| 魅力 | `property_Property_Charm` |
| 道德 | `property_Property_Morality` |
| 酒量 | `property_Property_CapacityForLiquor` |
| 行动力 | `property_Property_Execution` |
| 金钱 | `property_Property_Money` |
| 压力 | `property_Property_Pressure` |

**规则：** 八项始终显示；存档无键时编辑器按 0 展示，写入后补建。界面可能叠回合临时加成，与存档基数不完全一致。

**不做：** 好感度（含 `MMFavorability` 等）、图鉴/解锁、物品增减、剧情旗、外层 mgr 袋、`CurKey` 等。

格式为 AES-192-ECB-PKCS7 加密的 UTF-8 JSON 袋（Clean-room）。密钥来自游戏内常量；解密复用 SaveSmith 已有依赖 `node-forge`，不向本游戏模块捆绑独立运行时。

## 使用注意

1. **完全退出游戏**后再改档保存。
2. 建议用存档**副本**试验；工具也会自动备份。
3. 保存只替换脏槽的 `{uuid}_Data` 字符串，其余外层键与未编辑槽原样，再整袋加密写回 `SaveData.dat`。
4. Steam Cloud 同步 `*.dat`，可能回滚本地修改；可暂时关闭云同步或接受回滚风险。
5. 数值无硬上限校验，乱填可能导致游戏自钳或异常；请谨慎。

## 测试

真档冒烟由环境变量 `RE2IRA_SAVE` 门控（指向 `SaveData.dat` 副本）：

```
RE2IRA_SAVE=<path\to\SaveData.dat> npm test
```

返回 [README](../../README.md).
