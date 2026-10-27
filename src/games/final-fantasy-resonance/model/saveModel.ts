import {
  getInt,
  parseGvasIndex,
  setBool,
  setInt,
  type GvasIndex
} from './gvasIndex'
import type {
  FinalFantasyResonanceState,
  FfrArtifact,
  FfrBestiaryEntry,
  FfrColosseum,
  FfrInventoryItem,
  FfrMapEntry,
  FfrQuestBoard,
  FfrRequest,
  FfrShopRow,
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

function projectMaps(index: GvasIndex, _plain: Uint8Array): FfrMapEntry[] {
  const out: FfrMapEntry[] = []
  for (let i = 0; index.fields.has(`Map.perMapSaveDataMap{${i}}.key`); i++) {
    out.push({
      index: i,
      mapId: getInt(index, _plain, `Map.perMapSaveDataMap{${i}}.key`),
      known: index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsKnown`) ?? false,
      visited: index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsVisited`) ?? false,
      cleared: index.bools.get(`Map.perMapSaveDataMap{${i}}.value.bIsCleared`) ?? false
    })
  }
  return out
}

function projectBestiary(index: GvasIndex, plain: Uint8Array): FfrBestiaryEntry[] {
  const n = countPrefix(index, 'unitList', 'SaveId')
  const out: FfrBestiaryEntry[] = []
  for (let i = 0; i < n; i++) {
    const elements: FfrBestiaryEntry['elements'] = []
    for (let j = 0; index.strings.has(`unitList[${i}].analyzedElments{${j}}.key`); j++) {
      elements.push({
        index: j,
        key: index.strings.get(`unitList[${i}].analyzedElments{${j}}.key`) ?? '',
        value: index.bools.get(`unitList[${i}].analyzedElments{${j}}.value`) ?? false
      })
    }
    out.push({
      index: i,
      saveId: getInt(index, plain, `unitList[${i}].SaveId`),
      defeatNum: getInt(index, plain, `unitList[${i}].defeatNum`),
      isAnalyzed: index.bools.get(`unitList[${i}].IsAnalyzed`) ?? false,
      elements
    })
  }
  return out
}

function projectQuests(index: GvasIndex, plain: Uint8Array): FfrQuestBoard[] {
  const n = countPrefix(index, 'questBoardList', 'QuestId')
  const out: FfrQuestBoard[] = []
  for (let i = 0; i < n; i++) {
    const deliveries: FfrQuestBoard['deliveries'] = []
    for (let j = 0; index.fields.has(`questBoardList[${i}].KilledCount[${j}].ID`); j++) {
      deliveries.push({
        index: j,
        id: getInt(index, plain, `questBoardList[${i}].KilledCount[${j}].ID`),
        quantity: getInt(index, plain, `questBoardList[${i}].KilledCount[${j}].DeliveryQuantity`)
      })
    }
    out.push({
      index: i,
      questId: getInt(index, plain, `questBoardList[${i}].QuestId`),
      requestId: getInt(index, plain, `questBoardList[${i}].requetId`),
      deliveries
    })
  }
  return out
}

function projectRequests(index: GvasIndex, plain: Uint8Array): FfrRequest[] {
  const out: FfrRequest[] = []
  for (let i = 0; index.fields.has(`request.DataMap{${i}}.key`); i++) {
    out.push({
      index: i,
      id: getInt(index, plain, `request.DataMap{${i}}.key`),
      progressIndex: getInt(index, plain, `request.DataMap{${i}}.value.ProgressIndex`)
    })
  }
  return out
}

function projectColosseum(index: GvasIndex, plain: Uint8Array): FfrColosseum[] {
  const out: FfrColosseum[] = []
  for (let i = 0; index.fields.has(`colosseumProgress.RankBattle{${i}}.value.ID`); i++) {
    out.push({
      index: i,
      id: getInt(index, plain, `colosseumProgress.RankBattle{${i}}.value.ID`),
      clearCount: getInt(index, plain, `colosseumProgress.RankBattle{${i}}.value.ClearCount`)
    })
  }
  return out
}

function projectShops(index: GvasIndex, plain: Uint8Array): FfrShopRow[] {
  const n = countPrefix(index, 'shop', 'ItemId')
  const out: FfrShopRow[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      index: i,
      itemId: getInt(index, plain, `shop[${i}].ItemId`),
      shopId: getInt(index, plain, `shop[${i}].ShopID`),
      maxOrderNum: getInt(index, plain, `shop[${i}].MaxOrderNum`),
      currentBuyNum: getInt(index, plain, `shop[${i}].CurrentBuyNum`)
    })
  }
  return out
}

function projectArtifacts(index: GvasIndex, plain: Uint8Array): FfrArtifact[] {
  const out: FfrArtifact[] = []
  if (!index.maps.has('artifactList')) return out
  for (let i = 0; index.fields.has(`artifactList{${i}}.key`); i++) {
    out.push({
      index: i,
      itemId: getInt(index, plain, `artifactList{${i}}.key`),
      active: index.bools.get(`artifactList{${i}}.value.IsActive`) ?? false
    })
  }
  return out
}

export function projectState(relativePath: string, header: Uint8Array, plain: Uint8Array): FinalFantasyResonanceState {
  const index = parseGvasIndex(plain)
  let progressFlagCount = 0
  while (index.fields.has(`Progress.Progress[${progressFlagCount}]`)) progressFlagCount++
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
    maps: projectMaps(index, plain),
    bestiary: projectBestiary(index, plain),
    quests: projectQuests(index, plain),
    requests: projectRequests(index, plain),
    colosseum: projectColosseum(index, plain),
    shops: projectShops(index, plain),
    artifacts: projectArtifacts(index, plain),
    progressFlagCount,
    hasArtifactList: index.maps.has('artifactList')
  }
}

export function refreshProjection(state: FinalFantasyResonanceState): void {
  const next = projectState(state.relativePath, state.header, state.plain)
  Object.assign(state, next)
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

export function setBestiaryDefeat(state: FinalFantasyResonanceState, index: number, defeatNum: number): void {
  const n = Math.max(0, Math.trunc(defeatNum))
  setInt(state.plain, state.index, `unitList[${index}].defeatNum`, n)
  const row = state.bestiary.find((x) => x.index === index)
  if (row) row.defeatNum = n
}

export function setBestiaryAnalyzed(state: FinalFantasyResonanceState, index: number, value: boolean): void {
  const path = `unitList[${index}].IsAnalyzed`
  const ref = state.index.boolRefs.get(path)
  if (!ref) return
  setBool(state.plain, ref, value)
  state.index.bools.set(path, value)
  const row = state.bestiary.find((x) => x.index === index)
  if (row) row.isAnalyzed = value
}

/** Mark Libra-analyzed and set every analyzedElments value true. */
export function libraScanEnemy(state: FinalFantasyResonanceState, index: number): void {
  setBestiaryAnalyzed(state, index, true)
  const row = state.bestiary.find((x) => x.index === index)
  if (!row) return
  for (const el of row.elements) {
    const path = `unitList[${index}].analyzedElments{${el.index}}.value`
    const ref = state.index.boolRefs.get(path)
    if (!ref) continue
    setBool(state.plain, ref, true)
    state.index.bools.set(path, true)
    el.value = true
  }
}

export function libraScanAll(state: FinalFantasyResonanceState): void {
  for (const row of state.bestiary) libraScanEnemy(state, row.index)
}

export function setQuestDeliveryQty(
  state: FinalFantasyResonanceState,
  questIndex: number,
  deliveryIndex: number,
  quantity: number
): void {
  const n = Math.max(0, Math.trunc(quantity))
  setInt(state.plain, state.index, `questBoardList[${questIndex}].KilledCount[${deliveryIndex}].DeliveryQuantity`, n)
  const q = state.quests.find((x) => x.index === questIndex)
  const d = q?.deliveries.find((x) => x.index === deliveryIndex)
  if (d) d.quantity = n
}

export function setRequestProgress(state: FinalFantasyResonanceState, index: number, progressIndex: number): void {
  setInt(state.plain, state.index, `request.DataMap{${index}}.value.ProgressIndex`, Math.trunc(progressIndex))
  const row = state.requests.find((x) => x.index === index)
  if (row) row.progressIndex = Math.trunc(progressIndex)
}

export function setColosseumClear(state: FinalFantasyResonanceState, index: number, clearCount: number): void {
  const n = Math.max(0, Math.trunc(clearCount))
  setInt(state.plain, state.index, `colosseumProgress.RankBattle{${index}}.value.ClearCount`, n)
  const row = state.colosseum.find((x) => x.index === index)
  if (row) row.clearCount = n
}

export function setShopBuyNum(state: FinalFantasyResonanceState, index: number, currentBuyNum: number): void {
  const n = Math.max(0, Math.trunc(currentBuyNum))
  setInt(state.plain, state.index, `shop[${index}].CurrentBuyNum`, n)
  const row = state.shops.find((x) => x.index === index)
  if (row) row.currentBuyNum = n
}

export function restockAllShops(state: FinalFantasyResonanceState): void {
  for (const row of state.shops) setShopBuyNum(state, row.index, 0)
}

export function resetAllTreasureChests(state: FinalFantasyResonanceState): void {
  for (const [path, ref] of state.index.boolRefs) {
    if (!path.includes('treasureBoxList') || !path.endsWith('.IsOpen')) continue
    setBool(state.plain, ref, false)
    state.index.bools.set(path, false)
  }
}

export function setArtifactActive(state: FinalFantasyResonanceState, index: number, active: boolean): void {
  const path = `artifactList{${index}}.value.IsActive`
  const ref = state.index.boolRefs.get(path)
  if (!ref) return
  setBool(state.plain, ref, active)
  state.index.bools.set(path, active)
  const row = state.artifacts.find((x) => x.index === index)
  if (row) row.active = active
}
