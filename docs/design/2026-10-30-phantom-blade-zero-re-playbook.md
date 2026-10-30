# 影之刃零：存档解密 & 资源解包复盘（更新续航手册）

日期：2026-10-30  
适用模块：`phantom-blade-zero`  
已验证 Steam build：`26266538`（`CL-301524_JKS-17219`）  
配套设计：[2026-10-30-phantom-blade-zero-design.md](./2026-10-30-phantom-blade-zero-design.md)

> 目的：游戏更新后**不要从零摸索**。按本手册先判定「坏在哪一层」，再只重做必要步骤。  
> 禁止：把玩家真档、解压后的玩家 JSON、临时工具二进制、完整 USMAP 提交进仓库。

---

## 0. 两把不同的 AES 密钥（先分清）

| 用途 | 作用对象 | 登记位置 / 获取方式 | 失败时表现 |
|------|----------|---------------------|------------|
| **存档密封 key** | `PBZSaveGame.sav` / 设置档里的 PBZS 块 | `src/games/phantom-blade-zero/crypto/pbzsCrypto.ts` 的 `PBZS_BUILD_KEY` | 载入报 `PBZ_AUTH_FAILED` |
| **IoStore / Pak key** | `ProjectPBZ/Content/Paks/*.utoc` 等资源包 | FModel `Directory → AES`；可用 AESDumpster 从 Shipping EXE 拖出 | FModel 打不开加密包 |

二者**不是同一把 key**。改存档模块只关心第一把；刷新物品中文名目录才需要第二把。

已验证存档 key（build `26266538`）：

```text
15a1fe0f55e0eb298e7c9461548351696a2a0700ed2d17ba1f871457e8f93e2d
SHA-256: 65b75c306a77eb2df3ed5a7e6b3f8dbef360f6abefa74c465196cfa19af9637c
```

已用于资源解包的 IoStore key（同 build，社区公开）：

```text
0x4BC8A51E5381325073F2BC7D4E3089CD557C4E9B7D453901C2C795518867E01D
```

USMAP（同 build）：`ProjectPBZ-5.7.4-301524-full.usmap`  
SHA-256：`c7fb911bc24ec7a3c77fbf1cbe62c57bec1dcc8b621ea305ac9e50b4d9fb6651`  
（Nexus「USMAP File (Proper)」等 modder 资源；**不要入库**。）

---

## 1. 游戏更新后：30 分钟分流清单

在副本上操作；完全退出游戏；建议临时关 Steam Cloud。

1. 记下新 Steam build id（库 → 属性 → 已安装文件，或 `steamapps\appmanifest_4115450.acf` 的 `buildid`）。
2. 用当前 SaveSmith / 单测打开**副本** `PBZSaveGame.sav`：
   - **能解析**：容器与存档 key 多半未变 → 跳到 §5（只关心字段/目录是否变）。
   - **`PBZ_AUTH_FAILED`**：存档 key 或密封布局变了 → §2。
   - **`PBZ_INVALID_*` / outer version**：外层头或目录布局变了 → §3。
   - **`PBZ_DECOMPRESSION_FAILED` / unsupported compression**：压缩算法变了 → §4。
3. 若 UI 物品名错乱或新材料无正式名：资源/本地化变了 → §6。
4. 任一步成功后：更新 `PBZS_BUILD` / key / 文档里的 build 号，跑测试与一次真机副本手测再发版。

快速门控（有本机真档时）：

```powershell
$env:PBZ_SAVE="F:\SteamLibrary\steamapps\common\PBZ\ProjectPBZ\Saved\SaveGames\Steam\<SteamID64>\PBZSaveGame.sav"
npx vitest run tests/phantom-blade-zero
```

无 `PBZ_SAVE` 时相关用例会 skip，不代表新 build 可用。

---

## 2. 存档密封 key 怎么来的、更新后怎么重找

### 2.1 当前实证结论（build 26266538）

- 算法：**AES-256-GCM**，**无 AAD**。
- 块布局：

```text
"PBZS"          // 4
u8  version=1
u8  sealed      // 1=加密，0=明文（罕见）
u16 reserved=0
u8  nonce[12]
u8  tag[16]     // GCM auth tag
u8  ciphertext[]
```

- WebCrypto 解密时把 `ciphertext || tag` 拼成 subtle 期望的顺序（实现见 `pbzsCrypto.ts`）。
- Key 来源：Shipping EXE 内 **四组 16 字节常量，两两 XOR 合成 32 字节**。  
  客户端内的常量**不具备真正保密性**；SaveSmith 只登记「已验证 build + key」，不做无意义二次混淆。
- 实证范围：主档、分层备份、`PBZLocalSetting.sav`、`PBZSharedSetting.sav` 共 20/20 文件目录块认证通过（同 build）。

### 2.2 更新后重找存档 key（推荐顺序）

1. **先试旧 key**：对文件外层目录密封块做一次 `unsealPbzsBlock`；成功即可暂时沿用。
2. **对照 EXE 变更**：用新 Shipping EXE（通常在  
   `...\PBZ\ProjectPBZ\Binaries\Win64\*Shipping*.exe`）相对旧版做字符串/常量 diff。
3. **沿用 XOR 模式**：搜索仍存在的 16 字节常量簇；按「两组拼高 16、两组拼低 16」或历史脚本里的同样两两 XOR 得到 32 字节候选。
4. **验收标准唯一**：目录密封块 GCM 认证成功，且解密后前 12 字节等于外层头副本（见 §3）。猜 key 但认证失败 → **禁止写盘**。
5. 登记：更新 `PBZS_BUILD`、`PBZS_BUILD_KEY`、`PBZS_BUILD_KEY_SHA256`；补一条固定向量测试（参考 `tests/phantom-blade-zero/pbzsCrypto.spec.ts`）。

可选：维护 key ring（多 build 多 key），每个候选都必须通过目录块认证；不要盲解。

---

## 3. PBZS 容器布局（外层 + 目录）

实现：`src/games/phantom-blade-zero/codec/container.ts`。

### 3.1 外层头（12 字节，小端）

```text
"PBZS"
u16 version = 0x0103     // 「v3」口头说法来自这里
u16 slotCount            // 命名槽数量
u32 directoryBlockLength // 紧随其后的密封目录块总长
```

### 3.2 目录块

- 本身是一节 §2 密封块。
- 明文以 **外层 12 字节头的副本** 开头，随后是 `slotCount` 个目录项：

```text
u16 nameLength
u8  name[nameLength]     // UTF-8，如 AutoSave0、__Advanced__
u8  compressionAlgo      // 0=原样，1=zlib，2=Oodle
u8  sealed
u32 uncompressedSize
u32 relativeOffset       // 相对「槽位区」起点（目录块之后）
u32 sealedBlockLength
```

- 槽位区按 `relativeOffset` **紧密排列、无空洞**；解析时校验连续性与无尾随垃圾。

### 3.3 SaveSmith 写回策略（更新后尽量保持）

| 步骤 | 行为 |
|------|------|
| 读 | 密封块 AES-GCM 认证 → 按 algo 解压 |
| 写脏槽 | JSON → **标准 zlib（algo=1）** → 新 nonce + GCM 密封 |
| 未改槽 | **整块密封字节透传** |
| 目录 | **始终按最终偏移/长度重建并重新密封** |

已实证：原 Oodle 槽改为 zlib 后，游戏可载入 / 保存 / 二次载入。不要捆绑官方 Oodle 编码器；读取用仓内 MIT `oozextract` WASM。

---

## 4. 压缩：Oodle 读、zlib 写

| algo | 含义 | SaveSmith |
|------|------|-----------|
| 0 | 原样 | 可读 |
| 1 | zlib / deflate | 读 + **写** |
| 2 | Oodle Mermaid 族 | **只读**（`codec/oodle`，oozextract 0.5.7 portable WASM） |

更新后若出现未知 algo：对应该槽拒绝编辑；目录整体异常则拒绝载入。  
Oodle 许可与复现：`src/games/phantom-blade-zero/codec/oodle/UPSTREAM.md`。

---

## 5. 槽位 JSON 与可编辑面

解压后为 UTF-8 JSON。常见内部槽：

- 可编辑：`AutoSaveN`、`ManualSaveN`
- 只读透传：`__Advanced__`、`__Achievements__`

业务投影（实现以代码为准）：

- `Player.Dust`（中文 UI：意识尘埃）
- `Inventory.InventoryInfos.<ItemId>`：`CurrentAmount`、`MaxAmount`、`FirstAddTime`、`DirtyTime`、`AcquiredCycle`（时间形如 `YYYY.MM.DD-HH.MM.SS`）

物品目录白名单：`src/games/phantom-blade-zero/catalog/items.json`（武器材料 + 养成）。  
字段语义大变时：先扩测试与白名单，**不要**为过关而放宽 GCM/边界校验。

---

## 6. 游戏资源解包（刷正式物品名）

仅在需要刷新 `catalog/items.json` 时做。工具放在临时目录，**勿提交**。

### 6.1 材料清单

- 游戏：`...\PBZ\ProjectPBZ\Content\Paks\`（`ProjectPBZ-Windows.utoc` 等）
- FModel（或等价 CUE4Parse 前端）
- 与 build 匹配的 `.usmap`（见 §0）
- IoStore AES key（见 §0；更新后可用 AESDumpster 对 Shipping EXE 再拖一次）
- （可选）`retoc`：需要 legacy `.uasset` 时再用；纯导表用 FModel JSON 足够

### 6.2 FModel 要点

1. 添加游戏 Paks 目录；UE 版本对齐（本 build 为 UE 5.7 一带）。
2. `Directory → AES` 填入 `0x…` IoStore key。
3. Settings → 启用 Local Mapping File → 指向匹配 usmap。
4. 导出至少：

```text
/Game/PBZContent/DataTable/Item/DT_InventoryData
/Game/PBZContent/DataTable/Item/DT_InitItem
/Game/PBZContent/DataTable/UI/DT_UsableItem
/Game/PBZContent/DataTable/UI/DT_ShopItemTable
zh-Hans / en 本地化资源
```

5. 把导出整理成带 `normalizedInventory` 的  
   `tables.zh-Hans.json` / `tables.en.json`（字段：`id/name/itemType/detailType/materialType`），放入临时目录。

### 6.3 生成本仓目录

```powershell
$env:PBZ_EXPORT_DIR="$env:TEMP\pbz-item-export"
# 可选：对照真档记录形状（不落盘玩家数据）
$env:PBZ_SAVE="...\PBZSaveGame.sav"
npx vite-node scripts/pbz-discover-item-assets.mts
node --experimental-strip-types scripts/pbz-build-item-catalog.mts
```

生成器白名单与阈值标记说明：`scripts/pbz-build-item-catalog.mts`、  
`src/games/phantom-blade-zero/catalog/SOURCE.md`。

本 build 的 `en` 物品名键常为空：英文 UI 显示可读 ID（如 `Weapon Material 01`），**不**回退中文、不编造译名。

---

## 7. 代码地图（改哪里）

| 主题 | 路径 |
|------|------|
| 存档 key / 密封 | `src/games/phantom-blade-zero/crypto/pbzsCrypto.ts` |
| 容器 / 压缩分派 | `src/games/phantom-blade-zero/codec/container.ts` |
| Oodle WASM | `src/games/phantom-blade-zero/codec/oodle/` |
| 解析入口 | `src/games/phantom-blade-zero/parse.ts` |
| 编辑模型 | `src/games/phantom-blade-zero/model/saveModel.ts` |
| 物品目录 | `src/games/phantom-blade-zero/catalog/` |
| 目录生成 | `scripts/pbz-build-item-catalog.mts` |
| 用户说明 | `docs/games/phantom-blade-zero.md` |

---

## 8. 验收与红线

**通过：**

1. 新 build 副本档：目录 + 各可编辑槽认证解密成功。
2. `npx vitest run tests/phantom-blade-zero`（含 `PBZ_SAVE` 时真档只读回归）。
3. 副本上改 Dust 或已有材料 / 养成物品 → 游戏载入 → 游戏内保存 → 退出 → 二次载入。
4. 更新文档中的 build id、SOURCE.md、本手册 §0 密钥/usmap 指纹（若变更）。

**禁止：**

- 认证失败仍猜测写回。
- 复用旧 nonce 加密新明文。
- 提交玩家真档、完整导出表、USMAP、AESDumpster/FModel 二进制。
- 为图省事引入 GPL `ooz-wasm` 或官方 Oodle DLL。

---

## 9. 变更日志（手册本身）

| 日期 | 内容 |
|------|------|
| 2026-10-30 | 初版：汇总 PBZS 解密、容器、Oodle/zlib、FModel 解包与更新分流；锚定 build 26266538 |
