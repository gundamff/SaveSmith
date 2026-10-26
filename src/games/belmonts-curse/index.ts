/**
 * Castlevania: Belmont's Curse GameModule shell.
 * Cover: Steam store header for App 4231820 (© KONAMI).
 */
import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type BelmontsCurseState } from './parse'
import { listSlots } from './slots'
import { belmontsCurseViews } from './views'

export type { BelmontsCurseState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const belmontsCurseModule: GameModule<BelmontsCurseState> = {
  id: 'belmonts-curse',
  catalog: {
    name: { zh: '恶魔城：贝尔蒙特的诅咒', en: "Castlevania: Belmont's Curse" },
    cover: coverUrl,
    rightsHolder: 'KONAMI',
    developer: 'Evil Empire',
    publisher: 'Evil Empire',
    steamAppId: 4231820,
    summary: {
      zh: '非官方存档修改器。请先退出游戏再改档；建议关闭 Steam Cloud。',
      en: 'Unofficial save editor. Quit the game before editing; consider turning off Steam Cloud.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: belmontsCurseViews
}
