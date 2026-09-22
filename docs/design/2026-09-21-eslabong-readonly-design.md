# Eslabong 只读接入

日期：2026-09-21  
范围：认出存档目录、列出槽位、展示侧车 JSON 摘要。不改数值。  
状态：已实现（只读一期；改档待 integrity 对齐）  
下一期：integrity 对齐之后才能改金币和 `CampaignSave`。

## 背景

Eslabong（开发 / 发行 shirowita，Steam AppID `4560660`）是 Godot 游戏。Windows 存档目录：

`%USERPROFILE%\AppData\Roaming\Godot\app_userdata\Eslabong`

每个槽是一对文件：

- `campaign_save_N.json` 或 `campaign_autosave.json` / `campaign_autosave_N.json`：队名、金币、赛季、周、存档时间、队徽路径，以及 `integrity`、`campaign_lineage_hmac`
- 同名 `.res`：Godot `RSCC`（Zstd 分块）压缩的二进制 `CampaignSave`

侧车 JSON 里的 `integrity` 不是 `.res` 文件的 SHA-256。脚本在加密 pck 里，校验算法未对齐。本期内不改 JSON，也不重写 `.res`。

## 目标

1. 游戏库能发现该目录并进入模块。
2. 列出手动档和自动档。槽位标题用队名，副标题含赛季、周、金币、手动或自动。
3. 打开槽位后只读展示侧车字段。没有编辑控件，`actions` 为空。
4. `serialize` 原样交回读入的字节。宿主若保存，因字节未变而不写盘。
5. 单元测试覆盖：侧车解析、槽位列举、RSCC 解压再压回后明文一致。真实存档不入库。

## 非目标

- 不改金币、队名、赛季、佣兵、伤病、市场。
- 不重算 `integrity` / `campaign_lineage_hmac`。
- 不在界面路径上解压 `.res`（约 4MB 明文）。解压只在测试里验证编解码。
- 不读不写 `settings.cfg`、成就、`global_progression.json`、`merc_pool_cache.json`、日志、崩溃记录、`campaign_save_trash`。
- 不保证 Steam Cloud。本期不写用户存档。

## 行为

### 定位

`windowsPathTemplates`：`%USERPROFILE%\AppData\Roaming\Godot\app_userdata\Eslabong`（与宿主探测注入的 `USERPROFILE` 一致；勿用未注入的 `%APPDATA%`）。

`identifyAnyOf` 含 `campaign_autosave.json`。另外用 `identifyNameRegex`：`^campaign_(save_\d+|autosave(_\d+)?)\.json$`。这样只有手动档、没有当前自动档的目录也能认出来。目录识别只看文件名，不读子目录。

`slotFilePatterns`：

- `campaign_save_*.json`（手动档，对应游戏「手动存档」）
- `campaign_autosave.json`（当前自动档）

不列出 `campaign_autosave_N.json`（滚动历史环；游戏载入界面通常不单独展示）。`.res` 不靠通配符读入列表。`listSlots` 把同名 `.res` 放进 `sessionFiles`，打开槽位时由宿主再读。

### 槽位

| 文件 | id | 种类 |
|------|----|------|
| `campaign_save_N.json` | `save-N` | 手动（副标题「存档位 N+1」，与游戏 UI 对齐） |
| `campaign_autosave.json` | `autosave` | 当前自动 |

排序：手动档按 N 升序，然后当前自动档。

JSON 能解析且含 `team_name` 时 `readable`。JSON 损坏则 `readable: false`，不抛到列表。不根据探测列表误报「缺 .res」（`.res` 不在探测读入集合里）。

标题：`team_name`。副标题：手动带存档位号；`S{season} W{week} · {gold}`；有 `saved_at_text` 时附在后面。

### 打开后的状态

只保留侧车字段和原始字节：

- `teamName`、`gold`、`season`、`week`
- 可选：`savedAtText`、`logoPath`、`gameDifficulty`、`challengeTowerTeamSubmitted`
- `files`：读入的 json 与 res 原始字节

不信任、不展示 `integrity` 计算细节。界面标明本期只读。

`validate` 恒为空。`serialize` 按原始相对路径返回原始字节，不重排 JSON，不重压 `.res`。

### RSCC

Godot `FileAccessCompressed`，magic `RSCC`：

1. `u32` 压缩模式（本游戏为 2，Zstd）
2. `u32` 块大小（4096）
3. `u32` 明文总长
4. 块数 = `floor(总长 / 块大小) + 1`，每块一个 `u32` 压缩长度
5. 随后是各块压缩数据

往返测试用合成小载荷：解压 → 再按同样块大小压回去 → 再解压，明文必须一致。压缩后的字节不要求与输入相同。实现放在模块内，不进 `@sdk`。

### 界面

一个标签「概览」。只读文本：队名、金币、赛季、周、存档时间、难度（没有则省略）、挑战之塔已提交（布尔）。底部一句：本期不能修改，退出游戏再改档的说明留到下一期。

封面用仓库内自制纯色图，不用 Steam 宣传图。

文案键前缀 `es.`，中英都加。

## 触及文件

- `src/games/eslabong/`：`index.ts`、`locate.ts`、`slots.ts`、`parse.ts`、`rscc.ts`、`views/`
- `src/host/registry.ts`
- `src/host/i18n/zh.ts`、`en.ts`
- `tests/eslabong/`：槽位、侧车、RSCC 往返
- `docs/games/eslabong.md` 与英文页各一页短说明
- `README.md` / `README.en.md` 游戏列表加一行

## 验收

- `npm test` 里新增用例通过。
- 指向本机存档目录时，能看到「爸爸很坏」这类手动档和自动档，数字与 JSON 一致。
- 打开槽位后保存，目标文件修改时间不变。
