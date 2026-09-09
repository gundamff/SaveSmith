# SaveSmith v1 Host + Chaos Front Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SaveSmith 仓库落地 Tauri 2 桌面宿主、编译期游戏模块契约，并把 Chaos Front 存档修改器迁入为第一个模块，功能不低于现有 Electron 修改器。

**Architecture:** 渲染进程只持有不透明草稿 `S`；模块提供 locate / parse / serialize / actions / views，不碰磁盘。Rust 只做选目录、按相对路径读写字节、备份（每文件最近 10 份）和原子写。游戏通过 `src/host/registry.ts` 静态 import 登记。

**Tech Stack:** Tauri 2、Vue 3、TypeScript、Vite、Vitest、Pinia；Chaos Front 的 views 继续用 Element Plus；Rust 标准库做 IO（不用通用 fs 插件把整个磁盘暴露给前端）。

## Global Constraints

- 平台：Windows x64；不承诺 macOS/Linux 发版。
- 模块禁止直接调用 Tauri/`fs`；禁止运行时加载外部插件。
- `GameState` 对宿主不透明；`id` 只存在 `GameModule.id`。
- 备份：时间戳 + 原文件名，每个被写入的文件保留最近 10 份；失败不删已有备份。
- `steamAppId` 选填；Chaos Front 必须为 `2770330`。商店 URL：`https://store.steampowered.com/app/{id}`。
- 关于页仓库/捐赠 URL 未配置则隐藏按钮。无账号、订阅、广告、自动更新、第二款游戏。
- 错误用稳定 `code` + `args`，宿主 i18n；解析层不写给用户看的中英句子。
- 源码许可证 MIT。游戏素材/名称归权利人；非官方、仅限单机。
- 现有修改器路径：`D:\eclipse\git\chaos-front-save-editor`（只读迁入，不要改那个仓库除非用户另说）。
- 规范：`docs/superpowers/specs/2026-09-09-savesmith-host-module-design.md`

---

## File structure

```
SaveSmith/
  package.json
  vite.config.ts
  vitest.config.ts
  index.html
  src/
    main.ts                      入口：Pinia + 宿主 App
    sdk/
      types.ts                   GameModule / Catalog / Action / Slot 类型
      steam.ts                   steamStoreUrl()
      session.ts                 字节比较、serialize 健全性、模板展开、目录判定
      error.ts                   ModuleError(code, args)
    host/
      App.vue                    库页 / 编辑页切换
      registry.ts                静态登记 chaosFrontModule
      config.ts                  APP 名、GITHUB_REPO_URL、DONATION_URL（可空字符串）
      i18n.ts / i18n/zh.ts / i18n/en.ts
      tauri.ts                   invoke 包装（只暴露白名单命令）
      stores/session.ts          当前游戏、目录、槽位、草稿、脏标记、备份
      components/
        LibraryPage.vue
        GameCard.vue
        EditorPage.vue
        SlotList.vue
        ActionBar.vue
        BackupPanel.vue
        AboutDialog.vue
        DirtyConfirm.vue
    games/chaos-front/
      index.ts                   导出 GameModule
      cover.svg                  占位封面
      locate.ts
      slots.ts                   listSlots + summarize
      actions.ts
      parse.ts                   会话 parse/serialize/validate
      views/index.ts             ViewSpec[]
      views/*.vue                从旧编辑器迁入的深页
      data/                      game-data.json + 素材（从旧仓库复制）
      model/                     es3.ts / saveModel.ts / level.ts / gameData.ts
  src-tauri/
    src/lib.rs                   注册命令
    src/fs_ops.rs                备份、原子写、还原、删除、路径安全
    capabilities/default.json
    tauri.conf.json
  tests/
    sdk.spec.ts
    session.spec.ts
    dummyModule.ts
    chaos-front/*.spec.ts        从旧仓库迁入的解析测试
  scripts/extract-game-data.mjs  从旧仓库复制
```

---

### Task 1: Tauri 2 + Vue 3 脚手架

**Files:**
- Create: `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/host/App.vue`, `src-tauri/**`（由 create-tauri-app 生成后整理）
- Create: `.gitignore`（若无：包含 `node_modules`、`dist`、`src-tauri/target`）
- Keep: `docs/` 下已有 spec/plan/企划书

**Interfaces:**
- Consumes: 无
- Produces: `npm run dev` / `npm run tauri dev` 可启动；`npm run build` 能编出前端；identifier `com.savesmith.app`；窗口标题 `SaveSmith`

- [ ] **Step 1: 在已有仓库根生成 Tauri Vue TS 工程（保留 docs）**

PowerShell，工作目录 `D:\eclipse\git\SaveSmith`：

```powershell
npm create tauri-app@latest . --yes -- --template vue-ts --manager npm
```

若因目录非空失败：在 `%TEMP%\savesmith-cta` 生成，再把 `src-tauri`、`package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`、`.gitignore` 合并进仓库根，**不要覆盖** `docs/`。

生成后立刻改这些字段（以实际生成文件为准）：

- `src-tauri/tauri.conf.json`：`productName` = `SaveSmith`，`identifier` = `com.savesmith.app`
- `package.json`：`name` = `savesmith`；scripts 保留 `tauri`、`dev`、`build`；再加 `"test": "vitest run"`、`"typecheck": "vue-tsc --noEmit"`
- 把脚手架默认 `src/App.vue` 挪到 `src/host/App.vue`，`src/main.ts` 改为挂载它

`src/main.ts`：

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './host/App.vue'

createApp(App).use(createPinia()).mount('#app')
```

`vite.config.ts` 增加 alias 与忽略 `src-tauri`：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, 'src/sdk'),
      '@host': path.resolve(__dirname, 'src/host'),
      '@games': path.resolve(__dirname, 'src/games')
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    watch: { ignored: ['**/src-tauri/**'] }
  }
})
```

安装：`npm install pinia`，以及后续 Task 需要的 `vitest`、`vue-tsc`（dev）。

- [ ] **Step 2: 验证脚手架**

```powershell
npm install
npm run build
```

Expected: 退出码 0，产出 `dist/`。

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html src src-tauri .gitignore
git commit -m "feat: 初始化 Tauri 2 + Vue 3 脚手架"
```

---

### Task 2: SDK 类型 + 假模块契约测试

**Files:**
- Create: `src/sdk/types.ts`, `src/sdk/steam.ts`, `src/sdk/error.ts`
- Create: `tests/dummyModule.ts`, `tests/sdk.spec.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: 无
- Produces: 下列导出，后续任务必须同名同形状使用

`src/sdk/error.ts`：

```ts
export class ModuleError extends Error {
  readonly code: string
  readonly args: Array<string | number>
  constructor(code: string, args: Array<string | number> = []) {
    super(code)
    this.name = 'ModuleError'
    this.code = code
    this.args = args
  }
}
```

`src/sdk/steam.ts`：

```ts
export function steamStoreUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`
}

export function resolveStoreUrl(catalog: { steamAppId?: number; storeUrl?: string }): string | null {
  if (catalog.steamAppId != null) return steamStoreUrl(catalog.steamAppId)
  if (catalog.storeUrl) return catalog.storeUrl
  return null
}
```

`src/sdk/types.ts`（完整契约）：

```ts
import type { Component } from 'vue'

export type LocaleText = { zh: string; en: string }

export interface GameCatalog {
  name: LocaleText
  cover: string
  rightsHolder: string
  summary?: LocaleText
  developer?: string
  publisher?: string
  steamAppId?: number
  storeUrl?: string
  website?: string
}

export interface SaveLocator {
  windowsPathTemplates: string[]
  identifyAnyOf: string[]
}

export interface ListedFile {
  relativePath: string
  bytes: Uint8Array | null
}

export interface ListedFiles {
  dir: string
  files: ListedFile[]
}

export interface SlotInfo {
  id: string
  exists: boolean
  readable: boolean
  title?: string
  subtitle?: string
  sessionFiles: string[]
}

export interface SlotBytes {
  relativePath: string
  bytes: Uint8Array
}

export type ActionKind = 'button' | 'toggle' | 'number' | 'slider' | 'select'

export interface ActionSpec {
  id: string
  labelKey: string
  kind: ActionKind
  disabled?: boolean
  value?: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: { value: string; labelKey: string }[]
}

export interface ValidationIssue {
  code: string
  args: Array<string | number>
}

export interface SerializedFile {
  relativePath: string
  bytes: Uint8Array
}

export interface ViewSpec {
  id: string
  labelKey: string
  component: Component
}

export interface GameModule<S = unknown> {
  id: string
  catalog: GameCatalog
  locate: SaveLocator
  listSlots(files: ListedFiles): SlotInfo[]
  parse(files: SlotBytes[]): S
  serialize(state: S): SerializedFile[]
  validate(state: S): ValidationIssue[]
  actions(state: S): ActionSpec[]
  applyAction(state: S, id: string, payload?: unknown): S
  views: ViewSpec[]
}

export const BACKUP_KEEP = 10
```

- [ ] **Step 1: 写失败测试**

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { include: ['tests/**/*.spec.ts'], environment: 'node' },
  resolve: {
    alias: {
      '@sdk': path.resolve(__dirname, 'src/sdk'),
      '@host': path.resolve(__dirname, 'src/host'),
      '@games': path.resolve(__dirname, 'src/games')
    }
  }
})
```

`tests/dummyModule.ts`：假游戏，state 为 `{ gold: number }`，文件 `save.txt` 正文为十进制数字。

- `id`: `dummy`
- `listSlots`：有 `save.txt` 则一个可读槽 `slot-0`，`sessionFiles: ['save.txt']`
- `parse`：读 `save.txt` UTF-8 整数
- `serialize`：写回 `save.txt`
- `validate`：`gold < 0` 则 `{ code: 'NEGATIVE_GOLD', args: [] }`
- `actions`：一个 `button`，`id: 'fill'`，`applyAction('fill')` 把 gold 设为 999
- `views`: `[]`

`tests/sdk.spec.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { resolveStoreUrl, steamStoreUrl } from '@sdk/steam'
import { dummyModule } from './dummyModule'

describe('steamStoreUrl', () => {
  it('prefers steamAppId over storeUrl', () => {
    expect(steamStoreUrl(2770330)).toBe('https://store.steampowered.com/app/2770330')
    expect(resolveStoreUrl({ steamAppId: 2770330, storeUrl: 'https://example.com' })).toBe(
      'https://store.steampowered.com/app/2770330'
    )
    expect(resolveStoreUrl({})).toBeNull()
  })
})

describe('dummy GameModule contract', () => {
  const files = {
    dir: 'X:\\saves',
    files: [{ relativePath: 'save.txt', bytes: new TextEncoder().encode('10') }]
  }

  it('lists a readable slot and fill action mutates state', () => {
    const slots = dummyModule.listSlots(files)
    expect(slots[0]).toMatchObject({ id: 'slot-0', readable: true, sessionFiles: ['save.txt'] })
    let state = dummyModule.parse([{ relativePath: 'save.txt', bytes: files.files[0].bytes! }])
    expect(state.gold).toBe(10)
    expect(dummyModule.actions(state)[0].id).toBe('fill')
    state = dummyModule.applyAction(state, 'fill')
    expect(state.gold).toBe(999)
    expect(dummyModule.validate(state)).toEqual([])
    const out = dummyModule.serialize(state)
    expect(new TextDecoder().decode(out[0].bytes)).toBe('999')
  })

  it('validate blocks negative gold', () => {
    const state = { gold: -1 }
    expect(dummyModule.validate(state)[0].code).toBe('NEGATIVE_GOLD')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```powershell
npx vitest run tests/sdk.spec.ts
```

Expected: FAIL，`@sdk/steam` 或 `dummyModule` 不存在。

- [ ] **Step 3: 实现 SDK + dummyModule（含 `views: []` 的空组件占位不必上 Vue）**

dummy 的 `views` 用空数组即可。`applyAction` 未知 id 抛 `ModuleError('UNKNOWN_ACTION', [id])`。

- [ ] **Step 4: 跑测试确认通过**

```powershell
npx vitest run tests/sdk.spec.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/sdk tests vitest.config.ts package.json package-lock.json
git commit -m "feat: 加入 GameModule SDK 契约与假模块测试"
```

---

### Task 3: 宿主纯函数（模板、判定、脏文件、serialize 健全性）

**Files:**
- Create: `src/sdk/session.ts`
- Create: `tests/session.spec.ts`

**Interfaces:**
- Consumes: `SaveLocator`, `SerializedFile`, `SlotBytes`, `BACKUP_KEEP` from `src/sdk/types.ts`
- Produces:
  - `expandWindowsTemplate(template: string, env: NodeJS.Dict<string | undefined>): string`
  - `identifySaveDir(locator: SaveLocator, fileNames: string[]): boolean`
  - `utf8Encode(s: string): Uint8Array` / `utf8Decode(b: Uint8Array): string`
  - `bytesEqual(a: Uint8Array, b: Uint8Array): boolean`
  - `changedFiles(original: SlotBytes[], next: SerializedFile[]): SerializedFile[]`
  - `assertSerializeSane(files: SerializedFile[]): void` — 空列表或任一条 `bytes.length === 0` 抛 `ModuleError('EMPTY_SERIALIZE', [])`

`expandWindowsTemplate`：把 `%VAR%` 换成 `env[VAR] ?? ''`（大小写按 Windows 环境变量名原样匹配 `USERPROFILE`）。

`identifySaveDir`：`locator.identifyAnyOf` 任一文件名（大小写不敏感）出现在 `fileNames` 中则为 true。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import {
  assertSerializeSane,
  changedFiles,
  expandWindowsTemplate,
  identifySaveDir
} from '@sdk/session'
import { ModuleError } from '@sdk/error'

describe('expandWindowsTemplate', () => {
  it('replaces USERPROFILE', () => {
    expect(
      expandWindowsTemplate('%USERPROFILE%\\AppData\\LocalLow\\X', { USERPROFILE: 'C:\\Users\\a' })
    ).toBe('C:\\Users\\a\\AppData\\LocalLow\\X')
  })
})

describe('identifySaveDir', () => {
  const loc = { windowsPathTemplates: [], identifyAnyOf: ['savedata0.cf', 'collection.cf'] }
  it('accepts when any identify file exists', () => {
    expect(identifySaveDir(loc, ['savedata2.cf', 'config.cf'])).toBe(true)
    expect(identifySaveDir(loc, ['config.cf'])).toBe(false)
  })
})

describe('changedFiles', () => {
  const enc = (s: string) => new TextEncoder().encode(s)
  it('returns only modified paths', () => {
    const orig = [{ relativePath: 'a.cf', bytes: enc('1') }, { relativePath: 'b.cf', bytes: enc('2') }]
    const next = [
      { relativePath: 'a.cf', bytes: enc('1') },
      { relativePath: 'b.cf', bytes: enc('3') }
    ]
    const c = changedFiles(orig, next)
    expect(c).toHaveLength(1)
    expect(c[0].relativePath).toBe('b.cf')
  })
})

describe('assertSerializeSane', () => {
  it('rejects empty list and empty bytes', () => {
    expect(() => assertSerializeSane([])).toThrow(ModuleError)
    expect(() => assertSerializeSane([{ relativePath: 'a', bytes: new Uint8Array() }])).toThrow(ModuleError)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```powershell
npx vitest run tests/session.spec.ts
```

Expected: FAIL，`@sdk/session` 不存在。

- [ ] **Step 3: 实现 `src/sdk/session.ts`**

- [ ] **Step 4: 跑测试确认通过**

```powershell
npx vitest run tests/session.spec.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src/sdk/session.ts tests/session.spec.ts
git commit -m "feat: 宿主会话纯函数（路径模板、脏文件、序列化检查）"
```

---

### Task 4: Rust 备份 + 原子写

**Files:**
- Create: `src-tauri/src/fs_ops.rs`
- Modify: `src-tauri/src/lib.rs`（先只 `mod fs_ops`，命令注册在 Task 5）
- Modify: `src-tauri/Cargo.toml` 若需要 `chrono`（时间戳用 `chrono::Utc`；没有则用 `SystemTime` 格式化 YYYYMMDDHHMMSS）

**Interfaces:**
- Consumes: 无 TS。约定与旧修改器兼容：`backup/{stem}_{yyyymmddhhmmss}{ext}.bak`，例如 `savedata0_20260909120000.cf.bak`
- Produces:
  - `pub const BACKUP_KEEP: usize = 10;`
  - `pub fn safe_join(dir: &Path, relative: &str) -> Result<PathBuf, String>` — 拒绝 `..`、绝对路径、反斜杠规范化后仍逃出 `dir`
  - `pub fn backup_name(original_file_name: &str, stamp: &str) -> String`
  - `pub fn prune_backups(backup_dir: &Path, stem: &str, keep: usize) -> Result<(), String>`
  - `pub fn write_atomic(save_dir: &Path, relative: &str, bytes: &[u8]) -> Result<String, String>` — 若目标存在则先拷到 `backup/`，再写 `.{name}.tmp-{millis}`，再 `rename`；返回备份文件名（新建文件无原件则备份名为空字符串）
  - `pub fn list_backups(save_dir: &Path, relative: &str) -> Result<Vec<BackupInfo>, String>`
  - `pub fn restore_backup(save_dir: &Path, relative: &str, backup_file_name: &str) -> Result<(), String>` — 只允许 `backup/` 下文件名 `^[A-Za-z0-9._-]+\.bak$`；还原前对当前目标再 `write_atomic` 式备份
  - `pub fn delete_backup(save_dir: &Path, backup_file_name: &str) -> Result<(), String>`
  - `pub struct BackupInfo { pub name: String, pub mtime_ms: u64, pub size: u64 }`

`backup_name("savedata0.cf", "20260101000000")` → `"savedata0_20260101000000.cf.bak"`。

`prune_backups`：`backup_dir` 中 `starts_with(stem + "_") && ends_with(".bak")`，按 mtime 降序，删掉超过 `keep` 的。

- [ ] **Step 1: 写 Rust 单元测试（放在 `fs_ops.rs` 的 `#[cfg(test)] mod tests`）**

覆盖：

1. `prune_backups` 13 个文件保留 10 个最新
2. `write_atomic` 写入非法 JSON 不是 Rust 的职责；写入成功且原文件变成备份
3. 目标已有内容时 `write_atomic` 失败路径：在 rename 前把 tmp 写成只读目录模拟困难——至少测「写入新内容后目标等于新字节、backup 目录多一份旧内容」
4. `delete_backup("..\\x.bak")` 失败
5. `safe_join(dir, "..\\Windows\\x")` 失败

测试用 `tempfile` crate 或 `std::env::temp_dir` + 随机子目录。在 `Cargo.toml` `[dev-dependencies]` 加 `tempfile = "3"`。

- [ ] **Step 2: 跑测试确认失败**

```powershell
cd src-tauri
cargo test fs_ops --offline
```

若第一次无 lock 离线失败，去掉 `--offline`。Expected: FAIL（模块不存在或测试红）。

- [ ] **Step 3: 实现 `fs_ops.rs`**

`write_atomic` 伪代码：

```rust
let target = safe_join(save_dir, relative)?;
if let Some(parent) = target.parent() { std::fs::create_dir_all(parent).ok(); }
let backup_dir = save_dir.join("backup");
std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
let mut backup_written = String::new();
if target.exists() {
    let stamp = /* UTC YYYYMMDDHHMMSS */;
    let name = backup_name(file_name, &stamp);
    let dest = backup_dir.join(&name);
    std::fs::copy(&target, &dest).map_err(|e| e.to_string())?;
    backup_written = name;
    prune_backups(&backup_dir, stem_of(file_name), BACKUP_KEEP)?;
}
let tmp = target.with_file_name(format!(
    ".{}.tmp-{}",
    target.file_name().unwrap().to_string_lossy(),
    now_millis
));
std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
std::fs::rename(&tmp, &target).map_err(|e| e.to_string())?;
Ok(backup_written)
```

Windows 上 `rename` 替换已有文件可用 `std::fs::rename`；若失败则 `fs::remove_file` + rename（仅当 rename 报 already exists）。不要在失败时删除 `backup/` 里新文件。

- [ ] **Step 4: 跑测试确认通过**

```powershell
cd src-tauri
cargo test fs_ops
```

Expected: PASS。

- [ ] **Step 5: Commit**

```powershell
git add src-tauri
git commit -m "feat: Rust 原子写盘与备份轮转"
```

---

### Task 5: Tauri 命令白名单

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/Cargo.toml` — `tauri-plugin-dialog`
- Create: `src/host/tauri.ts`
- Create: `src/host/config.ts`

**Interfaces:**
- Consumes: `fs_ops::*`
- Produces: 前端仅通过 `src/host/tauri.ts` 调用：

```ts
export interface BackupInfoDto {
  name: string
  mtimeMs: number
  size: number
}

export function pickFolder(): Promise<string | null>
export function listDirNames(dir: string): Promise<string[]>
export function readFileBytes(dir: string, relativePath: string): Promise<Uint8Array>
export function writeAtomic(dir: string, relativePath: string, bytes: Uint8Array): Promise<string>
export function listBackups(dir: string, relativePath: string): Promise<BackupInfoDto[]>
export function restoreBackup(dir: string, relativePath: string, name: string): Promise<void>
export function deleteBackup(dir: string, name: string): Promise<void>
export function appVersion(): Promise<string>
export function openExternal(url: string): Promise<void>
```

`openExternal`：Rust 侧只允许 URL 以 `https://store.steampowered.com/`、`https://github.com/`、`https://afdian.com/`、`https://ko-fi.com/`、`https://buymeacoffee.com/` 开头，否则 `Err("URL_NOT_ALLOWED")`。

`src/host/config.ts`：

```ts
export const APP_NAME = 'SaveSmith'
export const GITHUB_REPO_URL = ''
export const DONATION_URL = ''
```

Rust 命令签名（serde camelCase）：

```rust
#[tauri::command]
fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String>;

#[tauri::command]
fn list_dir_names(dir: String) -> Result<Vec<String>, String>;

#[tauri::command]
fn read_file_bytes(dir: String, relative_path: String) -> Result<Vec<u8>, String>;

#[tauri::command]
fn write_atomic(dir: String, relative_path: String, bytes: Vec<u8>) -> Result<String, String>;

#[tauri::command]
fn list_backups(dir: String, relative_path: String) -> Result<Vec<BackupInfo>, String>;

#[tauri::command]
fn restore_backup(dir: String, relative_path: String, name: String) -> Result<(), String>;

#[tauri::command]
fn delete_backup(dir: String, name: String) -> Result<(), String>;

#[tauri::command]
fn app_version() -> String;

#[tauri::command]
fn open_external(url: String) -> Result<(), String>;
```

`pick_folder` 用 `tauri_plugin_dialog::DialogExt` 的 blocking folder picker。

capabilities：允许上述自定义命令 + `dialog:allow-open`（若插件需要）。**不要**加 `fs:default` 全盘权限。

- [ ] **Step 1: 实现命令与 `src/host/tauri.ts`（用 `@tauri-apps/api/core` 的 `invoke`）**

`readFileBytes` 把 `number[]`/`ArrayBuffer` 转 `Uint8Array`。

- [ ] **Step 2: 编译 Rust**

```powershell
cd src-tauri
cargo check
```

Expected: 无 error。

- [ ] **Step 3: Commit**

```powershell
git add src-tauri src/host/tauri.ts src/host/config.ts
git commit -m "feat: 暴露存档 IO 的 Tauri 命令白名单"
```

---

### Task 6: 宿主 i18n + 游戏库页

**Files:**
- Create: `src/host/i18n/zh.ts`, `src/host/i18n/en.ts`, `src/host/i18n/index.ts`（模式抄 `chaos-front-save-editor/src/renderer/src/i18n`：`t(key, ...args)`、`{0}`、localStorage key `savesmith-locale`、默认跟系统语言）
- Create: `src/host/registry.ts`（先 `export const modules: GameModule[] = []`，Task 9 再 push Chaos Front）
- Create: `src/host/components/LibraryPage.vue`, `src/host/components/GameCard.vue`
- Modify: `src/host/App.vue`

**Interfaces:**
- Consumes: `GameModule`, `resolveStoreUrl`, `expandWindowsTemplate`, `identifySaveDir`, `listDirNames`, `pickFolder`
- Produces: 库页列出 `modules`；卡片显示 `catalog.name[locale]`、`cover`、`rightsHolder`；`resolveStoreUrl` 非空才显示「Steam / 商店」按钮并 `openExternal`；探测状态：对每个模块用 `locate.windowsPathTemplates` + `USERPROFILE` 展开，`listDirNames` 后 `identifySaveDir`

宿主文案 key（zh/en 都要写满）：

- `library.title` 游戏库
- `library.detected` 已找到存档目录
- `library.missing` 未找到，请手动选择
- `library.chooseDir` 选择存档目录
- `library.openGame` 打开
- `library.store` 商店页
- `library.unrecognized` 此目录不是该游戏的存档
- `nav.about` 关于
- `nav.langZh` 中文 / `nav.langEn` English

封面：`catalog.cover` 为模块内 import 的 URL 字符串（Vite `?url`）。registry 为空时库页显示空列表，不崩溃。

探测失败不崩溃，卡片显示 `library.missing`。

- [ ] **Step 1: 实现 i18n + Library UI，语言切换在顶栏**

`GameCard` 不要用 Element Plus。深色卡片 + 封面 + 标题即可。

选目录成功后：若 `identifySaveDir` 为 false，提示 `library.unrecognized`，不进入编辑页。

- [ ] **Step 2: `npm run typecheck` 与 `npx vitest run`**

Expected: 全绿。

- [ ] **Step 3: Commit**

```powershell
git add src/host
git commit -m "feat: 游戏库页与宿主 i18n"
```

---

### Task 7: 编辑页壳（槽位、动作条、views 出口、备份、关于、脏标记）

**Files:**
- Create: `src/host/stores/session.ts`
- Create: `src/host/components/EditorPage.vue`, `SlotList.vue`, `ActionBar.vue`, `BackupPanel.vue`, `AboutDialog.vue`
- Modify: `src/host/App.vue`

**Interfaces:**
- Consumes: Task 2–5 全部 API；`GameModule<unknown>`
- Produces: Pinia `useSessionStore`：

```ts
game: GameModule | null
saveDir: string
slots: SlotInfo[]
currentSlotId: string | null
state: unknown | null
original: SlotBytes[]
dirty: boolean
backups: BackupInfoDto[]
loadError: string | null
```

流程函数（写在 store 内，供页面调用）：

1. `openGame(mod, dir)`：`listDirNames` + 对 locate 需要的文件 `readFileBytes`（读失败则 `bytes: null`）→ `listSlots` → 进入编辑页。
2. `loadSlot(slotId)`：若 `dirty`，先由 UI 确认。读 `slot.sessionFiles`，缺文件或 `bytes` 失败则该槽不可载入。`parse` 抛错 → `loadError`，不设 state。成功则 `original = files`，`dirty = false`，`listBackups` 对每个 session 文件都拉（UI 按文件分组或合并列表，至少主槽文件）。
3. `runAction(id, payload?)`：`state = applyAction(state, id, payload)`，`dirty = true`。
4. `mutate(mutator: (s: unknown) => unknown)`：views 用；执行后 `dirty = true`。
5. `save()`：`issues = validate(state)` 非空则返回 issues、不写盘。`next = serialize(state)`，`assertSerializeSane(next)`。`changedFiles(original, next)` 对每个文件 `writeAtomic`。成功后 `original = next` 映射回 SlotBytes，`dirty = false`，刷新备份与槽位。
6. `restore(relativePath, backupName)`：`restoreBackup` 后重新 `loadSlot`。
7. `goLibrary()`：dirty 则确认。

`ActionBar.vue`：按 `actions(state)` 渲染。v1 实现 `button`（必须）以及 `toggle`/`number`（有则渲染，无则忽略）。点 button 调 `runAction(id)`。

`EditorPage`：左侧/顶部槽位；动作条；`v-for` views 用 `<component :is="view.component">`；`provide('savesmithMutate', mutate)` 与 `provide('savesmithState', () => state)` 供模块 views。

关于框：`appVersion()`、`t('about.disclaimer', game.catalog.rightsHolder)`、`GITHUB_REPO_URL`/`DONATION_URL` 空则不渲染按钮。免责声明中英写明：非官方、仅限正版单机、禁止联机。

未保存切槽位/回库：`window.confirm` 即可（v1 不强制自定义模态）。

提示「请先退出游戏」：编辑页常驻一条 `t('editor.quitGame')`。

- [ ] **Step 1: 实现 store + 壳组件**

宿主错误 i18n：`error.NEGATIVE_GOLD` 不必给生产游戏；通用 `error.EMPTY_SERIALIZE`、`error.UNKNOWN_ACTION`、`error.URL_NOT_ALLOWED`。`translateError` 逻辑与旧编辑器相同：有 `code` 且 `error.{code}` 存在则翻译。

- [ ] **Step 2: typecheck + vitest**

```powershell
npm run typecheck
npx vitest run
```

Expected: PASS。

- [ ] **Step 3: Commit**

```powershell
git add src/host
git commit -m "feat: 编辑页壳（动作条、槽位、备份、脏标记）"
```

---

### Task 8: 迁入 Chaos Front 解析层与测试

**Files:**
- Create by copy from `D:\eclipse\git\chaos-front-save-editor`:
  - `src/common/es3.ts` → `src/games/chaos-front/model/es3.ts`
  - `src/common/saveModel.ts` → `src/games/chaos-front/model/saveModel.ts`
  - `src/common/level.ts` → `src/games/chaos-front/model/level.ts`
  - `src/common/gameData.ts` → `src/games/chaos-front/model/gameData.ts`
  - `src/common/data/game-data.json` → `src/games/chaos-front/data/game-data.json`
  - `tests/es3.spec.ts`, `tests/level.spec.ts`, `tests/saveModel.spec.ts`, `tests/gameData.spec.ts`, `tests/fixtures/minimal-save.json` → `tests/chaos-front/`（保持相对 import 能编译）
- Do **not** copy `src/main/files.ts` 或 `tests/files.spec.ts`（IO 已在 Rust）
- Do **not** copy `tests/e2e-real-save.spec.ts` 进 CI；可放 `tests/chaos-front/e2e-real-save.spec.ts` 并在文件头加 `describe.skipIf(!process.env.CF_SAVE)` 以免无档失败

修 import：`saveModel.ts` 对 `./es3`、`./gameData`、`./level` 的相对路径。

`gameData.ts` 里 json 路径改为 `../data/game-data.json`。

Vitest 测 `SaveError` 时，把 `saveModel.ts` 里 `SaveData.load` 缺少字段仍抛的 `new Error('存档缺少字段...')` **改成** `throw new ModuleError('MISSING_FIELD', [key])`（从 `@sdk/error` 引入）。`assertDeployedHavePilots` 已用 `SaveError`：把 `SaveError` 改成 `export { ModuleError as SaveError } from '@sdk/error'` 或让 `SaveError` 继承/等于 `ModuleError`，避免两套错误类型。

推荐：`saveModel.ts` 删除自己的 `SaveError` 类，改为 `import { ModuleError as SaveError } from '@sdk/error'`。

- [ ] **Step 1: 复制文件并修正 import 后跑旧测试**

```powershell
npx vitest run tests/chaos-front
```

Expected: 与旧仓库相同的用例通过。若 `files.spec.ts` 被误拷，删掉。

- [ ] **Step 2: 复制素材目录**

从旧仓库复制 `src/renderer/src/assets/game/` → `src/games/chaos-front/assets/game/`（体积大，必须进 git 以便离线 UI）。复制 `scripts/extract-game-data.mjs` → `scripts/extract-game-data.mjs`，改默认 `--out` 注释为本仓库 `src/games/chaos-front`。

- [ ] **Step 3: Commit**

```powershell
git add src/games/chaos-front tests/chaos-front scripts
git commit -m "feat: 迁入 Chaos Front 解析层与单元测试"
```

---

### Task 9: Chaos Front `GameModule`（locate / slots / parse / actions）

**Files:**
- Create: `src/games/chaos-front/cover.svg`（简单占位几何图形 + 文字 Chaos Front，非官方素材）
- Create: `src/games/chaos-front/locate.ts`, `slots.ts`, `parse.ts`, `actions.ts`, `index.ts`
- Create: `tests/chaos-front/module.spec.ts`
- Modify: `src/host/registry.ts`

**Interfaces:**
- Consumes: `SaveData`, `loadCollectionText`, `serializeCollectionText`, `maxCollection`, `GameModule`
- Produces: `export const chaosFrontModule: GameModule<ChaosFrontState>`

```ts
export interface ChaosFrontState {
  campaign: SaveData
  collection: CollectionSnapshot | null
  slot: number
}
```

`locate`：

```ts
export const locate: SaveLocator = {
  windowsPathTemplates: [
    '%USERPROFILE%\\AppData\\LocalLow\\ChaosGalaxyStudio\\Chaos Front'
  ],
  identifyAnyOf: [
    'savedata0.cf', 'savedata1.cf', 'savedata2.cf', 'savedata3.cf',
    'savedata4.cf', 'savedata5.cf', 'collection.cf'
  ]
}
```

`listSlots`：槽 `0..5`，文件 `savedata{n}.cf`。不存在：`exists: false`, `readable: false`, `sessionFiles: []`。存在但 `bytes === null` 或 summarize/parse 头失败：`exists: true`, `readable: false`。可读：`sessionFiles: ['savedata{n}.cf', 'collection.cf']`（collection 没有也要带上，parse 时缺省 `collection: null`）。`title` 用军团名，`subtitle` 用天数。

把旧 `summarize` 从 `files.ts` 搬到 `slots.ts`（只解析字节，不读盘）。

`parse(files)`：必须含 `savedata{n}.cf`；用 `SaveData.load(utf8Decode(bytes))`。`collection.cf` 可选，`loadCollectionText`，失败则 `collection: null` 不抛。从文件名解析 `slot`。

`serialize`：始终输出 campaign 文件；若 `collection !== null` 再输出 `collection.cf`。campaign 文本用 `campaign.serialize()` 再 `utf8Encode`。

`validate`：调用 `campaign.assertDeployedHavePilots()`，捕获 `ModuleError` 变成 `ValidationIssue[]`；无问题返回 `[]`。不要在 validate 里 throw。

`actions(state)`（均为 `kind: 'button'`）：

| id | labelKey | 行为 |
|----|----------|------|
| `fill-resources` | `cf.actions.fillResources` | 信用/威望/星级拉满（调用现有资源 setter；对照 `ResourcesTab` 的 maxAll：读旧组件里具体数值上限并复用 SaveData 字段写入） |
| `max-units` | `cf.actions.maxUnits` | `campaign.maxAllUnits(gameData)` |
| `max-pilots` | `cf.actions.maxPilots` | `campaign.maxAllPilots()` |
| `unlock-all` | `cf.actions.unlockAll` | `unlockAllUnitTypes` + `unlockAllItems(gameData)` |
| `max-collection` | `cf.actions.maxCollection` | `collection` 为 null 则 `disabled: true`；否则 `maxCollection(collection)` |

`applyAction` 就地改 `campaign`/`collection` 后 **return 同一 state 对象**（宿主 `markRaw` 类实例）。未知 id 抛 `ModuleError('UNKNOWN_ACTION', [id])`。

v1 **不做**存档版本指纹/「游戏已更新」软警告：能 `parse` 就允许编辑；缺 `PlayerUnits` 等关键字段由 `SaveData.load` 抛 `MISSING_FIELD`，该槽不可载入。这与现修改器硬失败行为一致。

catalog：

```ts
{
  name: { zh: '混乱前线', en: 'Chaos Front' },
  cover: coverUrl,
  rightsHolder: 'ChaosGalaxyStudio',
  developer: 'Han Zhiyu',
  publisher: 'ChaosGalaxyStudio',
  steamAppId: 2770330,
  summary: {
    zh: '非官方存档修改器。请先退出游戏再改档。',
    en: 'Unofficial save editor. Quit the game before editing.'
  }
}
```

`id`: `'chaos-front'`。`views` 本任务可先 `[]`，Task 10 再填。registry：`export const modules = [chaosFrontModule]`。

宿主 i18n 增加 `cf.actions.*` 以及 `error.MISSING_FIELD`、`error.DEPLOYED_NO_PILOT`、`error.PILOT_TAKEN`、`error.UNIT_INDEX`（对照旧 `zh.ts` 的 `error.*` 原文翻译迁入）。

`fill-resources` 具体数值：打开旧 `ResourcesTab.vue`，把「一键拉满」写入的字段和上限 **原样**搬进 `actions.ts` 的一个函数 `fillResources(save: SaveData): void`，不要新发明上限。

- [ ] **Step 1: 写 `tests/chaos-front/module.spec.ts`**

用 `tests/chaos-front` 下 `minimal-save.json`（若不够 SaveData.load 的必填字段，从旧 `minimal-save.json` 为准）构造 `SlotBytes`：

- parse → applyAction `max-units` → validate [] → serialize 含 `savedata0.cf`
- `collection.cf` 缺失时 `max-collection` disabled
- 上阵无驾驶员的夹具：validate 含 `DEPLOYED_NO_PILOT`

- [ ] **Step 2: 跑测试确认失败**

```powershell
npx vitest run tests/chaos-front/module.spec.ts
```

Expected: FAIL。

- [ ] **Step 3: 实现模块并让测试通过**

```powershell
npx vitest run tests/chaos-front
```

Expected: PASS。

- [ ] **Step 4: Commit**

```powershell
git add src/games/chaos-front src/host/registry.ts src/host/i18n
git commit -m "feat: Chaos Front 模块契约（定位、解析、快捷动作）"
```

---

### Task 10: 迁入 Chaos Front 深页 views

**Files:**
- Copy Vue：`ResourcesTab.vue`, `PlanetsTab.vue`, `FormationTab.vue`, `UnitsTab.vue`, `PilotsTab.vue`, `UnlockTab.vue`, `CollectionTab.vue` → `src/games/chaos-front/views/`
- Copy `src/renderer/src/lib/images.ts` → `src/games/chaos-front/lib/images.ts`，改资源根路径到 `../assets/game`
- 不要复制 `SlotsTab.vue`、`App.vue`
- 旧 i18n 里 tabs/资源/编队等 key 合并进宿主 `zh.ts`/`en.ts`（或模块自己的 `src/games/chaos-front/i18n.ts` 并由 views 使用模块 `tCf`）。为避免宿主膨胀，**模块自带** `src/games/chaos-front/i18n.ts`，views 从那里 `t()`，不要用宿主 `t` 翻游戏文案
- Modify: 每个 Tab：删除 `window.api`、删除独立「保存图鉴」若改为宿主统一保存（图鉴改动走 `mutate` + 宿主保存；去掉 CollectionTab 里 `writeCollection` 按钮，改为提示使用宿主保存）
- Create: `src/games/chaos-front/views/index.ts`
- Modify: `src/games/chaos-front/index.ts` 的 `views`

**适配模式（每个 Tab 都按这个改，不要继续 `useSaveStore` 旧路径）：**

新建 `src/games/chaos-front/views/inject.ts`：

```ts
import { inject, type ComputedRef } from 'vue'
import type { ChaosFrontState } from '../parse'

export function useCfEditor() {
  const state = inject<() => ChaosFrontState>('savesmithState')
  const mutate = inject<(fn: (s: unknown) => unknown) => void>('savesmithMutate')
  if (!state || !mutate) throw new Error('CF_EDITOR_INJECT')
  return {
    get save() {
      return state().campaign
    },
    get collection() {
      return state().collection
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

注意：宿主 Task 7 的 provide 必须与这里的 inject key 一致：`savesmithState`、`savesmithMutate`。若 Task 7 写成别的名字，**改宿主去对齐这两个字符串**。

`SaveData` 类方法需要 `markRaw`：在 session store `parse` 成功后 `state = markRaw(parsed)`（若 parsed 内含 class）。Pinia 不要 `reactive()` 包 `SaveData`。

把旧 store 的 `store.save!` 换成 `useCfEditor().save`，`markDirty()` 换成 `useCfEditor().markDirty(() => { ...mutations })`。

`CollectionTab`：`maxAll` 改 state.collection 后 markDirty；删除「保存 collection 文件」按钮（宿主保存会写脏的 collection.cf）。

图片：`images.ts` 用 `import.meta.glob` 指向 `../assets/game/**`。

`views/index.ts`：

```ts
import type { ViewSpec } from '@sdk/types'
import ResourcesTab from './ResourcesTab.vue'
import PlanetsTab from './PlanetsTab.vue'
import FormationTab from './FormationTab.vue'
import UnitsTab from './UnitsTab.vue'
import PilotsTab from './PilotsTab.vue'
import UnlockTab from './UnlockTab.vue'
import CollectionTab from './CollectionTab.vue'

export const chaosFrontViews: ViewSpec[] = [
  { id: 'resources', labelKey: 'cf.tabs.resources', component: ResourcesTab },
  { id: 'planets', labelKey: 'cf.tabs.planets', component: PlanetsTab },
  { id: 'formation', labelKey: 'cf.tabs.formation', component: FormationTab },
  { id: 'units', labelKey: 'cf.tabs.units', component: UnitsTab },
  { id: 'pilots', labelKey: 'cf.tabs.pilots', component: PilotsTab },
  { id: 'unlock', labelKey: 'cf.tabs.unlock', component: UnlockTab },
  { id: 'collection', labelKey: 'cf.tabs.collection', component: CollectionTab }
]
```

`labelKey` 可在模块 i18n 里解析；宿主 Tab 标题用模块 `tCf(labelKey)` 或宿主把 `labelKey` 交给模块。最简单：宿主 EditorPage 对当前游戏若 `mod.id === 'chaos-front'` 不要特殊处理——**ViewSpec 增加可选 `label?: LocaleText`** 会改契约。不要改契约。宿主 `t(view.labelKey)`，因此把 `cf.tabs.*` 放进**宿主** i18n（七个 key），模块深文案留在模块 i18n。

安装 `element-plus` `@element-plus/icons-vue`，仅在 `src/games/chaos-front` 的 views 与 `main.ts` 按需 `app.use(ElementPlus)`（全局 use 可接受，v1 只有这一款游戏的深页）。

- [ ] **Step 1: 复制并改 inject，确保没有 `window.api`**

仓库内搜索：`window.api` 必须为 0 处。

- [ ] **Step 2: typecheck**

```powershell
npm run typecheck
npx vitest run
```

Expected: PASS。

- [ ] **Step 3: Commit**

```powershell
git add src/games/chaos-front src/host src/main.ts package.json package-lock.json
git commit -m "feat: 迁入 Chaos Front 深编辑页"
```

---

### Task 11: README、许可证、打包与手测

**Files:**
- Create: `LICENSE`（MIT，Copyright SaveSmith contributors）
- Create: `README.md`（中文）与 `README.en.md`：定位、仅限单机、非官方、Chaos Front 权利人、下载、退出游戏再改、WebView2 依赖、开发命令 `npm install` / `npm test` / `npm run tauri dev` / `npm run tauri build`
- Modify: `src-tauri/tauri.conf.json` 打包 Windows 目录/NSIS 其一；目标 x64
- Create: `docs/HANDTEST.md` 手测清单（见下）

**手测清单（`docs/HANDTEST.md`）必须包含：**

1. 冷启动库页只显示 Chaos Front 卡片（中英名、封面、商店按钮打开 2770330）
2. 自动探测或手选目录；选错目录提示未识别
3. 载入槽位 → 动作条「资源拉满」→ 宿主保存 → 备份目录出现文件
4. 深页改一台机体 → 脏标记 → 切槽位弹出确认
5. 图鉴拉满后宿主保存，确认 `collection.cf` 有对应备份
6. 还原备份后界面与文件一致
7. 用游戏本体加载刚改的**副本**存档（不要用唯一真档）
8. 关于页免责声明含 ChaosGalaxyStudio；空捐赠 URL 时无捐赠按钮
9. 未装 WebView2 的说明写在 README（Win10/11 通常已有）

- [ ] **Step 1: 写 README / LICENSE / HANDTEST**

- [ ] **Step 2: 全量验证**

```powershell
npx vitest run
npm run typecheck
cd src-tauri
cargo test
cd ..
npm run tauri build
```

Expected: 测试全绿；`src-tauri/target/release/bundle/` 下有 Windows 产物。

- [ ] **Step 3: 按 HANDTEST.md 在本机走一遍（有 Chaos Front 存档副本时）**

- [ ] **Step 4: Commit**

```powershell
git add README.md README.en.md LICENSE docs/HANDTEST.md src-tauri/tauri.conf.json
git commit -m "docs: README、MIT 与发布手测清单"
```

不要在本计划里改 `D:\eclipse\git\chaos-front-save-editor` 的 README 去归档；那是后续单独任务，避免两个仓库缠在一次交付里。

---

## Spec coverage（计划自审）

| Spec 节 | 任务 |
|---------|------|
| Tauri + Vue + TS 解析 | 1, 8, 9 |
| 单仓编译期注册表 | 6, 9 `registry.ts` |
| 目录卡字段 / steam 优先 | 2 `resolveStoreUrl`, 6 GameCard, 9 catalog |
| locate 声明、手选校验 | 3, 6, 9 |
| 多文件 parse/serialize、只写脏文件 | 3 `changedFiles`, 7 `save()`, 9 |
| actions + views 混合 | 7 ActionBar, 9 actions, 10 views |
| 备份 10 份、原子写、还原 | 4, 5, 7 |
| 错误 code + i18n | 2 ModuleError, 7, 9 |
| 关于页 URL 可空 | 5 config.ts, 7 AboutDialog |
| 不做服务端/插件/第二游戏 | 全局约束；无对应任务 |
| Chaos Front 迁入与拆 SlotsTab | 8–10 |
| 测试与发布门禁 | 2–4, 8–9, 11 |
| WebView2、包体 | 11 README |

无 TBD。类型名以 Task 2 的 `GameModule` / `SerializedFile` / `SlotBytes` 为准；Task 7 provide 与 Task 10 inject 统一为 `savesmithState`、`savesmithMutate`。
