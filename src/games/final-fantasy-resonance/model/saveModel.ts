import {
  getInt,
  parseGvasIndex,
  setBool,
  setInt,
  type GvasIndex
} from './gvasIndex'
import type {
  FinalFantasyResonanceState,
  FfrInventoryItem,
  FfrMapEntry,
  FfrUnit,
  FfrVision
} from './types'

function countPrefix(index: GvasIndex, prefix: string, field: string): number {
  let n = 0
  while (index.fields.has(`${prefix}[${n}].${field}`)) n++
  return n
}

function projectInventory(index: GvasIndex, plain: Uint8Array): FfrInventoryItem[] {
  const n = countPrefix(index, 'inventory', 'ItemId')
  const out: FfrInventoryItem[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      itemId: getInt(index, plain, `inventory[${i}].ItemId`),
      num: getInt(index, plain, `inventory[${i}].Num`)
    })
  }
  return out
}

function projectUnits(index: GvasIndex, plain: Uint8Array): FfrUnit[] {
  const n = countPrefix(index, 'unitParameterList', 'UnitId')
  const out: FfrUnit[] = []
  for (let i = 0; i < n; i++) {
    const p = `unitParameterList[${i}]`
    out.push({
      index: i,
      unitId: getInt(index, plain, `${p}.UnitId`),
      experience: getInt(index, plain, `${p}.Experience`),
      hitPoint: getInt(index, plain, `${p}.HitPoint`),
      magicPoint: getInt(index, plain, `${p}.MagicPoint`),
      equipWeaponId: getInt(index, plain, `${p}.EquipWeaponId`),
      equipArmorId: getInt(index, plain, `${p}.EquipArmorId`),
      equipVisionId: getInt(index, plain, `${p}.equipVisionId`)
    })
  }
  return out
}

function projectVisions(index: GvasIndex, plain: Uint8Array): FfrVision[] {
  const n = countPrefix(index, 'visionList', 'ID')
  const out: FfrVision[] = []
  for (let i = 0; i < n; i++) {
    const synchro: Array<{ key: number; value: number }> = []
    for (let j = 0; index.fields.has(`visionList[${i}].synchroPoints{${j}}.key`); j++) {
      synchro.push({
        key: getInt(index, plain, `visionList[${i}].synchroPoints{${j}}.key`),
        value: getInt(index, plain, `visionList[${i}].synchroPoints{${j}}.value`)
      })
    }
    out.push({
      index: i,
      id: getInt(index, plain, `visionList[${i}].ID`),
      awakeningPoint: getInt(index, plain, `visionList[${i}].awakeningPoint`),
      synchro
    })
  }
  return out
}

function projectMaps(index: GvasIndex, plain: Uint8Array): FfrMapEntry[] {
  const out: FfrMapEntry[] = []
  for (let i = 0; index.fields.has(`Map.perMapSaveDataMap{${i}}.key`); i++) {
    const known = index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsKnown`) ?? false
    const visited = index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsVisited`) ?? false
    const cleared = index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsCleared`) ?? false
    out.push({
      index: i,
      mapId: getInt(index, plain, `Map.perMapSaveDataMap{${i}}.key`),
      known,
      visited,
      cleared
    })
  }
  return out
}

export function projectState(relativePath: string, header: Uint8Array, plain: Uint8Array): FinalFantasyResonanceState {
  const index = parseGvasIndex(plain)
  return {
    relativePath,
    header,
    plain,
    index,
    currentMoney: getInt(index, plain, 'Player.currentMoney'),
    playTime: getInt(index, plain, 'Player.PlayTime'),
    winNum: getInt(index, plain, 'Player.WinNum'),
    inventory: projectInventory(index, plain),
    units: projectUnits(index, plain),
    visions: projectVisions(index, plain),
    maps: projectMaps(index, plain)
  }
}

/** Re-project lists after plain/index mutation. */
export function refreshProjection(state: FinalFantasyResonanceState): void {
  const { index, plain } = state
  state.currentMoney = getInt(index, plain, 'Player.currentMoney')
  state.playTime = getInt(index, plain, 'Player.PlayTime')
  state.winNum = getInt(index, plain, 'Player.WinNum')
  state.inventory = projectInventory(index, plain)
  state.units = projectUnits(index, plain)
  state.visions = projectVisions(index, plain)
  state.maps = projectMaps(index, plain)
}

export function setCurrentMoney(state: FinalFantasyResonanceState, value: number): void {
  setInt(state.plain, state.index, 'Player.currentMoney', Math.max(0, Math.trunc(value)))
  state.currentMoney = Math.max(0, Math.trunc(value))
}

export function setInventoryNum(state: FinalFantasyResonanceState, row: number, num: number): void {
  const n = Math.max(0, Math.min(99, Math.trunc(num)))
  setInt(state.plain, state.index, `inventory[${row}].Num`, n)
  if (state.inventory[row]) state.inventory[row]!.num = n
}

export function setUnitField(
  state: FinalFantasyResonanceState,
  unitIndex: number,
  field: 'Experience' | 'HitPoint' | 'MagicPoint' | 'EquipWeaponId' | 'EquipArmorId' | 'equipVisionId',
  value: number
): void {
  const path = `unitParameterList[${unitIndex}].${field}`
  setInt(state.plain, state.index, path, Math.trunc(value))
  const u = state.units.find((x) => x.index === unitIndex)
  if (!u) return
  if (field === 'Experience') u.experience = Math.trunc(value)
  if (field === 'HitPoint') u.hitPoint = Math.trunc(value)
  if (field === 'MagicPoint') u.magicPoint = Math.trunc(value)
  if (field === 'EquipWeaponId') u.equipWeaponId = Math.trunc(value)
  if (field === 'EquipArmorId') u.equipArmorId = Math.trunc(value)
  if (field === 'equipVisionId') u.equipVisionId = Math.trunc(value)
}

export function setVisionAwakening(state: FinalFantasyResonanceState, visionIndex: number, value: number): void {
  const v = Math.max(0, Math.min(4, Math.trunc(value)))
  setInt(state.plain, state.index, `visionList[${visionIndex}].awakeningPoint`, v)
  const row = state.visions.find((x) => x.index === visionIndex)
  if (row) row.awakeningPoint = v
}

export function setVisionSynchro(
  state: FinalFantasyResonanceState,
  visionIndex: number,
  synchroIndex: number,
  value: number
): void {
  const v = Math.max(0, Math.trunc(value))
  setInt(state.plain, state.index, `visionList[${visionIndex}].synchroPoints{${synchroIndex}}.value`, v)
  const row = state.visions.find((x) => x.index === visionIndex)
  if (row?.synchro[synchroIndex]) row.synchro[synchroIndex]!.value = v
}

export function setMapFlag(
  state: FinalFantasyResonanceState,
  mapIndex: number,
  flag: 'bIsKnown' | 'bIsVisited' | 'bIsCleared',
  value: boolean
): void {
  const path = `Map.perMapSaveDataMap{${mapIndex}}.value.${flag}`
  const ref = state.index.boolRefs.get(path)
  if (!ref) return
  setBool(state.plain, ref, value)
  state.index.bools.set(path, value)
  const m = state.maps.find((x) => x.index === mapIndex)
  if (!m) return
  if (flag === 'bIsKnown') m.known = value
  if (flag === 'bIsVisited') m.visited = value
  if (flag === 'bIsCleared') m.cleared = value
}
