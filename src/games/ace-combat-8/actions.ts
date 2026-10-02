import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import { applyPostCampaignUnlocks, applyPseudoNewGamePlus } from './model/campaignSave'
import { refreshView, type AceCombat8State } from './parse'

export function actions(_state: AceCombat8State): ActionSpec[] {
  return [
    { id: 'post-campaign-unlocks', labelKey: 'ac8.actions.postCampaignUnlocks', kind: 'button' },
    { id: 'pseudo-ng-plus', labelKey: 'ac8.actions.pseudoNgPlus', kind: 'button' }
  ]
}

export function applyAction(state: AceCombat8State, id: string): AceCombat8State {
  switch (id) {
    case 'post-campaign-unlocks':
      applyPostCampaignUnlocks(state.patch)
      break
    case 'pseudo-ng-plus':
      applyPseudoNewGamePlus(state.patch)
      break
    default:
      throw new ModuleError('UNKNOWN_ACTION', [id])
  }
  return refreshView(state)
}
