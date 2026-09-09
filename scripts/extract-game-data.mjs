#!/usr/bin/env node
/**
 * Chaos Front 游戏素材提取
 * 用法:
 *   node scripts/extract-game-data.mjs --game "F:\...\Chaos Front_Data" \
 *     --ripper "C:\path\AssetRipper.GUI.Free.exe" --out .
 * --out 默认为仓库根；产物写入 src/games/chaos-front（data/game-data.json 与 assets/game）
 * 可选:
 *   --export <dir>  复用已有的 AssetRipper 导出目录（跳过导出，仍需 --ripper 或可省略）
 *   --json-only     只更新 game-data.json（不跑 AssetRipper / 不裁图）
 * Phase1 数据: 直接从 resources.assets 抠 TextAsset XML（无需 AssetRipper）
 * Phase2 图像: AssetRipper headless 导出后按 Sprite 矩形裁切
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { PNG } from 'pngjs'

const args = parseArgs(process.argv.slice(2))
const GAME = args.game
const RIPPER = args.ripper
const OUT = args.out ?? '.'
const PORT = 18923
const EXPORT = args.export
  ? path.resolve(args.export)
  : path.join(process.env.TEMP ?? '/tmp', 'cfse_rip_export')

if (!GAME) die('缺少 --game <Chaos Front_Data 目录>')

// ---------- Phase 1: TextAsset XML ----------
const resAssets = path.join(GAME, 'resources.assets')
const bin = fs.readFileSync(resAssets)
const tables = {
  unitType: extractXml('<UnitTypeData>'),
  unitLevel: extractXml('<UnitLevelData>'),
  character: extractXml('<CharacterData>'),
  item: extractXml('<ItemData>'),
  language: extractXml('<LanguageData>'),
  army: extractXml('<ArmyData>'),
  skill: extractXml('<SkillData>'),
  talent: extractXml('<TalentData>'),
  ability: extractXml('<AbilityData>'),
  weapon: extractXml('<WeaponData>')
}

const lang = parseXmlItems(tables.language).map((attrs) => xmlUnescape(attrs.CN ?? ''))
function langAt(id) {
  const n = num(id)
  if (n <= 0) return ''
  return lang[n - 1] ?? ''
}

const unitTypes = parseXmlItems(tables.unitType).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `机型${a.Index}`,
  info: langAt(a.Info),
  kind: num(a.Kind),
  size: num(a.Size),
  levelType: num(a.LevelType),
  model: num(a.Model),
  hp: num(a.HP),
  en: num(a.EN),
  agility: num(a.Agility),
  limit: num(a.Limit),
  move: num(a.Move),
  hangarS: num(a.HangarS),
  hangarL: num(a.HangarL),
  weapon1: num(a.Weapon1),
  weapon2: num(a.Weapon2),
  shield: num(a.Shield),
  ability1: num(a.Ablity1),
  ability2: num(a.Ablity2),
  ability3: num(a.Ablity3)
}))

const levelTables = {}
for (const a of parseXmlItems(tables.unitLevel)) {
  levelTables[String(num(a.Index))] = Array.from({ length: 7 }, (_, i) => num(a[`EXP${i}`]))
}

const characters = parseXmlItems(tables.character).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `驾驶员${a.Index}`,
  info: langAt(a.Info),
  portrait: num(a.Portrait),
  joinLv: num(a.JoinLv),
  shoot: num(a.Shoot),
  maneuver: num(a.Maneuver),
  command: num(a.Command),
  sp: num(a.SP),
  melee: num(a.Melee),
  reaction: num(a.Reaction),
  talents: Array.from({ length: 10 }, (_, i) => num(a[`Talent${i + 1}`])).filter((x) => x > 0),
  skills: Array.from({ length: 3 }, (_, i) => num(a[`Skill${i + 1}`])).filter((x) => x > 0)
}))

const items = parseXmlItems(tables.item).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `装备${a.Index}`,
  info: langAt(a.Info),
  icon: num(a.Icon)
}))

const armies = parseXmlItems(tables.army).map((a) => ({
  id: num(a.Index), name: langAt(a.Name) || `军团${a.Index}`, flag: num(a.Flag)
}))

const skills = parseXmlItems(tables.skill).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `技能${a.Index}`,
  info: langAt(a.Info),
  type: num(a.Type),
  sp: num(a.SP)
}))

const talents = parseXmlItems(tables.talent).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `天赋${a.Index}`,
  infos: [1, 2, 3, 4, 5].map((i) => langAt(a[`Info${i}`])).filter(Boolean)
}))

const abilities = parseXmlItems(tables.ability).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `能力${a.Index}`,
  info: langAt(a.Info),
  icon: num(a.Icon),
  type: num(a.Type),
  en: num(a.EN),
  range: num(a.Range)
}))

const weapons = parseXmlItems(tables.weapon).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `武器${a.Index}`,
  info: langAt(a.Info1) || langAt(a.Info2),
  icon: num(a.Icon),
  en: num(a.EN),
  damage: num(a.Damage),
  hit: num(a.Hit),
  rangeMin: num(a.RangeMin),
  rangeMax: num(a.RangeMax),
  count: num(a.Count)
}))

/** 存档 PlanetData.name 指向 LanguageData 下标（1-based）；当前地图 17 星为 358..374 */
const planets = Array.from({ length: 17 }, (_, i) => {
  const id = i + 1
  const nameId = 357 + id
  return { id, name: lang[nameId - 1] ?? `星球${id}` }
})

const unitMaxExp = {}
for (const u of unitTypes) {
  const t = levelTables[String(u.levelType)]
  unitMaxExp[String(u.id)] = t ? t[6] : 11970
}

function extractXml(tag) {
  const close = `</${tag.slice(1, -1)}>`
  const start = bin.indexOf(Buffer.from(tag))
  if (start < 0) die(`resources.assets 中找不到 ${tag}`)
  const end = bin.indexOf(Buffer.from(close), start)
  if (end < 0) die(`${tag} 未闭合`)
  return bin.slice(start, end + close.length).toString('utf8')
}
function parseXmlItems(xml) {
  const out = []
  for (const m of xml.matchAll(/<Item\s+([^>]+?)\/>/g)) {
    const attrs = {}
    for (const am of m[1].matchAll(/([\w]+)="([^"]*)"/g)) attrs[am[1]] = am[2]
    out.push(attrs)
  }
  return out
}
function xmlUnescape(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}
function num(v) { return parseInt(v, 10) || 0 }
function die(msg) { console.error(msg); process.exit(1) }
function parseArgs(argv) {
  const o = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) o[key] = true
    else { o[key] = next; i++ }
  }
  return o
}

// ---------- Phase 4 early: game-data.json（可单独跑） ----------
const gameData = {
  unitTypes, characters, items, armies, planets, levelTables, unitMaxExp,
  skills, talents, abilities, weapons
}
const jsonPath = path.join(OUT, 'src', 'games', 'chaos-front', 'data', 'game-data.json')
fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
fs.writeFileSync(jsonPath, JSON.stringify(gameData, null, 2) + '\n', 'utf8')
console.log(
  'game-data.json 已写入 | unitTypes:', unitTypes.length,
  '| characters:', characters.length,
  '| items:', items.length,
  '| skills:', skills.length,
  '| talents:', talents.length,
  '| abilities:', abilities.length,
  '| weapons:', weapons.length
)
if (unitTypes.length !== 92) die('机型数量异常（应为 92），检查提取')
if (args['json-only']) {
  console.log('(--json-only) 跳过图像导出')
  process.exit(0)
}

// ---------- Phase 2: AssetRipper 导出 ----------
let server = null
if (RIPPER && !args.export) {
  fs.rmSync(EXPORT, { recursive: true, force: true })
  server = spawn(RIPPER, ['--headless=true', `--port=${PORT}`], { stdio: 'ignore' })
  await waitHttp(PORT, 30000)
  await post(PORT, '/LoadFolder', { path: path.dirname(GAME) })
  console.log('AssetRipper 加载完成，开始导出（可能需要几分钟）...')
  await post(PORT, '/Export/PrimaryContent', { path: EXPORT })
  server.kill()
  console.log('导出完成:', EXPORT)
}

// ---------- Phase 3: 裁切/拷贝图像 ----------
const texDir = path.join(EXPORT, 'Assets', 'Texture2D')
const spriteDir = path.join(EXPORT, 'Assets', 'Sprite')
const imgOut = path.join(OUT, 'src', 'games', 'chaos-front', 'assets', 'game')
fs.rmSync(imgOut, { recursive: true, force: true })
fs.mkdirSync(imgOut, { recursive: true })

const stats = { copied: 0, cropped: 0, missing: 0 }

function copyPng(srcName, outName) {
  const src = path.join(texDir, `${srcName}.png`)
  if (!fs.existsSync(src)) { stats.missing++; return false }
  fs.copyFileSync(src, path.join(imgOut, `${outName}.png`))
  stats.copied++
  return true
}

function cropSprite(spriteBase, texName, outName) {
  const jsonPath = path.join(spriteDir, `${spriteBase}.json`)
  const texPath = path.join(texDir, `${texName}.png`)
  if (!fs.existsSync(jsonPath) || !fs.existsSync(texPath)) { stats.missing++; return false }
  const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const r = meta.m_RD.m_TextureRect
  const png = PNG.sync.read(fs.readFileSync(texPath))
  const x = Math.floor(r.m_X), w = Math.ceil(r.m_Width), h = Math.ceil(r.m_Height)
  const y = Math.floor(png.height - r.m_Y - r.m_Height) // Unity 左下原点 → PNG 左上
  const out = new PNG({ width: w, height: h })
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const si = ((y + py) * png.width + (x + px)) << 2
      const di = (py * w + px) << 2
      for (let k = 0; k < 4; k++) out.data[di + k] = png.data[si + k]
    }
  }
  fs.writeFileSync(path.join(imgOut, `${outName}.png`), PNG.sync.write(out))
  stats.cropped++
  return true
}

// 机体/飞船: 92 种 → mapUnit<model>_0 裁切
for (const u of unitTypes) cropSprite(`mapUnit${u.model}_0`, `mapUnit${u.model}`, `unit-${u.id}`)

// 驾驶员头像: 独立贴图优先
for (const c of characters) {
  if (!copyPng(`portrait${c.portrait}`, `portrait-${c.id}`)) cropSprite(`portrait${c.portrait}`, `portrait${c.portrait}`, `portrait-${c.id}`)
}

// 装备图标: 贴图集内 sprite 下标为 icon-1（图标 1..16 ↔ itemIcon_0..15，经视觉比对确认）
for (const it of items) cropSprite(`itemIcon_${it.icon - 1}`, 'itemIcon', `item-${it.id}`)

// 军团旗帜 + 传统图标（存在才拷）
for (let n = 0; n <= 33; n++) copyPng(`flagRound${n}`, `flag-round-${n}`)
for (let n = 0; n <= 11; n++) cropSprite(`traditionIcon_${n}`, 'traditionIcon', `tradition-${n}`)

console.log('完成:', JSON.stringify(stats), '| unitTypes:', unitTypes.length, '| characters:', characters.length, '| items:', items.length, '| armies:', armies.length, '| planets:', planets.length)

function waitHttp(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => { res.resume(); resolve() })
      req.on('error', () => {
        if (Date.now() - t0 > timeoutMs) reject(new Error('AssetRipper 启动超时'))
        else setTimeout(tick, 1000)
      })
    }
    tick()
  })
}
function post(port, p, body) {
  const data = new URLSearchParams(body).toString()
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      res.resume()
      res.statusCode < 400 ? resolve() : reject(new Error(`${p} -> ${res.statusCode}`))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
