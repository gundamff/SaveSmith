import type { GameModule } from '@sdk/types'
import { locate } from './locate'
import { parse, serialize, validate, type DeadCellsState } from './parse'
import { listSlots } from './slots'
import { deadCellsViews } from './views'

export type { DeadCellsState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const deadCellsModule: GameModule<DeadCellsState> = {
  id: 'dead-cells',
  catalog: {
    name: { zh: '死亡细胞', en: 'Dead Cells' },
    cover: coverUrl,
    rightsHolder: 'Motion Twin / Evil Empire',
    developer: 'Motion Twin / Evil Empire',
    publisher: 'Motion Twin',
    steamAppId: 588650,
    summary: {
      zh: '非官方存档修改器。请先退出游戏再改档；Steam 云同步可能覆盖本地修改。',
      en: 'Unofficial save editor. Quit the game before editing; Steam Cloud sync may overwrite local changes.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions: () => [],
  applyAction: (state) => state,
  views: deadCellsViews
}
