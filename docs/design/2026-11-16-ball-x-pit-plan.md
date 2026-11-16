# BALL x PIT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or subagent-driven-development. Steps use checkbox syntax.

**Goal:** 新模块 `ball-x-pit`：图鉴一键点亮（弹珠/被动/组合）+ 城镇四资源可写。

**Architecture:** Clean-room 二进制字段偏移补丁（UTF-16LE 字段名）；`metaN.yankai` + 可选 `_backup` 各自同语义补丁；未知字节透传。

**Tech Stack:** TypeScript、Vitest、Vue 3 + Element Plus、现有 `GameModule` / `useSessionBindings`。

**Spec:** `docs/design/2026-11-16-ball-x-pit-design.md`

## Global Constraints

- 模块不碰 `fs` / 不直接 `invoke`
- 不提交玩家真档；真档 E2E 环境变量门控 + skip
- 文案前缀 `bxp.`；权利人 Kenny Sun / Devolver Digital；Steam `2062430`
- `NumCombos`：保留 `values[0]===4`，只改 `1..count-1`
- 资源只改 `NumResources`（兼容 count 4/5）；不改 `TotalResources`
- 不实现敌人图鉴

---

### Task 1: binary 扫描 + envelope + 资源读写

**Files:**
- Create: `src/games/ball-x-pit/model/binary.ts`
- Create: `src/games/ball-x-pit/model/resources.ts`
- Test: `tests/ball-x-pit/binary.spec.ts`、`tests/ball-x-pit/resources.spec.ts`
- Fixture helper: `tests/ball-x-pit/fixtures.ts`（合成最小合法档，无真档）

**Produces:** `encodeFieldName`, `findUniqueField`, `validateEnvelope`, `readResources` / `writeResources`

- [ ] 合成 fixture：`0x02` + 根串 + 有序段名 + `NumResources` 数组 + 终端字段 + `0x05`
- [ ] 测 envelope 通过/失败；count=5 与 count=4 资源读写；未改字节一致
- [ ] 实现 `binary.ts` / `resources.ts` 至绿

### Task 2: wiki 投影 + unlockAllWiki

**Files:**
- Create: `src/games/ball-x-pit/model/wiki.ts`
- Test: `tests/ball-x-pit/wiki.spec.ts`

**Produces:** `projectWiki`, `unlockAllWiki`（同时可接受 `Uint8Array` 就地改）

- [ ] fixture 含 HeroStats/PassiveStats/NumHarvests + 若干 NumObtained/NumCombos
- [ ] 测：全 0→1；正值保留；marker 不动；维数不对抛错
- [ ] 实现至绿

### Task 3: locate / slots / parse / serialize / module

**Files:**
- Create: `src/games/ball-x-pit/{locate,slots,parse,actions,index}.ts`
- Create: `src/games/ball-x-pit/cover.jpg`
- Modify: `src/host/registry.ts`
- Test: `tests/ball-x-pit/module.spec.ts`、`slots.spec.ts`

**Produces:** `ballXPitModule`；serialize 返回 main[+backup]

- [ ] 测 registry、locate 模板、双文件写回、未 dirty 字节一致
- [ ] 实现并登记

### Task 4: UI + i18n

**Files:**
- Create: `src/games/ball-x-pit/views/{inject,index,ResourcesTab,WikiTab}.ts/vue`
- Modify: `src/host/i18n/zh.ts`、`en.ts`

- [ ] 资源四字段；图鉴进度 + 一键点亮；风险条
- [ ] typecheck 通过

### Task 5: 文档 + 全量验证

**Files:**
- Create: `docs/games/ball-x-pit.md`、`.en.md`
- Modify: `README.md`、`README.en.md`、`CHANGELOG.md`、`.en.md`、`docs/HANDTEST.md`
- Optional: `tests/ball-x-pit/e2e-real-save.spec.ts`（`BALLXPIT_SAVE` 门控）

- [ ] `npm test` && `npm run typecheck`（贴输出）
- [ ] 设计状态改为已实现

---

## Spec coverage

| Spec 项 | Task |
|---------|------|
| locate / slots / backup 双写 | 3 |
| 资源 Tab + count 4/5 | 1, 4 |
| 图鉴一键 + 进度 | 2, 4 |
| envelope 硬门槛 | 1, 3 |
| 文档 / HANDTEST / CHANGELOG | 5 |
| 敌人图鉴 | 明确不做 |
