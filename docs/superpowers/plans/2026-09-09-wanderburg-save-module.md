# Wanderburg Save Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SaveSmith 中落地第二款游戏模块 Wanderburg：嵌套 generation 槽位、MM JsonEncrypted 加解密、实证资源数值编辑、可勾选解锁列表（名 ?? ID）。

**Architecture:** 最小扩展宿主以支持嵌套相对路径槽位发现；`src/games/wanderburg` 实现完整 `GameModule`（crypto 留在模块内）。Key 未通时模块可登记但 `parse` 失败且禁写；破 Key 后接通 saveModel 与两个 Tab。

**Tech Stack:** 现有 Tauri 2 + Vue 3 + TypeScript + Vitest；AES-256-CBC + PBKDF2-SHA1，对齐 MoreMountains `MMSaveLoadManagerEncrypter`（优先 Web Crypto / 纯 TS，保证 WebView 与 Vitest 共用同一模块）。

## Global Constraints

- 规范：`docs/superpowers/specs/2026-09-09-wanderburg-save-module-design.md`
- 模块禁止 `fs` / 直接 `invoke`；`WanderburgState` 对宿主不透明。
- 写盘只用宿主 backup + 原子写；不编辑游戏自带 `SaveData.backup.json`。
- 资源：只暴露解密后实证数值字段；解锁：勾选已有集合；显示 `名 ?? id`；不凭空追加未知 ID。
- Key 未通：不宣称可改档；`DECRYPT_FAILED` 禁保存。
- 平台：Windows x64。rightsHolder：`Randwerk`。`steamAppId`：`3624140`。publisher：`Sidekick Publishing`。
- 真档路径（本机夹具，**不要提交真档到 git**）：`C:\Users\zhang\AppData\LocalLow\Randwerk\Wanderburg\Saves\Playtest\Generation_0002\SaveData.json`
- 源码 MIT；非官方、仅单机。

---

## File structure

```
src/sdk/types.ts                         # SaveLocator 增加 slotFilePatterns?
src/sdk/session.ts                       # matchSlotFilePatterns
src/host/tauri.ts                        # listRelativeFilePaths
src/host/stores/session.ts               # refreshSlots 读嵌套模式
src-tauri/src/lib.rs + fs_ops.rs         # list_relative_file_paths
src/host/i18n/zh.ts + en.ts              # wb.* + DECRYPT_FAILED
src/host/registry.ts                     # 登记 wanderburgModule
src/games/wanderburg/
  index.ts
  locate.ts
  slots.ts
  crypto/mmJsonEncrypted.ts
  crypto/keys.ts
  model/saveModel.ts
  parse.ts
  names.ts
  data/unlock-names.json
  views/inject.ts
  views/ResourcesTab.vue
  views/UnlockTab.vue
  views/index.ts
  cover.svg
tests/host-nested-slots.spec.ts
tests/wanderburg/crypto.spec.ts
tests/wanderburg/slots.spec.ts
tests/wanderburg/saveModel.spec.ts
tests/wanderburg/module.spec.ts
docs/HANDTEST.md
README.md / README.en.md
```

---

### Task 1: 宿主支持嵌套槽位文件发现

**Files:**
- Modify: `src/sdk/types.ts`
- Modify: `src/sdk/session.ts`
- Modify: `src-tauri/src/fs_ops.rs`, `src-tauri/src/lib.rs`
- Modify: `src/host/tauri.ts`, `src/host/stores/session.ts`
- Test: `tests/host-nested-slots.spec.ts`, `tests/session-store.spec.ts`（必要时）

**Interfaces:**
- Consumes: 现有 `SaveLocator.identifyAnyOf`、`list_dir_names`、`read_file_bytes`
- Produces:
  - `SaveLocator.slotFilePatterns?: string[]` — 单段 `*` 通配（例：`Saves/Playtest/Generation_*/SaveData.json`）
  - `listRelativeFilePaths(dir: string, maxDepth?: number): Promise<string[]>` — 正斜杠相对路径
  - `matchSlotFilePatterns(paths: string[], patterns: string[]): string[]`
  - `session.refreshSlots`：若模块声明 `slotFilePatterns`，读取匹配文件字节并入 `ListedFiles`；无 patterns 时行为与现网 Chaos Front 一致

- [ ] **Step 1: 写失败测试 — pattern 匹配**

```typescript
// tests/host-nested-slots.spec.ts
import { describe, expect, it } from 'vitest'
import { matchSlotFilePatterns } from '@sdk/session'

describe('matchSlotFilePatterns', () => {
  it('matches single-segment star', () => {
    const paths = [
      'Saves/Playtest/Generation_0001/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.backup.json',
      'Player.log'
    ]
    expect(
      matchSlotFilePatterns(paths, ['Saves/Playtest/Generation_*/SaveData.json'])
    ).toEqual([
      'Saves/Playtest/Generation_0001/SaveData.json',
      'Saves/Playtest/Generation_0002/SaveData.json'
    ])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- tests/host-nested-slots.spec.ts`  
Expected: FAIL — `matchSlotFilePatterns` not defined / not exported

- [ ] **Step 3: 实现 `matchSlotFilePatterns` + `SaveLocator.slotFilePatterns`**

```typescript
// src/sdk/types.ts — SaveLocator 增加：
slotFilePatterns?: string[]

// src/sdk/session.ts
export function matchSlotFilePatterns(paths: string[], patterns: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const pattern of patterns) {
    const parts = pattern.replace(/\\/g, '/').split('/')
    for (const raw of paths) {
      const path = raw.replace(/\\/g, '/')
      const segs = path.split('/')
      if (segs.length !== parts.length) continue
      let ok = true
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '*') continue
        if (parts[i]!.toLowerCase() !== segs[i]!.toLowerCase()) {
          ok = false
          break
        }
      }
      if (!ok) continue
      const key = path.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(path)
    }
  }
  return out
}
```

- [ ] **Step 4: Rust `list_relative_file_paths`**

```rust
// fs_ops.rs
pub fn list_relative_file_paths(root: &Path, max_depth: u32) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    fn walk(
        dir: &Path,
        root: &Path,
        depth: u32,
        max_depth: u32,
        out: &mut Vec<String>,
    ) -> Result<(), String> {
        if depth > max_depth {
            return Ok(());
        }
        let rd = fs::read_dir(dir).map_err(|e| e.to_string())?;
        for ent in rd {
            let ent = ent.map_err(|e| e.to_string())?;
            let path = ent.path();
            let name = ent.file_name().to_string_lossy().to_string();
            if name.eq_ignore_ascii_case("backup") {
                continue;
            }
            if path.is_dir() {
                walk(&path, root, depth + 1, max_depth, out)?;
            } else if path.is_file() {
                let rel = path.strip_prefix(root).map_err(|e| e.to_string())?;
                out.push(rel.to_string_lossy().replace('\\', "/"));
            }
        }
        Ok(())
    }
    walk(root, root, 0, max_depth, &mut out)?;
    out.sort();
    Ok(out)
}
```

注册 command；`tauri.ts`：`listRelativeFilePaths(dir, maxDepth = 6)`。

- [ ] **Step 5: 改 `session.refreshSlots`**

1. `names = listDirNames(dir)`
2. `files = readIdentifyFiles(dir, names, mod.locate.identifyAnyOf)`（保持现行为）
3. 若 `mod.locate.slotFilePatterns?.length`：
   - `all = listRelativeFilePaths(dir, 6)`
   - `matched = matchSlotFilePatterns(all, patterns)`
   - 对每个 matched：若尚未在 `files` 中，则 `readFileBytes` 追加
4. `slots = mod.listSlots({ dir, files })`

扩展 `SessionIo` 增加可选 `listRelativeFilePaths`；单测用假 IO。

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/host-nested-slots.spec.ts tests/session-store.spec.ts tests/session.spec.ts`  
Expected: PASS（Chaos Front / dummy 不回归）

- [ ] **Step 7: Commit**

```bash
git add src/sdk/types.ts src/sdk/session.ts src-tauri/src/fs_ops.rs src-tauri/src/lib.rs src/host/tauri.ts src/host/stores/session.ts tests/host-nested-slots.spec.ts tests/session-store.spec.ts
git commit -m "feat(host): discover nested slot files via slotFilePatterns"
```

---

### Task 2: Wanderburg 模块壳（locate / slots / registry / 占位 views）

**Files:**
- Create: `src/games/wanderburg/**`（crypto/saveModel 可先 stub）
- Modify: `src/host/registry.ts`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts`
- Test: `tests/wanderburg/slots.spec.ts`, `tests/wanderburg/module.spec.ts`

**Interfaces:**
- Consumes: Task 1 `slotFilePatterns`、`ListedFiles`
- Produces:
  - `wanderburgModule: GameModule<WanderburgState>`
  - `locate.windowsPathTemplates`: `['%USERPROFILE%\\AppData\\LocalLow\\Randwerk\\Wanderburg']`
  - `locate.identifyAnyOf`: `['Saves']`
  - `locate.slotFilePatterns`: `['Saves/Playtest/Generation_*/SaveData.json']`
  - `listSlots`：`id: generation-NNNN`，`sessionFiles: [相对路径]`
  - stub `parse`：`throw new ModuleError('DECRYPT_FAILED', [])` 直至 Task 4
  - views：两个 Tab 可挂载

- [ ] **Step 1: 写 `listSlots` 失败测试**

```typescript
// tests/wanderburg/slots.spec.ts
import { describe, expect, it } from 'vitest'
import { listSlots } from '../../src/games/wanderburg/slots'

describe('wanderburg listSlots', () => {
  it('maps Generation folders to slots', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: 'Saves/Playtest/Generation_0002/SaveData.json',
          bytes: new Uint8Array([1])
        }
      ]
    })
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      id: 'generation-0002',
      exists: true,
      readable: true,
      title: 'Generation 0002',
      sessionFiles: ['Saves/Playtest/Generation_0002/SaveData.json']
    })
  })

  it('marks missing bytes unreadable', () => {
    const slots = listSlots({
      dir: 'X',
      files: [
        {
          relativePath: 'Saves/Playtest/Generation_0001/SaveData.json',
          bytes: null
        }
      ]
    })
    expect(slots[0]!.readable).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/wanderburg/slots.spec.ts`  
Expected: FAIL — cannot resolve module

- [ ] **Step 3: 实现 locate + slots + index stub + registry**

```typescript
// locate.ts
export const locate = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\Randwerk\\Wanderburg'
  ],
  identifyAnyOf: ['Saves'],
  slotFilePatterns: ['Saves/Playtest/Generation_*/SaveData.json']
}

// slots.ts — 正则 /Generation_(\d+)\/SaveData\.json$/i
// parse stub — ModuleError('DECRYPT_FAILED', [])
```

catalog：

```typescript
{
  name: { zh: 'Wanderburg', en: 'Wanderburg' },
  cover: coverUrl,
  rightsHolder: 'Randwerk',
  developer: 'Randwerk',
  publisher: 'Sidekick Publishing',
  steamAppId: 3624140,
  summary: {
    zh: '非官方存档修改器。Early Access 格式可能变更；请先退出游戏再改档。',
    en: 'Unofficial save editor. Early Access formats may change. Quit the game before editing.'
  }
}
```

i18n：

```typescript
wb: { tabs: { resources: '资源', unlock: '解锁' } }
error: {
  DECRYPT_FAILED: '无法解密 Wanderburg 存档（密钥未适配或文件损坏）'
}
```

英文对称。`cover.svg` 可用简单占位。

- [ ] **Step 4: Run tests + typecheck**

Run: `npm test -- tests/wanderburg/slots.spec.ts tests/wanderburg/module.spec.ts`  
Run: `npm run typecheck`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/wanderburg src/host/registry.ts src/host/i18n/zh.ts src/host/i18n/en.ts tests/wanderburg
git commit -m "feat(wanderburg): register module shell with generation slots"
```

---

### Task 3: MM JsonEncrypted crypto（自造明文往返）

**Files:**
- Create: `src/games/wanderburg/crypto/keys.ts`
- Create: `src/games/wanderburg/crypto/mmJsonEncrypted.ts`
- Test: `tests/wanderburg/crypto.spec.ts`

**Interfaces:**
- Consumes: Web Crypto 或纯实现（**同一模块**供 Vitest + WebView）
- Produces:
  - `DEFAULT_SALT = 'SaltTextGoesHere'`（Feel 默认；真档证明不同则改）
  - `MM_KEY` 占位，Task 4 替换
  - `encryptUtf8ToSaveBytes(plainUtf8, key, salt?): Uint8Array` — 磁盘形态：Base64 文本的 UTF-8 字节
  - `decryptSaveBytesToUtf8(fileBytes, key, salt?): string`
  - 算法：PBKDF2-HMAC-SHA1，1000 次，32+16 → AES-256-CBC PKCS7 → Base64

- [ ] **Step 1: 写往返测试**

```typescript
import { describe, expect, it } from 'vitest'
import {
  decryptSaveBytesToUtf8,
  encryptUtf8ToSaveBytes
} from '../../src/games/wanderburg/crypto/mmJsonEncrypted'

describe('mmJsonEncrypted', () => {
  it('round-trips JSON text', async () => {
    const key = 'unit-test-key'
    const plain = '{"hello":1,"unlockedIDs":[1,2]}'
    const fileBytes = await encryptUtf8ToSaveBytes(plain, key)
    const text = new TextDecoder().decode(fileBytes)
    expect(text).toMatch(/^[A-Za-z0-9+/=\r\n]+$/)
    expect(await decryptSaveBytesToUtf8(fileBytes, key)).toBe(plain)
  })

  it('rejects wrong key', async () => {
    const fileBytes = await encryptUtf8ToSaveBytes('{"a":1}', 'right')
    await expect(decryptSaveBytesToUtf8(fileBytes, 'wrong')).rejects.toThrow()
  })
})
```

（若实现为同步，去掉 `async`/`await`，但 Web Crypto 通常为 async —— **选一种并在 parse 中 `await` 或提供同步 node 测试双端**；推荐：内部用同步 `node:crypto` 仅在 vitest 不可行时，优先写 **同步纯实现困难则 parse 改为同步包装：用 `pbkdf2Sync` 的 polyfill 不可用时，在模块顶层用预计算不可行。实用选择：vitest environment node + `node:crypto` sync；Vite 打包将该文件标为仅测试？不行。

**锁定：实现使用 Web Crypto 异步 API，则 `GameModule.parse` 仍为同步契约 —— 因此 crypto 必须在 WebView 内同步可用。**

采用在浏览器/Vitest 都能跑的做法：用 `@noble/ciphers` / 手写 AES 过重。检查仓库是否已有 crypto 依赖——Chaos Front 无。

**最终锁定（本计划强制）：** 用纯 TypeScript 调用 **同步** 算法：在 `mmJsonEncrypted.ts` 内实现 PBKDF2-SHA1 + AES-CBC 同步版工作量过大。改为：

1. 将加解密放在 **Rust 命令** `mm_decrypt` / `mm_encrypt` —— **违反「模块不 invoke」**。否决。
2. 依赖 `crypto-js` 或 `node-forge`（同步）—— 可接受，但要加依赖。
3. Vitest `environment: node` 且 Vite 对 `node:crypto` 做 polyfill —— 查现有 vite 配置。

查完后选 **最小改动**：若 Vite 不能 polyfill，添加依赖 `node-forge`（同步 AES/PBKDF2），体积可接受。

计划步骤写为：

```typescript
// 使用 node-forge（同步）
import forge from 'node-forge'
```

先 `npm install node-forge` + `@types/node-forge`（若需要）。

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/wanderburg/crypto.spec.ts`  
Expected: FAIL

- [ ] **Step 3: 安装依赖并实现**

```bash
npm install node-forge
npm install -D @types/node-forge
```

实现 `encryptUtf8ToSaveBytes` / `decryptSaveBytesToUtf8`（同步），算法同上。

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- tests/wanderburg/crypto.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/games/wanderburg/crypto tests/wanderburg/crypto.spec.ts
git commit -m "feat(wanderburg): add MM JsonEncrypted crypto helpers"
```

---

### Task 4: 攻破真档 Key 并接通 parse/serialize

**Files:**
- Modify: `src/games/wanderburg/crypto/keys.ts`
- Modify: `src/games/wanderburg/parse.ts`
- Create: `scripts/wanderburg-try-key.mjs`
- Test: `tests/wanderburg/crypto.spec.ts`（`WANDERBURG_SAVE` 环境变量 gate）

**Interfaces:**
- Consumes: Task 3；本机真档
- Produces: 实证 `MM_KEY`；`parse` / `serialize` / `validate`；失败 → `DECRYPT_FAILED`

- [ ] **Step 1: 本地试 Key 脚本**

`scripts/wanderburg-try-key.mjs`：读 save、对候选 key 调与模块相同的解密逻辑（可动态 import 编译产物或内联相同算法）。成功：明文 trim 后以 `{` 开头且 `JSON.parse` 成功。

Run:

```powershell
node scripts/wanderburg-try-key.mjs --save "$env:USERPROFILE\AppData\LocalLow\Randwerk\Wanderburg\Saves\Playtest\Generation_0002\SaveData.json"
```

- [ ] **Step 2: 写入 `keys.ts`**

```typescript
export const DEFAULT_SALT = 'SaltTextGoesHere'
export const MM_KEY = '<cracked-key>'
```

- [ ] **Step 3: 真档往返测试（有 env 才跑）**

```typescript
const savePath = process.env.WANDERBURG_SAVE
describe.runIf(!!savePath)('real save', () => {
  it('decrypts and re-encrypts', () => {
    const fs = require('node:fs') as typeof import('node:fs')
    const bytes = new Uint8Array(fs.readFileSync(savePath as string))
    const plain = decryptSaveBytesToUtf8(bytes, MM_KEY)
    const again = encryptUtf8ToSaveBytes(plain, MM_KEY)
    expect(decryptSaveBytesToUtf8(again, MM_KEY)).toBe(plain)
  })
})
```

- [ ] **Step 4: parse/serialize**

```typescript
export interface WanderburgState {
  relativePath: string
  doc: Record<string, unknown>
}

export function parse(files: SlotBytes[]): WanderburgState {
  const f = files.find((x) => /SaveData\.json$/i.test(x.relativePath))
  if (!f) throw new ModuleError('MISSING_FIELD', ['SaveData.json'])
  let text: string
  try {
    text = decryptSaveBytesToUtf8(f.bytes, MM_KEY)
  } catch {
    throw new ModuleError('DECRYPT_FAILED', [])
  }
  let doc: Record<string, unknown>
  try {
    doc = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new ModuleError('DECRYPT_FAILED', [])
  }
  return { relativePath: f.relativePath, doc }
}

export function serialize(state: WanderburgState): SerializedFile[] {
  const plain = JSON.stringify(state.doc)
  return [
    {
      relativePath: state.relativePath,
      bytes: encryptUtf8ToSaveBytes(plain, MM_KEY)
    }
  ]
}

export function validate(_state: WanderburgState): ValidationIssue[] {
  return []
}
```

- [ ] **Step 5: 手测载入** — 仍失败则停本 Task

- [ ] **Step 6: Commit**

```bash
git add src/games/wanderburg scripts/wanderburg-try-key.mjs tests/wanderburg
git commit -m "feat(wanderburg): wire decrypt key and parse/serialize gate"
```

---

### Task 5: saveModel — 资源字段 + 解锁集合

**Files:**
- Create: `src/games/wanderburg/model/saveModel.ts`
- Create: `src/games/wanderburg/names.ts`
- Create: `src/games/wanderburg/data/unlock-names.json`（初始 `{}`）
- Create: `tests/wanderburg/fixtures/sample-plain.json`（脱敏合成，勿提交真档）
- Test: `tests/wanderburg/saveModel.spec.ts`

**Interfaces:**
- Consumes: `doc`
- Produces:
  - `listResourceFields(doc): { path: string; value: number }[]`（深度 ≤3；跳过「纯 int 数组」解锁列表）
  - `getByPath` / `setByPath`
  - `listUnlockEntries(doc): { id: string; unlocked: boolean }[]` — 键名按真档固化（候选：`unlockedIDs` 等）
  - `setUnlock(doc, id, unlocked)`
  - `displayName(id)` → `unlock-names.json[id] ?? id`

- [ ] **Step 1: 依真档明文写 fixture + 测试**

```typescript
import sample from './fixtures/sample-plain.json'
import {
  listResourceFields,
  listUnlockEntries,
  setUnlock
} from '../../src/games/wanderburg/model/saveModel'

it('lists numeric resource fields', () => {
  expect(listResourceFields(sample).some((f) => typeof f.value === 'number')).toBe(true)
})

it('toggles unlock membership', () => {
  const doc = structuredClone(sample) as Record<string, unknown>
  const id = listUnlockEntries(doc)[0]!.id
  setUnlock(doc, id, false)
  expect(listUnlockEntries(doc).find((e) => e.id === id)?.unlocked).toBe(false)
})
```

- [ ] **Step 2: 实现至 PASS**

- [ ] **Step 3: Commit**

```bash
git add src/games/wanderburg/model src/games/wanderburg/names.ts src/games/wanderburg/data tests/wanderburg
git commit -m "feat(wanderburg): model resource fields and unlock set"
```

---

### Task 6: 资源 Tab + 解锁 Tab UI

**Files:**
- Create: `src/games/wanderburg/views/inject.ts`, `ResourcesTab.vue`, `UnlockTab.vue`, `index.ts`
- Test: `tests/wanderburg/views.spec.ts`（对齐 chaos-front views 测试风格）

**Interfaces:**
- Consumes: 宿主 `savesmithState` / `savesmithMutate` inject
- Produces: 两 Tab；`actions(): []`；`applyAction` 原样返回

- [ ] **Step 1: 写 views 测试（失败）**

- [ ] **Step 2: 实现 UI**

```typescript
export const wanderburgViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'wb.tabs.resources', component: ResourcesTab },
  { id: 'unlock', labelKey: 'wb.tabs.unlock', component: UnlockTab }
]
```

ResourcesTab：`listResourceFields` + number input + `setByPath`。  
UnlockTab：checkbox + `displayName`；全选/全不选仅当前列表。

- [ ] **Step 3: `npm run tauri dev` 手测保存后进游戏**

若游戏拒读：记录现象，**不**在本 Task 发明 checksum。

- [ ] **Step 4: Commit**

```bash
git add src/games/wanderburg/views tests/wanderburg/views.spec.ts
git commit -m "feat(wanderburg): resources and unlock editor tabs"
```

---

### Task 7: 文档与验收收尾

**Files:**
- Modify: `docs/HANDTEST.md`, `README.md`, `README.en.md`, `CHANGELOG.md`, `CHANGELOG.en.md`

- [ ] **Step 1: HANDTEST 增 Wanderburg 节**（探测、列槽、解密、改资源、改解锁、进游戏、错误 Key）

- [ ] **Step 2: README 声明第二款游戏（改档能力以 Key/往返通过为前提）**

- [ ] **Step 3: 全量验证**

Run: `npm test`  
Run: `npm run typecheck`  
Expected: 全绿

- [ ] **Step 4: Commit**

```bash
git add docs/HANDTEST.md README.md README.en.md CHANGELOG.md CHANGELOG.en.md
git commit -m "docs: Wanderburg handtest and README coverage"
```

---

## Spec coverage check

| Spec 项 | Task |
|---------|------|
| 完整 GameModule + registry | 2 |
| 嵌套 Generation 槽位 | 1 + 2 |
| MM JsonEncrypted | 3 + 4 |
| 壳 / Key 门禁并行 | 2 → 4 |
| 实证资源字段 | 5 + 6 |
| 解锁勾选 + 名??ID | 5 + 6 |
| 宿主备份原子写 | 沿用；Task 6 手测 |
| 不碰 SaveData.backup.json | Task 2 `sessionFiles` |
| HANDTEST / README | 7 |
| checksum 非目标 | 无任务 |

## Placeholder / 一致性自检

- Key 仅在 Task 4 实证后写入 `keys.ts`；无笼统 TBD。
- `slotFilePatterns` / `DECRYPT_FAILED` / `WanderburgState` 前后一致。
- Task 3 锁定 `node-forge` 同步 crypto，满足 `parse` 同步契约 + WebView。
