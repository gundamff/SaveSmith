#!/usr/bin/env node
/**
 * Extract Dead Cells item display names (internal id -> { en, zh }) from the
 * local game install, so the blueprint editor can show human names.
 *
 * Sources:
 *   - <game>/lang/main-en.pot : `#. <Id> (name)` comment + the English msgid,
 *     with the French source kept as a `#. msgid "..."` comment.
 *   - <game>/res.pak          : `lang/main.zh.mo` (gettext MO, msgid = French
 *     source, msgstr = Simplified Chinese).
 *
 * Usage: node scripts/extract-dead-cells-names.mjs ["<game dir>"]
 * Output: src/games/dead-cells/data/item-names.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gameDir = process.argv[2] ?? 'D:\\SteamLibrary\\steamapps\\common\\Dead Cells'
const outPath = join(root, 'src/games/dead-cells/data/item-names.json')

// ---------------------------------------------------------------- pot: id -> {en, fr}
function parsePot(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const idToEn = new Map()
  const idToFr = new Map()
  let curId = null
  let curField = null
  let curFr = null
  let inFr = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') { curId = null; curField = null; curFr = null; inFr = false; continue }
    if (line.startsWith('#.')) {
      const idm = line.match(/^#\. (\S+) \((.*)\)$/)
      if (idm) { curId = idm[1]; curField = idm[2]; curFr = null; inFr = false; continue }
      const frm = line.match(/^#\. msgid "(.*)"$/)
      if (frm) { curFr = frm[1]; inFr = true; continue }
      const cont = line.match(/^#\. "(.*)"$/)
      if (inFr && cont) { curFr = (curFr ?? '') + cont[1]; continue }
      continue
    }
    if (line.startsWith('#')) continue
    if (line.startsWith('msgid ')) {
      let en = line.slice('msgid '.length).trimStart()
      en = en.startsWith('"') ? JSON.parse(en) : en
      let j = i + 1
      while (j < lines.length && /^"(.*)"$/.test(lines[j])) { en += JSON.parse(lines[j]); j++ }
      if (curId && curField === 'name') {
        if (!idToEn.has(curId)) idToEn.set(curId, en)
        if (curFr && !idToFr.has(curId)) idToFr.set(curId, curFr)
      }
      i = j - 1
      curId = null; curField = null; curFr = null; inFr = false
    }
  }
  return { idToEn, idToFr }
}

// ---------------------------------------------------------------- pak: extract a file
function extractFromPak(pakPath, wanted) {
  const buf = readFileSync(pakPath)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let p = 3
  const version = buf[p++]
  const headerSize = view.getInt32(p, true); p += 4
  p += 4 // dataSize
  if (version >= 1) p += 64 // stamp
  const files = new Map()
  const readEntry = (prefix) => {
    const n = buf[p++]
    const name = buf.toString('ascii', p, p + n); p += n
    const flags = buf[p++]
    const full = prefix ? prefix + '/' + name : name
    if (flags & 0x01) {
      const count = view.getInt32(p, true); p += 4
      for (let i = 0; i < count; i++) readEntry(full)
    } else {
      let pos
      if (flags & 0x02) { pos = Number(view.getBigInt64(p, true)); p += 8 } else { pos = view.getInt32(p, true); p += 4 }
      const size = view.getInt32(p, true); p += 4
      p += 4 // checksum
      files.set(full, { pos, size })
    }
  }
  readEntry('')
  const result = {}
  for (const path of wanted) {
    const e = files.get(path)
    if (!e) throw new Error(`missing ${path} in ${pakPath}`)
    result[path] = buf.subarray(headerSize + e.pos, headerSize + e.pos + e.size)
  }
  return result
}

function parseMo(b) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const n = dv.getUint32(8, true)
  const origOff = dv.getUint32(12, true)
  const transOff = dv.getUint32(16, true)
  const map = new Map()
  for (let k = 0; k < n; k++) {
    const olen = dv.getUint32(origOff + k * 8, true)
    const ooff = dv.getUint32(origOff + k * 8 + 4, true)
    const tlen = dv.getUint32(transOff + k * 8, true)
    const toff = dv.getUint32(transOff + k * 8 + 4, true)
    map.set(b.toString('utf8', ooff, ooff + olen), b.toString('utf8', toff, toff + tlen))
  }
  return map
}

// ---------------------------------------------------------------------- main
const { idToEn, idToFr } = parsePot(join(gameDir, 'lang/main-en.pot'))
const pak = extractFromPak(join(gameDir, 'res.pak'), ['lang/main.zh.mo', 'data.cdb'])
const zhMo = parseMo(pak['lang/main.zh.mo'])

const sorted = {}
let zhCount = 0
for (const [id, en] of [...idToEn].sort((a, b) => a[0].localeCompare(b[0]))) {
  const fr = idToFr.get(id)
  const zh = fr ? zhMo.get(fr) : undefined
  sorted[id] = zh ? { en, zh } : { en }
  if (zh) zhCount++
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
console.log(`wrote ${outPath}: ${Object.keys(sorted).length} ids (${zhCount} with zh)`)

// ------------------------------------------------- skins.json (outfits / heads)
const cdb = JSON.parse(pak['data.cdb'].toString('utf8'))
const sheet = (name) => cdb.sheets.find((s) => s.name === name)
const idsOf = (sheetName) => {
  const s = sheet(sheetName)
  if (!s) return []
  return s.lines.map((row) => (Array.isArray(row) ? row[s.columns.findIndex((c) => c.name === 'item')] : row.item))
}
const named = (ids) => ids.filter((id) => id && id in sorted)
const skins = { outfits: named(idsOf('skin')), heads: named(idsOf('customHead')) }
const skinsPath = join(root, 'src/games/dead-cells/data/skins.json')
writeFileSync(skinsPath, JSON.stringify(skins, null, 2) + '\n', 'utf8')
console.log(`wrote ${skinsPath}: ${skins.outfits.length} outfits, ${skins.heads.length} heads`)
