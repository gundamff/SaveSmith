import type { GameModule } from '@sdk/types'
import { locate } from './locate'
import { parse, serialize, validate, type TerrariaPlayerState } from './parse'
import { listSlots } from './slots'
import { terrariaViews } from './views'

export type { TerrariaPlayerState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const terrariaModule: GameModule<TerrariaPlayerState> = {
  id: 'terraria',
  catalog: {
    name: { zh: '泰拉瑞亚', en: 'Terraria' },
    cover: coverUrl,
    rightsHolder: 'Re-Logic',
    developer: 'Re-Logic',
    publisher: 'Re-Logic',
    steamAppId: 105600,
    summary: {
      zh: '非官方存档修改器（原版玩家 .plr）。改档内名字不会重命名文件；请先退出游戏再改档。',
      en: 'Unofficial save editor (vanilla player .plr). Renaming in-file does not rename the file. Quit the game before editing.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions: () => [],
  applyAction: (state) => state,
  views: terrariaViews
}
