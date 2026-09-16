import { ModuleError } from '@sdk/error'
import type { ActionSpec } from '@sdk/types'
import { getEntry } from './model/es3-binary'
import { gameData } from './model/gameData'
import type { CommanderRow, SaveData } from './model/saveModel'
import type { ChaosGalaxy2State } from './model/types'

export function fillResources(save: SaveData): void {
  const faction = save.getPlayFaction()
  if (getEntry(save.entries, `Faction${faction}Gold`)) {
    save.setFactionGold(faction, gameData.resourceMaxGold)
  }
  if (getEntry(save.entries, `Faction${faction}Supply`)) {
    save.setFactionSupply(faction, gameData.resourceMaxSupply)
  }
  if (getEntry(save.entries, `Faction${faction}Prestige`)) {
    save.setFactionPrestige(faction, gameData.resourceMaxPrestige)
  }
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
        const patch: Partial<CommanderRow> = { exp: gameData.commanderMaxExp }
        if (getEntry(state.campaign.entries, `Commander${commanderId}Admin`)) {
          patch.admin = gameData.commanderMaxStat
        }
        if (getEntry(state.campaign.entries, `Commander${commanderId}Military`)) {
          patch.military = gameData.commanderMaxStat
        }
        if (getEntry(state.campaign.entries, `Commander${commanderId}Intellect`)) {
          patch.intellect = gameData.commanderMaxStat
        }
        if (getEntry(state.campaign.entries, `Commander${commanderId}Breeding`)) {
          patch.breeding = gameData.commanderMaxStat
        }
        if (getEntry(state.campaign.entries, `Commander${commanderId}Star`)) {
          patch.star = gameData.commanderMaxStar
        }
        state.campaign.setCommander(commanderId, patch)
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
