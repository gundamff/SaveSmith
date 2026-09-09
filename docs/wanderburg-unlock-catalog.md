# Wanderburg 解锁表提取手册

日期：2026-09-09  
用途：游戏更新后重新导出 `UnlockableData.allUnlockables` → 生成修改器可用的 ID/名称表。  
产物：`.tools/wb-unlock-catalog.json`

> 本流程只读游戏安装目录与本地工具，**不改存档**。解锁 Tab 是否接回产品是另一步。

---

## 0. 结论（先读这个）

| 项 | 事实 |
|----|------|
| 权威全量表 | Unity 资源里的 `Unlockable Data` → `allUnlockables`（约 63 项，随版本变） |
| 存档字段 | `unlockedIDs: number[]`，元素 = `Unlockable.unlockableID` |
| 显示名 | **不在** `Unlockable` 上，在 `infoObject` → `InfoObject.name` |
| 不要用的列表 | 同资产里的 `demoContentModules` / `demoContentInts`（demo 子集，会污染全表） |
| 当前产物 | `.tools/wb-unlock-catalog.json`（`count` / `catalog[]` / `names`） |

游戏资源里的警告（Il2Cpp 反编译可见）：**RegenerateAllIDs 会让旧存档不兼容**。若大版本后玩家存档里的 ID 对不上新表，优先怀疑官方重生成了 ID。

---

## 1. 工具与路径

### 1.1 本机工具（已放在仓库 `.tools/`，勿提交大二进制到 git 亦可本地自备）

| 工具 | 路径 | 作用 |
|------|------|------|
| Il2CppDumper | `.tools/Il2CppDumper/Il2CppDumper.exe` | 从 IL2CPP 生成 `DummyDll`，供 AssetStudio 解 MonoBehaviour |
| AssetStudioModCLI | `.tools/AssetStudioModCLI/AssetStudioModCLI_net8_portable/AssetStudioModCLI.exe` | dump ScriptableObject / MonoBehaviour 文本 |
| 编目脚本 | `.tools/build-unlock-catalog.mjs` | 解析 dump → 写 catalog |

### 1.2 游戏安装（按本机 Steam 改）

默认探查路径（可被环境变量覆盖）：

```text
F:\SteamLibrary\steamapps\common\Wanderburg Game\
  GameAssembly.dll
  Wanderburg_Data\
    il2cpp_data\Metadata\global-metadata.dat
    (各类 assets / data.unity3d 等)
```

环境变量（推荐更新时用）：

```powershell
$env:WANDERBURG_ROOT = "F:\SteamLibrary\steamapps\common\Wanderburg Game"
$env:WANDERBURG_DATA = "$env:WANDERBURG_ROOT\Wanderburg_Data"
```

### 1.3 工作目录约定

```text
.tools/
  il2cpp-out/DummyDll/     # Il2CppDumper 输出（每次大更新应重跑）
  wb-unlock-byid/          # Unlockable Data + 各 Unlockable 的 pathID.txt
  wb-info-byid/            # InfoObject 按 pathID 单独 dump（脚本自动建）
  wb-unlock-catalog.json   # 最终表
  build-unlock-catalog.mjs
```

---

## 2. 数据结构（更新后先核对）

来源：`.tools/il2cpp-out/dump.cs`（Il2CppDumper）。

```csharp
// UnlockableData : ScriptableObject
List<Unlockable> allUnlockables;      // 全量（修改器用这个）
List<Unlockable> demoContentModules;  // demo，忽略
int[] demoContentInts;

// Unlockable : MonoBehaviour
int unlockableID;
UnlockableType myType;
InfoObject infoObject;   // 显示名在这里
QuestData unlockTask;
int price;
```

AssetStudio dump 样例字段：

```text
SInt32 unlockableID = 6098801
SInt32 myType = 2
PPtr<InfoObject> infoObject
  SInt64 m_PathID = 52882
SInt32 price = 2000
```

`InfoObject`：

```text
string name = "Canoneer Crew"
string description = "..."
```

### 2.1 `myType` 命名注意

Il2CppDumper 里的 `Unlockable.UnlockableType` 枚举常量名，**可能与序列化整型语义对不上**（IL2CPP dump 常见现象）。

当前编目脚本使用的映射是按**已知物品语义**标定的（例如 `Wanderturm`→captain、`Side Flamethrower`→vehicle）：

| myType | 脚本 typeName |
|--------|----------------|
| 0 | captain |
| 1 | crew |
| 2 | module |
| 3 | vehicle |
| 4 | decoPet |
| 5+ | decoSteering / decoFront / decoFloor（预留） |

**每次更新后**：抽 3～5 个已知物品核对 `myType`，不对就改脚本里的 `typeNames`。

---

## 3. 更新后完整步骤

### Step A — 重跑 Il2CppDumper（游戏大更新必做）

```powershell
cd D:\eclipse\git\SaveSmith\.tools\Il2CppDumper

# 交互或命令行：选 GameAssembly.dll + global-metadata.dat，输出到 ..\il2cpp-out
.\Il2CppDumper.exe `
  "$env:WANDERBURG_ROOT\GameAssembly.dll" `
  "$env:WANDERBURG_DATA\il2cpp_data\Metadata\global-metadata.dat" `
  "..\il2cpp-out"
```

确认存在：`.tools/il2cpp-out/DummyDll/Assembly-CSharp.dll`（及同目录其它 DummyDll）。

核对 `dump.cs` 里仍有 `UnlockableData` / `allUnlockables` / `Unlockable.unlockableID`。若类改名，本手册与脚本解析都要跟着改。

### Step B — dump「Unlockable Data」+ 全部 Unlockable

**原则：`--filter-by-pathid` 一次只传一个 pathID。**  
多个 ID、或含 `0`，CLI 会误匹配海量资源 → 内存暴涨 / OOM。

#### B1. 先 dump 名为 Unlockable Data 的资产

```powershell
$cli = "D:\eclipse\git\SaveSmith\.tools\AssetStudioModCLI\AssetStudioModCLI_net8_portable\AssetStudioModCLI.exe"
$asm = "D:\eclipse\git\SaveSmith\.tools\il2cpp-out\DummyDll"
$out = "D:\eclipse\git\SaveSmith\.tools\wb-unlock-byid"

Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $out | Out-Null

& $cli $env:WANDERBURG_DATA `
  -m dump -t monoBehaviour `
  --filter-by-name "Unlockable Data" `
  --assembly-folder $asm `
  -o $out -g none -f pathID -r --log-level error
```

在 `$out` 里找到含 `allUnlockables` 的 txt（当前版本 pathID 曾为 `53321`，**会变**）。记下：

- `List allUnlockables` → `int size = N`
- 每个元素的 `m_PathID`

**只用 `allUnlockables` 段。** 不要把后面的 `demoContentModules` 混进列表。

#### B2. 按 pathID 逐个 dump Unlockable

对 B1 得到的每个 pathID（示例伪代码）：

```powershell
foreach ($pid in $allUnlockablePathIds) {
  & $cli $env:WANDERBURG_DATA `
    -m dump -t monoBehaviour `
    --filter-by-pathid "$pid" `
    --assembly-folder $asm `
    -o $out -g none -f pathID -r --log-level error
}
```

产物应类似：`$out\<pathID>.txt`，内含 `unlockableID` / `myType` / `infoObject` / `price`。

可选加速：若某次用 `--filter-by-text unlockableID` 能稳定只命中 Unlockable，可整批 dump；**若数量暴涨到上万，立即停，改回逐 pathID**。

### Step C — 生成 catalog（脚本会再 dump InfoObject）

```powershell
cd D:\eclipse\git\SaveSmith\.tools
$env:WANDERBURG_DATA = "F:\SteamLibrary\steamapps\common\Wanderburg Game\Wanderburg_Data"
node .\build-unlock-catalog.mjs
```

脚本做什么：

1. 在 `wb-unlock-byid/` 找含 `allUnlockables` 的文件，按 **size** 截取 pathID 列表  
2. 读每个 Unlockable dump → `unlockableID` / `myType` / `price` / `infoPathId`  
3. 对每个 `infoPathId > 0` **单独** `--filter-by-pathid` dump InfoObject → 取 `name`  
4. 写出 `wb-unlock-catalog.json`

耗时：约 1～3 分钟（每个 InfoObject 会重新加载资源）。

### Step D — 验收

```powershell
node -e "const c=require('./wb-unlock-catalog.json'); console.log(c.count); console.log(c.catalog.filter(x=>x.name.startsWith('#')).map(x=>x.id+' '+x.name))"
```

检查清单：

- [ ] `count` 等于 `allUnlockables` 的 `size`（不是 demo 列表长度）
- [ ] 几乎所有条目有真实英文名；`#数字` 仅允许个别 `infoObject` 为空的项
- [ ] 抽查存档里已有的 `unlockedIDs` 都能在 `catalog[].unlockableID` 命中  
- [ ] 若大量 ID 对不上旧存档 → 可能官方 `RegenerateAllIDs`，修改器名称表要整表替换，并提示玩家「新版本 ID 可能不兼容旧档」

### Step E — 接到修改器 / 中英名称

1. 导出 `allUnlockables` → `.tools/wb-unlock-catalog.json`（见上文 Step A–D）
2. dump 游戏本地化表：`LocaTest Shared Data` + `LocaTest_zh`（AssetStudio `--filter-by-name`）到 `.tools/wb-loca-dump/`
3. `node .tools/merge-unlock-i18n.mjs` → 写入 `src/games/wanderburg/data/unlock-catalog.json`（含 `nameEn` / `nameZh`；缺译回退英文）
4. UI 按应用 `locale` 显示；写回只改 `unlockedIDs`

---

## 4. 踩坑记录（务必保留）

1. **`--filter-by-pathid` 批量 / 含 0**：会匹配爆炸（上万资产）→ OOM。永远单 ID。  
2. **`demoContentModules`**：和 `allUnlockables` 在同一 MonoBehaviour 里；解析 list 必须按字段名 + `size` 截断。  
3. **显示名在 InfoObject**：只 dump Unlockable 只能得到 ID/价格/类型。  
4. **pathID 会变**：不要把 `53321` 之类写死进产品；每次从 `m_Name = "Unlockable Data"` 重新找。  
5. **`unlockableID` 是大整数**：与 Unity pathID 不是一回事；存档用的是前者。  
6. **DummyDll 版本**：游戏更新后必须重跑 Il2CppDumper；旧 DummyDll 可能导致字段错位或 dump 空壳。  
7. **AssetStudio 要 `--assembly-folder`**：否则 MonoBehaviour 解不出 `unlockableID` 等托管字段。

---

## 5. 产物 schema

```json
{
  "count": 63,
  "catalog": [
    {
      "id": "6098801",
      "unlockableID": 6098801,
      "myType": 2,
      "typeName": "module",
      "price": 2000,
      "infoPathId": 52882,
      "name": "Canoneer Crew",
      "description": ""
    }
  ],
  "names": {
    "6098801": "Canoneer Crew（module）"
  }
}
```

- `id`：字符串形式的 `unlockableID`，便于 JSON / UI map  
- `names`：给旧「ID→显示串」接口用的扁平表  

---

## 6. 与存档加密的关系

解锁表提取 **不依赖** 存档密钥。  
改解锁进度写盘仍走现有模块：`StringCipher`（PBKDF2-SHA1 + Rijndael-256-CBC + **PKCS7**），密钥见 `src/games/wanderburg/crypto/keys.ts`。密钥若随版本变更，是另一条更新流程，勿与本手册混为一谈。

---

## 7. 版本记录

| 日期 | 游戏侧观察 | catalog count | 备注 |
|------|------------|---------------|------|
| 2026-09-09 | `Unlockable Data` pathID≈53321；allUnlockables size=63 | 63 | 缺名 1 条：`73369405`（infoPathId=0）；`Tankenburg` 两 ID 共用名 |
