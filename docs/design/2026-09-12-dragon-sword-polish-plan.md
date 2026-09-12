# DragonSword Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix multi-star slot glob, Steam cover, About disclaimer (never SaveSmith as rights holder), and README Shields badges.

**Architecture:** Extend `segmentMatches` to true glob (multi-`*`); dual About i18n keys; binary cover replace; static README badges. No new runtime deps.

**Tech Stack:** TypeScript, Vitest, Vue 3, existing i18n `t(key, ...args)`.

## Global Constraints

- Never interpolate `APP_NAME` / SaveSmith into About rights-holder slot
- Keep `locate.slotFilePatterns: ['*/*_Slot*.db']` for DragonSword
- Cover art attributed to HOUND13 / Steam store; no community-editor source copy
- Repo badges: `gundamff/SaveSmith`

## File map

| File | Role |
|------|------|
| `src/sdk/session.ts` | Fix `segmentMatches` multi-star |
| `tests/host-nested-slots.spec.ts` | Multi-star + regression tests |
| `src/host/i18n/zh.ts`, `en.ts` | `disclaimer` + `disclaimerGeneric` |
| `src/host/components/AboutDialog.vue` | Props + key selection |
| `src/host/App.vue` | Pass `game-name` |
| `tests/i18n.spec.ts` | Disclaimer assertions |
| `src/games/dragon-sword/cover.jpg` | Steam header |
| `src/games/dragon-sword/index.ts` | Drop placeholder summary |
| `docs/games/dragon-sword(.en).md` | Cover note |
| `README.md`, `README.en.md` | Shields |

---

### Task 1: Multi-star glob (TDD)

**Files:**
- Modify: `tests/host-nested-slots.spec.ts`
- Modify: `src/sdk/session.ts` (`segmentMatches`)

- [ ] **Step 1: Add failing tests**

```ts
it('matches multi-star segment (DragonSword slots)', () => {
  const paths = [
    '136330193/136330193_Slot1.db',
    '136330193/136330193_Slot2.db',
    '136330193/other.db',
    'readme.txt'
  ]
  expect(matchSlotFilePatterns(paths, ['*/*_Slot*.db'])).toEqual([
    '136330193/136330193_Slot1.db',
    '136330193/136330193_Slot2.db'
  ])
})

it('is case-insensitive for multi-star', () => {
  expect(
    matchSlotFilePatterns(['Acct/Acct_Slot1.DB'], ['*/*_slot*.db'])
  ).toEqual(['Acct/Acct_Slot1.DB'])
})
```

- [ ] **Step 2: Run — expect FAIL** (suffix `_Slot*.db` treated literally)

`npx vitest run tests/host-nested-slots.spec.ts`

- [ ] **Step 3: Implement**

Replace `segmentMatches` with: escape non-`*` chars for RegExp, replace each `*` with `.*`, wrap `^...$`, `i` flag. Keep `pattern === '*'` fast path optional.

- [ ] **Step 4: Run tests — PASS** (including existing Wanderburg case)

- [ ] **Step 5: Commit** `fix: match multi-star globs in slotFilePatterns`

---

### Task 2: About disclaimer

**Files:**
- Modify: `src/host/i18n/zh.ts`, `en.ts`
- Modify: `AboutDialog.vue`, `App.vue`
- Modify: `tests/i18n.spec.ts`

**Copy (zh):**
- `disclaimer`: `非官方工具。与 {0} / 《{1}》官方无任何关联、授权或合作。仅供已购买正版的玩家在本地、单机环境下学习研究。禁止用于联机或破坏多人公平。`
- `disclaimerGeneric`: `非官方工具。与各游戏官方无任何关联、授权或合作。仅供已购买正版的玩家在本地、单机环境下学习研究。禁止用于联机或破坏多人公平。`

**Copy (en):**
- `disclaimer`: `Unofficial tool. Not affiliated with, authorized by, or endorsed by {0} / {1}. For personal, offline study by owners of a legitimate copy only. Online / multiplayer use is prohibited.`
- `disclaimerGeneric`: `Unofficial tool. Not affiliated with, authorized by, or endorsed by any game publisher. For personal, offline study by owners of a legitimate copy only. Online / multiplayer use is prohibited.`

- [ ] **Step 1: Update i18n tests** — game case needs holder+name; generic must not contain `SaveSmith` / `存档酱` as rights party; keep offline/online phrases

- [ ] **Step 2: Run — FAIL** if keys/args wrong

- [ ] **Step 3: Wire strings + AboutDialog**

```vue
const props = defineProps<{ open: boolean; rightsHolder?: string; gameName?: string }>()
const disclaimerText = computed(() => {
  if (props.rightsHolder && props.gameName) {
    return t('about.disclaimer', props.rightsHolder, props.gameName)
  }
  return t('about.disclaimerGeneric')
})
```

App.vue: `:game-name="gameName"` (existing computed). Remove `APP_NAME` from AboutDialog disclaimer path (keep for other uses if any).

- [ ] **Step 4: `npx vitest run tests/i18n.spec.ts` PASS**

- [ ] **Step 5: Commit** `fix: About disclaimer names game rights holder, not SaveSmith`

---

### Task 3: Steam cover

**Files:** `cover.jpg`, `index.ts`, `docs/games/dragon-sword.md`, `.en.md`

- [ ] Download Steam header for app `4570720` (CDN `cdn.cloudflare.steamstatic.com/.../header.jpg` or store API `header_image`). On failure, try local Steam `librarycache`, else stop and ask user.

- [ ] Update `index.ts` summary (drop placeholder wording); remove “Cover is a placeholder” comment.

- [ ] Docs: one line — cover from Steam store header, © HOUND13.

- [ ] Commit `chore: replace DragonSword cover with Steam store header`

---

### Task 4: README Shields

After title / language switcher, before banner:

```md
<p align="center">
  <a href="https://github.com/gundamff/SaveSmith/releases"><img alt="downloads" src="https://img.shields.io/github/downloads/gundamff/SaveSmith/total" /></a>
  <a href="https://github.com/gundamff/SaveSmith/releases"><img alt="version" src="https://img.shields.io/github/v/release/gundamff/SaveSmith" /></a>
  <a href="https://github.com/gundamff/SaveSmith/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/gundamff/SaveSmith" /></a>
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-0078D4" />
</p>
```

Same in `README.en.md`. Commit `docs: add Shields.io badges to README`

---

### Task 5: Verify

- [ ] `npm test` and `npm run typecheck` (or project equivalents) — all green
- [ ] Manual note: reopen DragonSword — slots should list

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Multi-star glob | 1 |
| Steam cover + docs | 3 |
| About two-state, never APP_NAME | 2 |
| Four Shields | 4 |
| npm test / typecheck | 5 |
