import type { ActionSpec } from '@sdk/types'
import type { Re2IraState } from './parse'

export function actions(_state: Re2IraState): ActionSpec[] {
  return []
}

export function applyAction(state: Re2IraState, _id: string): Re2IraState {
  return state
}