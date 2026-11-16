/**
 * BALL x PIT GameModule.
 * Cover: Steam library hero (App 2062430) resized to 460×215. © Kenny Sun / Devolver Digital.
 */
import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type BallXPitState } from './parse'
import { listSlots } from './slots'
import { ballXPitViews } from './views'

export type { BallXPitState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const ballXPitModule: GameModule<BallXPitState> = {
  id: 'ball-x-pit',
  catalog: {
    name: { zh: 'BALL x PIT', en: 'BALL x PIT' },
    cover: coverUrl,
    rightsHolder: 'Kenny Sun / Devolver Digital',
    developer: 'Kenny Sun',
    publisher: 'Devolver Digital',
    steamAppId: 2062430,
    summary: {
      zh: '非官方存档修改器：城镇四资源 + 弹珠/被动/组合图鉴一键点亮。请先退出游戏再改档；Steam Cloud 可能回滚。',
      en: 'Unofficial save editor: town resources + one-click ball/passive/combo encyclopedia unlock. Quit the game first; Steam Cloud may roll back edits.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: ballXPitViews
}
