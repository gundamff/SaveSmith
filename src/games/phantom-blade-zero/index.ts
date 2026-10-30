import type { GameModule } from '@sdk/types'
import { locate } from './locate'
import { parse, serialize, validate, type PhantomBladeZeroState } from './parse'
import { listSlots } from './slots'

export type { PhantomBladeZeroState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const phantomBladeZeroModule: GameModule<PhantomBladeZeroState> = {
  id: 'phantom-blade-zero',
  catalog: {
    name: { zh: '影之刃零', en: 'Phantom Blade Zero' },
    cover: coverUrl,
    rightsHolder: 'S-GAME Studio',
    developer: 'S-GAME Studio',
    publisher: 'S-GAME Publishing',
    steamAppId: 4115450,
    storeUrl: 'https://store.steampowered.com/app/4115450/',
    summary: {
      zh: '非官方存档修改器，仅限单机使用。请先完全退出游戏；Steam 云存档可能覆盖修改。',
      en: 'Unofficial save editor for single-player use only. Fully quit the game first; Steam Cloud may overwrite your changes.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions: () => [],
  applyAction: (state) => state,
  views: []
}
