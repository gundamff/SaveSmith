# Catalog SOURCE

`names.json`：存档酱展示用 ID→名称表（en；暂无可靠中文源时 zh 与 en 相同）。

## 本版数据来源

对照 MIT 开源项目 [ffr-save-editor](https://github.com/jesus-seijas-sp/ffr-save-editor) 公开 `data/names_en.json` + `data/maps.json`，**转换**为存档酱 schema：

| 上游键 | 本仓键 |
|--------|--------|
| `item:N` | `item:N` |
| `unit:N` | `enemy:N` 与 `unit:N` |
| `vis:N` | `vision:N` |
| maps[].id/name | `map:id` |

未原样提交上游仓库目录；游戏内容名称版权属 Square Enix / LANCARSE。

## 重新生成

```powershell
curl.exe -fsSL -o $env:TEMP\ffr-names_en.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/names_en.json
curl.exe -fsSL -o $env:TEMP\ffr-maps.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/maps.json
curl.exe -fsSL -o $env:TEMP\ffr-items.json https://raw.githubusercontent.com/jesus-seijas-sp/ffr-save-editor/main/data/items.json
npx vite-node scripts/ffr-derive-catalog.mts
```

或设 `FFR_NAMES_JSON` 指向已转换的 JSON 后运行同一脚本。
