import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import type { DragonSwordState } from './parse'

export const MAX_CURRENCY_AMOUNT = 99_999_999

export function maxCurrency(state: DragonSwordState): void {
  for (const row of state.currencies) {
    row.amount = MAX_CURRENCY_AMOUNT
  }
}

export function actions(_state: DragonSwordState): ActionSpec[] {
  return [{ id: 'max-currency', labelKey: 'ds.actions.maxCurrency', kind: 'button' }]
}

export function applyAction(state: DragonSwordState, id: string): DragonSwordState {
  if (id === 'max-currency') {
    maxCurrency(state)
    return state
  }
  throw new ModuleError('UNKNOWN_ACTION', [id])
}
