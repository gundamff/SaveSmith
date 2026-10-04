/**
 * Compact ID→name catalog from a local ac8-save-editor assets/ folder.
 * Does not copy PNG icons (copyright + size). Names are game loc strings.
 *
 * Usage:
 *   node scripts/ac8-extract-catalog.mjs "D:/zp/Downloads/AC8SaveEditor_v1.0.0_win-x64/assets"
 */
import fs from 'fs'
import path from 'path'

const assetsRoot = process.argv[2]
if (!assetsRoot) {
  console.error('Usage: node scripts/ac8-extract-catalog.mjs <assetsDir>')
  process.exit(1)
}

const dataDir = path.join(assetsRoot, 'data')
const loc = JSON.parse(fs.readFileSync(path.join(dataDir, 'text_CP_B.json'), 'utf8'))

function loadTable(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8')).Rows
}

function t(key) {
  if (!key) return ''
  const v = loc[key]
  return typeof v === 'string' ? v : ''
}

const aircraftRows = Object.values(loadTable('aircraft.json'))
const aircraftByCode = new Map()
const aircraft = []
for (const row of aircraftRows) {
  const id = row.PlaneID >>> 0
  if (!id) continue
  const code = String(row.PlaneStringID ?? '').replace(/^PP\d+_/, '')
  const name = t(row.PlaneNameTextID) || code || String(id)
  aircraft.push({ id, code, name, sort: row.SortNumber ?? id })
  aircraftByCode.set(code, name)
  const short = String(row.PlaneStringID ?? '')
  if (short) aircraftByCode.set(short, name)
}

const skins = []
for (const row of Object.values(loadTable('skin.json'))) {
  const id = row.SkinID >>> 0
  if (!id) continue
  const plane = String(row.PlaneStringID ?? '')
  let name = t(row.SkinNameTextID) || String(id)
  const planeName = aircraftByCode.get(plane) || plane
  name = name.replaceAll('{AircraftName}', planeName)
  skins.push({
    id,
    plane,
    name,
    sort: row.SortNumber ?? id
  })
}

const emblems = []
for (const row of Object.values(loadTable('emblem.json'))) {
  const id = row.EmblemID >>> 0
  if (!id) continue
  emblems.push({
    id,
    name: t(row.EmblemNameTextID) || String(id),
    sort: row.SortNumber ?? id
  })
}

const missions = []
const seen = new Set()
for (const row of Object.values(loadTable('mission.json'))) {
  const id = row.MissionID >>> 0
  if (id < 1 || id > 31 || seen.has(id)) continue
  seen.add(id)
  missions.push({
    id,
    number: t(row.MissionNumberTextID) || `MISSION ${id}`,
    name: t(row.MissionNameID) || `Mission ${id}`
  })
}
missions.sort((a, b) => a.id - b.id)
aircraft.sort((a, b) => a.sort - b.sort || a.id - b.id)
skins.sort((a, b) => a.sort - b.sort || a.id - b.id)
emblems.sort((a, b) => a.sort - b.sort || a.id - b.id)

const out = {
  note: 'Names extracted from local ac8-save-editor assets (DT_* + text_CP_B). Not redistributing PNG icons.',
  aircraft,
  skins,
  emblems,
  missions
}

const dest = path.join('src', 'games', 'ace-combat-8', 'data', 'catalog.json')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n')
console.log('wrote', dest, {
  aircraft: aircraft.length,
  skins: skins.length,
  emblems: emblems.length,
  missions: missions.length
})
