import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type ChaosFrontState } from './parse'
import { listSlots } from './slots'
import { chaosFrontViews } from './views'

export type { ChaosFrontState }
export { fillResources } from './actions'

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const chaosFrontModule: GameModule<ChaosFrontState> = {
  id: 'chaos-front',
  catalog: {
    name: { zh: '混沌兵团', en: 'Chaos Front' },
    cover: coverUrl,
    rightsHolder: 'ChaosGalaxyStudio',
    developer: 'Han Zhiyu',
    publisher: 'ChaosGalaxyStudio',
    steamAppId: 2770330,
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
  actions,
  applyAction,
  views: chaosFrontViews
}
