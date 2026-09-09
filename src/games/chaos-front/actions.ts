import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import { gameData } from './model/gameData'
import { maxCollection, type SaveData } from './model/saveModel'
import type { ChaosFrontState } from './parse'

/** Caps copied verbatim from chaos-front-save-editor ResourcesTab.maxResources. */
export function fillResources(save: SaveData): void {
  save.setCredit(99_999_999)
  save.setPrestige(99_999)
  save.setStar(6)
}

export function actions(state: ChaosFrontState): ActionSpec[] {
  return [
    { id: 'fill-resources', labelKey: 'cf.actions.fillResources', kind: 'button' },
    { id: 'max-units', labelKey: 'cf.actions.maxUnits', kind: 'button' },
    { id: 'max-pilots', labelKey: 'cf.actions.maxPilots', kind: 'button' },
    { id: 'unlock-all', labelKey: 'cf.actions.unlockAll', kind: 'button' },
    {
      id: 'max-collection',
      labelKey: 'cf.actions.maxCollection',
      kind: 'button',
      disabled: state.collection === null
    }
  ]
}

export function applyAction(state: ChaosFrontState, id: string): ChaosFrontState {
  switch (id) {
    case 'fill-resources':
      fillResources(state.campaign)
      break
    case 'max-units':
      state.campaign.maxAllUnits(gameData)
      break
    case 'max-pilots':
      state.campaign.maxAllPilots()
      break
    case 'unlock-all':
      state.campaign.unlockAllUnitTypes()
      state.campaign.unlockAllItems(gameData)
      break
    case 'max-collection':
      if (state.collection) maxCollection(state.collection)
      break
    default:
      throw new ModuleError('UNKNOWN_ACTION', [id])
  }
  return state
}
