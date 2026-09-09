# Wanderburg 存档模块（SaveSmith 第二款游戏）

日期：2026-09-09  
状态：设计已确认，待写实现计划  
路径：标准通道 / 方案 1（完整 `GameModule`）

## 1. 背景与目标

SaveSmith 已有宿主 + `GameModule` 契约 + Chaos Front。本设计增加第二款游戏 **Wanderburg**（Randwerk）的本地结构化改档能力。

**不做**内存修改 / 训练器；只改磁盘存档。

### 1.1 用户已锁定的第一期范围

| 项 | 选择 |
|----|------|
| 编辑目标 | **A+B**：meta 资源数值 + 解锁进度 |
| 解锁 UI | **可勾选列表**（按条目开关） |
| 资源 UI | **仅暴露解密后实证存在的数值字段**（不猜字段） |
| 列表显示 | **名称表命中则显示名，否则回退 ID** |
| 交付节奏 | **并行**：先搭模块壳（定位 / 槽位 / 空编辑页），同时攻破加密 Key；Key 未通前 **不宣称**可改档 |

### 1.2 探查结论（设计输入）

- 存档根：`%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`
- 活跃结构：`Saves\Playtest\Generation_NNNN\SaveData.json`（旁路有游戏自带 `SaveData.backup.json`）
- 游戏本体：Unity IL2CPP（`Wanderburg.exe` / `GameAssembly.dll`）
- `SaveData.json`：**不是明文 JSON**。文件内容为 Base64；解码后为高熵密文，长度对齐 16 字节
- 元数据表明使用 MoreMountains Feel：`MMSaveLoadManagerMethodJsonEncrypted` / `MMSaveLoadManagerEncrypter`（典型路径：JSON → AES → Base64 写文件）
- Player.log 可见 loadout / `unlockedIDs` / generation 等 meta 线索
- **加密 Key 尚未从游戏中确认**——是本功能能否「真正改档」的关键风险

## 2. 已锁定的决策

| 项 | 选择 |
|----|------|
| 架构方案 | **完整 GameModule**（与 Chaos Front 同构），不抬 MM 加解密到宿主/sdk |
| 加盟方式 | `src/host/registry.ts` 编译期静态登记 |
| 写盘 | 继续只用宿主备份 + 临时文件 + 原子替换 |
| 游戏自带 backup | **不**作为编辑目标；不由模块管理 |
| 独立 checksum | 第一期 **不臆造**；真档往返若被游戏拒读再单开任务 |
| 非目标 | Loadout 编辑、凭空追加从未出现的 unlock ID、macOS/Linux、联机/云存档 |

## 3. 架构

```
src/games/wanderburg/
  index.ts                 # GameModule：catalog / locate / views
  locate.ts                # 路径模板 + 识别规则
  slots.ts                 # Generation_* → SlotInfo
  crypto/
    mmJsonEncrypted.ts     # Base64 + MM 风格 AES 加解密（Key/salt 可测常量）
  model/
    saveModel.ts           # 解密后 JSON：资源字段、解锁集合
  parse.ts
  serialize.ts             # 或与 parse 同文件，风格对齐 chaos-front
  validate.ts
  data/                    # 可选 ID→名称表（缺表不挡功能）
  views/                   # 资源 Tab、解锁 Tab
  i18n.ts                  # 与 chaos-front 模块文案模式对齐
  cover.*                  # catalog 封面（可先占位）

src/host/registry.ts       # import wanderburgModule
```

硬规则（继承宿主设计，不破）：

1. 模块不碰 `fs`、不直接 `invoke` Tauri；只处理字节与内存态。
2. `WanderburgState` 对宿主不透明。
3. 备份与原子写只在 Rust 宿主。

### 3.1 Key 未通时的行为

- 模块可登记、可定位、可列槽位。
- `parse` 在解密失败时抛明确 `ModuleError`（如 `DECRYPT_FAILED`）。
- UI 显示失败原因；**禁止进入可保存态 / 禁止写盘**。
- README / 发行说明在真档往返通过前不宣称 Wanderburg 可改档。

## 4. 槽位与数据流

### 4.1 定位

- 模板：`%USERPROFILE%\AppData\LocalLow\Randwerk\Wanderburg`
- 识别：存在 `Saves\Playtest\Generation_*\SaveData.json` 模式（或手选目录后能匹配）

### 4.2 槽位

- 每个 `Generation_NNNN` 一个槽位
- `id`: `generation-NNNN`
- `title`: `Generation NNNN`（解密成功后副标题可增强，如解锁数；第一期不强制）
- `sessionFiles`: 仅 `SaveData.json`（相对该 generation 目录或相对存档根，实现时与宿主 `ListedFiles` 约定对齐 chaos-front）

### 4.3 数据流

```
读字节 → crypto.decrypt → UTF-8 JSON → saveModel → WanderburgState → views
保存：validate → serialize JSON → crypto.encrypt → 字节 → 宿主 backup/原子写
```

### 4.4 资源字段

- 解密成功后，只把**已确认存在**的数值字段暴露到资源 Tab。
- 字段名/标签：有已知中英名用已知名，否则用键名/路径。
- 第一期不做「拉满」，除非语义与安全上限已实证。

### 4.5 解锁集合

- 以存档中的 unlock 集合为源；勾选 = 加入/移出。
- 显示：`名称表[id] ?? String(id)`。
- 「全选 / 全不选」仅作用于**当前列表已展示条目**。
- 第一期不从图鉴表凭空追加存档中从未出现的 ID。

## 5. 编辑页与错误处理

### 5.1 Views

| Tab | 行为 |
|-----|------|
| 资源 | 实证数值字段的数字输入；无字段时提示未识别到可编辑资源 |
| 解锁 | 可勾选列表 + 当前列表范围的全选/全不选 |

### 5.2 错误表

| 情况 | 表现 |
|------|------|
| 未找到目录 | 宿主「选择存档目录」 |
| 槽位文件读失败 | `readable: false`，不可载入 |
| 解密失败 | 明确错误，不可保存 |
| JSON/结构校验失败 | `validate` 失败，禁用保存 |
| 加密失败 | 报错，宿主不写盘 |

### 5.3 Catalog / 免责

- `id`: `wanderburg`
- `rightsHolder`: Randwerk
- 摘要：非官方；先退出游戏再改；Early Access 格式可能变更
- 封面可占位；有 `steamAppId` 则填（实现前再核商店页）

## 6. 测试与验收

### 6.1 测试

1. Crypto 单测：往返；错误 Key 失败（可用自造明文）。
2. 真档夹具（本地；敏感真档不强制入库）：解密 → 改资源/解锁 → 加密 → 再解密比对。
3. 模块契约：假目录树 `listSlots`；`parse`/`serialize`/`validate`；registry 含 wanderburg。
4. `docs/HANDTEST.md` 增 Wanderburg 节。

### 6.2 第一期 DoD

- [ ] 游戏库出现 Wanderburg；自动或手选定位成功
- [ ] 列出 `Generation_*` 并载入 `SaveData.json`
- [ ] Key 适配且真档往返通过（未通过前壳可合，但不宣称可改档）
- [ ] 资源 Tab：实证数值可改并保存
- [ ] 解锁 Tab：可勾选；`名 ?? ID`
- [ ] 保存走宿主备份 + 原子写；失败不写盘
- [ ] `npm test` / typecheck 绿；HANDTEST 有条目

### 6.3 非目标（本设计不承诺）

- 独立 checksum 算法补丁（待拒读实证）
- Loadout 深编辑
- 凭空全图鉴解锁（追加未知 ID）
- macOS/Linux 发版承诺

## 7. 实现顺序（供后续 plan 拆任务）

1. 模块骨架 + locate + slots + registry + 占位 views（解密失败态）
2. 攻破 / 确认 MM Key+salt；crypto 单测 + 真档解密
3. saveModel：资源字段实证映射 + 解锁集合
4. 资源 / 解锁 UI 接通
5. 可选名称表
6. HANDTEST + README 声明条件更新

## 8. 开放风险

1. **Key/salt 未知**：阻塞真正改档；并行搭壳不解除该风险。
2. **EA 变更**：字段名、加密或目录结构可能随版本变。
3. **拒读**：若加密往返后游戏仍拒载，可能存在额外完整性字段——届时再开设计补充，不在本文预写算法。
```

thinking
Self-review the spec:
1. Placeholder scan - no TBD/TODO left unfinished meaningfully; steamAppId says "实现前再核" which is fine
2. Consistency - architecture matches features
3. Scope - focused on A+B with parallel shell
4. Ambiguity - sessionFiles relative path "实现时与宿主对齐" is a slight ambiguity but OK for design; unlock source "存档中的 unlock 集合" doesn't name exact JSON keys yet because we don't have decrypt - that's intentional per approach C for resources

I'll fix steamAppId if I can quickly find it - optional. Leave as is.

Commit the file.