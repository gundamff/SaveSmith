import { describe, expect, it } from 'vitest'
import { pbzCodexEnemies } from '../../src/games/phantom-blade-zero/catalog/codexEnemies'
import {
  getPbzCodexMap,
  listPbzCodexMapsUsedByEnemies,
  normalizePbzCodexMapId,
  pbzCodexMapName
} from '../../src/games/phantom-blade-zero/catalog/codexMaps'

describe('pbz codex maps catalog', () => {
  it('resolves OwnMapID case-insensitively to Chinese chapter names', () => {
    expect(pbzCodexMapName('XiGu', 'zh')).toBe('悲泣溪谷')
    expect(pbzCodexMapName('xigu', 'zh')).toBe('悲泣溪谷')
    expect(pbzCodexMapName('ZhuLinGuWu', 'zh')).toBe('序章')
    expect(pbzCodexMapName('zhulinguwu', 'zh')).toBe('序章')
    expect(normalizePbzCodexMapId('ZhuLinGuwu')).toBe('ZhuLinGuWu')
  })

  it('ships English labels for EN UI without inventing enemy names', () => {
    expect(pbzCodexMapName('XiGu', 'en')).toBe('Weeping Creek Valley')
    expect(pbzCodexMapName('FuJiZhiLin', 'en')).toBe('Crimson Forest')
    expect(getPbzCodexMap('MissingMap')).toBeUndefined()
    expect(pbzCodexMapName('MissingMap', 'zh')).toBe('MissingMap')
  })

  it('covers every OwnMapID used by the enemy catalog', () => {
    const used = new Set(pbzCodexEnemies.map((row) => row.ownMapId.toLowerCase()))
    const listed = listPbzCodexMapsUsedByEnemies(pbzCodexEnemies.map((row) => row.ownMapId))
    expect(listed.length).toBe(used.size)
    for (const mapId of used) {
      expect(getPbzCodexMap(mapId)).toBeDefined()
    }
  })
})
