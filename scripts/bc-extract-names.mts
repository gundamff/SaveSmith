/**
 * Wrapper: run Python UnityPy extractor for Belmont's Curse item names.
 *
 * Usage:
 *   npx tsx scripts/bc-extract-names.mts --game "F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"
 *
 * Prefer directly:
 *   py -3 scripts/bc_extract_names.py --game "..."
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pyScript = path.join(repoRoot, 'scripts', 'bc_extract_names.py')

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

function main() {
  const args = parseArgs(process.argv.slice(2))
  const game = args.game
  if (typeof game !== 'string' || !game) {
    console.error('Usage: npx tsx scripts/bc-extract-names.mts --game "<install root>"')
    process.exit(1)
  }

  const runners = process.platform === 'win32' ? ['py', 'python'] : ['python3', 'python']
  let lastStatus = 1
  for (const runner of runners) {
    const cmdArgs = runner === 'py' ? ['-3', pyScript, '--game', game] : [pyScript, '--game', game]
    const r = spawnSync(runner, cmdArgs, { stdio: 'inherit', cwd: repoRoot })
    if (r.error) continue
    lastStatus = r.status ?? 1
    process.exit(lastStatus)
  }
  console.error('Python not found (tried py / python). Install Python 3 and UnityPy.')
  process.exit(lastStatus)
}

main()
