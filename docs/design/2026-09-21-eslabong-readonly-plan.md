# Eslabong 只读接入 Implementation Plan

> **For agentic workers:** 按任务顺序 TDD；每任务先红再绿。

**Goal:** 在存档酱中登记 Eslabong，只读展示侧车 JSON 槽位摘要。

**Architecture:** 独立 `GameModule`；侧车 JSON 驱动槽位与概览；`.res` 只透传原始字节；`rscc.ts` 仅供测试往返，不进 UI。路径模板用 `%USERPROFILE%\AppData\Roaming\...`（宿主只注入 USERPROFILE/DOCUMENTS）。

**Tech Stack:** Vue 3 + Vitest；Node `zlib` Zstd（RSCC）；宿主现有 `identifyNameRegex` / `slotFilePatterns`。

## Global Constraints

- 不改 JSON / `.res` / integrity。
- 真实存档不入库。
- 模块不碰 `fs` / 不 `invoke`。
- 文案键前缀 `es.`。

---

## Task 1: RSCC + sidecar 解析

**Files:** `src/games/eslabong/rscc.ts`, `src/games/eslabong/sidecar.ts`, `tests/eslabong/rscc.spec.ts`, `tests/eslabong/sidecar.spec.ts`

- [x] Red: 合成小载荷 RSCC 解压→再压→再解压明文一致
- [x] Green: 实现 `decompressRscc` / `compressRscc`
- [x] Red/Green: 解析侧车 JSON 字段与损坏处理

## Task 2: locate / slots / parse

**Files:** `locate.ts`, `slots.ts`, `parse.ts`, `index.ts`, `tests/eslabong/slots.spec.ts`, `tests/eslabong/module.spec.ts`

- [x] Red/Green: 槽位 id、排序、标题副标题、缺 `.res` 标记
- [x] Red/Green: parse 读侧车；serialize 原样返回；validate 空

## Task 3: UI + 登记 + 文档

**Files:** `views/OverviewTab.vue`, `views/index.ts`, `cover.jpg`, `registry.ts`, i18n, `docs/games/eslabong*.md`, README

- [x] 只读概览页 + `es.*` 文案
- [x] 登记模块；短文档
- [x] `npm test` 全绿
