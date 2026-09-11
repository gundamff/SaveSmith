/**
 * Build src/games/terraria/data/items.json from cached Terraria Wiki markdown dumps.
 * Run: node scripts/build-terraria-items.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const agentTools = path.join(
  process.env.USERPROFILE || '',
  '.cursor/projects/d-eclipse-git-SaveSmith/agent-tools'
)

const enPath = path.join(agentTools, 'e79771d1-08da-4f97-bfba-45c702500147.txt')
const zhPath = path.join(agentTools, '02c84c71-8b8f-4fd3-ba59-9cd0f63b0a00.txt')
const outPath = path.join(root, 'src/games/terraria/data/items.json')

function parseEn(text) {
  /** @type {Map<number, { en: string, internal: string }>} */
  const byId = new Map()
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/)
    if (!m) continue
    const id = Number(m[1])
    const en = m[2].trim()
    const internal = m[3].trim()
    if (!Number.isFinite(id) || id <= 0) continue
    byId.set(id, { en, internal })
  }
  return byId
}

function parseZh(text) {
  /** @type {Map<string, string>} */
  const byInternal = new Map()
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([A-Za-z0-9_]+)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/)
    if (!m) continue
    const internal = m[1].trim()
    const en = m[2].trim()
    const zh = m[3].trim()
    if (!internal || internal === '内部名称') continue
    if (zh) byInternal.set(internal, zh)
    else if (en) byInternal.set(internal, en)
  }
  return byInternal
}

const enById = parseEn(fs.readFileSync(enPath, 'utf8'))
const zhByInternal = parseZh(fs.readFileSync(zhPath, 'utf8'))

const items = [{ id: 0, name: { zh: '（空）', en: '(empty)' } }]
for (const [id, { en, internal }] of [...enById.entries()].sort((a, b) => a[0] - b[0])) {
  const zh = zhByInternal.get(internal) || en
  items.push({ id, name: { zh, en } })
}

fs.writeFileSync(outPath, JSON.stringify(items) + '\n', 'utf8')
console.log(`wrote ${items.length} items -> ${outPath}`)
