# Belmont's Curse Module Implementation Plan（一期）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为存档酱新增 `belmonts-curse` 模块：定位 `BuildSave_*.sav`，明文 JSON 往返，一期可写角色标量 + 背包/能力/探索只读；不碰 `PLAYERPREFS.sav`。

**Architecture:** 独立 `GameModule`；`JSON.parse` 得根对象后投影白名单到 `player` 视图，其余键（含 `worldSaves` / `progressionBoardSave` / 未知 `playerSave` 字段）留在 `raw` 透传树上；`serialize` 把投影写回 `raw` 再 `JSON.stringify`。二期映射双写不在本计划「完成」定义内（文末仅列探路预备任务）。

**Tech Stack:** Vue 3、Element Plus、Vitest、TypeScript、现有 Tauri 宿主；无新依赖。

**Spec:** [2026-10-19-belmonts-curse-design.md](./2026-10-19-belmonts-curse-design.md)

## Global Constraints

- 模块不碰 `fs`、不直接 `invoke` Tauri
- `PLAYERPREFS.sav` 永不进入 `listSlots` / `sessionFiles`
- 未知 JSON 键 opaque 透传；禁止按已知 schema 重生整档
- 一期禁止新增背包/能力/探索实体；`featureFlags.addItem` / `addAbility` 恒 `false`
- 不提交玩家真档；真档 E2E 用 `BC_SAVE`（或同类）环境变量门控，无文件则 `skip`
- i18n 键前缀：`bc.`
- 往返允许空白/键序变化；成功标准为游戏可载入（HANDTEST），自动化以语义往返为准
- 安装目录扫描只做开发机脚本（Task 7）；不进便携运行时扫盘

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/belmonts-curse/model/types.ts` | `BelmontsCurseState`、标量字段类型 |
| `src/games/belmonts-curse/model/saveModel.ts` | 从 raw 投影 / 写回标量与只读列表视图 |
| `src/games/belmonts-curse/model/featureFlags.ts` | 二期门闩常量（一期全 false） |
| `src/games/belmonts-curse/parse.ts` | parse / serialize / validate |
| `src/games/belmonts-curse/locate.ts` | 路径 + `BuildSave_*.sav` 识别 |
| `src/games/belmonts-curse/slots.ts` | 槽位列表与摘要 |
| `src/games/belmonts-curse/actions.ts` | 一期可空或仅预留；标量走 Tab 直接 mutate |
| `src/games/belmonts-curse/catalog/items.json` | 名称表（可先空 `{}` + SOURCE 注释旁路 README） |
| `src/games/belmonts-curse/catalog/names.ts` | `lookupItemName(id, locale)` |
| `src/games/belmonts-curse/views/*` | Overview / Character / Inventory / Abilities / Exploration |
| `src/games/belmonts-curse/index.ts` | `belmontsCurseModule` |
| `src/games/belmonts-curse/cover.jpg` | 商店头图（文档声明版权） |
| `src/host/registry.ts` | 静态登记 |
| `src/host/i18n/zh.ts` / `en.ts` | `bc.*` |
| `tests/belmonts-curse/*.spec.ts` | 夹具往返 / slots / module |
| `scripts/bc-extract-names.mts` | 可选：从安装目录抽名称（Task 7） |
| `docs/games/belmonts-curse.md` / `.en.md` | 用户文档 |
| `README.md` / `README.en.md` / `CHANGELOG*.md` / `docs/HANDTEST.md` | 列表与手测 |

---

### Task 1: saveModel 投影 + 夹具往返测试

**Files:**
- Create: `src/games/belmonts-curse/model/types.ts`
- Create: `src/games/belmonts-curse/model/saveModel.ts`
- Create: `src/games/belmonts-curse/parse.ts`
- Create: `tests/belmonts-curse/fixtures/minimal-buildsave.json`
- Test: `tests/belmonts-curse/parse.spec.ts`

**Interfaces:**
- Produces: `BelmontsCurseState`, `parse`, `serialize`, `validate`, `setPlayerScalar`

- [ ] **Step 1: 写最小夹具 JSON**

`tests/belmonts-curse/fixtures/minimal-buildsave.json`：

```json
{
  "version": "1.1.3",
  "playerSave": {
    "id": "00000000-0000-0000-0000-000000000001",
    "saveDate": "2026-10-19 12:00:00",
    "playTimeInSeconds": 100.5,
    "level": 3,
    "experienceCurrent": 10,
    "healthUpgradeFragmentCount": 0,
    "manaUpgradeFragmentCount": 0,
    "atkBonusUpgradeCount": 0,
    "defBonusUpgradeCount": 0,
    "currentHealth": 80,
    "currentMana": 50,
    "currentHealChargesCount": 2,
    "currentTheHermitDeathDefianceCount": 1,
    "itemsInInventory": ["WeaponFistTier1", "BoomerangCross"],
    "equippedWeaponItem": "WeaponFistTier1",
    "equippedSpellItem": "BoomerangCross",
    "equippedSkin": "Skin_MC_Base",
    "equippedCharmItems": ["Charm_ChestRecover", "", ""],
    "vaniaMoves": ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    "progressionPersistentSave": ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
    "unknownFutureField": { "keep": true }
  },
  "worldSaves": {
    "m_keys": ["world-1"],
    "m_values": [
      {
        "currentCompletionItemCount": 2,
        "savableEntityStates": {
          "m_keys": ["11111111-1111-1111-1111-111111111111"],
          "m_values": [{ "activated": true }]
        }
      }
    ]
  },
  "progressionBoardSave": {
    "progressionBoardItemsStates": { "m_keys": ["p1"], "m_values": ["False"] }
  },
  "extraRootKey": 42
}
```

- [ ] **Step 2: 写失败测试（parse 尚未实现）**

```ts
// tests/belmonts-curse/parse.spec.ts
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { utf8Encode } from '../../src/sdk/session'
import { parse, serialize, validate } from '../../src/games/belmonts-curse/parse'
import { setPlayerScalar } from '../../src/games/belmonts-curse/model/saveModel'

const fix = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/minimal-buildsave.json')
const bytes = utf8Encode(readFileSync(fix, 'utf8'))

describe('belmonts-curse parse', () => {
  it('round-trips scalars and preserves opaque keys', () => {
    const state = parse([{ relativePath: 'BuildSave_0.sav', bytes }])
    expect(state.player.level).toBe(3)
    expect(state.player.itemsInInventory).toEqual(['WeaponFistTier1', 'BoomerangCross'])
    expect(state.exploration.entityCount).toBe(1)
    expect(state.exploration.completionItemCount).toBe(2)
    setPlayerScalar(state, 'experienceCurrent', 11)
    expect(validate(state)).toEqual([])
    const out = serialize(state)
    const again = parse(out)
    expect(again.player.experienceCurrent).toBe(11)
    expect(again.player.level).toBe(3)
    const root = JSON.parse(new TextDecoder().decode(out[0]!.bytes)) as Record<string, unknown>
    expect(root.extraRootKey).toBe(42)
    expect((root.playerSave as Record<string, unknown>).unknownFutureField).toEqual({ keep: true })
  })

  it('rejects negative level via validate', () => {
    const state = parse([{ relativePath: 'BuildSave_0.sav', bytes: new Uint8Array(bytes) }])
    setPlayerScalar(state, 'level', 0)
    expect(validate(state).some((i) => i.code === 'BC_LEVEL')).toBe(true)
  })
})
```

- [ ] **Step 3: Run test — expect FAIL（模块不存在）**

Run: `npx vitest run tests/belmonts-curse/parse.spec.ts`  
Expected: 无法解析 import / 失败

- [ ] **Step 4: 实现 types + saveModel + parse**

`types.ts` 核心形状：

```ts
export type PlayerScalarKey =
  | 'level'
  | 'experienceCurrent'
  | 'healthUpgradeFragmentCount'
  | 'manaUpgradeFragmentCount'
  | 'atkBonusUpgradeCount'
  | 'defBonusUpgradeCount'
  | 'currentHealth'
  | 'currentMana'
  | 'currentHealChargesCount'
  | 'currentTheHermitDeathDefianceCount'

export interface PlayerView {
  id: string
  saveDate: string
  playTimeInSeconds: number
  version: string
  level: number
  experienceCurrent: number
  healthUpgradeFragmentCount: number
  manaUpgradeFragmentCount: number
  atkBonusUpgradeCount: number
  defBonusUpgradeCount: number
  currentHealth: number
  currentMana: number
  currentHealChargesCount: number
  currentTheHermitDeathDefianceCount: number
  itemsInInventory: string[]
  equippedWeaponItem: string
  equippedSpellItem: string
  equippedSkin: string
  equippedCharmItems: string[]
  vaniaMoves: string[]
  progressionPersistentSave: string[]
  // Arcana 只读摘要：从 raw 安全读取数组长度/拷贝，缺省 []
  arcanaCompletedTasks: string[]
  arcanaUnlockedTalents: string[]
}

export interface ExplorationView {
  worldKeyCount: number
  completionItemCount: number
  entityCount: number
}

export interface BelmontsCurseState {
  relativePath: string
  /** 完整根对象；serialize 的唯一真相来源 */
  raw: Record<string, unknown>
  player: PlayerView
  exploration: ExplorationView
}
```

`saveModel.ts` 要求：

- `projectState(raw, relativePath): BelmontsCurseState` — 缺 `playerSave` 对象则 `throw new ModuleError('MISSING_FIELD', ['playerSave'])`
- `setPlayerScalar(state, key, value)` — 写 `state.player` 且同步 `state.raw.playerSave[key]`
- `refreshViews(state)` — 从 `raw` 重投影（可选，若 mutate 已双写可省略）
- 读数组用 `Array.isArray` 守卫；数字用 `Number(...)`，非法则 `NaN` 交给 validate

`parse.ts`：

```ts
import { ModuleError } from '@sdk/error'
import { utf8Decode, utf8Encode } from '@sdk/session'
import type { SerializedFile, SlotBytes, ValidationIssue } from '@sdk/types'
import { projectState, type BelmontsCurseState } from './model/saveModel'
// setPlayerScalar 从 saveModel 导出；parse.ts re-export State 类型供 views 使用

export function parse(files: SlotBytes[]): BelmontsCurseState {
  const file = files[0]
  if (!file) throw new ModuleError('MISSING_FIELD', ['BuildSave_*.sav'])
  let root: unknown
  try {
    root = JSON.parse(utf8Decode(file.bytes))
  } catch {
    throw new ModuleError('INVALID_JSON', [file.relativePath])
  }
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    throw new ModuleError('INVALID_JSON', [file.relativePath])
  }
  return projectState(root as Record<string, unknown>, file.relativePath)
}

export function serialize(state: BelmontsCurseState): SerializedFile[] {
  // 确保 player 投影已写回 raw（若 setPlayerScalar 已同步则可直接 stringify）
  const text = JSON.stringify(state.raw)
  return [{ relativePath: state.relativePath, bytes: utf8Encode(text) }]
}

export function validate(state: BelmontsCurseState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const p = state.player
  if (!Number.isFinite(p.level) || p.level < 1 || !Number.isInteger(p.level)) {
    issues.push({ code: 'BC_LEVEL', args: [p.level] })
  }
  const nonNegInt: Array<[string, number]> = [
    ['experienceCurrent', p.experienceCurrent],
    ['healthUpgradeFragmentCount', p.healthUpgradeFragmentCount],
    ['manaUpgradeFragmentCount', p.manaUpgradeFragmentCount],
    ['atkBonusUpgradeCount', p.atkBonusUpgradeCount],
    ['defBonusUpgradeCount', p.defBonusUpgradeCount],
    ['currentHealChargesCount', p.currentHealChargesCount],
    ['currentTheHermitDeathDefianceCount', p.currentTheHermitDeathDefianceCount]
  ]
  for (const [name, v] of nonNegInt) {
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      issues.push({ code: 'BC_SCALAR', args: [name, v] })
    }
  }
  for (const [name, v] of [
    ['currentHealth', p.currentHealth],
    ['currentMana', p.currentMana]
  ] as const) {
    if (!Number.isFinite(v) || v < 0) issues.push({ code: 'BC_SCALAR', args: [name, v] })
  }
  return issues
}
```

- [ ] **Step 5: Run test — expect PASS**

Run: `npx vitest run tests/belmonts-curse/parse.spec.ts`  
Expected: PASS

- [ ] **Step 6: Commit**（若用户要求提交；否则跳过）

```bash
git add src/games/belmonts-curse/model src/games/belmonts-curse/parse.ts tests/belmonts-curse
git commit -m "feat(belmonts-curse): JSON parse/serialize with scalar projection"
```

---

### Task 2: locate + slots

**Files:**
- Create: `src/games/belmonts-curse/locate.ts`
- Create: `src/games/belmonts-curse/slots.ts`
- Test: `tests/belmonts-curse/slots.spec.ts`

**Interfaces:**
- Produces: `locate: SaveLocator`, `listSlots(listed): SlotInfo[]`
- Consumes: `utf8Decode` + 轻量读 `playerSave.level` / `saveDate`（slots 内 try/catch，失败则无 subtitle）

- [ ] **Step 1: 失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { locate } from '../../src/games/belmonts-curse/locate'
import { listSlots } from '../../src/games/belmonts-curse/slots'
import { utf8Encode } from '../../src/sdk/session'

describe('belmonts-curse slots', () => {
  it('lists BuildSave_*.sav and ignores PLAYERPREFS.sav', () => {
    const listed = {
      dir: 'X',
      files: [
        { relativePath: 'BuildSave_0.sav', bytes: utf8Encode('{"version":"1.1.3","playerSave":{"level":9,"saveDate":"2026-10-17 11:45:00","playTimeInSeconds":10}}') },
        { relativePath: 'PLAYERPREFS.sav', bytes: utf8Encode('{"ints":[]}') },
        { relativePath: 'steam_autocloud.vdf', bytes: null }
      ]
    }
    const slots = listSlots(listed)
    expect(slots.map((s) => s.id)).toEqual(['build-0'])
    expect(slots[0]!.sessionFiles).toEqual(['BuildSave_0.sav'])
    expect(slots[0]!.subtitle).toMatch(/Lv\.?9|9/)
  })
})
```

- [ ] **Step 2: 实现 locate**

```ts
import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    "%USERPROFILE%\\AppData\\LocalLow\\KONAMI\\Castlevania Belmont's Curse"
  ],
  identifyAnyOf: ['BuildSave_0.sav'],
  identifyNameRegex: '^BuildSave_\\d+\\.sav$',
  slotFilePatterns: ['BuildSave_*.sav']
}
```

- [ ] **Step 3: 实现 listSlots**

- 匹配 basename `^BuildSave_(\d+)\.sav$`（忽略大小写）
- `id: \`build-${n}\``，`sessionFiles: [relativePath]`
- **绝不**把 `PLAYERPREFS.sav` 列入
- subtitle：尽量 `Lv.{level} · {saveDate}`；bytes 为 null 时 `readable: false`

- [ ] **Step 4: Run** `npx vitest run tests/belmonts-curse/slots.spec.ts` — PASS

- [ ] **Step 5: Commit**（若要求）

---

### Task 3: module 骨架 + registry + featureFlags

**Files:**
- Create: `src/games/belmonts-curse/model/featureFlags.ts`
- Create: `src/games/belmonts-curse/actions.ts`
- Create: `src/games/belmonts-curse/views/index.ts`（可先空数组占位，Task 4 填满）
- Create: `src/games/belmonts-curse/index.ts`
- Create: `src/games/belmonts-curse/cover.jpg`（Steam 头图；勿提交非法资源许可问题——沿用仓库其他游戏惯例）
- Modify: `src/host/registry.ts` — import + 数组追加 `belmontsCurseModule`
- Modify: `tests/host-library.spec.ts` — length `8`→`9`，ids 列表末尾加 `'belmonts-curse'`
- Modify: 凡硬编码完整 `modules.map` 期望列表的测试（`tests/chaos-front/module.spec.ts`、`tests/terraria/module.spec.ts`、`tests/wanderburg/module.spec.ts`）同步追加
- Test: `tests/belmonts-curse/module.spec.ts`

**Interfaces:**
- Produces: `export const belmontsCurseModule: GameModule<BelmontsCurseState>`
- `featureFlags = { addItem: false, addAbility: false } as const`

- [ ] **Step 1: 测试 module 契约**

```ts
import { describe, expect, it } from 'vitest'
import { modules } from '@host/registry'
import { belmontsCurseModule } from '../../src/games/belmonts-curse'
import { featureFlags } from '../../src/games/belmonts-curse/model/featureFlags'

describe('belmontsCurseModule', () => {
  it('registers with catalog and closed add flags', () => {
    expect(belmontsCurseModule.id).toBe('belmonts-curse')
    expect(belmontsCurseModule.catalog.steamAppId).toBe(4231820)
    expect(belmontsCurseModule.catalog.rightsHolder).toMatch(/KONAMI/i)
    expect(featureFlags.addItem).toBe(false)
    expect(featureFlags.addAbility).toBe(false)
    expect(modules.map((m) => m.id)).toContain('belmonts-curse')
    expect(belmontsCurseModule.locate.identifyNameRegex).toContain('BuildSave_')
  })
})
```

- [ ] **Step 2: 实现 index/actions/featureFlags；registry 登记**

`actions.ts`：一期 `actions: () => []`，`applyAction: (s) => s`（标量编辑走视图 mutate）。

Catalog summary 中英：非官方；请先退出游戏；注意 Steam Cloud。

- [ ] **Step 3: Run** `npx vitest run tests/belmonts-curse/module.spec.ts tests/host-library.spec.ts` — PASS

- [ ] **Step 4: Commit**（若要求）

---

### Task 4: Views + i18n + editorBindings

**Files:**
- Create: `src/games/belmonts-curse/views/inject.ts`
- Create: `src/games/belmonts-curse/views/OverviewTab.vue`
- Create: `src/games/belmonts-curse/views/CharacterTab.vue`
- Create: `src/games/belmonts-curse/views/InventoryTab.vue`
- Create: `src/games/belmonts-curse/views/AbilitiesTab.vue`
- Create: `src/games/belmonts-curse/views/ExplorationTab.vue`
- Create: `src/games/belmonts-curse/views/index.ts`
- Create: `src/games/belmonts-curse/catalog/items.json`（初始 `{}`）
- Create: `src/games/belmonts-curse/catalog/names.ts`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts`
- Modify: `src/games/belmonts-curse/index.ts` — `views: belmontsCurseViews`

**Interfaces:**
- `useBcEditor()` → `{ save, rev, trackRev, markDirty }` via `useSessionBindings('BC_EDITOR_INJECT')`
- `lookupItemName(id: string, locale: 'zh' | 'en'): string` — 无表则返回 `id`

- [ ] **Step 1: inject.ts**（对齐 ace-combat-8 / chaos-front）

```ts
import type { BelmontsCurseState } from '../parse'
import { useSessionBindings } from '@host/editorBindings'

export function useBcEditor() {
  const { state, mutate, rev, trackRev } = useSessionBindings('BC_EDITOR_INJECT')
  return {
    get save() {
      trackRev()
      return state() as BelmontsCurseState
    },
    get rev() {
      return rev.value
    },
    markDirty(fn?: () => void) {
      mutate((s) => {
        fn?.()
        return s
      })
    }
  }
}
```

- [ ] **Step 2: CharacterTab** — `el-input-number` + `@update:model-value`，调用 `setPlayerScalar`；模板根节点 `:data-ss-rev="editor.rev"`；顶部 `el-alert` 提示退出游戏/云存档（`bc.hint.quitAndCloud`）

- [ ] **Step 3: 只读 Tabs**
  - Inventory：表格列出 `itemsInInventory` + 装备行；`lookupItemName`
  - Abilities：`vaniaMoves` / `progressionPersistentSave` / arcana 列表
  - Exploration：显示 `worldKeyCount`、`completionItemCount`、`entityCount` 三数字
  - Overview：version / saveDate / playTime

- [ ] **Step 4: i18n** — 至少：`bc.tabs.overview|character|inventory|abilities|exploration`，`bc.hint.quitAndCloud`，角色字段 label

- [ ] **Step 5: views/index.ts** 注册 5 个 ViewSpec；更新 `module.spec.ts` 期望 `views.map(v => v.id)`

- [ ] **Step 6: Run** `npm run typecheck` 与 `npx vitest run tests/belmonts-curse` — PASS

- [ ] **Step 7: Commit**（若要求）

---

### Task 5: 文档 + HANDTEST + CHANGELOG + README

**Files:**
- Create: `docs/games/belmonts-curse.md`, `docs/games/belmonts-curse.en.md`
- Modify: `README.md`, `README.en.md`（支持的游戏表一行）
- Modify: `CHANGELOG.md`, `CHANGELOG.en.md`
- Modify: `docs/HANDTEST.md` — 新增「Belmont's Curse」节

- [ ] **Step 1: 用户文档**写清：路径、只编辑 `BuildSave_*.sav`、一期可写字段、只读页、不碰 PLAYERPREFS、退出游戏与 Steam Cloud、权利人 KONAMI、非官方

- [ ] **Step 2: HANDTEST 清单**
  1. 副本上打开槽位  
  2. 未改保存（若宿主有脏标记则可跳过）/ 或导出后再载入 — 游戏可开  
  3. `experienceCurrent +1` → 游戏内可见  
  4. 只读背包与游戏内一致（抽样）  
  5. 确认未出现 PLAYERPREFS 槽

- [ ] **Step 3: README + CHANGELOG 记一笔「新增恶魔城：贝尔蒙特的诅咒（一期标量）」**

- [ ] **Step 4: Commit**（若要求）

---

### Task 6: 全量验证

- [ ] **Step 1:** `npm test` — 全部 PASS；贴输出  
- [ ] **Step 2:** `npm run typecheck` — 无错误；贴输出  
- [ ] **Step 3:**（可选）真档门控：`BC_SAVE=.../BuildSave_0.sav npx vitest run tests/belmonts-curse/e2e-real.spec.ts` — 无文件则 skip；测试仅 parse→serialize→再 parse 标量一致，**不**把真档复制进仓库

---

### Task 7: 名称表脚本（一期可渐进，不阻塞 Task 1–6）

**Files:**
- Create: `scripts/bc-extract-names.mts`
- Update: `src/games/belmonts-curse/catalog/items.json`（脚本输出）
- Create: `src/games/belmonts-curse/catalog/SOURCE.md` — 说明从本机安装目录派生、版本号、不包含图标

- [ ] 脚本接受 `--game "F:\SteamLibrary\steamapps\common\Castlevania Belmont's Curse"`  
- [ ] 尽力从 Addressables/文本资源抽 id→en（zh 可先 = en 或留空用 en 回退）  
- [ ] 失败时保持 `{}`，UI 仍显示 raw ID  
- [ ] **不**在本任务打开新增门闩

若探路发现名称只在 IL2CPP 元数据中、短期抽不出：文档注明「名称表待补」；Task 1–6 仍可合并。

---

## 二期（不在本计划完成定义内）

单独开 change / 计划补丁，至少包括：

1. `mapping/pickup-links.json` + capability 链接探路  
2. 双写 `itemsInInventory` + `savableEntityStates`  
3. 二次解锁 HANDTEST 通过后置 `featureFlags.addItem/addAbility`  
4. Inventory/Abilities Tab 增删 UI  

在映射与手测完成前，禁止合并「可新增」到主功能。

---

## Spec coverage（自检）

| 设计要求 | 任务 |
|----------|------|
| locate BuildSave / 忽略 PLAYERPREFS | Task 2 |
| JSON 透传往返 + 标量白名单 | Task 1 |
| 只读背包/能力/探索 | Task 4 |
| registry + i18n + cover | Task 3–4 |
| 文档 / HANDTEST / CHANGELOG / README | Task 5 |
| 名称表派生 | Task 7 |
| 写回硬门槛手测 | Task 5 HANDTEST + 用户真机 |
| 二期映射双写 | 文末延期 |
| 门闩默认关 | Task 3 `featureFlags` |
| Windows only 一期 | locate 仅 USERPROFILE 模板 |

## Placeholder scan

无 TBD；Task 7 允许名称表为空对象作为显式降级。
