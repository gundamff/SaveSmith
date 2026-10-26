/**
 * Build id → { en, zh } catalog for Castlevania: Belmont's Curse from a local install.
 * Does not copy icons or other copyrighted art.
 *
 * Usage:
 *   npx tsx scripts/bc-extract-names.mts --game "F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"
 *
 * Output: src/games/belmonts-curse/catalog/items.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outPath = path.join(repoRoot, 'src/games/belmonts-curse/catalog/items.json')

export type ItemEntry = { en: string; zh: string }
export type ItemsCatalog = Record<string, ItemEntry>

export type ExtractStats = {
  gameRoot: string
  dataDir: string
  publisher: string
  product: string
  addressablesBuildHash: string
  catalogInternalIdCount: number
  itemLocalizationAssetCount: number
  bundleFileCount: number
  extractedEntryCount: number
}

export type ExtractOutcome = {
  items: ItemsCatalog
  stats: ExtractStats
  limitation: string | null
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const o: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i]!.startsWith('--')) continue
    const key = argv[i]!.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) o[key] = true
    else {
      o[key] = next
      i++
    }
  }
  return o
}

function readAppInfo(dataDir: string): { publisher: string; product: string } {
  const infoPath = path.join(dataDir, 'app.info')
  if (!fs.existsSync(infoPath)) return { publisher: '', product: '' }
  const lines = fs.readFileSync(infoPath, 'utf8').split(/\r?\n/)
  return { publisher: lines[0]?.trim() ?? '', product: lines[1]?.trim() ?? '' }
}

function resolveDataDir(gameRoot: string): string {
  const abs = path.resolve(gameRoot)
  if (!fs.existsSync(abs)) throw new Error(`game path not found: ${abs}`)
  if (path.basename(abs).endsWith('_Data')) return abs
  const child = fs.readdirSync(abs).find((n) => n.endsWith('_Data'))
  if (!child) throw new Error(`no *_Data folder under ${abs}`)
  return path.join(abs, child)
}

function countBundles(aaDir: string): number {
  const platformDir = path.join(aaDir, 'StandaloneWindows64')
  if (!fs.existsSync(platformDir)) return 0
  return fs.readdirSync(platformDir).filter((n) => n.endsWith('.bundle')).length
}

/**
 * Display names live in Unity Localization StringTableCollections referenced from
 * Addressables (`Items_*`, `Abilities_*`, …). Bundles are binary-compressed; decoding
 * them belongs in a follow-up (AssetRipper / UnityPy), not this scaffold.
 */
export function extractBelmontsCurseNames(gameRoot: string): ExtractOutcome {
  const dataDir = resolveDataDir(gameRoot)
  const aaDir = path.join(dataDir, 'StreamingAssets', 'aa')
  const catalogPath = path.join(aaDir, 'catalog.json')
  const { publisher, product } = readAppInfo(dataDir)

  const emptyStats = (partial: Partial<ExtractStats>): ExtractStats => ({
    gameRoot: path.resolve(gameRoot),
    dataDir,
    publisher,
    product,
    addressablesBuildHash: '',
    catalogInternalIdCount: 0,
    itemLocalizationAssetCount: 0,
    bundleFileCount: countBundles(aaDir),
    extractedEntryCount: 0,
    ...partial
  })

  if (!fs.existsSync(catalogPath)) {
    return {
      items: {},
      stats: emptyStats({}),
      limitation:
        'Missing StreamingAssets/aa/catalog.json (not a Belmont\'s Curse PC install or incomplete copy).'
    }
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as {
    m_BuildResultHash?: string
    m_InternalIds?: string[]
  }
  const internalIds = catalog.m_InternalIds ?? []
  const itemLocAssets = internalIds.filter((id) =>
    /StringTableCollections\/Items_/i.test(id)
  )

  const items: ItemsCatalog = {}
  const limitation =
    itemLocAssets.length > 0
      ? 'Item display names are in Unity Localization StringTables inside Addressables .bundle files (IL2CPP build). This script validates the install and leaves items.json empty until a bundle/text extractor is added; the UI falls back to raw save IDs.'
      : 'Addressables catalog found but no Items_* localization tables listed; names not extracted.'

  return {
    items,
    stats: {
      gameRoot: path.resolve(gameRoot),
      dataDir,
      publisher,
      product,
      addressablesBuildHash: catalog.m_BuildResultHash ?? '',
      catalogInternalIdCount: internalIds.length,
      itemLocalizationAssetCount: itemLocAssets.length,
      bundleFileCount: countBundles(aaDir),
      extractedEntryCount: Object.keys(items).length
    },
    limitation: Object.keys(items).length > 0 ? null : limitation
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const game = args.game
  if (typeof game !== 'string' || !game) {
    console.error('Usage: npx tsx scripts/bc-extract-names.mts --game "<install root>"')
    process.exit(1)
  }

  const outcome = extractBelmontsCurseNames(game)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(outcome.items, null, 2) + '\n', 'utf8')

  console.log('Wrote', outPath)
  console.log('Entries:', outcome.stats.extractedEntryCount)
  console.log('Addressables hash:', outcome.stats.addressablesBuildHash || '(none)')
  console.log(
    'Catalog internal IDs:',
    outcome.stats.catalogInternalIdCount,
    '| Items_* loc assets:',
    outcome.stats.itemLocalizationAssetCount,
    '| bundles:',
    outcome.stats.bundleFileCount
  )
  if (outcome.limitation) console.warn('Limitation:', outcome.limitation)
}

const invoked = process.argv[1]?.includes('bc-extract-names')
if (invoked) main()
