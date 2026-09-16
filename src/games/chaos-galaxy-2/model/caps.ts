import { getEntry } from './es3-binary'
import type { GameData } from './gameData'
import type { CommanderRow, SaveData } from './saveModel'

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampCommander(row: CommanderRow, gd: GameData): CommanderRow {
  return {
    id: row.id,
    exp: clampInt(row.exp, 0, gd.commanderMaxExp),
    admin: clampInt(row.admin, 0, gd.commanderMaxStat),
    military: clampInt(row.military, 0, gd.commanderMaxStat),
    intellect: clampInt(row.intellect, 0, gd.commanderMaxStat),
    breeding: clampInt(row.breeding, 0, gd.commanderMaxStat),
    star: clampInt(row.star, 0, gd.commanderMaxStar),
    skills: [...row.skills]
  }
}

export function clampFactionResources(save: SaveData, faction: number, gd: GameData): void {
  if (getEntry(save.entries, `Faction${faction}Gold`)) {
    save.setFactionGold(faction, clampInt(save.getFactionGold(faction), 0, gd.resourceMaxGold))
  }
  if (getEntry(save.entries, `Faction${faction}Supply`)) {
    save.setFactionSupply(faction, clampInt(save.getFactionSupply(faction), 0, gd.resourceMaxSupply))
  }
  if (getEntry(save.entries, `Faction${faction}Prestige`)) {
    save.setFactionPrestige(
      faction,
      clampInt(save.getFactionPrestige(faction), 0, gd.resourceMaxPrestige)
    )
  }
}

export function applyCampaignCaps(save: SaveData, gd: GameData): void {
  for (const id of save.listCommanderIds()) {
    const next = clampCommander(save.getCommander(id), gd)
    const patch: Partial<CommanderRow> = { exp: next.exp }
    if (getEntry(save.entries, `Commander${id}Admin`)) patch.admin = next.admin
    if (getEntry(save.entries, `Commander${id}Military`)) patch.military = next.military
    if (getEntry(save.entries, `Commander${id}Intellect`)) patch.intellect = next.intellect
    if (getEntry(save.entries, `Commander${id}Breeding`)) patch.breeding = next.breeding
    if (getEntry(save.entries, `Commander${id}Star`)) patch.star = next.star
    save.setCommander(id, patch)
  }

  for (const id of save.listPlanetIds()) {
    const planet = save.getPlanet(id)
    if (getEntry(save.entries, `Planet${id}Defense`)) {
      save.setPlanetField(id, 'defense', clampInt(planet.defense, 0, gd.planetMaxDefense))
    }
    if (getEntry(save.entries, `Planet${id}HQlevel`)) {
      save.setPlanetField(id, 'hqLevel', clampInt(planet.hqLevel, 0, gd.planetMaxHqLevel))
    }
  }

  const factions = new Set<number>()
  for (const entry of save.entries) {
    const match = /^Faction(\d+)Gold$/.exec(entry.key)
    if (match) factions.add(Number(match[1]))
  }
  for (const faction of factions) {
    clampFactionResources(save, faction, gd)
  }
}
