import type { GameModule } from '@sdk/types'
import { locate } from './locate'
import { parse, serialize, validate, type ChaosGalaxy2State } from './parse'
import { listSlots } from './slots'
import { chaosGalaxy2Views } from './views'

export type { ChaosGalaxy2State }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const chaosGalaxy2Module: GameModule<ChaosGalaxy2State> = {
  id: 'chaos-galaxy-2',
  catalog: {
    name: { zh: '混沌银河 2', en: 'Chaos Galaxy 2' },
    cover: coverUrl,
    rightsHolder: 'ChaosGalaxyStudio',
    developer: 'Han Zhiyu',
    publisher: 'ChaosGalaxyStudio',
    steamAppId: 1537910,
    summary: {
      zh: '非官方存档修改器。请先退出游戏再改档。',
      en: 'Unofficial save editor. Quit the game before editing.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions: () => [],
  applyAction: (state) => state,
  views: chaosGalaxy2Views
}
