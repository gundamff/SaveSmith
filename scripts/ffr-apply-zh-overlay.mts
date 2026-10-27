/**
 * Strip Japanese-as-zh leftovers, apply names-zh-overlay.json.
 * Also copy English vision labels onto item:13xxx when en is kana.
 * Run: npx vite-node scripts/ffr-apply-zh-overlay.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'

const namesPath = 'src/games/final-fantasy-resonance/catalog/names.json'
const overlayPath = 'src/games/final-fantasy-resonance/catalog/names-zh-overlay.json'

const table = JSON.parse(readFileSync(namesPath, 'utf8')) as Record<string, { en: string; zh: string }>
const overlay = JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<string, string>

function looksJapanese(s: string): boolean {
  return /[\u3040-\u30ff]/.test(s)
}

let cleared = 0
for (const row of Object.values(table)) {
  // Empty zh → names.ts falls back to en (never pretend kana is 简中)
  if (looksJapanese(row.zh)) {
    row.zh = ''
    cleared++
  }
}

let enFixed = 0
for (const [key, row] of Object.entries(table)) {
  const m = /^item:(\d+)$/.exec(key)
  if (!m || !looksJapanese(row.en)) continue
  const vis = table[`vision:${m[1]}`]
  if (vis?.en && !looksJapanese(vis.en)) {
    row.en = vis.en
    enFixed++
  }
}

let applied = 0
for (const [key, zh] of Object.entries(overlay)) {
  if (key.startsWith('_')) continue
  if (!table[key]) {
    table[key] = { en: zh, zh }
  } else {
    table[key].zh = zh
  }
  applied++
}

writeFileSync(namesPath, `${JSON.stringify(table)}\n`)
const withZh = Object.values(table).filter((r) => r.zh && r.zh.length > 0).length
const stillJp = Object.values(table).filter((r) => looksJapanese(r.zh)).length
console.log({ clearedJpZh: cleared, enFixedFromVision: enFixed, applied, withZh, stillJpAsZh: stillJp })
console.log('samples', {
  potion: table['item:1'],
  clog: table['item:12015'],
  tablet: table['item:25004'],
  flame: table['item:10105'],
  rain: table['unit:1001'],
  seph: table['item:13113'],
  cloud: table['vision:13110']
})
