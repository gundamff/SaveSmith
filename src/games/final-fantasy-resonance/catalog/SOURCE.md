# Catalog SOURCE

`names.json`：存档酱展示用 ID→名称表。`en` 来自社区公开表（缺省时回退英文）。`zh` **只用已核对的简中**——禁止用日文假名顶中文。

简中来源（优先级高→低）：

1. `names-zh-overlay.json` — 正式版 UI / 3DM ID 截图已核对译名（如「恢复药」「铁木履」）
2. `classic-en-zh.json` — 以 [ffresonance.wiki](https://ffresonance.wiki/database/items/) 英文名为键，映射 FF 系列经典简中（FFBE 等通用词汇）
3. 其余 `zh` 留空，UI 回退 `en`（禁止假名顶中文）

重新套用：

```powershell
npx vite-node scripts/ffr-apply-classic-zh.mts
```

## 待办：wiki 中文上线后回补

记录日期：**2026-10-27**。

[ffresonance.wiki](https://ffresonance.wiki/) 语言菜单里 **「中文（简体）」「中文（繁體）」目前标为 Soon**（`aria-disabled`，尚无 `/zh` 路由；已上线的是 en / fr / es / de / ja）。站点自述中文即将支持。

**过一阵回来检查：**

1. 打开语言菜单，看「中文（简体）」是否不再是 Soon，能否进例如 `https://ffresonance.wiki/zh/...` 或同类路径。
2. 对照 [Items](https://ffresonance.wiki/database/items/) / [Equipment](https://ffresonance.wiki/database/equipment/) 的中文页，把官方/社群译名合并进 `names-zh-overlay.json`（优先覆盖 `classic-en-zh.json` 里猜的词）。
3. 再跑 `npx vite-node scripts/ffr-apply-classic-zh.mts`，跑 `npx vitest run tests/final-fantasy-resonance`。

外网可走本机代理：`HTTP(S)_PROXY=http://127.0.0.1:7890`。

`equipment.json`：武器/防具/饰品元数据（id、kind、subtype、en），用于角色页按职业过滤下拉选项。

`unlock-inventory.json` / `unlock-visions.json` / `materials.json`：对照「完美存档」派生的一键补全清单（只提交派生 JSON，不提交他人存档文件）。

## 本版数据来源

对照 MIT 开源项目 [ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor) 公开 `data/names_en.json` + `data/maps.json` + `data/equipment.json`，**转换**为存档酱 schema：

| 上游键 | 本仓键 |
|--------|--------|
| `item:N` | `item:N` |
| `unit:N` | `enemy:N` 与 `unit:N` |
| `vis:N` | `vision:N` |
| maps[].id/name | `map:id` |
| equipment[] | `equipment.json`（slim） |

装备过滤规则（Clean-room 复述公开格式笔记）：`uid 1001–1008` → 武器 id 前缀 `101+(uid-1001)`；防具 subtype 白名单 `ARMOR_OK`；幻象仅存档 `visionList`。

未原样提交上游仓库目录；游戏内容名称版权属 Square Enix / LANCARSE。

## 重新生成

```powershell
curl.exe -fsSL -o $env:TEMP\ffr-names_en.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/names_en.json
curl.exe -fsSL -o $env:TEMP\ffr-maps.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/maps.json
curl.exe -fsSL -o $env:TEMP\ffr-items.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/items.json
curl.exe -fsSL -o $env:TEMP\ffr-equipment.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/equipment.json
npx vite-node scripts/ffr-derive-catalog.mts
npx vite-node scripts/ffr-patch-zh-names.mts
```

或设 `FFR_NAMES_JSON` 指向已转换的 JSON 后运行同一脚本。
