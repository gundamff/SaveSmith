/**
 * Build `catalog/bossDifficulties.json` from unpack evidence (BossCombatRecorder.js +
 * DT_LocTable difficulty names). Regenerate after game build / cycle cap changes.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Matches `model/progress.ts` upper bound for CycleCount edits. */
const MAX_CYCLE = Number(process.env.PBZ_BOSS_DIFF_MAX_CYCLE ?? 99)

/** EDifficultMode ordinal → official zh UI short name (build 26367565). */
const DIFFICULTY_ZH: Record<number, string> = {
  0: '辅助',
  1: '入阵者',
  2: '破局者',
  3: '逆天者',
  4: '六十六天',
}

/** English readable labels when locres has no en for difficulty titles. */
const DIFFICULTY_EN: Record<number, string> = {
  0: 'Auxiliary',
  1: 'Story',
  2: 'Normal',
  3: 'Hard',
  4: '66 Days',
}

type Row = { key: string; zh: string; en: string; order: number }

const rows: Row[] = []
for (let cycle = 0; cycle <= MAX_CYCLE; cycle++) {
  for (const difficulty of [0, 1, 2, 3, 4]) {
    const key = `${cycle}_${difficulty}`
    const modeZh = DIFFICULTY_ZH[difficulty]
    const modeEn = DIFFICULTY_EN[difficulty]
    rows.push({
      key,
      zh: cycle === 0 ? modeZh : `周目${cycle} · ${modeZh}`,
      en: cycle === 0 ? modeEn : `Cycle ${cycle} · ${modeEn}`,
      order: cycle * 10 + difficulty,
    })
  }
}

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/games/phantom-blade-zero/catalog/bossDifficulties.json',
)
writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
console.log(`wrote ${rows.length} boss difficulty keys → ${out}`)
