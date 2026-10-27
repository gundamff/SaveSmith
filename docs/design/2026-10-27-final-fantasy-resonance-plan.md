# FINAL FANTASY RESONANCE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为存档酱新增 `final-fantasy-resonance` 模块：定位 `GameSaveData*.sav`，SVHD/AES/GVAS 往返，按 P0→P2 交付对齐社区完整可编辑面（主线 Journal 只读）。

**Architecture:** Clean-room。`crypto` 负责 SVHD+SHA-1+AES-256-ECB；`model/gvasIndex` 对解密后的 GVAS 建路径索引（标量/布尔/数组/Map），未知区间按 size 跳过；投影层只暴露白名单；原地改标量，增删走 append 并修正父 tag size 与 AES 16 字节填充。不复制社区源码；公开格式常数写入模块注释并致谢。

**Tech Stack:** TypeScript、Vitest、Vue 3、Element Plus、现有宿主；AES 用 Web Crypto 或 `node-forge`（仓内已有）；无新重依赖。

**Spec:** [2026-10-27-final-fantasy-resonance-design.md](./2026-10-27-final-fantasy-resonance-design.md)

## Global Constraints

- 模块不碰 `fs`、不直接 `invoke` Tauri
- 不编辑 `OptionSaveData.sav` / `EnhancedInputUserSettings.sav`
- Clean-room：不粘贴 ffr-save-editor 源码；可对照公开 README 格式说明与真档对拍
- 未知 GVAS 属性透传（保留原字节；禁止按残缺 schema 重生整档）
- Journal 主线/剧情计数默认只读
- 不提交玩家真档；真档 E2E 用 `FFR_SAVE`（目录或单文件）门控，无则 `skip`
- i18n 前缀：`ffr.`
- P0 未过写回硬门槛前，禁止可写 UI / 增删
- locate：`%USERPROFILE%\AppData\Local\FFRS\Steam\*`
- 堆叠超上限：写回时 **钳制到 catalog 上限**（无上限则不钳），UI 警告

## File map

| Path | Responsibility |
|------|----------------|
| `src/games/final-fantasy-resonance/crypto/svhd.ts` | SVHD 头、SHA-1、AES-256-ECB |
| `src/games/final-fantasy-resonance/model/gvasIndex.ts` | GVAS 路径索引 + get/set/append |
| `src/games/final-fantasy-resonance/model/types.ts` | `FinalFantasyResonanceState` |
| `src/games/final-fantasy-resonance/model/saveModel.ts` | 投影 / 写回白名单 |
| `src/games/final-fantasy-resonance/model/featureFlags.ts` | P0/P1/P2 门闩 |
| `src/games/final-fantasy-resonance/parse.ts` | parse / serialize / validate |
| `src/games/final-fantasy-resonance/locate.ts` | 路径模板 |
| `src/games/final-fantasy-resonance/slots.ts` | 槽位列表 |
| `src/games/final-fantasy-resonance/actions.ts` | Quick / 增删动作 |
| `src/games/final-fantasy-resonance/catalog/*` | 派生名称表 + SOURCE |
| `src/games/final-fantasy-resonance/views/*` | Tab UI |
| `src/games/final-fantasy-resonance/index.ts` | GameModule |
| `src/host/registry.ts` | 静态登记 |
| `src/host/i18n/zh.ts` / `en.ts` | `ffr.*` |
| `tests/final-fantasy-resonance/*.spec.ts` | 单元 + env 真档 |
| `docs/games/final-fantasy-resonance.md` + `.en.md` | 用户文档 |
| `README*.md` / `CHANGELOG*.md` / `docs/HANDTEST.md` | 列表与手测 |

---

### Task 1: SVHD crypto 往返

**Files:**
- Create: `src/games/final-fantasy-resonance/crypto/svhd.ts`
- Test: `tests/final-fantasy-resonance/svhd.spec.ts`

**Interfaces:**
- Produces:
  - `HEADER_SIZE = 32`
  - `decryptSvhd(raw: Uint8Array): { header: Uint8Array; plain: Uint8Array }`
  - `encryptSvhd(header: Uint8Array, plain: Uint8Array): Uint8Array`
- Throws `ModuleError('INVALID_FORMAT' | 'CHECKSUM_MISMATCH', ...)`

**Format constants（公开事实，注释注明来源致谢）：**

- Magic ASCII `SVHD`
- Bytes 4–7: two `u16le` version fields（透传原 header 前 8 字节除 checksum 外）
- Bytes 8–27: SHA-1 of ciphertext body
- Bytes 28–31: zeros
- Body: AES-256-ECB, key UTF-8 `wwrqPkdwzPvgfchQ8kTYHVbn4umTf3d7`（32 bytes），no padding mode（明文须 `% 16 === 0`）

- [ ] **Step 1: 写失败测试**

```ts
// tests/final-fantasy-resonance/svhd.spec.ts
import { describe, expect, it } from 'vitest'
import { decryptSvhd, encryptSvhd } from '../../src/games/final-fantasy-resonance/crypto/svhd'

describe('svhd', () => {
  it('rejects non-SVHD', () => {
    expect(() => decryptSvhd(new Uint8Array(64))).toThrow()
  })

  it('roundtrips synthetic block', async () => {
    const plain = new Uint8Array(32)
    plain[0] = 0x47; plain[1] = 0x56; plain[2] = 0x41; plain[3] = 0x53
    const header = new Uint8Array(32)
    header[0] = 0x53; header[1] = 0x56; header[2] = 0x48; header[3] = 0x44
    header[4] = 1; header[6] = 1
    const enc = await encryptSvhd(header, plain)
    const { plain: out } = await decryptSvhd(enc)
    expect(Array.from(out)).toEqual(Array.from(plain))
  })
})
```

- [ ] **Step 2: 实现 `svhd.ts`（async SHA-1 via `crypto.subtle`；AES-ECB via forge 或 subtle 若可用）**
- [ ] **Step 3: `npx vitest run tests/final-fantasy-resonance/svhd.spec.ts` 通过**
- [ ] **Step 4: 可选 env 真档** — 若 `FFR_SAVE` 指向 `.sav`，断言解密后头四字节为 `GVAS`，再加密 SHA-1 一致且游戏可载入（手测）；自动化只断言 `GVAS` + encrypt 自洽
- [ ] **Step 5: Commit** `feat(ffr): SVHD AES decrypt/encrypt roundtrip`

---

### Task 2: GVAS 路径索引（只读解析 + 标量 set）

**Files:**
- Create: `src/games/final-fantasy-resonance/model/gvasIndex.ts`
- Test: `tests/final-fantasy-resonance/gvasIndex.spec.ts`
- Fixture: 由 Task 1 真档解密写入 `tests/final-fantasy-resonance/fixtures/plain-min.bin` **仅当**可从公开/自造最小 GVAS 生成；否则测试用合成最小 GVAS（`GVAS` 头 + 空 props `None`）+ env 真档测字段

**Interfaces:**
- Produces:
  - `parseGvasIndex(plain: Uint8Array): GvasIndex`
  - `GvasIndex` 含 `fields` / `boolRefs` / `arrays` / `maps` / `end`
  - `getInt(index, plain, path): number`
  - `setInt(plain, index, path, value): void`（原地）
  - `padAes(plain: Uint8Array): Uint8Array` — 截到 `end` 后补 0 到 16 对齐

- [ ] **Step 1: 合成最小 GVAS 夹具 + 失败测试（parse 未实现）**
- [ ] **Step 2: 实现 UE5.5+ 属性标签扫描（type 带 inner type 列表；Bool 在 flags `0x10` 或 size=1）**
- [ ] **Step 3: env 真档断言存在路径** `Gil` 或社区已知标量之一（探路时打印 top paths 写入本 plan 附录）；无 env 则 skip
- [ ] **Step 4: Commit** `feat(ffr): GVAS path index for UE5.5 saves`

---

### Task 3: parse/serialize 模块骨架 + locate/slots/registry

**Files:**
- Create: `parse.ts`, `locate.ts`, `slots.ts`, `actions.ts`, `index.ts`, `model/types.ts`, `model/saveModel.ts`, `model/featureFlags.ts`, `views/index.ts`（先 Overview 只读）
- Modify: `src/host/registry.ts`, i18n
- Test: `tests/final-fantasy-resonance/module.spec.ts`

**Interfaces:**
- `FinalFantasyResonanceState = { header: Uint8Array; plain: Uint8Array; index: GvasIndex; gil: number; slotMeta: ... }`
- `featureFlags.writableScalars = false` until P0 handgate noted in code comment after env test green
- locate templates as design
- slots: `GameSaveData(\d+)\.sav` → title 自动档 / 槽 N

- [ ] **Step 1: 测试 identify + parse 出 gil（env 或夹具）**
- [ ] **Step 2: 实现骨架；serialize = encryptSvhd(header, padAes(plain))**
- [ ] **Step 3: registry + 最小 cover（可用纯色占位 jpg，docs 声明）**
- [ ] **Step 4: `npm test` 相关 + `npm run typecheck`**
- [ ] **Step 5: Commit** `feat(ffr): register module with read-only slot parse`

---

### Task 4: P1 白名单标量可写

**Files:**
- `saveModel.ts`, `views/*Tab.vue`, `featureFlags.ts`
- Test: set Gil 后 serialize 再 parse 数值不变；env 可选

白名单初值（路径以 Task 2 真档探路为准，实现时写入常量）：

- `Gil`（或实际路径）
- 角色 `unitParameterList[i].*` 等级/经验/HP/MP
- `inventory[i].Num`（只改已有）

- [ ] **Step 1: 打开 `writableScalars`；Records/Status 最小 Tab**
- [ ] **Step 2: 测试 + typecheck**
- [ ] **Step 3: Commit** `feat(ffr): editable gil and character scalars`

---

### Task 5: P2 完整面 — Items/Artifacts/Maps/Bestiary/Visions/Journal/Quick

**Files:**
- `gvasIndex.ts` append helpers；`actions.ts`；各 Tab；`catalog/*.json` + `SOURCE.md`
- Tests per subsystem

行为对齐设计 §可编辑面；增删：

- Items：同 ID 改 Num，否则 append `{ItemId, Num}`
- Artifacts：map `artifactList` int→`IsActive`
- Maps：`Map.perMapSaveDataMap` flags
- 主线 Journal 字段不进可写绑定

- [ ] **Step 1: catalog 最小子集（从安装目录抽，脚本可放 `scripts/ffr-extract-catalog.mts`）**
- [ ] **Step 2: append API + Items/Artifacts 测试**
- [ ] **Step 3: 其余 Tab + Quick actions**
- [ ] **Step 4: docs/games + README + CHANGELOG + HANDTEST**
- [ ] **Step 5: `npm test` && `npm run typecheck` 贴输出**
- [ ] **Step 6: Commit** `feat(ffr): full save editor surface (P2)`

---

## Spec coverage checklist

| Spec 项 | Task |
|---------|------|
| SVHD/AES/SHA-1 | 1 |
| GVAS 索引 | 2 |
| locate/slots/registry | 3 |
| P0 往返硬门槛 | 1–3 + HANDTEST |
| P1 标量 | 4 |
| P2 完整面+增删 | 5 |
| Clean-room / 致谢 | 全文注释 + docs |
| 不碰 Option | locate/slots 过滤 |
| 真档门控 | 各测试 `FFR_SAVE` |

## 附录：字段路径探路

实现 Task 2 时对解密 plain 跑路径 dump，把确认的 `Gil` / `inventory` / `unitParameterList` 等路径回填本附录（替换下列占位）：

- Gil: （探路后填写）
- inventory: `inventory[i].ItemId` / `inventory[i].Num`
- artifacts: `artifactList`
- maps: `Map.perMapSaveDataMap`
