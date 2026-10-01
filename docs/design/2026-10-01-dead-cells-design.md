# 死亡细胞（Dead Cells）存档模块设计

日期：2026-10-01
范围：元进度编辑器（S_User）+ 通用 hxbit 编解码层
实现策略：独立 `GameModule` + 自研容器编解码 + 通用 HXS（hxbit）编解码，S_User 投影为资源/蓝图/统计三视图
状态：已设计
计划：`docs/design/2026-10-01-dead-cells-plan.md`

## 背景

《死亡细胞》（Steam AppID `588650`，开发者 Motion Twin / Evil Empire）。PC 存档为自定义二进制格式（非 Unity/ES3）：

- **Steam Cloud 开启时**（本机实测）：`C:\Program Files (x86)\Steam\userdata\<steamid3>\588650\remote\user_N.dat`，游戏目录 `save\` 仅有 `steam_cloud.dat` 标志文件
- **Steam Cloud 关闭时**：`<游戏目录>\save\user_N.dat`
- 同目录 `dc_options.json` 为键位/设置（本期不编辑）

社区已有完整格式研究（ModDocCE 社区文档 + `N3rdL0rd/alivecells` MIT 参考实现），本模块据此移植为 TypeScript，不依赖外部运行时。

### 存档容器格式（已在真实存档验证）

59 字节头 + zlib（level 9）压缩 payload：

| 偏移 | 长度 | 字段 | 说明 |
|---|---|---|---|
| 0 | 4 | magic | `DE AD CE 11` |
| 4 | 1 | version | `1` |
| 5 | 20 | sha1 | 全文件 SHA-1，计算时该 20 字节置零（已实测匹配） |
| 25 | 20 | githash | 写档游戏版本的 git commit |
| 45 | 10 | builddate | `YYYY-MM-DD` UTF-8 |
| 55 | 4 | flags | u32 LE，数据块位掩码 |

payload 解压后按 flags 位升序排列数据块，每个数据块 `[u32 LE size][contents]`：

| bit | 名称 | 类型 |
|---|---|---|
| 0 `0x001` | S_User | hxbit（元进度：解锁/细胞/金币/统计） |
| 1 `0x002` | S_Game | hxbit（进行中的一局，约 90 个实体类） |
| 2 `0x004` | S_UserAndGameData | hxbit（开局时 User 快照） |
| 3 `0x008` | S_Date | f64 unix 时间戳 |
| 4/5/6 | S_Experimental / S_UsesMods / S_HaveLore | 纯特性标志，无数据块 |
| 7 `0x080` | S_VersionNumber | f32 游戏版本 |
| 8 `0x100` | S_DLCMask | u32 DLC 掩码 |

### hxbit（HXS）格式

自描述二进制序列化（Haxe hxbit 库）：`[HXS][版本]` + 类表（类名 + clid + crc）+ schema 段（类名→字段名+类型）+ 对象数据（UID 引用图）。类型编码：VarInt（<0x80 单字节，否则 `0x80`+i32 LE）、String（len+1 前缀）、对象引用（UID，0 为 null）等。schema 存在于存档内，游戏更新后仍可解析。

## 目标

1. 在存档酱中登记并打开 Dead Cells 存档目录与槽位（`user_*.dat` 每文件一槽）
2. 容器 + hxbit 双层往返：解析 → 编辑 → 序列化；未知字段透传，避免整 schema 重生毁档
3. S_User 元进度编辑面：资源（金币/细胞）、蓝图解锁（ItemProgress）、统计（UserStats）+ 皮肤/BossRush 解锁
4. 写回后校验和有效（SHA-1 置零法），游戏可正常加载
5. 遵守存档酱铁律：模块不碰 `fs` / 不直接 `invoke`；宿主负责备份与原子写

## 非目标

- 不编辑 S_Game（局内状态）与 S_UserAndGameData —— 极易坏档且含 Twitch 集成引用
- 不编辑 `dc_options.json`（键位/设置）
- 不做移动端/主机存档（magic `20DEAD19` 等）转换
- 不把 hxbit 编解码抽进 `@sdk`（仅本游戏需要，YAGNI）
- 不保证 Steam Cloud 同步中写档的安全（文档同等免责：必须先退出游戏）
- 不做增删实体（ItemProgress 只改已有条目的数值/开关）

## 架构

### 模块边界

新建 `src/games/dead-cells/`，`src/host/registry.ts` 静态登记；`id: 'dead-cells'`。

| 文件 | 职责 |
|----|------|
| `model/container.ts` | 头部解析/重建、flags 分块拆装、SHA-1 置零重算 |
| `model/hxbit.ts` | 通用 HXS 编解码（VarInt/String/PropType/对象引用图/schema） |
| `model/userModel.ts` | S_User 类型化投影：资源 / ItemProgress / UserStats / 皮肤 / BossRush |
| `parse.ts` | `SlotBytes` → state；serialize / validate |
| `locate.ts` / `slots.ts` | 默认路径模板与槽位摘要 |
| `views/` | Tab UI（3 页） |
| `index.ts` | `GameModule` 导出 |

Catalog 元数据：中文「死亡细胞」/ en「Dead Cells」；`steamAppId: 588650`；`rightsHolder: Motion Twin / Evil Empire`。

### 数据流

```text
ListedFiles
  → listSlots（user_N.dat 摘要）
  → parse(user_N.dat)（容器拆块 → S_User hxbit 解码 → 投影）
  → views 编辑 DeadCellsState
  → validate（数值钳制 / 结构校验）
  → serialize（投影回写 → hxbit 重编码 → 容器重建 + SHA-1）→ 宿主备份 + 原子写
```

## 存档模型与可编辑面

### 槽位

- `user_*.dat`（`user_0.dat` 为主档；每文件一个槽位）
- 打开槽位 `sessionFiles`：仅该 `user_N.dat`（`dc_options.json` 不参与）

### 投影与 Tab

| Tab | 数据 | 一期能力 |
|-----|------|---------|
| 资源 | `deathMoney`（金币）、`deathCells`（细胞） | 改数值；非负钳制 |
| 蓝图解锁 | `itemMeta`/`itemProgress`（itemId、unlocked、investedCells、isNew、forgeInvestedCells） | 切换解锁、改投入细胞 |
| 统计 | `UserStats` 计数器（killed/goldEarned/cellsEarned/…）；`heroSkin`/`heroHeadSkin` 皮肤；`bossRushData` 解锁 | 统计只读展示；皮肤/BossRush 开关可改 |

### 数值约束

1. 金币/细胞：非负整数，上限钳到 i32 安全范围（hxbit Int 为变长编码，负值合法但业务上不允许）
2. ItemProgress.investedCells：非负；unlocked/isNew 为布尔
3. 解析失败或校验不匹配 → `ModuleError` 禁止写档

## 编解码层

- **container**：解析时校验 SHA-1（不匹配则抛错）；写回时保留原 githash/builddate/feature flags（bit 4/5/6），仅由现存数据块重建 chunk flags（bit 0/1/2/3/7/8）并重算 SHA-1。zlib 用原生 `DecompressionStream`/`CompressionStream('deflate')`（WebView2 与 Node 18+ 均可用；`parse/serialize` 契约支持 Promise），**零新增依赖**
- **hxbit**：移植 alivecells（MIT）`core.py` 的编解码语义为 TypeScript；未知类型/未知字段按 schema 透传；对象引用图（UID）保持拓扑不变
- **userModel**：仅投影 S_User；S_UserAndGameData / S_Game 字节级透传不动

验收门槛：未编辑时 `parse → serialize` 输出与原档语义一致（字节级一致为目标，zlib 重压缩允许字节差异但解压后 payload 必须逐字节一致）；改字段后重解析值正确且校验和有效。

## 参考资料

- ModDocCE（Dead Cells 社区模组文档）：https://n3rdl0rd.github.io/ModDocCE/files/save
- `N3rdL0rd/alivecells`（MIT）：`savetool/savetool.py` 容器读写、`savetool/web/py/hxbit/core.py` hxbit 编解码
- `Juanipis/deadcells-save-sync`（MIT）：`docs/SAVE_FORMAT.md` 格式规格
- `HeapsIO/hxbit`：hxbit 库源码（Serializer.hx）

## 错误处理

- 头部 magic / SHA-1 不匹配 / zlib 解压失败 → `ModuleError` 明确报错，不写档
- hxbit schema 未知类型 → 透传；无法定位目标字段 → 编辑禁用并提示
- 写档前 `validate` 钳制数值；结构异常禁写

## 测试

- 合成 fixture：构造最小 S_User 存档（程序生成，不入真实存档）
- container / hxbit / userModel 各自 round-trip 单测
- 模块契约测试（registry 断言 6→7）
- 真实存档 e2e：`DC_SAVE` 环境变量门控（CONTRIBUTING 规则：真实存档不入库）
