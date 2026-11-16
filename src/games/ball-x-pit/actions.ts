import type { ActionSpec } from '@sdk/types'
import type { BallXPitState } from './parse'

export function actions(_state: BallXPitState): ActionSpec[] {
  return []
}

export function applyAction(state: BallXPitState, _id: string): BallXPitState {
  return state
}
