import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ConfigSnapshot } from '../../src/games/chaos-galaxy-2/model/configModel'
import { gameData } from '../../src/games/chaos-galaxy-2/model/gameData'
import { SaveData } from '../../src/games/chaos-galaxy-2/model/saveModel'
import { parse, serialize, validate } from '../../src/games/chaos-galaxy-2/parse'

/**
 * 真实存档 E2E（环境变量门控，任何机器/CI 不设 CG2_SAVE 即整体跳过）：
 *   CG2_SAVE        总开关；未设置时本文件全部 skip
 *   CG2_E2E_SAVE    指向 savedata1.cg2 的临时副本（仓库外，如 %TEMP%\cg2_e2e\savedata1.cg2）
 *   CG2_E2E_CONFIG  指向 config.cg2 的临时副本（可选）
 * 真实存档绝不入库。
 */

const envPath = (name: string): string | null => {
  const v = process.env[name]
  if (!v) return null
  try {
    return statSync(v).isFile() ? v : null
  } catch {
    return null
  }
}

const savePath = envPath('CG2_E2E_SAVE')
const configPath = envPath('CG2_E2E_CONFIG')
const haveSave = savePath !== null && existsSync(savePath)
const haveConfig = configPath !== null && existsSync(configPath)

function readBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path))
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a).equals(Buffer.from(b))
}

describe.skipIf(!process.env.CG2_SAVE)('chaos-galaxy-2 real save e2e', () => {
  describe.skipIf(!haveSave)('E2E 真实存档 savedata1.cg2（CG2_E2E_SAVE）', () => {
    it('parse → serialize 与原档字节一致', () => {
      if (!savePath) throw new Error('CG2_E2E_SAVE 未设置')
      const bytes = readBytes(savePath)
      const files = [{ relativePath: 'savedata1.cg2', bytes }]
      const state = parse(files)
      const out = serialize(state)
      expect(out).toHaveLength(1)
      expect(out[0]!.relativePath).toBe('savedata1.cg2')
      expect(bytesEqual(out[0]!.bytes, bytes)).toBe(true)
      console.log(
        `[e2e] 往返 savedata1.cg2: ${bytes.length} bytes playFaction=${state.campaign.getPlayFaction()} ` +
          `commanders=${state.campaign.listCommanderIds().length}`
      )
    })

    it('setFactionGold(+1) 后仍可解析', () => {
      if (!savePath) throw new Error('CG2_E2E_SAVE 未设置')
      const bytes = readBytes(savePath)
      const state = parse([{ relativePath: 'savedata1.cg2', bytes }])
      const faction = state.campaign.getPlayFaction()
      const gold = state.campaign.getFactionGold(faction)
      state.campaign.setFactionGold(faction, gold + 1)
      const out = serialize(state)
      const again = parse(out.map((f) => ({ relativePath: f.relativePath, bytes: f.bytes })))
      expect(again.campaign.getPlayFaction()).toBe(faction)
      expect(again.campaign.getFactionGold(faction)).toBe(gold + 1)
      expect(() => SaveData.load(out[0]!.bytes)).not.toThrow()
      console.log(`[e2e] Faction${faction}Gold ${gold} -> ${gold + 1}`)
    })

    it('指挥官经验钳制到 commanderMaxExp', () => {
      if (!savePath) throw new Error('CG2_E2E_SAVE 未设置')
      const bytes = readBytes(savePath)
      const state = parse([{ relativePath: 'savedata1.cg2', bytes }])
      const ids = state.campaign.listCommanderIds()
      expect(ids.length).toBeGreaterThan(0)
      const id = ids[0]!
      state.campaign.setCommander(id, { exp: gameData.commanderMaxExp + 1000 })
      validate(state)
      expect(state.campaign.getCommander(id).exp).toBeLessThanOrEqual(gameData.commanderMaxExp)
      console.log(
        `[e2e] Commander${id}Exp clamped <= ${gameData.commanderMaxExp} ` +
          `(got ${state.campaign.getCommander(id).exp})`
      )
    })
  })

  describe.skipIf(!haveConfig)('E2E 真实图鉴 config.cg2（CG2_E2E_CONFIG）', () => {
    it('parse → serialize 与原档字节一致', () => {
      if (!configPath) throw new Error('CG2_E2E_CONFIG 未设置')
      const bytes = readBytes(configPath)
      const config = ConfigSnapshot.load(bytes)
      expect(bytesEqual(config.serialize(), bytes)).toBe(true)
      const bits = config.getCollection('CommanderCollections')
      expect(bits.length).toBeGreaterThan(0)
      console.log(
        `[e2e] 往返 config.cg2: ${bytes.length} bytes CommanderCollections=${bits.length}`
      )
    })
  })
})
