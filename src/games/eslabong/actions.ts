import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import { clearInjury, maxProgress } from './model/fighters'
import { MAX_EXP, MAX_LEVEL } from './model/fields'
import type { EslabongState } from './parse'

export function actions(_state: EslabongState): ActionSpec[] {
  return [
    { id: 'max-progress', labelKey: 'es.actions.maxProgress', kind: 'button' },
    { id: 'clear-injuries', labelKey: 'es.actions.clearInjuries', kind: 'button' }
  ]
}

export function applyAction(state: EslabongState, id: string): EslabongState {
  switch (id) {
    case 'max-progress':
      for (const row of state.fighters) {
        maxProgress(row, { maxLevel: MAX_LEVEL, maxExp: MAX_EXP })
      }
      break
    case 'clear-injuries':
      for (const row of state.fighters) {
        clearInjury(row)
      }
      break
    default:
      throw new ModuleError('UNKNOWN_ACTION', [id])
  }
  return state
}
