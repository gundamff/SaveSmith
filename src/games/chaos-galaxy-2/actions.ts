import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import { gameData } from './model/gameData'
import type { ChaosGalaxy2State } from './model/types'
import type { SaveData } from './model/saveModel'

export function fillResources(save: SaveData): void {
  const faction = save.getPlayFaction()
  save.setFactionGold(faction, gameData.resourceMaxGold)
  save.setFactionSupply(faction, gameData.resourceMaxSupply)
  save.setFactionPrestige(faction, gameData.resourceMaxPrestige)
}

export function actions(state: ChaosGalaxy2State): ActionSpec[] {
  return [
    { id: 'fill-resources', labelKey: 'cg2.actions.fillResources', kind: 'button' },
    { id: 'max-commanders', labelKey: 'cg2.actions.maxCommanders', kind: 'button' },
    { id: 'unlock-all', labelKey: 'cg2.actions.unlockAll', kind: 'button' },
    {
      id: 'max-collection',
      labelKey: 'cg2.actions.maxCollection',
      kind: 'button',
      disabled: state.config === null
    }
  ]
}

export function applyAction(state: ChaosGalaxy2State, id: string): ChaosGalaxy2State {
  switch (id) {
    case 'fill-resources':
      fillResources(state.campaign)
      break
    case 'max-commanders':
      for (const commanderId of state.campaign.listCommanderIds()) {
        state.campaign.setCommander(commanderId, {
          exp: gameData.commanderMaxExp,
          admin: gameData.commanderMaxStat,
          military: gameData.commanderMaxStat,
          intellect: gameData.commanderMaxStat,
          breeding: gameData.commanderMaxStat,
          star: gameData.commanderMaxStar
        })
      }
      break
    case 'unlock-all':
      state.campaign.unlockAllKnown(state.campaign.getPlayFaction())
      break
    case 'max-collection':
      state.config?.maxAllCollections()
      break
    default:
      throw new ModuleError('UNKNOWN_ACTION', [id])
  }
  return state
}
