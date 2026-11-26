/**
 * Re2 I Rise Alone (重生2我独自逆袭) GameModule.
 * Cover: temporary placeholder (not game artwork); replace with Steam library hero (App 3816120) when available. © Proudmate Entertainment.
 */
import type { GameModule } from '@sdk/types'
import { actions, applyAction } from './actions'
import { locate } from './locate'
import { parse, serialize, validate, type Re2IraState } from './parse'
import { listSlots } from './slots'
import { re2IraViews } from './views'

export type { Re2IraState }

const coverUrl = new URL('./cover.jpg', import.meta.url).href

export const re2IRiseAloneModule: GameModule<Re2IraState> = {
  id: 're2-i-rise-alone',
  catalog: {
    name: { zh: '重生2我独自逆袭', en: 'Re2 I Rise Alone' },
    cover: coverUrl,
    rightsHolder: 'Proudmate Entertainment',
    developer: 'Proudmate Entertainment',
    publisher: 'Proudmate Entertainment',
    steamAppId: 3816120,
    summary: {
      zh: '非官方存档修改器：7 项角色属性（金钱/体力/魅力/智慧/行动力/道德/压力）可编辑。请先退出游戏再改档；Steam Cloud 可能回滚。',
      en: 'Unofficial save editor: edit 7 character stats (money, stamina, charm, wisdom, execution, morality, pressure). Quit the game first; Steam Cloud may roll back edits.'
    }
  },
  locate,
  listSlots,
  parse,
  serialize,
  validate,
  actions,
  applyAction,
  views: re2IraViews
}