/**
 * Build src/games/final-fantasy-resonance/catalog/names.json
 *
 * Input (optional): FFR_NAMES_JSON — flat map like { "item:1": "Potion", "enemy:1001": "Goblin" }
 * or { "item:1": { "en": "...", "zh": "..." } }
 *
 * Without input, seeds empty object (UI falls back to #id).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'src/games/final-fantasy-resonance/catalog/names.json')

type Entry = string | { zh?: string; en?: string }

async function load(): Promise<Record<string, Entry>> {
  const path = process.env.FFR_NAMES_JSON
  if (!path) return {}
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const r = await fetch(path)
    if (!r.ok) throw new Error(`fetch ${path} → ${r.status}`)
    return (await r.json()) as Record<string, Entry>
  }
  const { readFileSync } = await import('node:fs')
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, Entry>
}

function normalize(raw: Record<string, Entry>): Record<string, { zh?: string; en?: string }> {
  const out: Record<string, { zh?: string; en?: string }> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') out[k] = { en: v, zh: v }
    else out[k] = { en: v.en, zh: v.zh ?? v.en }
  }
  return out
}

const normalized = normalize(await load())
writeFileSync(outPath, JSON.stringify(normalized, null, 2) + '\n', 'utf8')
console.log('wrote', outPath, 'entries', Object.keys(normalized).length)
