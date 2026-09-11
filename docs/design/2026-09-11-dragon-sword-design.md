# 龙之剑：觉醒（DragonSword: Awakening）存档模块

日期：2026-09-11  
范围：一期功能对齐社区编辑器能力面（用户选项 C）  
实现策略：Clean-room（用户选项 A）  
状态：设计已确认，待写实现计划

## 背景

《龙之剑：觉醒》（Steam AppID `4570720`，权利人 HOUND13）主存档为游戏安装目录下的 SQLCipher v4 加密 SQLite（`*_SlotN.db`），不是明文 UE `.sav` 玩法库。存档酱现有三款游戏均为模块化 `GameModule` 接入；本设计新增第四个编译期模块。

社区已有开源编辑器（如 gfriloux/dragonsword-save-editor、DasNomNom/DragonSword-SaveStudio，Apache-2.0）。本仓库**不移植其业务代码**，仅以公开格式说明为规格做独立实现，并在文档中标注格式来源。这样即便日后产品形态变为订阅/商用，也不绑定其源码许可义务（格式事实本身不受版权保护；实现与目录数据自建）。

## 目标

1. 在存档酱中登记并打开龙之剑存档目录与槽位。
2. 解密 → 编辑 → 同 salt 再加密写回，且写前校验往返一致。
3. 一期提供与社区公开编辑器相当的**玩法侧**编辑面：货币、堆叠物品、料理与配方、装备、符文/业力、角色、编队、解锁（角色/称号/配方）、已拥有外观/坐骑装备、传送/区域等有把握字段。
4. 遵守存档酱铁律：模块不碰 `fs` / 不直接 `invoke`；宿主负责备份与原子写。

## 非目标

- 不复制 SaveStudio / dsa-save-editor 的源码、UI 或打包目录 JSON。
- 不修改 `SPack_Slot*.sav`（UE GVAS 槽位摘要）与截图。
- 不提供任意 SQL 控制台 / 未文档化表的裸改。
- 不强开付费未购外观、DLC 所有权、未上线内容。
- 不保证联机活动（讨伐/raid）下改档安全；文档明确单机/离线用途。
- 一期不做完整图标精灵图（可用文字 + CID；图标可二期）。
- 一期可不实现「全盘自动搜档」的深度遍历；以手动选目录 + Steam 常见路径探测为主。

## 公开格式来源（必须标注）

实现与用户文档须致谢并链接下列**公开格式说明**（研究/互操作用途）：

- [gfriloux/dragonsword-save-editor — docs/](https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs)  
  （save-files / encryption / database / content-ids / switches 等）

标注位置：

1. `src/games/dragon-sword/` 模块入口或 `crypto/` 文件头注释  
2. `docs/games/dragon-sword.md` 与 `.en.md`「格式说明」小节  
3. 若引入第三方派生目录数据，在游戏文档与仓库致谢中写明生成方式（不把游戏原始 XML 入库）

**禁止**：把上述仓库的实现文件（如 `internal/sqlcipher`、`savestudio/domain.py`）拷进本仓再改一层皮。

## 架构决策

### 推荐：全在游戏模块（TypeScript）

| 层 | 职责 |
|----|------|
| `crypto/sqlcipher.ts` | SQLCipher v4 页编解码（AES-256-CBC、4096、PBKDF2-HMAC-SHA512×256000、HMAC-SHA512）；口令按公开文档由固定常量/推导复现，**自写** |
| `db/` | 明文 SQLite：`sql.js` 加载/查询/写回字节；`integrity_check` |
| `model/` | 表 → `DragonSwordState` 投影与回写；`*_DBID` 用 **string**（超 2^53） |
| `catalog/` | 自建派生 JSON（CID→名称/分类）；无名称则显示 CID |
| `views/` | Element Plus Tabs，遵守现有 `editorBindings` / `savesmithRev` 契约 |
| 宿主 | 不变：列目录、读字节、备份、原子写 |

备选（本期不做）：Rust 加速 KDF；仅当实测打开槽位不可接受时再议。

### 定位与槽位

- Steam 安装形态：  
  `<library>/steamapps/common/<DragonSword folder>/DS/Saved/SaveGames/<accountId>/<accountId>_SlotN.db`
- `locate.windowsPathTemplates`：可列常见 SteamLibrary / `libraryfolders.vdf` 解析出的候选（实现计划里定具体模板）；失败则用户「选择存档目录」指向 `SaveGames`。
- `identifyAnyOf` / `slotFilePatterns`：匹配 `*/*_Slot*.db`（相对 `SaveGames`）。
- `listSlots`：每个匹配 db 一个槽；title≈`Account <id>`，subtitle≈`Slot N`；`sessionFiles` 仅含该 `.db`。
- 封面：自备 `cover.jpg`（商店宣传图或自制，注意权利人声明）。

### 解析 / 序列化 / 校验

1. `parse(files)`：取槽位 `.db` 字节 → 解密 → `sql.js` → 投影 state；解密/完整性失败则抛错，宿主展示加载失败。  
2. `serialize(state)`：打开工作副本（或内存 db）应用变更 → `integrity_check` → 导出明文页对齐字节 → **使用原文件 salt** 加密 → 可选再解密比对 → 返回 `SerializedFile[]`。  
3. `validate(state)`：金额/堆叠非负有限、已知 CID 范围告警、删除标记一致性、禁止写入付费墙标记字段等。

### 一期 UI（Tabs）

| Tab id | 数据 | 能力 |
|--------|------|------|
| `currency` | `tb_currency` | 改 `AMOUNT` |
| `items` | `tb_stackable_item` | 改/增堆叠 `STACK_CNT` |
| `cooking` | `tb_cook_item` + `tb_switch` 配方位 | 数量/实例与配方解锁 |
| `equipment` | `tb_equipment` | 强化等级、经验、锁定等安全字段；词条 CID 只读或受限 |
| `karma` | `tb_karma`（及公开 schema 已钉的关联字段） | 业力/符文数量与已确认可写列；未在公开文档钉死的列只读或不展示 |
| `characters` | `tb_character` | 等级、经验等 |
| `team` | `tb_team` | 槽位角色 CID（仅已有角色） |
| `unlock` | 角色相关表、`tb_title`、配方 switch | 解锁可获得内容；称号 bitmask 写 `BIT_FIELD` 时保留 `FAV_BIT_FIELD` |
| `cosmetics` | `tb_costume` / `tb_vehicle` / `tb_equip_mount` | **仅**已拥有装备/展示；不插入未购付费 CID |
| `world` | `tb_user` | 坐标、区域等有把握字段 |

`actions`：可选「货币拉满」「配方全开（可获得）」等按钮；不提供危险全局裸写。

### 目录数据（Clean-room）

- 开发脚本从本机游戏 pak/XML **导出派生** `catalog/*.json`（CID、分类、中英名称若可解析）。  
- 只提交派生 JSON；原始游戏资源不入库。  
- 若某类名称暂缺：UI 显示 `#CID`。  
- 不依赖运行时访问 th.gl；文档可注明社区地图站为玩家参考，非本模块依赖。

### 安全与产品边界

- 改档前必须退出 `DSClient-Win64-Shipping.exe` / 游戏进程（文档写明；可选后期做进程名提示，非 Must）。  
- 建议关闭 Steam Cloud 防回滚。  
- 关于页/游戏文档：非官方、HOUND13、仅限本地单机研究。  
- 与「以后订阅制」兼容：本模块无 Apache 源码依赖；仅文档致谢公开格式。

## 测试

- 单元：SQLCipher 固定盐/夹具往返；HMAC 错误拒绝；关键表 upsert；bigint/string DBID 不丢精度。  
- 投影：货币/堆叠/称号 bitmask 往返。  
- 真档冒烟：环境变量指向**临时拷贝**（不入库、CI 默认可跳过）。  
- 回归：`npm test`、`npm run typecheck`；不影响既有三游戏测试。

## 文档与登记清单

1. `src/games/dragon-sword/**` + `src/host/registry.ts`  
2. `docs/games/dragon-sword.md` / `.en.md`  
3. 根 `README.md` / `README.en.md` 支持游戏表一行  
4. `CHANGELOG.md` / `.en.md`  
5. 本设计文档与后续实现计划

## 风险

| 风险 | 缓解 |
|------|------|
| 游戏更新改加密或表结构 | 版本探测 + 加载失败文案；跟进公开格式 |
| PBKDF2 打开慢 | 加载态提示；必要时二期 Rust KDF |
| JS 大整数 | 全链路 string |
| 误改导致坏档 | 宿主备份 + 写前 integrity + 文档要求副本试验 |
| 目录版权 | 只提交派生数据 + 权利人声明 |
| 范围过大 | 实现计划按 Tab 切片；每片可合并，但一期目标仍为整表能力面 |

## 实现顺序（概要，细节见后续 plan）

1. SQLCipher + sql.js 往返骨架与空壳模块登记  
2. 定位/槽位 + 货币/堆叠 Tab  
3. 角色/编队/装备  
4. 料理/switch 配方、称号、业力  
5. 外观/坐骑（仅已有）、世界坐标  
6. 目录导出脚本与中英名称填充  
7. 文档、Changelog、手测清单

## 决策记录

- 2026-09-11：用户确认 Clean-room（A）、一期范围 C、格式来源须标注。  
- 2026-09-11：技术选型「全 TS 模块内编解码 + sql.js」。  
- 2026-09-11：不改 GVAS；不移植社区编辑器源码。
