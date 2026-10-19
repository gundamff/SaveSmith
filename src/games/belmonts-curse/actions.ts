import type { ActionSpec } from '@sdk/types'
import type { BelmontsCurseState } from './parse'

export function actions(_state: BelmontsCurseState): ActionSpec[] {
  return []
}

export function applyAction(state: BelmontsCurseState, _id: string): BelmontsCurseState {
  return state
}
