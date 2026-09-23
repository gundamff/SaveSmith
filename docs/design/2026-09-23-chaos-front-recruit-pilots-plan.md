# Chaos Front Recruit Defeated-Faction Pilots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Chaos Front players add pilots from defeated factions only (with roster cleanup + clear UI warnings), mirroring the Units “Add” flow.

**Architecture:** Extend `SaveData` with `listRecruitablePilots` / `addPilot` that derive the pool from `FactionData` where `isActive === false`, write into `PlayerCharacters` + `PlayerCharacterEXPs`, and strip the ID from `leader` / `spyMaster` / `commanders`. `PilotsTab` gets an Add dialog aligned with `UnitsTab`; copy lives in `i18n.ts`.

**Tech Stack:** Vue 3, Element Plus, Vitest, TypeScript; existing `chaos-front` module (ES3 JSON).

**Spec:** `docs/design/2026-09-23-chaos-front-recruit-pilots-design.md`

## Global Constraints

- Only `FactionData` entries with `isActive === false` contribute candidates
- Candidates are only `leader`, `spyMaster`, and `commanders[]` with `id > 0`
- Never offer or accept mission-unlock pilots via a separate catalog (out of scope by omission)
- On successful add: append player lists **and** clear the ID from all faction fields that hold it
- Reject duplicates already in `PlayerCharacters`
- Reject IDs still attached to any `isActive === true` faction
- Skip unknown / `未使用` character names via `characterById` + `isUnusedEntry`
- Level range 1..10; default UI level 10 → `characterExpForLevel(10)` / `CHARACTER_MAX_EXP`
- Module never touches `fs` / Tauri `invoke`
- Do not expand extract scripts or `game-data.json` for army↔character static maps
- Prefix user-facing keys under existing `pilots.*` / `error.*` in `chaos-front/i18n.ts`

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/chaos-front/model/saveModel.ts` | `RecruitablePilot` type, `listRecruitablePilots`, `addPilot`, faction field strip |
| `src/games/chaos-front/views/PilotsTab.vue` | Add button + dialog + toast |
| `src/games/chaos-front/i18n.ts` | ZH/EN copy + new error codes |
| `tests/chaos-front/saveModel.spec.ts` | Gate + write tests (extend existing suite) |
| `docs/games/chaos-front.md` / `.en.md` | User-facing one-line capability update |
| `docs/design/2026-09-23-chaos-front-recruit-pilots-design.md` | Mark status implemented when done |

---

### Task 1: `listRecruitablePilots` + `addPilot` (model, TDD)

**Files:**
- Modify: `src/games/chaos-front/model/saveModel.ts`
- Modify: `tests/chaos-front/saveModel.spec.ts`
- Consumes: `characterById`, `isUnusedEntry`, `armyById` from `gameData.ts`; `characterExpForLevel`, `CHARACTER_MAX_EXP` from `level.ts`
- Produces:
  - `export type PilotFactionRole = 'leader' | 'spyMaster' | 'commander'`
  - `export interface RecruitablePilot { characterId: number; factionId: number; factionName: string; role: PilotFactionRole }`
  - `SaveData.listRecruitablePilots(gd: GameData): RecruitablePilot[]`
  - `SaveData.addPilot(gd: GameData, characterId: number, level: number): RecruitablePilot` (return the chosen entry for UI toast; throw `ModuleError` on failure)

- [ ] **Step 1: Extend test `gd.characters` and add failing tests**

In `tests/chaos-front/saveModel.spec.ts`, add characters used by the fixture’s factions, and append these tests (place after `maxAllPilots`):

```ts
  it('listRecruitablePilots returns only inactive-faction roster ids', () => {
    const s = SaveData.load(fixture())
    const recruitGd: GameData = {
      ...gd,
      characters: [
        ...gd.characters,
        { id: 17, name: '克拉苏斯', portrait: 17 },
        { id: 21, name: '狄奥多拉', portrait: 21 },
        { id: 18, name: '奥古斯塔', portrait: 18 },
        { id: 41, name: '李存义', portrait: 41 }
      ]
    }
    expect(s.listRecruitablePilots(recruitGd)).toEqual([])

    const f1 = s.factions.find((f) => f.id === 1)!
    f1.isActive = false
    f1.leader = 17
    f1.spyMaster = 21
    f1.commanders = [17, 18]

    const list = s.listRecruitablePilots(recruitGd)
    expect(list.map((x) => x.characterId).sort((a, b) => a - b)).toEqual([17, 18, 21])
    expect(list.find((x) => x.characterId === 17)?.role).toBe('leader')
    expect(list.find((x) => x.characterId === 17)?.factionName).toBe('委员会军第一舰队')
  })

  it('listRecruitablePilots excludes already owned and unused', () => {
    const s = SaveData.load(fixture())
    const recruitGd: GameData = {
      ...gd,
      characters: [
        ...gd.characters,
        { id: 17, name: '克拉苏斯', portrait: 17 },
        { id: 99, name: '未使用', portrait: 1 }
      ]
    }
    const f1 = s.factions.find((f) => f.id === 1)!
    f1.isActive = false
    f1.leader = 17
    f1.spyMaster = 99
    f1.commanders = [84] // already in PlayerCharacters
    const ids = s.listRecruitablePilots(recruitGd).map((x) => x.characterId)
    expect(ids).toEqual([17])
  })

  it('addPilot appends player lists and clears faction fields', () => {
    const s = SaveData.load(fixture())
    const recruitGd: GameData = {
      ...gd,
      characters: [...gd.characters, { id: 17, name: '克拉苏斯', portrait: 17 }]
    }
    const f1 = s.factions.find((f) => f.id === 1)!
    f1.isActive = false
    f1.leader = 17
    f1.spyMaster = 21
    f1.commanders = [17, 18]

    const got = s.addPilot(recruitGd, 17, 10)
    expect(got.characterId).toBe(17)
    expect(s.characters).toEqual([84, 87, 83, 17])
    expect(s.characterExps[3]).toBe(20000)
    expect(f1.leader).toBe(0)
    expect(f1.commanders).toEqual([18])
    expect(f1.spyMaster).toBe(21)

    const s2 = SaveData.load(s.serialize())
    expect(s2.characters).toContain(17)
    const f1b = s2.factions.find((f) => f.id === 1)!
    expect(f1b.leader).toBe(0)
    expect(f1b.commanders).toEqual([18])
  })

  it('addPilot rejects active-faction, owned, and bad level', () => {
    const s = SaveData.load(fixture())
    const recruitGd: GameData = {
      ...gd,
      characters: [...gd.characters, { id: 17, name: '克拉苏斯', portrait: 17 }]
    }
    expect(() => s.addPilot(recruitGd, 17, 10)).toThrow(
      expect.objectContaining({ code: 'PILOT_NOT_RECRUITABLE' })
    )

    const f1 = s.factions.find((f) => f.id === 1)!
    f1.isActive = false
    f1.leader = 17
    f1.commanders = [17]
    expect(() => s.addPilot(recruitGd, 84, 10)).toThrow(
      expect.objectContaining({ code: 'PILOT_ALREADY_OWNED' })
    )
    // 84 is owned and not in inactive roster → ALREADY_OWNED takes precedence when id is owned
    expect(() => s.addPilot(recruitGd, 17, 0)).toThrow(
      expect.objectContaining({ code: 'PILOT_LEVEL' })
    )
    expect(() => s.addPilot(recruitGd, 17, 11)).toThrow(
      expect.objectContaining({ code: 'PILOT_LEVEL' })
    )
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/chaos-front/saveModel.spec.ts -t "listRecruitablePilots|addPilot"`

Expected: FAIL (`listRecruitablePilots` / `addPilot` undefined)

- [ ] **Step 3: Implement types + methods in `saveModel.ts`**

Add imports:

```ts
import {
  // existing…
  characterById,
  isUnusedEntry,
  type GameData
} from './gameData'
import { CHARACTER_MAX_EXP, characterExpForLevel, unitLevelForExp } from './level'
```

(`armyById` may already be imported — reuse it.)

Add after `FactionState` / near other exported types:

```ts
export type PilotFactionRole = 'leader' | 'spyMaster' | 'commander'

export interface RecruitablePilot {
  characterId: number
  factionId: number
  factionName: string
  role: PilotFactionRole
}

const ROLE_PRIORITY: Record<PilotFactionRole, number> = {
  leader: 0,
  spyMaster: 1,
  commander: 2
}
```

Inside `SaveData`:

```ts
  private factionDisplayName(gd: GameData, f: FactionState): string {
    return armyById(gd, f.army)?.name ?? `势力${f.id}`
  }

  private stripCharacterFromFactions(characterId: number): void {
    for (const f of this.factions) {
      if (f.leader === characterId) f.leader = 0
      if (f.spyMaster === characterId) f.spyMaster = 0
      if (Array.isArray(f.commanders) && f.commanders.includes(characterId)) {
        f.commanders = f.commanders.filter((id) => id !== characterId)
      }
    }
  }

  listRecruitablePilots(gd: GameData): RecruitablePilot[] {
    const owned = new Set(this.characters)
    const best = new Map<number, RecruitablePilot>()
    for (const f of this.factions) {
      if (f.isActive) continue
      const factionName = this.factionDisplayName(gd, f)
      const slots: { id: number; role: PilotFactionRole }[] = []
      if (f.leader > 0) slots.push({ id: f.leader, role: 'leader' })
      if (f.spyMaster > 0) slots.push({ id: f.spyMaster, role: 'spyMaster' })
      for (const id of f.commanders ?? []) {
        if (id > 0) slots.push({ id, role: 'commander' })
      }
      for (const { id, role } of slots) {
        if (owned.has(id)) continue
        const entry = characterById(gd, id)
        if (!entry || isUnusedEntry(entry)) continue
        const next: RecruitablePilot = {
          characterId: id,
          factionId: f.id,
          factionName,
          role
        }
        const prev = best.get(id)
        if (!prev || ROLE_PRIORITY[role] < ROLE_PRIORITY[prev.role]) {
          best.set(id, next)
        }
      }
    }
    return [...best.values()].sort((a, b) => a.characterId - b.characterId)
  }

  addPilot(gd: GameData, characterId: number, level: number): RecruitablePilot {
    const lv = Math.round(level)
    if (lv < 1 || lv > 10) throw new SaveError('PILOT_LEVEL', [level])
    const id = Math.round(characterId)
    if (this.characters.includes(id)) throw new SaveError('PILOT_ALREADY_OWNED', [id])
    const pool = this.listRecruitablePilots(gd)
    const hit = pool.find((p) => p.characterId === id)
    if (!hit) throw new SaveError('PILOT_NOT_RECRUITABLE', [id])
    this.characters.push(id)
    this.characterExps.push(characterExpForLevel(lv))
    this.stripCharacterFromFactions(id)
    return hit
  }
```

Notes:
- `characters` / `characterExps` getters return live arrays from the ES3 doc — `.push` mutates in place (same pattern as other list edits).
- Role dedupe: prefer `leader` over `spyMaster` over `commander` when the same ID appears multiple times on one inactive faction.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/chaos-front/saveModel.spec.ts`

Expected: all PASS (including new cases)

- [ ] **Step 5: Commit**

```bash
git add src/games/chaos-front/model/saveModel.ts tests/chaos-front/saveModel.spec.ts
git commit -m "feat(chaos-front): recruit pilots from defeated factions"
```

---

### Task 2: i18n strings (ZH/EN)

**Files:**
- Modify: `src/games/chaos-front/i18n.ts`
- Consumes: Task 1 error codes `PILOT_NOT_RECRUITABLE` | `PILOT_ALREADY_OWNED` | `PILOT_LEVEL`
- Produces: `pilots.add*` keys + `error.PILOT_*` for `formatError`

- [ ] **Step 1: Add ZH keys under `pilots` and `error`**

```ts
  pilots: {
    maxed: '已满级 {0} 人',
    maxAll: '全部 Lv10',
    count: '共 {0} 人',
    portrait: '头像',
    name: '姓名',
    level: '等级',
    exp: '经验',
    progress: '进度',
    add: '添加',
    addTitle: '收编驾驶员',
    addHint:
      '只能添加已灭亡势力的领袖 / 间谍头目 / 指挥官。添加后会从该势力名单移除，避免同场出现两个相同驾驶员导致崩溃。任务解锁的驾驶员不支持。',
    person: '人选',
    personPlaceholder: '选择驾驶员',
    roleLeader: '领袖',
    roleSpy: '间谍头目',
    roleCommander: '指挥官',
    optionLabel: '{0}（{1} · {2}）',
    initLevel: '初始等级',
    emptyPool: '当前没有已灭亡势力的可收编驾驶员',
    added: '已添加 {0}（已从「{1}」移除）',
    cancel: '取消',
    confirmAdd: '添加'
  },
```

```ts
    PILOT_NOT_RECRUITABLE: '该驾驶员不可收编（需所属势力已灭亡且在其指挥官名单中）: {0}',
    PILOT_ALREADY_OWNED: '驾驶员已在名单中: {0}',
    PILOT_LEVEL: '驾驶员等级无效（1..10）: {0}',
```

- [ ] **Step 2: Add matching EN keys**

```ts
  pilots: {
    // …existing…
    add: 'Add',
    addTitle: 'Recruit pilot',
    addHint:
      'Only leaders / spymasters / commanders from defeated factions. Recruiting removes them from that faction roster to avoid duplicate-ID crashes in battle. Mission-unlock pilots are not supported.',
    person: 'Pilot',
    personPlaceholder: 'Select a pilot',
    roleLeader: 'Leader',
    roleSpy: 'Spymaster',
    roleCommander: 'Commander',
    optionLabel: '{0} ({1} · {2})',
    initLevel: 'Starting level',
    emptyPool: 'No recruitable pilots from defeated factions',
    added: 'Added {0} (removed from “{1}”)',
    cancel: 'Cancel',
    confirmAdd: 'Add'
  },
```

```ts
    PILOT_NOT_RECRUITABLE:
      'Pilot not recruitable (faction must be defeated and listed on its roster): {0}',
    PILOT_ALREADY_OWNED: 'Pilot already owned: {0}',
    PILOT_LEVEL: 'Invalid pilot level (1..10): {0}',
```

- [ ] **Step 3: Commit**

```bash
git add src/games/chaos-front/i18n.ts
git commit -m "i18n(chaos-front): copy for defeated-faction pilot recruit"
```

---

### Task 3: `PilotsTab` Add dialog

**Files:**
- Modify: `src/games/chaos-front/views/PilotsTab.vue`
- Consumes: `listRecruitablePilots`, `addPilot`, `RecruitablePilot`; `t('pilots.*')`; `characterById` / `gameData` (already used)
- Produces: working Add UI

- [ ] **Step 1: Wire script (mirror `UnitsTab` add pattern)**

Replace/extend `<script setup>` with:

```ts
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { characterById, gameData } from '../model/gameData'
import { CHARACTER_MAX_EXP, CHARACTER_MAX_LEVEL, characterExpForLevel, characterLevelForExp } from '../model/level'
import type { PilotFactionRole, RecruitablePilot } from '../model/saveModel'
import { gameImage } from '../lib/images'
import { formatError, t } from '../i18n'
import { useCfEditor } from './inject'

const editor = useCfEditor()
const pilots = computed(() => {
  void editor.rev
  return (editor.save?.characters ?? []).map((id, index) => ({
    id,
    index,
    name: characterById(gameData, id)?.name ?? `#${id}`,
    exp: editor.save.characterExps[index] ?? 0
  }))
})

function levelOf(exp: number): number {
  return characterLevelForExp(exp)
}
function setExp(index: number, v: number | undefined): void {
  if (v === undefined || v === null) return
  editor.markDirty(() => editor.save.setPilotExp(index, v))
}
function maxAll(): void {
  let n = 0
  editor.markDirty(() => {
    n = editor.save.maxAllPilots()
  })
  ElMessage.success(t('pilots.maxed', n))
}

const addVisible = ref(false)
const addId = ref<number | null>(null)
const addLevel = ref(CHARACTER_MAX_LEVEL)

const recruitable = computed((): RecruitablePilot[] => {
  void editor.rev
  if (!editor.save) return []
  return editor.save.listRecruitablePilots(gameData)
})

function roleLabel(role: PilotFactionRole): string {
  if (role === 'leader') return t('pilots.roleLeader')
  if (role === 'spyMaster') return t('pilots.roleSpy')
  return t('pilots.roleCommander')
}

function optionLabel(p: RecruitablePilot): string {
  const name = characterById(gameData, p.characterId)?.name ?? `#${p.characterId}`
  return t('pilots.optionLabel', name, p.factionName, roleLabel(p.role))
}

function openAdd(): void {
  addId.value = null
  addLevel.value = CHARACTER_MAX_LEVEL
  addVisible.value = true
}

function confirmAdd(): void {
  if (!addId.value || !editor.save) return
  const id = addId.value
  const level = addLevel.value
  try {
    let got: RecruitablePilot | undefined
    editor.markDirty(() => {
      got = editor.save.addPilot(gameData, id, level)
    })
    if (got) {
      const name = characterById(gameData, got.characterId)?.name ?? `#${got.characterId}`
      ElMessage.success(t('pilots.added', name, got.factionName))
    }
    addVisible.value = false
  } catch (e) {
    ElMessage.error(formatError(e))
  }
}
```

Keep existing table template; update toolbar + dialog:

```vue
    <div class="toolbar">
      <el-button type="primary" @click="maxAll()">{{ t('pilots.maxAll') }}</el-button>
      <el-button @click="openAdd()">{{ t('pilots.add') }}</el-button>
      <span class="count">{{ t('pilots.count', pilots.length) }}</span>
    </div>
    <!-- existing table unchanged -->

    <el-dialog v-model="addVisible" :title="t('pilots.addTitle')" width="560">
      <p class="hint">{{ t('pilots.addHint') }}</p>
      <el-form label-width="90px">
        <el-form-item :label="t('pilots.person')">
          <el-select
            v-model="addId"
            filterable
            :disabled="recruitable.length === 0"
            :placeholder="recruitable.length ? t('pilots.personPlaceholder') : t('pilots.emptyPool')"
            style="width: 100%"
          >
            <el-option
              v-for="p in recruitable"
              :key="p.characterId"
              :value="p.characterId"
              :label="optionLabel(p)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('pilots.initLevel')">
          <el-slider v-model="addLevel" :min="1" :max="10" show-stops style="width: 300px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">{{ t('pilots.cancel') }}</el-button>
        <el-button type="primary" :disabled="!addId" @click="confirmAdd()">{{
          t('pilots.confirmAdd')
        }}</el-button>
      </template>
    </el-dialog>
```

Add scoped style:

```css
.hint { color: #909399; font-size: 13px; line-height: 1.5; margin: 0 0 12px; }
```

Remove unused `characterExpForLevel` import if the linter complains (only needed if you display preview exp — optional; prefer not importing unused symbols).

- [ ] **Step 2: Smoke-check TypeScript / lints on touched files**

Run: `npx vitest run tests/chaos-front/saveModel.spec.ts`

Expected: PASS. Fix any `PilotsTab` type errors if the IDE/linter reports them.

- [ ] **Step 3: Commit**

```bash
git add src/games/chaos-front/views/PilotsTab.vue
git commit -m "feat(chaos-front): PilotsTab UI to recruit defeated-faction pilots"
```

---

### Task 4: User docs + design status

**Files:**
- Modify: `docs/games/chaos-front.md`
- Modify: `docs/games/chaos-front.en.md`
- Modify: `docs/design/2026-09-23-chaos-front-recruit-pilots-design.md` (status line)

- [ ] **Step 1: Update capability tables**

ZH — change pilots row to:

```markdown
| 驾驶员 | 等级、经验；添加已灭亡势力的领袖/间谍/指挥官（添加时从该势力名单移除；不支持任务解锁） |
```

EN:

```markdown
| Pilots | Level, XP; add leaders/spymasters/commanders from defeated factions (removed from that roster on add; mission unlocks unsupported) |
```

Design doc status:

```markdown
状态：已实现  
计划：`docs/design/2026-09-23-chaos-front-recruit-pilots-plan.md`
```

- [ ] **Step 2: Full chaos-front test suite**

Run: `npx vitest run tests/chaos-front`

Expected: all PASS (skipped e2e allowed)

- [ ] **Step 3: Commit**

```bash
git add docs/games/chaos-front.md docs/games/chaos-front.en.md docs/design/2026-09-23-chaos-front-recruit-pilots-design.md
git commit -m "docs(chaos-front): note defeated-faction pilot recruit"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Pool = inactive `leader`/`spyMaster`/`commanders` | 1 |
| Strip from faction on add | 1 |
| Level 1–10 default 10 | 1 + 3 |
| No mission-unlock catalog | Global (omission) |
| PilotsTab dialog + permanent hint | 2 + 3 |
| Toast with name + faction | 3 |
| Error codes + i18n | 1 + 2 |
| Vitest cases | 1 |
| User docs | 4 |

## Self-review notes

- No TBD/placeholder steps
- `addPilot` return type used by Task 3 toast — keep signature stable
- `PILOT_ALREADY_OWNED` checked before pool lookup so owned IDs never surface as `NOT_RECRUITABLE`
- Fixture faction `id: 0` stays irrelevant (`commanders: []`); tests mutate faction `1`
