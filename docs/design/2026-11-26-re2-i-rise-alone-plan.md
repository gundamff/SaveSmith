# Re2 I Rise Alone（重生2我独自逆袭）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新模块 `re2-i-rise-alone`：解密 `SaveData.dat`，列出手动/自动槽，对槽内已有的 7 项 `property_Property_*` 资源可写。

**Architecture:** AES-192-ECB-PKCS7（`node-forge`，对齐 FFR 的 ECB 用法但启用 PKCS7）→ 外层 `Dictionary<string,string>` 袋透传 → 脏槽才重序列化 `{uuid}_Data`。宿主 `parse` 增加可选 `ctx.slotId`，以便单文件多逻辑槽选中正确 UUID。

**Tech Stack:** TypeScript、Vitest、Vue 3 + Element Plus、`node-forge`、现有 `GameModule` / `useSessionBindings`。

**Spec:** `docs/design/2026-11-26-re2-i-rise-alone-design.md`

## Global Constraints

- 模块不碰 `fs` / 不直接 `invoke` Tauri
- 不提交玩家真档；真档 E2E 用 `RE2IRA_SAVE` 门控 + `skip`
- 文案前缀 `r2ira.`；Steam `3816120`；权利人 Proudmate Entertainment
- 白名单仅：Money / Stamina / Charm / Wisdom / Execution / Morality / Pressure
- 缺键不补建；`MMFavorability` / 图鉴 / 物品不进本期
- 零编辑 `serialize` 返回打开时原密文字节

## File map

| Path | Role |
|------|------|
| `src/sdk/types.ts` | `parse` 可选第二参 `ParseContext` |
| `src/host/stores/session.ts` | `loadSlot` / save 再 parse 传入 `slotId` |
| `src/games/re2-i-rise-alone/crypto/aesEcb.ts` | 加解密 |
| `src/games/re2-i-rise-alone/model/bag.ts` | 外层袋解析/脏槽替换/重加密 |
| `src/games/re2-i-rise-alone/model/savedData.ts` | SavedData JSON 投影 |
| `src/games/re2-i-rise-alone/model/resources.ts` | 白名单读写 |
| `src/games/re2-i-rise-alone/{locate,slots,parse,actions,index}.ts` | 模块接线 |
| `src/games/re2-i-rise-alone/views/*` | ResourcesTab |
| `src/host/registry.ts` | 静态登记 |
| `src/host/i18n/{zh,en}.ts` | `r2ira.*` |
| `tests/re2-i-rise-alone/*` | 单元 + 门控 E2E |
| `docs/games/re2-i-rise-alone.md` + `.en.md` 等 | 文档 |

---

### Task 1: 宿主 `parse` 传入 `slotId`

**Files:**
- Modify: `src/sdk/types.ts`
- Modify: `src/host/stores/session.ts`
- Test: `tests/host/parse-context.spec.ts`（若仓内无 host 测目录，则放 `tests/re2-i-rise-alone/parse-context-host.spec.ts` 用最小 mock；或仅 typecheck + 手工确认调用点）

**Interfaces:**
- Produces:
```ts
export interface ParseContext {
  slotId: string
}
// GameModule.parse(files: SlotBytes[], ctx?: ParseContext): S | Promise<S>
```

- [ ] **Step 1: 扩展类型**

在 `src/sdk/types.ts` 的 `GameModule` 附近加入：

```ts
export interface ParseContext {
  slotId: string
}
```

将

```ts
parse(files: SlotBytes[]): S | Promise<S>
```

改为

```ts
parse(files: SlotBytes[], ctx?: ParseContext): S | Promise<S>
```

- [ ] **Step 2: session 传 ctx**

`loadSlot` 内：

```ts
const parsed = wrapState(await mod.parse(files, { slotId }))
```

`save` 里再 parse 处（约 `committedState`）：

```ts
const ctx = currentSlotId.value ? { slotId: currentSlotId.value } : undefined
const committedState = wrapState(await mod.parse(committedFiles, ctx))
```

- [ ] **Step 3: 确认现有模块仍编译**

Run: `npm run typecheck`  
Expected: PASS（既有 `parse(files)` 实现可赋给带可选第二参的类型）

- [ ] **Step 4: Commit**

```bash
git add src/sdk/types.ts src/host/stores/session.ts
git commit -m "feat(host): pass optional slotId into GameModule.parse"
```

---

### Task 2: AES-192-ECB-PKCS7

**Files:**
- Create: `src/games/re2-i-rise-alone/crypto/aesEcb.ts`
- Test: `tests/re2-i-rise-alone/aesEcb.spec.ts`

**Interfaces:**
- Produces:
```ts
export function decryptSaveDat(cipher: Uint8Array): Uint8Array
export function encryptSaveDat(plain: Uint8Array): Uint8Array
```

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { decryptSaveDat, encryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'

describe('re2ira aesEcb', () => {
  it('round-trips utf8 json', () => {
    const plain = new TextEncoder().encode('{"a":"1"}')
    const cipher = encryptSaveDat(plain)
    expect(cipher.byteLength % 16).toBe(0)
    expect(new TextDecoder().decode(decryptSaveDat(cipher))).toBe('{"a":"1"}')
  })

  it('rejects empty cipher', () => {
    expect(() => decryptSaveDat(new Uint8Array())).toThrow()
  })
})
```

- [ ] **Step 2: Run — expect FAIL（模块不存在）**

Run: `npx vitest run tests/re2-i-rise-alone/aesEcb.spec.ts`  
Expected: FAIL resolve module

- [ ] **Step 3: 实现**（密钥来自 il2cpp `Tool.GameDataKey`；`FromBase64String` → 24 字节）

```ts
import forge from 'node-forge'
import { ModuleError } from '@sdk/error'

/** Base64 key string from FrameWork.Tool.GameDataKey (client constant). */
const GAME_DATA_KEY_B64 = 'kujs1kkdlo4454GG00105sajuklmbkdl'

function keyBinary(): string {
  return forge.util.decode64(GAME_DATA_KEY_B64)
}

function bytesToBinary(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return s
}

function binaryToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

function aesEcbPkcs7(encrypt: boolean, data: Uint8Array): Uint8Array {
  if (!encrypt && (data.length === 0 || data.length % 16 !== 0)) {
    throw new ModuleError('INVALID_FORMAT', ['AES-ECB length'])
  }
  const cipher = encrypt
    ? forge.cipher.createCipher('AES-ECB', keyBinary())
    : forge.cipher.createDecipher('AES-ECB', keyBinary())
  cipher.start()
  cipher.update(forge.util.createBuffer(bytesToBinary(data)))
  if (!cipher.finish()) throw new ModuleError('INVALID_FORMAT', ['AES-ECB PKCS7'])
  return binaryToBytes(cipher.output.getBytes())
}

export function decryptSaveDat(cipher: Uint8Array): Uint8Array {
  return aesEcbPkcs7(false, cipher)
}

export function encryptSaveDat(plain: Uint8Array): Uint8Array {
  return aesEcbPkcs7(true, plain)
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/re2-i-rise-alone/aesEcb.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add src/games/re2-i-rise-alone/crypto/aesEcb.ts tests/re2-i-rise-alone/aesEcb.spec.ts
git commit -m "feat(re2ira): add AES-192-ECB-PKCS7 for SaveData.dat"
```

---

### Task 3: bag + SavedData + resources（TDD）

**Files:**
- Create: `src/games/re2-i-rise-alone/model/bag.ts`
- Create: `src/games/re2-i-rise-alone/model/savedData.ts`
- Create: `src/games/re2-i-rise-alone/model/resources.ts`
- Create: `tests/re2-i-rise-alone/fixtures.ts`
- Test: `tests/re2-i-rise-alone/bag.spec.ts`、`resources.spec.ts`

**Interfaces:**
- Produces:
```ts
export const SAVE_FILE = 'SaveData.dat'
export const RESOURCE_KEYS = [
  'Money', 'Stamina', 'Charm', 'Wisdom', 'Execution', 'Morality', 'Pressure'
] as const
export type ResourceKey = (typeof RESOURCE_KEYS)[number]

export type StringBag = Map<string, string> // insertion order = JSON key order best-effort

export function parseBagFromPlain(plainUtf8: string): { bag: StringBag; rawPlain: string }
export function openBagFromCipher(cipher: Uint8Array): { bag: StringBag; rawPlain: string; originalCipher: Uint8Array }
export function listSlotMetas(bag: StringBag): Array<{
  id: string
  kind: 'manual' | 'auto'
  savedName: string
  round: number
  timeMs: number
}>
export function readSavedDataJson(bag: StringBag, slotId: string): string // throws if missing
export function parseSavedData(json: string): {
  Time: string
  Key: string
  Round: number
  SavedName: string
  Data: Record<string, string>
  // plus pass-through unknown top-level fields via raw object retained in state — see below
}
export function readResources(data: Record<string, string>): Partial<Record<ResourceKey, number>>
export function writeResource(
  data: Record<string, string>,
  key: ResourceKey,
  value: number
): void // no-op / throw if key absent — prefer throw ModuleError('MISSING_FIELD') if caller asks to write missing; UI never calls
export function setSlotSavedData(bag: StringBag, slotId: string, savedDataJson: string): void
export function sealBag(args: {
  bag: StringBag
  rawPlain: string
  originalCipher: Uint8Array
  dirtySlotIds: ReadonlySet<string>
}): Uint8Array
```

**Seal 策略（必须遵守）：**
- `dirtySlotIds.size === 0` → 返回 `originalCipher` 拷贝
- 否则：在 `rawPlain` 上对每个脏槽的 JSON string value 做**键级替换**（找到 `"${slotId}_Data":"` 后的 JSON 字符串值并替换为新 `JSON.stringify(savedData)` 的转义形式），避免整袋 `JSON.stringify` 打乱未脏键；若键级替换实现成本过高，允许：`JSON.parse(rawPlain)` 得到 object，只改脏槽对应属性为新字符串，再用自定义 stringify **仅当**能证明零编辑路径不走 stringify。推荐实现：维护 `bag: Map`，`seal` 时用 `jsonStringifyStringBag(bag)`（按 Map 插入序输出），但 **parse 时用正则/扫描器按出现顺序填 Map**，且未脏时仍返回 `originalCipher`。

- [ ] **Step 1: fixtures**

```ts
import { encryptSaveDat } from '../../src/games/re2-i-rise-alone/crypto/aesEcb'

export function makePlainBag(): string {
  const manual = '11111111-1111-1111-1111-111111111111'
  const auto = '22222222-2222-2222-2222-222222222222'
  const slot = (id: string, name: string, data: Record<string, string>) =>
    JSON.stringify({
      Time: '1700000000000',
      Key: id,
      Round: 1,
      SavedName: name,
      isNew: false,
      isStart: true,
      is360: false,
      event360Key: '',
      Data: data
    })
  const bag = {
    _saveKeyStr: JSON.stringify([manual]),
    _autoSaveStr: JSON.stringify([auto]),
    CurKey: auto,
    [`${manual}_Data`]: slot(manual, '手动1', {
      property_Property_Money: '100',
      property_Property_Stamina: '5'
    }),
    [`${auto}_Data`]: slot(auto, '自动存档', {
      property_Property_Money: '200',
      property_Property_Stamina: '6',
      property_Property_Charm: '7',
      property_Property_Wisdom: '8',
      property_Property_Execution: '1',
      property_Property_Morality: '2',
      property_Property_Pressure: '10',
      property_Property_MMFavorability: '99'
    }),
    Language: 'Chinese'
  }
  return JSON.stringify(bag)
}

export function makeCipherFixture(): Uint8Array {
  return encryptSaveDat(new TextEncoder().encode(makePlainBag()))
}
```

- [ ] **Step 2: 测试 bag / resources**

要点断言：
1. `openBagFromCipher` → `listSlotMetas` 得到 1 manual + 1 auto  
2. auto 资源含 7 项；manual 仅 Money/Stamina；读不到 MMFavorability 进白名单投影  
3. `writeResource(manualData, 'Money', 999)` 后 `readResources` 为 999；对 `Wisdom` 调用 `writeResource` 抛错或 no-op（选抛 `ModuleError('MISSING_FIELD', ['Wisdom'])`）  
4. `sealBag` 零脏 → 与 `originalCipher` 逐字节相等  
5. 只改 manual Money → decrypt 后 auto 的 `_Data` 字符串与改前完全一致；`Language` 不变；`MMFavorability` 仍为 `"99"`

- [ ] **Step 3: 实现 model 至绿**

`resources.ts` 核心：

```ts
export function dataKey(k: ResourceKey): string {
  return `property_Property_${k}`
}

export function readResources(data: Record<string, string>): Partial<Record<ResourceKey, number>> {
  const out: Partial<Record<ResourceKey, number>> = {}
  for (const k of RESOURCE_KEYS) {
    const raw = data[dataKey(k)]
    if (raw === undefined) continue
    if (!/^-?\d+$/.test(raw)) continue
    out[k] = Number(raw)
  }
  return out
}

export function writeResource(data: Record<string, string>, key: ResourceKey, value: number): void {
  const dk = dataKey(key)
  if (!(dk in data)) throw new ModuleError('MISSING_FIELD', [key])
  if (!Number.isInteger(value) || value < 0) throw new ModuleError('INVALID_FORMAT', [key])
  data[dk] = String(value)
}
```

SavedData 重序列化：保留未知顶层字段——`parseSavedData` 返回 `{ meta, data, raw: Record<string, unknown> }`，写回时 `raw.Data = data` 再 `JSON.stringify(raw)`。

- [ ] **Step 4: Run tests PASS**

Run: `npx vitest run tests/re2-i-rise-alone/bag.spec.ts tests/re2-i-rise-alone/resources.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add src/games/re2-i-rise-alone/model tests/re2-i-rise-alone
git commit -m "feat(re2ira): bag, SavedData projection, resource whitelist"
```

---

### Task 4: locate / slots / parse / serialize / registry

**Files:**
- Create: `src/games/re2-i-rise-alone/locate.ts`
- Create: `src/games/re2-i-rise-alone/slots.ts`
- Create: `src/games/re2-i-rise-alone/parse.ts`
- Create: `src/games/re2-i-rise-alone/actions.ts`
- Create: `src/games/re2-i-rise-alone/index.ts`
- Create: `src/games/re2-i-rise-alone/cover.jpg`（Steam 头图缩放；注明版权）
- Modify: `src/host/registry.ts`
- Test: `tests/re2-i-rise-alone/module.spec.ts`、`slots.spec.ts`

**Interfaces:**
```ts
export interface Re2IraState {
  relativePath: string
  slotId: string
  kind: 'manual' | 'auto'
  originalCipher: Uint8Array
  rawPlain: string
  bag: StringBag
  savedRaw: Record<string, unknown>
  data: Record<string, string>
  resources: Partial<Record<ResourceKey, number>>
  dirty: boolean
}

export function setResource(state: Re2IraState, key: ResourceKey, value: number): void
```

- [ ] **Step 1: locate**

```ts
import type { SaveLocator } from '@sdk/types'

export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\ProudmateEntertainment\\重生2我独自逆袭'
  ],
  identifyAnyOf: ['SaveData.dat']
}
```

- [ ] **Step 2: slots**

```ts
export function listSlots(listed: ListedFiles): SlotInfo[] {
  const file = listed.files.find((f) => f.relativePath.replace(/\\/g, '/') === 'SaveData.dat'
    || f.relativePath.toLowerCase().endsWith('savedata.dat'))
  if (!file?.bytes) {
    return file
      ? [{ id: 'SaveData.dat', exists: true, readable: false, sessionFiles: ['SaveData.dat'] }]
      : []
  }
  try {
    const { bag } = openBagFromCipher(file.bytes)
    return listSlotMetas(bag).map((m) => ({
      id: m.id,
      exists: true,
      readable: true,
      title: m.savedName.trim() || m.id.slice(0, 8),
      subtitle: `${m.kind === 'auto' ? '自动' : '手动'} · R${m.round}`,
      sessionFiles: ['SaveData.dat']
    }))
  } catch {
    return [{ id: 'SaveData.dat', exists: true, readable: false, sessionFiles: ['SaveData.dat'] }]
  }
}
```

（中英 subtitle 可先硬编码中文键，UI 列表侧若需 i18n 再用 `r2ira.slot.*`——本期允许 subtitle 中英双语简写：`auto/manual · R{n}`。）

- [ ] **Step 3: parse / serialize / validate**

```ts
export function parse(files: SlotBytes[], ctx?: ParseContext): Re2IraState {
  const file = files.find((f) => /savedata\.dat$/i.test(f.relativePath.replace(/\\/g, '/')))
  if (!file) throw new ModuleError('MISSING_FIELD', ['SaveData.dat'])
  const opened = openBagFromCipher(file.bytes)
  const metas = listSlotMetas(opened.bag)
  const slotId = ctx?.slotId && metas.some((m) => m.id === ctx.slotId)
    ? ctx.slotId
    : metas[0]?.id
  if (!slotId) throw new ModuleError('MISSING_FIELD', ['slot'])
  const meta = metas.find((m) => m.id === slotId)!
  const json = readSavedDataJson(opened.bag, slotId)
  const parsed = parseSavedData(json) // { raw, data }
  return {
    relativePath: file.relativePath,
    slotId,
    kind: meta.kind,
    originalCipher: opened.originalCipher,
    rawPlain: opened.rawPlain,
    bag: opened.bag,
    savedRaw: parsed.raw,
    data: parsed.data,
    resources: readResources(parsed.data),
    dirty: false
  }
}

export function setResource(state: Re2IraState, key: ResourceKey, value: number): void {
  writeResource(state.data, key, value)
  state.savedRaw.Data = state.data
  state.bag.set(`${state.slotId}_Data`, JSON.stringify(state.savedRaw))
  state.resources = readResources(state.data)
  state.dirty = true
}

export function serialize(state: Re2IraState): SerializedFile[] {
  const bytes = sealBag({
    bag: state.bag,
    rawPlain: state.rawPlain,
    originalCipher: state.originalCipher,
    dirtySlotIds: state.dirty ? new Set([state.slotId]) : new Set()
  })
  return [{ relativePath: state.relativePath, bytes }]
}

export function validate(state: Re2IraState): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const [k, v] of Object.entries(state.resources)) {
    if (v === undefined) continue
    if (!Number.isInteger(v) || v < 0) issues.push({ code: 'INVALID_FORMAT', args: [k] })
  }
  return issues
}
```

- [ ] **Step 4: index + registry**

对齐 `ball-x-pit/index.ts`；`registry.ts` 顶部静态 import + 数组追加 `re2IRiseAloneModule`。

- [ ] **Step 5: 测试**

- locate 模板含 `ProudmateEntertainment`  
- fixture cipher → `listSlots` 长度 2、id 为两个 UUID  
- `parse(files, { slotId: manual })` → resources 仅 2 键  
- 改 Money → serialize → decrypt → 该槽 Money 变、另一槽 `_Data` 原文不变  
- 零编辑 serialize 字节相等  

- [ ] **Step 6: Commit**

```bash
git add src/games/re2-i-rise-alone src/host/registry.ts tests/re2-i-rise-alone
git commit -m "feat(re2ira): wire GameModule locate/slots/parse/serialize"
```

---

### Task 5: UI + i18n

**Files:**
- Create: `src/games/re2-i-rise-alone/views/inject.ts`
- Create: `src/games/re2-i-rise-alone/views/ResourcesTab.vue`
- Create: `src/games/re2-i-rise-alone/views/index.ts`
- Modify: `src/games/re2-i-rise-alone/index.ts`（挂 views）
- Modify: `src/host/i18n/zh.ts`、`en.ts`

**Interfaces:** `useRe2IraEditor()` 同 BXP inject 模式；`setResource` + `markDirty`。

- [ ] **Step 1: i18n 树**

`zh.ts` / `en.ts` 增加：

```ts
r2ira: {
  tabs: { resources: '资源' },
  resources: {
    hint: '只改本槽已有属性；缺项表示尚未解锁，不会补建。请先退出游戏；Steam Cloud 可能回滚。',
    empty: '当前槽尚无已解锁的可编辑属性',
    Money: '金钱',
    Stamina: '体力',
    Charm: '魅力',
    Wisdom: '智慧',
    Execution: '行动力',
    Morality: '道德',
    Pressure: '压力'
  }
}
```

英文对应翻译。

- [ ] **Step 2: ResourcesTab**

对 `RESOURCE_KEYS` 中 `resources[key] !== undefined` 的项渲染 `el-input-number`（`:min="0"`，无硬 max 或 `2147483647`）；`@update:model-value` → `setResource`。无键时显示 `r2ira.resources.empty`。根节点 `:data-ss-rev="editor.rev"`。

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/games/re2-i-rise-alone/views src/host/i18n/zh.ts src/host/i18n/en.ts
git commit -m "feat(re2ira): resources tab and i18n"
```

---

### Task 6: 文档 + 真档门控 + 全量验证

**Files:**
- Create: `docs/games/re2-i-rise-alone.md`、`docs/games/re2-i-rise-alone.en.md`
- Modify: `README.md`、`README.en.md`（支持的游戏表一行）
- Modify: `CHANGELOG.md`、`CHANGELOG.en.md`
- Modify: `docs/HANDTEST.md`（手测节）
- Create: `tests/re2-i-rise-alone/e2e-real-save.spec.ts`
- Modify: `docs/design/2026-11-26-re2-i-rise-alone-design.md` 状态 → 已实现（完成验证后）

- [ ] **Step 1: 游戏文档**

写明：路径、7 属性、缺键不补、排除好感/图鉴、退出游戏、Steam Cloud、权利人、非官方。

- [ ] **Step 2: E2E 门控**

```ts
const path = process.env.RE2IRA_SAVE
describe.skipIf(!path)('re2ira real save (RE2IRA_SAVE)', () => {
  it('zero-edit round-trip', async () => {
    const fs = await import('node:fs')
    const bytes = new Uint8Array(fs.readFileSync(path!))
    const state = parse([{ relativePath: 'SaveData.dat', bytes }], { slotId: /* first meta */ })
    // resolve first slot from listSlotMetas
    const out = serialize(state)
    expect(out[0]!.bytes).toEqual(bytes)
  })
})
```

- [ ] **Step 3: 全量验证**

Run:

```powershell
npm test
npm run typecheck
```

Expected: 全部 PASS；贴输出。

- [ ] **Step 4: Commit**

```bash
git add docs README.md README.en.md CHANGELOG.md CHANGELOG.en.md tests/re2-i-rise-alone
git commit -m "docs(re2ira): game notes, HANDTEST, changelog; gate real-save e2e"
```

---

## Spec coverage

| Spec 项 | Task |
|---------|------|
| locate `Proudmate…/重生2…` + `SaveData.dat` | 4 |
| 手动+自动槽 | 3, 4 |
| 7 属性白名单、缺键不补、排除好感 | 3, 5 |
| AES-ECB-PKCS7 + 袋透传 + 零编辑字节一致 | 2, 3, 4 |
| 单文件多槽需要 slotId | 1, 4 |
| ResourcesTab + i18n + 风险提示 | 5 |
| 测试 / HANDTEST / README / CHANGELOG | 6 |
| 好感/图鉴 | 明确不做 |

## Self-review notes

- 无 TBD；密钥字面量仅落在 `crypto/aesEcb.ts`  
- `sealBag` 零脏必须短路原密文，避免 LitJson/键序问题  
- 宿主 `ParseContext` 为最小必要改动，避免模块读 Pinia  
