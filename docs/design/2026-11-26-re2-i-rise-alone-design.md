# 重生2我独自逆袭（Re2 I Rise Alone）：一期资源白名单

日期：2026-11-26  
范围：新模块 `re2-i-rise-alone`；一期可写：槽内已有的 7 项角色属性（金钱/体力/魅力/智慧/行动力/道德/压力）  
状态：**已实现**  
计划：`docs/design/2026-11-26-re2-i-rise-alone-plan.md`  
下一版（明确非本期）：所有人好感度、图鉴/解锁等

## 背景

《重生2我独自逆袭》（英文 *Re2 I Rise Alone*；开发 / 发行 Proudmate Entertainment 等；Steam AppID `3816120`）。Unity IL2CPP（`GameAssembly.dll`）+ LitJson。

Windows 存档目录（本机已核实）：

`%USERPROFILE%\AppData\LocalLow\ProudmateEntertainment\重生2我独自逆袭`

| 文件 | 作用 |
|------|------|
| `SaveData.dat` | 唯一玩家进度袋（Steam Cloud 同步 `*.dat`） |
| `Player.log` / Analytics | 非存档，忽略 |

格式（探路实证）：

1. 整文件 = **Rijndael/AES · ECB · PKCS7** 密文  
2. 密钥：游戏常量 `FrameWork.Tool.GameDataKey`（字符串经 `Convert.FromBase64String` 得到 24 字节密钥，即 AES-192）  
3. 明文 = UTF-8 JSON，语义为 `Dictionary<string, string>`（值本身常是嵌套 JSON 字符串）  
4. 槽位：`_saveKeyStr` / `_autoSaveStr` 为 UUID 数组 JSON；每个槽正文在 `{uuid}_Data`  
5. 槽正文反序列化为 `Script.Mrg.SavedData`：`Time`、`Key`、`Round`、`SavedName`、`isNew` / `isStart` / `is360`、`event360Key`、`Data`（再一层 `Dictionary<string, string>`）  
6. 角色属性键形如 `property_Property_Money`；**值为十进制整数字符串**（如 `"152"`）  
7. **无**侧车 HMAC / checksum（解密后直接 LitJson）

本机探路见约 30 手动槽 + 6 自动槽；有进度的槽通常具备部分或全部白名单键，大量空槽 0 键。

## 目标

1. 存档酱能发现上述目录，打开 `SaveData.dat`。  
2. 列出**手动 + 自动**槽；标题用 `SavedName`（空则短 UUID），副标题含回合与时间。  
3. **资源 Tab**：对当前槽 `Data` 中**已存在**的白名单属性提供数值编辑。  
4. 写回：零编辑时整文件字节一致；编辑后仅脏槽的 `{uuid}_Data` 字符串变化，其余外层键原样，再加密。  
5. 游戏能载入改后档。  
6. 遵守模块铁律：不碰 `fs` / 不直接 `invoke`；未知键透传。

## 非目标

- `property_Property_MMFavorability` 及**所有**好感度字段（下一版与图鉴解锁一起做）  
- 物品 `property_Item_*` 增删/数量、剧情旗、地图点、聊天进度、教程标记  
- 改设置项、语言、`CurKey`、外层 mgr 袋  
- 内存 CE 修改器；捆绑第三方运行时  
- 提交玩家真档进 git  
- 保证 Steam Cloud 不回滚（文档免责：先退游戏；建议关云或接受回滚）

## 架构

### 模块边界

`id: 're2-i-rise-alone'` → `src/games/re2-i-rise-alone/`，`registry.ts` 静态登记。  
文案键前缀：`r2ira.`

| 文件 | 职责 |
|------|------|
| `locate.ts` | 路径模板 + 识别 `SaveData.dat` |
| `slots.ts` | 解密袋后列手动/自动槽；`sessionFiles` 仅 `SaveData.dat` |
| `crypto/aesEcb.ts` | AES-192-ECB-PKCS7 加解密（Web Crypto 无 ECB，模块内纯实现或等价） |
| `model/bag.ts` | 外层 string→string 袋；未改键保留原字符串 |
| `model/savedData.ts` | `{uuid}_Data` ↔ SavedData 投影 |
| `model/resources.ts` | 7 项白名单读/写；缺键不创建、不补建 |
| `parse.ts` | `SlotBytes` → state；`serialize` / `validate` |
| `actions.ts` | 一期空实现（不挂全局一键拉满，除非实现期另确认） |
| `views/` | `ResourcesTab.vue` + `useSessionBindings` |
| `index.ts` | `GameModule` + catalog |

封面：`cover.jpg`（商店头图可，文档声明版权归属权利人）。

### 定位

```ts
windowsPathTemplates: [
  '%USERPROFILE%\\AppData\\LocalLow\\ProudmateEntertainment\\重生2我独自逆袭'
]
identifyAnyOf: ['SaveData.dat']
```

勿用未注入的 `%APPDATA%` / `%LOCALAPPDATA%`。目录识别只看文件名。

### 槽位

- 手动：解析 `_saveKeyStr` JSON 数组，顺序与游戏一致  
- 自动：解析 `_autoSaveStr` JSON 数组  
- 每槽读取 `{uuid}_Data` → `SavedName` / `Round` / `Time`  
- `Time`：游戏写入的毫秒时间戳，UI 格式化为本地可读时间  
- 徽标：手动 / 自动；若 `uuid === CurKey` 可标「当前」（只读展示，不写 `CurKey`）  
- 空名槽：标题回退为 UUID 前 8 位  

打开任一槽时，会话文件仍是同一份 `SaveData.dat`（单文件多槽）。

## 可编辑面

### 白名单（一期）

| UI（中文） | `Data` 键 |
|------------|-----------|
| 金钱 | `property_Property_Money` |
| 体力 | `property_Property_Stamina` |
| 魅力 | `property_Property_Charm` |
| 智慧 | `property_Property_Wisdom` |
| 行动力 | `property_Property_Execution` |
| 道德 | `property_Property_Morality` |
| 压力 | `property_Property_Pressure` |

规则：

- **只改已有键**：槽内没有的项不显示、不写入、不补建  
- 存储形态：十进制整数字符串；写回保持该形态  
- 校验：可解析为整数且 `>= 0`；**不设硬上限**（游戏可能自钳；文档提示乱填风险）  
- `MMFavorability` 明确排除  

### 写回硬门槛

在做深编辑 UI 之前必须实证：

1. `parse → serialize`（未编辑）字节一致，游戏仍能载入  
2. 改一个无害字段（如 Money）→ 重加密 → 游戏接受  
3. 缺键槽保存后仍不出现新键  

### 写回策略

1. decrypt → 解析外层 JSON 为袋（保留每个 value 的原始字符串）  
2. 编辑时只标记脏槽；重序列化该槽 `SavedData`（`Data` 内仅改动的白名单键更新，其余键原样）  
3. 外层：仅替换脏槽的 `{uuid}_Data`；其它键（含未脏槽）字符串不变  
4. `JSON.stringify` 外层时须保证与「全量重写」相比：优先采用「对原明文做键级替换」或等价策略，使零编辑路径可直接返回原始密文字节  
5. encrypt → 交宿主原子写；宿主已有备份  

推荐零编辑短路：`dirty === false` 时 `serialize` 返回打开时的原 `Uint8Array` 引用/拷贝，宿主跳过写盘。

### 界面

- 单一 **资源** Tab：对存在的白名单项用 `el-input-number`（`@update:model-value` + `useSessionBindings`）  
- 无资源可改时：短提示「当前槽尚无已解锁的可编辑属性」  
- 风险条：非官方；先退游戏；Steam Cloud 可能回滚；建议副本  

### Catalog summary

中英均强调：非官方；请先退出游戏；Steam Cloud 可能回滚；权利人 Proudmate Entertainment 等。

## 加密细节（实现备忘）

- 算法：`RijndaelManaged` / AES，`CipherMode.ECB`，`PaddingMode.PKCS7`  
- 密钥材料：与游戏 `Tool.GameDataKey` 一致（客户端内嵌混淆用常量，非用户口令）  
- 明文编码：UTF-8  
- 实现注意：浏览器 Web Crypto **不提供 ECB**；在模块内用纯 TS AES-ECB 或已有仓内等价实现，**禁止**为 ECB 引入庞大依赖  

密钥字面量落在模块 `crypto/` 内并注释来源（il2cpp `FrameWork.Tool.get_GameDataKey`）；不进 `.env`。

## 测试与验收

### 自动化

- AES 往返（已知明文向量）  
- bag：未改键字符串不变；改一槽不影响其它 `{uuid}_Data` 原文  
- resources：已有键可写；缺键 round-trip 不出现该键  
- 合成 fixture（人造加密 JSON，**不提交玩家真档**）：1 手动 + 1 自动，部分缺键  
- `parse → serialize` 零编辑字节一致  
- locate / slots / registry / validate  
- 真档 E2E：`RE2IRA_SAVE` 指向 `SaveData.dat` **副本**；无环境变量则 `skip`，无向量不假绿  

### 手测（用户，副本）

1. 退出游戏；复制整目录；建议暂时关闭该游戏 Steam Cloud  
2. 改有键槽的金钱等为易辨数值 → 进游戏载入核对  
3. 缺键槽：UI 不显示对应项；保存后文件中仍无新键  
4. 自动档与手动档各测一槽  

## 风险

| 风险 | 缓解 |
|------|------|
| 小更新改密钥/模式 | 解密失败明确报错，不开写 |
| LitJson vs `JSON.stringify` 差异 | 未改槽保留原字符串；零编辑短路原字节 |
| 属性乱填导致异常/锁剧情 | `>= 0`；文档提示；不设硬上限 |
| Steam Cloud 回滚 | catalog / `docs/games` 免责 |
| 空槽误操作 | 缺键不显示；无可改项提示 |
| ECB 实现错误 | 固定测试向量 + 真档门控往返 |

## 实现路径选择（已确认）

纯 TypeScript 模块内编解码 + 键值袋透传（方案 1，对齐存档酱惯例）。不整袋无差别 `JSON.stringify` 重写所有槽；不捆绑社区 CE / 网盘修改器。

## 澄清记录

- 一期深度：可写白名单资源（非只读、非全属性）  
- 槽位：手动 + 自动均可编辑  
- 白名单：Money / Stamina / Charm / Wisdom / Execution / Morality / Pressure；**排除** MMFavorability（好感下一版）  
- 缺键：只改已有，不补建  
- 下一版：好感度 + 图鉴解锁等  
- 实现：纯 TS 袋透传（方案 1）  
