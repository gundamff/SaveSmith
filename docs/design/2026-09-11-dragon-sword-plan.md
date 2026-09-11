# DragonSword Awakening Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clean-room `dragon-sword` GameModule that decrypts SQLCipher v4 slot DBs, edits the phase-1 gameplay surface, and re-encrypts with the same salt under SaveSmith’s existing host I/O.

**Architecture:** All crypto + SQLite stay inside `src/games/dragon-sword/` (bytes in/out). Host gains only a small `identifyNameRegex` hook so `SaveGames/<accountId>/` trees can be confirmed. UI follows existing inject + `savesmithRev` editor bindings. No community editor source is copied; public format docs are cited in headers and game docs.

**Tech Stack:** Vue 3, Element Plus, Vitest, TypeScript, `sql.js`, Web Crypto / `node:crypto` (tests), existing Tauri host I/O.

**Spec:** `docs/design/2026-09-11-dragon-sword-design.md`

## Global Constraints

- Clean-room only: no copy from gfriloux/DasNomNom implementations; cite https://github.com/gfriloux/dragonsword-save-editor/tree/main/docs
- Module never touches `fs` or Tauri `invoke`
- `*_DBID` / 64-bit masks as `string` (never JS `number` if > 2^53)
- Do not write `SPack_*.sav` or screenshots
- Do not unlock paid/unowned cosmetics; cosmetics tab = equip/view owned only
- Table rows for `el-table`: snapshot objects + `index`; `@update:model-value` only; root `:data-ss-rev`
- Passphrase constant from public format: `13314374259236352028` (SQLCipher v4 page codec as documented)
- Do not commit real player saves or raw game XML

## File map

| Path | Responsibility |
|------|----------------|
| `src/sdk/types.ts` | Optional `identifyNameRegex?: string` on `SaveLocator` |
| `src/sdk/session.ts` | `identifySaveDir` honors regex |
| `src/games/dragon-sword/crypto/sqlcipher.ts` | Encrypt/decrypt pages |
| `src/games/dragon-sword/crypto/passphrase.ts` | Constant + optional FNV doc helper |
| `src/games/dragon-sword/db/sqlite.ts` | sql.js open/export/integrity |
| `src/games/dragon-sword/model/types.ts` | `DragonSwordState` + row types |
| `src/games/dragon-sword/model/bitmask.ts` | uint64 bitmask helpers as string |
| `src/games/dragon-sword/model/loadSave.ts` | plaintext → state projection |
| `src/games/dragon-sword/model/applySave.ts` | state → SQL upserts on working DB |
| `src/games/dragon-sword/parse.ts` | parse/serialize/validate |
| `src/games/dragon-sword/locate.ts` | path templates + regex + patterns |
| `src/games/dragon-sword/slots.ts` | listSlots |
| `src/games/dragon-sword/catalog/*.json` | derived CID labels (may start minimal) |
| `src/games/dragon-sword/catalog/index.ts` | label lookup |
| `src/games/dragon-sword/i18n.ts` | zh/en module strings |
| `src/games/dragon-sword/views/*` | Tabs + inject |
| `src/games/dragon-sword/index.ts` | GameModule export |
| `src/games/dragon-sword/cover.jpg` | library cover |
| `src/host/registry.ts` | register module |
| `src/host/i18n/zh.ts` / `en.ts` | merge `ds.*` if host merges game trees (match CF/WB pattern) |
| `tests/dragon-sword/*.spec.ts` | crypto, parse, slots, bitmasks, views contract |
| `docs/games/dragon-sword.md` / `.en.md` | user docs |
| `README.md` / `README.en.md` / `CHANGELOG*.md` | listing |
| `scripts/dragon-sword-catalog.mjs` (optional late) | pak→JSON export instructions |

---

### Task 1: SQLCipher v4 codec (clean-room)

**Files:**
- Create: `src/games/dragon-sword/crypto/passphrase.ts`
- Create: `src/games/dragon-sword/crypto/sqlcipher.ts`
- Test: `tests/dragon-sword/sqlcipher.spec.ts`

**Interfaces:**
- Produces:
  - `export const SQLCIPHER_PASSPHRASE = '13314374259236352028'`
  - `export function decryptSqlCipher(encrypted: Uint8Array, passphrase?: string): Uint8Array`
  - `export function encryptSqlCipher(plaintext: Uint8Array, salt: Uint8Array, passphrase?: string): Uint8Array`
  - `export function readSalt(encrypted: Uint8Array): Uint8Array` (first 16 bytes)
- Constants: `PAGE_SIZE=4096`, `KDF_ITERATIONS=256000`, `HMAC_SALT_MASK=0x3a`, reserve = 16 IV + 64 HMAC

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { decryptSqlCipher, encryptSqlCipher, readSalt, SQLCIPHER_PASSPHRASE } from '../../src/games/dragon-sword/crypto/sqlcipher'

describe('sqlcipher', () => {
  it('round-trips a page-aligned buffer and preserves salt', () => {
    const salt = new Uint8Array(16)
    salt[0] = 0x42
    // plaintext: PAGE_SIZE bytes, first 16 = SQLite magic (tests may use zeros except magic)
    const plain = new Uint8Array(4096)
    plain.set(new TextEncoder().encode('SQLite format 3\0'), 0)
    plain[100] = 7
    const enc = encryptSqlCipher(plain, salt, SQLCIPHER_PASSPHRASE)
    expect(enc.length).toBe(4096)
    expect([...readSalt(enc)]).toEqual([...salt])
    const dec = decryptSqlCipher(enc, SQLCIPHER_PASSPHRASE)
    expect(dec[100]).toBe(7)
    expect(new TextDecoder().decode(dec.slice(0, 15))).toBe('SQLite format 3')
  })

  it('rejects HMAC mismatch', () => {
    const salt = new Uint8Array(16)
    const plain = new Uint8Array(4096)
    plain.set(new TextEncoder().encode('SQLite format 3\0'), 0)
    const enc = encryptSqlCipher(plain, salt)
    enc[enc.length - 1] ^= 0xff
    expect(() => decryptSqlCipher(enc)).toThrow(/HMAC|sqlcipher/i)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL** (module missing)

Run: `npm test -- tests/dragon-sword/sqlcipher.spec.ts`

- [ ] **Step 3: Implement codec**

Header comment must cite public format docs URL. Use `node:crypto` in Vitest and Web Crypto in browser if branched; or pure `node:crypto` via Vite polyfill only in tests and Web Crypto in app — pick one path and stick to it (prefer `globalThis.crypto.subtle` + sync fallback using `node:crypto` for PBKDF2 in tests).

Algorithm (must match public SQLCipher v4 description):
1. salt = bytes[0:16]
2. encKey = PBKDF2-HMAC-SHA512(passphrase UTF-8, salt, 256000, 32)
3. hmacSalt = salt[i] ^ 0x3a
4. hmacKey = PBKDF2-HMAC-SHA512(encKey, hmacSalt, 2, 32)
5. Per page: ciphertext excludes reserve; IV 16; HMAC-SHA512(hmacKey, ciphertext||IV||pageNo_le32)
6. Page 1: encrypted region starts after salt; decrypt replaces salt with SQLite magic

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/games/dragon-sword/crypto tests/dragon-sword/sqlcipher.spec.ts
git commit -m "feat(dragon-sword): add clean-room SQLCipher v4 page codec"
```

---

### Task 2: sql.js helpers + identifyNameRegex

**Files:**
- Modify: `src/sdk/types.ts` (`SaveLocator`)
- Modify: `src/sdk/session.ts` (`identifySaveDir`)
- Create: `src/games/dragon-sword/db/sqlite.ts`
- Test: `tests/dragon-sword/sqlite.spec.ts`
- Test: extend or add `tests/sdk-session-identify.spec.ts` if none exists (or fold into dragon-sword locate test)
- Modify: `package.json` — add dependency `sql.js`

**Interfaces:**
- Consumes: none from Task 1
- Produces:
  - `SaveLocator.identifyNameRegex?: string`
  - `identifySaveDir`: true if any `identifyAnyOf` hit OR any `fileNames` matches `new RegExp(identifyNameRegex)`
  - `openSqlite(bytes: Uint8Array): Promise<SqlJsDb>`
  - `exportSqlite(db): Uint8Array` (page-aligned length preserved/padded if needed)
  - `integrityCheck(db): void` throws on non-ok

- [ ] **Step 1: Failing tests for identifySaveDir regex**

```ts
it('accepts numeric account folder via identifyNameRegex', () => {
  const locator = { windowsPathTemplates: [], identifyAnyOf: [], identifyNameRegex: '^[0-9]+$' }
  expect(identifySaveDir(locator, ['136330193'])).toBe(true)
  expect(identifySaveDir(locator, ['SaveGames'])).toBe(false)
})
```

- [ ] **Step 2: Implement types + identifySaveDir; npm install sql.js**

- [ ] **Step 3: sqlite helper tests — create in-memory DB with one table, export, reopen, SELECT**

- [ ] **Step 4: Verify PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(dragon-sword): sql.js helpers and SaveLocator identifyNameRegex"
```

---

### Task 3: State model, parse/serialize skeleton, module shell

**Files:**
- Create: `src/games/dragon-sword/model/types.ts`
- Create: `src/games/dragon-sword/model/bitmask.ts`
- Create: `src/games/dragon-sword/model/loadSave.ts`
- Create: `src/games/dragon-sword/model/applySave.ts`
- Create: `src/games/dragon-sword/parse.ts`
- Create: `src/games/dragon-sword/locate.ts`
- Create: `src/games/dragon-sword/slots.ts`
- Create: `src/games/dragon-sword/index.ts`
- Create: `src/games/dragon-sword/views/index.ts` (empty tabs ok temporarily)
- Create: `src/games/dragon-sword/cover.jpg` (placeholder from store art or solid branded still — rights note in docs)
- Modify: `src/host/registry.ts`
- Test: `tests/dragon-sword/parse.spec.ts`, `tests/dragon-sword/slots.spec.ts`, `tests/dragon-sword/bitmask.spec.ts`

**Interfaces:**
- Produces `DragonSwordState`:

```ts
export interface DragonSwordState {
  relativePath: string
  salt: Uint8Array
  userDbid: string
  currencies: { itemCid: number; amount: number }[]
  stackables: { itemCid: number; stackCnt: number }[]
  characters: { characterCid: number; level: number; exp: number; ascend: number }[]
  teams: { pageId: number; slot1: number; slot2: number; slot3: number }[]
  equipment: {
    itemDbid: string
    itemCid: number
    enchantLevel: number
    exp: number
    isLock: number
    deletedDate: string
  }[]
  cookItems: {
    itemDbid: string
    itemCid: number
    stackCnt: number
    deletedDate: string
  }[]
  switches: { category: number; bitField: string }[]
  titles: { category: number; bitField: string; favBitField: string }[]
  karma: { /* columns confirmed from PRAGMA on real temp copy; all 64-bit ids as string */ }[]
  costumes: { costumeDbid: string; costumeCid: number; equipCharacterCid: number }[]
  vehicles: { vehicleDbid: string; vehicleCid: number }[]
  equipMounts: { characterCid: number; vehicleDbid: string }[]
  user: {
    regionCid: number
    sectionUid: string
    posX: number
    posY: number
    posZ: number
  }
}
```

- `parse(files)`: find `*_Slot*.db` → decrypt → loadSave projection  
- `serialize(state)`: open plaintext from decrypt(original) path — keep `state` as SoT: applySave onto fresh DB opened from **re-decrypt is wrong**; instead keep `plaintextBase: Uint8Array` on state OR re-apply: open sql.js on copy of bytes recovered by decrypting is only at parse — **store `plaintextBase` on state** (markRaw):

Add to state: `plaintextBase: Uint8Array`  
`serialize`: clone applySave → integrity → export → encrypt(salt) → decrypt verify equal export  

- `locate`:

```ts
export const locate = {
  windowsPathTemplates: [
    '%PROGRAMFILES(X86)%\\Steam\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    '%PROGRAMFILES%\\Steam\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'D:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'E:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames',
    'F:\\SteamLibrary\\steamapps\\common\\DragonSword  Awakening\\DS\\Saved\\SaveGames'
  ],
  identifyAnyOf: [],
  identifyNameRegex: '^[0-9]+$',
  slotFilePatterns: ['*/*_Slot*.db']
}
```

- `listSlots`: regex `/^(\d+)\/\1_Slot(\d+)\.db$/i` → id `${account}-${slot}`

- [ ] **Step 1: bitmask tests** (`setBit`/`hasBit` on decimal string uint64)

- [ ] **Step 2: Build minimal encrypted fixture in test via sql.js + encryptSqlCipher; parse → mutate currency → serialize → decrypt → SELECT**

- [ ] **Step 3: Implement load/apply for currencies + stackables first (other arrays empty ok); wire module with `views: []` temporarily only if host allows — if views required non-empty, ship stub CurrencyTab**

- [ ] **Step 4: Register in registry; typecheck**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(dragon-sword): module shell with parse/serialize and slot listing"
```

---

### Task 4: Currency + Items tabs + i18n + inject

**Files:**
- Create: `src/games/dragon-sword/views/inject.ts`
- Create: `src/games/dragon-sword/views/CurrencyTab.vue`
- Create: `src/games/dragon-sword/views/ItemsTab.vue`
- Create: `src/games/dragon-sword/i18n.ts`
- Modify: host i18n merge (same pattern as chaos-front / wanderburg)
- Modify: `views/index.ts`
- Test: `tests/dragon-sword/views.spec.ts` (inject + source contract: single root, data-ss-rev, no Electron bridge)

**Interfaces:**
- `useDsEditor()` like `useWbEditor`: `save`, `markDirty`, `rev`
- labelKey prefix `ds.tabs.*`

- [ ] **Step 1: Failing inject test**

- [ ] **Step 2: Implement tabs with snapshot rows; amount/stack InputNumber `@update:model-value`**

- [ ] **Step 3: actions `max-currency` optional in `index.ts` applyAction**

- [ ] **Step 4: Verify tests**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(dragon-sword): currency and stackable items editor tabs"
```

---

### Task 5: Characters + Team + Equipment tabs

**Files:**
- Create: `views/CharactersTab.vue`, `TeamTab.vue`, `EquipmentTab.vue`
- Extend: `loadSave.ts` / `applySave.ts` / `types.ts` if fields incomplete
- Test: parse round-trip for character level + equipment enchant; views source contract

- [ ] **Step 1: Tests for applySave updating `tb_character.LEVEL` and `tb_equipment.ENCHANT_LEVEL`**

- [ ] **Step 2: Implement tabs (equipment: enchant/exp/lock editable; stat CIDs read-only)**

- [ ] **Step 3: Team slots only allow CIDs present in `characters` (or 0 empty)**

- [ ] **Step 4: Verify + commit**

```bash
git commit -m "feat(dragon-sword): characters, team, and equipment tabs"
```

---

### Task 6: Cooking + recipe switches

**Files:**
- Create: `views/CookingTab.vue`
- Create: `catalog/recipes.json` (minimal: `{ "switchKey": number, "dishCid"?: number, "name": { "zh": string, "en": string } }[]` — start with empty/`[]` + CID UI if export not ready)
- Create: `model/recipes.ts` — map switchKey → category/bit
- Extend applySave for `tb_cook_item` + `tb_switch` UPSERT (OR bits; never wipe unrelated categories)

**Rules from public docs:**
- Recipe known bit: `category = switchKey / 64`, `bit = switchKey % 64`
- Do not blanket `-1` on categories 0/5; only OR known recipe keys from catalog
- Soft-deleted cook rows: `DELETED_DATE !== '0'` / non-zero — hide or filter active only

- [ ] **Step 1: Unit test bit mapping for switchKey 1002 → category 15 bit 42**

- [ ] **Step 2: Implement unlock/lock recipe + stack edit**

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat(dragon-sword): cooking items and recipe switch unlocks"
```

---

### Task 7: Titles + Karma + Unlock characters

**Files:**
- Create: `views/UnlockTab.vue` (titles + character unlock if stored as rows in `tb_character` / init tables — **only insert characters that appear in catalog as free/story earnable**)
- Create: `catalog/titles.json`, `catalog/characters.json` (minimal ok)
- Title writes: UPSERT `BIT_FIELD` only; preserve `FAV_BIT_FIELD` (no INSERT OR REPLACE wiping fav)
- Karma: after opening a temp decrypted save locally, `PRAGMA table_info(tb_karma)` and pin editable numeric columns in types; do not guess unpaid fields

- [ ] **Step 1: Test title bitmask UPSERT preserves fav**

- [ ] **Step 2: Implement Unlock + Karma UI**

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat(dragon-sword): titles, karma, and character unlock surfaces"
```

---

### Task 8: Cosmetics (owned only) + World

**Files:**
- Create: `views/CosmeticsTab.vue`, `views/WorldTab.vue`
- applySave: update `EQUIP_CHARACTER_CID` / `tb_equip_mount.VEHICLE` only for DBID already in state; **no INSERT of new costume/vehicle CIDs** in phase 1
- World: edit `tb_user` pos + region fields already on state

- [ ] **Step 1: Test that applySave refuses to add costume rows (assert row count unchanged when UI only equips)**

- [ ] **Step 2: Implement tabs**

- [ ] **Step 3: Verify + commit**

```bash
git commit -m "feat(dragon-sword): owned cosmetics equip and world position tab"
```

---

### Task 9: Catalog bootstrap + labels

**Files:**
- Create: `src/games/dragon-sword/catalog/index.ts`
- Create: minimal JSON for currencies (`1000xxx`), empty arrays elsewhere if needed
- Create: `scripts/README-dragon-sword-catalog.md` **or** section in game doc describing how to export derived JSON from local pak (no raw XML commit)
- Wire `catalogLabel(cid)` into tabs

- [ ] **Step 1: Test unknown CID renders `#12345`**

- [ ] **Step 2: Implement lookup**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(dragon-sword): CID catalog labels with fallback"
```

---

### Task 10: Docs, README, changelog, validate polish

**Files:**
- Create: `docs/games/dragon-sword.md`, `docs/games/dragon-sword.en.md`
- Modify: `README.md`, `README.en.md` support table
- Modify: `CHANGELOG.md`, `CHANGELOG.en.md`
- Ensure crypto/index headers cite format docs
- `validate()`: non-negative amounts/stacks; finite positions; team CIDs exist or 0

- [ ] **Step 1: Write docs (path, quit game, Steam Cloud, offline warning, format attribution link, rights holder HOUND13, AppID 4570720)**

- [ ] **Step 2: validate unit tests**

- [ ] **Step 3: `npm test` && `npm run typecheck` full suite**

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: add DragonSword Awakening module docs and changelog"
```

---

### Task 11: Optional real-save smoke (local only)

**Files:**
- Test: `tests/dragon-sword/smoke-real-save.spec.ts` gated by `process.env.DSA_TEST_SAVE`

- [ ] **Step 1: If env set, copy save to temp, parse, bump currency +1, serialize, decrypt, SELECT amount**

- [ ] **Step 2: Ensure CI skips when unset**

- [ ] **Step 3: Commit**

```bash
git commit -m "test(dragon-sword): optional real-save smoke behind DSA_TEST_SAVE"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Clean-room + format citation | 1, 10 |
| SQLCipher round-trip | 1, 3 |
| sql.js integrity | 2, 3 |
| locate SaveGames + slots | 2, 3 |
| Currency / items | 4 |
| Characters / team / equipment | 5 |
| Cooking / recipes | 6 |
| Titles / karma / unlock | 7 |
| Cosmetics owned-only / world | 8 |
| Catalog derived labels | 9 |
| README / game docs / changelog | 10 |
| Real save smoke | 11 |
| No GVAS writes | 3 serialize only `.db` |
| No paid unlock inserts | 8 |
| Bigint as string | 3 types |

## Placeholder / consistency self-review

- Removed vague “pin later” — Task 7 requires `PRAGMA table_info` on a local temp copy before typing karma columns.
- `plaintextBase` added so serialize does not depend on undefined bytes.
- `identifyNameRegex` names match types + session + locate.
- Recipe bit formula fixed to public doc example (1002 → 15/42).
