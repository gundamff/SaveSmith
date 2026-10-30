# 《影之刃零 / Phantom Blade Zero》存档模块设计

日期：2026-10-30  
模块 id：`phantom-blade-zero`  
状态：已设计（待实现计划）  
路径：标准通道 · savesmith-add-game + superpowers brainstorming

## 背景

更新后续航（解密 / 解包复盘）：[2026-10-30-phantom-blade-zero-re-playbook.md](./2026-10-30-phantom-blade-zero-re-playbook.md)


- 游戏：《影之刃零 / Phantom Blade Zero》
- Steam AppID：`4115450`
- 开发 / 权利人：S-GAME Studio
- 发行：S-GAME Publishing
- 当前验证构建：Steam build `26266538`
- 引擎：Unreal Engine 5；游戏进度不是普通 GVAS，而是游戏自有 `PBZS` 容器
- 本机安装目录示例：`F:\SteamLibrary\steamapps\common\PBZ`
- 存档目录：
  `...\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\`
- 主档：`PBZSaveGame.sav`
- 游戏自带分层备份：`1RealTime\`、`2Hourly\`、`3Daily\`
- Steam Cloud 会递归同步该目录下的 `*.sav`

必须在文档和模块摘要中说明：完全退出游戏、建议关闭 Steam Cloud 或接受回滚风险、第一次使用副本验证、非官方且仅限单机。

## 探路与实证

### 容器格式

外层 v3 头共 12 字节：

```text
"PBZS"
u16 version = 0x0103
u16 extraBlockCount       // 实际内块数减一
u32 firstBlockLength      // 加密目录块总长度
```

随后是一个加密目录块和若干命名槽位块。每个密封块格式为：

```text
"PBZS"
u8  version = 1
u8  sealed = 1            // 0 表示明文
u16 reserved = 0
u8  nonce[12]
u8  authTag[16]
u8  ciphertext[]
```

密封算法为 AES-256-GCM，无额外 AAD。当前 build 的 32 字节 key 由程序内四组 16 字节常量两两 XOR 得到。客户端内的 key 不具备真正保密性；实现直接登记“已验证 build + key”，不做无意义的二次混淆。未来可扩展为 key ring，但每个候选 key 都必须以目录块 GCM 认证成功为准。

目录解密后以外层头副本开头；每项包含：

```text
u16 nameLength
u8  name[nameLength]      // UTF-8
u8  compressionAlgo       // 0=原样，1=zlib，2=Oodle
u8  sealed
u32 uncompressedSize
u32 relativeOffset        // 相对块区起点
u32 sealedBlockLength
```

当前主档命名槽位：

- `__Advanced__`
- `AutoSave0`
- `__Achievements__`
- `AutoSave1`
- `AutoSave2`
- `ManualSave1`
- `ManualSave2`

### 压缩与 JSON

- `algo=2` 已实证为 Oodle Mermaid 族流。
- 使用 MIT `oozextract 0.5.7`，7/7 当前槽位均精确解压到目录声明长度。
- 解压结果为 UTF-8 JSON。
- 游戏读取代码明确支持 `algo=1` zlib。
- 已将未修改 JSON 从 Oodle 改用 zlib、重建目录、重算偏移并重新 GCM 密封；离线逐槽比对与原 JSON 字节一致。
- 用户已将 zlib 重建档放入游戏，完成“载入 → 游戏保存 → 二次载入”，结果正常。

因此容器“读、写、认证、替代压缩”硬门槛已通过。开放字段编辑前仍须补一次“材料或 Dust +1 → 游戏载入 → 游戏保存 → 二次载入”的有害性最低手测。

## 决策记录

| 议题 | 决策 |
|------|------|
| 一期深度 | 白名单标量可写 |
| 实体策略 | 只改存档中已有实体；不新增、不解锁 |
| 一期可写 | Dust、已有 `Weapon_Material_*` 数量 |
| 材料范围 | `0..9999` |
| `MaxAmount` | 增加时抬高到 `max(oldMax, newCurrent)`；减少时不降低 |
| 装备等级 | 一期不编辑；玩家可用材料在游戏内升级 |
| 特殊槽 | `__Advanced__`、`__Achievements__` 只读透传 |
| Oodle 读取 | 自建 MIT `oozextract` WASM |
| 写回压缩 | 统一写标准 zlib（`algo=1`） |
| GPL 包 | 不使用 `ooz-wasm`（GPL-3.0-or-later），避免污染本仓 MIT 许可 |
| 物理槽位 | 宿主只打开 `PBZSaveGame.sav`；内部槽位由模块 UI 选择 |

## 目标

1. 在常见 Windows Steam 库中定位 `PBZSaveGame.sav`，并保留手动选择目录能力。
2. 严格验证和解析 PBZS v3 容器、AES-GCM 密封块、Oodle/zlib 数据及 JSON。
3. 在模块内选择 `AutoSave*` / `ManualSave*`，编辑 Dust 与已有材料数量。
4. 未修改的非目录块必须字节透传；目录因偏移 / 长度变化统一重建并重新密封；修改槽位保留未知 JSON 字段。
5. 使用 zlib 重建修改槽位，重建目录偏移并以 AES-GCM 密封。
6. GCM、边界、解压、JSON 或白名单验证失败时拒绝写盘。

## 非目标

- 新增物品、武器、饰品或药品
- 强制解锁装备、成就、DLC / 预购权益
- 编辑装备等级、任务物品、钥匙、书页或碎片
- 编辑剧情、地图、任务、周目、当前装备索引或强制配装
- 编辑 `PBZLocalSetting.sav` / `PBZSharedSetting.sav`
- CE、UE4SS、内存修改或训练器能力
- 捆绑专有 Oodle 编码器、游戏 exe、玩家真档或游戏资源
- 保证跨游戏更新兼容；认证失败时不得猜测写回

## 架构

### 模块边界

新建 `src/games/phantom-blade-zero/`，由 `src/host/registry.ts` 静态导入。

| 路径 | 职责 |
|------|------|
| `locate.ts` | 常见 Steam 库路径模板与 `PBZSaveGame.sav` 识别 |
| `slots.ts` | 暴露一个物理容器槽位及安全摘要 |
| `crypto/pbzsCrypto.ts` | AES-256-GCM 密封 / 解封与已验证 build key |
| `codec/container.ts` | 外层头、目录、块边界和压缩算法分派 |
| `codec/oodle/` | MIT `oozextract` WASM、TS 包装、版本与许可文件 |
| `model/types.ts` | 容器、内部槽位、JSON 与资源投影类型 |
| `model/saveModel.ts` | 内部槽位选择、Dust / 材料白名单读写、dirty 跟踪 |
| `parse.ts` | `parse` / `serialize` / `validate` |
| `views/ResourcesTab.vue` | 槽位选择、Dust、已有材料表、筛选和批量设为 9999 |
| `views/inject.ts` | `useSessionBindings` 接入 |
| `index.ts` | `GameModule` 导出与 catalog |

模块不访问 `fs`，不直接调用 Tauri，只接收和返回 `Uint8Array` 与内存状态。宿主不理解 PBZS、内部槽位或游戏字段。

### Oodle WASM

- 固定 `oozextract 0.5.7`，启用其 `wasm` 接口，使用无 x86 SIMD 的 portable 构建。
- 提交可复现构建脚本、生成的 WASM / JS glue、MIT license 与上游版本说明。
- 发布构建使用仓内生成物，不要求用户安装 Rust、Cargo 或 wasm-bindgen。
- 包体增量在实现计划中实测；若生成物异常膨胀，先优化构建，不退回 GPL 包，也不把 Oodle 放进宿主 Rust。

### 定位

宿主当前支持路径段 `*`，因此 SteamID64 使用通配目录。模板覆盖：

```text
C:\Program Files (x86)\Steam\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\*
C:\Program Files\Steam\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\*
D:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\*
E:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\*
F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\*
```

识别条件：

```text
identifyAnyOf: ["PBZSaveGame.sav"]
slotFilePatterns: ["PBZSaveGame.sav"]
```

其他盘符或自定义库由手动目录选择兜底，不为本游戏修改宿主定位协议。

### 槽位模型

宿主只显示一个物理槽位 `PBZSaveGame.sav`。`parse` 解出容器目录后，资源页提供内部槽位选择：

- 可编辑：`AutoSave*`、`ManualSave*`
- 隐藏 / 透传：`__Advanced__`、`__Achievements__`
- 未识别名称：默认只读透传

不把多个内部槽伪装成多个物理文件，因为 `GameModule.parse` 只接收文件字节，不接收宿主槽位 id。

### 数据流

```text
宿主读 PBZSaveGame.sav
  → 校验外层 PBZS v3 头与目录范围
  → AES-GCM 认证解密目录
  → 校验头副本、名称、偏移、长度、重叠与块数量
  → 逐块 AES-GCM 解密
  → algo 0 原样 / algo 1 zlib / algo 2 Oodle WASM
  → 校验解压长度 + UTF-8 JSON
  → 投影内部槽位、Dust 与已有材料
  → UI 修改白名单，标记对应内部槽 dirty
  → dirty 槽 JSON 序列化 + zlib；未改非目录块字节透传
  → 重建目录相对偏移与长度
  → 新 nonce + AES-GCM 密封目录 / 修改块
  → 宿主备份 + 原子写
```

对修改槽位，未知 JSON 字段按对象语义透传；不承诺保留原 JSON 空白与键顺序。对未修改槽位，保留原密封块字节；目录块始终按最终偏移 / 长度重建。

## 一期编辑面

资源页包含：

1. 内部槽位选择器
2. `Player.Dust` 数值输入（`0..99_999_999`）
3. 已有材料表：
   - ID
   - 当前数量 `CurrentAmount`
   - 历史最大数量 `MaxAmount`
   - 目标数量
4. ID / 名称筛选
5. “已有材料全部设为 9999”

材料资格必须同时满足：

- 位于 `Inventory.InventoryInfos`
- key 匹配 `^Weapon_Material_`
- 已有对象包含有限整数 `CurrentAmount` 与 `MaxAmount`

切换内部槽位时，如当前槽位有未保存修改，必须二次确认。不得修改 `InventoryInfos` 的键集合。

## 错误与安全

| 情况 | 行为 |
|------|------|
| 非 PBZS / 不支持的容器版本 | `ModuleError`，拒绝载入 |
| 当前 key 无法认证目录或块 | 提示可能为游戏更新 / 档损坏，拒绝写盘 |
| nonce / tag / 密文长度异常 | 拒绝载入 |
| 目录头副本、数量、偏移、长度或重叠异常 | 拒绝载入 |
| 未知压缩算法 | 保留块但不允许编辑对应槽；目录整体异常则拒绝 |
| Oodle WASM 初始化或解压失败 | 拒绝载入目标槽，不退化为猜测 |
| zlib / JSON / UTF-8 失败 | 拒绝载入或保存 |
| Dust / 数量非有限整数或越界 | `validate` 拒绝保存 |
| 材料 ID 不再存在或结构变化 | 拒绝该修改 |
| 游戏更新 | catalog 标明当前验证 build；认证失败即停写 |

保存使用密码学安全随机 nonce。禁止复用原 nonce 加密变化后的明文。

## 测试与验收

### 自动测试

- PBZS v3 外层头、目录项与边界测试
- 固定 key / nonce 的 AES-256-GCM 密封与篡改拒绝测试
- MIT 上游 Oodle 测试向量解压测试
- zlib 压缩 / 解压测试
- 合成多槽容器完整往返
- 未修改块字节透传测试
- 修改单槽后其他槽语义 / 字节不变测试
- 未知 JSON 字段透传测试
- Dust 与材料白名单、范围、`MaxAmount` 联动测试
- 未知压缩算法、错 key、坏 tag、越界目录、重叠块、坏 JSON 拒绝测试

真档测试仅由环境变量门控并默认 `skip`；禁止提交玩家真档、解压后的玩家 JSON 或从玩家档截取的私有 fixture。Oodle fixture 使用 MIT 上游向量或自行构造的非玩家数据。

### 真机验收

已通过：

1. 未改 JSON，仅 Oodle → zlib 重建
2. 游戏载入
3. 游戏保存
4. 退出后二次载入

实现后必须再通过：

1. 在副本上将 Dust 或一个已有材料 `+1`
2. 游戏正常载入，数值正确
3. 游戏内保存并退出
4. 二次载入正常
5. 其他内部槽位未受影响

完成前运行并贴出：

```powershell
npm test
npm run typecheck
```

## 文档与交付

实现时同步：

- `src/host/registry.ts`
- `src/host/i18n/zh.ts` / `en.ts`
- `docs/games/phantom-blade-zero.md` / `.en.md`
- `README.md` / `README.en.md`
- `CHANGELOG.md` / `CHANGELOG.en.md`
- `docs/HANDTEST.md`
- Oodle 第三方许可、上游版本和可复现构建说明

封面素材须注明权利人。模块摘要必须强调非官方、退出游戏、Steam Cloud 风险与仅限单机。

## 风险

| 风险 | 缓解 |
|------|------|
| 游戏更新更换 key / 容器 | build 标记 + GCM 硬失败；未来仅增加实证 key ring |
| Oodle WASM 兼容或包体问题 | MIT portable 构建、固定版本、真实包体测量 |
| GPL / 专有许可污染 | 不用 `ooz-wasm`，不捆绑官方 Oodle DLL / 编码器 |
| JSON 字段语义变化 | 只改两个白名单区域；未知字段透传 |
| 材料数量破坏逻辑 | 已有实体、上限 9999、同步抬高 `MaxAmount` |
| Steam Cloud 回滚 | 文档建议关闭或接受回滚；退出游戏后再写 |
| 内部槽位误写 | UI 显式选择、dirty 跟踪、切换确认 |
| 玩家真档泄露 | 不入库；环境变量门控；合成 / 上游 fixture |

## 成功标准

1. 常见 Steam 路径自动找到主档，手动选择可兜底。
2. 当前 build 的 Oodle / zlib PBZS 容器均可载入。
3. 只修改指定内部槽位的 Dust / 已有材料。
4. 写回后游戏可载入、保存并二次载入。
5. 未选槽位、特殊槽位和未知字段不被业务逻辑改写。
6. 自动测试、类型检查、文档和第三方许可齐全。
