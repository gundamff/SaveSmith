#!/usr/bin/env node
/**
 * Chaos Galaxy 2 游戏素材提取
 * 用法:
 *   node scripts/extract-chaos-galaxy-2.mjs --game "F:\SteamLibrary\steamapps\common\Chaos Galaxy 2\ChaosGalaxy2_Data" --json-only
 *   node scripts/extract-chaos-galaxy-2.mjs --game "F:\...\ChaosGalaxy2_Data" --ripper "C:\path\AssetRipper.GUI.Free.exe" --out .
 * --out 默认为仓库根；产物写入 src/games/chaos-galaxy-2（data/game-data.json 与 assets/game）
 * 可选:
 *   --export <dir>  复用已有的 AssetRipper 导出目录（跳过导出）
 *   --json-only     只更新 game-data.json（不跑 AssetRipper / 不裁图）
 *   无 --ripper 且无 --export 时默认等同 --json-only（Phase 1 名称/上限即可交付）
 *
 * Phase1 数据: 直接从 resources.assets 抠 TextAsset XML（无需 AssetRipper）
 *   已确认根节点: BuildingData, ChipSkillsData, CollectionCommanderData,
 *   CollectionEventData, CollectionUnitData, CommanderData, CommanderStrategyData,
 *   CommanderTacticsData, CommanderTalentData, ConversationData, CustomFigureData,
 *   CustomFlagData, CustomPolicyData, CustomSideData, DialogueData, FactionSelectData,
 *   ChipSkillsData, FleetStatusData, LanguageData, PlanetData, PlanetFeatureData, PolicyData,
 *   PortraitShiftData, RankData, SpaceLaneData, TroopAnimData, UnitAbilityData,
 *   UnitEffectsData, UnitTypeData, UnitWeaponData
 *   无 UnitLevelData：指挥官经验上限无成长表，脚本内写入保守回落常量。
 * Phase2 图像: AssetRipper headless 导出后按 Sprite 矩形裁切（可选）
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
const PORT = 18924
const EXPORT = args.export
  ? path.resolve(args.export)
  : path.join(process.env.TEMP ?? '/tmp', 'cg2_rip_export')

if (!GAME) die('缺少 --game <ChaosGalaxy2_Data 目录>')

/** 无 UnitLevelData 时的经验/资源回落（表内无硬顶；记入脚本而非 JSON TODO） */
const COMMANDER_MAX_EXP_FALLBACK = 999999
const RESOURCE_MAX_GOLD_FALLBACK = 999999999
const RESOURCE_MAX_SUPPLY_FALLBACK = 999999999
const RESOURCE_MAX_PRESTIGE_FALLBACK = 999999

/** Phase-1 stub caps (pre-extract); kept so re-extract never tightens below editor expectations */
const PREVIOUS_STUB_CAPS = {
  commanderMaxExp: 999999,
  commanderMaxStar: 5,
  commanderMaxStat: 99,
  planetMaxDefense: 999,
  planetMaxHqLevel: 10
}

/**
 * Observed maxima from savedata1.cg2 (read-only scan, 2026-09-16).
 * Commander star/admin/military/intellect/breeding/exp; Planet defense/hqLevel.
 */
const OBSERVED_SAVE_MAX = {
  commanderMaxExp: 0,
  commanderMaxStar: 1,
  commanderMaxStat: 50,
  planetMaxDefense: 400,
  planetMaxHqLevel: 3
}

function capMax(...values) {
  let m = 0
  for (const v of values) {
    if (Number.isFinite(v) && v > m) m = v
  }
  return m
}

const resAssets = path.join(GAME, 'resources.assets')
const bin = fs.readFileSync(resAssets)

const tables = {
  building: extractXml('<BuildingData>'),
  collectionCommander: extractXml('<CollectionCommanderData>'),
  collectionEvent: extractXml('<CollectionEventData>'),
  collectionUnit: extractXml('<CollectionUnitData>'),
  commander: extractXml('<CommanderData>'),
  language: extractXml('<LanguageData>'),
  planet: extractXml('<PlanetData>'),
  rank: extractXml('<RankData>'),
  unitType: extractXml('<UnitTypeData>'),
  unitAbility: extractXml('<UnitAbilityData>'),
  unitWeapon: extractXml('<UnitWeaponData>'),
  commanderTalent: extractXml('<CommanderTalentData>'),
  commanderStrategy: extractXml('<CommanderStrategyData>'),
  commanderTactics: extractXml('<CommanderTacticsData>'),
  factionSelect: extractXml('<FactionSelectData>'),
  chipSkills: extractXml('<ChipSkillsData>')
}

const lang = parseXmlItems(tables.language).map((attrs) => xmlUnescape(attrs.CN ?? ''))
function langAt(id) {
  const n = num(id)
  if (n <= 0) return ''
  return lang[n - 1] ?? ''
}

const commanders = parseXmlItems(tables.commander).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `指挥官${a.Index}`,
  info: langAt(a.Info),
  portrait: num(a.Portrait),
  npc: num(a.NPC),
  military: num(a.Military),
  intellect: num(a.Intellect),
  admin: num(a.Administer),
  breeding: num(a.Breeding),
  talent: num(a.Talent),
  strategy: num(a.Strategy),
  tactics: num(a.Tactics),
  levelUpType: num(a.LevelUpType),
  flagUnit: num(a.FlagUnit)
}))

const units = parseXmlItems(tables.unitType).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `单位${a.Index}`,
  model: num(a.Model),
  kind: num(a.Kind),
  type: num(a.Type),
  rank: num(a.Rank),
  power: num(a.Power),
  energy: num(a.Energy),
  agile: num(a.Agile),
  move: num(a.Move),
  limit: num(a.Limit)
}))

const planets = parseXmlItems(tables.planet).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `星球${a.Index}`,
  defense: num(a.Defense),
  commandCenter: num(a.CommandCenter)
}))

const buildings = parseXmlItems(tables.building).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `建筑${a.Index}`,
  info: langAt(a.Info),
  icon: num(a.Icon),
  buildingType: num(a.BuildingType),
  defenseMax: [num(a.DefenseMax0), num(a.DefenseMax1), num(a.DefenseMax2)]
}))

const ranks = parseXmlItems(tables.rank).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `官职${a.Index}`,
  info: langAt(a.Info),
  rankType: num(a.RankType),
  fleetLimit: num(a.FleetLimit),
  military: num(a.Military),
  intellect: num(a.Intellect),
  admin: num(a.Admin)
}))

const talents = parseXmlItems(tables.commanderTalent).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `天赋${a.Index}`,
  info: langAt(a.Info)
}))

const strategies = parseXmlItems(tables.commanderStrategy).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `战略${a.Index}`,
  info: langAt(a.Info)
}))

const tactics = parseXmlItems(tables.commanderTactics).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `战术${a.Index}`,
  info: langAt(a.Info)
}))

const abilities = parseXmlItems(tables.unitAbility).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `能力${a.Index}`,
  info: langAt(a.Info)
}))

const weapons = parseXmlItems(tables.unitWeapon).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `武器${a.Index}`,
  info: langAt(a.Info)
}))

const factions = parseXmlItems(tables.factionSelect).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `势力${a.Index}`,
  info: langAt(a.Info),
  leader: num(a.Leader),
  factionSide: num(a.FactionSide)
}))

const chipSkills = parseXmlItems(tables.chipSkills).map((a) => ({
  id: num(a.Index),
  name: langAt(a.Name) || `芯片${a.Index}`,
  info: langAt(a.Info),
  chipType: num(a.ChipType)
}))

const collectionCommanders = parseXmlItems(tables.collectionCommander).map((a) => ({
  index: num(a.Index),
  commanderId: num(a.Commander),
  need: num(a.Need)
}))

const collectionUnits = parseXmlItems(tables.collectionUnit).map((a) => ({
  index: num(a.Index),
  unitId: num(a.Unit),
  need: num(a.Need)
}))

const collectionEvents = parseXmlItems(tables.collectionEvent).map((a) => ({
  index: num(a.Index),
  name: langAt(a.Name) || `事件${a.Index}`,
  info: langAt(a.Info)
}))

const collectionLengths = {
  commanders: collectionCommanders.length,
  units: collectionUnits.length,
  events: collectionEvents.length
}

const commanderStatMax = maxOf(commanders.flatMap((c) => [c.military, c.intellect, c.admin, c.breeding]))
const rankBonusMax = maxOf(ranks.flatMap((r) => [r.military, r.intellect, r.admin]))
const extractedCommanderMaxStat = commanderStatMax + rankBonusMax
const extractedCommanderMaxStar = Math.max(
  maxOf(units.map((u) => u.rank)),
  maxOf(ranks.map((r) => r.rankType))
)
const extractedPlanetMaxDefense = Math.max(
  maxOf(buildings.flatMap((b) => b.defenseMax)),
  maxOf(planets.map((p) => p.defense))
)
// 行星指挥部 DefenseMax0/1/2 共 3 档；PlanetData.CommandCenter 实测 1..3
const extractedPlanetMaxHqLevel = Math.max(3, maxOf(planets.map((p) => p.commandCenter)))

const commanderMaxExp = capMax(
  COMMANDER_MAX_EXP_FALLBACK,
  OBSERVED_SAVE_MAX.commanderMaxExp,
  PREVIOUS_STUB_CAPS.commanderMaxExp
)
const commanderMaxStar = capMax(
  extractedCommanderMaxStar,
  OBSERVED_SAVE_MAX.commanderMaxStar,
  PREVIOUS_STUB_CAPS.commanderMaxStar
)
const commanderMaxStat = capMax(
  extractedCommanderMaxStat,
  OBSERVED_SAVE_MAX.commanderMaxStat,
  PREVIOUS_STUB_CAPS.commanderMaxStat
)
const planetMaxDefense = capMax(
  extractedPlanetMaxDefense,
  OBSERVED_SAVE_MAX.planetMaxDefense,
  PREVIOUS_STUB_CAPS.planetMaxDefense
)
const planetMaxHqLevel = capMax(
  extractedPlanetMaxHqLevel,
  OBSERVED_SAVE_MAX.planetMaxHqLevel,
  PREVIOUS_STUB_CAPS.planetMaxHqLevel
)

const gameData = {
  commanderMaxExp,
  commanderMaxStar,
  commanderMaxStat,
  planetMaxDefense,
  planetMaxHqLevel,
  resourceMaxGold: RESOURCE_MAX_GOLD_FALLBACK,
  resourceMaxSupply: RESOURCE_MAX_SUPPLY_FALLBACK,
  resourceMaxPrestige: RESOURCE_MAX_PRESTIGE_FALLBACK,
  commanders,
  units,
  planets: planets.map(({ id, name }) => ({ id, name })),
  buildings,
  ranks,
  talents,
  strategies,
  tactics,
  abilities,
  weapons,
  factions,
  chipSkills,
  levelTables: {},
  collectionLengths,
  collectionCommanders,
  collectionUnits,
  collectionEvents
}

const jsonPath = path.join(OUT, 'src', 'games', 'chaos-galaxy-2', 'data', 'game-data.json')
fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
fs.writeFileSync(jsonPath, JSON.stringify(gameData, null, 2) + '\n', 'utf8')
console.log(
  'game-data.json 已写入 | commanders:', commanders.length,
  '| units:', units.length,
  '| planets:', planets.length,
  '| buildings:', buildings.length,
  '| factions:', factions.length,
  '| chipSkills:', chipSkills.length,
  '| collections:', JSON.stringify(collectionLengths),
  '| caps:', JSON.stringify({
    commanderMaxExp: gameData.commanderMaxExp,
    commanderMaxStar,
    commanderMaxStat,
    planetMaxDefense,
    planetMaxHqLevel
  })
)

if (commanders.length < 100) die(`指挥官数量异常（${commanders.length}），检查提取`)
if (units.length !== 278) die(`单位数量异常（应为 278，实际 ${units.length}），检查提取`)
if (planets.length !== 80) die(`星球数量异常（应为 80，实际 ${planets.length}），检查提取`)
if (collectionLengths.commanders !== 98) die(`CollectionCommanderData 数量异常（应为 98）`)
if (collectionLengths.units !== 245) die(`CollectionUnitData 数量异常（应为 245）`)
if (collectionLengths.events !== 50) die(`CollectionEventData 数量异常（应为 50）`)
if (commanders[0]?.name !== '文昌君') die('指挥官 1 名称异常，检查 LanguageData')
if (units[0]?.name !== '作战卫星') die('单位 1 名称异常，检查 LanguageData')
if (factions.length < 8) die(`势力数量异常（${factions.length}），检查 FactionSelectData`)
if (chipSkills.length < 10) die(`芯片技能数量异常（${chipSkills.length}），检查 ChipSkillsData`)

const skipImages = args['json-only'] || (!RIPPER && !args.export)
if (skipImages) {
  console.log('跳过图像导出（--json-only 或未提供 --ripper/--export）。带图标请加 --ripper <AssetRipper.GUI.Free.exe>')
  process.exit(0)
}

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

const texDir = path.join(EXPORT, 'Assets', 'Texture2D')
const spriteDir = path.join(EXPORT, 'Assets', 'Sprite')
const imgOut = path.join(OUT, 'src', 'games', 'chaos-galaxy-2', 'assets', 'game')
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
  const metaPath = path.join(spriteDir, `${spriteBase}.json`)
  const texPath = path.join(texDir, `${texName}.png`)
  if (!fs.existsSync(metaPath) || !fs.existsSync(texPath)) { stats.missing++; return false }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  const r = meta.m_RD?.m_TextureRect
  if (!r) { stats.missing++; return false }
  const png = PNG.sync.read(fs.readFileSync(texPath))
  const x = Math.floor(r.m_X), w = Math.ceil(r.m_Width), h = Math.ceil(r.m_Height)
  const y = Math.floor(png.height - r.m_Y - r.m_Height)
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

for (const c of commanders) {
  const n = c.portrait
  if (!n) continue
  if (!copyPng(`portrait${n}`, `portrait-${c.id}`)) {
    cropSprite(`portrait${n}`, `portrait${n}`, `portrait-${c.id}`)
  }
}

for (const u of units) {
  if (!copyPng(`mapUnit${u.model}`, `unit-${u.id}`)) {
    cropSprite(`mapUnit${u.model}_0`, `mapUnit${u.model}`, `unit-${u.id}`)
  }
}

for (const b of buildings) {
  if (!b.icon) continue
  if (!copyPng(`buildingIcon${b.icon}`, `building-${b.id}`)) {
    cropSprite(`buildingIcon_${b.icon}`, 'buildingIcon', `building-${b.id}`)
  }
}

console.log('完成:', JSON.stringify(stats), '| commanders:', commanders.length, '| units:', units.length, '| planets:', planets.length)

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
function maxOf(values) {
  let m = 0
  for (const v of values) if (v > m) m = v
  return m
}
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
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: p,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      res.resume()
      res.statusCode < 400 ? resolve() : reject(new Error(`${p} -> ${res.statusCode}`))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
