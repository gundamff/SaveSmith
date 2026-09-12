/**
 * DragonSword: Awakening GameModule shell.
 *
 * Public format references (no community editor source copied):
 * - https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
 *
 * Cover: Steam store header for App 4570720 (© HOUND13).
 */
import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type DragonSwordState } from './parse'
import { listSlots } from './slots'
import { dragonSwordViews } from './views'

export type { DragonSwordState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const dragonSwordModule: GameModule<DragonSwordState> = {
  id: 'dragon-sword',
  catalog: {
    name: { zh: '龙之剑：觉醒', en: 'DragonSword: Awakening' },
    cover: coverUrl,
    rightsHolder: 'HOUND13',
    developer: 'HOUND13',
    publisher: 'HOUND13',
    steamAppId: 4570720,
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
  views: dragonSwordViews
}
