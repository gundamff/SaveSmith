/**
 * Eslabong GameModule.
 * Cover: Steam store header for App 4560660 (© shirowita).
 */
import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type EslabongState } from './parse'
import { listSlots } from './slots'
import { eslabongViews } from './views'

export type { EslabongState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const eslabongModule: GameModule<EslabongState> = {
  id: 'eslabong',
  catalog: {
    name: { zh: 'Eslabong', en: 'Eslabong' },
    cover: coverUrl,
    rightsHolder: 'shirowita',
    developer: 'shirowita',
    publisher: 'shirowita',
    steamAppId: 4560660,
    summary: {
      zh: '非官方存档编辑：可改金钱/声望/典籍、已有佣兵与物品。请先退出游戏再保存。',
      en: 'Unofficial save editor: gold / renown / codex, existing fighters and items. Quit the game before saving.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: eslabongViews
}
