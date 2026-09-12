# 关于文案修正 + 解析忙碌态 + CID 目录灌库

日期：2026-09-12  
状态：设计已确认（用户 go）

## 背景

1. 「关于」在打开龙之剑时写成「与 HOUND13 / 《龙之剑》…」，像单游戏工具；存档酱是多游戏宿主。  
2. 打开槽位 / 切 tab 时 SQLCipher + 大表挂载无反馈，像死机。  
3. `catalog/` 除货币 stub 外为空，界面满屏 `#CID`。会话历史仅做过空脚手架，从未导出目录。

## 目标

1. 关于免责声明**永远**用通用文案（各游戏官方），永不插当前游戏权利人/游戏名。  
2. 宿主级 `busy` 遮罩：加载槽位、保存、还原、切 tab 时显示「正在解析/加载」。  
3. 用公开社区派生目录（C）灌可读名称；缺口再尽量本机 pak 补（C2，可后置）。

## 非目标

- 不重做关于页布局  
- 本期不把 PBKDF2 下沉 Rust  
- 不复制社区编辑器 Go 业务源码  
- 不保证首版 100% CID 覆盖

## 方案

### 1. 关于

- `AboutDialog` 只渲染 `about.disclaimerGeneric`  
- 可移除 `rightsHolder` / `gameName` 传参（或保留 props 但不用）  
- 测试：disclaimer 永不含 `HOUND13` / 游戏名作权利方；仍含非官方/单机/联机

### 2. Busy 遮罩

- `session` store：`busy: Ref<boolean>`（或 `busyReason`）  
- `loadSlot` / `save` / `restore`：`try/finally` 包 busy  
- `EditorPage`：busy 时遮罩 + 禁用危险按钮；切 tab 时短 busy（`requestAnimationFrame` 双帧后再挂组件）  
- i18n：`editor.busyParse` / `editor.busyLoad`（中英）

### 3. Catalog（C1）

- 源：`gfriloux/dragonsword-save-editor` 公开 `internal/domain/data/items.json`（事实表，非业务码）  
- 转换脚本或一次性转换 → `src/games/dragon-sword/catalog/{characters,currencies,recipes,titles,...}.json`  
- `catalogLabel`：有名显示名称；可选 `名称 (#CID)` 若需排障（默认只显示名称）  
- 文档注明来源与 © HOUND13  
- C2：真档仍大量未知时再本机导出（本期尽力，不阻塞主路径）

## 决策

- 2026-09-12：关于永远通用  
- 2026-09-12：busy 用宿主 A 方案  
- 2026-09-12：目录先 C（公开 items.json），缺再本地
