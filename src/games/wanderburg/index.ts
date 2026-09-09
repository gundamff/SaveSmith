import type { GameModule } from '@sdk/types'
import { locate } from './locate'
import { parse, serialize, validate, type WanderburgState } from './parse'
import { listSlots } from './slots'
import { wanderburgViews } from './views'

export type { WanderburgState }

const coverUrl = new URL('./cover.svg', import.meta.url).href

export const wanderburgModule: GameModule<WanderburgState> = {
  id: 'wanderburg',
  catalog: {
    name: { zh: 'Wanderburg', en: 'Wanderburg' },
    cover: coverUrl,
    rightsHolder: 'Randwerk',
    developer: 'Randwerk',
    publisher: 'Sidekick Publishing',
    steamAppId: 3624140,
    summary: {
      zh: '非官方存档修改器。Early Access 格式可能变更；请先退出游戏再改档。',
      en: 'Unofficial save editor. Early Access formats may change. Quit the game before editing.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions: () => [],
  applyAction: (state) => state,
  views: wanderburgViews
}
