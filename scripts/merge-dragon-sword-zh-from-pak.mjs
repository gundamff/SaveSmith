/**
 * Overlay Simplified Chinese (Zh_CN) from local pak-extracted XML onto catalog JSON.
 *
 * Requires (gitignored):
 *   tmp-catalog/pak/StringData.xml
 *   tmp-catalog/pak/GameItemData.xml
 *   tmp-catalog/pak/AccountTitleData.xml   (optional, for titles)
 *
 * Extract with community pak-dump (tool only, not committed):
 *   go run ./cmd/pak-dump -game "<install>" -out tmp-catalog/pak StringData.xml GameItemData.xml AccountTitleData.xml
 *
 * Run: node scripts/merge-dragon-sword-zh-from-pak.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pakDir = path.join(root, 'tmp-catalog', 'pak')
const catDir = path.join(root, 'src', 'games', 'dragon-sword', 'catalog')

function attr(block, name) {
  const re = new RegExp(`(?:ns\\d:)?${name}="([^"]*)"`, 'i')
  const m = block.match(re)
  if (!m) return ''
  return m[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

function parseRows(xmlPath, localName) {
  const raw = fs.readFileSync(xmlPath, 'utf8')
  const re = new RegExp(`<(?:ns\\d:)?${localName}\\b([^>]*)/?>`, 'g')
  const rows = []
  let m
  while ((m = re.exec(raw))) {
    rows.push(m[1] || m[0])
  }
  return rows
}

function loadStrings() {
  const rows = parseRows(path.join(pakDir, 'StringData.xml'), 'StringData')
  const map = new Map()
  for (const block of rows) {
    const id = attr(block, 'ID')
    if (!id) continue
    map.set(id, {
      zh: attr(block, 'Zh_CN'),
      en: attr(block, 'En'),
      fr: attr(block, 'Fr')
    })
  }
  return map
}

function resolveName(strs, key) {
  if (!key) return { zh: '', en: '' }
  const row = strs.get(key)
  if (!row) return { zh: '', en: '' }
  const en = row.en || row.fr || ''
  const zh = row.zh || en
  return { zh, en }
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(catDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  console.log(`wrote ${name}`)
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(catDir, name), 'utf8'))
}

if (!fs.existsSync(path.join(pakDir, 'StringData.xml')) || !fs.existsSync(path.join(pakDir, 'GameItemData.xml'))) {
  console.error('Missing tmp-catalog/pak/StringData.xml or GameItemData.xml — run pak-dump first.')
  process.exit(1)
}

const strs = loadStrings()
console.log(`strings: ${strs.size}`)

const labels = { ...(readJson('labels.json') || {}) }
let itemNamed = 0
for (const block of parseRows(path.join(pakDir, 'GameItemData.xml'), 'GameItemData')) {
  const cid = attr(block, 'ID')
  if (!cid) continue
  const name = resolveName(strs, attr(block, 'Name'))
  if (!name.zh && !name.en) continue
  const prev = labels[cid] || { zh: '', en: '' }
  labels[cid] = {
    zh: name.zh || prev.zh || name.en,
    en: name.en || prev.en || name.zh
  }
  itemNamed++
}
console.log(`items named from GameItemData: ${itemNamed}`)

/** Playable character display names live in StringData as key = 900000000 + characterCid. */
let charNamed = 0
for (const cidStr of Object.keys(labels)) {
  const cid = Number(cidStr)
  if (!Number.isFinite(cid) || cid < 10000 || cid > 19999) continue
  const name = resolveName(strs, String(900000000 + cid))
  if (!name.zh && !name.en) continue
  const prev = labels[cidStr] || { zh: '', en: '' }
  labels[cidStr] = {
    zh: name.zh || prev.zh || name.en,
    en: name.en || prev.en || name.zh
  }
  charNamed++
}
console.log(`characters named via 900000000+cid: ${charNamed}`)

const titlesPath = path.join(pakDir, 'AccountTitleData.xml')
if (fs.existsSync(titlesPath)) {
  for (const block of parseRows(titlesPath, 'AccountTitleData')) {
    const id = attr(block, 'ID')
    if (!id) continue
    const name = resolveName(strs, attr(block, 'Name'))
    if (!name.zh && !name.en) continue
    const prev = labels[id] || { zh: '', en: '' }
    labels[id] = {
      zh: name.zh || prev.zh || name.en,
      en: name.en || prev.en || name.zh
    }
  }
}

function patchLocalizedArray(file, idKey) {
  const rows = readJson(file)
  let hit = 0
  for (const row of rows) {
    const id = String(row[idKey])
    const lab = labels[id]
    if (!lab) continue
    row.name = {
      zh: lab.zh || row.name?.zh || lab.en,
      en: lab.en || row.name?.en || lab.zh
    }
    hit++
  }
  writeJson(file, rows)
  console.log(`patched ${file}: ${hit}/${rows.length}`)
}

writeJson('labels.json', labels)
patchLocalizedArray('characters.json', 'characterCid')
patchLocalizedArray('currencies.json', 'itemCid')
patchLocalizedArray('titles.json', 'titleId')

const recipes = readJson('recipes.json')
let recipeHit = 0
for (const row of recipes) {
  if (row.dishCid == null) continue
  const lab = labels[String(row.dishCid)]
  if (!lab) continue
  row.name = {
    zh: lab.zh || row.name?.zh || lab.en,
    en: lab.en || row.name?.en || lab.zh
  }
  recipeHit++
}
writeJson('recipes.json', recipes)
console.log(`patched recipes.json dish names: ${recipeHit}/${recipes.length}`)

// sanity samples
for (const cid of ['10001', '1000001', '2100000', '1420102']) {
  console.log(`sample ${cid}`, labels[cid])
}

const sourcePath = path.join(catDir, 'SOURCE.md')
const note = [
  '',
  '## Chinese (`zh`)',
  '',
  'Simplified Chinese labels overlaid from local pak-extracted `StringData.xml` (`Zh_CN`)',
  '+ `GameItemData.xml` / `AccountTitleData.xml` via `scripts/merge-dragon-sword-zh-from-pak.mjs`.',
  'Raw XML is not committed (game copyright).',
  ''
].join('\n')
let source = fs.readFileSync(sourcePath, 'utf8')
if (!source.includes('## Chinese')) {
  fs.writeFileSync(sourcePath, source.trimEnd() + '\n' + note, 'utf8')
  console.log('updated SOURCE.md')
}
