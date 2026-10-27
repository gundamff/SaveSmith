/**
 * Build src/games/final-fantasy-resonance/catalog/names.json
 *
 * Preferred inputs in %TEMP%:
 *   ffr-names_en.json, ffr-maps.json (from ffr-save-editor MIT data, transformed here)
 * Or FFR_NAMES_JSON = path/URL to flat { "item:1": "Potion" } or { en, zh } map.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'src/games/final-fantasy-resonance/catalog/names.json')
const tmp = process.env.TEMP || process.env.TMP || '.'

type Entry = { en: string; zh: string }
const out: Record<string, Entry> = {}

function put(kind: string, id: string | number, en: string) {
  const text = String(en).trim()
  if (!text) return
  out[`${kind}:${id}`] = { en: text, zh: text }
}

async function loadFlat(): Promise<Record<string, string | { en?: string; zh?: string }> | null> {
  const path = process.env.FFR_NAMES_JSON
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const r = await fetch(path)
    if (!r.ok) throw new Error(`fetch ${path} → ${r.status}`)
    return (await r.json()) as Record<string, string | { en?: string; zh?: string }>
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, string | { en?: string; zh?: string }>
}

function ingestNamesEn(names: Record<string, string>) {
  for (const [k, v] of Object.entries(names)) {
    const [pref, id] = k.split(':')
    if (!pref || id === undefined) continue
    if (pref === 'item') put('item', id, v)
    else if (pref === 'unit') {
      put('enemy', id, v)
      put('unit', id, v)
    } else if (pref === 'vis') put('vision', id, v)
    else if (pref === 'map') put('map', id, v)
  }
}

function ingestMaps(mapsRaw: unknown) {
  if (Array.isArray(mapsRaw)) {
    for (const row of mapsRaw as Array<Record<string, unknown>>) {
      const id = row.id ?? row.mapId ?? row.ID
      const name = row.name ?? row.en ?? row.title
      if (id != null && typeof name === 'string') put('map', String(id), name)
    }
    return
  }
  if (mapsRaw && typeof mapsRaw === 'object') {
    for (const [k, v] of Object.entries(mapsRaw as Record<string, unknown>)) {
      if (typeof v === 'string') put('map', k.replace(/^map:/, ''), v)
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>
        const name = o.name ?? o.en
        if (typeof name === 'string') put('map', k.replace(/^map:/, ''), name)
      }
    }
  }
}

const flat = await loadFlat()
if (flat) {
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v === 'string') {
      const [pref, id] = k.split(':')
      if (pref && id !== undefined) put(pref, id, v)
    } else {
      const en = v.en || v.zh || ''
      const [pref, id] = k.split(':')
      if (pref && id !== undefined && en) {
        out[`${pref}:${id}`] = { en, zh: v.zh || en }
      }
    }
  }
} else {
  const namesPath = join(tmp, 'ffr-names_en.json')
  const mapsPath = join(tmp, 'ffr-maps.json')
  if (!existsSync(namesPath)) {
    console.error('Missing %TEMP%\\ffr-names_en.json and FFR_NAMES_JSON; writing empty catalog.')
  } else {
    ingestNamesEn(JSON.parse(readFileSync(namesPath, 'utf8')) as Record<string, string>)
  }
  if (existsSync(mapsPath)) ingestMaps(JSON.parse(readFileSync(mapsPath, 'utf8')))
}

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('wrote', outPath, 'entries', Object.keys(out).length)
