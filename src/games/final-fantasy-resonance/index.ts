import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type FinalFantasyResonanceState } from './parse'
import { listSlots } from './slots'
import { finalFantasyResonanceViews } from './views'

export type { FinalFantasyResonanceState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const finalFantasyResonanceModule: GameModule<FinalFantasyResonanceState> = {
  id: 'final-fantasy-resonance',
  catalog: {
    name: { zh: '最终幻想：共鸣', en: 'FINAL FANTASY RESONANCE' },
    cover: coverUrl,
    rightsHolder: 'Square Enix',
    developer: 'LANCARSE',
    publisher: 'Square Enix',
    steamAppId: 3259780,
    summary: {
      zh: '非官方存档修改器。修改 GameSaveData*.sav；请先退出游戏并关闭 Steam 云同步。',
      en: 'Unofficial save editor for GameSaveData*.sav. Quit the game and disable Steam Cloud before editing.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: finalFantasyResonanceViews
}
