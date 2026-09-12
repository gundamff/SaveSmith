# 龙之剑体验抛光 + README Shields + 关于免责声明

日期：2026-09-12  
范围：封面、槽位探测、关于文案、README badges  
状态：设计已确认，待实现计划

## 背景

用户反馈四项已知问题：

1. 龙之剑封面为纯色占位图  
2. 首页显示「已找到存档目录」，打开后「未找到存档槽位」  
3. 关于免责声明在未打开游戏时把 `SaveSmith` 填进权利人占位，语义错误  
4. README 需要 Shields.io 徽章（下载次数、版本、许可证、平台）

参考：`D:\eclipse\git\chaos-front-save-editor` 关于页免责声明写法。

## 目标

1. 用 Steam App `4570720` 商店头图替换 `src/games/dragon-sword/cover.jpg`（版权归 HOUND13；文档注明）。  
2. 修复多星 glob，使 `*/*_Slot*.db` 能匹配真实槽位路径。  
3. 关于免责声明对齐 chaos-front 单游戏工具语气：点名**游戏权利人 + 游戏名**，永不把 SaveSmith 当作「官方」。  
4. 中英 README 标题区增加四个 Shields 徽章。

## 非目标

- 不改 Steam 路径探测模板集合（本 bug 不在探测）  
- 不重做关于页布局  
- 不新增运行时依赖  
- 不强制本机一定能访问 Steam CDN（允许人工落盘封面）

## 根因（#2）

`matchSlotFilePatterns` → `segmentMatches` 对每个路径段只取**第一个** `*`：

- pattern 段 `*_Slot*.db` → prefix=`""`，suffix=`"_Slot*.db"`（第二个 `*` 成字面量）  
- 真实文件 `136330193_Slot1.db` 无法匹配  

探测用 `identifyNameRegex: ^[0-9]+$` 仍能认出 `SaveGames`，故卡片显示「已找到」；打开后 `listSlots` 得到空列表 → `emptySlots`。

## 方案

### 1. 封面

- 优先：下载 Steam `4570720` header / `header_image` 写入 `src/games/dragon-sword/cover.jpg`  
- 回退：本机 Steam `librarycache`；再回退：用户提供 `docs/promo/dragon-sword/` 素材后复制  
- `index.ts` summary 去掉「封面为占位图」类文案（若已换真图）  
- `docs/games/dragon-sword(.en).md` 注明封面来源与权利人

### 2. Glob 修复

- 修改 `src/sdk/session.ts`：`segmentMatches` 将段内 `*` 当作 glob（多星 → 正则，转义其余字符）  
- 单测：`136330193/136330193_Slot1.db` 匹配 `*/*_Slot*.db`；既有 Wanderburg 单星 pattern 不回归  
- 龙之剑 `locate.slotFilePatterns` 保持 `*/*_Slot*.db`

### 3. 关于免责声明

对齐 chaos-front-save-editor：

| 场景 | 中文要点 |
|------|----------|
| 已打开游戏 | `与 {权利人} / 《{游戏名}》官方无任何关联、授权或合作。…本地、单机…` |
| 游戏库（未开游戏） | `与各游戏官方无任何关联、授权或合作。…`（**禁止**回退到 `APP_NAME`） |

- `AboutDialog`：接收 `rightsHolder` + `gameName`（或等价），去掉 `rightsHolder || APP_NAME`  
- i18n：`about.disclaimer` / `about.disclaimerGeneric`（或单模板两套参数）  
- 英文字段对称  
- 可选：保留「禁止用于联机…」一句（与现 SaveSmith 语气一致，chaos-front 关于页较短；本设计**保留**联机禁令句，因产品多游戏且已有该句）

### 4. README Shields

仓库：`gundamff/SaveSmith`。中英 README 标题下增加：

| Badge | Shields |
|-------|---------|
| downloads | GitHub release downloads |
| version | GitHub release / tag |
| license | MIT |
| platform | Windows |

链接到 Releases 与 LICENSE。不引入构建脚本依赖。

## 测试

- `matchSlotFilePatterns` 多星用例 + 既有 nested 用例  
- 关于 i18n：无游戏时字符串不含 `SaveSmith` 作为权利人；有游戏时含权利人与游戏名  
- 全量 `npm test` / `typecheck`

## 决策记录

- 2026-09-12：封面选 Steam 商店头图（A）  
- 2026-09-12：免责声明模仿 chaos-front-save-editor，多游戏时分「当前游戏 / 各游戏」两态  
- 2026-09-12：Shields 全要（下载、版本、许可证、Windows）  
- 2026-09-12：槽位 bug 修 SDK glob，而非仅放宽 DS pattern
