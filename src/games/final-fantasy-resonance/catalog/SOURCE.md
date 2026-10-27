# Catalog SOURCE

Name tables under this folder are **derived** for SaveSmith display (ID → zh/en).

## How to regenerate

```powershell
# Optional: point at a local MIT-licensed name dump transformed into our schema
$env:FFR_NAMES_JSON = "path\to\names_transformed.json"
npx vite-node scripts/ffr-derive-catalog.mts
```

`scripts/ffr-derive-catalog.mts` writes `names.json` with keys like `item:1`, `enemy:1001`, `map:10`.

Do **not** commit game pak files or raw community `data/` trees. Prefer a transformed slim JSON + this SOURCE note.

Game content names belong to Square Enix / LANCARSE.
