/**
 * Match catalog `en` to classic FF Simplified Chinese (wiki-aligned EN names).
 * Then re-apply names-zh-overlay (retail/3DM wins). Clear leftover en-as-zh.
 * Run: npx vite-node scripts/ffr-apply-classic-zh.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'

const namesPath = 'src/games/final-fantasy-resonance/catalog/names.json'
const classicPath = 'src/games/final-fantasy-resonance/catalog/classic-en-zh.json'
const overlayPath = 'src/games/final-fantasy-resonance/catalog/names-zh-overlay.json'

const table = JSON.parse(readFileSync(namesPath, 'utf8')) as Record<string, { en: string; zh: string }>
const classicRaw = JSON.parse(readFileSync(classicPath, 'utf8')) as Record<string, string>
const overlay = JSON.parse(readFileSync(overlayPath, 'utf8')) as Record<string, string>

function looksJapanese(s: string): boolean {
  return /[\u3040-\u30ff]/.test(s)
}

function hasCjk(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s)
}

/** Normalize EN for glossary lookup (curly quotes, plus variants). */
function normEn(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const classic = new Map<string, string>()
for (const [k, v] of Object.entries(classicRaw)) {
  if (k.startsWith('_')) continue
  classic.set(normEn(k), v)
  classic.set(normEn(k).toLowerCase(), v)
}

const twFixes: Record<string, string> = {
  紫電: '紫电',
  天叢雲剑: '天丛云剑',
  審問官之小槌: '审问官之槌',
  怪鳥之大翼槌: '怪鸟大翼槌',
  楯無之铠: '无盾之铠',
  '楯無之铠·改': '无盾之铠·改',
  雲走: '云走',
  電撃鞭: '电击鞭'
}

let fromClassic = 0
let twFixed = 0
let clearedEnZh = 0
let clearedJp = 0

for (const row of Object.values(table)) {
  if (looksJapanese(row.zh)) {
    row.zh = ''
    clearedJp++
  }
  if (twFixes[row.zh]) {
    row.zh = twFixes[row.zh]
    twFixed++
  }
  const hit = classic.get(normEn(row.en)) ?? classic.get(normEn(row.en).toLowerCase())
  if (hit) {
    row.zh = hit
    fromClassic++
  }
}

let overlayN = 0
for (const [key, zh] of Object.entries(overlay)) {
  if (key.startsWith('_')) continue
  if (!table[key]) table[key] = { en: zh, zh }
  else table[key].zh = zh
  overlayN++
}

for (const row of Object.values(table)) {
  if (row.zh && (row.zh === row.en || (!hasCjk(row.zh) && !looksJapanese(row.zh)))) {
    // English (or latin) sitting in zh → clear so UI falls back to en
    if (row.zh === row.en || /^[\x20-\x7e]+$/.test(row.zh)) {
      row.zh = ''
      clearedEnZh++
    }
  }
  if (looksJapanese(row.zh)) {
    row.zh = ''
    clearedJp++
  }
}

writeFileSync(namesPath, `${JSON.stringify(table)}\n`)

const items = Object.entries(table).filter(([k]) => k.startsWith('item:'))
const withCjk = items.filter(([, r]) => hasCjk(r.zh)).length
const stillEnZh = items.filter(([, r]) => r.zh === r.en || (r.zh && !hasCjk(r.zh))).length
const emptyZh = items.filter(([, r]) => !r.zh).length

console.log({
  fromClassic,
  overlayN,
  twFixed,
  clearedEnZh,
  clearedJp,
  items: items.length,
  withCjkZh: withCjk,
  emptyZhFallbackEn: emptyZh,
  stillBadZh: stillEnZh
})
console.log('samples', {
  potion: table['item:1'],
  tent: table['item:500'],
  shiden: table['item:10200'],
  ice: table['item:10106'],
  clog: table['item:12015'],
  rag: table['item:10199']
})
