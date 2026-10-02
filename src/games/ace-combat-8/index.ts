import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type AceCombat8State } from './parse'
import { listSlots } from './slots'
import { aceCombat8Views } from './views'

export type { AceCombat8State }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const aceCombat8Module: GameModule<AceCombat8State> = {
  id: 'ace-combat-8',
  catalog: {
    name: { zh: '皇牌空战8：希孚之翼', en: 'ACE COMBAT 8: WINGS OF THEVE' },
    cover: coverUrl,
    rightsHolder: 'Bandai Namco Entertainment',
    developer: 'Bandai Namco Aces',
    publisher: 'Bandai Namco Entertainment',
    steamAppId: 2288340,
    summary: {
      zh: '非官方存档修改器。修改 Campaign.sav；请先退出游戏并关闭 Steam 云同步。',
      en: 'Unofficial save editor for Campaign.sav. Quit the game and disable Steam Cloud before editing.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: aceCombat8Views
}
