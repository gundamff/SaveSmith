# 存档酱品牌与游戏库 UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Chinese brand「存档酱」+ anime avatar logo, refresh the game library page atmosphere, and replace Wanderburg’s WB placeholder with a real Steam cover.

**Architecture:** Brand strings live in `src/host/config.ts` + i18n; avatar under `src/host/assets/brand/`; library/shell CSS updated in `LibraryPage.vue` / `GameCard.vue` / `App.vue` / `AboutDialog.vue`; Wanderburg module swaps `cover.svg` → `cover.jpg`.

**Tech Stack:** Vue 3, existing host i18n, Vitest, static image assets (PNG/JPG).

## Global Constraints

- Scope B only: topbar + library; do not redesign editor tabs.
- `productName` / install id stays `SaveSmith`.
- zh: show `SaveSmith · 存档酱`; en: `SaveSmith` only (no Chinese subtitle).
- No purple neon / Inter-only look; Chinese font fallback required.
- Prefer app-inner logo first; Tauri `icons/*` sync is best-effort.

---

### Task 1: Brand config + windowTitle helpers

**Files:**
- Modify: `src/host/config.ts`
- Modify: `src/host/sessionContext.ts`
- Modify: `tests/session-context.spec.ts`
- Modify: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts`
- Modify: `tests/i18n.spec.ts`

- [ ] Add `APP_NAME_ZH = '存档酱'` and `brandDisplayName(locale: 'zh' | 'en'): string` returning `SaveSmith · 存档酱` for zh and `SaveSmith` for en.
- [ ] Extend `windowTitle(appDisplayName, gameName)` usage so library title uses `brandDisplayName(locale)`.
- [ ] Add i18n keys `app.brandZh`, `library.subtitle`, `about.tagline` (zh/en).
- [ ] Update tests; run `npx vitest run tests/session-context.spec.ts tests/i18n.spec.ts`.

### Task 2: Logo asset + topbar / about

**Files:**
- Create: `src/host/assets/brand/cundang-chan.png` (generated avatar, circular-friendly)
- Modify: `src/host/App.vue`, `src/host/components/AboutDialog.vue`, `index.html`

- [ ] Generate anime tool-girl avatar; place under brand assets.
- [ ] Topbar: logo img + brand text from `brandDisplayName(locale)`.
- [ ] About: show logo + branded name + short tagline.
- [ ] Favicon: point `index.html` to brand asset if practical.

### Task 3: Library page + GameCard polish

**Files:**
- Modify: `src/host/components/LibraryPage.vue`, `src/host/components/GameCard.vue`, `src/host/App.vue` (`:root` fonts/colors)

- [ ] Library background atmosphere + subtitle.
- [ ] Cards: cover `object-fit: cover`, clearer hierarchy, primary CTA weight.
- [ ] Font stack with Chinese fallbacks.

### Task 4: Wanderburg cover

**Files:**
- Create: `src/games/wanderburg/cover.jpg`
- Modify: `src/games/wanderburg/index.ts`
- Delete: `src/games/wanderburg/cover.svg`

- [ ] Download Steam header/capsule for app `3624140`.
- [ ] Wire `cover.jpg`; remove SVG placeholder.

### Task 5: Verify + build

- [ ] `npx vitest run`
- [ ] `npm run dist` (user may need to close exe)
- [ ] Commit feature changes
